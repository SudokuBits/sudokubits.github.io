(() => {
  // Runs in <head> before the page paints, so the right theme shows from the first frame.
  const key = "sudokubits-theme";
  const root = document.documentElement;
  const system = matchMedia("(prefers-color-scheme: dark)");

  root.classList.add("js");

  function stored() {
    try {
      const value = localStorage.getItem(key);
      return value === "dark" || value === "light" ? value : null;
    } catch {
      return null;
    }
  }

  // Follows the phone or computer's setting until the visitor picks one.
  function apply() {
    root.dataset.theme = stored() ?? (system.matches ? "dark" : "light");
  }

  apply();
  system.addEventListener("change", apply);

  // ---- Page changes: tell the view transition which way it is going. ----
  // Registered here, in <head>, because pagereveal fires before deferred scripts run.
  // A traverse to an earlier history entry is "back"; the same document in another language is "lang".
  const legalDoc = (url) => {
    const match = new URL(url).pathname.match(/(?:\/(th|ja))?\/(privacy|terms)\.html$/);
    return match ? { lang: match[1] ?? "en", doc: match[2] } : null;
  };

  function transitionType(activation) {
    if (!activation?.from || !activation.entry) return null;
    const from = legalDoc(activation.from.url);
    const to = legalDoc(activation.entry.url);
    if (from && to && from.doc === to.doc && from.lang !== to.lang) return "lang";
    if (activation.navigationType === "traverse" && activation.entry.index < activation.from.index) return "back";
    return null;
  }

  window.addEventListener("pageswap", (event) => {
    if (!event.viewTransition) return;
    event.viewTransition.ready.catch(() => {});
    const type = transitionType(event.activation);
    if (type) event.viewTransition.types.add(type);
  });

  window.addEventListener("pagereveal", (event) => {
    if (!event.viewTransition) return;
    event.viewTransition.ready.catch(() => {});
    const type = transitionType(window.navigation?.activation);
    if (type) event.viewTransition.types.add(type);
  });

  // Browsers without cross-document transitions still set the page down once it loads.
  const hasViewTransitions = "onpagereveal" in window && CSS.supports?.("view-transition-name: a");
  if (!hasViewTransitions) document.documentElement.classList.add("no-vt");

  document.addEventListener("DOMContentLoaded", () => {
    const button = document.querySelector(".theme-toggle");
    if (!button) return;
    const sync = () => button.setAttribute("aria-pressed", root.dataset.theme === "dark");

    sync();
    button.hidden = false;
    system.addEventListener("change", sync);
    window.addEventListener("pageshow", ({ persisted }) => {
      if (!persisted) return;
      apply();
      sync();
    });
    button.addEventListener("click", () => {
      const theme = root.dataset.theme === "dark" ? "light" : "dark";
      root.dataset.theme = theme;
      sync();
      try {
        localStorage.setItem(key, theme);
      } catch {
        // The chosen theme still applies to this page.
      }
    });
  });
})();
