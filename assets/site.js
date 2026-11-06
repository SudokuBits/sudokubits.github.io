(() => {
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

  document.addEventListener("DOMContentLoaded", () => {
    const header = document.querySelector(".site-header");

    // ---- Header: a hairline and soft shadow once the page scrolls. ----
    if (header) {
      const sentinel = document.createElement("div");
      sentinel.setAttribute("aria-hidden", "true");
      sentinel.style.cssText = "position:absolute;top:0;height:1px;width:1px;";
      document.body.prepend(sentinel);
      new IntersectionObserver(([entry]) => {
        header.classList.toggle("is-scrolled", !entry.isIntersecting);
      }).observe(sentinel);
    }

    // ---- Mobile menu ----
    const menuButton = document.querySelector(".menu-toggle");
    const nav = document.getElementById("site-nav");
    if (menuButton && nav) {
      menuButton.hidden = false;
      const setOpen = (open, focusButton = false) => {
        nav.classList.toggle("is-open", open);
        menuButton.setAttribute("aria-expanded", open);
        menuButton.setAttribute("aria-label", open ? menuButton.dataset.close : menuButton.dataset.open);
        if (open) nav.querySelector("a")?.focus();
        else if (focusButton) menuButton.focus();
      };
      menuButton.addEventListener("click", () => setOpen(!nav.classList.contains("is-open")));
      nav.addEventListener("click", (event) => {
        if (event.target.closest("a")) setOpen(false);
      });
      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && nav.classList.contains("is-open")) setOpen(false, true);
      });
      document.addEventListener("click", (event) => {
        if (nav.classList.contains("is-open") && !header.contains(event.target)) setOpen(false);
      });
      matchMedia("(min-width: 40.01rem)").addEventListener("change", ({ matches }) => {
        if (matches) setOpen(false);
      });
    }

    // ---- On the home page, the in-page links show which section you are in. ----
    const sectionLinks = [...document.querySelectorAll('.site-nav a[href^="#"]')];
    if (sectionLinks.length) {
      const sections = sectionLinks.map((link) => document.querySelector(link.getAttribute("href"))).filter(Boolean);
      const observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          const link = sectionLinks.find((item) => item.getAttribute("href") === `#${entry.target.id}`);
          if (!link) continue;
          if (entry.isIntersecting) link.setAttribute("aria-current", "location");
          else link.removeAttribute("aria-current");
        }
      }, { rootMargin: "-45% 0px -50% 0px" });
      sections.forEach((section) => observer.observe(section));
    }

    // ---- Sections are set down once as they scroll into view. ----
    const pieces = document.querySelectorAll("[data-reveal]");
    if (!("IntersectionObserver" in window) || reducedMotion.matches) {
      pieces.forEach((piece) => piece.classList.add("is-in"));
    } else {
      const observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-in");
          observer.unobserve(entry.target);
        }
      }, { rootMargin: "0px 0px -8% 0px" });
      pieces.forEach((piece) => observer.observe(piece));
    }
  });
})();
