
import { getStage } from './carousel.js';

const CONFIG = {
  SPEED_PX_PER_SEC: 40,
  PAUSE_MS: 3500,
  RESPECT_REDUCED_MOTION: true,
  MAX_DT_MS: 50,
  RESYNC_THRESHOLD_PX: 2,
};

let rafId = null;
let lastTs = null;
let pausedUntil = 0;
let holding = false;
let pos = null;

function prefersReducedMotion() {
  if (!CONFIG.RESPECT_REDUCED_MOTION) return false;

  return (
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function tick(ts) {
  const stage = getStage();

  const dt = lastTs === null
    ? 0
    : Math.min(ts - lastTs, CONFIG.MAX_DT_MS) / 1000;

  lastTs = ts;

  if (stage && dt > 0) {
    const paused = holding || ts < pausedUntil;

    if (
      paused ||
      pos === null ||
      Math.abs(stage.scrollLeft - pos) > CONFIG.RESYNC_THRESHOLD_PX
    ) {
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

  stage.addEventListener('pointerdown', () => {
    holding = true;
  }, { passive: true });

  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', release);
  window.addEventListener('blur', release);

  stage.addEventListener('wheel', pause, { passive: true });
  window.addEventListener('keydown', pause);

  rafId = requestAnimationFrame(tick);
}
