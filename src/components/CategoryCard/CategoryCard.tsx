'use client';

import { createElement, useLayoutEffect, useRef, useState, type DragEvent } from 'react';
import type { Category, Mod, StatusInfo } from '@/lib/data';
import { getCategoryModDisplay } from '@/lib/category-display';
import { normalizeModStatusKeys } from '@/lib/mod-statuses';
import type { CategoryDropLocation, DropLocation } from '@/lib/reorder';
import { getIcon } from '@/lib/icons';
import styles from './CategoryCard.module.css';

const MASONRY_ROW_HEIGHT = 8;
const MASONRY_GAP = 16;

interface CategoryCardProps {
  category: Category;
  revealedModId: number | null;
  nextCategoryId: number | null;
  statuses: StatusInfo[];
  draggingModId: number | null;
  draggingModIds: ReadonlySet<number>;
  selectedModIds: ReadonlySet<number>;
  draggingCategoryId: number | null;
  activeDropTarget: DropLocation | null;
  activeCategoryDropTarget: CategoryDropLocation | null;
  onAddMod: (categoryId: number) => void;
  onRemoveMod: (modId: number) => void;
  onChangeStatus: (modId: number) => void;
  onToggleModSelection: (modId: number) => void;
  onModDragStart: (categoryId: number, modId: number) => void;
  onModDragEnd: () => void;
  onModDragOver: (categoryId: number, beforeModId: number | null) => void;
  onModDrop: (categoryId: number, beforeModId: number | null) => void;
  onCategoryDragStart: (categoryId: number) => void;
  onCategoryDragEnd: () => void;
}

