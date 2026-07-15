'use client';

import {
  useDeferredValue,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
} from 'react';
import {
  getBoardFinderResultIdentity,
  getNextBoardFinderIndex,
  isBoardFinderQueryCurrent,
  resolveBoardFinderActiveIndex,
} from '@/lib/board-finder-navigation';
import { searchBoardMods, type BoardModSearchResult } from '@/lib/board-tools';
import type { Category } from '@/lib/data';
import styles from './BoardModFinder.module.css';

const EMPTY_BOARD_MOD_RESULTS: BoardModSearchResult[] = [];

interface BoardModFinderProps {
  categories: Category[];
  onSelect: (result: BoardModSearchResult) => void;
}

export default function BoardModFinder({ categories, onSelect }: BoardModFinderProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIdentity, setActiveIdentity] = useState<string | null>(null);
  const deferredQuery = useDeferredValue(query);
  const listboxRef = useRef<HTMLDivElement>(null);
  const shouldScrollActiveRef = useRef(false);
  const inputId = useId();
  const listboxId = `${inputId}-listbox`;
  const deferredResults = useMemo(
    () => searchBoardMods(categories, deferredQuery),
    [categories, deferredQuery],
  );
  const queryIsCurrent = isBoardFinderQueryCurrent(query, deferredQuery);
  const results = queryIsCurrent ? deferredResults : EMPTY_BOARD_MOD_RESULTS;
  const showPopup = open && query.trim().length > 0;
  const isSearching = showPopup && !queryIsCurrent;
  const showListbox = showPopup && queryIsCurrent && results.length > 0;
  const activeIndex = resolveBoardFinderActiveIndex(results, activeIdentity);
  const activeResult = showListbox ? results[activeIndex] : undefined;

  useEffect(() => {
    if (!shouldScrollActiveRef.current) return;

    shouldScrollActiveRef.current = false;
    if (!showListbox || activeIndex < 0) return;

    listboxRef.current
      ?.querySelector<HTMLElement>('[aria-selected="true"]')
      ?.scrollIntoView({ block: 'nearest' });
  }, [activeIdentity, activeIndex, showListbox]);

  function getOptionId(index: number) {
    return `${listboxId}-option-${index}`;
  }

  function selectResult(result: BoardModSearchResult) {
    if (!queryIsCurrent) return;

    setQuery('');
    setOpen(false);
    setActiveIdentity(null);
    onSelect(result);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (!query.trim()) return;

      setOpen(true);
      if (!queryIsCurrent || results.length === 0) return;

      event.preventDefault();
      const nextIndex = getNextBoardFinderIndex(
        activeIndex,
        event.key === 'ArrowDown' ? 'next' : 'previous',
        results.length,
      );
      const nextResult = results[nextIndex];

      if (nextResult) {
        const nextIdentity = getBoardFinderResultIdentity(nextResult);
        shouldScrollActiveRef.current = nextIdentity !== activeIdentity;
        setActiveIdentity(nextIdentity);
      }
      return;
    }

    if (event.key === 'Enter' && queryIsCurrent && activeResult) {
      event.preventDefault();
      selectResult(activeResult);
      return;
    }

    if (event.key === 'Escape' && open) {
      event.preventDefault();
      setOpen(false);
      setActiveIdentity(null);
    }
  }

  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    const nextFocusedElement = event.relatedTarget;

    if (nextFocusedElement && event.currentTarget.contains(nextFocusedElement)) {
      return;
    }

    setOpen(false);
    setActiveIdentity(null);
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
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showListbox}
          aria-controls={showListbox ? listboxId : undefined}
          aria-activedescendant={activeResult ? getOptionId(activeIndex) : undefined}
          autoComplete="off"
          placeholder="Find an added mod..."
          value={query}
          data-board-finder-input="true"
          onChange={(event) => {
            const nextQuery = event.target.value;
            setQuery(nextQuery);
            setOpen(nextQuery.trim().length > 0);
            setActiveIdentity(null);
          }}
          onFocus={() => setOpen(query.trim().length > 0)}
          onKeyDown={handleKeyDown}
        />
      </div>

      {isSearching ? (
        <div
          className={`${styles.popup} ${styles.status}`}
          role="status"
          data-board-finder-status="searching"
        >
          Searching...
        </div>
      ) : null}

      {showPopup && queryIsCurrent && results.length === 0 ? (
        <div
          className={`${styles.popup} ${styles.status}`}
          role="status"
          data-board-finder-status="empty"
        >
          No added mods found
        </div>
      ) : null}

      {showListbox ? (
        <div
          ref={listboxRef}
          id={listboxId}
          className={`${styles.popup} ${styles.dropdown}`}
          role="listbox"
          aria-label="Added board mods"
          data-board-finder-list="true"
        >
          {results.map((result, index) => {
            const resultIdentity = getBoardFinderResultIdentity(result);
            const isActive = index === activeIndex;

            return (
              <button
                key={resultIdentity}
                id={getOptionId(index)}
                className={`${styles.result} ${isActive ? styles.resultActive : ''}`}
                type="button"
                role="option"
                tabIndex={-1}
                aria-selected={isActive}
                data-board-finder-result="true"
                data-mod-id={result.modId}
                data-category-id={result.categoryId}
                onPointerEnter={() => setActiveIdentity(resultIdentity)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectResult(result)}
              >
                <span className={styles.modName}>{result.modName}</span>
                <span className={styles.categoryName}>{result.categoryName}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
