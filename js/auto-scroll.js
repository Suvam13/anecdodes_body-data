/* ============================================================
   auto-scroll.js — Slow continuous rotation when user is idle
   ------------------------------------------------------------
   Uses requestAnimationFrame to advance the stage's scroll
   position at a steady speed. Pauses while the user is holding
   the pointer down, and for PAUSE_MS after any interaction
   (drag, wheel, key press, tap), then resumes.

   Implementation notes:
     - We keep our OWN floating-point position (`pos`). Browsers
       round scrollLeft to whole device pixels, so doing
       `scrollLeft += 0.4` reads back an integer and writes the
       same integer — the carousel never moves. Tracking the
       float ourselves avoids that.
     - If the real scrollLeft drifts away from `pos` (user scroll,
       drag, or the infinite-loop teleport in carousel.js), we
       resync `pos` to the real value instead of fighting it.
     - User interaction is detected from input events (pointer,
       wheel, keyboard), NOT from scroll events. Scroll events
       fire asynchronously, so they can't be reliably attributed
       to our own scroll changes.
     - scrollTo({ behavior: 'instant' }) bypasses any CSS
       `scroll-behavior: smooth` on the stage.
   ============================================================ */

import { getStage } from './carousel.js';

// ============================================================
// ===== CONFIG =====
// ============================================================
const CONFIG = {
  // Scroll speed in pixels per second. Positive = content moves left.
  // 40 is slow and calm. Try 25 for slower, 80 for faster.
  SPEED_PX_PER_SEC: 40,

  // How long to pause after user interaction before resuming (ms).
  PAUSE_MS: 3500,

  // Respect prefers-reduced-motion: if true and the user has
  // requested reduced motion, auto-scroll is disabled entirely.
  RESPECT_REDUCED_MOTION: true,

  // Largest time step (ms) allowed per frame, so returning to a
  // backgrounded tab doesn't cause a big jump.
  MAX_DT_MS: 50,

  // If the real scrollLeft differs from our tracked position by
  // more than this many px, something else moved it (user, loop
  // teleport, resize) and we resync.
  RESYNC_THRESHOLD_PX: 2,
};
// ============================================================
// ===== END CONFIG =====
// ============================================================


let rafId = null;
let lastTs = null;
let pausedUntil = 0;
let holding = false;   // true while a pointer is pressed on the stage
let pos = null;        // our own float scroll position

function prefersReducedMotion() {
  if (!CONFIG.RESPECT_REDUCED_MOTION) return false;
  return window.matchMedia &&
         window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function tick(ts) {
  const stage = getStage();
  const dt = lastTs === null
    ? 0
    : Math.min(ts - lastTs, CONFIG.MAX_DT_MS) / 1000;
  lastTs = ts;

  if (stage && dt > 0) {
    const paused = holding || ts < pausedUntil;

    // Follow the real scroll position whenever we're paused, on the
    // first frame, or when something else moved it (teleport, resize).
    if (paused ||
        pos === null ||
        Math.abs(stage.scrollLeft - pos) > CONFIG.RESYNC_THRESHOLD_PX) {
      pos = stage.scrollLeft;
    }

    if (!paused) {
      pos += CONFIG.SPEED_PX_PER_SEC * dt;
      stage.scrollTo({ left: pos, behavior: 'instant' });
    }
  }

  rafId = requestAnimationFrame(tick);
}

function pause() {
  pausedUntil = performance.now() + CONFIG.PAUSE_MS;
}

function release() {
  if (!holding) return;
  holding = false;
  pause();
}

export function initAutoScroll() {
  if (prefersReducedMotion()) return;

  const stage = getStage();
  if (!stage) return;

  // Hold off while a finger/mouse is down on the stage (covers drags
  // and taps), then start the idle timer once it's released.
  stage.addEventListener('pointerdown', () => { holding = true; }, { passive: true });
  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', release);
  window.addEventListener('blur', release);

  // Other manual inputs
  stage.addEventListener('wheel', pause, { passive: true });
  window.addEventListener('keydown', pause);

  rafId = requestAnimationFrame(tick);
}
