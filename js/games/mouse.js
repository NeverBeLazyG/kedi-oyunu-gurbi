// Game 2: Mäusejagd (Maus fangen) — scurrying mice with physics rope tails & realistic squeaks

const SPEED_MULT = { slow: 0.72, normal: 1.0, fast: 1.4 };

const STANDARD_MICE = [
  { fur: '#f4eee1', shade: '#d4cab5', ear: '#ffb5c2', tail: '#f0b8c0', nose: '#ff8da1' },
  { fur: '#ffe082', shade: '#e6b84c', ear: '#ffbac6', tail: '#f2b8a2', nose: '#ff8598' },
  { fur: '#dfe9f3', shade: '#b5c7d9', ear: '#ffb8c8', tail: '#e8b6c2', nose: '#ff8fa3' },
];

const CAT_MICE = [
  { fur: '#fff24d', shade: '#d9c61c', ear: '#ffffff', tail: '#fff799', nose: '#00eaff' },
  { fur: '#7af5ff', shade: '#28c7d9', ear: '#ffffff', tail: '#c4fbff', nose: '#fff24d' },
];

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function normalizeAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

class MousePrey {
  constructor(width, height, catVision, spawnFromEdge = true) {
    this.scale = clamp(Math.min(width, height) / 760, 0.74, 1.24);
    this.bodyLen = 46 * this.scale;
    this.bodyRad = 21 * this.scale;
    this.palette = this._pickPalette(catVision);

    this.x = width * 0.5;
    this.y = height * 0.5;
    this.angle = Math.random() * Math.PI * 2;
    this.targetX = width * 0.5;
    this.targetY = height * 0.5;
    this.speed = 0;
    this.baseSpeed = 235 + Math.random() * 55;

    this.state = spawnFromEdge ? 'peek' : 'scurry'; // peek | scurry | freeze | flee
    this.stateTimer = spawnFromEdge ? 0.65 + Math.random() * 0.55 : 1.0;
    this.runPhase = Math.random() * Math.PI * 2;
    this.twitchPhase = Math.random() * Math.PI * 2;

    if (spawnFromEdge) {
      this._placeAtEdge(width, height);
    } else {
      const m = 120;
      this.x = m + Math.random() * Math.max(40, width - m * 2);
      this.y = m + Math.random() * Math.max(40, height - m * 2);
      this._pickTarget(width, height);
    }

    // 12-segment trailing physics rope tail
    this.tailSegLen = 8.5 * this.scale;
    this.tail = [];
    for (let i = 0; i < 12; i++) {
      this.tail.push({
        x: this.x - Math.cos(this.angle) * (this.bodyLen * 0.5 + i * this.tailSegLen),
        y: this.y - Math.sin(this.angle) * (this.bodyLen * 0.5 + i * this.tailSegLen),
      });
    }
  }

  _pickPalette(catVision) {
    const list = catVision ? CAT_MICE : STANDARD_MICE;
    return list[Math.floor(Math.random() * list.length)];
  }

  setVision(catVision) {
    this.palette = this._pickPalette(catVision);
  }

  _placeAtEdge(width, height) {
    const side = Math.floor(Math.random() * 4);
    if (side === 0) {
      this.x = 18 * this.scale;
      this.y = height * (0.2 + Math.random() * 0.6);
      this.angle = (Math.random() - 0.5) * 0.5;
    } else if (side === 1) {
      this.x = width - 18 * this.scale;
      this.y = height * (0.2 + Math.random() * 0.6);
      this.angle = Math.PI + (Math.random() - 0.5) * 0.5;
    } else if (side === 2) {
      this.x = width * (0.2 + Math.random() * 0.6);
      this.y = 18 * this.scale;
      this.angle = Math.PI * 0.5 + (Math.random() - 0.5) * 0.5;
    } else {
      this.x = width * (0.2 + Math.random() * 0.6);
      this.y = height - 18 * this.scale;
      this.angle = -Math.PI * 0.5 + (Math.random() - 0.5) * 0.5;
    }
    this._pickTarget(width, height);
  }

  _pickTarget(width, height) {
    const margin = Math.max(70, Math.min(width, height) * 0.12);
    this.targetX = margin + Math.random() * Math.max(40, width - margin * 2);
    this.targetY = margin + Math.random() * Math.max(40, height - margin * 2);
  }

