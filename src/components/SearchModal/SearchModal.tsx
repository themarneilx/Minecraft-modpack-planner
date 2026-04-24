'use client';

import { useState, useEffect, useRef } from 'react';
import type { StatusInfo } from '@/lib/data';
import { MINECRAFT_VERSION_OPTIONS } from '@/lib/minecraft';
import styles from './SearchModal.module.css';

interface SearchResult {
  name: string;
  description: string;
  icon: string;
  downloads: number;
  url: string;
  source: string;
  author: string;
}

interface SearchModalProps {
  open: boolean;
  categoryId: number;
  statuses: StatusInfo[];
  onClose: () => void;
  onAddMod: (categoryId: number, mod: { name: string; statusKey: string; source: string; url: string }) => Promise<void> | void;
}

function formatNumber(n: number): string {
  if (!n) return '0';
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toString();
}

export default function SearchModal({ open, categoryId, statuses, onClose, onAddMod }: SearchModalProps) {
  const [source, setSource] = useState<'modrinth' | 'curseforge' | 'manual'>('modrinth');
  const [query, setQuery] = useState('');
  const [version, setVersion] = useState('');
  const [loader, setLoader] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [addedUrls, setAddedUrls] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  // Manual add state
  const [manualName, setManualName] = useState('');
  const [manualUrl, setManualUrl] = useState('');
  const [manualAdded, setManualAdded] = useState(false);
  const manualInputRef = useRef<HTMLInputElement>(null);

  // Find the default status key for the source
  const defaultStatusKey = statuses.find((s) => s.key === source)?.key || statuses[0]?.key || 'added';

  useEffect(() => {
    if (!open) return;

    const timer = setTimeout(() => {
      if (source === 'manual') {
        manualInputRef.current?.focus();
      } else {
        inputRef.current?.focus();
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [open, source]);

  function resetEntryState() {
    setQuery('');
    setResults([]);
    setLoading(false);
    setError('');
    setAddedUrls(new Set());
    setManualName('');
    setManualUrl('');
    setManualAdded(false);
  }

  function handleSourceChange(nextSource: 'modrinth' | 'curseforge' | 'manual') {
    setSource(nextSource);
    resetEntryState();
  }

  async function handleSearch() {
    if (!query.trim()) return;

    if (source === 'curseforge') {
      setError('curseforge');
      return;
    }

    setLoading(true);
    setError('');
    setResults([]);

    try {
      const params = new URLSearchParams({ query: query.trim() });
      if (version) params.set('version', version);
      if (loader) params.set('loader', loader);

      const res = await fetch(`/api/search/modrinth?${params}`);
      const data = await res.json();

      if (data.error) throw new Error(data.error);
      setResults(data.hits || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(mod: SearchResult) {
    await onAddMod(categoryId, {
      name: mod.name,
      statusKey: defaultStatusKey,
      source: mod.source,
      url: mod.url,
    });
    setAddedUrls((prev) => new Set([...prev, mod.url]));
  }

  async function handleManualAdd() {
    if (!manualName.trim()) return;
    await onAddMod(categoryId, {
      name: manualName.trim(),
      statusKey: statuses[0]?.key || 'added',
      source: 'manual',
      url: manualUrl.trim(),
    });
    setManualAdded(true);
    setManualName('');
    setManualUrl('');
    setTimeout(() => {
      setManualAdded(false);
      manualInputRef.current?.focus();
    }, 1500);
  }

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <div className={styles.modalTitle}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <span>Add Mod</span>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>&times;</button>
        </div>

        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${source === 'modrinth' ? styles.tabActive : ''}`}
            onClick={() => handleSourceChange('modrinth')}
          >
            <span className={`${styles.sourceDot} ${styles.modrinthDot}`} /> Modrinth
          </button>
          <button
            className={`${styles.tab} ${source === 'curseforge' ? styles.tabActive : ''}`}
            onClick={() => handleSourceChange('curseforge')}
          >
            <span className={`${styles.sourceDot} ${styles.curseforgeDot}`} /> CurseForge
          </button>
          <button
            className={`${styles.tab} ${source === 'manual' ? styles.tabActive : ''}`}
            onClick={() => handleSourceChange('manual')}
          >
            <span className={`${styles.sourceDot} ${styles.manualDot}`} /> Manual
          </button>
        </div>

        {source === 'manual' ? (
          <div className={styles.manualForm}>
            <div className={styles.manualField}>
              <label className={styles.manualLabel}>Mod Name *</label>
              <input
                ref={manualInputRef}
                type="text"
                placeholder="e.g. Create, Sodium, Terralith..."
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleManualAdd()}
                className={styles.searchInput}
              />
            </div>
            <div className={styles.manualField}>
              <label className={styles.manualLabel}>Link (optional)</label>
              <input
                type="text"
                placeholder="https://modrinth.com/mod/... or https://curseforge.com/..."
                value={manualUrl}
                onChange={(e) => setManualUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleManualAdd()}
                className={styles.searchInput}
              />
            </div>
            <button
              className={styles.manualAddBtn}
              onClick={handleManualAdd}
              disabled={!manualName.trim() || manualAdded}
            >
              {manualAdded ? 'Added!' : 'Add Mod'}
            </button>
            {manualAdded && (
              <p className={styles.manualSuccess}>Mod added to category. You can add another or close this dialog.</p>
            )}
          </div>
        ) : (
          <>
            <div className={styles.searchRow}>
              <input
                ref={inputRef}
                type="text"
                placeholder="Search for mods..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className={styles.searchInput}
              />
              <button className={styles.searchBtn} onClick={handleSearch}>Search</button>
            </div>

            <div className={styles.filters}>
              <select value={version} onChange={(e) => setVersion(e.target.value)} className={styles.select}>
                <option value="">Any Version</option>
                {MINECRAFT_VERSION_OPTIONS.map((versionOption) => (
                  <option key={versionOption} value={versionOption}>
                    {versionOption}
                  </option>
                ))}
              </select>
              <select value={loader} onChange={(e) => setLoader(e.target.value)} className={styles.select}>
                <option value="">Any Loader</option>
                <option value="fabric">Fabric</option>
                <option value="forge">Forge</option>
                <option value="neoforge">NeoForge</option>
                <option value="quilt">Quilt</option>
              </select>
            </div>

            <div className={styles.results}>
              {loading && (
                <div className={styles.loadingState}>
                  <div className={styles.spinner} />
                  <span>Searching...</span>
                </div>
              )}

              {error === 'curseforge' && (
                <div className={styles.placeholder}>
                  <span style={{ fontSize: '32px' }}>🔑</span>
                  <p><strong>CurseForge API Key Required</strong></p>
                  <p style={{ textAlign: 'center', maxWidth: '360px' }}>
                    CurseForge requires an API key. Get one at{' '}
                    <a href="https://console.curseforge.com" target="_blank" rel="noopener noreferrer">
                      console.curseforge.com
                    </a>
                  </p>
                  <p className={styles.hint}>Switch to Modrinth for instant free search!</p>
                </div>
              )}

              {error && error !== 'curseforge' && (
                <div className={styles.placeholder}><p>Error: {error}</p></div>
              )}

              {!loading && !error && results.length === 0 && (
                <div className={styles.placeholder}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.3-4.3" />
                  </svg>
                  <p>Search CurseForge or Modrinth for mods to add</p>
                </div>
              )}

              {results.map((mod, i) => (
                <div key={i} className={styles.resultItem}>
                  <div className={styles.resultIcon}>
                    {mod.icon ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={mod.icon} alt="" loading="lazy" />
                    ) : (
                      <div className={styles.resultIconFallback}>📦</div>
                    )}
                  </div>
                  <div className={styles.resultInfo}>
                    <div className={styles.resultName}>{mod.name}</div>
                    <div className={styles.resultDesc}>{mod.description}</div>
                    <div className={styles.resultMeta}>
                      <span>📥 {formatNumber(mod.downloads)}</span>
                      {mod.author && <span>👤 {mod.author}</span>}
                    </div>
                  </div>
                  <button
                    className={`${styles.addBtn} ${addedUrls.has(mod.url) ? styles.addedBtn : ''}`}
                    onClick={() => handleAdd(mod)}
                    disabled={addedUrls.has(mod.url)}
                  >
                    {addedUrls.has(mod.url) ? '✓ Added' : '+ Add'}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
