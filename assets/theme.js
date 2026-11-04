(() => {
  const key = "sudokubits-theme";
  const root = document.documentElement;

  function restoreTheme() {
    try {
      root.dataset.theme = localStorage.getItem(key) === "dark" ? "dark" : "light";
    } catch {
      // The theme can still be switched when storage is unavailable.
    }
  }

  restoreTheme();

  document.addEventListener("DOMContentLoaded", () => {
    const button = document.querySelector(".theme-toggle");
    const syncButton = () => button.setAttribute("aria-pressed", root.dataset.theme === "dark");

    syncButton();
    button.hidden = false;
    window.addEventListener("pageshow", ({ persisted }) => {
      if (!persisted) return;
      restoreTheme();
      syncButton();
    });
    button.addEventListener("click", () => {
      const theme = root.dataset.theme === "dark" ? "light" : "dark";
      root.dataset.theme = theme;
      syncButton();
      try {
        localStorage.setItem(key, theme);
      } catch {
        // The selected theme still applies to this page.
      }
    });
  });
})();
