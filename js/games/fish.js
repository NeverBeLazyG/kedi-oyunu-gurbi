// Game 1: Koi-Teich (Fisch fangen) — inspired by Friskies Cat Fishing

const SPEED_MULT = { slow: 0.72, normal: 1.0, fast: 1.38 };

const STANDARD_PALETTES = [
  { body: '#ffae12', accent: '#ff6b00', fin: 'rgba(255, 224, 130, 0.72)', spot: '#fff5d6', shadow: 'rgba(120, 232, 255, 0.42)' },
  { body: '#ffd633', accent: '#ff9000', fin: 'rgba(255, 240, 170, 0.74)', spot: '#ffffff', shadow: 'rgba(130, 240, 255, 0.42)' },
  { body: '#fff4df', accent: '#ff5d14', fin: 'rgba(235, 248, 255, 0.72)', spot: '#ff521b', shadow: 'rgba(115, 225, 255, 0.38)' },
  { body: '#ff8a1f', accent: '#e84118', fin: 'rgba(255, 210, 145, 0.72)', spot: '#fff6db', shadow: 'rgba(120, 232, 255, 0.4)' },
];

const CAT_PALETTES = [
  { body: '#ffe900', accent: '#c9b400', fin: 'rgba(255, 248, 150, 0.8)', spot: '#ffffff', shadow: 'rgba(0, 238, 255, 0.48)' },
  { body: '#36f5ff', accent: '#00b4d8', fin: 'rgba(180, 252, 255, 0.8)', spot: '#ffffff', shadow: 'rgba(255, 238, 0, 0.34)' },
];

const SPINE_WIDTHS = [0.58, 0.86, 1.0, 0.96, 0.82, 0.64, 0.46, 0.31, 0.2, 0.12];

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function normalizeAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

class KoiFish {
  constructor(width, height, catVision, spawnFromEdge = true) {
    this.scale = clamp(Math.min(width, height) / 760, 0.72, 1.26) * (0.9 + Math.random() * 0.22);
    this.segCount = SPINE_WIDTHS.length;
    this.segLen = 17.5 * this.scale;
    this.bodyRadius = 24 * this.scale;
    this.palette = this._pickPalette(catVision);

    this.x = width * 0.5;
    this.y = height * 0.5;
    this.angle = Math.random() * Math.PI * 2;
    this.targetAngle = this.angle;
    this.speed = 115;
    this.baseSpeed = 105 + Math.random() * 35;

    this.state = 'cruise'; // cruise | pause | dart
    this.stateTimer = 1.6 + Math.random() * 2.2;
    this.swimPhase = Math.random() * Math.PI * 2;
    this.wakeTimer = 0;
    this.caught = false;
    this.alpha = 1;
    this.diveScale = 1;

    if (spawnFromEdge) {
      this._placeAtEdge(width, height);
    } else {
      const m = 110;
      this.x = m + Math.random() * Math.max(40, width - m * 2);
      this.y = m + Math.random() * Math.max(40, height - m * 2);
    }

    this.spine = [];
    for (let i = 0; i < this.segCount; i++) {
      this.spine.push({
        x: this.x - Math.cos(this.angle) * this.segLen * i,
        y: this.y - Math.sin(this.angle) * this.segLen * i,
        angle: this.angle,
      });
    }

    // Calico spot layout
    this.spots = [
      { idx: 1, off: -0.15, rx: 0.42, ry: 0.28 },
      { idx: 3, off: 0.18, rx: 0.5, ry: 0.32 },
      { idx: 5, off: -0.1, rx: 0.36, ry: 0.24 },
    ];
  }

  _pickPalette(catVision) {
    const list = catVision ? CAT_PALETTES : STANDARD_PALETTES;
    return list[Math.floor(Math.random() * list.length)];
  }

  setVision(catVision) {
    this.palette = this._pickPalette(catVision);
  }

