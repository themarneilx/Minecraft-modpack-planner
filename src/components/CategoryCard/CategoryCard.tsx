'use client';

import type { Category, Mod, StatusInfo } from '@/lib/data';
import { getIcon } from '@/lib/icons';
import styles from './CategoryCard.module.css';

interface CategoryCardProps {
  category: Category;
  statuses: StatusInfo[];
  onAddMod: (categoryId: number) => void;
  onRemoveMod: (modId: number) => void;
  onChangeStatus: (modId: number) => void;
}

export default function CategoryCard({
  category,
  statuses,
  onAddMod,
  onRemoveMod,
  onChangeStatus,
}: CategoryCardProps) {
  const statusMap = Object.fromEntries(statuses.map((s) => [s.key, s]));

  return (
    <div className={styles.card}>
      <div className={styles.header} style={{ background: category.headerBg }}>
        <h3 className={styles.title}>
          <span className={styles.icon}>{(() => { const Icon = getIcon(category.icon); return <Icon size={16} />; })()}</span>
          {category.name}
        </h3>
        <span className={styles.count}>{category.mods.length}</span>
      </div>

      <div className={styles.body}>
        {category.mods.length === 0 ? (
          <div className={styles.empty}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
            <span>No mods added yet</span>
          </div>
        ) : (
          <div className={styles.modList}>
            {category.mods.map((mod) => {
              const status = statusMap[mod.statusKey] || { label: 'Unknown', color: '#ccc' };
              return (
                <div key={mod.id} className={styles.modItem} title={status.label}>
                  <span
                    className={styles.statusDot}
                    style={{ background: status.color }}
                    onClick={() => onChangeStatus(mod.id)}
                    title="Click to change status"
                  />
                  <span className={styles.modName}>{mod.name}</span>
                  {mod.url && (
                    <span className={styles.modLink}>
                      <a href={mod.url} target="_blank" rel="noopener noreferrer" title="Open mod page">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                          <polyline points="15 3 21 3 21 9" />
                          <line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
                      </a>
                    </span>
                  )}
                  <button
                    className={styles.removeBtn}
                    onClick={() => onRemoveMod(mod.id)}
                    title="Remove"
                  >
                    &times;
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <button className={styles.addBtn} onClick={() => onAddMod(category.id)}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M12 5v14M5 12h14" />
        </svg>
        Add Mod
      </button>
    </div>
  );
}
