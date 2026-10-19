/* ============================================================
   carousel.js — Card rendering + infinite-loop teleport
   ------------------------------------------------------------
   Exports:
     initCarousel()  →  renders cards into #row and wires up
                        the infinite-loop scroll teleport.
                        Call once on DOMContentLoaded.
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

  // Thread length range (px). Each card's thread is a random value
  // in [THREAD_MIN, THREAD_MIN + THREAD_RANGE]. Set both to the same
  // value for fixed-length threads.
  THREAD_MIN: 100,
  THREAD_RANGE: 160,         // → threads range from 100 to 260px

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

function buildCards() {
  row.innerHTML = '';
  const mobile = isMobile();

  // Render the card set REPEAT times so we have visual copies to teleport between
  for (let r = 0; r < CONFIG.REPEAT; r++) {
    cards.forEach((c, i) => {
      // Thread length for this card — random in [THREAD_MIN, THREAD_MIN + THREAD_RANGE]
      const threadLen = CONFIG.THREAD_MIN + Math.random() * CONFIG.THREAD_RANGE;

      // Swing timing — varied so cards don't move in sync
      const swingDur = CONFIG.SWING_BASE + ((i * 7) % CONFIG.SWING_VARIANCE) + (mobile ? 0 : 1);
      const swingDelay = -((i * 1.3) % CONFIG.SWING_DELAY_VARIANCE);

      const hanger = document.createElement('div');
      hanger.className = 'hanger';
      hanger.style.setProperty('--thread-len', `${threadLen}px`);
      hanger.style.setProperty('--swing-dur', `${swingDur}s`);
      hanger.style.setProperty('--swing-delay', `${swingDelay}s`);

      const thread = document.createElement('div');
      thread.className = 'thread';

      const card = document.createElement('div');
      card.className = 'card';
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
      hanger.appendChild(card);
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

// Expose the stage element so drag-scroll.js can attach to it
export function getStage() { return stage; }

export function initCarousel() {
  buildCards();

  // Re-render on resize (debounced). Re-rendering regenerates thread lengths
  // too — if you want threads to stay stable across resizes, swap buildCards()
  // for a re-measure-only function instead.
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(buildCards, CONFIG.RESIZE_DEBOUNCE);
  });
}