  _placeAtEdge(width, height) {
    const pad = 95 * this.scale;
    const side = Math.floor(Math.random() * 4);
    if (side === 0) {
      this.x = -pad;
      this.y = height * (0.2 + Math.random() * 0.6);
      this.angle = (Math.random() - 0.5) * 0.6;
    } else if (side === 1) {
      this.x = width + pad;
      this.y = height * (0.2 + Math.random() * 0.6);
      this.angle = Math.PI + (Math.random() - 0.5) * 0.6;
    } else if (side === 2) {
      this.x = width * (0.2 + Math.random() * 0.6);
      this.y = -pad;
      this.angle = Math.PI * 0.5 + (Math.random() - 0.5) * 0.6;
    } else {
      this.x = width * (0.2 + Math.random() * 0.6);
      this.y = height + pad;
      this.angle = -Math.PI * 0.5 + (Math.random() - 0.5) * 0.6;
    }
    this.targetAngle = this.angle;
  }

  spookFrom(px, py) {
    if (this.caught) return;
    const away = Math.atan2(this.y - py, this.x - px);
    this.targetAngle = away + (Math.random() - 0.5) * 0.5;
    this.state = 'dart';
    this.stateTimer = 0.75 + Math.random() * 0.45;
  }

  update(dt, width, height, speedMult, emitWake) {
    this.stateTimer -= dt;
    if (this.stateTimer <= 0) {
      const r = Math.random();
      if (this.state === 'pause') {
        this.state = r < 0.45 ? 'dart' : 'cruise';
        this.stateTimer = this.state === 'dart' ? 0.65 + Math.random() * 0.55 : 2.0 + Math.random() * 2.4;
        this.targetAngle = this.angle + (Math.random() - 0.5) * 1.3;
      } else if (this.state === 'dart') {
        this.state = 'cruise';
        this.stateTimer = 1.8 + Math.random() * 2.2;
      } else {
        if (r < 0.26) {
          this.state = 'pause';
          this.stateTimer = 0.55 + Math.random() * 0.75;
        } else if (r < 0.52) {
          this.state = 'dart';
          this.stateTimer = 0.65 + Math.random() * 0.5;
          this.targetAngle = this.angle + (Math.random() - 0.5) * 1.1;
        } else {
          this.state = 'cruise';
          this.stateTimer = 1.4 + Math.random() * 2.0;
          this.targetAngle = this.angle + (Math.random() - 0.5) * 1.25;
        }
      }
    }

    // Soft steering back into the pond if near borders
    const margin = Math.min(width, height) * 0.14;
    if (this.x < margin || this.x > width - margin || this.y < margin || this.y > height - margin) {
      const cx = width * (0.3 + Math.random() * 0.4);
      const cy = height * (0.3 + Math.random() * 0.4);
      const toCenter = Math.atan2(cy - this.y, cx - this.x);
      const diffCenter = normalizeAngle(toCenter - this.targetAngle);
      this.targetAngle += diffCenter * Math.min(1, dt * 3.2);
    }

    const desiredSpeed =
      (this.state === 'pause'
        ? this.baseSpeed * 0.24
        : this.state === 'dart'
          ? this.baseSpeed * 2.35
          : this.baseSpeed) * speedMult;

    this.speed += (desiredSpeed - this.speed) * Math.min(1, dt * 5.2);

    const turnRate = this.state === 'dart' ? 4.4 : 2.5;
    const angleDiff = normalizeAngle(this.targetAngle - this.angle);
    this.angle += clamp(angleDiff, -turnRate * dt, turnRate * dt);

    // Subtle sinusoidal head sway synced with swimming
    const waveFreq = 3.2 + (this.speed / 48);
    this.swimPhase += dt * waveFreq;
    const headSway = Math.sin(this.swimPhase) * (this.state === 'pause' ? 0.05 : 0.08);
    const moveAngle = this.angle + headSway;

    this.x += Math.cos(moveAngle) * this.speed * dt;
    this.y += Math.sin(moveAngle) * this.speed * dt;

    // Update articulated spine kinematics
    this.spine[0].x = this.x;
    this.spine[0].y = this.y;
    this.spine[0].angle = moveAngle;

    for (let i = 1; i < this.segCount; i++) {
      const prev = this.spine[i - 1];
      const curr = this.spine[i];
      const dx = curr.x - prev.x;
      const dy = curr.y - prev.y;
      let segAngle = Math.atan2(dy, dx);

      // Add organic swimming wave down the tail
      const waveAmp = (i / this.segCount) * (this.state === 'dart' ? 0.14 : 0.085);
      segAngle += Math.sin(this.swimPhase - i * 0.58) * waveAmp * dt * 18;

      // Clamp max bend between segments for lifelike curvature
      const backAngle = prev.angle + Math.PI;
      const rel = normalizeAngle(segAngle - backAngle);
      const maxBend = 0.42;
      segAngle = backAngle + clamp(rel, -maxBend, maxBend);

      curr.x = prev.x + Math.cos(segAngle) * this.segLen;
      curr.y = prev.y + Math.sin(segAngle) * this.segLen;
      curr.angle = segAngle + Math.PI;
    }

    // Subtle wake ripples when swimming briskly
    this.wakeTimer -= dt;
    if (this.wakeTimer <= 0 && this.speed > 95 * speedMult) {
      const tail = this.spine[this.segCount - 1];
      emitWake(tail.x, tail.y, this.state === 'dart');
      this.wakeTimer = this.state === 'dart' ? 0.14 : 0.34;
    }
  }

