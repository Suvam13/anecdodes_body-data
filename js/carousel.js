
import { cards, palette } from './data.js';

const CONFIG = {
  REPEAT: 3,

  SIZE_WEIGHTS: {
    portrait: 0.55,
    note: 0.30,
    square: 0.15,
  },

  SINE_FREQ: {
    size: 1.31,
    swing: 0.83,
  },

  SINE_PHASE: {
    size: 2.7,
    swing: 0.5,
  },

  SWING_BASE: 5,
  SWING_VARIANCE: 4,
  SWING_DELAY_VARIANCE: 5,
  MOBILE_BREAKPOINT: 700,
  RESIZE_DEBOUNCE: 200,
};

const row = document.getElementById('row');
const stage = document.getElementById('stage');
let scrollHandler = null;

function isMobile() {
  return window.innerWidth < CONFIG.MOBILE_BREAKPOINT;
}

function sine(i, freq, phase) {
  return Math.sin(i * freq + phase);
}

function sizeFromSine(sinVal) {
  if (sinVal > 0.85) return 'square';
  if (sinVal > 0.20) return 'note';
  return 'portrait';
}

function rangeFromSine(sinVal, min, max) {
  return min + (max - min) * (sinVal + 1) / 2;
}

function buildCards() {
  row.innerHTML = '';

  for (let r = 0; r < CONFIG.REPEAT; r++) {
    cards.forEach((c, i) => {
      const sizeSin = sine(i, CONFIG.SINE_FREQ.size, CONFIG.SINE_PHASE.size);
      const swingSin = sine(i, CONFIG.SINE_FREQ.swing, CONFIG.SINE_PHASE.swing);

      const sizeVariant = sizeFromSine(sizeSin);
      const mobile = isMobile();

      const swingDur =
        CONFIG.SWING_BASE +
        rangeFromSine(swingSin, 0, CONFIG.SWING_VARIANCE) +
        (mobile ? 0 : 1);

      const swingDelay = -rangeFromSine(
        swingSin,
        0,
        CONFIG.SWING_DELAY_VARIANCE
      );

      const hanger = document.createElement('div');
      hanger.className = 'hanger';
      hanger.style.setProperty('--swing-dur', `${swingDur}s`);
      hanger.style.setProperty('--swing-delay', `${swingDelay}s`);

      const thread = document.createElement('div');
      thread.className = 'thread';

      const swing = document.createElement('div');
      swing.className = 'swing';
      swing.dataset.breezeIndex = String(i);

      const card = document.createElement('div');
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
  if (scrollHandler) {
    stage.removeEventListener('scroll', scrollHandler);
    scrollHandler = null;
  }

  requestAnimationFrame(() => {
    const setCount = cards.length;

    if (row.children.length < setCount * 2) return;

    const setWidth =
      row.children[setCount].offsetLeft -
      row.children[0].offsetLeft;

    stage.scrollLeft = setWidth;

    scrollHandler = () => {
      if (stage.scrollLeft >= setWidth * 2) {
        stage.scrollLeft -= setWidth;
      } else if (stage.scrollLeft <= 0) {
        stage.scrollLeft += setWidth;
      }
    };

    stage.addEventListener('scroll', scrollHandler, {
      passive: true,
    });
  });
}

export function getStage() {
  return stage;
}

export function getRow() {
  return row;
}

export function initCarousel() {
  buildCards();

  let resizeTimer;

  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(
      buildCards,
      CONFIG.RESIZE_DEBOUNCE
    );
  });
}
