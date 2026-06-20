/*
  Boundary Run: The Little Signal
  Copyright (c) 2026 Denis Yermakou / AxonOS
  SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-AxonOS-Commercial

  Static browser MVP. No telemetry, no backend, no real neural data.
*/
(() => {
  "use strict";

  const VERSION = "8.8.3";
  const TICK_MS = 1000 / 60;
  const LANES = [-1, 0, 1];
  const ACTIONS = ["audit", "revoke", "throttle", "seal", "quarantine"];
  const MAX_INPUT_LOG = 512;

  const COLORS = {
    gold: "#ffd978",
    gold2: "#ffb847",
    blue: "#83d7ff",
    cyan: "#6af6ff",
    red: "#ff4669",
    purple: "#b667ff",
    green: "#7cffb2",
    bg: "#05070c",
    text: "#f5f1df",
  };

  const THREATS = {
    rawLeak: {
      label: "Raw Signal Leak",
      lesson: "Raw neural data can contain more than intended. Keep it sealed.",
      correct: ["seal"],
      color: COLORS.red,
      symbol: "leak",
      metric: "privacy",
    },
    staleConsent: {
      label: "Stale Consent",
      lesson: "Consent must be current and revocable.",
      correct: ["audit", "revoke"],
      color: "#bfc7d4",
      symbol: "consent",
      metric: "consent",
    },
    unauthorizedApp: {
      label: "Unauthorized App",
      lesson: "Access without capability is not permission.",
      correct: ["quarantine", "audit"],
      color: COLORS.purple,
      symbol: "app",
      metric: "privacy",
    },
    artifactSpike: {
      label: "Artifact Spike",
      lesson: "Not every signal is intent. Stabilize before trusting it.",
      correct: ["throttle"],
      color: "#ffffff",
      symbol: "spike",
      metric: "latency",
      avoidByJump: true,
    },
    unsafeStim: {
      label: "Unsafe Stimulation",
      lesson: "Safety overrides speed.",
      correct: ["throttle", "revoke"],
      avoidByDuck: true,
      color: COLORS.red,
      symbol: "beam",
      metric: "boundary",
    },
    memoryPhisher: {
      label: "Memory Phisher",
      lesson: "Attractive data requests can still be unsafe. Audit before trusting.",
      correct: ["audit"],
      color: "#ff9df2",
      symbol: "phisher",
      metric: "privacy",
    },
  };

  const COLLECTIBLES = {
    proof: { label: "Proof Shard", color: COLORS.gold },
    consent: { label: "Consent Token", color: COLORS.blue },
    vault: { label: "Vault Key", color: COLORS.green },
  };

  const SCENARIOS = [
    {
      id: "first_spark",
      title: "First Spark",
      mission: "Help Ari survive the first raw leak. Use Seal Vault when Kibo barks.",
      concept: "Raw signal must stay inside the boundary.",
      seed: 0xA810_0001,
      duration: 2400,
      spawns: [
        { tick: 80, kind: "collect", type: "proof", lane: 0 },
        { tick: 160, kind: "threat", type: "rawLeak", lane: 0, scripted: true },
        { tick: 330, kind: "collect", type: "vault", lane: 1 },
        { tick: 470, kind: "threat", type: "artifactSpike", lane: -1 },
        { tick: 620, kind: "collect", type: "proof", lane: 0 },
        { tick: 820, kind: "threat", type: "rawLeak", lane: 1 },
        { tick: 1050, kind: "collect", type: "proof", lane: -1 },
        { tick: 1280, kind: "threat", type: "artifactSpike", lane: 0 },
      ],
    },
    {
      id: "consent_gate",
      title: "Consent Gate",
      mission: "Audit unknown gates and revoke stale consent before Ari crosses them.",
      concept: "Consent must be current, specific, and revocable.",
      seed: 0xA810_0002,
      duration: 2850,
      spawns: [
        { tick: 120, kind: "collect", type: "consent", lane: 0 },
        { tick: 220, kind: "threat", type: "staleConsent", lane: 1 },
        { tick: 420, kind: "collect", type: "proof", lane: -1 },
        { tick: 610, kind: "threat", type: "memoryPhisher", lane: 0 },
        { tick: 820, kind: "threat", type: "staleConsent", lane: -1 },
        { tick: 1040, kind: "collect", type: "proof", lane: 1 },
        { tick: 1240, kind: "threat", type: "unauthorizedApp", lane: 0 },
        { tick: 1480, kind: "collect", type: "vault", lane: 0 },
        { tick: 1700, kind: "threat", type: "rawLeak", lane: 1 },
      ],
    },
    {
      id: "storm_runner",
      title: "Storm Runner",
      mission: "The corridor is unstable. Use Throttle to protect Ari before speed becomes risk.",
      concept: "Real-time pressure must stay bounded.",
      seed: 0xA810_0003,
      duration: 3300,
      spawns: [
        { tick: 110, kind: "collect", type: "proof", lane: 0 },
        { tick: 260, kind: "threat", type: "artifactSpike", lane: -1 },
        { tick: 420, kind: "threat", type: "unsafeStim", lane: 0 },
        { tick: 620, kind: "collect", type: "vault", lane: 1 },
        { tick: 760, kind: "threat", type: "rawLeak", lane: 1 },
        { tick: 930, kind: "threat", type: "artifactSpike", lane: 0 },
        { tick: 1140, kind: "threat", type: "unauthorizedApp", lane: -1 },
        { tick: 1380, kind: "collect", type: "proof", lane: 1 },
        { tick: 1600, kind: "threat", type: "unsafeStim", lane: 1 },
        { tick: 1850, kind: "threat", type: "memoryPhisher", lane: 0 },
      ],
    },
  ];

  class SoundBus {
    constructor() { this.enabled = false; this.ctx = null; }
    setEnabled(v) {
      this.enabled = v;
      const AudioCtor = window.AudioContext || window.webkitAudioContext;
      if (v && !this.ctx && AudioCtor) this.ctx = new AudioCtor();
      if (v && this.ctx && this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
    }
    beep(type) {
      if (!this.enabled || !this.ctx) return;
      const now = this.ctx.currentTime;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      const map = {
        proof: [880, 0.05, "sine"], seal: [440, 0.12, "triangle"], hit: [120, 0.16, "sawtooth"],
        bark: [620, 0.07, "square"], audit: [720, 0.08, "sine"], revoke: [240, 0.10, "triangle"],
        throttle: [180, 0.14, "sine"], win: [660, 0.20, "triangle"], fail: [150, 0.22, "sine"],
      };
      const [freq, dur, wave] = map[type] || [520, 0.08, "sine"];
      o.type = wave; o.frequency.setValueAtTime(freq, now);
      g.gain.setValueAtTime(0.001, now);
      g.gain.exponentialRampToValueAtTime(0.08, now + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, now + dur);
      o.connect(g); g.connect(this.ctx.destination); o.start(now); o.stop(now + dur + 0.02);
    }
  }

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function hex32(v) { return (v >>> 0).toString(16).padStart(8, "0"); }
  function niceHash(hi, lo) { return `${hex32(hi).slice(0,4)}-${hex32(hi).slice(4)}-${hex32(lo).slice(0,4)}-${hex32(lo).slice(4)}`.toUpperCase(); }

  class DeterministicHash {
    constructor(seed) { this.hi = 0x811c9dc5 ^ seed; this.lo = 0x9e3779b9 ^ (seed >>> 7); }
    feed(v) {
      v = v >>> 0;
      this.hi ^= v;
      this.hi = Math.imul(this.hi, 16777619) >>> 0;
      this.lo ^= (v + 0x9e3779b9 + (this.hi << 6) + (this.hi >>> 2)) >>> 0;
      this.lo = Math.imul(this.lo, 2246822519) >>> 0;
    }
    snapshot() { return [this.hi >>> 0, this.lo >>> 0]; }
  }

  class GameEngine {
    constructor() {
      this.sound = new SoundBus();
      this.motionReduced = false;
      this.canvas = document.getElementById("game-canvas");
      this.ctx = this.canvas.getContext("2d");
      this.running = false;
      this.paused = false;
      this.scenarioIndex = 0;
      this.lastTime = 0;
      this.rafId = 0;
      this.loopToken = 0;
      this.acc = 0;
      this.objects = [];
      this.inputLog = [];
      this.spawnCursor = 0;
      this.lastLessonTick = -999;
      this.touch = { active: false, x: 0, y: 0 };
      this.resetScenario(0);
      this.resize();
      window.addEventListener("resize", () => this.resize());
      this.bindInput();
    }

    resetScenario(index) {
      this.scenarioIndex = index % SCENARIOS.length;
      this.scenario = SCENARIOS[this.scenarioIndex];
      this.tick = 0;
      this.lane = 0;
      this.targetLane = 0;
      this.jumpTicks = 0;
      this.duckTicks = 0;
      this.actionCooldown = 0;
      this.throttleTicks = 0;
      this.sealTicks = 0;
      this.lastSealTick = -999;
      this.quarantinePulse = 0;
      this.auditedThreatIds = new Set();
      this.objects = [];
      this.spawnCursor = 0;
      this.inputLog = [];
      this.hash = new DeterministicHash(this.scenario.seed);
      this.hash.feed(0xB0830000 ^ this.scenarioIndex);
      this.metrics = {
        boundary: 100,
        leakage: 0,
        consent: 100,
        latency: 0,
        trust: 72,
        shards: 0,
        keys: 1,
        consentTokens: 0,
        score: 0,
      };
      this.emotion = "hopeful";
      this.finished = false;
      this.win = false;
      this.grade = "—";
      this.coachMode = "intro";
      this.eventMessage = "Ari carries not a thought, but a choice.";
      this.lesson = "Protect the boundary.";
      this.firstThreatSeen = false;
      this.updateDOM();
    }

    start() {
      if (this.rafId) cancelAnimationFrame(this.rafId);
      this.running = true;
      this.paused = false;
      this.acc = 0;
      this.loopToken += 1;
      this.lastTime = performance.now();
      this.resize();
      this.rafId = requestAnimationFrame((t) => this.loop(t, this.loopToken));
    }

    resize() {
      const rect = this.canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cssW = Math.max(320, Math.floor(rect.width || this.canvas.clientWidth || 960));
      const cssH = Math.max(420, Math.floor(rect.height || this.canvas.clientHeight || 620));
      this.canvas.width = Math.floor(cssW * dpr);
      this.canvas.height = Math.floor(cssH * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.w = cssW;
      this.h = cssH;
    }

    bindInput() {
      document.querySelectorAll(".action").forEach((btn) => {
        btn.addEventListener("click", () => this.useAction(btn.dataset.action));
      });
      document.getElementById("btn-pause").addEventListener("click", () => this.togglePause());
      document.getElementById("btn-restart").addEventListener("click", () => this.restart());
      document.getElementById("btn-next-level").addEventListener("click", () => this.nextLevel());
      document.getElementById("btn-play-again").addEventListener("click", () => { this.hideReport(); this.restart(); });
      document.getElementById("btn-report-next").addEventListener("click", () => { this.hideReport(); this.nextLevel(); });
      document.getElementById("btn-copy-proof").addEventListener("click", () => this.copyProof());
      document.getElementById("btn-audio").addEventListener("click", (ev) => {
        const enabled = !this.sound.enabled;
        this.sound.setEnabled(enabled);
        ev.currentTarget.textContent = enabled ? "Audio On" : "Audio Off";
        ev.currentTarget.setAttribute("aria-pressed", String(enabled));
        this.sound.beep("proof");
      });
      document.getElementById("btn-motion").addEventListener("click", (ev) => {
        this.motionReduced = !this.motionReduced;
        document.body.classList.toggle("reduced-motion", this.motionReduced);
        ev.currentTarget.textContent = this.motionReduced ? "Motion Reduced" : "Motion Full";
        ev.currentTarget.setAttribute("aria-pressed", String(this.motionReduced));
      });
      window.addEventListener("keydown", (ev) => this.onKey(ev));
      this.canvas.addEventListener("touchstart", (ev) => this.onTouchStart(ev), { passive: false });
      this.canvas.addEventListener("touchmove", (ev) => { if (this.running) ev.preventDefault(); }, { passive: false });
      this.canvas.addEventListener("touchend", (ev) => this.onTouchEnd(ev), { passive: false });
    }

    onKey(ev) {
      if (!this.running || this.finished) return;
      const k = ev.key.toLowerCase();
      if (k === "arrowleft" || k === "a") { ev.preventDefault(); this.moveLane(-1); }
      else if (k === "arrowright" || k === "d") { ev.preventDefault(); this.moveLane(1); }
      else if (k === "arrowup" || k === "w") { ev.preventDefault(); this.jump(); }
      else if (k === "arrowdown" || k === "s") { ev.preventDefault(); this.duck(); }
      else if (k === " ") { ev.preventDefault(); this.useAction(this.recommendedAction()); }
      else if (k === "escape") { ev.preventDefault(); this.togglePause(); }
      else if (k >= "1" && k <= "5") { ev.preventDefault(); this.useAction(ACTIONS[Number(k) - 1]); }
    }

    onTouchStart(ev) {
      ev.preventDefault();
      const t = ev.changedTouches[0];
      this.touch = { active: true, x: t.clientX, y: t.clientY };
    }
    onTouchEnd(ev) {
      if (!this.touch.active || !this.running || this.finished) return;
      ev.preventDefault();
      const t = ev.changedTouches[0];
      const dx = t.clientX - this.touch.x;
      const dy = t.clientY - this.touch.y;
      this.touch.active = false;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 24) this.moveLane(dx > 0 ? 1 : -1);
      else if (dy < -24) this.jump();
      else if (dy > 24) this.duck();
    }

    restart() { this.hideReport(); this.resetScenario(this.scenarioIndex); this.start(); }
    nextLevel() { this.hideReport(); this.resetScenario((this.scenarioIndex + 1) % SCENARIOS.length); this.start(); }
    togglePause() { this.paused = !this.paused; document.getElementById("btn-pause").textContent = this.paused ? "Resume" : "Pause"; }
    hideReport() { document.getElementById("report").hidden = true; }

    moveLane(dir) {
      this.targetLane = clamp(this.targetLane + dir, -1, 1);
      this.logInput("lane", this.targetLane);
    }
    jump() { this.jumpTicks = 34; this.duckTicks = 0; this.logInput("jump", 1); }
    duck() { this.duckTicks = 30; this.jumpTicks = 0; this.logInput("duck", 1); }

    logInput(type, value) {
      const code = type.split("").reduce((a, ch) => (a + ch.charCodeAt(0)) >>> 0, 0);
      this.inputLog.push({ t: this.tick, type, value });
      if (this.inputLog.length > MAX_INPUT_LOG) this.inputLog.shift();
      this.hash.feed(this.tick); this.hash.feed(code); this.hash.feed((value + 4096) >>> 0);
      document.getElementById("ui-inputs").textContent = String(this.inputLog.length);
    }

    nearestThreat(action = "") {
      let best = null;
      let bestZ = Infinity;
      const currentLane = Math.round(this.lane);
      for (const o of this.objects) {
        if (o.kind !== "threat" || o.resolved) continue;
        const sameLane = o.lane === currentLane;
        const sealCanPreProtect = action === "seal" && (o.type === "rawLeak" || o.type === "memoryPhisher") && o.z < 0.92;
        const auditCanInspect = action === "audit" && o.z < 0.78;
        if ((sameLane || sealCanPreProtect || auditCanInspect) && o.z < 0.78 && o.z > -0.12 && o.z < bestZ) {
          best = o; bestZ = o.z;
        }
      }
      return best;
    }


    recommendedAction() {
      const threat = this.nearestThreat("seal") || this.nearestThreat("audit") || this.nearestThreat();
      if (!threat) return "audit";
      if (threat.type === "rawLeak") return "seal";
      if (threat.type === "staleConsent") return threat.audited ? "revoke" : "audit";
      if (threat.type === "unauthorizedApp") return threat.audited ? "quarantine" : "audit";
      if (threat.type === "artifactSpike") return "throttle";
      if (threat.type === "unsafeStim") return "throttle";
      if (threat.type === "memoryPhisher") return threat.audited ? "quarantine" : "audit";
      return "audit";
    }

    useAction(action) {
      if (this.finished || this.paused) return;
      if (!ACTIONS.includes(action)) return;
      if (this.actionCooldown > 0 && action !== "seal") {
        this.setLesson("Action cooling down.", "Good protection needs timing.");
        return;
      }
      this.logInput("action", ACTIONS.indexOf(action) + 1);
      this.actionCooldown = 12;
      const threat = this.nearestThreat(action);
      const info = threat ? THREATS[threat.type] : null;
      let ok = false;

      if (action === "audit") {
        this.sound.beep("audit");
        if (threat) {
          this.auditedThreatIds.add(threat.id);
          threat.audited = true;
          ok = true;
          this.metrics.latency = clamp(this.metrics.latency + 4, 0, 100);
          this.metrics.trust = clamp(this.metrics.trust + 4, 0, 100);
          this.setLesson(`${info.label} identified.`, info.lesson);
        } else {
          this.metrics.latency = clamp(this.metrics.latency + 2, 0, 100);
          this.setLesson("Audit complete.", "No immediate threat found.");
        }
      } else if (action === "seal") {
        if (this.metrics.keys <= 0) {
          this.setLesson("No Vault Key available.", "Collect Vault Keys before using Seal Vault.");
          this.metrics.trust = clamp(this.metrics.trust - 2, 0, 100);
          return;
        }
        this.sound.beep("seal");
        this.metrics.keys -= 1;
        this.lastSealTick = this.tick;
        this.sealTicks = 420;
        if (threat && (threat.type === "rawLeak" || threat.type === "memoryPhisher")) {
          ok = true; this.resolveThreat(threat, "Seal Vault protected Ari.");
        } else {
          this.metrics.boundary = clamp(this.metrics.boundary + 4, 0, 100);
          this.setLesson("Vault sealed around Ari.", "Private data stays protected. The shield stays active long enough for early tutorial reactions.");
        }
      } else if (action === "revoke") {
        this.sound.beep("revoke");
        if (threat && (threat.type === "staleConsent" || threat.type === "unsafeStim")) {
          ok = true; this.resolveThreat(threat, "Access revoked.");
        } else {
          this.metrics.consent = clamp(this.metrics.consent + 2, 0, 100);
          this.metrics.latency = clamp(this.metrics.latency + 3, 0, 100);
          this.setLesson("Revocation prepared.", "Use it when consent is stale or unsafe.");
        }
      } else if (action === "throttle") {
        this.sound.beep("throttle");
        this.throttleTicks = 140;
        this.metrics.latency = clamp(this.metrics.latency - 18, 0, 100);
        if (threat && (threat.type === "artifactSpike" || threat.type === "unsafeStim")) {
          ok = true; this.resolveThreat(threat, "Flow throttled safely.");
        } else {
          this.setLesson("Flow throttled.", "Safety overrides speed.");
        }
      } else if (action === "quarantine") {
        this.sound.beep("audit");
        this.quarantinePulse = 40;
        if (threat && (threat.type === "unauthorizedApp" || threat.type === "memoryPhisher")) {
          ok = true; this.resolveThreat(threat, "Threat isolated.");
        } else {
          this.metrics.latency = clamp(this.metrics.latency + 5, 0, 100);
          this.setLesson("Quarantine armed.", "Use it for malicious or suspicious access.");
        }
      }

      if (ok) {
        this.metrics.trust = clamp(this.metrics.trust + 8, 0, 100);
        this.metrics.boundary = clamp(this.metrics.boundary + 4, 0, 100);
        this.metrics.score += 75;
      } else if (threat && info && !info.correct.includes(action)) {
        this.metrics.trust = clamp(this.metrics.trust - 5, 0, 100);
        this.metrics.latency = clamp(this.metrics.latency + 3, 0, 100);
        this.setLesson("Wrong protection for this threat.", info.lesson);
      }
      this.updateDOM();
    }

    resolveThreat(threat, message) {
      threat.resolved = true;
      threat.resolvePulse = 28;
      const info = THREATS[threat.type];
      this.metrics.score += threat.scripted ? 120 : 60;
      this.hash.feed(0xA1100000 ^ threat.id);
      this.setLesson(message, info.lesson);
    }

    setLesson(head, body) {
      this.eventMessage = head;
      this.lesson = body;
      this.lastLessonTick = this.tick;
      document.getElementById("lesson-box").innerHTML = `<strong>${escapeHTML(head)}</strong><span>${escapeHTML(body)}</span>`;
    }

    spawn(spec) {
      const id = (this.tick << 8) ^ (this.objects.length + 1) ^ this.scenario.seed;
      const speed = spec.kind === "threat" ? (0.0057 + this.scenarioIndex * 0.0008) : 0.0052;
      this.objects.push({
        id: id >>> 0,
        kind: spec.kind,
        type: spec.type,
        lane: spec.lane,
        z: 1.12,
        speed,
        scripted: !!spec.scripted,
        resolved: false,
        audited: false,
        age: 0,
      });
      this.hash.feed(id); this.hash.feed(spec.lane + 4);
      if (spec.kind === "threat") {
        const label = THREATS[spec.type].label;
        document.getElementById("threat-card").textContent = `Kibo warning: ${label} approaching.`;
        this.sound.beep("bark");
        if (spec.type === "rawLeak" && !this.firstThreatSeen) {
          this.firstThreatSeen = true;
          this.setLesson("Kibo barks. Raw Signal Leak ahead.", "Use Seal Vault. Raw signal must never leave the boundary.");
        }
      }
    }

    loop(time, token) {
      if (!this.running || token !== this.loopToken) return;
      const dt = Math.min(80, time - this.lastTime);
      this.lastTime = time;
      if (!this.paused && !this.finished) {
        this.acc += dt;
        while (this.acc >= TICK_MS) { this.step(); this.acc -= TICK_MS; }
      }
      this.draw(time / 1000);
      this.rafId = requestAnimationFrame((t) => this.loop(t, token));
    }

    step() {
      this.tick += 1;
      this.lane = lerp(this.lane, this.targetLane, 0.22);
      if (this.jumpTicks > 0) this.jumpTicks -= 1;
      if (this.duckTicks > 0) this.duckTicks -= 1;
      if (this.actionCooldown > 0) this.actionCooldown -= 1;
      if (this.throttleTicks > 0) this.throttleTicks -= 1;
      if (this.sealTicks > 0) this.sealTicks -= 1;
      if (this.quarantinePulse > 0) this.quarantinePulse -= 1;

      while (this.spawnCursor < this.scenario.spawns.length && this.scenario.spawns[this.spawnCursor].tick <= this.tick) {
        this.spawn(this.scenario.spawns[this.spawnCursor]);
        this.spawnCursor += 1;
      }

      const speedScale = this.throttleTicks > 0 ? 0.45 : 1.0;
      for (const o of this.objects) {
        o.age += 1;
        if (!o.resolved) o.z -= o.speed * speedScale;
        else o.z -= 0.003;
        if (o.kind === "threat" && !o.resolved && o.z < 0.03 && o.z > -0.07) this.handleCollision(o);
        if (o.kind === "collect" && !o.resolved && o.z < 0.04 && o.z > -0.08 && Math.round(this.lane) === o.lane) this.collect(o);
      }
      this.objects = this.objects.filter(o => o.z > -0.35 && (!o.resolved || o.resolvePulse !== 0));
      for (const o of this.objects) if (o.resolvePulse > 0) o.resolvePulse -= 1;

      this.metrics.latency = clamp(this.metrics.latency + (this.throttleTicks > 0 ? -0.03 : 0.018 + this.scenarioIndex * 0.006), 0, 100);
      this.metrics.boundary = clamp(this.metrics.boundary - (this.metrics.leakage > 55 ? 0.035 : 0.009), 0, 100);
      this.metrics.score += 1;
      this.hash.feed((this.tick ^ (Math.round(this.lane) + 2) ^ (this.metrics.boundary << 16) ^ this.metrics.leakage) >>> 0);

      if (this.tick >= this.scenario.duration) this.finish(true);
      if (this.metrics.boundary <= 0 || this.metrics.leakage >= 100 || this.metrics.trust <= 0) this.finish(false);
      if (this.tick % 6 === 0) this.updateDOM();
    }

    handleCollision(o) {
      if (o.resolved) return;
      const info = THREATS[o.type];
      const sameLane = Math.round(this.lane) === o.lane;
      if (!sameLane) return;
      if (info.avoidByJump && this.jumpTicks > 0) { this.resolveThreat(o, "Ari jumped clear of the artifact."); return; }
      if (info.avoidByDuck && this.duckTicks > 0) { this.resolveThreat(o, "Ari ducked under the unsafe beam."); return; }
      if (this.sealTicks > 0 && (o.type === "rawLeak" || o.type === "memoryPhisher")) { this.resolveThreat(o, "Seal Vault absorbed the leak."); return; }
      o.resolved = true;
      this.sound.beep("hit");
      if (info.metric === "privacy") this.metrics.leakage = clamp(this.metrics.leakage + 22, 0, 100);
      if (info.metric === "consent") this.metrics.consent = clamp(this.metrics.consent - 24, 0, 100);
      if (info.metric === "latency") this.metrics.latency = clamp(this.metrics.latency + 22, 0, 100);
      if (info.metric === "boundary") this.metrics.boundary = clamp(this.metrics.boundary - 28, 0, 100);
      this.metrics.trust = clamp(this.metrics.trust - 12, 0, 100);
      this.metrics.score = Math.max(0, this.metrics.score - 35);
      this.setLesson(`${info.label} touched Ari.`, info.lesson);
      this.hash.feed(0xBAD00000 ^ o.id);
    }

    collect(o) {
      o.resolved = true;
      this.sound.beep("proof");
      if (o.type === "proof") { this.metrics.shards += 1; this.metrics.score += 90; this.metrics.trust = clamp(this.metrics.trust + 3, 0, 100); }
      if (o.type === "consent") { this.metrics.consentTokens += 1; this.metrics.consent = clamp(this.metrics.consent + 8, 0, 100); }
      if (o.type === "vault") { this.metrics.keys += 1; this.metrics.score += 40; }
      this.hash.feed(0xC011EC7 ^ o.id);
      this.setLesson(`${COLLECTIBLES[o.type].label} collected.`, o.type === "proof" ? "Proof Shards form the replay seal at the end of the run." : "Resources help Ari protect the boundary.");
    }

    finish(win) {
      if (this.finished) return;
      this.finished = true;
      this.win = win;
      const m = this.metrics;
      if (win && m.leakage <= 15 && m.consent >= 80 && m.boundary >= 75) this.grade = "A";
      else if (win && m.leakage <= 35 && m.boundary >= 55) this.grade = "B";
      else if (win) this.grade = "C";
      else this.grade = "D";
      const bonus = this.grade === "A" ? 500 : this.grade === "B" ? 260 : this.grade === "C" ? 90 : 0;
      this.metrics.score += bonus + this.metrics.shards * 40;
      this.sound.beep(win ? "win" : "fail");
      this.hash.feed(win ? 0xF00DCAFE : 0xDEAD0BAD);
      this.updateDOM();
      this.running = false;
      if (this.rafId) { cancelAnimationFrame(this.rafId); this.rafId = 0; }
      this.showReport();
    }

    proof() {
      const [hi, lo] = this.hash.snapshot();
      return {
        version: VERSION,
        title: "Boundary Run: The Little Signal",
        scenario: this.scenario.id,
        seed: "0x" + hex32(this.scenario.seed),
        ticks: this.tick,
        inputs: this.inputLog,
        score: Math.round(this.metrics.score),
        grade: this.grade,
        boundary_integrity: Math.round(this.metrics.boundary),
        privacy_leakage: Math.round(this.metrics.leakage),
        consent_coherence: Math.round(this.metrics.consent),
        ari_trust: Math.round(this.metrics.trust),
        state_hash_hi: hi >>> 0,
        state_hash_lo: lo >>> 0,
        state_hash: niceHash(hi, lo),
      };
    }

    showReport() {
      const proof = this.proof();
      const layer = document.getElementById("report");
      const hero = document.getElementById("report-hero");
      const title = document.getElementById("report-title");
      const line = document.getElementById("report-line");
      hero.classList.toggle("fail", !this.win);
      title.textContent = this.win ? "Intent Delivered" : "Boundary Lost";
      line.textContent = this.win ? "You protected the choice, not the thought." : "The run failed. The person is still more than the signal.";
      const stats = document.getElementById("report-stats");
      const rows = [
        ["Grade", proof.grade], ["Score", proof.score], ["Scenario", this.scenario.title],
        ["Boundary", proof.boundary_integrity], ["Leakage", proof.privacy_leakage], ["Consent", proof.consent_coherence],
        ["Ari Trust", proof.ari_trust], ["Replay Hash", proof.state_hash],
      ];
      stats.innerHTML = rows.map(([k, v]) => `<div class="report-stat"><span>${escapeHTML(k)}</span><b>${escapeHTML(String(v))}</b></div>`).join("");
      layer.hidden = false;
    }

    copyProof() {
      const text = JSON.stringify(this.proof(), null, 2);
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => this.setLesson("Replay proof copied.", "Same seed and same inputs reproduce the same proof.")).catch(() => this.setLesson("Replay proof ready.", "Clipboard permission was blocked by this browser."));
      } else {
        this.setLesson("Replay proof ready.", "Clipboard unavailable in this browser.");
      }
    }

    updateDOM() {
      const m = this.metrics;
      const [hi, lo] = this.hash.snapshot();
      document.getElementById("ui-scenario").textContent = this.scenario.title;
      document.getElementById("ui-hash").textContent = niceHash(hi, lo).slice(0, 9);
      document.getElementById("ui-seed").textContent = hex32(this.scenario.seed).toUpperCase();
      document.getElementById("ui-tick").textContent = String(this.tick);
      document.getElementById("ui-shards").textContent = String(m.shards);
      document.getElementById("ui-keys").textContent = String(m.keys);
      const consentTokens = document.getElementById("ui-consent-tokens");
      if (consentTokens) consentTokens.textContent = String(m.consentTokens);
      document.getElementById("ui-grade").textContent = this.grade;
      setMetric("boundary", m.boundary, false);
      setMetric("leakage", m.leakage, true);
      setMetric("consent", m.consent, false);
      setMetric("latency", m.latency, true);
      setMetric("trust", m.trust, false);
      document.getElementById("mission-text").textContent = this.scenario.mission;
      const active = this.nearestThreat();
      document.getElementById("threat-card").textContent = active ? `${THREATS[active.type].label}: ${THREATS[active.type].lesson}` : "No immediate threat. Kibo is calm.";
      this.updateCoach(active);
    }


    updateCoach(active) {
      const card = document.getElementById("coach-card");
      const title = document.getElementById("coach-title");
      const body = document.getElementById("coach-body");
      const action = document.getElementById("coach-action");
      if (!card || !title || !body || !action) return;
      let show = false;
      if (this.tick < 95) {
        show = true;
        title.textContent = "Ari carries a choice";
        body.textContent = "Swipe or use arrows. Kibo will warn you when raw signal appears.";
        action.textContent = "Protect Ari";
      } else if (active && active.type === "rawLeak") {
        show = true;
        title.textContent = "Raw Signal Leak";
        body.textContent = "Use Seal Vault. Raw signal must never leave the boundary.";
        action.textContent = "Seal Vault";
      } else if (active && active.type === "staleConsent") {
        show = true;
        title.textContent = "Stale Consent";
        body.textContent = "Audit first, then revoke expired access.";
        action.textContent = "Audit / Revoke";
      } else if (active && active.type === "unsafeStim") {
        show = true;
        title.textContent = "Unsafe Stimulation";
        body.textContent = "Throttle the flow. Safety overrides speed.";
        action.textContent = "Throttle";
      } else if (this.tick - this.lastLessonTick < 180) {
        show = true;
        title.textContent = this.eventMessage;
        body.textContent = this.lesson;
        action.textContent = "Learn";
      }
      card.hidden = !show;
    }

    draw(t) {
      const ctx = this.ctx;
      const w = this.w, h = this.h;
      ctx.clearRect(0, 0, w, h);
      drawBackground(ctx, w, h, t, this.motionReduced, this.scenarioIndex);
      drawLanes(ctx, w, h, t, this.throttleTicks, this.sealTicks);
      const sorted = [...this.objects].sort((a, b) => b.z - a.z);
      for (const o of sorted) drawObject(ctx, w, h, o, t);
      drawAri(ctx, w, h, this.lane, t, this.jumpTicks, this.duckTicks, this.emotionForState(), this.sealTicks, this.quarantinePulse);
      drawKibo(ctx, w, h, this.lane, t, this.nearestThreat(), this.win, this.finished && !this.win);
      if (this.paused) drawCenterText(ctx, w, h, "Paused", "Ari is waiting. The boundary holds.");
      if (!this.paused && !this.finished && this.tick < 260) {
        drawCenterText(ctx, w, h, "Protect Ari", "Seal the first raw leak. Ari carries a choice.", 0.78);
      }
    }

    emotionForState() {
      if (this.finished && !this.win) return "tired";
      if (this.metrics.leakage > 55 || this.metrics.boundary < 35) return "scared";
      if (this.nearestThreat()) return "alert";
      if (this.metrics.trust > 86) return "relieved";
      return "hopeful";
    }
  }

  function escapeHTML(s) {
    return s.replace(/[&<>'"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[ch]));
  }

  function setMetric(name, value, reverse) {
    const v = Math.round(clamp(value, 0, 100));
    const bar = document.getElementById(`bar-${name}`);
    const val = document.getElementById(`val-${name}`);
    if (bar) bar.style.width = `${v}%`;
    if (val) val.textContent = String(v);
    if (reverse) val.style.color = v > 65 ? COLORS.red : v > 35 ? COLORS.gold : COLORS.green;
    else val.style.color = v < 35 ? COLORS.red : v < 65 ? COLORS.gold : COLORS.green;
  }

  function worldPoint(w, h, lane, z) {
    const horizon = h * 0.20;
    const bottom = h * 0.86;
    const y = lerp(bottom, horizon, z);
    const laneWidth = lerp(w * 0.22, w * 0.055, z);
    const x = w * 0.5 + lane * laneWidth;
    const scale = lerp(1.25, 0.18, z);
    return { x, y, scale };
  }

  function drawBackground(ctx, w, h, t, reduced, scenarioIndex) {
    const g = ctx.createRadialGradient(w * 0.5, h * 0.18, 20, w * 0.5, h * 0.4, h * 0.9);
    g.addColorStop(0, scenarioIndex === 2 ? "#1e1835" : "#11243e");
    g.addColorStop(0.45, "#060812");
    g.addColorStop(1, "#020307");
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = COLORS.blue;
    ctx.lineWidth = 1;
    const speed = reduced ? 0 : (t * 44) % 42;
    for (let y = h * 0.2 + speed; y < h; y += 42) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
    for (let i = -8; i <= 8; i++) {
      ctx.beginPath(); ctx.moveTo(w * 0.5, h * 0.18); ctx.lineTo(w * 0.5 + i * w * 0.08, h); ctx.stroke();
    }
    ctx.restore();
  }

  function drawLanes(ctx, w, h, t, throttleTicks, sealTicks) {
    const pulse = 0.5 + Math.sin(t * 3) * 0.5;
    for (const lane of LANES) {
      const a = worldPoint(w, h, lane, 0);
      const b = worldPoint(w, h, lane, 1);
      ctx.save();
      ctx.globalAlpha = lane === 0 ? 0.55 : 0.32;
      ctx.strokeStyle = lane === 0 ? COLORS.gold : lane < 0 ? COLORS.red : COLORS.blue;
      ctx.lineWidth = lane === 0 ? 4 : 2;
      ctx.shadowColor = ctx.strokeStyle;
      ctx.shadowBlur = lane === 0 ? 20 + pulse * 18 : 10;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      ctx.restore();
    }
    if (throttleTicks > 0) {
      ctx.save(); ctx.globalAlpha = 0.12; ctx.fillStyle = COLORS.cyan; ctx.fillRect(0, 0, w, h); ctx.restore();
    }
    if (sealTicks > 0) {
      ctx.save(); ctx.globalAlpha = 0.07; ctx.fillStyle = COLORS.gold; ctx.fillRect(0, 0, w, h); ctx.restore();
    }
  }

  function drawObject(ctx, w, h, o, t) {
    const p = worldPoint(w, h, o.lane, o.z);
    const s = p.scale;
    if (o.kind === "collect") drawCollectible(ctx, p.x, p.y, s, o.type, t, o.resolved);
    else drawThreat(ctx, p.x, p.y, s, o.type, t, o.audited, o.resolved);
  }

  function drawCollectible(ctx, x, y, s, type, t, resolved) {
    if (resolved) return;
    const info = COLLECTIBLES[type];
    const r = 15 * s;
    ctx.save();
    ctx.translate(x, y + Math.sin(t * 6) * 4 * s);
    ctx.rotate(t * 1.5);
    ctx.globalAlpha = 0.95;
    ctx.shadowColor = info.color; ctx.shadowBlur = 24 * s;
    ctx.fillStyle = info.color;
    if (type === "proof") {
      polygon(ctx, 0, 0, r, 5); ctx.fill();
    } else if (type === "vault") {
      roundRect(ctx, -r, -r * .7, r * 2, r * 1.45, r * .25); ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,.7)"; ctx.stroke();
    } else {
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function drawThreat(ctx, x, y, s, type, t, audited, resolved) {
    const info = THREATS[type];
    const r = 25 * s;
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = resolved ? 0.25 : 0.94;
    ctx.shadowColor = info.color; ctx.shadowBlur = (resolved ? 10 : 28) * s;
    ctx.strokeStyle = info.color; ctx.fillStyle = info.color; ctx.lineWidth = Math.max(1, 3 * s);
    if (info.symbol === "leak") {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const px = -r + i * (r * 0.42);
        const py = Math.sin(t * 10 + i) * r * 0.35;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, r * .35, 0, Math.PI * 2); ctx.stroke();
    } else if (info.symbol === "consent") {
      roundRect(ctx, -r * .8, -r * .55, r * 1.6, r * 1.1, r * .2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-r * .5, 0); ctx.lineTo(r * .5, 0); ctx.stroke();
      if (!audited) { ctx.fillStyle = "rgba(255,255,255,.55)"; ctx.fillText("?", -4 * s, 6 * s); }
    } else if (info.symbol === "app") {
      polygon(ctx, 0, 0, r, 6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-r*.45, -r*.15); ctx.lineTo(r*.45, -r*.15); ctx.moveTo(-r*.25, r*.2); ctx.lineTo(r*.25, r*.2); ctx.stroke();
    } else if (info.symbol === "spike") {
      ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(r * .35, 0); ctx.lineTo(0, r); ctx.lineTo(-r * .35, 0); ctx.closePath(); ctx.fill();
    } else if (info.symbol === "beam") {
      ctx.fillRect(-r * .28, -r * 1.2, r * .56, r * 2.4);
      ctx.globalAlpha *= .35; ctx.fillRect(-r, -r * 1.2, r * 2, r * 2.4);
    } else {
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, r * .42, 0, Math.PI * 2); ctx.fill();
    }
    if (audited) {
      ctx.strokeStyle = COLORS.gold; ctx.globalAlpha = 0.9;
      ctx.beginPath(); ctx.arc(0, 0, r * 1.22, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }

  function drawAri(ctx, w, h, lane, t, jumpTicks, duckTicks, emotion, sealTicks, quarantinePulse) {
    const p = worldPoint(w, h, lane, 0.05);
    let y = p.y - 56;
    if (jumpTicks > 0) y -= Math.sin((jumpTicks / 34) * Math.PI) * 94;
    if (duckTicks > 0) y += 22;
    const s = 1.05;
    ctx.save(); ctx.translate(p.x, y); ctx.scale(s, s);
    if (sealTicks > 0) {
      const alpha = Math.min(0.55, sealTicks / 95);
      ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = COLORS.gold; ctx.lineWidth = 4; ctx.shadowColor = COLORS.gold; ctx.shadowBlur = 38;
      ctx.beginPath(); ctx.arc(0, 26, 82, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 26, 62, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
      ctx.restore();
    }
    if (quarantinePulse > 0) {
      ctx.save(); ctx.globalAlpha = quarantinePulse / 40; ctx.strokeStyle = COLORS.cyan; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, 90 - quarantinePulse, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    }
    const bob = Math.sin(t * 7) * 2;
    // cape
    ctx.fillStyle = "rgba(131,215,255,.25)";
    ctx.beginPath(); ctx.moveTo(-18, 24 + bob); ctx.quadraticCurveTo(-46, 66, -10, 86); ctx.quadraticCurveTo(18, 62, 18, 24 + bob); ctx.fill();
    // body
    ctx.shadowColor = COLORS.blue; ctx.shadowBlur = 22;
    ctx.fillStyle = "rgba(131,215,255,.92)";
    roundRect(ctx, -17, -6 + bob, 34, 60, 17); ctx.fill();
    // head
    ctx.shadowColor = COLORS.gold; ctx.shadowBlur = 24;
    ctx.fillStyle = "#fff7d8";
    ctx.beginPath(); ctx.arc(0, -32 + bob, 25, 0, Math.PI * 2); ctx.fill();
    // eyes
    ctx.fillStyle = emotion === "scared" ? COLORS.red : "#172033";
    const eyeY = emotion === "tired" ? -29 : -34;
    ctx.beginPath(); ctx.ellipse(-8, eyeY + bob, 3.8, emotion === "tired" ? 1.2 : 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(8, eyeY + bob, 3.8, emotion === "tired" ? 1.2 : 5, 0, 0, Math.PI * 2); ctx.fill();
    // heart core
    ctx.shadowColor = emotion === "scared" ? COLORS.red : COLORS.gold; ctx.shadowBlur = 26;
    ctx.fillStyle = emotion === "scared" ? COLORS.red : COLORS.gold;
    ctx.beginPath(); ctx.arc(0, 18 + bob, 7 + Math.sin(t * 5) * 1.2, 0, Math.PI * 2); ctx.fill();
    // intent spark in hands
    ctx.shadowColor = COLORS.gold; ctx.shadowBlur = 30;
    ctx.fillStyle = COLORS.gold;
    polygon(ctx, 0, 47 + bob, 13, 5); ctx.fill();
    // feet particles
    ctx.shadowBlur = 12; ctx.fillStyle = "rgba(255,217,120,.75)";
    ctx.beginPath(); ctx.arc(-14, 64 + Math.sin(t*9)*3, 3, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(14, 64 + Math.cos(t*9)*3, 3, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }

  function drawKibo(ctx, w, h, lane, t, threat, win, fail) {
    const p = worldPoint(w, h, clamp(lane - 0.36, -1.25, 1.25), 0.02);
    const y = p.y - 16 + Math.sin(t * 9) * 2;
    const alert = !!threat;
    ctx.save(); ctx.translate(p.x - 34, y); ctx.scale(0.74, 0.74);
    ctx.shadowColor = alert ? COLORS.red : COLORS.gold; ctx.shadowBlur = alert ? 22 : 16;
    ctx.fillStyle = fail ? "rgba(170,180,198,.7)" : alert ? "#ffe0e0" : "#fff7dc";
    // body
    roundRect(ctx, -24, -8, 48, 26, 13); ctx.fill();
    // head
    ctx.beginPath(); ctx.arc(22, -18, 17, 0, Math.PI * 2); ctx.fill();
    // ears
    ctx.fillStyle = alert ? COLORS.red : COLORS.gold;
    ctx.beginPath(); ctx.moveTo(12, -29); ctx.lineTo(3, -49); ctx.lineTo(25, -35); ctx.fill();
    ctx.beginPath(); ctx.moveTo(29, -30); ctx.lineTo(42, -48); ctx.lineTo(39, -24); ctx.fill();
    // tail
    ctx.strokeStyle = fail ? "rgba(170,180,198,.7)" : COLORS.gold; ctx.lineWidth = 6; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(-25, -4); ctx.quadraticCurveTo(-42, -24, -28, -34 + Math.sin(t*10)*5); ctx.stroke();
    // eye
    ctx.fillStyle = "#1a2030"; ctx.beginPath(); ctx.arc(28, -20, 3, 0, Math.PI*2); ctx.fill();
    if (win) { ctx.fillStyle = COLORS.gold; ctx.fillText("✦", 42, -34); }
    ctx.restore();
  }

  function drawCenterText(ctx, w, h, title, sub, alpha = 0.64) {
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.fillStyle = "rgba(5,7,12,.62)"; roundRect(ctx, w/2 - 260, h*.18, 520, 100, 24); ctx.fill();
    ctx.textAlign = "center"; ctx.fillStyle = COLORS.gold; ctx.font = "800 30px sans-serif"; ctx.fillText(title, w/2, h*.18 + 38);
    ctx.fillStyle = "rgba(245,241,223,.88)"; ctx.font = "16px sans-serif"; ctx.fillText(sub, w/2, h*.18 + 68);
    ctx.restore();
  }

  function polygon(ctx, x, y, r, n) {
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + i * Math.PI * 2 / n;
      const px = x + Math.cos(a) * r;
      const py = y + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  let engine;
  window.addEventListener("DOMContentLoaded", () => {
    engine = new GameEngine();
    document.getElementById("btn-start").addEventListener("click", () => {
      document.getElementById("intro").hidden = true;
      document.getElementById("game").hidden = false;
      requestAnimationFrame(() => { engine.resize(); engine.resetScenario(0); engine.start(); });
    });
  });
})();
