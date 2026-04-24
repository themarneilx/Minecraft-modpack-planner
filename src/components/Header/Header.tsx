'use client';

import { useState } from 'react';
import styles from './Header.module.css';
import Legend from '../Legend/Legend';
import type { StatusInfo } from '@/lib/data';

interface HeaderProps {
  statuses: StatusInfo[];
  isSyncing: boolean;
}

export default function Header({ statuses, isSyncing }: HeaderProps) {
  const [legendOpen, setLegendOpen] = useState(false);

  return (
    <>
      <header className={styles.header}>
        <div className={styles.left}>
          <div className={styles.logo}>
            <span className={styles.logoIcon} aria-hidden="true">
              <svg viewBox="0 0 48 48" role="img" focusable="false">
                <path
                  className={styles.treeCanopyBack}
                  d="M24 5c-6.5 0-11.7 4.9-12.3 11.2A10.9 10.9 0 0 0 5 26.4C5 32.8 10.2 38 16.6 38h14.8C37.8 38 43 32.8 43 26.4c0-4.8-2.9-8.9-7.1-10.7C34.9 9.7 29.9 5 24 5Z"
                />
                <path
                  className={styles.treeCanopyFront}
                  d="M17 22.5c0-4.7 3.8-8.5 8.5-8.5 3.5 0 6.6 2.2 7.8 5.3 2.7.7 4.7 3.1 4.7 6 0 3.4-2.8 6.2-6.2 6.2H16.4A6.4 6.4 0 0 1 10 25.1c0-3.2 2.4-5.9 5.5-6.3.4 0 .8-.1 1.2-.1.2 1.3.3 2.5.3 3.8Z"
                />
                <path
                  className={styles.treeTrunk}
                  d="M22.2 28.5h4.2v11.8h-4.2z"
                />
                <path
                  className={styles.treeGround}
                  d="M16.5 41h15"
                />
              </svg>
            </span>
            <h1 className={styles.logoText}>Tree Emporium&apos;s Modpack Planner</h1>
          </div>
          <span className={styles.badge}>Collaborative Modpack Builder</span>
        </div>
        <div className={styles.right}>
          <div className={`${styles.online} ${isSyncing ? styles.onlineSyncing : ''}`}>
            <span className={isSyncing ? styles.syncSpinner : styles.pulseDot} />
            <span className={styles.onlineText}>
              {isSyncing ? 'Syncing...' : 'Live — All changes auto-saved'}
            </span>
          </div>
          <button
            className={styles.legendBtn}
            onClick={() => setLegendOpen((v) => !v)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
            Legend
          </button>
        </div>
      </header>
      <Legend statuses={statuses} open={legendOpen} />
    </>
  );
}