  hitTest(px, py) {
    // Generous multi-circle hitbox along head & mid-body for cat paws
    const radii = [1.45, 1.55, 1.45, 1.25, 1.05];
    for (let i = 0; i < radii.length; i++) {
      const seg = this.spine[i * 2] || this.spine[i];
      const r = this.bodyRadius * radii[i] + 22;
      const dx = px - seg.x;
      const dy = py - seg.y;
      if (dx * dx + dy * dy <= r * r) return true;
    }
    return false;
  }

  nearTest(px, py) {
    const mid = this.spine[2];
    const r = this.bodyRadius * 4.8 + 65;
    const dx = px - mid.x;
    const dy = py - mid.y;
    return dx * dx + dy * dy <= r * r;
  }

  draw(ctx, isShadow = false) {
    ctx.save();
    if (isShadow) {
      // Iconic bright cyan-tinted depth reflection beneath the fish (as seen in the iPad photo!)
      ctx.translate(16 * this.scale, 26 * this.scale);
      ctx.globalAlpha = 0.58 * this.alpha;
    } else {
      ctx.globalAlpha = this.alpha;
    }

    const spine = this.spine;
    const leftPts = [];
    const rightPts = [];

    for (let i = 0; i < this.segCount; i++) {
      const s = spine[i];
      const w = SPINE_WIDTHS[i] * this.bodyRadius;
      const nx = -Math.sin(s.angle);
      const ny = Math.cos(s.angle);
      leftPts.push({ x: s.x + nx * w, y: s.y + ny * w });
      rightPts.push({ x: s.x - nx * w, y: s.y - ny * w });
    }

    // 1. Pectoral fins (left & right swept fan fins)
    const finSeg = spine[2];
    const finFlutter = Math.sin(this.swimPhase * 0.9) * 0.16;
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(finSeg.x, finSeg.y);
      ctx.rotate(finSeg.angle + side * (1.02 + finFlutter));
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(16 * this.scale, side * 26 * this.scale, -14 * this.scale, side * 42 * this.scale);
      ctx.quadraticCurveTo(-24 * this.scale, side * 18 * this.scale, -8 * this.scale, side * 4 * this.scale);
      ctx.closePath();
      ctx.fillStyle = isShadow ? this.palette.shadow : this.palette.fin;
      ctx.fill();
      ctx.restore();
    }

