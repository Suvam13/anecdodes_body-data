/* ============================================================
   main.js — Orchestrator
   ------------------------------------------------------------
   Entry point. Imports and initializes everything in the
   correct order. If you want to disable a feature temporarily,
   comment out its init line here.
   ============================================================ */

import { initCarousel } from './carousel.js';
import { initDragScroll } from './drag-scroll.js';

function init() {
  initCarousel();   // render cards + wire up infinite loop
  initDragScroll(); // wire up drag-to-scroll (must come after carousel so #stage exists)
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
