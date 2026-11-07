(() => {
  // The app's intro (IntroScreen.kt, MOTION-AND-SOUND §2): the logo's paper tiles are set down in
  // reading order, the gold 5 lifts last into its tilt, the name inks in, then "Developed by" and
  // the developer's name. Then the logo glides into the header and the page is set down.
  // Shown once per visit; any click, tap or key skips it.
  const root = document.documentElement;
  if (!root.classList.contains("intro")) return;

  const ARRIVE = "cubic-bezier(0.05, 0.7, 0.1, 1)";
  const LEAVE = "cubic-bezier(0.3, 0, 0.8, 0.15)";
  const STANDARD = "cubic-bezier(0.2, 0, 0, 1)";
  const INTRO_MS = 2400;
  const MEDIUM = 300;
  const LONG = 450;
  const animations = [];
  let finished = false;

  function animate(element, keyframes, delay, duration, easing = ARRIVE) {
    const animation = element.animate(keyframes, { delay, duration, easing, fill: "both" });
    animations.push(animation);
    return animation;
  }

  function done() {
    if (finished) return;
    finished = true;
    try {
      sessionStorage.setItem("sudokubits-intro", "1");
    } catch {
      // Without storage the intro may show again on the next visit.
    }
    root.classList.remove("intro");
    document.dispatchEvent(new CustomEvent("sudokubits:intro-done"));
  }

  async function start() {
    let markup;
    try {
      const response = await fetch(document.querySelector('link[rel="icon"][type="image/svg+xml"]').href);
      markup = await response.text();
    } catch {
      root.classList.add("enter");
      return done();
    }

    const t = document.body.dataset;
    const overlay = document.createElement("div");
    overlay.className = "intro-overlay";
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML = `
      <div class="intro-paper"></div>
      <div class="intro-stack">
        <div class="intro-logo">${markup}</div>
        <p class="intro-name">SudokuBits</p>
      </div>
      <div class="intro-credit"><span>${t.introBy ?? "Developed by"}</span><strong>J.C. Calayag</strong></div>
      <span class="intro-skip">${t.introSkip ?? "Tap to skip"}</span>`;
    document.body.append(overlay);

    const paper = overlay.querySelector(".intro-paper");
    const logo = overlay.querySelector(".intro-logo");
    const svg = logo.querySelector("svg");
    const name = overlay.querySelector(".intro-name");
    const [by, developer] = overlay.querySelectorAll(".intro-credit > *");
    const skip = overlay.querySelector(".intro-skip");

    // The logo tile settles first.
    animate(logo, [{ opacity: 0, transform: "scale(0.96)" }, { opacity: 1, transform: "none" }], 0, MEDIUM);
    logo.style.transformOrigin = "50% 50%";

    // The eight paper tiles are set down in reading order, 60 ms apart.
    for (let tile = 0; tile < 8; tile++) {
      const group = svg.getElementById(`tile${tile}`);
      animate(group, [{ opacity: 0, transform: "translateY(-6px)" }, { opacity: 1, transform: "none" }], 250 + tile * 60, MEDIUM);
    }

    // The gold 5 lifts last, from flat into its resting tilt and size; its shadow grows under it.
    const gold = svg.getElementById("gold5");
    gold.removeAttribute("transform");
    gold.style.transformBox = "view-box";
    gold.style.transformOrigin = "50.4px 48.6px";
    animate(gold, [{ transform: "rotate(0deg) scale(1)" }, { transform: "rotate(-10deg) scale(1.1)" }], 1000, LONG);
    gold.querySelectorAll(".gold5p").forEach((path) => animate(path, [{ opacity: 0 }, { opacity: 1 }], 1000, 90, "linear"));
    gold.querySelectorAll(".gold5s").forEach((path) => animate(path, [{ opacity: 0 }, { opacity: 1 }], 1150, MEDIUM));

    // The name inks in, then the credit.
    animate(name, [{ opacity: 0, transform: "scale(1.04)", filter: "blur(2px)" }, { opacity: 1, transform: "none", filter: "none" }], 1350, 400);
    animate(by, [{ opacity: 0 }, { opacity: 1 }], 1700, MEDIUM);
    animate(developer, [{ opacity: 0, transform: "translateY(12px)" }, { opacity: 1, transform: "none" }], 1800, MEDIUM);
    animate(skip, [{ opacity: 0 }, { opacity: 0.8 }], 600, MEDIUM);

    let handedOff = false;
    const handoff = (fast) => {
      if (handedOff) return;
      handedOff = true;
      clearTimeout(timer);
      animations.forEach((animation) => animation.finish());

      // The logo glides onto the header's mark while the paper lifts away.
      const target = document.querySelector(".site-header .brand-mark");
      const from = logo.getBoundingClientRect();
      const to = target?.getBoundingClientRect();
      const duration = fast ? MEDIUM : LONG;
      logo.style.transformOrigin = "0 0";
      if (to && to.width) {
        const scale = to.width / from.width;
        logo.animate(
          [{ transform: "none" }, { transform: `translate(${to.left - from.left}px, ${to.top - from.top}px) scale(${scale})` }],
          { duration, easing: ARRIVE, fill: "forwards" },
        );
      } else {
        logo.animate([{ opacity: 1 }, { opacity: 0 }], { duration, easing: LEAVE, fill: "forwards" });
      }
      for (const piece of [name, by, developer, skip]) piece.animate([{ opacity: 0 }], { duration: 180, easing: LEAVE, fill: "forwards" });
      const lift = paper.animate([{ opacity: 1 }, { opacity: 0 }], { delay: fast ? 0 : 120, duration, easing: STANDARD, fill: "forwards" });

      setTimeout(() => {
        overlay.style.pointerEvents = "none";
        root.classList.add("enter");
      }, fast ? 60 : 160);
      lift.finished.then(() => {
        overlay.remove();
        done();
      });
    };

    const timer = setTimeout(() => handoff(false), INTRO_MS);
    overlay.addEventListener("pointerdown", () => handoff(true), { once: true });
    window.addEventListener("keydown", () => handoff(true), { once: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