  spookFrom(px, py, width, height) {
    const away = Math.atan2(this.y - py, this.x - px) + (Math.random() - 0.5) * 0.6;
    const dist = 240 + Math.random() * 180;
    const margin = 75;
    this.targetX = clamp(this.x + Math.cos(away) * dist, margin, width - margin);
    this.targetY = clamp(this.y + Math.sin(away) * dist, margin, height - margin);
    this.state = 'flee';
    this.stateTimer = 0.6 + Math.random() * 0.4;
  }

  update(dt, width, height, speedMult, audio) {
    this.twitchPhase += dt * 16;
    this.stateTimer -= dt;

    if (this.state === 'peek') {
      this.speed *= Math.pow(0.01, dt);
      if (this.stateTimer <= 0) {
        this.state = 'scurry';
        this.stateTimer = 1.1 + Math.random() * 1.1;
        this._pickTarget(width, height);
        audio.playSqueak(false);
      }
    } else if (this.state === 'freeze') {
      this.speed *= Math.pow(0.005, dt);
      if (this.stateTimer <= 0) {
        this.state = 'scurry';
        this.stateTimer = 0.9 + Math.random() * 1.3;
        this._pickTarget(width, height);
        if (Math.random() < 0.45) audio.playRustle();
      }
    } else {
      const dx = this.targetX - this.x;
      const dy = this.targetY - this.y;
      const dist = Math.hypot(dx, dy);

      if (dist < 44 || this.stateTimer <= 0) {
        if (Math.random() < 0.52) {
          this.state = 'freeze';
          this.stateTimer = 0.45 + Math.random() * 0.85;
        } else {
          this.state = 'scurry';
          this.stateTimer = 0.9 + Math.random() * 1.2;
          this._pickTarget(width, height);
        }
      } else {
        const desiredAngle = Math.atan2(dy, dx);
        const diff = normalizeAngle(desiredAngle - this.angle);
        const turnRate = this.state === 'flee' ? 11.5 : 8.0;
        this.angle += clamp(diff, -turnRate * dt, turnRate * dt);

        const maxSpd = (this.state === 'flee' ? this.baseSpeed * 1.6 : this.baseSpeed) * speedMult;
        this.speed += (maxSpd - this.speed) * Math.min(1, dt * 10);

        this.runPhase += dt * (this.speed * 0.085);
        const wiggle = Math.sin(this.runPhase) * 0.09;
        this.x += Math.cos(this.angle + wiggle) * this.speed * dt;
        this.y += Math.sin(this.angle + wiggle) * this.speed * dt;

        this.x = clamp(this.x, 30, width - 30);
        this.y = clamp(this.y, 30, height - 30);
      }
    }

    // Update trailing physics rope tail
    const rumpX = this.x - Math.cos(this.angle) * (this.bodyLen * 0.48);
    const rumpY = this.y - Math.sin(this.angle) * (this.bodyLen * 0.48);
    this.tail[0].x = rumpX;
    this.tail[0].y = rumpY;

    const idleWiggle = this.state === 'freeze' || this.state === 'peek' ? 1.0 : 0.25;
    for (let i = 1; i < this.tail.length; i++) {
      const prev = this.tail[i - 1];
      const curr = this.tail[i];

      // Tempting tail tip wiggle when stopped!
      const perpX = -Math.sin(this.angle);
      const perpY = Math.cos(this.angle);
      const sway = Math.sin(this.twitchPhase * 0.6 - i * 0.48) * idleWiggle * (i * 0.32) * dt * 18;
      curr.x += perpX * sway;
      curr.y += perpY * sway;

      const dx = curr.x - prev.x;
      const dy = curr.y - prev.y;
      const d = Math.hypot(dx, dy) || 0.001;
      curr.x = prev.x + (dx / d) * this.tailSegLen;
      curr.y = prev.y + (dy / d) * this.tailSegLen;
    }
  }

  hitTest(px, py) {
    const r = this.bodyRad * 2.1 + 24;
    const dx = px - this.x;
    const dy = py - this.y;
    if (dx * dx + dy * dy <= r * r) return true;
    // Catching by the tail also counts!
    for (let i = 2; i < this.tail.length; i += 2) {
      const tdx = px - this.tail[i].x;
      const tdy = py - this.tail[i].y;
      if (tdx * tdx + tdy * tdy <= (26 * this.scale) ** 2) return true;
    }
    return false;
  }

