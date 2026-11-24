// Game 3: Käfer-Wiese (Käfer & Leuchtfalter fangen) — scuttling beetles & glowing moths

const SPEED_MULT = { slow: 0.72, normal: 1.0, fast: 1.4 };

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function normalizeAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

class BugPrey {
  constructor(width, height, catVision, kind = null, spawnFromEdge = true) {
    this.scale = clamp(Math.min(width, height) / 760, 0.76, 1.24);
    this.kind = kind || (Math.random() < 0.55 ? 'beetle' : 'moth');
    this.catVision = catVision;
    this._pickColors();

    this.x = width * 0.5;
    this.y = height * 0.5;
    this.angle = Math.random() * Math.PI * 2;
    this.targetAngle = this.angle;
    this.speed = 0;
    this.baseSpeed = this.kind === 'moth' ? 165 : 145;

    this.state = 'move'; // move | pause | flutter
    this.stateTimer = 0.8 + Math.random() * 1.4;
    this.legPhase = Math.random() * Math.PI * 2;
    this.wingPhase = Math.random() * Math.PI * 2;

    if (spawnFromEdge) {
      this._placeAtEdge(width, height);
    } else {
      const m = 110;
      this.x = m + Math.random() * Math.max(40, width - m * 2);
      this.y = m + Math.random() * Math.max(40, height - m * 2);
    }
  }

  _pickColors() {
    if (this.catVision) {
      this.primary = this.kind === 'moth' ? '#4df3ff' : '#ffee2e';
      this.secondary = this.kind === 'moth' ? '#b8fbff' : '#fff8a6';
      this.glow = this.kind === 'moth' ? 'rgba(77, 243, 255, 0.4)' : 'rgba(255, 238, 46, 0.42)';
    } else {
      if (this.kind === 'beetle') {
        const variants = [
          { primary: '#ffbd1f', secondary: '#ff7b00', glow: 'rgba(255, 195, 50, 0.34)' },
          { primary: '#a8ff35', secondary: '#45d428', glow: 'rgba(168, 255, 53, 0.32)' },
          { primary: '#ff5247', secondary: '#ff8a24', glow: 'rgba(255, 105, 70, 0.32)' },
        ];
        const v = variants[Math.floor(Math.random() * variants.length)];
        this.primary = v.primary;
        this.secondary = v.secondary;
        this.glow = v.glow;
      } else {
        const variants = [
          { primary: '#ffe047', secondary: '#fff5a8', glow: 'rgba(255, 230, 90, 0.38)' },
          { primary: '#56f0ff', secondary: '#c7fbff', glow: 'rgba(86, 240, 255, 0.38)' },
        ];
        const v = variants[Math.floor(Math.random() * variants.length)];
        this.primary = v.primary;
        this.secondary = v.secondary;
        this.glow = v.glow;
      }
    }
  }

  setVision(catVision) {
    this.catVision = catVision;
    this._pickColors();
  }

  _placeAtEdge(width, height) {
    const pad = 42 * this.scale;
    const side = Math.floor(Math.random() * 4);
    if (side === 0) {
      this.x = -pad;
      this.y = height * (0.2 + Math.random() * 0.6);
      this.angle = (Math.random() - 0.5) * 0.7;
    } else if (side === 1) {
      this.x = width + pad;
      this.y = height * (0.2 + Math.random() * 0.6);
      this.angle = Math.PI + (Math.random() - 0.5) * 0.7;
    } else if (side === 2) {
      this.x = width * (0.2 + Math.random() * 0.6);
      this.y = -pad;
      this.angle = Math.PI * 0.5 + (Math.random() - 0.5) * 0.7;
    } else {
      this.x = width * (0.2 + Math.random() * 0.6);
      this.y = height + pad;
      this.angle = -Math.PI * 0.5 + (Math.random() - 0.5) * 0.7;
    }
    this.targetAngle = this.angle;
  }

  spookFrom(px, py, audio) {
    this.targetAngle = Math.atan2(this.y - py, this.x - px) + (Math.random() - 0.5) * 0.7;
    this.state = 'flutter';
    this.stateTimer = 0.5 + Math.random() * 0.35;
    audio.playBuzz(0.14);
  }

