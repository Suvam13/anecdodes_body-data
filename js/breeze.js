
import { getRow } from './carousel.js';

const CONFIG = {
  BREEZE_MIN_MS: 8_000,
  BREEZE_MAX_MS: 20_000,
  BREEZE_DURATION_MS: 4000,
  RESPECT_REDUCED_MOTION: true,
};

let timer = null;
let active = false;

function randomInterval() {
  return (
    CONFIG.BREEZE_MIN_MS +
    Math.random() * (CONFIG.BREEZE_MAX_MS - CONFIG.BREEZE_MIN_MS)
  );
}

function prefersReducedMotion() {
  if (!CONFIG.RESPECT_REDUCED_MOTION) return false;

  return (
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function startGust() {
  const row = getRow();

  if (!row || active) return;

  active = true;
  row.classList.add('breeze');

  setTimeout(() => {
    const row = getRow();

    if (row) row.classList.remove('breeze');

    active = false;
    scheduleNext();
  }, CONFIG.BREEZE_DURATION_MS);
}

function scheduleNext() {
  if (prefersReducedMotion()) return;

  clearTimeout(timer);
  timer = setTimeout(startGust, randomInterval());
}

export function initBreeze() {
  if (prefersReducedMotion()) return;

  scheduleNext();
}
