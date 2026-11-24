// Game 4: Laser-Jagd (Laserpunkt) — realistic jittery laser pointer that bursts into sparks when caught!

const SPEED_MULT = { slow: 0.72, normal: 1.0, fast: 1.42 };

const STANDARD_LASERS = [
  { core: '#ffffff', main: '#ff1a3c', glow: 'rgba(255, 24, 60, 0.82)', trail: 'rgba(255, 45, 78, 0.62)' },
  { core: '#ffffff', main: '#00f6ff', glow: 'rgba(0, 246, 255, 0.82)', trail: 'rgba(40, 248, 255, 0.62)' },
  { core: '#ffffff', main: '#d4ff00', glow: 'rgba(212, 255, 0, 0.82)', trail: 'rgba(220, 255, 50, 0.62)' },
];

const CAT_LASERS = [
  { core: '#ffffff', main: '#00f6ff', glow: 'rgba(0, 246, 255, 0.88)', trail: 'rgba(45, 248, 255, 0.68)' },
  { core: '#ffffff', main: '#fff000', glow: 'rgba(255, 240, 0, 0.88)', trail: 'rgba(255, 245, 70, 0.68)' },
];

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

class LaserDot {
  constructor(width, height, catVision, idx = 0) {
    this.scale = clamp(Math.min(width, height) / 760, 0.8, 1.25);
    this.colorIdx = idx;
    this.palette = this._pickPalette(catVision);

    const m = 90;
    this.x = m + Math.random() * Math.max(40, width - m * 2);
    this.y = m + Math.random() * Math.max(40, height - m * 2);
    this.tx = this.x;
    this.ty = this.y;
    this.renderX = this.x;
    this.renderY = this.y;

    this.state = 'stalk'; // stalk | wiggle | zip | blink
    this.stateTimer = 0.8 + Math.random() * 1.1;
    this.jitterPhase = Math.random() * 100;
    this.visible = true;
    this.trail = [];
    this._pickTarget(width, height);
  }

  _pickPalette(catVision) {
    const list = catVision ? CAT_LASERS : STANDARD_LASERS;
    return list[this.colorIdx % list.length];
  }

  setVision(catVision) {
    this.palette = this._pickPalette(catVision);
  }

  _pickTarget(width, height) {
    const margin = Math.max(68, Math.min(width, height) * 0.1);
    this.tx = margin + Math.random() * Math.max(40, width - margin * 2);
    this.ty = margin + Math.random() * Math.max(40, height - margin * 2);
  }

  respawn(width, height, catVision) {
    this.colorIdx += 1;
    this.palette = this._pickPalette(catVision);
    const margin = Math.max(80, Math.min(width, height) * 0.12);
    this.x = margin + Math.random() * Math.max(40, width - margin * 2);
    this.y = margin + Math.random() * Math.max(40, height - margin * 2);
    this.renderX = this.x;
    this.renderY = this.y;
    this.trail = [];
    this.state = 'wiggle';
    this.stateTimer = 0.7 + Math.random() * 0.6;
    this.visible = true;
    this._pickTarget(width, height);
  }

  spookFrom(px, py, width, height, audio) {
    const away = Math.atan2(this.y - py, this.x - px) + (Math.random() - 0.5) * 0.8;
    const dist = 260 + Math.random() * 200;
    const m = 70;
    this.tx = clamp(this.x + Math.cos(away) * dist, m, width - m);
    this.ty = clamp(this.y + Math.sin(away) * dist, m, height - m);
    this.state = 'zip';
    this.stateTimer = 0.55;
    this.visible = true;
    audio.playLaserZip();
  }

