import { audio } from './audio.js';
import { FishGame, drawFishPreview } from './games/fish.js';
import { MouseGame, drawMousePreview } from './games/mouse.js';
import { BugGame, drawBugPreview } from './games/bug.js';
import { LaserGame, drawLaserPreview } from './games/laser.js';

const GAMES = {
  fish: { Cls: FishGame, preview: drawFishPreview },
  mouse: { Cls: MouseGame, preview: drawMousePreview },
  bug: { Cls: BugGame, preview: drawBugPreview },
  laser: { Cls: LaserGame, preview: drawLaserPreview },
};

const STORAGE_SETTINGS_KEY = 'gurbis_jagd_settings_v1';
const STORAGE_SCORES_KEY = 'gurbis_jagd_scores_v1';
const HOLD_DURATION_MS = 1400;
const RING_CIRCUMFERENCE = 2 * Math.PI * 19; // matches r="19" in index.html

const defaultSettings = {
  speed: 'normal',
  count: '2',
  vision: 'standard',
  sound: 'on',
};

const defaultScores = {
  fish: 0,
  mouse: 0,
  bug: 0,
  laser: 0,
};

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { ...fallback };
    return { ...fallback, ...JSON.parse(raw) };
  } catch (_) {
    return { ...fallback };
  }
}

function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (_) {
    // ignore private browsing quota errors
  }
}

const settings = loadJSON(STORAGE_SETTINGS_KEY, defaultSettings);
const highScores = loadJSON(STORAGE_SCORES_KEY, defaultScores);
audio.setEnabled(settings.sound === 'on');

// DOM Elements
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d', { alpha: false });
const menuOverlay = document.getElementById('menuOverlay');
const hud = document.getElementById('hud');
const hudScore = document.getElementById('hudScore');
const hudBest = document.getElementById('hudBest');
const hudTime = document.getElementById('hudTime');
const exitHoldBtn = document.getElementById('exitHoldBtn');
const holdRingProgress = document.getElementById('holdRingProgress');
const callCatBtn = document.getElementById('callCatBtn');

// App State
let activeGameId = null;
let activeGame = null;
let score = 0;
let elapsedSec = 0;
let viewWidth = window.innerWidth;
let viewHeight = window.innerHeight;
let dpr = 1;
let lastFrameTime = performance.now();
let wakeLock = null;

// Active pointers for multi-paw touch support
const activePointers = new Set();

// Cat-proof hold-to-exit state
let holdPointerId = null;
let holdStartMs = 0;

