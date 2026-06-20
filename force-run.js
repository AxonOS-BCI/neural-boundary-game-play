(function () {
  "use strict";

  function textOf(el) {
    return (el && (el.innerText || el.textContent || el.value || "") || "").trim().toLowerCase();
  }

  function findNativeRunButton() {
    const buttons = Array.from(document.querySelectorAll("button,a,[role='button'],input[type='button'],input[type='submit']"));
    return buttons.find((el) => {
      const t = textOf(el);
      return t === "run" || t === "start" || t === "play" || t.includes("start run") || t.includes("begin");
    });
  }

  function callKnownStartHooks() {
    const hooks = [
      "startGame",
      "startRun",
      "runGame",
      "playGame",
      "beginGame",
      "startBoundaryRun",
      "launchBoundaryRun"
    ];

    for (const name of hooks) {
      if (typeof window[name] === "function") {
        try {
          window[name]();
          return true;
        } catch (_) {}
      }
    }

    if (window.BoundaryRun && typeof window.BoundaryRun.start === "function") {
      try {
        window.BoundaryRun.start();
        return true;
      } catch (_) {}
    }

    if (window.game && typeof window.game.start === "function") {
      try {
        window.game.start();
        return true;
      } catch (_) {}
    }

    return false;
  }

  function dispatchStartEvents() {
    const canvas = document.querySelector("canvas");
    const target = canvas || document.body;

    try { target.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true })); } catch (_) {}
    try { document.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", bubbles: true })); } catch (_) {}
    try { document.dispatchEvent(new KeyboardEvent("keydown", { key: " ", code: "Space", bubbles: true })); } catch (_) {}
  }

  function run() {
    const native = findNativeRunButton();

    if (native && native !== document.getElementById("axon-run-launcher")) {
      native.click();
    }

    callKnownStartHooks();
    dispatchStartEvents();

    document.documentElement.classList.add("axon-run-started");

    const launcher = document.getElementById("axon-run-launcher");
    if (launcher) {
      launcher.textContent = "RUNNING";
      setTimeout(() => launcher.remove(), 450);
    }
  }

  function installLauncher() {
    if (document.getElementById("axon-run-launcher")) return;

    const btn = document.createElement("button");
    btn.id = "axon-run-launcher";
    btn.type = "button";
    btn.textContent = "RUN";
    btn.setAttribute("aria-label", "Run Boundary Run");
    btn.style.cssText = [
      "position:fixed",
      "left:50%",
      "bottom:28px",
      "transform:translateX(-50%)",
      "z-index:999999",
      "min-width:148px",
      "min-height:56px",
      "border:1px solid rgba(255,212,110,.9)",
      "border-radius:999px",
      "background:linear-gradient(135deg,#ffd46e,#69e7ff)",
      "color:#081018",
      "font:800 18px/1 system-ui,-apple-system,Segoe UI,sans-serif",
      "letter-spacing:.08em",
      "box-shadow:0 0 32px rgba(255,212,110,.45),0 12px 40px rgba(0,0,0,.45)",
      "touch-action:manipulation",
      "cursor:pointer"
    ].join(";");

    btn.addEventListener("click", run, { passive: true });
    document.body.appendChild(btn);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", installLauncher, { once: true });
  } else {
    installLauncher();
  }

  window.axonRunNow = run;
})();
