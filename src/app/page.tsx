'use client';

import { useState, useEffect, useRef, startTransition, type DragEvent } from 'react';
import Image from 'next/image';
import Header from '@/components/Header/Header';
import CategoryCard from '@/components/CategoryCard/CategoryCard';
import SearchModal from '@/components/SearchModal/SearchModal';
import StatusPicker from '@/components/StatusPicker/StatusPicker';
import SettingsModal from '@/components/SettingsModal/SettingsModal';
import { parseAppDataPayload } from '@/lib/app-data';
import { TREE_LOGO_ALT, TREE_LOGO_SRC } from '@/lib/brand-assets';
import { getCategoryDropTargetFromPoint, type CategoryDropTargetRect } from '@/lib/category-drop-target';
import type { AppData, Mod } from '@/lib/data';
import { getRemainingInitialLoadingMs } from '@/lib/loading-screen';
import { MINECRAFT_VERSION_OPTIONS } from '@/lib/minecraft';
import { getSearchModalSessionKey, getStatusModalSessionKey } from '@/lib/modal-session-keys';
import { upsertModInCategory } from '@/lib/mod-list';
import { buildModStatusUpdate, normalizeModStatusKeys } from '@/lib/mod-statuses';
import {
  isSameCategoryDropPosition,
  moveCategoryInList,
  moveModInCategories,
  type CategoryDropLocation,
  type DragLocation,
  type DropLocation,
} from '@/lib/reorder';
import styles from './page.module.css';

const LOADER_OPTIONS = ['Fabric', 'Forge', 'NeoForge', 'Quilt'] as const;

