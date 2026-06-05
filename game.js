(() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  const homePanel = document.getElementById("homePanel");
  const gameOverPanel = document.getElementById("gameOverPanel");
  const shopModal = document.getElementById("shopModal");
  const statusMessage = document.getElementById("statusMessage");
  const bgm = document.getElementById("bgm");

  const playBtn = document.getElementById("playBtn");
  const openShopBtn = document.getElementById("openShopBtn");
  const replayBtn = document.getElementById("replayBtn");
  const goShopBtn = document.getElementById("goShopBtn");
  const closeShopBtn = document.getElementById("closeShopBtn");
  const shopHudBtn = document.getElementById("shopHudBtn");
  const pauseBtn = document.getElementById("pauseBtn");
  const muteBtn = document.getElementById("muteBtn");

  const scoreBadge = document.getElementById("scoreBadge");
  const bestBadge = document.getElementById("bestBadge");
  const coinsBadge = document.getElementById("coinsBadge");
  const livesBadge = document.getElementById("livesBadge");
  const modeBadge = document.getElementById("modeBadge");

  const homeBest = document.getElementById("homeBest");
  const homeCoins = document.getElementById("homeCoins");
  const finalScore = document.getElementById("finalScore");
  const finalBest = document.getElementById("finalBest");
  const finalCoins = document.getElementById("finalCoins");
  const gameOverLead = document.getElementById("gameOverLead");
  const skinGrid = document.getElementById("skinGrid");
  const shopCoins = document.getElementById("shopCoins");

  const STORAGE = {
    best: "happyBirdsStoreBest",
    coins: "happyBirdsStoreCoins",
    muted: "happyBirdsStoreMuted",
    unlocked: "happyBirdsStoreUnlocked",
    selected: "happyBirdsStoreSelectedSkin"
  };

  const storage = {
    get(key, fallback) { try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch {} }
  };

  const skins = [
    { id: "classic", name: "Classic", price: 0, asset: "./assets/bird-classic.svg", description: "The original cheerful bird." },
    { id: "bluejay", name: "Blue Jay", price: 30, asset: "./assets/bird-bluejay.svg", description: "Cool sky-blue style." },
    { id: "ruby", name: "Ruby", price: 60, asset: "./assets/bird-ruby.svg", description: "Bold red arcade look." },
    { id: "mint", name: "Mint", price: 90, asset: "./assets/bird-mint.svg", description: "Fresh and bright premium skin." }
  ];

  let unlockedSkins;
  try {
    unlockedSkins = JSON.parse(storage.get(STORAGE.unlocked, '["classic"]'));
    if (!Array.isArray(unlockedSkins) || !unlockedSkins.length) unlockedSkins = ["classic"];
  } catch {
    unlockedSkins = ["classic"];
  }
  let selectedSkin = storage.get(STORAGE.selected, "classic");
  if (!unlockedSkins.includes(selectedSkin)) selectedSkin = "classic";

  let totalCoins = Number(storage.get(STORAGE.coins, "0")) || 0;
  let best = Number(storage.get(STORAGE.best, "0")) || 0;
  let muted = storage.get(STORAGE.muted, "0") === "1";

  const images = {};
  function loadImage(name, src) {
    const img = new Image();
    img.src = src;
    images[name] = img;
  }
  skins.forEach(s => loadImage(s.id, s.asset));
  loadImage("pipe", "./assets/pipe.svg");
  loadImage("enemy", "./assets/enemy-bird.svg");
  loadImage("heart", "./assets/heart.svg");
  loadImage("coin", "./assets/coin.svg");

  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  let audioCtx = null;

  let W = 0, H = 0, DPR = 1, lastTime = 0;
  let state = "menu"; // menu | playing | paused | gameover
  let resumeAfterShop = false;
  let score = 0;
  let runCoins = 0;
  let extraLives = 0;
  let invincibleTimer = 0;
  let challengeMode = false;
  let bgOffset = 0;

  const bird = { x: 120, y: 260, w: 70, h: 52, vy: 0, rot: 0 };
  const game = {
    speed: 220,
    gravity: 1680,
    flap: -430,
    pipeWidth: 90,
    gap: 176,
    pipeTimer: 0,
    pipeEvery: 1.45,
    enemyTimer: 0,
    enemyEvery: 2.6,
    coinTimer: 0,
    coinEvery: 4.0,
    heartTimer: 0,
    heartEvery: 12.0,
    pipes: [],
    enemies: [],
    coins: [],
    hearts: [],
    particles: []
  };

  function announce(msg) { statusMessage.textContent = msg; }

  function ensureAudio() {
    if (!AudioContextCtor) return;
    if (!audioCtx) audioCtx = new AudioContextCtor({ latencyHint: "interactive" });
    if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
  }

  function playSfx(type) {
    if (muted || !audioCtx) return;
    const now = audioCtx.currentTime;
    const gain = audioCtx.createGain();
    gain.connect(audioCtx.destination);
    const osc1 = audioCtx.createOscillator();
    osc1.connect(gain);

    if (type === "flap") {
      osc1.type = "triangle";
      osc1.frequency.setValueAtTime(520, now);
      osc1.frequency.exponentialRampToValueAtTime(840, now + 0.09);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.12, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
      osc1.start(now); osc1.stop(now + 0.13);
    } else if (type === "point") {
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(700, now);
      osc1.frequency.exponentialRampToValueAtTime(960, now + 0.08);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.08, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
      osc1.start(now); osc1.stop(now + 0.11);
    } else if (type === "coin") {
      const osc2 = audioCtx.createOscillator();
      osc2.connect(gain);
      osc1.type = "sine"; osc2.type = "sine";
      osc1.frequency.setValueAtTime(880, now);
      osc1.frequency.exponentialRampToValueAtTime(1170, now + 0.12);
      osc2.frequency.setValueAtTime(1170, now + 0.02);
      osc2.frequency.exponentialRampToValueAtTime(1460, now + 0.16);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.12, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
      osc1.start(now); osc1.stop(now + 0.13);
      osc2.start(now + 0.03); osc2.stop(now + 0.18);
    } else if (type === "life") {
      const o2 = audioCtx.createOscillator();
      o2.connect(gain);
      osc1.type = "sine"; o2.type = "triangle";
      osc1.frequency.setValueAtTime(520, now);
      osc1.frequency.exponentialRampToValueAtTime(780, now + 0.16);
      o2.frequency.setValueAtTime(780, now + 0.03);
      o2.frequency.exponentialRampToValueAtTime(1040, now + 0.22);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.15, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);
      osc1.start(now); osc1.stop(now + 0.18); o2.start(now + 0.04); o2.stop(now + 0.24);
    } else if (type === "hit") {
      const o2 = audioCtx.createOscillator();
      o2.connect(gain);
      osc1.type = "sawtooth"; o2.type = "square";
      osc1.frequency.setValueAtTime(240, now);
      osc1.frequency.exponentialRampToValueAtTime(70, now + 0.32);
      o2.frequency.setValueAtTime(130, now + 0.03);
      o2.frequency.exponentialRampToValueAtTime(55, now + 0.26);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.18, now + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.36);
      osc1.start(now); osc1.stop(now + 0.34); o2.start(now + 0.03); o2.stop(now + 0.27);
    }
  }

  function syncMusic() {
    bgm.volume = 0.28;
    bgm.muted = muted;
    if (muted || state !== "playing" || document.visibilityState !== "visible") {
      bgm.pause();
      return;
    }
    bgm.play().catch(() => {});
  }

  function saveUnlocked() {
    storage.set(STORAGE.unlocked, JSON.stringify(unlockedSkins));
    storage.set(STORAGE.selected, selectedSkin);
    storage.set(STORAGE.coins, String(totalCoins));
    storage.set(STORAGE.best, String(best));
  }

  function setMuted(next) {
    muted = next;
    storage.set(STORAGE.muted, muted ? "1" : "0");
    muteBtn.textContent = muted ? "🔇" : "🔊";
    muteBtn.setAttribute("aria-pressed", String(muted));
    announce(muted ? "Audio muted" : "Audio on");
    syncMusic();
  }

  function setPaused(next) {
    if (state !== "playing" && state !== "paused") return;
    state = next ? "paused" : "playing";
    pauseBtn.textContent = next ? "▶" : "⏸";
    pauseBtn.setAttribute("aria-pressed", String(next));
    announce(next ? "Game paused" : "Game resumed");
    if (next && audioCtx && audioCtx.state === "running") audioCtx.suspend().catch(() => {});
    if (!next && audioCtx && audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
    syncMusic();
    lastTime = performance.now();
  }

  function openShop() {
    resumeAfterShop = state === "playing";
    if (resumeAfterShop) setPaused(true);
    renderShop();
    shopModal.classList.remove("hidden");
    shopModal.setAttribute("aria-hidden", "false");
  }

  function closeShop() {
    shopModal.classList.add("hidden");
    shopModal.setAttribute("aria-hidden", "true");
    if (resumeAfterShop) {
      resumeAfterShop = false;
      setPaused(false);
    }
  }

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.floor(window.innerWidth);
    H = Math.floor(window.innerHeight);
    canvas.width = Math.floor(W * DPR);
    canvas.height = Math.floor(H * DPR);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    bird.x = Math.max(96, W * 0.24);
    if (state === "menu") bird.y = H * 0.42;
  }

  function updateHomeStats() {
    homeBest.textContent = best;
    homeCoins.textContent = totalCoins;
  }

  function updateHud() {
    scoreBadge.textContent = `Score: ${score}`;
    bestBadge.textContent = `Best: ${best}`;
    coinsBadge.textContent = `Coins: ${totalCoins}`;
    livesBadge.textContent = `Lives: ${extraLives}`;
    modeBadge.textContent = challengeMode ? "Challenge" : "Classic";
    updateHomeStats();
  }

  function resetRun() {
    score = 0;
    runCoins = 0;
    extraLives = 0;
    invincibleTimer = 0;
    challengeMode = false;
    bgOffset = 0;
    bird.y = H * 0.42;
    bird.vy = 0;
    bird.rot = 0;
    game.pipeTimer = 1.0;
    game.enemyTimer = 0.8;
    game.coinTimer = 1.2;
    game.heartTimer = 4.5;
    game.pipes = [];
    game.enemies = [];
    game.coins = [];
    game.hearts = [];
    game.particles = [];
    updateHud();
  }

  function showHome() {
    state = "menu";
    homePanel.classList.remove("hidden");
    gameOverPanel.classList.add("hidden");
    pauseBtn.textContent = "⏸";
    pauseBtn.setAttribute("aria-pressed", "false");
    syncMusic();
    updateHud();
  }

  function startGame() {
    ensureAudio();
    resetRun();
    state = "playing";
    homePanel.classList.add("hidden");
    gameOverPanel.classList.add("hidden");
    bird.vy = game.flap;
    playSfx("flap");
    syncMusic();
    announce("Game started");
  }

  function rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function birdBounds() {
    return { x: bird.x - bird.w / 2 + 8, y: bird.y - bird.h / 2 + 5, w: bird.w - 16, h: bird.h - 10 };
  }

  function addParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      game.particles.push({
        x, y,
        vx: -100 + Math.random() * 200,
        vy: -120 + Math.random() * 200,
        r: 2 + Math.random() * 4,
        life: 0.28 + Math.random() * 0.4,
        color
      });
    }
  }

  function awardCoin(amount, countForRun = true) {
    totalCoins += amount;
    if (countForRun) runCoins += amount;
    saveUnlocked();
    updateHud();
  }

  function spawnPipe() {
    const margin = 70;
    const dynamicGap = score >= 40 ? 160 : game.gap;
    const top = margin + Math.random() * Math.max(60, (H - 150 - dynamicGap - margin));
    game.pipes.push({
      x: W + 70,
      top,
      gap: dynamicGap,
      passed: false,
      moving: challengeMode && Math.random() < 0.6,
      amp: 16 + Math.random() * 30,
      phase: Math.random() * Math.PI * 2,
      speed: 0.8 + Math.random() * 1.6,
      offset: 0
    });
  }

  function spawnEnemy() {
    game.enemies.push({
      x: W + 90,
      y: 100 + Math.random() * Math.max(80, H - 230),
      w: 62,
      h: 40,
      vx: game.speed + 40 + Math.random() * 90,
      bobPhase: Math.random() * Math.PI * 2,
      bobAmp: Math.random() * 12,
      bobSpeed: 1.8 + Math.random() * 1.8
    });
  }

  function spawnCoin() {
    game.coins.push({
      x: W + 70,
      y: 100 + Math.random() * Math.max(80, H - 220),
      w: 30,
      h: 30,
      vx: game.speed - 20,
      phase: Math.random() * Math.PI * 2
    });
  }

  function spawnHeart() {
    if (extraLives >= 3) return;
    game.hearts.push({
      x: W + 70,
      y: 120 + Math.random() * Math.max(80, H - 250),
      w: 38,
      h: 34,
      vx: game.speed - 25,
      phase: Math.random() * Math.PI * 2
    });
  }

  function enterChallengeModeIfNeeded() {
    if (!challengeMode && score >= 25) {
      challengeMode = true;
      updateHud();
      addParticles(W * 0.5, H * 0.28, "#fff199", 30);
      announce("Challenge mode unlocked");
    }
  }

  function handleHit() {
    if (invincibleTimer > 0) return;
    if (extraLives > 0) {
      extraLives -= 1;
      invincibleTimer = 1.15;
      bird.vy = Math.min(0, bird.vy) - 100;
      playSfx("hit");
      addParticles(bird.x, bird.y, "#ff9db0", 20);
      updateHud();
      announce(extraLives > 0 ? `Hit! ${extraLives} extra lives left.` : "Extra life used.");
      return;
    }
    playSfx("hit");
    state = "gameover";
    bgm.pause();
    const bonus = Math.floor(score / 5);
    if (bonus > 0) awardCoin(bonus, false);
    if (score > best) {
      best = score;
      saveUnlocked();
    }
    finalScore.textContent = score;
    finalBest.textContent = best;
    finalCoins.textContent = runCoins + bonus;
    gameOverLead.textContent = bonus > 0 ? `You picked up ${runCoins} coins and earned ${bonus} bonus coins.` : `You picked up ${runCoins} coins this run.`;
    gameOverPanel.classList.remove("hidden");
    homePanel.classList.add("hidden");
    updateHud();
    updateHomeStats();
    announce("Game over");
  }

  function flap() {
    if (shopModal && !shopModal.classList.contains("hidden")) return;
    ensureAudio();
    if (state === "menu") return startGame();
    if (state === "gameover") return startGame();
    if (state !== "playing") return;
    bird.vy = game.flap;
    playSfx("flap");
    addParticles(bird.x - 12, bird.y + 8, "white", 8);
  }

  function update(dt) {
    if (state !== "playing") return;
    if (invincibleTimer > 0) invincibleTimer -= dt;

    bgOffset = (bgOffset + game.speed * 0.18 * dt) % 1000;
    bird.vy += game.gravity * dt;
    bird.y += bird.vy * dt;
    bird.rot = Math.max(-0.65, Math.min(1.15, bird.vy / 700));

    game.pipeTimer += dt;
    if (game.pipeTimer >= game.pipeEvery) {
      game.pipeTimer = 0;
      spawnPipe();
    }

    game.coinTimer += dt;
    if (game.coinTimer >= game.coinEvery) {
      game.coinTimer = 0;
      spawnCoin();
    }

    game.heartTimer += dt;
    if (game.heartTimer >= game.heartEvery) {
      game.heartTimer = 0;
      if (Math.random() < 0.7) spawnHeart();
    }

    enterChallengeModeIfNeeded();
    game.enemyEvery = score >= 45 ? 2.0 : 2.6;
    if (challengeMode) {
      game.enemyTimer += dt;
      if (game.enemyTimer >= game.enemyEvery) {
        game.enemyTimer = 0;
        spawnEnemy();
      }
    }

    const bb = birdBounds();

    for (const pipe of game.pipes) {
      pipe.x -= game.speed * dt;
      if (pipe.moving) pipe.offset = Math.sin(performance.now() * 0.001 * pipe.speed + pipe.phase) * pipe.amp;
      const top = pipe.top + pipe.offset;
      const bottomY = top + pipe.gap;
      if (!pipe.passed && pipe.x + game.pipeWidth < bird.x) {
        pipe.passed = true;
        score += 1;
        if (score > best) best = score;
        playSfx("point");
        updateHud();
      }
      const topRect = { x: pipe.x + 12, y: 0, w: game.pipeWidth - 24, h: top };
      const bottomRect = { x: pipe.x + 12, y: bottomY, w: game.pipeWidth - 24, h: H - bottomY - 56 };
      if (rectsOverlap(bb, topRect) || rectsOverlap(bb, bottomRect)) handleHit();
    }
    game.pipes = game.pipes.filter(p => p.x + game.pipeWidth > -120);

    for (const enemy of game.enemies) {
      enemy.x -= enemy.vx * dt;
      enemy.y += Math.sin(performance.now() * 0.001 * enemy.bobSpeed + enemy.bobPhase) * enemy.bobAmp * dt * 2.3;
      const rect = { x: enemy.x - enemy.w / 2 + 4, y: enemy.y - enemy.h / 2 + 4, w: enemy.w - 8, h: enemy.h - 8 };
      if (rectsOverlap(bb, rect)) handleHit();
    }
    game.enemies = game.enemies.filter(e => e.x + e.w > -80);

    for (const coin of game.coins) {
      coin.x -= coin.vx * dt;
      coin.y += Math.sin(performance.now() * 0.003 + coin.phase) * 18 * dt;
      const rect = { x: coin.x - coin.w / 2, y: coin.y - coin.h / 2, w: coin.w, h: coin.h };
      if (rectsOverlap(bb, rect)) {
        coin.collected = true;
        awardCoin(1);
        playSfx("coin");
        addParticles(coin.x, coin.y, "#ffe58f", 12);
        announce("Coin collected");
      }
    }
    game.coins = game.coins.filter(c => !c.collected && c.x + c.w > -60);

    for (const heart of game.hearts) {
      heart.x -= heart.vx * dt;
      heart.y += Math.sin(performance.now() * 0.002 + heart.phase) * 22 * dt;
      const rect = { x: heart.x - heart.w / 2, y: heart.y - heart.h / 2, w: heart.w, h: heart.h };
      if (rectsOverlap(bb, rect)) {
        heart.collected = true;
        extraLives = Math.min(3, extraLives + 1);
        playSfx("life");
        addParticles(heart.x, heart.y, "#ff7fa9", 18);
        updateHud();
        announce("Extra life collected");
      }
    }
    game.hearts = game.hearts.filter(h => !h.collected && h.x + h.w > -60);

    for (const p of game.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      p.vy += 180 * dt;
    }
    game.particles = game.particles.filter(p => p.life > 0);

    if (bird.y + bird.h / 2 > H - 56) {
      bird.y = H - 56 - bird.h / 2;
      handleHit();
    }
    if (bird.y - bird.h / 2 < 0) {
      bird.y = bird.h / 2;
      handleHit();
    }
  }

  function drawBackground() {
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#75dcff");
    sky.addColorStop(0.58, "#dff4ff");
    sky.addColorStop(1, "#a0df7c");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // sun
    ctx.fillStyle = "rgba(255,233,157,.95)";
    ctx.beginPath(); ctx.arc(W - 96, 96, 46, 0, Math.PI * 2); ctx.fill();

    // clouds
    ctx.fillStyle = "rgba(255,255,255,.8)";
    for (let i = 0; i < 6; i++) {
      const x = ((i * 220) - bgOffset * (0.23 + i * 0.015)) % (W + 260) - 130;
      const y = 70 + i * 34;
      ctx.beginPath();
      ctx.arc(x, y, 22, 0, Math.PI * 2);
      ctx.arc(x + 26, y - 10, 30, 0, Math.PI * 2);
      ctx.arc(x + 58, y, 24, 0, Math.PI * 2);
      ctx.fill();
    }

    // hills
    ctx.fillStyle = "#92db75";
    for (let i = 0; i < 5; i++) {
      const x = ((i * 240) - bgOffset * 0.58) % (W + 320) - 160;
      ctx.beginPath();
      ctx.arc(x + 120, H - 36, 118, Math.PI, Math.PI * 2);
      ctx.fill();
    }

    // ground
    ctx.fillStyle = "#5fb34d";
    ctx.fillRect(0, H - 56, W, 56);
    ctx.fillStyle = "rgba(0,0,0,.12)";
    for (let x = -40; x < W + 40; x += 32) ctx.fillRect((x - bgOffset * 2) % (W + 32), H - 56, 16, 56);
  }

  function drawPipeSegment(x, y, h, upsideDown) {
    if (h <= 0) return;
    const img = images.pipe;
    if (!img.complete) {
      ctx.fillStyle = "#3fae47";
      ctx.fillRect(x, y, game.pipeWidth, h);
      return;
    }
    ctx.save();
    if (upsideDown) {
      ctx.translate(x + game.pipeWidth / 2, y + h / 2);
      ctx.rotate(Math.PI);
      ctx.drawImage(img, -game.pipeWidth / 2, -h / 2, game.pipeWidth, h);
    } else {
      ctx.drawImage(img, x, y, game.pipeWidth, h);
    }
    ctx.restore();
  }

  function drawBird() {
    const img = images[selectedSkin] || images.classic;
    ctx.save();
    ctx.translate(bird.x, bird.y);
    ctx.rotate(bird.rot);
    if (invincibleTimer > 0 && Math.floor(invincibleTimer * 14) % 2 === 0) ctx.globalAlpha = 0.46;
    if (img && img.complete) {
      ctx.drawImage(img, -bird.w / 2, -bird.h / 2, bird.w, bird.h);
    } else {
      ctx.fillStyle = "#ffd43b";
      ctx.beginPath(); ctx.ellipse(0, 0, bird.w / 2, bird.h / 2, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    drawBackground();

    for (const pipe of game.pipes) {
      const top = pipe.top + pipe.offset;
      const bottomY = top + pipe.gap;
      drawPipeSegment(pipe.x, 0, top, true);
      drawPipeSegment(pipe.x, bottomY, H - bottomY - 56, false);
    }

    for (const coin of game.coins) {
      const img = images.coin;
      if (img.complete) ctx.drawImage(img, coin.x - coin.w / 2, coin.y - coin.h / 2, coin.w, coin.h);
      else { ctx.fillStyle = "gold"; ctx.beginPath(); ctx.arc(coin.x, coin.y, coin.w/2, 0, Math.PI * 2); ctx.fill(); }
    }

    for (const heart of game.hearts) {
      const img = images.heart;
      if (img.complete) ctx.drawImage(img, heart.x - heart.w / 2, heart.y - heart.h / 2, heart.w, heart.h);
      else { ctx.fillStyle = "#ff6690"; ctx.fillRect(heart.x - heart.w / 2, heart.y - heart.h / 2, heart.w, heart.h); }
    }

    for (const enemy of game.enemies) {
      const img = images.enemy;
      if (img.complete) ctx.drawImage(img, enemy.x - enemy.w / 2, enemy.y - enemy.h / 2, enemy.w, enemy.h);
      else { ctx.fillStyle = "#ef4444"; ctx.fillRect(enemy.x - enemy.w / 2, enemy.y - enemy.h / 2, enemy.w, enemy.h); }
    }

    drawBird();

    for (const p of game.particles) {
      ctx.globalAlpha = Math.max(0, p.life / 0.5);
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }

    if (state === "paused") {
      ctx.fillStyle = "rgba(0,0,0,.32)";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "white";
      ctx.textAlign = "center";
      ctx.font = "900 42px system-ui";
      ctx.fillText("Paused", W / 2, H / 2);
    }
  }

  function loop(now) {
    const dt = Math.min(0.032, ((now - lastTime) || 16) / 1000);
    lastTime = now;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  function renderShop() {
    shopCoins.textContent = totalCoins;
    skinGrid.innerHTML = "";
    skins.forEach(skin => {
      const unlocked = unlockedSkins.includes(skin.id);
      const selected = selectedSkin === skin.id;
      const card = document.createElement("div");
      card.className = `skinCard${selected ? " selected" : ""}`;

      const img = document.createElement("img");
      img.src = skin.asset;
      img.alt = `${skin.name} skin`;
      card.appendChild(img);

      const h4 = document.createElement("h4");
      h4.textContent = skin.name;
      card.appendChild(h4);

      const p = document.createElement("p");
      p.textContent = skin.description;
      card.appendChild(p);

      const meta = document.createElement("div");
      meta.className = "skinMeta";
      meta.innerHTML = `<span class="skinPrice">${skin.price === 0 ? "Free" : skin.price + " coins"}</span>`;
      card.appendChild(meta);

      const btn = document.createElement("button");
      if (selected) {
        btn.textContent = "Selected";
        btn.className = "selectedBtn";
        btn.disabled = true;
      } else if (unlocked) {
        btn.textContent = "Select";
        btn.className = "select";
        btn.addEventListener("click", () => {
          selectedSkin = skin.id;
          saveUnlocked();
          renderShop();
          announce(`${skin.name} skin selected`);
        });
      } else {
        btn.textContent = totalCoins >= skin.price ? `Unlock (${skin.price})` : `Need ${skin.price}`;
        btn.className = totalCoins >= skin.price ? "buy" : "";
        btn.disabled = totalCoins < skin.price;
        btn.addEventListener("click", () => {
          if (totalCoins < skin.price) return;
          totalCoins -= skin.price;
          unlockedSkins.push(skin.id);
          selectedSkin = skin.id;
          saveUnlocked();
          updateHud();
          renderShop();
          announce(`${skin.name} unlocked`);
        });
      }
      card.appendChild(btn);
      skinGrid.appendChild(card);
    });
  }

  // Events
  window.addEventListener("resize", resize);
  canvas.addEventListener("pointerdown", () => {
    if (state === "playing") flap();
  });
  document.addEventListener("keydown", e => {
    const key = e.key.toLowerCase();
    if (e.code === "Space" || e.code === "ArrowUp") { e.preventDefault(); flap(); }
    if (key === "p") { ensureAudio(); setPaused(state === "playing"); }
    if (key === "m") { ensureAudio(); setMuted(!muted); }
  });

  playBtn.addEventListener("click", startGame);
  replayBtn.addEventListener("click", startGame);
  openShopBtn.addEventListener("click", openShop);
  goShopBtn.addEventListener("click", openShop);
  shopHudBtn.addEventListener("click", () => { ensureAudio(); openShop(); });
  closeShopBtn.addEventListener("click", closeShop);
  shopModal.addEventListener("click", e => { if (e.target === shopModal) closeShop(); });
  pauseBtn.addEventListener("click", () => { ensureAudio(); setPaused(state === "playing"); });
  muteBtn.addEventListener("click", () => { ensureAudio(); setMuted(!muted); });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      bgm.pause();
      if (audioCtx && audioCtx.state === "running") audioCtx.suspend().catch(() => {});
    } else {
      lastTime = performance.now();
      if ((state === "playing" || state === "paused") && audioCtx && audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
      syncMusic();
    }
  });

  // Init
  setMuted(muted);
  resize();
  updateHud();
  updateHomeStats();
  renderShop();
  showHome();
  requestAnimationFrame(t => { lastTime = t; requestAnimationFrame(loop); });
})();
