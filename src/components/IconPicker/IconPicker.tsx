'use client';

import { ICON_REGISTRY, ICON_KEYS } from '@/lib/icons';
import styles from './IconPicker.module.css';

interface IconPickerProps {
  value: string;
  onChange: (key: string) => void;
}

export default function IconPicker({ value, onChange }: IconPickerProps) {
  return (
    <div className={styles.grid}>
      {ICON_KEYS.map((key) => {
        const Icon = ICON_REGISTRY[key];
        return (
          <button
            key={key}
            className={`${styles.iconBtn} ${value === key ? styles.selected : ''}`}
            onClick={() => onChange(key)}
            title={key}
            type="button"
          >
            <Icon size={18} />
          </button>
        );
      })}
    </div>
  );
}