    // 2. Flowing forked tail fin
    const tailBase = spine[this.segCount - 1];
    const prevTail = spine[this.segCount - 2];
    const tailAngle = Math.atan2(tailBase.y - prevTail.y, tailBase.x - prevTail.x);
    const tailWave = Math.sin(this.swimPhase - 3.6) * 0.22;
    ctx.save();
    ctx.translate(tailBase.x, tailBase.y);
    ctx.rotate(tailAngle + tailWave);
    ctx.beginPath();
    ctx.moveTo(-4 * this.scale, 0);
    ctx.quadraticCurveTo(22 * this.scale, -14 * this.scale, 46 * this.scale, -28 * this.scale);
    ctx.quadraticCurveTo(32 * this.scale, -4 * this.scale, 24 * this.scale, 0);
    ctx.quadraticCurveTo(32 * this.scale, 4 * this.scale, 46 * this.scale, 28 * this.scale);
    ctx.quadraticCurveTo(22 * this.scale, 14 * this.scale, -4 * this.scale, 0);
    ctx.closePath();
    ctx.fillStyle = isShadow ? this.palette.shadow : this.palette.fin;
    ctx.fill();
    ctx.restore();

    // 3. Organic tapered koi body
    const head = spine[0];
    const snoutX = head.x + Math.cos(head.angle) * (this.bodyRadius * 0.92);
    const snoutY = head.y + Math.sin(head.angle) * (this.bodyRadius * 0.92);

    ctx.beginPath();
    ctx.moveTo(snoutX, snoutY);
    for (let i = 0; i < leftPts.length; i++) {
      const p = leftPts[i];
      if (i === 0) {
        ctx.quadraticCurveTo(
          snoutX - Math.sin(head.angle) * this.bodyRadius * 0.55,
          snoutY + Math.cos(head.angle) * this.bodyRadius * 0.55,
          p.x,
          p.y
        );
      } else {
        const prev = leftPts[i - 1];
        ctx.quadraticCurveTo(prev.x, prev.y, (prev.x + p.x) * 0.5, (prev.y + p.y) * 0.5);
      }
    }
    const lastL = leftPts[leftPts.length - 1];
    const lastR = rightPts[rightPts.length - 1];
    ctx.lineTo(lastL.x, lastL.y);
    ctx.lineTo(lastR.x, lastR.y);
    for (let i = rightPts.length - 1; i >= 0; i--) {
      const p = rightPts[i];
      if (i < rightPts.length - 1) {
        const next = rightPts[i + 1];
        ctx.quadraticCurveTo(next.x, next.y, (next.x + p.x) * 0.5, (next.y + p.y) * 0.5);
      }
    }
    ctx.quadraticCurveTo(
      snoutX + Math.sin(head.angle) * this.bodyRadius * 0.55,
      snoutY - Math.cos(head.angle) * this.bodyRadius * 0.55,
      snoutX,
      snoutY
    );
    ctx.closePath();

    if (isShadow) {
      ctx.fillStyle = this.palette.shadow;
      ctx.fill();
      ctx.restore();
      return;
    }

    const grad = ctx.createLinearGradient(head.x, head.y, tailBase.x, tailBase.y);
    grad.addColorStop(0, this.palette.body);
    grad.addColorStop(0.55, this.palette.accent);
    grad.addColorStop(1, this.palette.body);
    ctx.fillStyle = grad;
    ctx.fill();

    // Subtle koi calico patches clipped to body
    ctx.save();
    ctx.clip();
    ctx.fillStyle = this.palette.spot;
    ctx.globalAlpha = 0.28;
    for (const sp of this.spots) {
      const s = spine[sp.idx];
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.angle);
      ctx.beginPath();
      ctx.ellipse(0, sp.off * this.bodyRadius, this.bodyRadius * sp.rx, this.bodyRadius * sp.ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Soft dorsal glossy shimmer
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.36)';
    ctx.lineWidth = 4.2 * this.scale;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(spine[1].x, spine[1].y);
    for (let i = 2; i <= 6; i++) {
      ctx.lineTo(spine[i].x, spine[i].y);
    }
    ctx.stroke();
    ctx.restore();