  nearTest(px, py) {
    const r = this.bodyRad * 5.2 + 75;
    const dx = px - this.x;
    const dy = py - this.y;
    return dx * dx + dy * dy <= r * r;
  }

  draw(ctx) {
    const s = this.scale;
    const p = this.palette;

    // 1. Trailing whip tail
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(this.tail[0].x, this.tail[0].y);
    for (let i = 1; i < this.tail.length - 1; i++) {
      const curr = this.tail[i];
      const next = this.tail[i + 1];
      ctx.quadraticCurveTo(curr.x, curr.y, (curr.x + next.x) * 0.5, (curr.y + next.y) * 0.5);
    }
    const last = this.tail[this.tail.length - 1];
    ctx.lineTo(last.x, last.y);
    ctx.strokeStyle = 'rgba(0,0,0,0.28)';
    ctx.lineWidth = 6 * s;
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.strokeStyle = p.tail;
    ctx.lineWidth = 4.2 * s;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.restore();

    // 2. Body, paws, ears, whiskers
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    const stretch = this.speed > 40 ? 1 + Math.sin(this.runPhase * 2) * 0.055 : 1;
    const squash = 1 / Math.sqrt(stretch);
    ctx.scale(stretch, squash);

    // Soft ground shadow
    ctx.beginPath();
    ctx.ellipse(-2 * s, 6 * s, 28 * s, 18 * s, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.34)';
    ctx.fill();

    // Scurrying little paws
    const pawStride = this.speed > 20 ? Math.sin(this.runPhase * 2) * 5 * s : 0;
    ctx.fillStyle = p.tail;
    const paws = [
      { x: 10 * s + pawStride, y: -15 * s },
      { x: 10 * s - pawStride, y: 15 * s },
      { x: -13 * s - pawStride, y: -16 * s },
      { x: -13 * s + pawStride, y: 16 * s },
    ];
    for (const paw of paws) {
      ctx.beginPath();
      ctx.ellipse(paw.x, paw.y, 5.2 * s, 3.3 * s, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Plump teardrop body
    const bodyGrad = ctx.createRadialGradient(4 * s, -4 * s, 3 * s, -4 * s, 0, 30 * s);
    bodyGrad.addColorStop(0, p.fur);
    bodyGrad.addColorStop(1, p.shade);
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.moveTo(27 * s, 0);
    ctx.bezierCurveTo(18 * s, -15 * s, -18 * s, -22 * s, -26 * s, -4 * s);
    ctx.quadraticCurveTo(-28 * s, 0, -26 * s, 4 * s);
    ctx.bezierCurveTo(-18 * s, 22 * s, 18 * s, 15 * s, 27 * s, 0);
    ctx.closePath();
    ctx.fill();

    // Round expressive ears (twitch slightly when frozen!)
    const earTwitch = this.state === 'freeze' || this.state === 'peek' ? Math.sin(this.twitchPhase) * 0.14 : 0;
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(7 * s, side * 12 * s);
      ctx.rotate(side * (0.35 + earTwitch));
      ctx.beginPath();
      ctx.ellipse(0, 0, 8.2 * s, 6.4 * s, 0, 0, Math.PI * 2);
      ctx.fillStyle = p.fur;
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(0.6 * s, 0, 5.2 * s, 3.8 * s, 0, 0, Math.PI * 2);
      ctx.fillStyle = p.ear;
      ctx.fill();
      ctx.restore();
    }

    // Whiskers
    const wTwitch = Math.sin(this.twitchPhase * 1.2) * 2.2 * s;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.lineWidth = 1.2 * s;
    for (const side of [-1, 1]) {
      for (let k = -1; k <= 1; k++) {
        ctx.beginPath();
        ctx.moveTo(22 * s, side * 3 * s);
        ctx.lineTo((28 + k * 2) * s, side * (16 + k * 4.5) * s + wTwitch * side * 0.4);
        ctx.stroke();
      }
    }

    // Glossy eyes
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(16.5 * s, side * 5.8 * s, 2.7 * s, 0, Math.PI * 2);
      ctx.fillStyle = '#14161f';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(17.4 * s, side * 5.2 * s, 0.95 * s, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    }

    // Cute pink nose
    ctx.beginPath();
    ctx.arc(27 * s, 0, 3.3 * s, 0, Math.PI * 2);
    ctx.fillStyle = p.nose;
    ctx.fill();

    ctx.restore();
  }
}

export class MouseGame {
  constructor({ width, height, settings, audio, onCatch }) {
    this.width = width;
    this.height = height;
    this.settings = settings;
    this.audio = audio;
    this.onCatch = onCatch;
    this.time = 0;

    this.mice = [];
    this.particles = [];
    this.paws = [];
    this.floats = [];

    this._syncMouseCount(false);
  }