  update(dt, width, height, speedMult, audio) {
    this.stateTimer -= dt;
    if (this.stateTimer <= 0) {
      const r = Math.random();
      if (this.state === 'pause') {
        this.state = r < 0.45 ? 'flutter' : 'move';
        this.stateTimer = this.state === 'flutter' ? 0.55 + Math.random() * 0.45 : 0.9 + Math.random() * 1.4;
        this.targetAngle = this.angle + (Math.random() - 0.5) * 2.1;
        if (this.state === 'flutter') audio.playBuzz(0.11);
      } else if (this.state === 'flutter') {
        this.state = r < 0.5 ? 'pause' : 'move';
        this.stateTimer = this.state === 'pause' ? 0.45 + Math.random() * 0.75 : 1.0 + Math.random() * 1.2;
      } else {
        if (r < 0.38) {
          this.state = 'pause';
          this.stateTimer = 0.4 + Math.random() * 0.85;
        } else if (r < 0.68) {
          this.state = 'flutter';
          this.stateTimer = 0.45 + Math.random() * 0.5;
          this.targetAngle = this.angle + (Math.random() - 0.5) * 2.2;
          audio.playBuzz(0.1);
        } else {
          this.stateTimer = 0.65 + Math.random() * 1.0;
          this.targetAngle = this.angle + (Math.random() - 0.5) * 1.7;
        }
      }
    }

    // Steer back into playfield
    const margin = Math.min(width, height) * 0.13;
    if (this.x < margin || this.x > width - margin || this.y < margin || this.y > height - margin) {
      const toCenter = Math.atan2(height * 0.5 - this.y, width * 0.5 - this.x);
      const diff = normalizeAngle(toCenter - this.targetAngle);
      this.targetAngle += diff * Math.min(1, dt * 5.2);
    }

    // Erratic insect zigzag
    if (this.state !== 'pause') {
      this.targetAngle += Math.sin(this.legPhase * 0.35) * dt * (this.kind === 'moth' ? 2.6 : 1.8);
    }

    const desiredSpeed =
      (this.state === 'pause'
        ? 0
        : this.state === 'flutter'
          ? this.baseSpeed * 2.05
          : this.baseSpeed) * speedMult;

    this.speed += (desiredSpeed - this.speed) * Math.min(1, dt * 9.5);

    const turnRate = this.state === 'flutter' ? 9.0 : 6.0;
    const diff = normalizeAngle(this.targetAngle - this.angle);
    this.angle += clamp(diff, -turnRate * dt, turnRate * dt);

    this.x += Math.cos(this.angle) * this.speed * dt;
    this.y += Math.sin(this.angle) * this.speed * dt;

    this.legPhase += dt * (this.speed * 0.16 + 4);
    const wingSpeed = this.kind === 'moth' ? (this.state === 'pause' ? 7 : 22) : this.state === 'flutter' ? 38 : 6;
    this.wingPhase += dt * wingSpeed;
  }

  hitTest(px, py) {
    const r = 46 * this.scale + 20;
    const dx = px - this.x;
    const dy = py - this.y;
    return dx * dx + dy * dy <= r * r;
  }

  nearTest(px, py) {
    const r = 135 * this.scale;
    const dx = px - this.x;
    const dy = py - this.y;
    return dx * dx + dy * dy <= r * r;
  }

  draw(ctx) {
    const s = this.scale;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    // Luminous soft aura (makes bugs pop vividly on dark twilight meadow)
    const aura = ctx.createRadialGradient(0, 0, 4 * s, 0, 0, 48 * s);
    aura.addColorStop(0, this.glow);
    aura.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(0, 0, 48 * s, 0, Math.PI * 2);
    ctx.fill();

    if (this.kind === 'beetle') {
      this._drawBeetle(ctx, s);
    } else {
      this._drawMoth(ctx, s);
    }

    ctx.restore();
  }