    // Dorsal ridge fin
    ctx.beginPath();
    ctx.moveTo(spine[2].x, spine[2].y);
    for (let i = 3; i <= 7; i++) {
      const s = spine[i];
      const sway = Math.sin(this.swimPhase - i * 0.65) * 4.5 * this.scale;
      ctx.lineTo(s.x - Math.sin(s.angle) * sway, s.y + Math.cos(s.angle) * sway);
    }
    ctx.strokeStyle = this.palette.fin;
    ctx.lineWidth = 3.2 * this.scale;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Expressive eyes
    const eyeSeg = spine[0];
    const exOff = this.bodyRadius * 0.44;
    const eyOff = this.bodyRadius * 0.56;
    for (const side of [-1, 1]) {
      const ex = eyeSeg.x + Math.cos(eyeSeg.angle) * exOff - Math.sin(eyeSeg.angle) * eyOff * side;
      const ey = eyeSeg.y + Math.sin(eyeSeg.angle) * exOff + Math.cos(eyeSeg.angle) * eyOff * side;
      ctx.beginPath();
      ctx.arc(ex, ey, 3.2 * this.scale, 0, Math.PI * 2);
      ctx.fillStyle = '#1b1b24';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(ex - 0.8 * this.scale, ey - 0.8 * this.scale, 1.1 * this.scale, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    }

    ctx.restore();
  }
}

export class FishGame {
  constructor({ width, height, settings, audio, onCatch }) {
    this.width = width;
    this.height = height;
    this.settings = settings;
    this.audio = audio;
    this.onCatch = onCatch;
    this.time = 0;

    this.fishes = [];
    this.ripples = [];
    this.particles = [];
    this.floats = [];
    this.caustics = [];
    this.bubbleTimer = 1.8;
    this.lastMoveRipple = 0;

    this._initCaustics();
    this._syncFishCount(false);
  }

  _initCaustics() {
    this.caustics = [];
    for (let i = 0; i < 9; i++) {
      this.caustics.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        r: 90 + Math.random() * 140,
        vx: (Math.random() - 0.5) * 16,
        vy: (Math.random() - 0.5) * 14,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  _syncFishCount(fromEdge = true) {
    const target = Number(this.settings.count) || 2;
    const catVision = this.settings.vision === 'cat';
    while (this.fishes.length < target) {
      this.fishes.push(new KoiFish(this.width, this.height, catVision, fromEdge));
    }
    if (this.fishes.length > target) {
      this.fishes.length = target;
    }
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
    this._initCaustics();
  }

  updateSettings(settings) {
    const visionChanged = this.settings.vision !== settings.vision;
    this.settings = settings;
    this._syncFishCount(true);
    if (visionChanged) {
      const catVision = settings.vision === 'cat';
      for (const f of this.fishes) f.setVision(catVision);
    }
  }

  _spawnTouchRipples(x, y, big = true) {
    const count = big ? 3 : 1;
    for (let i = 0; i < count; i++) {
      this.ripples.push({
        x,
        y,
        r: big ? 10 + i * 16 : 8,
        maxR: big ? 125 + i * 38 : 65,
        speed: big ? 165 - i * 14 : 115,
        alpha: big ? 0.62 - i * 0.14 : 0.34,
        lineWidth: big ? 3.2 - i * 0.65 : 1.8,
      });
    }
  }

  _spawnSplash(x, y, color) {
    this._spawnTouchRipples(x, y, true);
    this.ripples.push({
      x,
      y,
      r: 18,
      maxR: 195,
      speed: 245,
      alpha: 0.78,
      lineWidth: 4.5,
    });

    for (let i = 0; i < 24; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 70 + Math.random() * 240;
      const isBubble = i % 3 === 0;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        r: isBubble ? 4 + Math.random() * 6 : 2.5 + Math.random() * 4.5,
        life: 0.55 + Math.random() * 0.45,
        maxLife: 1.0,
        color: isBubble ? 'rgba(215, 248, 255, 0.92)' : color,
        isBubble,
      });
    }

    this.floats.push({ x, y: y - 10, text: '+10', life: 0.9, maxLife: 0.9 });
  }