  update(dt, width, height, speedMult, audio) {
    this.jitterPhase += dt * 24;
    this.stateTimer -= dt;

    if (this.stateTimer <= 0) {
      const r = Math.random();
      if (this.state === 'blink') {
        this.visible = true;
        this.state = 'wiggle';
        this.stateTimer = 0.55 + Math.random() * 0.65;
      } else if (this.state === 'wiggle') {
        this.state = r < 0.55 ? 'zip' : 'stalk';
        this.stateTimer = this.state === 'zip' ? 0.55 + Math.random() * 0.35 : 1.1 + Math.random() * 1.1;
        this._pickTarget(width, height);
        if (this.state === 'zip') audio.playLaserZip();
      } else {
        if (r < 0.42) {
          this.state = 'wiggle';
          this.stateTimer = 0.5 + Math.random() * 0.85;
        } else if (r < 0.55) {
          this.state = 'blink';
          this.visible = false;
          this.stateTimer = 0.28 + Math.random() * 0.22;
          const m = 80;
          this.x = clamp(this.x + (Math.random() - 0.5) * 280, m, width - m);
          this.y = clamp(this.y + (Math.random() - 0.5) * 240, m, height - m);
          this.trail = [];
        } else if (r < 0.82) {
          this.state = 'zip';
          this.stateTimer = 0.5 + Math.random() * 0.4;
          this._pickTarget(width, height);
          audio.playLaserZip();
        } else {
          this.state = 'stalk';
          this.stateTimer = 1.0 + Math.random() * 1.1;
          this._pickTarget(width, height);
        }
      }
    }

    if (this.visible) {
      if (this.state === 'stalk' || this.state === 'zip') {
        const dx = this.tx - this.x;
        const dy = this.ty - this.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 18) {
          this.state = 'wiggle';
          this.stateTimer = 0.45 + Math.random() * 0.7;
        } else {
          const spd = (this.state === 'zip' ? 680 : 210) * speedMult;
          const step = Math.min(dist, spd * dt);
          this.x += (dx / dist) * step;
          this.y += (dy / dist) * step;
        }
      }

      // Organic "human wrist holding a laser pointer" micro-jitter!
      const jitterAmp = this.state === 'wiggle' ? 9.5 * this.scale : 3.2 * this.scale;
      const jx = (Math.sin(this.jitterPhase) * 0.6 + Math.cos(this.jitterPhase * 1.73) * 0.4) * jitterAmp;
      const jy = (Math.cos(this.jitterPhase * 1.29) * 0.6 + Math.sin(this.jitterPhase * 2.1) * 0.4) * jitterAmp;

      this.renderX = clamp(this.x + jx, 24, width - 24);
      this.renderY = clamp(this.y + jy, 24, height - 24);

      this.trail.push({ x: this.renderX, y: this.renderY });
      if (this.trail.length > 16) this.trail.shift();
    }
  }

  hitTest(px, py) {
    if (!this.visible) return false;
    const r = 46 * this.scale + 22;
    const dx = px - this.renderX;
    const dy = py - this.renderY;
    return dx * dx + dy * dy <= r * r;
  }

  nearTest(px, py) {
    if (!this.visible) return false;
    const r = 130 * this.scale;
    const dx = px - this.renderX;
    const dy = py - this.renderY;
    return dx * dx + dy * dy <= r * r;
  }

  draw(ctx) {
    if (!this.visible) return;
    const s = this.scale;
    const p = this.palette;

    // Motion-blur neon light ribbon trail
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    if (this.trail.length > 2) {
      ctx.lineCap = 'round';
      for (let i = 1; i < this.trail.length; i++) {
        const ratio = i / this.trail.length;
        ctx.beginPath();
        ctx.moveTo(this.trail[i - 1].x, this.trail[i - 1].y);
        ctx.lineTo(this.trail[i].x, this.trail[i].y);
        ctx.strokeStyle = p.trail;
        ctx.globalAlpha = ratio * 0.78;
        ctx.lineWidth = (3.5 + ratio * 13.5) * s;
        ctx.stroke();
      }
    }

    // Wide intense optical bloom on pitch-black background
    ctx.globalAlpha = 1;
    const outerR = 68 * s;
    const halo = ctx.createRadialGradient(this.renderX, this.renderY, 2 * s, this.renderX, this.renderY, outerR);
    halo.addColorStop(0, p.glow);
    halo.addColorStop(0.28, p.trail);
    halo.addColorStop(0.62, 'rgba(0,0,0,0.08)');
    halo.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(this.renderX, this.renderY, outerR, 0, Math.PI * 2);
    ctx.fill();

    // Inner blazing halo
    const innerR = 26 * s;
    const innerHalo = ctx.createRadialGradient(this.renderX, this.renderY, 2 * s, this.renderX, this.renderY, innerR);
    innerHalo.addColorStop(0, '#ffffff');
    innerHalo.addColorStop(0.45, p.main);
    innerHalo.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = innerHalo;
    ctx.beginPath();
    ctx.arc(this.renderX, this.renderY, innerR, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Saturated laser core
    ctx.fillStyle = p.main;
    ctx.beginPath();
    ctx.arc(this.renderX, this.renderY, 13.5 * s, 0, Math.PI * 2);
    ctx.fill();

    // Blazing white-hot pinpoint center
    ctx.fillStyle = p.core;
    ctx.beginPath();
    ctx.arc(this.renderX, this.renderY, 8 * s, 0, Math.PI * 2);
    ctx.fill();
  }
}