  _drawBeetle(ctx, s) {
    // 6 scuttling legs
    ctx.strokeStyle = 'rgba(230, 245, 235, 0.85)';
    ctx.lineWidth = 2.4 * s;
    ctx.lineCap = 'round';
    const legOffsets = [-10, 0, 10];
    for (let i = 0; i < 3; i++) {
      const swing = Math.sin(this.legPhase + i * 2.1) * (this.speed > 10 ? 5.5 : 1.2) * s;
      for (const side of [-1, 1]) {
        const lx = legOffsets[i] * s;
        ctx.beginPath();
        ctx.moveTo(lx, side * 10 * s);
        ctx.lineTo(lx + swing * side * 0.6, side * 20 * s);
        ctx.lineTo(lx - 4 * s + swing * side, side * 27 * s);
        ctx.stroke();
      }
    }

    // Translucent buzzing wings when darting/fluttering
    if (this.state === 'flutter') {
      const spread = 0.65 + Math.sin(this.wingPhase) * 0.25;
      ctx.fillStyle = 'rgba(225, 252, 255, 0.45)';
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.translate(4 * s, 0);
        ctx.rotate(side * spread);
        ctx.beginPath();
        ctx.ellipse(-14 * s, side * 14 * s, 19 * s, 8 * s, side * 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // Glossy shell / carapace
    const grad = ctx.createRadialGradient(4 * s, -4 * s, 3 * s, -2 * s, 0, 24 * s);
    grad.addColorStop(0, this.secondary);
    grad.addColorStop(0.55, this.primary);
    grad.addColorStop(1, '#2a2210');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(-2 * s, 0, 22 * s, 15 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    // Center wing seam & spots
    ctx.strokeStyle = 'rgba(15, 20, 18, 0.72)';
    ctx.lineWidth = 2 * s;
    ctx.beginPath();
    ctx.moveTo(-23 * s, 0);
    ctx.lineTo(13 * s, 0);
    ctx.stroke();

    ctx.fillStyle = 'rgba(16, 22, 20, 0.72)';
    const spots = [
      [-10, -7, 3.2],
      [-10, 7, 3.2],
      [2, -8, 2.7],
      [2, 8, 2.7],
    ];
    for (const [sx, sy, sr] of spots) {
      ctx.beginPath();
      ctx.arc(sx * s, sy * s, sr * s, 0, Math.PI * 2);
      ctx.fill();
    }

    // Head
    ctx.fillStyle = '#18201d';
    ctx.beginPath();
    ctx.arc(17 * s, 0, 8.5 * s, 0, Math.PI * 2);
    ctx.fill();

    // Twitching antennae
    const antWiggle = Math.sin(this.legPhase * 0.7) * 3 * s;
    ctx.strokeStyle = 'rgba(240, 250, 245, 0.85)';
    ctx.lineWidth = 1.8 * s;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(22 * s, side * 3 * s);
      ctx.quadraticCurveTo(30 * s, side * 9 * s + antWiggle, 36 * s, side * 14 * s);
      ctx.stroke();
    }

    // Bright shell specular glint
    ctx.fillStyle = 'rgba(255, 255, 255, 0.36)';
    ctx.beginPath();
    ctx.ellipse(0, -5 * s, 10 * s, 3.8 * s, -0.15, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawMoth(ctx, s) {
    const flap = 0.35 + Math.abs(Math.sin(this.wingPhase)) * 0.65;

    // 4 luminous flapping wings
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.scale(1, flap);

      // Forewing
      const wg = ctx.createRadialGradient(4 * s, side * 18 * s, 3 * s, 0, side * 20 * s, 30 * s);
      wg.addColorStop(0, this.secondary);
      wg.addColorStop(0.7, this.primary);
      wg.addColorStop(1, 'rgba(255, 255, 255, 0.15)');
      ctx.fillStyle = wg;

      ctx.beginPath();
      ctx.moveTo(6 * s, 0);
      ctx.bezierCurveTo(22 * s, side * 14 * s, 16 * s, side * 38 * s, -4 * s, side * 33 * s);
      ctx.bezierCurveTo(-14 * s, side * 26 * s, -8 * s, side * 10 * s, -4 * s, 0);
      ctx.closePath();
      ctx.fill();

      // Hindwing
      ctx.globalAlpha = 0.84;
      ctx.beginPath();
      ctx.moveTo(-2 * s, 0);
      ctx.bezierCurveTo(-8 * s, side * 24 * s, -28 * s, side * 24 * s, -24 * s, side * 8 * s);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Slender body
    ctx.fillStyle = '#1b2421';
    ctx.beginPath();
    ctx.ellipse(-2 * s, 0, 17 * s, 4.5 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    // Glowing head & antennae
    ctx.fillStyle = this.secondary;
    ctx.beginPath();
    ctx.arc(14 * s, 0, 4.4 * s, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = this.secondary;
    ctx.lineWidth = 1.6 * s;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(16 * s, side * 2 * s);
      ctx.quadraticCurveTo(24 * s, side * 7 * s, 28 * s, side * 11 * s);
      ctx.stroke();
    }
  }
}

export class BugGame {
  constructor({ width, height, settings, audio, onCatch }) {
    this.width = width;
    this.height = height;
    this.settings = settings;
    this.audio = audio;
    this.onCatch = onCatch;
    this.time = 0;

    this.bugs = [];
    this.particles = [];
    this.rings = [];
    this.floats = [];
    this.ambientSpecks = [];

    this._initSpecks();
    this._syncBugCount(false);
  }

  _initSpecks() {
    this.ambientSpecks = [];
    for (let i = 0; i < 22; i++) {
      this.ambientSpecks.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        r: 1.5 + Math.random() * 2.5,
        phase: Math.random() * Math.PI * 2,
        speed: 0.4 + Math.random() * 0.9,
      });
    }
  }

  _syncBugCount(fromEdge = true) {
    const target = Number(this.settings.count) || 2;
    const catVision = this.settings.vision === 'cat';
    while (this.bugs.length < target) {
      const kind = this.bugs.length % 2 === 0 ? 'beetle' : 'moth';
      this.bugs.push(new BugPrey(this.width, this.height, catVision, kind, fromEdge));
    }
    if (this.bugs.length > target) {
      this.bugs.length = target;
    }
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
    this._initSpecks();
  }

  updateSettings(settings) {
    const visionChanged = this.settings.vision !== settings.vision;
    this.settings = settings;
    this._syncBugCount(true);
    if (visionChanged) {
      const catVision = settings.vision === 'cat';
      for (const b of this.bugs) b.setVision(catVision);
    }
  }

  _spawnBurst(x, y, color) {
    this.rings.push({ x, y, r: 10, maxR: 92, life: 0.5, maxLife: 0.5, color });
    for (let i = 0; i < 20; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 75 + Math.random() * 220;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        r: 2.5 + Math.random() * 4.5,
        life: 0.5 + Math.random() * 0.4,
        maxLife: 0.9,
        color: i % 2 === 0 ? '#fff9c4' : color,
      });
    }
    this.floats.push({ x, y: y - 14, text: '+10', life: 0.85, maxLife: 0.85 });
  }

  onPointerDown(x, y) {
    let caughtAny = false;
    const catVision = this.settings.vision === 'cat';

    for (let i = this.bugs.length - 1; i >= 0; i--) {
      const bug = this.bugs[i];
      if (bug.hitTest(x, y)) {
        caughtAny = true;
        const nextKind = bug.kind === 'beetle' ? 'moth' : 'beetle';
        this._spawnBurst(bug.x, bug.y, bug.primary);
        this.audio.playBugCatch();
        this.onCatch(10);
        this.bugs.splice(i, 1);
        setTimeout(() => {
          if (this.bugs.length < (Number(this.settings.count) || 2)) {
            this.bugs.push(new BugPrey(this.width, this.height, catVision, nextKind, true));
          }
        }, 380);
        break;
      }
    }

    if (!caughtAny) {
      this.rings.push({ x, y, r: 8, maxR: 54, life: 0.35, maxLife: 0.35, color: 'rgba(180, 255, 220, 0.7)' });
      this.audio.playRustle();
      for (const b of this.bugs) {
        if (b.nearTest(x, y)) {
          b.spookFrom(x, y, this.audio);
        }
      }
    }
  }

  onPointerMove(x, y) {
    for (let i = this.bugs.length - 1; i >= 0; i--) {
      if (this.bugs[i].hitTest(x, y)) {
        this.onPointerDown(x, y);
        break;
      }
    }
  }

  update(dt) {
    this.time += dt;
    const speedMult = SPEED_MULT[this.settings.speed] || 1.0;

    for (const s of this.ambientSpecks) {
      s.phase += dt * s.speed;
    }

    for (const b of this.bugs) {
      b.update(dt, this.width, this.height, speedMult, this.audio);
    }

    for (let i = this.rings.length - 1; i >= 0; i--) {
      const rg = this.rings[i];
      rg.life -= dt;
      rg.r = rg.maxR * (1 - rg.life / rg.maxLife);
      if (rg.life <= 0) this.rings.splice(i, 1);
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= Math.pow(0.06, dt);
      p.vy *= Math.pow(0.06, dt);
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    for (let i = this.floats.length - 1; i >= 0; i--) {
      this.floats[i].y -= 36 * dt;
      this.floats[i].life -= dt;
      if (this.floats[i].life <= 0) this.floats.splice(i, 1);
    }
  }

  draw(ctx) {
    const w = this.width;
    const h = this.height;
    const catVision = this.settings.vision === 'cat';

    const bg = ctx.createRadialGradient(w * 0.5, h * 0.5, 20, w * 0.5, h * 0.5, Math.max(w, h) * 0.75);
    if (catVision) {
      bg.addColorStop(0, '#0f2b3d');
      bg.addColorStop(1, '#06131f');
    } else {
      bg.addColorStop(0, '#16382f');
      bg.addColorStop(1, '#081a15');
    }
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Subtle twilight firefly bokeh dust
    for (const sp of this.ambientSpecks) {
      const a = 0.08 + Math.sin(sp.phase) * 0.06;
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, sp.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(215, 255, 210, ${Math.max(0.01, a)})`;
      ctx.fill();
    }

    for (const rg of this.rings) {
      const a = clamp(rg.life / rg.maxLife, 0, 1) * 0.65;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.beginPath();
      ctx.arc(rg.x, rg.y, rg.r, 0, Math.PI * 2);
      ctx.strokeStyle = rg.color;
      ctx.lineWidth = 2.8;
      ctx.stroke();
      ctx.restore();
    }

    for (const b of this.bugs) {
      b.draw(ctx);
    }

    for (const p of this.particles) {
      const a = clamp(p.life / p.maxLife, 0, 1);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    for (const fl of this.floats) {
      const a = clamp(fl.life / fl.maxLife, 0, 1);
      ctx.save();
      ctx.globalAlpha = a * 0.9;
      ctx.font = '700 26px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff5a8';
      ctx.fillText(fl.text, fl.x, fl.y);
      ctx.restore();
    }
  }
}

export function drawBugPreview(ctx, w, h, t) {
  const bg = ctx.createRadialGradient(w * 0.5, h * 0.5, 10, w * 0.5, h * 0.5, w * 0.65);
  bg.addColorStop(0, '#183d32');
  bg.addColorStop(1, '#071712');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Glowing fluttering moth preview
  const bx = w * 0.52 + Math.cos(t * 1.5) * 34;
  const by = h * 0.5 + Math.sin(t * 2.4) * 16;
  const flap = 0.4 + Math.abs(Math.sin(t * 13)) * 0.6;

  ctx.save();
  ctx.translate(bx, by);
  ctx.rotate(-0.3 + Math.sin(t * 1.5) * 0.25);

  const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, 40);
  glow.addColorStop(0, 'rgba(255, 232, 84, 0.42)');
  glow.addColorStop(1, 'rgba(255, 232, 84, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, 40, 0, Math.PI * 2);
  ctx.fill();

  for (const side of [-1, 1]) {
    ctx.save();
    ctx.scale(1, flap);
    ctx.fillStyle = '#ffe047';
    ctx.beginPath();
    ctx.ellipse(2, side * 16, 14, 18, side * 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#56f0ff';
    ctx.beginPath();
    ctx.ellipse(-10, side * 12, 9, 11, side * -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.fillStyle = '#182420';
  ctx.beginPath();
  ctx.ellipse(0, 0, 14, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
