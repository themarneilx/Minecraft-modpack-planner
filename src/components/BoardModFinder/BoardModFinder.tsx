'use client';

import {
  useDeferredValue,
  useId,
  useState,
  type FocusEvent,
  type KeyboardEvent,
} from 'react';
import { getNextBoardFinderIndex } from '@/lib/board-finder-navigation';
import { searchBoardMods, type BoardModSearchResult } from '@/lib/board-tools';
import type { Category } from '@/lib/data';
import styles from './BoardModFinder.module.css';

interface BoardModFinderProps {
  categories: Category[];
  onSelect: (result: BoardModSearchResult) => void;
}

export default function BoardModFinder({ categories, onSelect }: BoardModFinderProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const deferredQuery = useDeferredValue(query);
  const inputId = useId();
  const listboxId = `${inputId}-listbox`;
  const results = searchBoardMods(categories, deferredQuery);
  const showDropdown = open && query.trim().length > 0;
  const activeResult = showDropdown ? results[activeIndex] : undefined;

  function getOptionId(index: number) {
    return `${listboxId}-option-${index}`;
  }

  function selectResult(result: BoardModSearchResult) {
    setQuery('');
    setOpen(false);
    setActiveIndex(-1);
    onSelect(result);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (!query.trim()) return;

      event.preventDefault();
      setOpen(true);
      setActiveIndex((currentIndex) =>
        getNextBoardFinderIndex(
          currentIndex,
          event.key === 'ArrowDown' ? 'next' : 'previous',
          results.length,
        ),
      );
      return;
    }

    if (event.key === 'Enter' && activeResult) {
      event.preventDefault();
      selectResult(activeResult);
      return;
    }

    if (event.key === 'Escape' && open) {
      event.preventDefault();
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    const nextFocusedElement = event.relatedTarget;

    if (nextFocusedElement && event.currentTarget.contains(nextFocusedElement)) {
      return;
    }

    setOpen(false);
    setActiveIndex(-1);
  }

  return (
    <div className={styles.finder} onBlur={handleBlur}>
      <label className={styles.label} htmlFor={inputId}>
        Find on this board
      </label>
      <div className={styles.inputShell}>
        <svg
          className={styles.searchIcon}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-4-4" />
        </svg>
        <input
          id={inputId}
          className={styles.input}
          type="search"
          role="combobox"
          aria-label="Find an added mod"
          aria-autocomplete="list"
          aria-expanded={showDropdown}
          aria-controls={listboxId}
          aria-activedescendant={activeResult ? getOptionId(activeIndex) : undefined}
          autoComplete="off"
          placeholder="Find an added mod..."
          value={query}
          data-board-finder-input="true"
          onChange={(event) => {
            const nextQuery = event.target.value;
            setQuery(nextQuery);
            setOpen(nextQuery.trim().length > 0);
            setActiveIndex(-1);
          }}
          onFocus={() => setOpen(query.trim().length > 0)}
          onKeyDown={handleKeyDown}
        />
      </div>

      {showDropdown ? (
        <div
          id={listboxId}
          className={styles.dropdown}
          role="listbox"
          aria-label="Added board mods"
          data-board-finder-list="true"
        >
          {results.length > 0 ? (
            results.map((result, index) => {
              const isActive = index === activeIndex;

              return (
                <button
                  key={`${result.categoryId}-${result.modId}`}
                  id={getOptionId(index)}
                  className={`${styles.result} ${isActive ? styles.resultActive : ''}`}
                  type="button"
                  role="option"
                  tabIndex={-1}
                  aria-selected={isActive}
                  data-board-finder-result="true"
                  data-mod-id={result.modId}
                  data-category-id={result.categoryId}
                  onPointerEnter={() => setActiveIndex(index)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectResult(result)}
                >
                  <span className={styles.modName}>{result.modName}</span>
                  <span className={styles.categoryName}>{result.categoryName}</span>
                </button>
              );
            })
          ) : (
            <p className={styles.empty} role="status">
              No added mods found
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
