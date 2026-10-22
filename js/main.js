import { initCarousel } from './carousel.js';
import { initDragScroll } from './drag-scroll.js';
import { initBreeze } from './breeze.js';
import { initAutoScroll } from './auto-scroll.js';

function init() {
  initCarousel();
  initDragScroll();
  initBreeze();
  initAutoScroll();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
