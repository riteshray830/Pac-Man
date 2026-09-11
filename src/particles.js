/**
 * High-performance Particle FX & Screen Juice Engine
 */

export class Particle {
  constructor(x, y, vx, vy, color, size, life, decay = 0.95, shape = 'circle') {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = color;
    this.size = size;
    this.initialSize = size;
    this.life = life; // 0 to 1
    this.decay = decay; // velocity decay
    this.shape = shape;
  }

  update(dt) {
    this.x += this.vx * dt * 60;
    this.y += this.vy * dt * 60;
    this.vx *= this.decay;
    this.vy *= this.decay;
    this.life -= dt * 1.5;
    this.size = this.initialSize * Math.max(0, this.life);
    return this.life > 0;
  }

  draw(ctx) {
    if (this.size <= 0.1) return;
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, this.life));
    ctx.fillStyle = this.color;
    ctx.shadowBlur = 8;
    ctx.shadowColor = this.color;

    if (this.shape === 'circle') {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.shape === 'star') {
      ctx.fillRect(this.x - this.size, this.y - this.size, this.size * 2, this.size * 2);
    }
    ctx.restore();
  }
}

export class RingShockwave {
  constructor(x, y, maxRadius, color, duration = 0.4) {
    this.x = x;
    this.y = y;
    this.radius = 2;
    this.maxRadius = maxRadius;
    this.color = color;
    this.duration = duration;
    this.elapsed = 0;
  }

  update(dt) {
    this.elapsed += dt;
    const progress = this.elapsed / this.duration;
    this.radius = 2 + (this.maxRadius - 2) * progress;
    return this.elapsed < this.duration;
  }

  draw(ctx) {
    const alpha = Math.max(0, 1 - (this.elapsed / this.duration));
    ctx.save();
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 3 * alpha;
    ctx.globalAlpha = alpha;
    ctx.shadowBlur = 12;
    ctx.shadowColor = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

export class FloatingText {
  constructor(x, y, text, color, duration = 0.8) {
    this.x = x;
    this.y = y;
    this.text = text;
    this.color = color;
    this.duration = duration;
    this.elapsed = 0;
  }

  update(dt) {
    this.elapsed += dt;
    this.y -= 25 * dt; // float upward
    return this.elapsed < this.duration;
  }

  draw(ctx) {
    const alpha = Math.max(0, 1 - Math.pow(this.elapsed / this.duration, 2));
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.shadowBlur = 10;
    ctx.shadowColor = this.color;
    ctx.font = 'bold 14px "Press Start 2P", monospace, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.text, this.x, this.y);
    ctx.restore();
  }
}

export class ParticleSystem {
  constructor() {
    this.particles = [];
    this.shockwaves = [];
    this.floatingTexts = [];
    this.shakeIntensity = 0;
    this.shakeDuration = 0;
  }

  screenShake(intensity = 6, duration = 0.2) {
    this.shakeIntensity = intensity;
    this.shakeDuration = duration;
  }

  getShakeOffset() {
    if (this.shakeDuration <= 0) return { x: 0, y: 0 };
    const dx = (Math.random() - 0.5) * 2 * this.shakeIntensity;
    const dy = (Math.random() - 0.5) * 2 * this.shakeIntensity;
    return { x: dx, y: dy };
  }

  // Chomp spark for standard dot
  spawnDotSparks(x, y, color = '#ffeb3b') {
    const count = 3;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.5 + Math.random() * 1.5;
      this.particles.push(
        new Particle(
          x,
          y,
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          color,
          1.5 + Math.random() * 1.5,
          0.3 + Math.random() * 0.2
        )
      );
    }
  }

  // Explosive burst on Power Pellet consumption
  spawnPowerPelletBurst(x, y) {
    this.screenShake(4, 0.25);
    this.shockwaves.push(new RingShockwave(x, y, 45, '#00e5ff', 0.45));

    for (let i = 0; i < 24; i++) {
      const angle = (i / 24) * Math.PI * 2 + (Math.random() * 0.2);
      const speed = 1.5 + Math.random() * 3.0;
      const color = i % 2 === 0 ? '#00e5ff' : '#ffffff';
      this.particles.push(
        new Particle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, color, 3, 0.6, 0.94, 'star')
      );
    }
  }

  // Radial blast when Pac-Man eats a ghost
  spawnGhostEatenBurst(x, y, ghostColor, score) {
    this.screenShake(8, 0.3);
    this.shockwaves.push(new RingShockwave(x, y, 35, ghostColor, 0.35));
    this.floatingTexts.push(new FloatingText(x, y - 5, `${score}`, '#00ffff', 0.9));

    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.0 + Math.random() * 4.0;
      const color = Math.random() < 0.6 ? ghostColor : '#ffffff';
      this.particles.push(
        new Particle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, color, 2.5 + Math.random() * 2, 0.7, 0.93)
      );
    }
  }

  // Fruit pickup
  spawnFruitBurst(x, y, points) {
    this.floatingTexts.push(new FloatingText(x, y - 8, `${points}`, '#ff4081', 1.0));
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.0 + Math.random() * 2.5;
      this.particles.push(
        new Particle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, '#ff4081', 2, 0.5)
      );
    }
  }

  // Pac-Man death dissolution
  spawnPacmanDeathBurst(x, y) {
    this.screenShake(10, 0.5);
    this.shockwaves.push(new RingShockwave(x, y, 50, '#ffea00', 0.6));

    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.0 + Math.random() * 3.5;
      this.particles.push(
        new Particle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, '#ffea00', 2.5, 0.9, 0.92)
      );
    }
  }

  // Level Clear Confetti
  spawnLevelClearStars(canvasWidth, canvasHeight) {
    const colors = ['#00e5ff', '#ffea00', '#ff007f', '#00ff66', '#ffffff'];
    for (let i = 0; i < 60; i++) {
      const x = Math.random() * canvasWidth;
      const y = Math.random() * (canvasHeight * 0.7);
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.0 + Math.random() * 4.0;
      const color = colors[Math.floor(Math.random() * colors.length)];
      this.particles.push(
        new Particle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, color, 3, 1.2, 0.95, 'star')
      );
    }
  }

  update(dt) {
    if (this.shakeDuration > 0) {
      this.shakeDuration -= dt;
      if (this.shakeDuration <= 0) this.shakeIntensity = 0;
    }

    this.particles = this.particles.filter((p) => p.update(dt));
    this.shockwaves = this.shockwaves.filter((s) => s.update(dt));
    this.floatingTexts = this.floatingTexts.filter((t) => t.update(dt));
  }

  draw(ctx) {
    for (const sw of this.shockwaves) sw.draw(ctx);
    for (const p of this.particles) p.draw(ctx);
    for (const ft of this.floatingTexts) ft.draw(ctx);
  }

  clear() {
    this.particles = [];
    this.shockwaves = [];
    this.floatingTexts = [];
    this.shakeDuration = 0;
  }
}