export default function Home() {
  const [data, setData] = useState<AppData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);

  // Search modal
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchCategoryId, setSearchCategoryId] = useState(0);
  const [searchSession, setSearchSession] = useState(0);

  // Status picker
  const [statusOpen, setStatusOpen] = useState(false);
  const [editModId, setEditModId] = useState(0);
  const [statusSession, setStatusSession] = useState(0);

  // Settings modal
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Drag-and-drop mod ordering
  const [dragState, setDragState] = useState<DragLocation | null>(null);
  const [activeDropTarget, setActiveDropTarget] = useState<DropLocation | null>(null);
  const [draggingCategoryId, setDraggingCategoryId] = useState<number | null>(null);
  const [activeCategoryDropTarget, setActiveCategoryDropTarget] = useState<CategoryDropLocation | null>(null);

  // Pack info editing
  const [packName, setPackName] = useState('');
  const [mcVersion, setMcVersion] = useState('');
  const [loader, setLoader] = useState('');
  const categoryGridRef = useRef<HTMLElement | null>(null);
  const isFetchingRef = useRef(false);
  const pendingRefreshRef = useRef(false);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeSyncCountRef = useRef(0);
  const initialLoadStartedAtRef = useRef<number | null>(null);
  const initialLoadSettledRef = useRef(false);

  function beginSync() {
    activeSyncCountRef.current += 1;
    setIsSyncing(true);

    return () => {
      activeSyncCountRef.current = Math.max(0, activeSyncCountRef.current - 1);
      if (activeSyncCountRef.current === 0) {
        setIsSyncing(false);
      }
    };
  }

  async function fetchData() {
    if (isFetchingRef.current) {
      pendingRefreshRef.current = true;
      return;
    }

    isFetchingRef.current = true;
    const finishSync = beginSync();

    try {
      const res = await fetch('/api/data');
      const json: unknown = await res.json();
      const appData = parseAppDataPayload(json);

      if (!res.ok || !appData) {
        const errorMessage = json && typeof json === 'object' && 'error' in json
          ? String((json as { error: unknown }).error)
          : `Failed to load data with status ${res.status}`;
        throw new Error(errorMessage);
      }

      setData(appData);
      setLoadError('');
      setLastUpdatedAt(appData.packInfo?.updatedAt ?? null);
      if (appData.packInfo) {
        setPackName(appData.packInfo.name);
        setMcVersion(appData.packInfo.mcVersion);
        setLoader(appData.packInfo.loader);
      }
    } catch (err) {
      console.error('Failed to load data:', err);
      setLoadError(err instanceof Error ? err.message : 'Failed to load modpack data');
      setData(null);
    } finally {
      if (!initialLoadSettledRef.current) {
        const startedAtMs = initialLoadStartedAtRef.current ?? Date.now();
        const remainingInitialLoadingMs = getRemainingInitialLoadingMs(startedAtMs, Date.now());
        if (remainingInitialLoadingMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, remainingInitialLoadingMs));
        }
        initialLoadSettledRef.current = true;
      }

      isFetchingRef.current = false;
      setLoading(false);
      finishSync();

      if (pendingRefreshRef.current) {
        pendingRefreshRef.current = false;
        void fetchData();
      }
    }
  }

  useEffect(() => {
    initialLoadStartedAtRef.current = Date.now();
    void fetchData();
    // The initial load uses refs and stable state setters; it should only run once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let socket: WebSocket | null = null;
    let disposed = false;

    function connect() {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      socket = new WebSocket(`${protocol}//${window.location.host}/ws`);

      socket.addEventListener('message', (event) => {
        try {
          const message = JSON.parse(event.data) as { type?: string };
          if (message.type === 'app-data-updated') {
            void fetchData();
          }
        } catch (error) {
          console.error('Failed to parse websocket message:', error);
        }
      });

      socket.addEventListener('close', () => {
        if (disposed) return;
        reconnectTimerRef.current = setTimeout(connect, 1000);
      });
    }

    connect();

    return () => {
      disposed = true;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      socket?.close();
    };
    // The websocket subscription is intentionally created once and calls the ref-backed fetch path.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===== Pack Info =====
  async function savePackField(field: string, value: string) {
    const finishSync = beginSync();

    try {
      const res = await fetch('/api/pack', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });

      if (res.ok) {
        await fetchData();
      }
    } finally {
      finishSync();
    }
  }

  function handlePackNameBlur(newName: string) {
    const val = newName.trim() || 'Untitled Modpack';
    if (val === packName) return;
    setPackName(val);
    savePackField('name', val);
  }

  function handleVersionChange(newVersion: string) {
    if (newVersion === mcVersion) return;
    setMcVersion(newVersion);
    savePackField('mcVersion', newVersion);
  }

  function handleLoaderChange(newLoader: string) {
    if (newLoader === loader) return;
    setLoader(newLoader);
    savePackField('loader', newLoader);
  }

  // ===== Mods =====
  function handleAddMod(categoryId: number) {
    setSearchCategoryId(categoryId);
    setSearchSession((current) => current + 1);
    setSearchOpen(true);
  }

  async function handleModAdded(categoryId: number, mod: { name: string; statusKey: string; source: string; url: string }) {
    const finishSync = beginSync();

    try {
      const res = await fetch('/api/mods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...mod, categoryId }),
      });

      if (res.ok) {
        const createdMod: Mod = await res.json();
        startTransition(() => {
          setData((current) => current
            ? {
                ...current,
                categories: upsertModInCategory(current.categories, categoryId, createdMod),
              }
            : current);
        });
        await fetchData();
      }
    } finally {
      finishSync();
    }
  }

  async function handleRemoveMod(modId: number) {
    const finishSync = beginSync();

    try {
      const res = await fetch(`/api/mods/${modId}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchData();
      }
    } finally {
      finishSync();
    }
  }

  function handleChangeStatus(modId: number) {
    setEditModId(modId);
    setStatusSession((current) => current + 1);
    setStatusOpen(true);
  }

  function getModById(modId: number) {
    if (!data) return null;

    for (const category of data.categories) {
      const mod = category.mods.find((item) => item.id === modId);
      if (mod) return mod;
    }

    return null;
  }

  async function handleStatusSave(statusKeys: string[]) {
    if (!data) return;

    const editingMod = getModById(editModId);
    const update = buildModStatusUpdate({
      selectedKeys: statusKeys,
      primaryKey: statusKeys[0] ?? editingMod?.statusKey ?? data.statuses[0]?.key ?? 'added',
      availableKeys: data.statuses.map((status) => status.key),
      fallbackStatusKey: editingMod?.statusKey ?? data.statuses[0]?.key ?? 'added',
    });
    const finishSync = beginSync();

    try {
      const res = await fetch(`/api/mods/${editModId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(update),
      });

      if (res.ok) {
        setStatusOpen(false);
        await fetchData();
      }
    } finally {
      finishSync();
    }
  }

  function handleModDragStart(categoryId: number, modId: number) {
    setDragState({ sourceCategoryId: categoryId, modId });
    setActiveDropTarget(null);
  }

  function handleModDragEnd() {
    setDragState(null);
    setActiveDropTarget(null);
  }

  function handleModDragOver(targetCategoryId: number, beforeModId: number | null) {
    if (!dragState || beforeModId === dragState.modId) return;

    setActiveDropTarget((current) => {
      if (current?.targetCategoryId === targetCategoryId && current.beforeModId === beforeModId) {
        return current;
      }

      return { targetCategoryId, beforeModId };
    });
  }

  async function handleModDrop(targetCategoryId: number, beforeModId: number | null) {
    if (!data || !dragState || beforeModId === dragState.modId) {
      handleModDragEnd();
      return;
    }

    let nextData: AppData;
    let affectedCategories: { categoryId: number; modIds: number[] }[];

    try {
      const result = moveModInCategories(
        data.categories,
        dragState,
        { targetCategoryId, beforeModId },
      );
      nextData = { ...data, categories: result.categories };
      affectedCategories = result.affectedCategories;
    } catch (error) {
      console.error('Failed to compute mod reorder:', error);
      handleModDragEnd();
      return;
    }

    const changed = affectedCategories.some((affected) => {
      const currentIds = data.categories.find((category) => category.id === affected.categoryId)?.mods.map((mod) => mod.id) ?? [];
      return currentIds.length !== affected.modIds.length ||
        currentIds.some((modId, index) => modId !== affected.modIds[index]);
    });

    handleModDragEnd();

    if (!changed) {
      return;
    }

    startTransition(() => {
      setData(nextData);
    });

    const finishSync = beginSync();

    try {
      const res = await fetch('/api/mods/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categories: affectedCategories }),
      });

      if (!res.ok) {
        throw new Error(`Reorder failed with status ${res.status}`);
      }

      await fetchData();
    } catch (error) {
      console.error('Failed to save mod reorder:', error);
      await fetchData();
    } finally {
      finishSync();
    }
  }

  function handleCategoryDragStart(categoryId: number) {
    setDraggingCategoryId(categoryId);
    setActiveCategoryDropTarget(null);
    handleModDragEnd();
  }

  function handleCategoryDragEnd() {
    setDraggingCategoryId(null);
    setActiveCategoryDropTarget(null);
  }

  function handleCategoryDragOver(beforeCategoryId: number | null) {
    if (!data || draggingCategoryId === null) return;

    if (isSameCategoryDropPosition(data.categories, draggingCategoryId, beforeCategoryId)) {
      setActiveCategoryDropTarget(null);
      return;
    }

    setActiveCategoryDropTarget((current) => {
      if (current?.beforeCategoryId === beforeCategoryId) {
        return current;
      }

      return { beforeCategoryId };
    });
  }

  function getCategoryDropTargetFromEvent(event: DragEvent<HTMLElement>) {
    if (draggingCategoryId === null) return null;

    const grid = categoryGridRef.current;
    if (!grid) return null;

    const rects: CategoryDropTargetRect[] = Array.from(grid.querySelectorAll<HTMLElement>('[data-category-slot-id]'))
      .map((element) => {
        const id = Number(element.dataset.categorySlotId);
        const rect = element.getBoundingClientRect();

        return {
          id,
          left: rect.left,
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          width: rect.width,
          height: rect.height,
        };
      })
      .filter((rect) => Number.isInteger(rect.id) && rect.id > 0);

    return getCategoryDropTargetFromPoint(
      rects,
      draggingCategoryId,
      { x: event.clientX, y: event.clientY },
    );
  }

  function handleCategoryGridDragOver(event: DragEvent<HTMLElement>) {
    if (draggingCategoryId === null) return;

    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    handleCategoryDragOver(getCategoryDropTargetFromEvent(event));
  }

  function handleCategoryGridDrop(event: DragEvent<HTMLElement>) {
    if (draggingCategoryId === null) return;

    event.preventDefault();
    void handleCategoryDrop(getCategoryDropTargetFromEvent(event));
  }

  async function handleCategoryDrop(beforeCategoryId: number | null) {
    if (!data || draggingCategoryId === null) {
      handleCategoryDragEnd();
      return;
    }

    if (isSameCategoryDropPosition(data.categories, draggingCategoryId, beforeCategoryId)) {
      handleCategoryDragEnd();
      return;
    }

    let nextData: AppData;
    let categoryIds: number[];

    try {
      const result = moveCategoryInList(data.categories, draggingCategoryId, beforeCategoryId);
      nextData = { ...data, categories: result.categories };
      categoryIds = result.categoryIds;
    } catch (error) {
      console.error('Failed to compute category reorder:', error);
      handleCategoryDragEnd();
      return;
    }

    const currentCategoryIds = data.categories.map((category) => category.id);
    const changed = currentCategoryIds.length !== categoryIds.length ||
      currentCategoryIds.some((categoryId, index) => categoryId !== categoryIds[index]);

    handleCategoryDragEnd();

    if (!changed) {
      return;
    }

    startTransition(() => {
      setData(nextData);
    });

    const finishSync = beginSync();

    try {
      const res = await fetch('/api/categories/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryIds }),
      });

      if (!res.ok) {
        throw new Error(`Category reorder failed with status ${res.status}`);
      }

      await fetchData();
    } catch (error) {
      console.error('Failed to save category reorder:', error);
      await fetchData();
    } finally {
      finishSync();
    }
  }

  // ===== Computed =====
  const totalMods = data
    ? data.categories.reduce((sum, cat) => sum + cat.mods.length, 0)
    : 0;
  const editingMod = data ? getModById(editModId) : null;

  if (loading) {
    return (
      <div className={styles.loadingScreen}>
        <div className={styles.loadingShell}>
          <div className={styles.loadingLogoFrame}>
            <Image
              className={styles.loadingLogo}
              src={TREE_LOGO_SRC}
              alt={TREE_LOGO_ALT}
              width={180}
              height={180}
              priority
              sizes="180px"
            />
          </div>
          <div className={styles.loadingTextBlock}>
            <p className={styles.loadingKicker}>Loading Modpack Planner</p>
            <h1 className={styles.loadingTitle}>Tree Emporium</h1>
          </div>
          <div className={styles.loadingBar} aria-label="Loading modpack">
            <span className={styles.loadingBarFill} />
          </div>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className={styles.loadingScreen}>
        <p className={styles.errorTitle}>Failed to load modpack</p>
        <p className={styles.errorMessage}>{loadError}</p>
        <button className={styles.retryBtn} onClick={() => void fetchData()}>Retry</button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <>
      <Header statuses={data.statuses} isSyncing={isSyncing} lastUpdatedAt={lastUpdatedAt} />

      {/* Pack Info */}
      <div className={styles.packInfo}>
        <div className={styles.packInfoLeft}>
          <h2
            className={styles.packName}
            contentEditable
            suppressContentEditableWarning
            spellCheck={false}
            onBlur={(e) => handlePackNameBlur(e.currentTarget.textContent || 'Untitled Modpack')}
          >
            {packName}
          </h2>
          <span className={styles.packVersion}>
            Minecraft{' '}
            <span className={styles.inlineSelectWrap}>
              <select
                className={styles.inlineSelect}
                value={mcVersion}
                onChange={(e) => handleVersionChange(e.target.value)}
                aria-label="Minecraft version"
              >
                {MINECRAFT_VERSION_OPTIONS.map((versionOption) => (
                  <option key={versionOption} value={versionOption}>
                    {versionOption}
                  </option>
                ))}
              </select>
            </span>
            <span className={styles.packSeparator}>·</span>
            <span className={styles.inlineSelectWrap}>
              <select
                className={styles.inlineSelect}
                value={loader}
                onChange={(e) => handleLoaderChange(e.target.value)}
                aria-label="Mod loader"
              >
                {LOADER_OPTIONS.map((loaderOption) => (
                  <option key={loaderOption} value={loaderOption}>
                    {loaderOption}
                  </option>
                ))}
              </select>
            </span>
          </span>
        </div>
        <div className={styles.packActions}>
          <button className={styles.settingsBtn} onClick={() => setSettingsOpen(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12.2 2h-.4a2 2 0 0 0-2 2v.2a2 2 0 0 1-1 1.7l-.4.2a2 2 0 0 1-2 0l-.2-.1a2 2 0 0 0-2.7.7l-.2.4a2 2 0 0 0 .7 2.7l.2.1a2 2 0 0 1 1 1.7v.6a2 2 0 0 1-1 1.7l-.2.1a2 2 0 0 0-.7 2.7l.2.4a2 2 0 0 0 2.7.7l.2-.1a2 2 0 0 1 2 0l.4.2a2 2 0 0 1 1 1.7v.2a2 2 0 0 0 2 2h.4a2 2 0 0 0 2-2v-.2a2 2 0 0 1 1-1.7l.4-.2a2 2 0 0 1 2 0l.2.1a2 2 0 0 0 2.7-.7l.2-.4a2 2 0 0 0-.7-2.7l-.2-.1a2 2 0 0 1-1-1.7v-.6a2 2 0 0 1 1-1.7l.2-.1a2 2 0 0 0 .7-2.7l-.2-.4a2 2 0 0 0-2.7-.7l-.2.1a2 2 0 0 1-2 0l-.4-.2a2 2 0 0 1-1-1.7V4a2 2 0 0 0-2-2Z" />
              <circle cx="12" cy="12" r="3.2" />
            </svg>
            Settings
          </button>
        </div>
        <div className={styles.packStats}>
          <div className={styles.stat}>
            <span className={styles.statNum}>{totalMods}</span>
            <span className={styles.statLabel}>Total Mods</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statNum}>{data.categories.length}</span>
            <span className={styles.statLabel}>Categories</span>
          </div>
        </div>
      </div>

      {/* Category Grid */}
      <main
        ref={categoryGridRef}
        className={styles.grid}
        onDragOver={handleCategoryGridDragOver}
        onDrop={handleCategoryGridDrop}
      >
        {data.categories.map((cat, index) => (
          <CategoryCard
            key={cat.id}
            category={cat}
            nextCategoryId={data.categories[index + 1]?.id ?? null}
            statuses={data.statuses}
            draggingModId={dragState?.modId ?? null}
            draggingCategoryId={draggingCategoryId}
            activeDropTarget={activeDropTarget}
            activeCategoryDropTarget={activeCategoryDropTarget}
            onAddMod={handleAddMod}
            onRemoveMod={handleRemoveMod}
            onChangeStatus={handleChangeStatus}
            onModDragStart={handleModDragStart}
            onModDragEnd={handleModDragEnd}
            onModDragOver={handleModDragOver}
            onModDrop={handleModDrop}
            onCategoryDragStart={handleCategoryDragStart}
            onCategoryDragEnd={handleCategoryDragEnd}
          />
        ))}
      </main>

      {/* Modals */}
      <SearchModal
        key={getSearchModalSessionKey(searchSession)}
        open={searchOpen}
        categoryId={searchCategoryId}
        statuses={data.statuses}
        onClose={() => setSearchOpen(false)}
        onAddMod={handleModAdded}
      />
      <StatusPicker
        key={getStatusModalSessionKey(statusSession)}
        open={statusOpen}
        statuses={data.statuses}
        onClose={() => setStatusOpen(false)}
        selectedKeys={editingMod ? normalizeModStatusKeys(editingMod) : []}
        primaryKey={editingMod?.statusKey ?? data.statuses[0]?.key ?? 'added'}
        onSave={handleStatusSave}
      />
      <SettingsModal
        open={settingsOpen}
        statuses={data.statuses}
        categories={data.categories}
        onClose={() => setSettingsOpen(false)}
        onRefresh={fetchData}
        onSyncStart={beginSync}
      />
    </>
  );
}
