/* ============================================================
   drag-scroll.js — Pointer drag-to-scroll + click guard
   ------------------------------------------------------------
   Lets the user press, hold, and drag horizontally to scroll
   the carousel — like grabbing a row of hanging cards and
   pushing it along. Works for mouse, trackpad, touch, stylus.

   Exports:
     initDragScroll()  →  wires up pointer listeners on #stage.
                          Call once on DOMContentLoaded, after
                          initCarousel() has rendered the cards.
   ============================================================ */

import { getStage } from './carousel.js';

const DRAG_THRESHOLD = 5; // px — under this counts as a click, not a drag

let isDragging = false;
let dragStartX = 0;
let dragStartScroll = 0;
let dragMoved = false;

export function initDragScroll() {
  const stage = getStage();
  if (!stage) return;

  stage.addEventListener('pointerdown', onPointerDown);
  document.addEventListener('pointermove', onPointerMove);
  document.addEventListener('pointerup', endDrag);
  document.addEventListener('pointercancel', endDrag);
  window.addEventListener('blur', () => { if (isDragging) endDrag(); });
  window.addEventListener('click', swallowClickIfDragged, true);
}

function onPointerDown(e) {
  // Only respond to primary mouse button, touch, or pen
  if (e.pointerType === 'mouse' && e.button !== 0) return;

  const stage = getStage();
  isDragging = true;
  dragMoved = false;
  dragStartX = e.clientX;
  dragStartScroll = stage.scrollLeft;
  // NOTE: do NOT add `dragging` class here — adding it on pointerdown would
  // break click events on cards. Only add it after movement past threshold.
}

function onPointerMove(e) {
  if (!isDragging) return;
  const stage = getStage();
  const dx = e.clientX - dragStartX;
  if (Math.abs(dx) > DRAG_THRESHOLD) {
    if (!dragMoved) {
      dragMoved = true;
      stage.classList.add('dragging'); // only now indicate dragging visually
    }
  }
  // Drag right → scroll left (content moves with the cursor, like grabbing paper)
  stage.scrollLeft = dragStartScroll - dx;
}

function endDrag() {
  if (!isDragging) return;
  isDragging = false;
  const stage = getStage();
  stage.classList.remove('dragging');
}

// Click capture-phase guard: if the user actually dragged (moved > threshold),
// swallow the synthesized click so the card doesn't flip on release.
// If they just tapped without moving, the click flows through to the card normally.
function swallowClickIfDragged(e) {
  if (dragMoved) {
    e.stopPropagation();
    e.preventDefault();
    dragMoved = false; // reset for the next gesture
  }
}
