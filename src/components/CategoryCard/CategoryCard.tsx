'use client';

import { createElement, type DragEvent } from 'react';
import type { Category, Mod, StatusInfo } from '@/lib/data';
import type { DropLocation } from '@/lib/reorder';
import { getIcon } from '@/lib/icons';
import styles from './CategoryCard.module.css';

interface CategoryCardProps {
  category: Category;
  statuses: StatusInfo[];
  draggingModId: number | null;
  activeDropTarget: DropLocation | null;
  onAddMod: (categoryId: number) => void;
  onRemoveMod: (modId: number) => void;
  onChangeStatus: (modId: number) => void;
  onModDragStart: (categoryId: number, modId: number) => void;
  onModDragEnd: () => void;
  onModDragOver: (categoryId: number, beforeModId: number | null) => void;
  onModDrop: (categoryId: number, beforeModId: number | null) => void;
}

export default function CategoryCard({
  category,
  statuses,
  draggingModId,
  activeDropTarget,
  onAddMod,
  onRemoveMod,
  onChangeStatus,
  onModDragStart,
  onModDragEnd,
  onModDragOver,
  onModDrop,
}: CategoryCardProps) {
  const statusMap = Object.fromEntries(statuses.map((s) => [s.key, s]));
  const isDragging = draggingModId !== null;

  function isActiveDrop(beforeModId: number | null) {
    return activeDropTarget?.targetCategoryId === category.id && activeDropTarget.beforeModId === beforeModId;
  }

  function handleDragStart(event: DragEvent<HTMLDivElement>, modId: number) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(modId));
    onModDragStart(category.id, modId);
  }

  function handleDragOver(event: DragEvent<HTMLElement>, beforeModId: number | null) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    onModDragOver(category.id, beforeModId);
  }

  function handleRowDragOver(event: DragEvent<HTMLDivElement>, mod: Mod, index: number) {
    const rect = event.currentTarget.getBoundingClientRect();
    const isUpperHalf = event.clientY < rect.top + rect.height / 2;
    const beforeModId = isUpperHalf ? mod.id : category.mods[index + 1]?.id ?? null;

    if (beforeModId === draggingModId) {
      return;
    }

    handleDragOver(event, beforeModId);
  }

  function handleDrop(event: DragEvent<HTMLElement>, beforeModId: number | null) {
    event.preventDefault();
    onModDrop(category.id, beforeModId);
  }

  return (
    <div className={styles.card} data-category-id={category.id}>
      <div className={styles.header} style={{ background: category.headerBg }}>
        <h3 className={styles.title}>
          <span className={styles.icon}>{createElement(getIcon(category.icon), { size: 16 })}</span>
          {category.name}
        </h3>
        <span className={styles.count}>{category.mods.length}</span>
      </div>

      <div className={styles.body}>
        {category.mods.length === 0 ? (
          <div
            className={`${styles.empty} ${isActiveDrop(null) ? styles.emptyDropActive : ''}`}
            data-drop-category-id={category.id}
            data-drop-before-id="end"
            onDragOver={(event) => handleDragOver(event, null)}
            onDrop={(event) => handleDrop(event, null)}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
            <span>No mods added yet</span>
          </div>
        ) : (
          <div className={styles.modList}>
            {category.mods.map((mod, index) => {
              const status = statusMap[mod.statusKey] || { label: 'Unknown', color: '#ccc' };
              return (
                <div key={mod.id}>
                  <div
                    className={`${styles.dropIndicator} ${isActiveDrop(mod.id) ? styles.dropIndicatorActive : ''}`}
                    data-drop-category-id={category.id}
                    data-drop-before-id={mod.id}
                    onDragOver={(event) => handleDragOver(event, mod.id)}
                    onDrop={(event) => handleDrop(event, mod.id)}
                  />
                  <div
                    className={`${styles.modItem} ${draggingModId === mod.id ? styles.modItemDragging : ''}`}
                    data-mod-id={mod.id}
                    data-category-id={category.id}
                    title={status.label}
                    draggable
                    onDragStart={(event) => handleDragStart(event, mod.id)}
                    onDragEnd={onModDragEnd}
                    onDragOver={(event) => handleRowDragOver(event, mod, index)}
                    onDrop={(event) => {
                      const beforeModId = isActiveDrop(null)
                        ? null
                        : activeDropTarget?.beforeModId ?? mod.id;
                      handleDrop(event, beforeModId);
                    }}
                  >
                    <span className={styles.dragHandle} aria-hidden="true">
                      <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
                        <circle cx="5" cy="4" r="1.2" />
                        <circle cx="5" cy="8" r="1.2" />
                        <circle cx="5" cy="12" r="1.2" />
                        <circle cx="11" cy="4" r="1.2" />
                        <circle cx="11" cy="8" r="1.2" />
                        <circle cx="11" cy="12" r="1.2" />
                      </svg>
                    </span>
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
                </div>
              );
            })}
            <div
              className={`${styles.dropIndicator} ${styles.endDropIndicator} ${isActiveDrop(null) ? styles.dropIndicatorActive : ''}`}
              data-drop-category-id={category.id}
              data-drop-before-id="end"
              onDragOver={(event) => handleDragOver(event, null)}
              onDrop={(event) => handleDrop(event, null)}
            />
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