  onPointerDown(x, y) {
    let caughtAny = false;
    const catVision = this.settings.vision === 'cat';

    for (let i = this.fishes.length - 1; i >= 0; i--) {
      const fish = this.fishes[i];
      if (fish.hitTest(x, y)) {
        caughtAny = true;
        this._spawnSplash(fish.spine[1].x, fish.spine[1].y, fish.palette.body);
        this.audio.playSplash();
        this.onCatch(10);
        // Replace with a fresh koi entering smoothly from edge
        this.fishes.splice(i, 1);
        setTimeout(() => {
          if (this.fishes.length < (Number(this.settings.count) || 2)) {
            this.fishes.push(new KoiFish(this.width, this.height, catVision, true));
          }
        }, 380);
        break;
      }
    }

    if (!caughtAny) {
      this._spawnTouchRipples(x, y, true);
      this.audio.playRipple(0.8);
      for (const fish of this.fishes) {
        if (fish.nearTest(x, y)) {
          fish.spookFrom(x, y);
        }
      }
    }
  }

  onPointerMove(x, y) {
    if (this.time - this.lastMoveRipple > 0.065) {
      this._spawnTouchRipples(x, y, false);
      this.lastMoveRipple = this.time;
    }
    // Dragging paw directly onto a fish also catches it!
    for (let i = this.fishes.length - 1; i >= 0; i--) {
      if (this.fishes[i].hitTest(x, y)) {
        this.onPointerDown(x, y);
        break;
      }
    }
  }

  update(dt) {
    this.time += dt;
    const speedMult = SPEED_MULT[this.settings.speed] || 1.0;

    for (const c of this.caustics) {
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.phase += dt * 0.7;
      if (c.x < -c.r) c.x = this.width + c.r;
      if (c.x > this.width + c.r) c.x = -c.r;
      if (c.y < -c.r) c.y = this.height + c.r;
      if (c.y > this.height + c.r) c.y = -c.r;
    }

    const emitWake = (wx, wy, strong) => {
      this.ripples.push({
        x: wx,
        y: wy,
        r: 4,
        maxR: strong ? 54 : 32,
        speed: strong ? 95 : 52,
        alpha: strong ? 0.3 : 0.16,
        lineWidth: strong ? 1.8 : 1.2,
      });
    };

    for (const fish of this.fishes) {
      fish.update(dt, this.width, this.height, speedMult, emitWake);
    }

    // Occasional gentle ambient bubble
    this.bubbleTimer -= dt;
    if (this.bubbleTimer <= 0) {
      this.bubbleTimer = 2.8 + Math.random() * 3.5;
      const bx = 60 + Math.random() * Math.max(20, this.width - 120);
      const by = 60 + Math.random() * Math.max(20, this.height - 120);
      this.ripples.push({ x: bx, y: by, r: 3, maxR: 42, speed: 55, alpha: 0.24, lineWidth: 1.4 });
      this.audio.playBubble();
    }

    // Update ripples
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const rp = this.ripples[i];
      rp.r += rp.speed * dt;
      if (rp.r >= rp.maxR) {
        this.ripples.splice(i, 1);
      }
    }

