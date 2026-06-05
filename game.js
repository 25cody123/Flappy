(() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const startCard = document.getElementById("startCard");
  const pauseBtn = document.getElementById("pauseBtn");
  const muteBtn = document.getElementById("muteBtn");
  const statusMessage = document.getElementById("statusMessage");
  const bgm = document.getElementById("bgm");

  const storage = {
    get(key, fallback) {
      try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, value); } catch {}
    }
  };

  let W = 0, H = 0, DPR = 1;
  let state = "ready";
  let paused = false;
  let muted = storage.get("happyBirdsMuted", "0") === "1";
  let score = 0;
  let best = Number(storage.get("happyBirdsBest", "0")) || 0;
  let lastTime = 0;
  let spawnTimer = 0;
  let pipes = [];
  let particles = [];

  const bird = {
    x: 90, y: 260, r: 18, vy: 0, rot: 0
  };

  const physics = {
    gravity: 1700,
    flap: -455,
    pipeSpeed: 205,
    pipeGap: 170,
    pipeWidth: 72,
    spawnEvery: 1.45
  };

  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  let audioCtx = null;

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.floor(window.innerWidth);
    H = Math.floor(window.innerHeight);
    canvas.width = Math.floor(W * DPR);
    canvas.height = Math.floor(H * DPR);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    bird.x = Math.max(78, W * 0.24);
    if (state === "ready") bird.y = H * 0.42;
  }

  function unlockAudio() {
    if (!AudioContextCtor) return;
    if (!audioCtx) audioCtx = new AudioContextCtor({ latencyHint: "interactive" });
    if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
  }

  function playTone(type) {
    if (muted || !audioCtx) return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === "flap") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(850, now + 0.07);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.16, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);
      osc.start(now);
      osc.stop(now + 0.12);
    } else {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(70, now + 0.34);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.22, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);
      osc.start(now);
      osc.stop(now + 0.4);
    }
  }

  function syncMusic() {
    bgm.volume = 0.32;
    bgm.muted = muted;
    if (muted || paused || state !== "playing" || document.visibilityState !== "visible") {
      bgm.pause();
      return;
    }
    bgm.play().catch(() => {});
  }

  function setMuted(next) {
    muted = next;
    storage.set("happyBirdsMuted", muted ? "1" : "0");
    muteBtn.textContent = muted ? "🔇" : "🔊";
    muteBtn.setAttribute("aria-pressed", String(muted));
    muteBtn.setAttribute("aria-label", muted ? "Unmute audio" : "Mute audio");
    statusMessage.textContent = muted ? "Audio muted" : "Audio on";
    syncMusic();
  }

  function setPaused(next) {
    if (state !== "playing") return;
    paused = next;
    pauseBtn.textContent = paused ? "▶" : "⏸";
    pauseBtn.setAttribute("aria-pressed", String(paused));
    pauseBtn.setAttribute("aria-label", paused ? "Resume game" : "Pause game");
    statusMessage.textContent = paused ? "Game paused" : "Game resumed";
    if (paused && audioCtx && audioCtx.state === "running") audioCtx.suspend().catch(() => {});
    if (!paused && audioCtx && audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
    syncMusic();
    lastTime = performance.now();
  }

  function reset() {
    state = "ready";
    paused = false;
    score = 0;
    pipes = [];
    particles = [];
    spawnTimer = 0;
    bird.y = H * 0.42;
    bird.vy = 0;
    bird.rot = 0;
    startCard.classList.remove("hidden");
    pauseBtn.textContent = "⏸";
    pauseBtn.setAttribute("aria-pressed", "false");
    syncMusic();
  }

  function startGame() {
    state = "playing";
    paused = false;
    score = 0;
    pipes = [];
    particles = [];
    spawnTimer = physics.spawnEvery;
    bird.y = H * 0.42;
    bird.vy = physics.flap;
    startCard.classList.add("hidden");
    playTone("flap");
    syncMusic();
  }

  function flap() {
    unlockAudio();
    if (state === "ready") return startGame();
    if (state === "gameover") return reset();
    if (paused) return;
    bird.vy = physics.flap;
    playTone("flap");
    for (let i = 0; i < 6; i++) particles.push({x: bird.x - 12, y: bird.y + 8, vx: -80 - Math.random()*80, vy: -40 + Math.random()*80, life: .35});
  }

  function die() {
    if (state === "gameover") return;
    state = "gameover";
    startCard.classList.remove("hidden");
    startCard.querySelector("h1").textContent = "Game Over";
    startCard.querySelectorAll("p")[0].textContent = `Score: ${score}  •  Best: ${best}`;
    startCard.querySelectorAll("p")[1].textContent = "Tap to play again.";
    playTone("die");
    bgm.pause();
  }

  function spawnPipe() {
    const margin = 90;
    const gap = Math.max(135, Math.min(physics.pipeGap, H * 0.28));
    const topH = margin + Math.random() * (H - gap - margin * 2);
    pipes.push({ x: W + 40, top: topH, gap, passed: false });
  }

  function update(dt) {
    if (paused || state !== "playing") return;

    bird.vy += physics.gravity * dt;
    bird.y += bird.vy * dt;
    bird.rot = Math.max(-0.55, Math.min(1.25, bird.vy / 700));

    spawnTimer += dt;
    if (spawnTimer >= physics.spawnEvery) {
      spawnTimer = 0;
      spawnPipe();
    }

    for (const p of pipes) {
      p.x -= physics.pipeSpeed * dt;
      if (!p.passed && p.x + physics.pipeWidth < bird.x) {
        p.passed = true;
        score++;
        if (score > best) {
          best = score;
          storage.set("happyBirdsBest", String(best));
        }
      }
      const inX = bird.x + bird.r > p.x && bird.x - bird.r < p.x + physics.pipeWidth;
      const inTop = bird.y - bird.r < p.top;
      const inBottom = bird.y + bird.r > p.top + p.gap;
      if (inX && (inTop || inBottom)) die();
    }
    pipes = pipes.filter(p => p.x + physics.pipeWidth > -20);

    if (bird.y + bird.r > H - 40 || bird.y - bird.r < 0) die();

    for (const part of particles) {
      part.x += part.vx * dt;
      part.y += part.vy * dt;
      part.life -= dt;
    }
    particles = particles.filter(p => p.life > 0);
  }

  function drawPipe(x, y, w, h) {
    const grd = ctx.createLinearGradient(x, 0, x + w, 0);
    grd.addColorStop(0, "#35b84f");
    grd.addColorStop(.5, "#79e06c");
    grd.addColorStop(1, "#218a3d");
    ctx.fillStyle = grd;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = "rgba(0,0,0,.15)";
    ctx.fillRect(x + w - 12, y, 12, h);
    ctx.strokeStyle = "rgba(255,255,255,.35)";
    ctx.lineWidth = 3;
    ctx.strokeRect(x + 3, y + 3, w - 6, h - 6);
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#75d8ff");
    sky.addColorStop(0.65, "#d9f7ff");
    sky.addColorStop(1, "#7bd16e");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "rgba(255,255,255,.7)";
    for (let i = 0; i < 5; i++) {
      const cx = ((i * 190 + performance.now() * 0.012) % (W + 220)) - 110;
      const cy = 70 + i * 38;
      ctx.beginPath();
      ctx.arc(cx, cy, 22, 0, Math.PI * 2);
      ctx.arc(cx + 24, cy + 3, 28, 0, Math.PI * 2);
      ctx.arc(cx + 58, cy, 20, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const p of pipes) {
      drawPipe(p.x, 0, physics.pipeWidth, p.top);
      drawPipe(p.x, p.top + p.gap, physics.pipeWidth, H - (p.top + p.gap) - 40);
    }

    ctx.fillStyle = "#55b848";
    ctx.fillRect(0, H - 40, W, 40);
    ctx.fillStyle = "rgba(0,0,0,.15)";
    for (let x = 0; x < W; x += 28) ctx.fillRect(x, H - 40, 14, 40);

    for (const part of particles) {
      ctx.globalAlpha = Math.max(0, part.life / .35);
      ctx.fillStyle = "white";
      ctx.beginPath();
      ctx.arc(part.x, part.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    ctx.save();
    ctx.translate(bird.x, bird.y);
    ctx.rotate(bird.rot);
    ctx.fillStyle = "#ffd43b";
    ctx.beginPath();
    ctx.ellipse(0, 0, 22, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ff9f1c";
    ctx.beginPath();
    ctx.moveTo(18, 0); ctx.lineTo(36, -7); ctx.lineTo(36, 7); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(8, -8, 7, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = "#111";
    ctx.beginPath(); ctx.arc(10, -8, 3, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.5)";
    ctx.beginPath(); ctx.ellipse(-8, 3, 12, 7, -.5, 0, Math.PI*2); ctx.fill();
    ctx.restore();

    ctx.fillStyle = "white";
    ctx.font = "900 42px system-ui, -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.lineWidth = 6;
    ctx.strokeStyle = "rgba(0,0,0,.28)";
    ctx.strokeText(String(score), W / 2, 78);
    ctx.fillText(String(score), W / 2, 78);

    ctx.font = "700 15px system-ui, -apple-system, sans-serif";
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(255,255,255,.92)";
    ctx.fillText(`Best: ${best}`, 16, 32 + (window.visualViewport ? 0 : 0));

    if (paused) {
      ctx.fillStyle = "rgba(0,0,0,.35)";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "white";
      ctx.textAlign = "center";
      ctx.font = "900 42px system-ui";
      ctx.fillText("Paused", W / 2, H / 2);
    }
  }

  function loop(now) {
    const dt = Math.min(0.032, (now - lastTime) / 1000 || 0);
    lastTime = now;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  window.addEventListener("resize", resize);
  canvas.addEventListener("pointerdown", flap);
  document.addEventListener("keydown", e => {
    if (e.code === "Space" || e.code === "ArrowUp") { e.preventDefault(); flap(); }
    if (e.key.toLowerCase() === "p") setPaused(!paused);
    if (e.key.toLowerCase() === "m") setMuted(!muted);
  });

  pauseBtn.addEventListener("click", e => {
    e.stopPropagation();
    unlockAudio();
    setPaused(!paused);
  });

  muteBtn.addEventListener("click", e => {
    e.stopPropagation();
    unlockAudio();
    setMuted(!muted);
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      bgm.pause();
      if (audioCtx && audioCtx.state === "running") audioCtx.suspend().catch(() => {});
    } else {
      lastTime = performance.now();
      if (!paused && audioCtx && audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
      syncMusic();
    }
  });

  setMuted(muted);
  resize();
  reset();
  startCard.querySelector("h1").textContent = "Happy Birds";
  startCard.querySelectorAll("p")[0].textContent = "Tap to flap. Dodge the pipes.";
  startCard.querySelectorAll("p")[1].textContent = "Tap after a crash to restart.";
  requestAnimationFrame(t => { lastTime = t; requestAnimationFrame(loop); });
})();
