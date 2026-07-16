'use client';

import Image from 'next/image';
import { useState } from 'react';
import styles from './Header.module.css';
import Legend from '../Legend/Legend';
import type { StatusInfo } from '@/lib/data';
import { TREE_LOGO_SRC } from '@/lib/brand-assets';
import { formatLastUpdatedAt } from '@/lib/live-status';

interface HeaderProps {
  statuses: StatusInfo[];
  isSyncing: boolean;
  lastUpdatedAt: string | null;
}

export default function Header({ statuses, isSyncing, lastUpdatedAt }: HeaderProps) {
  const [legendOpen, setLegendOpen] = useState(true);
  const lastUpdatedLabel = formatLastUpdatedAt(lastUpdatedAt);

  return (
    <>
      <header className={styles.header}>
        <div className={styles.left}>
          <div className={styles.logo}>
            <span className={styles.logoIcon} aria-hidden="true">
              <Image
                src={TREE_LOGO_SRC}
                alt=""
                width={36}
                height={36}
                sizes="36px"
              />
            </span>
            <h1 className={styles.logoText}>Tree Emporium&apos;s Modpack Planner</h1>
          </div>
          <span className={styles.badge}>Collaborative Modpack Builder</span>
        </div>
        <div className={styles.right}>
          <div className={`${styles.online} ${isSyncing ? styles.onlineSyncing : ''}`}>
            <span className={isSyncing ? styles.syncSpinner : styles.pulseDot} />
            <span className={styles.onlineText}>
              <span>{isSyncing ? 'Syncing...' : 'Live · All changes auto-saved'}</span>
              {lastUpdatedAt && (
                <span className={styles.lastUpdated}>Last update: {lastUpdatedLabel}</span>
              )}
            </span>
          </div>
          <button
            className={styles.legendBtn}
            onClick={() => setLegendOpen((v) => !v)}
            aria-label={legendOpen ? 'Hide legend' : 'Show legend'}
            aria-pressed={legendOpen}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {legendOpen ? (
                <>
                  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                  <circle cx="12" cy="12" r="3" />
                </>
              ) : (
                <>
                  <path d="M10.7 5.1A10.8 10.8 0 0 1 22 12a10.8 10.8 0 0 1-1.4 2.5" />
                  <path d="M14.1 14.2a3 3 0 0 1-4.3-4.3" />
                  <path d="M17.5 17.5A10.8 10.8 0 0 1 2 12a10.8 10.8 0 0 1 4.5-5.5" />
                  <path d="M2 2l20 20" />
                </>
              )}
            </svg>
            Legend
          </button>
        </div>
      </header>
      <Legend statuses={statuses} open={legendOpen} />
    </>
  );
}