  _syncMouseCount(fromEdge = true) {
    const target = Number(this.settings.count) || 2;
    const catVision = this.settings.vision === 'cat';
    while (this.mice.length < target) {
      this.mice.push(new MousePrey(this.width, this.height, catVision, fromEdge));
    }
    if (this.mice.length > target) {
      this.mice.length = target;
    }
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
  }

  updateSettings(settings) {
    const visionChanged = this.settings.vision !== settings.vision;
    this.settings = settings;
    this._syncMouseCount(true);
    if (visionChanged) {
      const catVision = settings.vision === 'cat';
      for (const m of this.mice) m.setVision(catVision);
    }
  }

  _spawnCatchBurst(x, y, color) {
    for (let i = 0; i < 18; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 85 + Math.random() * 210;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        r: 3 + Math.random() * 4.5,
        star: i % 3 === 0,
        rot: Math.random() * Math.PI * 2,
        life: 0.6 + Math.random() * 0.35,
        maxLife: 0.95,
        color: i % 3 === 0 ? '#ffe066' : color,
      });
    }
    this.paws.push({ x, y, life: 0.75, maxLife: 0.75, hit: true });
    this.floats.push({ x, y: y - 14, text: '+10', life: 0.85, maxLife: 0.85 });
  }

  onPointerDown(x, y) {
    let caughtAny = false;
    const catVision = this.settings.vision === 'cat';

    for (let i = this.mice.length - 1; i >= 0; i--) {
      const mouse = this.mice[i];
      if (mouse.hitTest(x, y)) {
        caughtAny = true;
        this._spawnCatchBurst(mouse.x, mouse.y, mouse.palette.fur);
        this.audio.playSqueak(true);
        this.onCatch(10);
        this.mice.splice(i, 1);
        setTimeout(() => {
          if (this.mice.length < (Number(this.settings.count) || 2)) {
            this.mice.push(new MousePrey(this.width, this.height, catVision, true));
          }
        }, 420);
        break;
      }
    }

    if (!caughtAny) {
      this.paws.push({ x, y, life: 0.45, maxLife: 0.45, hit: false });
      this.audio.playRustle();
      for (const m of this.mice) {
        if (m.nearTest(x, y)) {
          m.spookFrom(x, y, this.width, this.height);
          this.audio.playSqueak(false);
        }
      }
    }
  }

  onPointerMove(x, y) {
    for (let i = this.mice.length - 1; i >= 0; i--) {
      if (this.mice[i].hitTest(x, y)) {
        this.onPointerDown(x, y);
        break;
      }
    }
  }

  update(dt) {
    this.time += dt;
    const speedMult = SPEED_MULT[this.settings.speed] || 1.0;
    for (const m of this.mice) {
      m.update(dt, this.width, this.height, speedMult, this.audio);
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= Math.pow(0.06, dt);
      p.vy *= Math.pow(0.06, dt);
      p.rot += dt * 4;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    for (let i = this.paws.length - 1; i >= 0; i--) {
      this.paws[i].life -= dt;
      if (this.paws[i].life <= 0) this.paws.splice(i, 1);
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

    // Cozy high-contrast twilight felt mat floor
    const bg = ctx.createRadialGradient(w * 0.5, h * 0.5, 20, w * 0.5, h * 0.5, Math.max(w, h) * 0.72);
    if (catVision) {
      bg.addColorStop(0, '#162445');
      bg.addColorStop(1, '#080e1d');
    } else {
      bg.addColorStop(0, '#2a303f');
      bg.addColorStop(1, '#161a24');
    }
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Subtle mouse-hole edge markers so it feels like a real play arena
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.36)';
    const holeR = Math.min(w, h) * 0.055;
    const holes = [
      { x: 0, y: h * 0.32 },
      { x: w, y: h * 0.68 },
      { x: w * 0.35, y: 0 },
      { x: w * 0.65, y: h },
    ];
    for (const hole of holes) {
      ctx.beginPath();
      ctx.arc(hole.x, hole.y, holeR, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Soft paw tap rings
    for (const pw of this.paws) {
      const prog = 1 - pw.life / pw.maxLife;
      const a = (1 - prog) * (pw.hit ? 0.55 : 0.3);
      ctx.beginPath();
      ctx.arc(pw.x, pw.y, 14 + prog * (pw.hit ? 64 : 38), 0, Math.PI * 2);
      ctx.strokeStyle = pw.hit ? `rgba(255, 224, 102, ${a})` : `rgba(255, 255, 255, ${a})`;
      ctx.lineWidth = pw.hit ? 3.5 : 2;
      ctx.stroke();
    }

    // Draw mice
    for (const m of this.mice) {
      m.draw(ctx);
    }

    // Burst stars & puffs
    for (const p of this.particles) {
      const a = clamp(p.life / p.maxLife, 0, 1);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      if (p.star) {
        drawStar(ctx, 0, 0, 5, p.r * 1.5, p.r * 0.65);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    for (const fl of this.floats) {
      const a = clamp(fl.life / fl.maxLife, 0, 1);
      ctx.save();
      ctx.globalAlpha = a * 0.9;
      ctx.font = '700 26px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffe588';
      ctx.fillText(fl.text, fl.x, fl.y);
      ctx.restore();
    }
  }
}

function drawStar(ctx, cx, cy, spikes, outerR, innerR) {
  let rot = (Math.PI / 2) * 3;
  const step = Math.PI / spikes;
  ctx.beginPath();
  ctx.moveTo(cx, cy - outerR);
  for (let i = 0; i < spikes; i++) {
    ctx.lineTo(cx + Math.cos(rot) * outerR, cy + Math.sin(rot) * outerR);
    rot += step;
    ctx.lineTo(cx + Math.cos(rot) * innerR, cy + Math.sin(rot) * innerR);
    rot += step;
  }
  ctx.closePath();
}

export function drawMousePreview(ctx, w, h, t) {
  const bg = ctx.createRadialGradient(w * 0.5, h * 0.5, 10, w * 0.5, h * 0.5, w * 0.65);
  bg.addColorStop(0, '#2c3344');
  bg.addColorStop(1, '#141822');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  const mx = w * 0.54 + Math.sin(t * 1.4) * 38;
  const my = h * 0.54 + Math.cos(t * 2.1) * 14;
  const ang = Math.atan2(-Math.sin(t * 2.1) * 14, Math.cos(t * 1.4) * 38) * 0.35;

  ctx.save();
  ctx.translate(mx, my);
  ctx.rotate(ang);

  // Curvy wiggly tail
  const wag = Math.sin(t * 8) * 10;
  ctx.beginPath();
  ctx.moveTo(-20, 0);
  ctx.bezierCurveTo(-40, -14 + wag, -56, 16 - wag, -74, wag * 0.6);
  ctx.strokeStyle = '#f0b8c0';
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Body
  ctx.fillStyle = '#f4eee1';
  ctx.beginPath();
  ctx.ellipse(0, 0, 22, 13, 0, 0, Math.PI * 2);
  ctx.fill();

  // Ears
  for (const side of [-1, 1]) {
    ctx.fillStyle = '#f4eee1';
    ctx.beginPath();
    ctx.arc(8, side * 11, 6.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffb5c2';
    ctx.beginPath();
    ctx.arc(8.5, side * 11, 3.8, 0, Math.PI * 2);
    ctx.fill();
  }

  // Nose & eyes
  ctx.fillStyle = '#181a24';
  ctx.beginPath();
  ctx.arc(14, -4.5, 2.2, 0, Math.PI * 2);
  ctx.arc(14, 4.5, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ff8da1';
  ctx.beginPath();
  ctx.arc(22, 0, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
