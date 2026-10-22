
import { getStage } from './carousel.js';

const DRAG_THRESHOLD = 5;

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

  window.addEventListener('blur', () => {
    if (isDragging) endDrag();
  });

  window.addEventListener('click', swallowClickIfDragged, true);
}

function onPointerDown(e) {
  if (e.pointerType === 'mouse' && e.button !== 0) return;

  const stage = getStage();

  isDragging = true;
  dragMoved = false;
  dragStartX = e.clientX;
  dragStartScroll = stage.scrollLeft;
}

function onPointerMove(e) {
  if (!isDragging) return;

  const stage = getStage();
  const dx = e.clientX - dragStartX;

  if (Math.abs(dx) > DRAG_THRESHOLD && !dragMoved) {
    dragMoved = true;
    stage.classList.add('dragging');
  }

  stage.scrollLeft = dragStartScroll - dx;
}

function endDrag() {
  if (!isDragging) return;

  isDragging = false;
  getStage().classList.remove('dragging');
}

function swallowClickIfDragged(e) {
  if (!dragMoved) return;

  e.stopPropagation();
  e.preventDefault();
  dragMoved = false;
}