function formatTime(totalSeconds) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function resizeCanvas() {
  viewWidth = window.innerWidth;
  viewHeight = window.innerHeight;
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(viewWidth * dpr);
  canvas.height = Math.floor(viewHeight * dpr);
  canvas.style.width = `${viewWidth}px`;
  canvas.style.height = `${viewHeight}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (activeGame) {
    activeGame.resize(viewWidth, viewHeight);
  }
}

async function requestWakeLock() {
  if (!('wakeLock' in navigator)) return;
  try {
    wakeLock = await navigator.wakeLock.request('screen');
  } catch (_) {
    // ignore if unsupported or denied
  }
}

function releaseWakeLock() {
  if (wakeLock) {
    wakeLock.release().catch(() => {});
    wakeLock = null;
  }
}

function updateHighScoreBadges() {
  document.querySelectorAll('[data-best]').forEach((el) => {
    const id = el.getAttribute('data-best');
    el.textContent = `Rekord: ${highScores[id] || 0}`;
  });
}

function syncSettingsUI() {
  document.querySelectorAll('.segmented').forEach((group) => {
    const key = group.getAttribute('data-setting');
    const val = String(settings[key]);
    group.querySelectorAll('button').forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-value') === val);
    });
  });
}

function startGame(gameId) {
  const entry = GAMES[gameId];
  if (!entry) return;

  audio.unlock();
  activeGameId = gameId;
  score = 0;
  elapsedSec = 0;

  hudScore.textContent = '0';
  hudBest.textContent = String(highScores[gameId] || 0);
  hudTime.textContent = '0:00';

  activeGame = new entry.Cls({
    width: viewWidth,
    height: viewHeight,
    settings: { ...settings },
    audio,
    onCatch: (points) => {
      score += points;
      hudScore.textContent = String(score);
      if (score > (highScores[activeGameId] || 0)) {
        highScores[activeGameId] = score;
        hudBest.textContent = String(score);
        saveJSON(STORAGE_SCORES_KEY, highScores);
      }
    },
  });

  menuOverlay.classList.add('hidden');
  hud.classList.remove('hidden');
  exitHoldBtn.classList.remove('hidden');
  resetHoldState();
  requestWakeLock();

  // Gentle startup cue so the cat notices the game started
  if (gameId === 'fish') audio.playBubble();
  else if (gameId === 'mouse') audio.playSqueak(false);
  else if (gameId === 'bug') audio.playBuzz(0.11);
  else if (gameId === 'laser') audio.playLaserZip();
}

function returnToMenu() {
  activeGame = null;
  activeGameId = null;
  activePointers.clear();
  resetHoldState();
  releaseWakeLock();
  updateHighScoreBadges();
  hud.classList.add('hidden');
  exitHoldBtn.classList.add('hidden');
  menuOverlay.classList.remove('hidden');
}

// ==================== HOLD-TO-EXIT LOGIC ====================
function resetHoldState() {
  holdPointerId = null;
  holdStartMs = 0;
  exitHoldBtn.classList.remove('holding');
  holdRingProgress.style.strokeDashoffset = String(RING_CIRCUMFERENCE);
}

exitHoldBtn.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  e.stopPropagation();
  if (holdPointerId !== null) return;
  holdPointerId = e.pointerId;
  holdStartMs = performance.now();
  exitHoldBtn.classList.add('holding');
  try {
    exitHoldBtn.setPointerCapture(e.pointerId);
  } catch (_) {}
});

function cancelHold(e) {
  if (e.pointerId === holdPointerId) {
    resetHoldState();
  }
}

exitHoldBtn.addEventListener('pointerup', cancelHold);
exitHoldBtn.addEventListener('pointercancel', cancelHold);
exitHoldBtn.addEventListener('pointerleave', (e) => {
  if (e.pointerId === holdPointerId && !exitHoldBtn.hasPointerCapture?.(e.pointerId)) {
    resetHoldState();
  }
});

// ==================== CANVAS MULTI-PAW TOUCH ====================
function getCanvasCoords(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  };
}

canvas.addEventListener(
  'pointerdown',
  (e) => {
    if (!activeGame) return;
    e.preventDefault();
    audio.unlock();
    activePointers.add(e.pointerId);
    const { x, y } = getCanvasCoords(e);
    activeGame.onPointerDown(x, y);
  },
  { passive: false }
);

canvas.addEventListener(
  'pointermove',
  (e) => {
    if (!activeGame) return;
    if (!activePointers.has(e.pointerId)) return;
    e.preventDefault();
    const { x, y } = getCanvasCoords(e);
    activeGame.onPointerMove(x, y);
  },
  { passive: false }
);

function handlePointerUp(e) {
  activePointers.delete(e.pointerId);
}

canvas.addEventListener('pointerup', handlePointerUp);
canvas.addEventListener('pointercancel', handlePointerUp);

// Prevent iPad Safari pinch-zoom, double-tap zoom, and page bounce while playing
document.addEventListener('gesturestart', (e) => e.preventDefault(), { passive: false });
document.addEventListener('gesturechange', (e) => e.preventDefault(), { passive: false });
canvas.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
canvas.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

// Keyboard escape for desktop testing
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && activeGame) {
    returnToMenu();
  }
});

// ==================== MENU & SETTINGS INTERACTIONS ====================
document.querySelectorAll('.game-card').forEach((card) => {
  card.addEventListener('click', () => {
    const gameId = card.getAttribute('data-game');
    startGame(gameId);
  });
});

document.querySelectorAll('.segmented').forEach((group) => {
  const key = group.getAttribute('data-setting');
  group.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-value]');
    if (!btn) return;
    audio.unlock();
    const val = btn.getAttribute('data-value');
    settings[key] = val;
    if (key === 'sound') {
      audio.setEnabled(val === 'on');
    }
    saveJSON(STORAGE_SETTINGS_KEY, settings);
    syncSettingsUI();
    if (activeGame) {
      activeGame.updateSettings({ ...settings });
    }
  });
});

callCatBtn.addEventListener('click', () => {
  audio.unlock();
  audio.playCatCall();
});

// ==================== LIVE MENU CARD PREVIEWS ====================
const previewNodes = Array.from(document.querySelectorAll('.preview-canvas')).map((el) => ({
  id: el.getAttribute('data-preview'),
  canvas: el,
  ctx: el.getContext('2d'),
}));

function renderMenuPreviews(timeSec) {
  for (const node of previewNodes) {
    const entry = GAMES[node.id];
    if (!entry || !node.ctx) continue;
    entry.preview(node.ctx, node.canvas.width, node.canvas.height, timeSec);
  }
}

// ==================== MAIN ANIMATION LOOP ====================
function tick(now) {
  const dt = Math.min(0.05, Math.max(0.001, (now - lastFrameTime) / 1000));
  lastFrameTime = now;

  if (activeGame) {
    elapsedSec += dt;
    hudTime.textContent = formatTime(elapsedSec);

    // Update cat-proof hold-to-exit ring
    if (holdPointerId !== null) {
      const held = now - holdStartMs;
      const ratio = Math.min(1, held / HOLD_DURATION_MS);
      holdRingProgress.style.strokeDashoffset = String(RING_CIRCUMFERENCE * (1 - ratio));
      if (ratio >= 1) {
        returnToMenu();
        requestAnimationFrame(tick);
        return;
      }
    }

    activeGame.update(dt);
    activeGame.draw(ctx);
  } else {
    renderMenuPreviews(now / 1000);
  }

  requestAnimationFrame(tick);
}

// Re-acquire wake lock when returning to Safari tab
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && activeGame) {
    requestWakeLock();
  }
});

window.addEventListener('resize', resizeCanvas);
window.addEventListener('orientationchange', () => setTimeout(resizeCanvas, 120));

// Boot
resizeCanvas();
syncSettingsUI();
updateHighScoreBadges();
requestAnimationFrame(tick);
