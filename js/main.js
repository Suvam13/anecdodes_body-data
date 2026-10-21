/* ============================================================
   main.js — Orchestrator
   ------------------------------------------------------------
   Entry point. Imports and initializes everything in the
   correct order. If you want to disable a feature temporarily,
   comment out its init line here.

   Init order matters:
     1. carousel  — renders the cards (creates #row contents)
     2. drag      — wires up pointer drag on #stage (needs #stage to exist)
     3. breeze    — wires up the gust timer (needs #row to exist)
   ============================================================ */

import { initCarousel } from './carousel.js';
import { initDragScroll } from './drag-scroll.js';
import { initBreeze } from './breeze.js';

function init() {
  initCarousel();   // render cards + wire up infinite loop
  initDragScroll(); // wire up drag-to-scroll (must come after carousel so #stage exists)
  initBreeze();     // wire up occasional breeze gusts (must come after carousel so #row exists)
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