export default function CategoryCard({
  category,
  revealedModId,
  nextCategoryId,
  statuses,
  draggingModId,
  draggingModIds,
  selectedModIds,
  draggingCategoryId,
  activeDropTarget,
  activeCategoryDropTarget,
  onAddMod,
  onRemoveMod,
  onChangeStatus,
  onToggleModSelection,
  onModDragStart,
  onModDragEnd,
  onModDragOver,
  onModDrop,
  onCategoryDragStart,
  onCategoryDragEnd,
}: CategoryCardProps) {
  const [showAllMods, setShowAllMods] = useState(false);
  const slotRef = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const statusMap = Object.fromEntries(statuses.map((s) => [s.key, s]));
  const revealedModBelongsToCategory = revealedModId !== null
    && category.mods.some((mod) => mod.id === revealedModId);
  const modDisplay = getCategoryModDisplay(category.mods, showAllMods, revealedModId);
  const isShowingAllMods = showAllMods || revealedModBelongsToCategory;
  const isCategoryDragging = draggingCategoryId !== null;
  const categoryDropBeforeActive = activeCategoryDropTarget?.beforeCategoryId === category.id;
  const categoryDropAfterActive = activeCategoryDropTarget?.beforeCategoryId === null && nextCategoryId === null;
  const categoryDropActive = categoryDropBeforeActive || categoryDropAfterActive;

  function isActiveDrop(beforeModId: number | null) {
    return activeDropTarget?.targetCategoryId === category.id && activeDropTarget.beforeModId === beforeModId;
  }

  useLayoutEffect(() => {
    if (!revealedModBelongsToCategory) return;

    // The helper renders the match immediately; persist that expansion outside the effect body.
    const frameId = window.requestAnimationFrame(() => setShowAllMods(true));

    return () => window.cancelAnimationFrame(frameId);
  }, [revealedModBelongsToCategory, revealedModId]);

  useLayoutEffect(() => {
    const slot = slotRef.current;
    const card = cardRef.current;
    if (!slot || !card) return;

    const observedSlot = slot;
    const observedCard = card;

    function updateSpan() {
      const height = observedCard.offsetHeight;
      const span = Math.max(1, Math.ceil((height + MASONRY_GAP) / (MASONRY_ROW_HEIGHT + MASONRY_GAP)));
      observedSlot.style.setProperty('--category-row-span', String(span));
    }

    updateSpan();

    const observer = new ResizeObserver(updateSpan);
    observer.observe(observedCard);
    window.addEventListener('resize', updateSpan);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateSpan);
    };
  }, [category.id, modDisplay.visibleMods.length, showAllMods]);

  function handleDragStart(event: DragEvent<HTMLDivElement>, modId: number) {
    const groupedModIds = selectedModIds.has(modId) ? [...selectedModIds] : [modId];
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(modId));
    event.dataTransfer.setData('application/x-mod-ids', groupedModIds.join(','));

    if (groupedModIds.length > 1) {
      const preview = document.createElement('div');
      preview.className = styles.groupDragPreview;
      preview.textContent = `${groupedModIds.length} mods`;
      document.body.appendChild(preview);
      event.dataTransfer.setDragImage(preview, 24, 18);
      window.setTimeout(() => preview.remove(), 0);
    }

    onModDragStart(category.id, modId);
  }

  function handleDragOver(event: DragEvent<HTMLElement>, beforeModId: number | null) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    onModDragOver(category.id, beforeModId);
  }

  function handleRowDragOver(event: DragEvent<HTMLDivElement>, mod: Mod, nextVisibleModId: number | null) {
    const rect = event.currentTarget.getBoundingClientRect();
    const isUpperHalf = event.clientY < rect.top + rect.height / 2;
    const beforeModId = isUpperHalf ? mod.id : nextVisibleModId;

    if (beforeModId === draggingModId && draggingModIds.size === 1) {
      return;
    }

    handleDragOver(event, beforeModId);
  }

  function handleDrop(event: DragEvent<HTMLElement>, beforeModId: number | null) {
    event.preventDefault();
    onModDrop(category.id, beforeModId);
  }

  function handleCategoryDragStart(event: DragEvent<HTMLDivElement>) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(category.id));

    const cardElement = event.currentTarget.closest('[data-category-card="true"]') as HTMLElement | null;
    if (cardElement) {
      const rect = cardElement.getBoundingClientRect();
      event.dataTransfer.setDragImage(
        cardElement,
        Math.max(0, event.clientX - rect.left),
        Math.max(0, event.clientY - rect.top),
      );
    }

    onCategoryDragStart(category.id);
  }

  return (
    <div
      ref={slotRef}
      className={styles.cardSlot}
      data-category-slot-id={category.id}
    >
      <div
        className={`${styles.categoryDropIndicator} ${styles.categoryDropIndicatorBefore} ${categoryDropBeforeActive ? styles.categoryDropIndicatorActive : ''}`}
        aria-hidden="true"
      />
      <div
        ref={cardRef}
        className={`${styles.card} ${draggingCategoryId === category.id ? styles.categoryDragging : ''} ${categoryDropActive ? styles.categoryDropActive : ''}`}
        data-category-id={category.id}
        data-category-card="true"
      >
        <div
          className={styles.header}
          style={{ background: category.headerBg }}
          data-category-drag-handle={category.id}
          draggable
          aria-grabbed={draggingCategoryId === category.id}
          onDragStart={handleCategoryDragStart}
          onDragEnd={onCategoryDragEnd}
          title="Drag to reorder category"
        >
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
              {modDisplay.visibleMods.map((mod, index) => {
                const isSelected = selectedModIds.has(mod.id);
                const isDragging = draggingModIds.has(mod.id);
                const isPending = mod.id < 0;
                const isSearchMatch = mod.id === revealedModId;
                const statusItems = normalizeModStatusKeys(mod).map((key) => ({
                  key,
                  label: statusMap[key]?.label ?? key,
                  color: statusMap[key]?.color ?? '#ccc',
                }));
                const statusTitle = statusItems.map((status) => status.label).join(', ');
                return (
                  <div
                    key={mod.id}
                    className={styles.modRow}
                    data-mod-row-id={mod.id}
                  >
                    <div
                      className={`${styles.dropIndicator} ${isActiveDrop(mod.id) ? styles.dropIndicatorActive : ''}`}
                      data-drop-category-id={category.id}
                      data-drop-before-id={mod.id}
                      onDragOver={(event) => handleDragOver(event, mod.id)}
                      onDrop={(event) => handleDrop(event, mod.id)}
                    />
                    <div
                      className={`${styles.modItem} ${isDragging ? styles.modItemDragging : ''} ${isSelected ? styles.modItemSelected : ''} ${isPending ? styles.modItemPending : ''} ${isSearchMatch ? styles.searchMatch : ''}`}
                      data-mod-id={mod.id}
                      data-category-id={category.id}
                      data-search-highlight={isSearchMatch ? 'true' : undefined}
                      title={statusTitle}
                      draggable={!isPending}
                      onDragStart={(event) => handleDragStart(event, mod.id)}
                      onDragEnd={onModDragEnd}
                      onDragOver={(event) => handleRowDragOver(
                        event,
                        mod,
                        modDisplay.visibleMods.slice(index + 1).find((item) => !draggingModIds.has(item.id))?.id ?? null,
                      )}
                      onDrop={(event) => {
                        const beforeModId = isActiveDrop(null)
                          ? null
                          : activeDropTarget?.beforeModId ?? mod.id;
                        handleDrop(event, beforeModId);
                      }}
                    >
                      <button
                        type="button"
                        className={`${styles.selectBtn} ${isSelected ? styles.selectBtnActive : ''}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          onToggleModSelection(mod.id);
                        }}
                        disabled={isPending}
                        title={isSelected ? 'Remove from drag selection' : 'Select for group drag'}
                        aria-label={`${isSelected ? 'Deselect' : 'Select'} ${mod.name} for group drag`}
                        aria-pressed={isSelected}
                      >
                        {isSelected && (
                          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="m2 6 2.4 2.4L10 3" />
                          </svg>
                        )}
                      </button>
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
                      <button
                        type="button"
                        className={styles.statusDots}
                        onClick={() => onChangeStatus(mod.id)}
                        title={`Click to edit statuses: ${statusTitle}`}
                        aria-label={`Edit statuses for ${mod.name}: ${statusTitle}`}
                      >
                        {statusItems.map((status, statusIndex) => (
                          <span
                            key={`${mod.id}-${status.key}`}
                            className={`${styles.statusDot} ${statusIndex === 0 ? styles.statusDotPrimary : ''}`}
                            style={{ background: status.color }}
                          />
                        ))}
                      </button>
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
                        disabled={isPending}
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

        {modDisplay.canExpand && (
          <button
            className={styles.showMoreBtn}
            type="button"
            data-show-more-mods={category.id}
            onClick={() => setShowAllMods((current) => !current)}
          >
            {isShowingAllMods ? 'Show less' : `Show ${modDisplay.hiddenCount} more`}
          </button>
        )}

        <button className={styles.addBtn} onClick={() => onAddMod(category.id)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add Mod
        </button>
      </div>
      <div
        className={`${styles.categoryDropIndicator} ${styles.categoryDropIndicatorAfter} ${categoryDropAfterActive ? styles.categoryDropIndicatorActive : ''}`}
        aria-hidden="true"
      />
    </div>
  );
}