    // Update splash particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= Math.pow(0.08, dt);
      p.vy *= Math.pow(0.08, dt);
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    for (let i = this.floats.length - 1; i >= 0; i--) {
      const fl = this.floats[i];
      fl.y -= 38 * dt;
      fl.life -= dt;
      if (fl.life <= 0) this.floats.splice(i, 1);
    }
  }

  draw(ctx) {
    const w = this.width;
    const h = this.height;
    const catVision = this.settings.vision === 'cat';

    // Deep luminous pond gradient (closely echoing the rich cobalt blue in the iPad photo)
    const bg = ctx.createRadialGradient(w * 0.5, h * 0.48, Math.min(w, h) * 0.05, w * 0.5, h * 0.5, Math.max(w, h) * 0.78);
    if (catVision) {
      bg.addColorStop(0, '#0f3673');
      bg.addColorStop(0.55, '#09224d');
      bg.addColorStop(1, '#041129');
    } else {
      bg.addColorStop(0, '#2a6fd8');
      bg.addColorStop(0.52, '#174ca8');
      bg.addColorStop(1, '#0c2c6b');
    }
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Subtle sunlit underwater caustics
    ctx.save();
    for (const c of this.caustics) {
      const pulse = 0.045 + Math.sin(c.phase) * 0.02;
      const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.r);
      g.addColorStop(0, `rgba(145, 222, 255, ${pulse})`);
      g.addColorStop(1, 'rgba(145, 222, 255, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Shadows/depth reflections first
    for (const fish of this.fishes) {
      fish.draw(ctx, true);
    }

    // Articulated koi fish
    for (const fish of this.fishes) {
      fish.draw(ctx, false);
    }

    // Concentric water ripples above fish (surface refraction look)
    ctx.save();
    for (const rp of this.ripples) {
      const progress = rp.r / rp.maxR;
      const a = rp.alpha * (1 - progress) * (1 - progress);
      if (a <= 0.005) continue;
      ctx.beginPath();
      ctx.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(195, 236, 255, ${a})`;
      ctx.lineWidth = Math.max(0.8, rp.lineWidth * (1 - progress * 0.45));
      ctx.stroke();
    }
    ctx.restore();

    // Splash particles & bubbles
    for (const p of this.particles) {
      const a = clamp(p.life / p.maxLife, 0, 1);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      if (p.isBubble) {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 1.6;
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.22)';
        ctx.fill();
      } else {
        ctx.fillStyle = p.color;
        ctx.fill();
      }
      ctx.restore();
    }

    // Floating subtle score pop
    for (const fl of this.floats) {
      const a = clamp(fl.life / fl.maxLife, 0, 1);
      ctx.save();
      ctx.globalAlpha = a * 0.9;
      ctx.font = '700 26px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff5bd';
      ctx.shadowColor = 'rgba(0,0,0,0.4)';
      ctx.shadowBlur = 8;
      ctx.fillText(fl.text, fl.x, fl.y);
      ctx.restore();
    }
  }
}

export function drawFishPreview(ctx, w, h, t) {
  const bg = ctx.createRadialGradient(w * 0.5, h * 0.5, 10, w * 0.5, h * 0.5, w * 0.65);
  bg.addColorStop(0, '#2a6fd8');
  bg.addColorStop(1, '#0c2c6b');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Expanding concentric ripples
  const rp = (t * 0.55) % 1;
  for (let i = 0; i < 3; i++) {
    const p = (rp + i * 0.22) % 1;
    ctx.beginPath();
    ctx.arc(w * 0.68, h * 0.42, 8 + p * 54, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(195, 236, 255, ${(1 - p) * 0.55})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Stylized swimming golden koi preview
  const fx = w * 0.44 + Math.cos(t * 1.1) * 26;
  const fy = h * 0.56 + Math.sin(t * 2.2) * 10;
  const ang = Math.atan2(Math.cos(t * 2.2) * 22, -Math.sin(t * 1.1) * 26) * 0.25 - 0.35;
  const wag = Math.sin(t * 7.5) * 7;

  const drawSimpleKoi = (ox, oy, color, finColor, alpha) => {
    ctx.save();
    ctx.translate(fx + ox, fy + oy);
    ctx.rotate(ang);
    ctx.globalAlpha = alpha;
    // Fins
    ctx.fillStyle = finColor;
    ctx.beginPath();
    ctx.ellipse(2, -16, 12, 6, -0.7, 0, Math.PI * 2);
    ctx.ellipse(2, 16, 12, 6, 0.7, 0, Math.PI * 2);
    ctx.fill();
    // Tail
    ctx.beginPath();
    ctx.moveTo(-22, 0);
    ctx.quadraticCurveTo(-36, -12 + wag, -46, -15 + wag);
    ctx.quadraticCurveTo(-38, wag * 0.5, -46, 15 + wag);
    ctx.quadraticCurveTo(-36, 12 + wag, -22, 0);
    ctx.fill();
    // Body
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(0, 0, 26, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  drawSimpleKoi(9, 13, 'rgba(115, 235, 255, 0.45)', 'rgba(115, 235, 255, 0.35)', 0.75);
  drawSimpleKoi(0, 0, '#ffae12', 'rgba(255, 230, 145, 0.8)', 1);
}
