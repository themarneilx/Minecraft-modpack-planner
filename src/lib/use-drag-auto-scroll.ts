'use client';

import { useEffect, useRef } from 'react';
import { getDragAutoScrollDelta, type DragPointer } from './drag-auto-scroll';

export function useDragAutoScroll(
  active: boolean,
  onScrollFrame: (pointer: DragPointer) => void,
) {
  const pointerRef = useRef<DragPointer | null>(null);
  const callbackRef = useRef(onScrollFrame);

  useEffect(() => {
    callbackRef.current = onScrollFrame;
  }, [onScrollFrame]);

  useEffect(() => {
    if (!active) {
      pointerRef.current = null;
      return;
    }

    let animationFrame = 0;
    const root = document.documentElement;
    const previousScrollBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';

    function trackPointer(event: globalThis.DragEvent) {
      pointerRef.current = { x: event.clientX, y: event.clientY };
    }

    function clearPointer() {
      pointerRef.current = null;
    }

    function scrollFrame() {
      const pointer = pointerRef.current;

      if (pointer) {
        const delta = getDragAutoScrollDelta(
          pointer,
          { width: window.innerWidth, height: window.innerHeight },
        );

        if (delta.x !== 0 || delta.y !== 0) {
          const previousX = window.scrollX;
          const previousY = window.scrollY;
          window.scrollBy(delta.x, delta.y);

          if (window.scrollX !== previousX || window.scrollY !== previousY) {
            callbackRef.current(pointer);
          }
        }
      }

      animationFrame = window.requestAnimationFrame(scrollFrame);
    }

    window.addEventListener('dragover', trackPointer, true);
    window.addEventListener('dragend', clearPointer, true);
    window.addEventListener('drop', clearPointer, true);
    animationFrame = window.requestAnimationFrame(scrollFrame);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener('dragover', trackPointer, true);
      window.removeEventListener('dragend', clearPointer, true);
      window.removeEventListener('drop', clearPointer, true);
      root.style.scrollBehavior = previousScrollBehavior;
      pointerRef.current = null;
    };
  }, [active]);
}
