/* ============================================================
   carousel.js — Card rendering + infinite-loop teleport
   ------------------------------------------------------------
   Exports:
     initCarousel()  →  renders cards into #row and wires up
                        the infinite-loop scroll teleport.
                        Call once on DOMContentLoaded.
     getRow()        →  returns the #row element (used by breeze.js)
     getStage()      →  returns the #stage element (used by drag-scroll.js)
   ============================================================ */

import { cards, palette } from './data.js';

// ============================================================
// ===== CONFIG =====
// ============================================================
// Tunable values for the carousel. Change these to adjust behavior
// without digging through the rendering logic below.

const CONFIG = {
  // Number of times to duplicate the card set so the loop has runway
  // on both sides. 3 copies = [Set A][Set B][Set C]. We start the
  // scroll in Set B's position so the user can scroll left or right
  // and we can silently teleport them back, keeping the perceived
  // scroll direction continuous.
  REPEAT: 3,

  // Depth distribution — probability weights for each Z-layer.
  // Should sum to 1.0. Cards are assigned a depth at render time.
  // .near → bigger, sharper shadow, wider swing
  // .mid  → default
  // .far  → smaller, lighter shadow, haze tint, subtler swing
  DEPTH_WEIGHTS: {
    near: 0.25,
    mid:  0.50,
    far:  0.25,
  },

  // Size variant distribution — probability weights for each aspect ratio.
  // Should sum to 1.0. Independent of depth (any size can be at any depth).
  // .portrait → 1:1.38 (default tall card)
  // .note     → 1:1.1  (squarer, sticky-note feel)
  // .square   → 1:1.0  (small square card)
  SIZE_WEIGHTS: {
    portrait: 0.55,
    note:     0.30,
    square:   0.15,
  },

  // Per-depth thread length ranges (px). These override the old single
  // THREAD_MIN/THREAD_RANGE so each depth layer has its own believable
  // thread length: near cards hang lower (longer threads), far cards
  // appear higher up (shorter threads).
  // SHORTENED to compensate for the header taking vertical space at the top.
  THREAD_RANGES: {
    near: { min: 90, max: 150 },
    mid:  { min: 100,  max: 160 },
    far:  { min: 110,  max: 170 },
  },

  // Sine-wave placement — produces smooth, organic variation across the
  // row, like a wave passing through the cards. Each property uses a
  // different frequency (multiplied by card index i), so the patterns
  // never sync up. Frequencies are based on the golden ratio and small
  // irrational offsets, which gives a quasi-periodic pattern that
  // doesn't visibly repeat across the row.
  SINE_FREQ: {
    depth:  0.62,   // slow wave — cards drift gradually between near/mid/far
    thread: 0.97,   // medium wave — thread lengths undulate
    size:   1.31,   // faster wave — size variants cycle more quickly
    swing:  0.83,   // medium wave — swing duration varies smoothly
  },

  // Phase offsets (radians) so each property's wave starts at a different
  // point — prevents all properties from peaking at the same card.
  SINE_PHASE: {
    depth:  0.0,
    thread: 1.3,
    size:   2.7,
    swing:  0.5,
  },

  // Thresholds for sine-to-bucket mapping.
  // sin > THRESHOLD_HIGH → top bucket (near / square)
  // sin < -THRESHOLD_HIGH → bottom bucket (far / square on low side)
  // else → middle bucket (mid / portrait)
  // With THRESHOLD_HIGH = 0.7, each tail gets ~25% of the cycle.
  DEPTH_THRESHOLD: 0.7,

  // Swing duration range (seconds). Each card gets a slightly
  // different pendulum speed so they don't move in sync.
  // Desktop: SWING_BASE..SWING_BASE+SWING_VARIANCE
  // Mobile:  SWING_BASE..SWING_BASE+SWING_VARIANCE-1 (slightly faster)
  SWING_BASE: 5,
  SWING_VARIANCE: 4,

  // Swing delay range (seconds, negative = starts mid-cycle).
  // Staggers cards so they don't all start at the same phase.
  SWING_DELAY_VARIANCE: 5,

  // Mobile breakpoint (should match --mobile-breakpoint in tokens.css)
  MOBILE_BREAKPOINT: 700,

  // Debounce delay (ms) for window resize before re-rendering
  RESIZE_DEBOUNCE: 200,
};

// ============================================================
// ===== END CONFIG =====
// ============================================================


const row = document.getElementById('row');
const stage = document.getElementById('stage');
let scrollHandler = null;

function isMobile() {
  return window.innerWidth < CONFIG.MOBILE_BREAKPOINT;
}

// ---- Sine-wave helpers ----
// Each property (depth, thread length, size, swing) is derived from
// Math.sin(i * freq + phase). Different frequencies + phases keep the
// patterns from syncing up, so the row looks intentionally varied
// rather than periodic.

function sine(i, freq, phase) {
  return Math.sin(i * freq + phase);
}

// Map sin value (-1..1) to a depth class with ~25/50/25 distribution.
// sin > threshold  → 'near' (top ~25% of cycle)
// sin < -threshold → 'far'  (bottom ~25% of cycle)
// else             → 'mid'  (middle ~50% of cycle)
function depthFromSine(sinVal) {
  const t = CONFIG.DEPTH_THRESHOLD;
  if (sinVal > t) return 'near';
  if (sinVal < -t) return 'far';
  return 'mid';
}

// Map sin value (-1..1) to a size variant.
// We use three regions on the sine curve:
//   sin > 0.85  → 'square'  (small portion — top of cycle)
//   sin > 0.20  → 'note'    (medium portion — upper-middle)
//   else        → 'portrait' (largest portion — rest of cycle)
function sizeFromSine(sinVal) {
  if (sinVal > 0.85) return 'square';
  if (sinVal > 0.20) return 'note';
  return 'portrait';
}