export class LaserGame {
  constructor({ width, height, settings, audio, onCatch }) {
    this.width = width;
    this.height = height;
    this.settings = settings;
    this.audio = audio;
    this.onCatch = onCatch;
    this.time = 0;

    this.dots = [];
    this.sparks = [];
    this.rings = [];
    this.floats = [];

    this._syncDotCount();
  }

  _syncDotCount() {
    const target = Number(this.settings.count) || 2;
    const catVision = this.settings.vision === 'cat';
    while (this.dots.length < target) {
      this.dots.push(new LaserDot(this.width, this.height, catVision, this.dots.length));
    }
    if (this.dots.length > target) {
      this.dots.length = target;
    }
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
  }

  updateSettings(settings) {
    const visionChanged = this.settings.vision !== settings.vision;
    this.settings = settings;
    this._syncDotCount();
    if (visionChanged) {
      const catVision = settings.vision === 'cat';
      for (const d of this.dots) d.setVision(catVision);
    }
  }

  _spawnExplosion(x, y, color) {
    this.rings.push({ x, y, r: 8, maxR: 135, life: 0.48, maxLife: 0.48, color });
    this.rings.push({ x, y, r: 4, maxR: 85, life: 0.36, maxLife: 0.36, color: '#ffffff' });

    for (let i = 0; i < 26; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 120 + Math.random() * 340;
      this.sparks.push({
        x,
        y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        len: 8 + Math.random() * 14,
        life: 0.35 + Math.random() * 0.35,
        maxLife: 0.7,
        color: i % 3 === 0 ? '#ffffff' : color,
      });
    }
    this.floats.push({ x, y: y - 16, text: '+10', life: 0.85, maxLife: 0.85, color });
  }

  onPointerDown(x, y) {
    let caughtAny = false;
    const catVision = this.settings.vision === 'cat';

    for (const dot of this.dots) {
      if (dot.hitTest(x, y)) {
        caughtAny = true;
        this._spawnExplosion(dot.renderX, dot.renderY, dot.palette.main);
        this.audio.playLaserCatch();
        this.onCatch(10);
        dot.respawn(this.width, this.height, catVision);
        break;
      }
    }

    if (!caughtAny) {
      this.rings.push({ x, y, r: 6, maxR: 48, life: 0.3, maxLife: 0.3, color: 'rgba(190, 215, 255, 0.55)' });
      for (const dot of this.dots) {
        if (dot.nearTest(x, y)) {
          dot.spookFrom(x, y, this.width, this.height, this.audio);
        }
      }
    }
  }

  onPointerMove(x, y) {
    for (const dot of this.dots) {
      if (dot.hitTest(x, y)) {
        this.onPointerDown(x, y);
        break;
      }
    }
  }

  update(dt) {
    this.time += dt;
    const speedMult = SPEED_MULT[this.settings.speed] || 1.0;

    for (const dot of this.dots) {
      dot.update(dt, this.width, this.height, speedMult, this.audio);
    }

    for (let i = this.rings.length - 1; i >= 0; i--) {
      const rg = this.rings[i];
      rg.life -= dt;
      const prog = 1 - rg.life / rg.maxLife;
      rg.r = 8 + prog * (rg.maxR - 8);
      if (rg.life <= 0) this.rings.splice(i, 1);
    }

    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const sp = this.sparks[i];
      sp.x += sp.vx * dt;
      sp.y += sp.vy * dt;
      sp.vx *= Math.pow(0.05, dt);
      sp.vy *= Math.pow(0.05, dt);
      sp.life -= dt;
      if (sp.life <= 0) this.sparks.splice(i, 1);
    }

