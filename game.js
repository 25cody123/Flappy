(() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  let width = 0;
  let height = 0;
  let scale = 1;
  let lastTime = 0;
  let pipeTimer = 0;
  let state = "ready";
  let score = 0;
  let bestScore = Number(localStorage.getItem("flapDashBest") || 0);
  let frame = 0;

  const bird = {
    x: 0,
    y: 0,
    radius: 18,
    velocity: 0,
    gravity: 0.45,
    jump: -6, // 25% less jump than the original -8 version
    rotation: 0
  };

  const settings = {
    pipeWidth: 72,
    pipeGap: 178,
    pipeSpeed: 3.05,
    spawnEvery: 92,
    groundHeight: 86
  };

  let pipes = [];
  let clouds = [];
  let particles = [];

  function fitCanvas() {
    const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    width = Math.floor(window.innerWidth);
    height = Math.floor(window.innerHeight);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    scale = Math.max(0.85, Math.min(1.2, width / 390));
    settings.pipeWidth = 72 * scale;
    settings.pipeGap = 178 * scale;
    settings.pipeSpeed = 3.05 * scale;
    settings.groundHeight = Math.max(76, 88 * scale);
    bird.radius = 18 * scale;
    bird.x = width * 0.28;

    if (state === "ready") {
      bird.y = height * 0.45;
    }
  }

  function resetGame() {
    state = "ready";
    score = 0;
    pipeTimer = 0;
    pipes = [];
    particles = [];
    bird.y = height * 0.45;
    bird.velocity = 0;
    bird.rotation = 0;
    makeClouds();
  }

  function startGame() {
    if (state === "ready") {
      state = "playing";
      flap();
    }
  }

  function flap() {
    if (state === "gameover") {
      resetGame();
      return;
    }
    if (state === "ready") {
      startGame();
      return;
    }
    bird.velocity = bird.jump;
    for (let i = 0; i < 6; i++) {
      particles.push({
        x: bird.x - bird.radius * 0.7,
        y: bird.y + Math.random() * bird.radius - bird.radius / 2,
        vx: -Math.random() * 2.4 - 0.7,
        vy: (Math.random() - 0.5) * 1.4,
        life: 22,
        size: Math.random() * 3 + 2
      });
    }
  }

  function gameOver() {
    if (state !== "playing") return;
    state = "gameover";
    bestScore = Math.max(bestScore, score);
    localStorage.setItem("flapDashBest", String(bestScore));
    if (navigator.vibrate) navigator.vibrate(80);
  }

  function makeClouds() {
    clouds = [];
    const count = Math.max(5, Math.floor(width / 85));
    for (let i = 0; i < count; i++) {
      clouds.push({
        x: Math.random() * width,
        y: Math.random() * height * 0.42 + 35,
        speed: Math.random() * 0.35 + 0.15,
        size: Math.random() * 24 + 24
      });
    }
  }

  function spawnPipe() {
    const topMin = 80 * scale;
    const bottomLimit = height - settings.groundHeight - settings.pipeGap - 70 * scale;
    const topHeight = Math.max(topMin, Math.random() * Math.max(80, bottomLimit - topMin) + topMin);
    pipes.push({
      x: width + settings.pipeWidth,
      top: topHeight,
      bottom: topHeight + settings.pipeGap,
      passed: false
    });
  }

  function update() {
    frame++;

    clouds.forEach(cloud => {
      cloud.x -= cloud.speed * scale;
      if (cloud.x < -cloud.size * 3) {
        cloud.x = width + cloud.size * 2;
        cloud.y = Math.random() * height * 0.42 + 35;
      }
    });

    particles = particles.filter(p => p.life > 0);
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
    });

    if (state === "ready") {
      bird.y += Math.sin(frame / 16) * 0.55;
      return;
    }

    if (state !== "playing") return;

    bird.velocity += bird.gravity;
    bird.y += bird.velocity;
    bird.rotation = Math.max(-0.55, Math.min(1.15, bird.velocity / 10));

    pipeTimer++;
    if (pipeTimer >= settings.spawnEvery) {
      pipeTimer = 0;
      spawnPipe();
    }

    pipes.forEach(pipe => {
      pipe.x -= settings.pipeSpeed;

      if (!pipe.passed && pipe.x + settings.pipeWidth < bird.x - bird.radius) {
        pipe.passed = true;
        score++;
        bestScore = Math.max(bestScore, score);
      }

      const birdLeft = bird.x - bird.radius;
      const birdRight = bird.x + bird.radius;
      const birdTop = bird.y - bird.radius;
      const birdBottom = bird.y + bird.radius;
      const hitX = birdRight > pipe.x && birdLeft < pipe.x + settings.pipeWidth;
      const hitY = birdTop < pipe.top || birdBottom > pipe.bottom;

      if (hitX && hitY) gameOver();
    });

    pipes = pipes.filter(pipe => pipe.x + settings.pipeWidth > -20);

    if (bird.y + bird.radius > height - settings.groundHeight || bird.y - bird.radius < 0) {
      gameOver();
    }
  }

  function drawBackground() {
    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, "#67c8ff");
    sky.addColorStop(0.55, "#b7f2ff");
    sky.addColorStop(0.56, "#90d660");
    sky.addColorStop(1, "#55a940");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = "rgba(255,255,255,0.72)";
    clouds.forEach(c => {
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.size * 0.55, 0, Math.PI * 2);
      ctx.arc(c.x + c.size * 0.55, c.y - c.size * 0.15, c.size * 0.72, 0, Math.PI * 2);
      ctx.arc(c.x + c.size * 1.15, c.y, c.size * 0.5, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.fillStyle = "rgba(72, 130, 50, 0.28)";
    for (let x = -40; x < width + 60; x += 54 * scale) {
      ctx.beginPath();
      ctx.arc(x, height - settings.groundHeight + 15 * scale, 42 * scale, Math.PI, 0);
      ctx.fill();
    }
  }

  function drawPipes() {
    pipes.forEach(pipe => {
      const w = settings.pipeWidth;
      const capH = 24 * scale;
      const radius = 10 * scale;

      const pipeGradient = ctx.createLinearGradient(pipe.x, 0, pipe.x + w, 0);
      pipeGradient.addColorStop(0, "#188d36");
      pipeGradient.addColorStop(0.45, "#49d85d");
      pipeGradient.addColorStop(1, "#137829");
      ctx.fillStyle = pipeGradient;
      roundRect(pipe.x, -radius, w, pipe.top + radius, radius);
      ctx.fill();
      roundRect(pipe.x - 7 * scale, pipe.top - capH, w + 14 * scale, capH, radius);
      ctx.fill();

      roundRect(pipe.x, pipe.bottom, w, height - settings.groundHeight - pipe.bottom + radius, radius);
      ctx.fill();
      roundRect(pipe.x - 7 * scale, pipe.bottom, w + 14 * scale, capH, radius);
      ctx.fill();

      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.fillRect(pipe.x + 10 * scale, 0, 10 * scale, pipe.top - capH);
      ctx.fillRect(pipe.x + 10 * scale, pipe.bottom + capH, 10 * scale, height - settings.groundHeight - pipe.bottom);
    });
  }

  function drawBird() {
    ctx.save();
    ctx.translate(bird.x, bird.y);
    ctx.rotate(bird.rotation);

    ctx.fillStyle = "#ffd23f";
    ctx.beginPath();
    ctx.arc(0, 0, bird.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffb000";
    ctx.beginPath();
    ctx.ellipse(-bird.radius * 0.55, bird.radius * 0.15, bird.radius * 0.55, bird.radius * 0.35, -0.35, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ff7a1a";
    ctx.beginPath();
    ctx.moveTo(bird.radius * 0.75, -bird.radius * 0.1);
    ctx.lineTo(bird.radius * 1.45, bird.radius * 0.12);
    ctx.lineTo(bird.radius * 0.75, bird.radius * 0.34);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(bird.radius * 0.35, -bird.radius * 0.42, bird.radius * 0.33, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#111";
    ctx.beginPath();
    ctx.arc(bird.radius * 0.45, -bird.radius * 0.42, bird.radius * 0.13, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function drawParticles() {
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    particles.forEach(p => {
      ctx.globalAlpha = Math.max(0, p.life / 22) * 0.65;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  function drawGround() {
    ctx.fillStyle = "#6cc34a";
    ctx.fillRect(0, height - settings.groundHeight, width, settings.groundHeight);

    ctx.fillStyle = "#4a8d36";
    ctx.fillRect(0, height - settings.groundHeight, width, 9 * scale);

    ctx.fillStyle = "rgba(255,255,255,0.18)";
    for (let x = -((frame * settings.pipeSpeed) % (28 * scale)); x < width; x += 28 * scale) {
      ctx.fillRect(x, height - settings.groundHeight + 18 * scale, 12 * scale, 5 * scale);
    }
  }

  function drawText() {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.font = `900 ${46 * scale}px -apple-system, BlinkMacSystemFont, Arial`;
    ctx.fillText(String(score), width / 2 + 2, 76 * scale + 2);
    ctx.fillStyle = "#fff";
    ctx.fillText(String(score), width / 2, 76 * scale);

    ctx.font = `700 ${16 * scale}px -apple-system, BlinkMacSystemFont, Arial`;
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fillText(`BEST ${bestScore}`, width / 2, 118 * scale);

    if (state === "ready") {
      panel(width / 2, height * 0.33, 300 * scale, 140 * scale);
      ctx.fillStyle = "#fff";
      ctx.font = `900 ${34 * scale}px -apple-system, BlinkMacSystemFont, Arial`;
      ctx.fillText("FLAP DASH", width / 2, height * 0.33 - 30 * scale);
      ctx.font = `700 ${18 * scale}px -apple-system, BlinkMacSystemFont, Arial`;
      ctx.fillText("Tap to flap", width / 2, height * 0.33 + 12 * scale);
      ctx.font = `500 ${14 * scale}px -apple-system, BlinkMacSystemFont, Arial`;
      ctx.fillText("Avoid the pipes", width / 2, height * 0.33 + 42 * scale);
    }

    if (state === "gameover") {
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fillRect(0, 0, width, height);
      panel(width / 2, height * 0.46, 310 * scale, 185 * scale);
      ctx.fillStyle = "#fff";
      ctx.font = `900 ${34 * scale}px -apple-system, BlinkMacSystemFont, Arial`;
      ctx.fillText("GAME OVER", width / 2, height * 0.46 - 45 * scale);
      ctx.font = `700 ${20 * scale}px -apple-system, BlinkMacSystemFont, Arial`;
      ctx.fillText(`Score: ${score}`, width / 2, height * 0.46 - 6 * scale);
      ctx.fillText(`Best: ${bestScore}`, width / 2, height * 0.46 + 26 * scale);
      ctx.font = `600 ${16 * scale}px -apple-system, BlinkMacSystemFont, Arial`;
      ctx.fillText("Tap to restart", width / 2, height * 0.46 + 66 * scale);
    }
  }

  function panel(cx, cy, w, h) {
    ctx.fillStyle = "rgba(0,0,0,0.24)";
    roundRect(cx - w / 2 + 4, cy - h / 2 + 5, w, h, 20 * scale);
    ctx.fill();
    ctx.fillStyle = "rgba(18,79,96,0.62)";
    roundRect(cx - w / 2, cy - h / 2, w, h, 20 * scale);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = 2 * scale;
    ctx.stroke();
  }

  function roundRect(x, y, w, h, r) {
    const radius = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  function loop(time) {
    const delta = Math.min(32, time - lastTime || 16.67);
    lastTime = time;

    // Keep gameplay consistent around 60fps.
    const steps = Math.max(1, Math.round(delta / 16.67));
    for (let i = 0; i < steps; i++) update();

    drawBackground();
    drawPipes();
    drawParticles();
    drawBird();
    drawGround();
    drawText();
    requestAnimationFrame(loop);
  }

  window.addEventListener("resize", fitCanvas);
  window.addEventListener("orientationchange", () => setTimeout(fitCanvas, 250));
  document.addEventListener("touchstart", e => {
    e.preventDefault();
    flap();
  }, { passive: false });
  document.addEventListener("mousedown", flap);
  document.addEventListener("keydown", e => {
    if (e.code === "Space" || e.code === "ArrowUp") flap();
  });

  fitCanvas();
  resetGame();
  requestAnimationFrame(loop);
})();
