'use client';

import { useState } from 'react';
import styles from './Header.module.css';
import Legend from '../Legend/Legend';
import type { StatusInfo } from '@/lib/data';

interface HeaderProps {
  statuses: StatusInfo[];
}

export default function Header({ statuses }: HeaderProps) {
  const [legendOpen, setLegendOpen] = useState(false);

  return (
    <>
      <header className={styles.header}>
        <div className={styles.left}>
          <div className={styles.logo}>
            <span className={styles.logoIcon}>⛏️</span>
            <h1 className={styles.logoText}>ModCraft</h1>
          </div>
          <span className={styles.badge}>Collaborative Modpack Builder</span>
        </div>
        <div className={styles.right}>
          <div className={styles.online}>
            <span className={styles.pulseDot} />
            <span className={styles.onlineText}>Live — All changes auto-saved</span>
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
