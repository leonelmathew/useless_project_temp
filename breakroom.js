/**
 * The Break Room - Anti-Productivity Hub
 * Interactive break room with bubble wrap, quotes, timer, boss-panic, and mini-game.
 */
(function () {
  "use strict";

  // ── Shared Audio Context ──
  let sharedAudioCtx = null;

  function getAudioContext() {
    if (!sharedAudioCtx) {
      try {
        sharedAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (_) {
        return null;
      }
    }
    // Resume if suspended (autoplay policy)
    if (sharedAudioCtx.state === "suspended") {
      sharedAudioCtx.resume();
    }
    return sharedAudioCtx;
  }

  // ── Custom Sound Storage ──
  const SOUND_STORAGE_KEY = "breakroom_custom_sounds";
  const customAudioElements = {};

  function loadCustomSounds() {
    try {
      const raw = localStorage.getItem(SOUND_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (_) {
      return {};
    }
  }

  function saveCustomSounds(data) {
    try {
      localStorage.setItem(SOUND_STORAGE_KEY, JSON.stringify(data));
    } catch (_) {
      // Storage full or unavailable
    }
  }

  function getCustomSoundDataURL(name) {
    return loadCustomSounds()[name] || null;
  }

  function setCustomSoundDataURL(name, dataURL) {
    const data = loadCustomSounds();
    data[name] = dataURL;
    saveCustomSounds(data);
  }

  function removeCustomSound(name) {
    const data = loadCustomSounds();
    delete data[name];
    saveCustomSounds(data);
    delete customAudioElements[name];
  }

  // ── Auto-load sounds from folder ──
  const SOUND_FILES = {
    pop: "sound-pop.mp3",
    siren: "sound-siren.mp3",
    game_catch: "sound-catch.mp3",
    game_hit: "sound-hit.mp3",
    game_over: "sound-gameover.mp3",
    game_miss: "sound-miss.mp3",
    game_over_low: "sound-gameover-low.mp3",
    game_over_high: "sound-gameover-high.mp3",
  };

  function autoLoadSounds() {
    const data = loadCustomSounds();
    let changed = false;

    const checks = Object.entries(SOUND_FILES).map(([name, file]) => {
      // Skip if already loaded from localStorage
      if (data[name]) return Promise.resolve();
      return fetch(file)
        .then(function (r) {
          if (!r.ok) return;
          return r.blob();
        })
        .then(function (blob) {
          if (!blob) return;
          return new Promise(function (resolve) {
            const reader = new FileReader();
            reader.onload = function (e) {
              data[name] = e.target.result;
              changed = true;
              resolve();
            };
            reader.onerror = resolve;
            reader.readAsDataURL(blob);
          });
        })
        .catch(function () {});
    });

    return Promise.all(checks).then(function () {
      if (changed) saveCustomSounds(data);
    });
  }

  function getOrCreateAudio(name) {
    if (customAudioElements[name]) return customAudioElements[name];
    const dataURL = getCustomSoundDataURL(name);
    if (!dataURL) return null;
    const audio = new Audio(dataURL);
    customAudioElements[name] = audio;
    return audio;
  }

  // ── Sound Synthesis ──
  function playPopSound() {
    const customAudio = getOrCreateAudio("pop");
    if (customAudio) {
      try {
        customAudio.currentTime = 0;
        customAudio.play();
      } catch (_) {}
      return;
    }

    // Fallback to synthesized pop
    const ctx = getAudioContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(400 + Math.random() * 200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch (_) {
      // Audio blocked by browser policy
    }
  }

  function playEmergencySiren() {
    const customAudio = getOrCreateAudio("siren");
    if (customAudio) {
      try {
        customAudio.currentTime = 0;
        customAudio.play();
      } catch (_) {}
      return;
    }

    // Fallback to synthesized siren
    const ctx = getAudioContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sawtooth";
      const now = ctx.currentTime;
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.15);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.3);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch (_) {
      // Audio blocked by browser policy
    }
  }

  // ── Particle System ──
  const PARTICLE_COLORS = ["#facc15", "#fde047", "#eab308", "#ca8a04", "#fef08a"];

  class Particle {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.size = Math.random() * 8 + 4;

      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 8 + 2;
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed - 2;
      this.gravity = 0.25;

      this.color = PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)];
      this.alpha = 1;
      this.decay = Math.random() * 0.02 + 0.015;
      this.rotation = Math.random() * 360;
      this.rotationSpeed = (Math.random() - 0.5) * 10;
    }

    update() {
      this.vx *= 0.98;
      this.vy += this.gravity;
      this.x += this.vx;
      this.y += this.vy;
      this.alpha -= this.decay;
      this.rotation += this.rotationSpeed;
    }

    draw(ctx) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, this.alpha);
      ctx.translate(this.x, this.y);
      ctx.rotate((this.rotation * Math.PI) / 180);
      ctx.fillStyle = this.color;
      ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
      ctx.restore();
    }

    get isDead() {
      return this.alpha <= 0;
    }
  }

  function initParticles() {
    const canvas = document.getElementById("particleCanvas");
    const ctx = canvas.getContext("2d");
    let particles = [];

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    window.addEventListener("resize", resize);
    resize();

    function spawnBurst(x, y) {
      for (let i = 0; i < 35; i++) {
        particles.push(new Particle(x, y));
      }
    }

    function loop() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        particles[i].draw(ctx);
        if (particles[i].isDead) {
          particles.splice(i, 1);
        }
      }
      requestAnimationFrame(loop);
    }

    loop();

    return { spawnBurst };
  }

  // ── Data ──
  const QUOTES = [
    "Why do today what can be put off indefinitely?",
    "Hard work pays off in the future. Laziness pays off right now.",
    "Your pull request can wait. Your mental void cannot.",
    "Every 10 minutes of work deserves 20 minutes of staring into space.",
    "Rome wasn't built in a day, and whoever built it definitely took a nap.",
    "Procrastination is just caching your effort for later.",
    "I am not lazy. I am on energy-saving mode.",
    "The only exercise I do is running out of patience.",
    "I'm not arguing, I'm just explaining why I'm right... later.",
    "My bed is a magical place where I suddenly remember everything I forgot to do.",
  ];

  const POP_LABELS = ["POP!", "NOPE", "LATER", "NAP", "SOON", "REST", "SLACK", "CHILL"];

  const TIMER_STATUSES = [
    "Status: Efficiently doing nothing...",
    "Status: Unsubscribing from corporate stress...",
    "Status: Pretending to read emails...",
    "Status: Contemplating the meaning of 'urgent'...",
    "Status: Almost back to work (not really)...",
    "Status: Maximizing synergy... with the couch...",
    "Status: Downloading motivation... 2% complete...",
  ];

  const HERO_EMOJIS = ["\uD83D\uDECB\uFE0F", "\u2615", "\uD83D\uDE34", "\uD83C\uDF55", "\uD83C\uDF34", "\uD83D\uDC26"];

  // ── Boss Panic Mode ──
  const fakeExcel = document.getElementById("fakeExcel");

  function togglePanicMode(show) {
    if (show) {
      playEmergencySiren();

      // Screen shake
      document.body.classList.remove("shaking");
      void document.body.offsetWidth; // Force reflow to restart animation
      document.body.classList.add("shaking");

      fakeExcel.style.display = "block";
    } else {
      fakeExcel.style.display = "none";
      document.body.classList.remove("shaking");
    }
  }

  function isPanicActive() {
    return fakeExcel.style.display === "block";
  }

  // ── Mini Game: Catch the Snacks ──
  function initSnackGame() {
    const canvas = document.getElementById("gameCanvas");
    const ctx = canvas.getContext("2d");
    const overlay = document.getElementById("gameOverlay");
    const startBtn = document.getElementById("gameStartBtn");
    const scoreEl = document.getElementById("gameScore");

    // Logical resolution (CSS scales it)
    const W = 480;
    const H = 300;
    canvas.width = W;
    canvas.height = H;

    // Game items: good snacks vs bad work items
    const SNACKS = [
      { emoji: "\uD83C\uDF55", label: "Pizza", points: 10 },
      { emoji: "\uD83C\uDF69", label: "Donut", points: 15 },
      { emoji: "\u2615", label: "Coffee", points: 10 },
      { emoji: "\uD83C\uDF2E", label: "Taco", points: 12 },
      { emoji: "\uD83C\uDF70", label: "Cake", points: 20 },
      { emoji: "\uD83E\uDD5F", label: "Cookie", points: 8 },
    ];

    const WORK_ITEMS = [
      { emoji: "\uD83D\uDCBB", label: "Laptop" },
      { emoji: "\uD83D\uDCF1", label: "Phone" },
      { emoji: "\uD83D\uDCE7", label: "Email" },
      { emoji: "\uD83D\uDCCA", label: "Spreadsheet" },
    ];

    const PLATE_SIZE = 48;
    const FALL_SPEED_BASE = 1.5;
    const SPAWN_INTERVAL_BASE = 900; // ms

    let state = {
      running: false,
      score: 0,
      lives: 3,
      playerX: W / 2,
      falling: [],
      spawnTimer: 0,
      spawnInterval: SPAWN_INTERVAL_BASE,
      difficulty: 0,
      lastTime: 0,
      rafId: null,
      mouseX: W / 2,
      useMouseControl: false,
    };

    // ── Sound effects ──
    function playCatchSound() {
      const custom = getOrCreateAudio("game_catch");
      if (custom) {
        try { custom.currentTime = 0; custom.play(); } catch (_) {}
        return;
      }
      const actx = getAudioContext();
      if (!actx) return;
      try {
        const o = actx.createOscillator();
        const g = actx.createGain();
        o.type = "sine";
        o.frequency.setValueAtTime(520, actx.currentTime);
        o.frequency.exponentialRampToValueAtTime(780, actx.currentTime + 0.06);
        g.gain.setValueAtTime(0.15, actx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.01, actx.currentTime + 0.1);
        o.connect(g);
        g.connect(actx.destination);
        o.start();
        o.stop(actx.currentTime + 0.1);
      } catch (_) {}
    }

    function playHitSound() {
      const custom = getOrCreateAudio("game_hit");
      if (custom) {
        try { custom.currentTime = 0; custom.play(); } catch (_) {}
        return;
      }
      const actx = getAudioContext();
      if (!actx) return;
      try {
        const o = actx.createOscillator();
        const g = actx.createGain();
        o.type = "square";
        o.frequency.setValueAtTime(200, actx.currentTime);
        o.frequency.exponentialRampToValueAtTime(80, actx.currentTime + 0.15);
        g.gain.setValueAtTime(0.12, actx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.01, actx.currentTime + 0.15);
        o.connect(g);
        g.connect(actx.destination);
        o.start();
        o.stop(actx.currentTime + 0.15);
      } catch (_) {}
    }
    
    function playGameOverSound(score) {
      // Use different sound based on score (<300 vs >=300)
      const soundName = score >= 300 ? "game_over_high" : "game_over_low";
      const custom = getOrCreateAudio(soundName);
      if (custom) {
        try { custom.currentTime = 0; custom.play(); } catch (_) {}
        return;
      }
      const actx = getAudioContext();
      if (!actx) return;
      try {
        const o = actx.createOscillator();
        const g = actx.createGain();
        o.type = "triangle";
        const startFreq = score >= 300 ? 600 : 300;
        o.frequency.setValueAtTime(startFreq, actx.currentTime);
        o.frequency.exponentialRampToValueAtTime(150, actx.currentTime + 0.3);
        g.gain.setValueAtTime(0.15, actx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.01, actx.currentTime + 0.4);
        o.connect(g);
        g.connect(actx.destination);
        o.start();
        o.stop(actx.currentTime + 0.4);
      } catch (_) {}
    }

    function playGameMissSound() {
      const custom = getOrCreateAudio("game_miss");
      if (custom) {
        try { custom.currentTime = 0; custom.play(); } catch (_) {}
        return;
      }
      const actx = getAudioContext();
      if (!actx) return;
      try {
        const o = actx.createOscillator();
        const g = actx.createGain();
        o.type = "sawtooth";
        o.frequency.setValueAtTime(300, actx.currentTime);
        o.frequency.exponentialRampToValueAtTime(100, actx.currentTime + 0.2);
        g.gain.setValueAtTime(0.1, actx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.01, actx.currentTime + 0.25);
        o.connect(g);
        g.connect(actx.destination);
        o.start();
        o.stop(actx.currentTime + 0.25);
      } catch (_) {}
    }

    // ── Spawn items ──
    function spawnItem() {
      const isWork = Math.random() < 0.25 + state.difficulty * 0.03;
      if (isWork) {
        const item = WORK_ITEMS[Math.floor(Math.random() * WORK_ITEMS.length)];
        state.falling.push({
          x: Math.random() * (W - 30) + 15,
          y: -30,
          speed: FALL_SPEED_BASE + Math.random() * 0.8 + state.difficulty * 0.15,
          emoji: item.emoji,
          label: item.label,
          isWork: true,
          size: 28,
          wobble: Math.random() * Math.PI * 2,
          wobbleSpeed: 0.02 + Math.random() * 0.02,
        });
      } else {
        const snack = SNACKS[Math.floor(Math.random() * SNACKS.length)];
        state.falling.push({
          x: Math.random() * (W - 30) + 15,
          y: -30,
          speed: FALL_SPEED_BASE + Math.random() * 0.6 + state.difficulty * 0.12,
          emoji: snack.emoji,
          label: snack.label,
          isWork: false,
          points: snack.points,
          size: 28,
          wobble: Math.random() * Math.PI * 2,
          wobbleSpeed: 0.02 + Math.random() * 0.02,
        });
      }
    }

    // ── Reset ──
    function resetGame() {
      state.score = 0;
      state.lives = 3;
      state.falling = [];
      state.spawnTimer = 0;
      state.spawnInterval = SPAWN_INTERVAL_BASE;
      state.difficulty = 0;
      state.playerX = W / 2;
      scoreEl.textContent = "0";
    }

    // ── Game loop ──
    function gameLoop(timestamp) {
      if (!state.running) return;

      if (!state.lastTime) state.lastTime = timestamp;
      const dt = Math.min(timestamp - state.lastTime, 32); // Cap at ~30fps delta
      state.lastTime = timestamp;

      // Difficulty ramp
      state.difficulty = Math.min(state.score / 100, 10);
      state.spawnInterval = Math.max(400, SPAWN_INTERVAL_BASE - state.difficulty * 45);

      // Spawn
      state.spawnTimer += dt;
      if (state.spawnTimer >= state.spawnInterval) {
        spawnItem();
        state.spawnTimer = 0;
      }

      // Move player (keyboard or mouse)
      if (!state.useMouseControl) {
        // Keyboard movement handled via keydown events
      } else {
        state.playerX += (state.mouseX - state.playerX) * 0.18;
      }
      state.playerX = Math.max(PLATE_SIZE / 2, Math.min(W - PLATE_SIZE / 2, state.playerX));

      // Update falling items
      for (let i = state.falling.length - 1; i >= 0; i--) {
        const f = state.falling[i];
        f.y += f.speed;
        f.wobble += f.wobbleSpeed;
        f.x += Math.sin(f.wobble) * 0.4;

        // Collision with player plate
        const dx = f.x - state.playerX;
        const dy = f.y - (H - 30);
        if (Math.abs(dx) < PLATE_SIZE / 2 + f.size / 2 && Math.abs(dy) < 18) {
          if (f.isWork) {
            state.lives--;
            playHitSound();
            if (state.lives <= 0) {
              endGame();
              return;
            }
          } else {
            state.score += f.points;
            scoreEl.textContent = state.score;
            playCatchSound();
          }
          state.falling.splice(i, 1);
          continue;
        }

        // Off screen
        if (f.y > H + 20) {
          if (!f.isWork) {
            state.lives--;
            playGameMissSound();
            if (state.lives <= 0) {
              endGame();
              return;
            }
          }
          state.falling.splice(i, 1);
        }
      }

      // Draw
      draw();

      state.rafId = requestAnimationFrame(gameLoop);
    }

    function draw() {
      // Background
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, W, H);

      // Subtle grid lines
      ctx.strokeStyle = "rgba(250, 204, 21, 0.15)";
      ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }
      for (let y = 0; y < H; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }

      // Lives
      for (let i = 0; i < state.lives; i++) {
        ctx.font = "18px sans-serif";
        ctx.fillText("\u2764\uFE0F", 10 + i * 24, 24);
      }

      // Falling items
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (const f of state.falling) {
        ctx.font = f.size + "px sans-serif";
        ctx.fillText(f.emoji, f.x, f.y);
      }

      // Player plate
      ctx.font = PLATE_SIZE + "px sans-serif";
      ctx.fillText("\uD83C\uDF7D\uFE0F", state.playerX, H - 30);

      // Ground line
      ctx.strokeStyle = "rgba(250, 204, 21, 0.35)";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(0, H - 10);
      ctx.lineTo(W, H - 10);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    function endGame() {
      state.running = false;
      if (state.rafId) cancelAnimationFrame(state.rafId);
      setTimeout(() => playGameOverSound(state.score), 1000);

      // Show game over
      overlay.classList.remove("hidden");
      overlay.innerHTML =
        '<div class="game-overlay-title">Game Over</div>' +
        '<div class="game-overlay-sub">You scored <strong>' + state.score +
        '</strong> points! ' +
        (state.score >= 100 ? "Legendary slacker!" : state.score >= 50 ? "Solid procrastinator!" : "Keep avoiding work!") +
        "</div>" +
        '<button class="game-start-btn" id="gameStartBtn">Play Again</button>';

      document.getElementById("gameStartBtn").addEventListener("click", () => {
        overlay.classList.add("hidden");
        resetGame();
        startGame();
      });
    }

    function startGame() {
      state.running = true;
      state.lastTime = 0;
      state.rafId = requestAnimationFrame(gameLoop);
    }

    // ── Controls ──
    const keysDown = new Set();

    document.addEventListener("keydown", (e) => {
      if (!state.running) return;
      state.useMouseControl = false;
      keysDown.add(e.code);
    });

    document.addEventListener("keyup", (e) => {
      keysDown.delete(e.code);
    });

    function handleKeyMovement() {
      if (!state.running) return;
      const speed = 6;
      if (keysDown.has("ArrowLeft") || keysDown.has("KeyA")) {
        state.playerX -= speed;
      }
      if (keysDown.has("ArrowRight") || keysDown.has("KeyD")) {
        state.playerX += speed;
      }
      requestAnimationFrame(handleKeyMovement);
    }
    handleKeyMovement();

    // Mouse / touch control
    canvas.addEventListener("mousemove", (e) => {
      if (!state.running) return;
      state.useMouseControl = true;
      const rect = canvas.getBoundingClientRect();
      state.mouseX = ((e.clientX - rect.left) / rect.width) * W;
    });

    canvas.addEventListener("touchmove", (e) => {
      if (!state.running) return;
      e.preventDefault();
      state.useMouseControl = true;
      const rect = canvas.getBoundingClientRect();
      state.mouseX = ((e.touches[0].clientX - rect.left) / rect.width) * W;
    }, { passive: false });

    // Start button
    startBtn.addEventListener("click", () => {
      overlay.classList.add("hidden");
      resetGame();
      startGame();
    });
  }

  // ── Initialize on DOM Ready ──
  document.addEventListener("DOMContentLoaded", () => {
    // Auto-load sound files from folder before anything else
    autoLoadSounds().then(() => {
      initBreakRoom();
    });
  });

  function initBreakRoom() {
    const particles = initParticles();

    // ── Hero Emoji ──
    const heroEmoji = document.getElementById("heroEmoji");

    function triggerHeroEmoji() {
      heroEmoji.textContent = HERO_EMOJIS[Math.floor(Math.random() * HERO_EMOJIS.length)];

      heroEmoji.classList.remove("bouncing");
      void heroEmoji.offsetWidth;
      heroEmoji.classList.add("bouncing");

      const rect = heroEmoji.getBoundingClientRect();
      particles.spawnBurst(rect.left + rect.width / 2, rect.top + rect.height / 2);
    }

    heroEmoji.addEventListener("click", triggerHeroEmoji);
    heroEmoji.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        triggerHeroEmoji();
      }
    });

    // ── Quote Selector ──
    const quoteText = document.getElementById("quoteText");

    function showRandomQuote() {
      quoteText.textContent = "\u201C" + QUOTES[Math.floor(Math.random() * QUOTES.length)] + "\u201D";
    }

    showRandomQuote();
    quoteText.addEventListener("click", showRandomQuote);
    quoteText.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        showRandomQuote();
      }
    });

    // ── Timer (synced with background/popup) ──
    const timerDisplay = document.getElementById("timer");
    const timerStatus = document.getElementById("timerStatus");
    let lastShownMode = null;

    function applyWorkMode(state) {
      if (!state) return;
      const isWork = state.mode === "work";
      document.body.classList.toggle("work-mode", isWork);
    }

    function updateTimerDisplay(state) {
      if (!state) return;
      const mins = Math.floor(state.timeLeft / 60);
      const secs = state.timeLeft % 60;
      timerDisplay.textContent =
        String(mins).padStart(2, "0") + ":" + String(secs).padStart(2, "0");

      if (state.mode !== lastShownMode) {
        lastShownMode = state.mode;
        timerStatus.textContent =
          state.mode === "break"
            ? "Status: Efficiently doing nothing..."
            : "Status: Dreaded work session... hide the snacks!";
      }
    }

    function getTimerState() {
      return new Promise(function (resolve) {
        if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
          chrome.storage.local.get(["timerState"], function (data) {
            resolve(data.timerState || null);
          });
        } else {
          resolve(null);
        }
      });
    }

    function broadcastStatus(state) {
      // Rotate break status messages every 4 minutes across sessions
      if (state && state.mode === "break" && state.timeLeft > 0 && state.timeLeft % 240 === 0) {
        timerStatus.textContent =
          TIMER_STATUSES[Math.floor(Math.random() * TIMER_STATUSES.length)];
      }
      if (state && state.timeLeft <= 0) {
        timerStatus.textContent = "Break time expired. Time to pretend to work again!";
        lastShownMode = "over";
      }
    }

    // Poll the shared state from chrome.storage every second so breakroom
    // stays in sync with the background service worker (and thus the popup).
    setInterval(async () => {
      const state = await getTimerState();
      if (state) {
        updateTimerDisplay(state);
        broadcastStatus(state);
        applyWorkMode(state);

        if (state.isRunning === false && lastShownMode !== "paused") {
          lastShownMode = "paused";
          timerStatus.textContent =
            state.mode === "break"
              ? "Status: Timer paused. Go back when ready."
              : "Status: Timer paused. Work can wait.";
        }
      }
    }, 1000);


    // ── Bubble Wrap ──
    const grid = document.getElementById("bubbleGrid");

    function createBubbles() {
      grid.innerHTML = "";
      for (let i = 0; i < 24; i++) {
        const bubble = document.createElement("div");
        bubble.className = "bubble";
        bubble.setAttribute("role", "gridcell");
        bubble.setAttribute("tabindex", "0");
        bubble.setAttribute("aria-label", "Unpopped bubble");

        function pop() {
          if (bubble.classList.contains("popped")) return;
          bubble.classList.add("popped");
          bubble.textContent = POP_LABELS[Math.floor(Math.random() * POP_LABELS.length)];
          bubble.setAttribute("aria-label", "Popped bubble: " + bubble.textContent);
          playPopSound();

          // Check if all popped
          if (!grid.querySelector(".bubble:not(.popped)")) {
            setTimeout(createBubbles, 600);
          }
        }

        bubble.addEventListener("click", pop);
        bubble.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            pop();
          }
        });

        grid.appendChild(bubble);
      }
    }

    createBubbles();

    // ── Boss Panic Button ──
    const panicBtn = document.getElementById("panicBtn");
    panicBtn.addEventListener("click", () => togglePanicMode(true));

    document.addEventListener("keydown", (e) => {
      if (e.code === "Space" && !isPanicActive()) {
        e.preventDefault();
        togglePanicMode(true);
      } else if (e.code === "Escape") {
        togglePanicMode(false);
      }
    });

    // ── Sound Settings UI ──
    function updateSoundUI() {
      const hasPop = !!getCustomSoundDataURL("pop");
      const hasSiren = !!getCustomSoundDataURL("siren");

      const popStatus = document.getElementById("popSoundStatus");
      const popReset = document.getElementById("popSoundReset");
      const sirenStatus = document.getElementById("sirenSoundStatus");
      const sirenReset = document.getElementById("sirenSoundReset");

      if (popStatus) {
        popStatus.textContent = hasPop ? "Custom" : "Default";
        popStatus.classList.toggle("active", hasPop);
      }
      if (popReset) {
        popReset.classList.toggle("hidden", !hasPop);
      }
      if (sirenStatus) {
        sirenStatus.textContent = hasSiren ? "Custom" : "Default";
        sirenStatus.classList.toggle("active", hasSiren);
      }
      if (sirenReset) {
        sirenReset.classList.toggle("hidden", !hasSiren);
      }
    }

    function handleSoundUpload(inputEl, soundName, statusEl) {
      inputEl.addEventListener("change", function () {
        const file = this.files[0];
        if (!file) return;

        // Limit to 1 MB
        if (file.size > 1048576) {
          alert("File too large. Maximum size is 1 MB.");
          this.value = "";
          return;
        }

        const reader = new FileReader();
        reader.onload = function (e) {
          setCustomSoundDataURL(soundName, e.target.result);
          delete customAudioElements[soundName]; // Force reload
          updateSoundUI();
        };
        reader.readAsDataURL(file);
        this.value = "";
      });
    }

    const popSoundInput = document.getElementById("popSoundInput");
    const sirenSoundInput = document.getElementById("sirenSoundInput");

    if (popSoundInput) handleSoundUpload(popSoundInput, "pop", "popSoundStatus");
    if (sirenSoundInput) handleSoundUpload(sirenSoundInput, "siren", "sirenSoundStatus");

    // Upload buttons trigger hidden file inputs
    const popUpload = document.getElementById("popSoundUpload");
    const sirenUpload = document.getElementById("sirenSoundUpload");
    if (popUpload) popUpload.addEventListener("click", () => popSoundInput.click());
    if (sirenUpload) sirenUpload.addEventListener("click", () => sirenSoundInput.click());

    // Reset buttons
    const popReset = document.getElementById("popSoundReset");
    const sirenReset = document.getElementById("sirenSoundReset");
    if (popReset) {
      popReset.addEventListener("click", () => {
        removeCustomSound("pop");
        updateSoundUI();
      });
    }
    if (sirenReset) {
      sirenReset.addEventListener("click", () => {
        removeCustomSound("siren");
        updateSoundUI();
      });
    }

    updateSoundUI();

    // ── Mini Game: Catch the Snacks ──
    initSnackGame();
  }
})();
