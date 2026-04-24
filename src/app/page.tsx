'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Header from '@/components/Header/Header';
import CategoryCard from '@/components/CategoryCard/CategoryCard';
import SearchModal from '@/components/SearchModal/SearchModal';
import StatusPicker from '@/components/StatusPicker/StatusPicker';
import SettingsModal from '@/components/SettingsModal/SettingsModal';
import type { AppData, Category, StatusInfo } from '@/lib/data';
import { MINECRAFT_VERSION_OPTIONS } from '@/lib/minecraft';
import styles from './page.module.css';

const LOADER_OPTIONS = ['Fabric', 'Forge', 'NeoForge', 'Quilt'] as const;

export default function Home() {
  const [data, setData] = useState<AppData | null>(null);
  const [loading, setLoading] = useState(true);

  // Search modal
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchCategoryId, setSearchCategoryId] = useState(0);

  // Status picker
  const [statusOpen, setStatusOpen] = useState(false);
  const [editModId, setEditModId] = useState(0);

  // Settings modal
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Pack info editing
  const [packName, setPackName] = useState('');
  const [mcVersion, setMcVersion] = useState('');
  const [loader, setLoader] = useState('');
  const isFetchingRef = useRef(false);
  const pendingRefreshRef = useRef(false);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchData = useCallback(async () => {
    if (isFetchingRef.current) {
      pendingRefreshRef.current = true;
      return;
    }

    isFetchingRef.current = true;

    try {
      const res = await fetch('/api/data');
      const json: AppData = await res.json();
      setData(json);
      if (json.packInfo) {
        setPackName(json.packInfo.name);
        setMcVersion(json.packInfo.mcVersion);
        setLoader(json.packInfo.loader);
      }
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      isFetchingRef.current = false;
      setLoading(false);

      if (pendingRefreshRef.current) {
        pendingRefreshRef.current = false;
        void fetchData();
      }
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

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
  }, [fetchData]);

  // ===== Pack Info =====
  async function savePackField(field: string, value: string) {
    await fetch('/api/pack', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    });
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
    setSearchOpen(true);
  }

  async function handleModAdded(categoryId: number, mod: { name: string; statusKey: string; source: string; url: string }) {
    const res = await fetch('/api/mods', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...mod, categoryId }),
    });

    if (res.ok) {
      void fetchData();
    }
  }

  async function handleRemoveMod(modId: number) {
    const res = await fetch(`/api/mods/${modId}`, { method: 'DELETE' });
    if (res.ok) {
      void fetchData();
    }
  }

  function handleChangeStatus(modId: number) {
    setEditModId(modId);
    setStatusOpen(true);
  }

  async function handleStatusSelect(statusKey: string) {
    await fetch(`/api/mods/${editModId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ statusKey }),
    });
    setStatusOpen(false);
    void fetchData();
  }

  // ===== Computed =====
  const totalMods = data
    ? data.categories.reduce((sum, cat) => sum + cat.mods.length, 0)
    : 0;

  if (loading) {
    return (
      <div className={styles.loadingScreen}>
        <div className={styles.spinner} />
        <p>Loading modpack...</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <>
      <Header statuses={data.statuses} />

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
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
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
      <main className={styles.grid}>
        {data.categories.map((cat) => (
          <CategoryCard
            key={cat.id}
            category={cat}
            statuses={data.statuses}
            onAddMod={handleAddMod}
            onRemoveMod={handleRemoveMod}
            onChangeStatus={handleChangeStatus}
          />
        ))}
      </main>

      {/* Modals */}
      <SearchModal
        open={searchOpen}
        categoryId={searchCategoryId}
        statuses={data.statuses}
        onClose={() => setSearchOpen(false)}
        onAddMod={handleModAdded}
      />
      <StatusPicker
        open={statusOpen}
        statuses={data.statuses}
        onClose={() => setStatusOpen(false)}
        onSelect={handleStatusSelect}
      />
      <SettingsModal
        open={settingsOpen}
        statuses={data.statuses}
        categories={data.categories}
        onClose={() => setSettingsOpen(false)}
        onRefresh={fetchData}
      />
    </>
  );
}
