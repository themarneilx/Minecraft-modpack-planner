'use client';

import type { StatusInfo } from '@/lib/data';
import styles from './StatusPicker.module.css';

interface StatusPickerProps {
  open: boolean;
  statuses: StatusInfo[];
  onClose: () => void;
  onSelect: (statusKey: string) => void;
}

export default function StatusPicker({ open, statuses, onClose, onSelect }: StatusPickerProps) {
  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <div className={styles.title}>Set Mod Status</div>
          <button className={styles.closeBtn} onClick={onClose}>&times;</button>
        </div>
        <div className={styles.picker}>
          {statuses.map((s) => (
            <button
              key={s.id}
              className={styles.option}
              onClick={() => onSelect(s.key)}
            >
              <span className={styles.swatch} style={{ background: s.color }} />
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