// Map sin value (-1..1) to a number in [min, max]
function rangeFromSine(sinVal, min, max) {
  return min + (max - min) * (sinVal + 1) / 2;
}

function buildCards() {
  row.innerHTML = '';
  const mobile = isMobile();

  // Render the card set REPEAT times so we have visual copies to teleport between.
  // All assignments are derived from card index i via sine waves, so each
  // repeated set has IDENTICAL assignments — the infinite-loop teleport is
  // visually seamless (no random pattern mismatch between sets).
  for (let r = 0; r < CONFIG.REPEAT; r++) {
    cards.forEach((c, i) => {
      // Sine-driven properties — each uses its own frequency + phase
      const depthSin  = sine(i, CONFIG.SINE_FREQ.depth,  CONFIG.SINE_PHASE.depth);
      const threadSin = sine(i, CONFIG.SINE_FREQ.thread, CONFIG.SINE_PHASE.thread);
      const sizeSin   = sine(i, CONFIG.SINE_FREQ.size,   CONFIG.SINE_PHASE.size);
      const swingSin  = sine(i, CONFIG.SINE_FREQ.swing,  CONFIG.SINE_PHASE.swing);

      const depth = depthFromSine(depthSin);
      const sizeVariant = sizeFromSine(sizeSin);

      // Thread length comes from the depth layer's range, modulated by sine
      const range = CONFIG.THREAD_RANGES[depth];
      const threadLen = rangeFromSine(threadSin, range.min, range.max);

      // Swing timing — smooth sine variation instead of modulo arithmetic
      const swingDur = CONFIG.SWING_BASE +
        rangeFromSine(swingSin, 0, CONFIG.SWING_VARIANCE) +
        (mobile ? 0 : 1);
      const swingDelay = -rangeFromSine(swingSin, 0, CONFIG.SWING_DELAY_VARIANCE);

      const hanger = document.createElement('div');
      // .hanger gets the depth class (.near/.mid/.far) which sets:
      //   --depth-scale, --card-shadow, --swing-amp, --hover-lift, --card-haze
      hanger.className = `hanger ${depth}`;
      hanger.style.setProperty('--thread-len', `${threadLen}px`);
      hanger.style.setProperty('--swing-dur', `${swingDur}s`);
      hanger.style.setProperty('--swing-delay', `${swingDelay}s`);

      const thread = document.createElement('div');
      thread.className = 'thread';

      // Swing wrapper — the only thing that rotates. Holds the card.
      // data-breeze-index lets breeze.css stagger the wave across cards.
      const swing = document.createElement('div');
      swing.className = 'swing';
      // Use a stable per-card-index value so repeated sets share the wave pattern
      swing.dataset.breezeIndex = String(i);

      const card = document.createElement('div');
      // .card gets the size variant class (.portrait/.note/.square) which sets:
      //   --ratio-w, --ratio-h
      card.className = `card ${sizeVariant}`;
      const colorIdx = i % palette.length;
      card.style.setProperty('--card-color', palette[colorIdx].front);
      card.style.setProperty('--card-color-back', palette[colorIdx].back);

      const num = String(i + 1).padStart(2, '0');
      card.innerHTML = `
        <div class="face front">
          <span class="lang-label">EN</span>
          <span class="num">No. ${num}</span>
          <p class="quote">"${c.en}"</p>
          <span class="hint">tap to flip</span>
        </div>
        <div class="face back">
          <span class="lang-label">ने</span>
          <span class="num">नं. ${num}</span>
          <p class="quote">"${c.ne}"</p>
          <span class="hint">tap to flip back</span>
        </div>
      `;

      card.addEventListener('click', () => {
        card.classList.toggle('flipped');
      });

      hanger.appendChild(thread);
      swing.appendChild(card);
      hanger.appendChild(swing);
      row.appendChild(hanger);
    });
  }

  setupInfiniteLoop();
}

function setupInfiniteLoop() {
  // Remove any previous scroll handler (e.g. on resize re-render)
  if (scrollHandler) {
    stage.removeEventListener('scroll', scrollHandler);
    scrollHandler = null;
  }

  // Wait for layout to settle so offsetLeft measurements are correct
  requestAnimationFrame(() => {
    const setCount = cards.length;
    if (row.children.length < setCount * 2) return;

    // Width of one full set (distance from set N's first card to set N+1's first card)
    const setWidth = row.children[setCount].offsetLeft - row.children[0].offsetLeft;

    // Start in the middle set (Set B) so we can scroll left or right and teleport either way
    stage.scrollLeft = setWidth;

    scrollHandler = () => {
      // Scrolled into Set C (past 2 sets) → silently jump back one set toward B.
      // Visually identical cards mean the user perceives continuous forward motion.
      if (stage.scrollLeft >= setWidth * 2) {
        stage.scrollLeft -= setWidth;
      }
      // Scrolled back into Set A (before the middle) → silently jump forward one set.
      else if (stage.scrollLeft <= 0) {
        stage.scrollLeft += setWidth;
      }
    };
    stage.addEventListener('scroll', scrollHandler, { passive: true });
  });
}

// Expose elements so other modules can attach to them
export function getStage() { return stage; }
export function getRow() { return row; }

export function initCarousel() {
  buildCards();

  // Re-render on resize (debounced). Re-rendering regenerates depth/size/thread
  // assignments too — if you want those to stay stable across resizes, swap
  // buildCards() for a re-measure-only function instead.
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(buildCards, CONFIG.RESIZE_DEBOUNCE);
  });
}