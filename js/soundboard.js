// Real Cat & Dog Soundboard using openly licensed Wikimedia Commons audio files (MP3 for iPad Safari compatibility)

export const SOUNDBOARD_ITEMS = {
  cat: [
    { id: 'cat-meow-young',     emoji: '🐱', title: 'Junges Miau',   desc: 'Sanftes, helles Miau',        file: 'assets/sounds/cat-meow-young.mp3' },
    { id: 'cat-meow-siamese',   emoji: '😺', title: 'Siam-Miau',     desc: 'Kräftiges Siam-Miau',         file: 'assets/sounds/cat-meow-siamese.mp3' },
    { id: 'cat-meow-clear',     emoji: '✨', title: 'Klares Miau',   desc: 'Kurzes, klares Miau',         file: 'assets/sounds/cat-meow-clear.mp3' },
    { id: 'cat-meow-pleading',  emoji: '🥺', title: 'Bitte-Miau',    desc: 'Bettelndes Maunzen',          file: 'assets/sounds/cat-meow-pleading.mp3' },
    { id: 'cat-meow-impatient', emoji: '🚪', title: 'Ungeduldig',    desc: '„Mach die Tür auf!“',         file: 'assets/sounds/cat-meow-impatient.mp3' },
    { id: 'cat-trill',          emoji: '🎵', title: 'Gurren',        desc: 'Freundliches Begrüßen',       file: 'assets/sounds/cat-trill.mp3' },
    { id: 'cat-purr',           emoji: '💤', title: 'Schnurren',     desc: 'Gemütliches Schnurren',       file: 'assets/sounds/cat-purr.mp3' },
    { id: 'cat-hiss',           emoji: '😾', title: 'Fauchen',       desc: 'Kurzes Fauchen',              file: 'assets/sounds/cat-hiss.mp3' },
  ],
  dog: [
    { id: 'dog-woof-1',         emoji: '🐶', title: 'Kurzes Wuff',   desc: 'Einzelnes klassisches Wuff',  file: 'assets/sounds/dog-woof-1.mp3' },
    { id: 'dog-woof-2',         emoji: '🐕', title: 'Doppel-Wuff',   desc: 'Zweimal kurz bellen',         file: 'assets/sounds/dog-woof-2.mp3' },
    { id: 'dog-bark-1',         emoji: '📢', title: 'Bellen',        desc: 'Aufmerksames Bellen',         file: 'assets/sounds/dog-bark-1.mp3' },
    { id: 'dog-bark-2',         emoji: '🗣️', title: 'Bell-Serie',    desc: 'Mehrfach hintereinander',     file: 'assets/sounds/dog-bark-2.mp3' },
    { id: 'dog-rottweiler',     emoji: '🐺', title: 'Großer Hund',   desc: 'Tiefes, kräftiges Bellen',    file: 'assets/sounds/dog-rottweiler.mp3' },
    { id: 'dog-howl',           emoji: '🌙', title: 'Heulen',        desc: 'Langes Hunde-Heulen',         file: 'assets/sounds/dog-howl.mp3' },
  ],
};

class SoundboardController {
  constructor() {
    this.activeAudio = null;
    this.activeId = null;
    this.cache = new Map();
    this.buttons = new Map();
    this.stopBtn = null;
  }

  init({ catGrid, dogGrid, stopBtn, randomCatBtn, randomDogBtn, audioEngine }) {
    this.stopBtn = stopBtn;
    this.audioEngine = audioEngine;

    this._renderGroup(catGrid, SOUNDBOARD_ITEMS.cat, 'cat');
    this._renderGroup(dogGrid, SOUNDBOARD_ITEMS.dog, 'dog');

    if (stopBtn) {
      stopBtn.addEventListener('click', () => this.stop());
    }
    if (randomCatBtn) {
      randomCatBtn.addEventListener('click', () => this.playRandom('cat'));
    }
    if (randomDogBtn) {
      randomDogBtn.addEventListener('click', () => this.playRandom('dog'));
    }
  }

  _renderGroup(container, items, group) {
    if (!container) return;
    container.innerHTML = '';
    for (const item of items) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `sound-pad sound-pad-${group}`;
      btn.dataset.soundId = item.id;
      btn.innerHTML = `
        <span class="sound-emoji" aria-hidden="true">${item.emoji}</span>
        <span class="sound-info">
          <span class="sound-title">${item.title}</span>
          <span class="sound-desc">${item.desc}</span>
        </span>
        <span class="sound-bars" aria-hidden="true">
          <i></i><i></i><i></i>
        </span>
      `;
      btn.addEventListener('click', () => this.toggle(item));
      container.appendChild(btn);
      this.buttons.set(item.id, btn);
    }
  }

  _setPlayingUI(id) {
    for (const [btnId, btn] of this.buttons.entries()) {
      btn.classList.toggle('playing', btnId === id);
    }
    if (this.stopBtn) {
      this.stopBtn.disabled = !id;
    }
  }

  stop() {
    if (this.activeAudio) {
      try {
        this.activeAudio.pause();
        this.activeAudio.currentTime = 0;
      } catch (_) {}
      this.activeAudio = null;
    }
    this.activeId = null;
    this._setPlayingUI(null);
  }

  toggle(item) {
    if (this.audioEngine) this.audioEngine.unlock();
    if (this.activeId === item.id) {
      this.stop();
      return;
    }
    this.play(item);
  }

  play(item) {
    this.stop();

    let el = this.cache.get(item.id);
    if (!el) {
      el = new Audio(item.file);
      el.preload = 'auto';
      el.playsInline = true;
      this.cache.set(item.id, el);
    }

    el.currentTime = 0;
    this.activeAudio = el;
    this.activeId = item.id;
    this._setPlayingUI(item.id);

    const onEnd = () => {
      if (this.activeId === item.id) {
        this.activeAudio = null;
        this.activeId = null;
        this._setPlayingUI(null);
      }
    };

    el.onended = onEnd;
    el.onerror = onEnd;

    const p = el.play();
    if (p && typeof p.catch === 'function') {
      p.catch(() => {
        onEnd();
      });
    }
  }

  playRandom(group) {
    const list = SOUNDBOARD_ITEMS[group] || [];
    if (!list.length) return;
    const candidates = list.length > 1 ? list.filter((i) => i.id !== this.activeId) : list;
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    this.play(pick);
  }
}

export const soundboard = new SoundboardController();
