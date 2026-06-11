'use client';

import { useState } from 'react';
import type { StatusInfo } from '@/lib/data';
import { buildModStatusUpdate, orderSelectedStatusKeys } from '@/lib/mod-statuses';
import styles from './StatusPicker.module.css';

interface StatusPickerProps {
  open: boolean;
  statuses: StatusInfo[];
  selectedKeys: string[];
  primaryKey: string;
  onClose: () => void;
  onSave: (statusKeys: string[]) => void;
}

export default function StatusPicker({ open, statuses, selectedKeys, primaryKey, onClose, onSave }: StatusPickerProps) {
  const initialAvailableKeys = statuses.map((status) => status.key);
  const initialOrderedKeys = orderSelectedStatusKeys({
    selectedKeys,
    primaryKey,
    availableKeys: initialAvailableKeys,
  });
  const fallbackKey = primaryKey || statuses[0]?.key || 'added';
  const initialSelectedKeys = initialOrderedKeys.length > 0 ? initialOrderedKeys : [fallbackKey];
  const [draftSelectedKeys, setDraftSelectedKeys] = useState<string[]>(() => initialSelectedKeys);
  const [draftPrimaryKey, setDraftPrimaryKey] = useState(() => initialSelectedKeys[0] ?? fallbackKey);

  if (!open) return null;

  const availableKeys = statuses.map((status) => status.key);

  function toggleStatus(statusKey: string) {
    if (draftSelectedKeys.includes(statusKey)) {
      if (draftSelectedKeys.length === 1) return;

      const nextKeys = draftSelectedKeys.filter((key) => key !== statusKey);
      setDraftSelectedKeys(nextKeys);
      if (draftPrimaryKey === statusKey) {
        setDraftPrimaryKey(nextKeys[0]);
      }
      return;
    }

    setDraftSelectedKeys([...draftSelectedKeys, statusKey]);
  }

  function saveStatuses() {
    const update = buildModStatusUpdate({
      selectedKeys: draftSelectedKeys,
      primaryKey: draftPrimaryKey,
      availableKeys,
      fallbackStatusKey: statuses[0]?.key ?? 'added',
    });
    onSave(update.statusKeys);
  }

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <div>
            <div className={styles.title}>Set Mod Statuses</div>
            <div className={styles.subtitle}>Select multiple indicators. The primary status appears first.</div>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>&times;</button>
        </div>
        <div className={styles.picker}>
          {statuses.map((status) => {
            const selected = draftSelectedKeys.includes(status.key);
            const primary = draftPrimaryKey === status.key && selected;

            return (
              <div key={status.id} className={`${styles.optionRow} ${selected ? styles.optionSelected : ''}`}>
                <button
                  type="button"
                  className={styles.option}
                  onClick={() => toggleStatus(status.key)}
                  aria-pressed={selected}
                >
                  <span className={`${styles.checkBox} ${selected ? styles.checkBoxSelected : ''}`}>
                    {selected && <span className={styles.checkMark} aria-hidden="true" />}
                  </span>
                  <span className={styles.swatch} style={{ background: status.color }} />
                  <span>{status.label}</span>
                </button>
                <button
                  type="button"
                  className={`${styles.primaryBtn} ${primary ? styles.primaryBtnActive : ''}`}
                  disabled={!selected}
                  onClick={() => setDraftPrimaryKey(status.key)}
                >
                  {primary ? 'Primary' : 'Make primary'}
                </button>
              </div>
            );
          })}
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button type="button" className={styles.saveBtn} onClick={saveStatuses}>Save Statuses</button>
        </div>
      </div>
    </div>
  );
}
