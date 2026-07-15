'use client';

import { useState, useEffect, useRef, type DragEvent } from 'react';
import Image from 'next/image';
import Header from '@/components/Header/Header';
import BoardModFinder from '@/components/BoardModFinder/BoardModFinder';
import CategoryCard from '@/components/CategoryCard/CategoryCard';
import SearchModal from '@/components/SearchModal/SearchModal';
import StatusPicker from '@/components/StatusPicker/StatusPicker';
import SettingsModal from '@/components/SettingsModal/SettingsModal';
import { readAppDataResponse } from '@/lib/app-data';
import type { BoardModSearchResult } from '@/lib/board-tools';
import { TREE_LOGO_ALT, TREE_LOGO_SRC } from '@/lib/brand-assets';
import type { DragPointer } from '@/lib/drag-auto-scroll';
import { getCategoryDropTargetFromPoint, type CategoryDropTargetRect } from '@/lib/category-drop-target';
import type { AppData, Mod } from '@/lib/data';
import { getRemainingInitialLoadingMs } from '@/lib/loading-screen';
import { MINECRAFT_VERSION_OPTIONS } from '@/lib/minecraft';
import { getSearchModalSessionKey, getStatusModalSessionKey } from '@/lib/modal-session-keys';
import {
  removeModsFromCategories,
  replaceModInCategories,
  updateModInCategories,
  upsertModInCategory,
} from '@/lib/mod-list';
import { buildModStatusUpdate, normalizeModStatusKeys } from '@/lib/mod-statuses';
import { parseAppDataUpdatedMessage, REALTIME_CLIENT_HEADER } from '@/lib/realtime-protocol';
import { useDragAutoScroll } from '@/lib/use-drag-auto-scroll';
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
const MOD_REVEAL_DURATION_MS = 2400;

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
  const [revealedMod, setRevealedMod] = useState<{ modId: number; requestId: number } | null>(null);

  // Status picker
  const [statusOpen, setStatusOpen] = useState(false);
  const [editModId, setEditModId] = useState(0);
  const [statusSession, setStatusSession] = useState(0);

  // Settings modal
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Drag-and-drop mod ordering
  const [dragState, setDragState] = useState<DragLocation | null>(null);
  const [activeDropTarget, setActiveDropTarget] = useState<DropLocation | null>(null);
  const [selectedModIds, setSelectedModIds] = useState<Set<number>>(() => new Set());
  const [draggingCategoryId, setDraggingCategoryId] = useState<number | null>(null);
  const [activeCategoryDropTarget, setActiveCategoryDropTarget] = useState<CategoryDropLocation | null>(null);

  // Pack info editing
  const [packName, setPackName] = useState('');
  const [mcVersion, setMcVersion] = useState('');
  const [loader, setLoader] = useState('');
  const categoryGridRef = useRef<HTMLElement | null>(null);
  const isFetchingRef = useRef(false);
  const pendingRefreshRef = useRef(false);
  const pendingRemoteRefreshRef = useRef(false);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeSyncCountRef = useRef(0);
  const clientIdRef = useRef('');
  const nextTemporaryModIdRef = useRef(-1);
  const nextRevealRequestIdRef = useRef(0);
  const initialLoadStartedAtRef = useRef<number | null>(null);
  const initialLoadSettledRef = useRef(false);
  const revealedModExists = revealedMod !== null
    && (data?.categories.some((category) =>
      category.mods.some((mod) => mod.id === revealedMod.modId),
    ) ?? false);

  function beginSync() {
    activeSyncCountRef.current += 1;
    setIsSyncing(true);

    return () => {
      activeSyncCountRef.current = Math.max(0, activeSyncCountRef.current - 1);
      if (activeSyncCountRef.current === 0) {
        setIsSyncing(false);
        if (pendingRemoteRefreshRef.current) {
          pendingRemoteRefreshRef.current = false;
          void fetchData();
        }
      }
    };
  }

  function getClientId() {
    if (!clientIdRef.current) {
      const randomId = typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      clientIdRef.current = `client-${randomId}`;
    }
    return clientIdRef.current;
  }

  function getMutationHeaders(includeJson = true) {
    return {
      ...(includeJson && { 'Content-Type': 'application/json' }),
      [REALTIME_CLIENT_HEADER]: getClientId(),
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
      const appData = await readAppDataResponse(res);

      setData(appData);
      const availableModIds = new Set(appData.categories.flatMap((category) => category.mods.map((mod) => mod.id)));
      setSelectedModIds((current) => new Set([...current].filter((modId) => availableModIds.has(modId))));
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
    if (!revealedMod) return;

    const { modId, requestId } = revealedMod;
    let secondFrameId: number | null = null;
    let clearTimerId: number | null = null;

    function clearReveal() {
      setRevealedMod((current) =>
        current?.requestId === requestId ? null : current,
      );
    }

    const firstFrameId = window.requestAnimationFrame(() => {
      secondFrameId = window.requestAnimationFrame(() => {
        const target = Array.from(
          categoryGridRef.current?.querySelectorAll<HTMLElement>('[data-mod-id]') ?? [],
        ).find((element) => Number(element.dataset.modId) === modId);

        if (!revealedModExists || !target) {
          clearReveal();
          return;
        }

        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        target.scrollIntoView({
          block: 'center',
          inline: 'nearest',
          behavior: prefersReducedMotion ? 'auto' : 'smooth',
        });

        clearTimerId = window.setTimeout(clearReveal, MOD_REVEAL_DURATION_MS);
      });
    });

    return () => {
      window.cancelAnimationFrame(firstFrameId);
      if (secondFrameId !== null) {
        window.cancelAnimationFrame(secondFrameId);
      }
      if (clearTimerId !== null) {
        window.clearTimeout(clearTimerId);
      }
    };
  }, [revealedMod, revealedModExists]);

  useDragAutoScroll(
    dragState !== null || draggingCategoryId !== null,
    handleDragAutoScrollFrame,
  );

  useEffect(() => {
    let socket: WebSocket | null = null;
    let disposed = false;

    function connect() {
      getClientId();
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      socket = new WebSocket(`${protocol}//${window.location.host}/ws`);

      socket.addEventListener('message', (event) => {
        try {
          const message = parseAppDataUpdatedMessage(JSON.parse(event.data));
          if (!message) return;

          setLastUpdatedAt(message.updatedAt);
          if (message.sourceClientId === clientIdRef.current) return;

          if (activeSyncCountRef.current > 0) {
            pendingRemoteRefreshRef.current = true;
          } else {
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
        headers: getMutationHeaders(),
        body: JSON.stringify({ [field]: value }),
      });

      if (!res.ok) {
        throw new Error(`Failed to update pack field with status ${res.status}`);
      }
    } catch (error) {
      console.error('Failed to update pack info:', error);
      await fetchData();
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

  function handleBoardModSelect(result: BoardModSearchResult) {
    nextRevealRequestIdRef.current += 1;
    setRevealedMod({
      modId: result.modId,
      requestId: nextRevealRequestIdRef.current,
    });
  }

  async function handleModAdded(categoryId: number, mod: { name: string; statusKey: string; source: string; url: string }) {
    const temporaryModId = nextTemporaryModIdRef.current;
    nextTemporaryModIdRef.current -= 1;
    const optimisticMod: Mod = {
      id: temporaryModId,
      ...mod,
      statusKeys: [mod.statusKey],
      categoryId,
      sortOrder: Number.MAX_SAFE_INTEGER,
    };

    setData((current) => current
      ? {
          ...current,
          categories: upsertModInCategory(current.categories, categoryId, optimisticMod),
        }
      : current);

    const finishSync = beginSync();

    try {
      const res = await fetch('/api/mods', {
        method: 'POST',
        headers: getMutationHeaders(),
        body: JSON.stringify({ ...mod, categoryId }),
      });

      if (!res.ok) {
        throw new Error(`Failed to add mod with status ${res.status}`);
      }

      const createdMod: Mod = await res.json();
      setData((current) => current
        ? {
            ...current,
            categories: replaceModInCategories(current.categories, temporaryModId, createdMod),
          }
        : current);
      return true;
    } catch (error) {
      console.error('Failed to add mod:', error);
      setData((current) => current
        ? {
            ...current,
            categories: removeModsFromCategories(current.categories, [temporaryModId]),
          }
        : current);
      return false;
    } finally {
      finishSync();
    }
  }

  async function handleRemoveMod(modId: number) {
    if (modId < 0) return;

    setSelectedModIds((current) => {
      const next = new Set(current);
      next.delete(modId);
      return next;
    });
    setData((current) => current
      ? {
          ...current,
          categories: removeModsFromCategories(current.categories, [modId]),
        }
      : current);

    const finishSync = beginSync();

    try {
      const res = await fetch(`/api/mods/${modId}`, {
        method: 'DELETE',
        headers: getMutationHeaders(false),
      });
      if (!res.ok) {
        throw new Error(`Failed to remove mod with status ${res.status}`);
      }
    } catch (error) {
      console.error('Failed to remove mod:', error);
      await fetchData();
    } finally {
      finishSync();
    }
  }

  function handleChangeStatus(modId: number) {
    setEditModId(modId);
    setStatusSession((current) => current + 1);
    setStatusOpen(true);
  }

  function handleToggleModSelection(modId: number) {
    if (modId < 0) return;

    setSelectedModIds((current) => {
      const next = new Set(current);
      if (next.has(modId)) {
        next.delete(modId);
      } else {
        next.add(modId);
      }
      return next;
    });
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
    setStatusOpen(false);
    setData((current) => current
      ? {
          ...current,
          categories: updateModInCategories(current.categories, editModId, update),
        }
      : current);
    const finishSync = beginSync();

    try {
      const res = await fetch(`/api/mods/${editModId}`, {
        method: 'PUT',
        headers: getMutationHeaders(),
        body: JSON.stringify(update),
      });

      if (!res.ok) {
        throw new Error(`Failed to update statuses with status ${res.status}`);
      }
    } catch (error) {
      console.error('Failed to update mod statuses:', error);
      await fetchData();
    } finally {
      finishSync();
    }
  }

  function handleModDragStart(categoryId: number, modId: number) {
    const modIds = selectedModIds.has(modId) ? [...selectedModIds] : [modId];
    if (!selectedModIds.has(modId)) {
      setSelectedModIds(new Set());
    }
    setDragState({ sourceCategoryId: categoryId, modId, modIds });
    setActiveDropTarget(null);
  }

  function handleModDragEnd() {
    setDragState(null);
    setActiveDropTarget(null);
  }

  function handleModDragOver(targetCategoryId: number, beforeModId: number | null) {
    if (!dragState) return;
    const isSingleSelfDrop = (dragState.modIds?.length ?? 1) === 1 && beforeModId === dragState.modId;
    if (isSingleSelfDrop) return;

    setActiveDropTarget((current) => {
      if (current?.targetCategoryId === targetCategoryId && current.beforeModId === beforeModId) {
        return current;
      }

      return { targetCategoryId, beforeModId };
    });
  }

  async function handleModDrop(targetCategoryId: number, beforeModId: number | null) {
    const isSingleSelfDrop = (dragState?.modIds?.length ?? 1) === 1 && beforeModId === dragState?.modId;
    if (!data || !dragState || isSingleSelfDrop) {
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
    setSelectedModIds(new Set());

    if (!changed) {
      return;
    }

    setData(nextData);

    const finishSync = beginSync();

    try {
      const res = await fetch('/api/mods/reorder', {
        method: 'PATCH',
        headers: getMutationHeaders(),
        body: JSON.stringify({ categories: affectedCategories }),
      });

      if (!res.ok) {
        throw new Error(`Reorder failed with status ${res.status}`);
      }

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

  function getCategoryDropTargetAtPoint(point: DragPointer) {
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
      point,
    );
  }

  function getModDropTargetAtPoint(point: DragPointer): DropLocation | null {
    if (!dragState) return null;

    const element = document.elementsFromPoint(point.x, point.y)
      .find((candidate) => candidate instanceof HTMLElement && candidate.closest('[data-category-card="true"]'));
    const card = element instanceof HTMLElement
      ? element.closest<HTMLElement>('[data-category-card="true"]')
      : null;
    if (!card) return null;

    const targetCategoryId = Number(card.dataset.categoryId);
    if (!Number.isInteger(targetCategoryId) || targetCategoryId <= 0) return null;

    const rows = Array.from(card.querySelectorAll<HTMLElement>('[data-mod-row-id]'));
    const rowIndex = rows.findIndex((row) => point.y <= row.getBoundingClientRect().bottom);

    if (rowIndex < 0) {
      return { targetCategoryId, beforeModId: null };
    }

    const row = rows[rowIndex];
    const rowId = Number(row.dataset.modRowId);
    const rect = row.getBoundingClientRect();
    const nextAvailableRow = rows
      .slice(rowIndex + 1)
      .find((candidate) => !dragState.modIds?.includes(Number(candidate.dataset.modRowId)));
    const beforeModId = point.y < rect.top + rect.height / 2
      ? rowId
      : nextAvailableRow ? Number(nextAvailableRow.dataset.modRowId) : null;

    return Number.isInteger(beforeModId) || beforeModId === null
      ? { targetCategoryId, beforeModId }
      : null;
  }

  function handleDragAutoScrollFrame(point: DragPointer) {
    if (draggingCategoryId !== null) {
      handleCategoryDragOver(getCategoryDropTargetAtPoint(point));
      return;
    }

    const target = getModDropTargetAtPoint(point);
    if (target) {
      handleModDragOver(target.targetCategoryId, target.beforeModId);
    }
  }

  function handleCategoryGridDragOver(event: DragEvent<HTMLElement>) {
    if (draggingCategoryId === null) return;

    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    handleCategoryDragOver(getCategoryDropTargetAtPoint({ x: event.clientX, y: event.clientY }));
  }

  function handleCategoryGridDrop(event: DragEvent<HTMLElement>) {
    if (draggingCategoryId === null) return;

    event.preventDefault();
    void handleCategoryDrop(getCategoryDropTargetAtPoint({ x: event.clientX, y: event.clientY }));
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

    setData(nextData);

    const finishSync = beginSync();

    try {
      const res = await fetch('/api/categories/reorder', {
        method: 'PATCH',
        headers: getMutationHeaders(),
        body: JSON.stringify({ categoryIds }),
      });

      if (!res.ok) {
        throw new Error(`Category reorder failed with status ${res.status}`);
      }

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
  const draggingModIds = new Set(dragState?.modIds ?? (dragState ? [dragState.modId] : []));

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
          <BoardModFinder categories={data.categories} onSelect={handleBoardModSelect} />
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

      {selectedModIds.size > 0 && (
        <div
          className={styles.selectionToolbar}
          role="status"
          aria-live="polite"
          aria-label={`${selectedModIds.size} ${selectedModIds.size === 1 ? 'mod' : 'mods'} selected for group drag`}
        >
          <span className={styles.selectionCount}>{selectedModIds.size}</span>
          <span>{selectedModIds.size === 1 ? 'mod selected' : 'mods selected'}</span>
          <span className={styles.selectionHint}>Drag any selected mod to move the group</span>
          <button type="button" onClick={() => setSelectedModIds(new Set())}>Clear</button>
        </div>
      )}

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
            revealedModId={revealedMod?.modId ?? null}
            nextCategoryId={data.categories[index + 1]?.id ?? null}
            statuses={data.statuses}
            draggingModId={dragState?.modId ?? null}
            draggingModIds={draggingModIds}
            selectedModIds={selectedModIds}
            draggingCategoryId={draggingCategoryId}
            activeDropTarget={activeDropTarget}
            activeCategoryDropTarget={activeCategoryDropTarget}
            onAddMod={handleAddMod}
            onRemoveMod={handleRemoveMod}
            onChangeStatus={handleChangeStatus}
            onToggleModSelection={handleToggleModSelection}
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
        getMutationHeaders={getMutationHeaders}
      />
    </>
  );
}
