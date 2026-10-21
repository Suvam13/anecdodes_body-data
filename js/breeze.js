/* ============================================================
   breeze.js — Occasional soft gust that swings all cards
   ------------------------------------------------------------
   Every BREEZE_MIN_MS..BREEZE_MAX_MS milliseconds, adds the
   `.breeze` class to `.row` for BREEZE_DURATION_MS, then
   removes it. The CSS animation in breeze.css handles the
   actual motion; we just toggle the class on a random timer.

   Exports:
     initBreeze()  →  starts the gust timer loop. Call once
                      on DOMContentLoaded, after initCarousel()
                      has rendered the cards.
   ============================================================ */

import { getRow } from './carousel.js';

// ============================================================
// ===== CONFIG =====
// ============================================================
const CONFIG = {
  // Random interval between gusts (ms). Each interval is a fresh
  // random value in [BREEZE_MIN_MS, BREEZE_MAX_MS], so the gusts
  // never settle into a predictable rhythm.
  BREEZE_MIN_MS: 8_000,    // 8s — minimum wait between gusts
  BREEZE_MAX_MS: 20_000,   // 20s — maximum wait between gusts

  // How long the .breeze class stays on .row (ms). Should match
  // --breeze-duration in tokens.css (currently 4s = 4000ms).
  BREEZE_DURATION_MS: 4000,

  // Respect prefers-reduced-motion: if true and the user has
  // requested reduced motion, gusts are skipped entirely.
  RESPECT_REDUCED_MOTION: true,
};
// ============================================================
// ===== END CONFIG =====
// ============================================================


let timer = null;
let active = false;

function randomInterval() {
  return CONFIG.BREEZE_MIN_MS +
    Math.random() * (CONFIG.BREEZE_MAX_MS - CONFIG.BREEZE_MIN_MS);
}

function prefersReducedMotion() {
  if (!CONFIG.RESPECT_REDUCED_MOTION) return false;
  return window.matchMedia &&
         window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function startGust() {
  const row = getRow();
  if (!row || active) return;
  active = true;
  row.classList.add('breeze');

  // After the gust animation completes, remove the class and
  // schedule the next gust at a fresh random interval.
  setTimeout(() => {
    const row = getRow();
    if (row) row.classList.remove('breeze');
    active = false;
    scheduleNext();
  }, CONFIG.BREEZE_DURATION_MS);
}

function scheduleNext() {
  if (prefersReducedMotion()) return;  // never schedule if user opted out
  clearTimeout(timer);
  timer = setTimeout(startGust, randomInterval());
}

export function initBreeze() {
  // Bail out silently if the user prefers reduced motion — they
  // still get the normal per-card swing, just no occasional gusts.
  if (prefersReducedMotion()) return;

  scheduleNext();
}