    for (let i = this.floats.length - 1; i >= 0; i--) {
      this.floats[i].y -= 38 * dt;
      this.floats[i].life -= dt;
      if (this.floats[i].life <= 0) this.floats.splice(i, 1);
    }
  }

  draw(ctx) {
    const w = this.width;
    const h = this.height;

    // Pitch-black floor so the glowing laser pops with maximum luminance
    const bg = ctx.createRadialGradient(w * 0.5, h * 0.5, 10, w * 0.5, h * 0.5, Math.max(w, h) * 0.72);
    bg.addColorStop(0, '#040508');
    bg.addColorStop(1, '#000000');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    for (const rg of this.rings) {
      const a = clamp(rg.life / rg.maxLife, 0, 1);
      ctx.save();
      ctx.globalAlpha = a * 0.85;
      ctx.beginPath();
      ctx.arc(rg.x, rg.y, rg.r, 0, Math.PI * 2);
      ctx.strokeStyle = rg.color;
      ctx.lineWidth = 3.5 * a + 1;
      ctx.stroke();
      ctx.restore();
    }

    for (const dot of this.dots) {
      dot.draw(ctx);
    }

    // Spark rays
    ctx.save();
    ctx.lineCap = 'round';
    for (const sp of this.sparks) {
      const a = clamp(sp.life / sp.maxLife, 0, 1);
      const ang = Math.atan2(sp.vy, sp.vx);
      ctx.globalAlpha = a;
      ctx.strokeStyle = sp.color;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(sp.x, sp.y);
      ctx.lineTo(sp.x - Math.cos(ang) * sp.len, sp.y - Math.sin(ang) * sp.len);
      ctx.stroke();
    }
    ctx.restore();

    for (const fl of this.floats) {
      const a = clamp(fl.life / fl.maxLife, 0, 1);
      ctx.save();
      ctx.globalAlpha = a * 0.95;
      ctx.font = '700 26px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = fl.color;
      ctx.shadowBlur = 12;
      ctx.fillText(fl.text, fl.x, fl.y);
      ctx.restore();
    }
  }
}

export function drawLaserPreview(ctx, w, h, t) {
  const bg = ctx.createRadialGradient(w * 0.5, h * 0.5, 8, w * 0.5, h * 0.5, w * 0.65);
  bg.addColorStop(0, '#05060a');
  bg.addColorStop(1, '#000000');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Smooth looping figure-8 trail + glowing laser dot
  const pts = [];
  for (let i = 0; i < 16; i++) {
    const tt = t - (15 - i) * 0.032;
    pts.push({
      x: w * 0.5 + Math.sin(tt * 1.9) * (w * 0.28),
      y: h * 0.5 + Math.sin(tt * 3.8) * (h * 0.22),
    });
  }

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  for (let i = 1; i < pts.length; i++) {
    const r = i / pts.length;
    ctx.beginPath();
    ctx.moveTo(pts[i - 1].x, pts[i - 1].y);
    ctx.lineTo(pts[i].x, pts[i].y);
    ctx.strokeStyle = `rgba(255, 32, 68, ${r * 0.72})`;
    ctx.lineWidth = 2.5 + r * 9;
    ctx.stroke();
  }

  const head = pts[pts.length - 1];
  const halo = ctx.createRadialGradient(head.x, head.y, 2, head.x, head.y, 46);
  halo.addColorStop(0, 'rgba(255, 24, 60, 0.92)');
  halo.addColorStop(0.4, 'rgba(255, 24, 60, 0.38)');
  halo.addColorStop(1, 'rgba(255, 24, 60, 0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(head.x, head.y, 46, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = '#ff1a3c';
  ctx.beginPath();
  ctx.arc(head.x, head.y, 10, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(head.x, head.y, 5.5, 0, Math.PI * 2);
  ctx.fill();
}
