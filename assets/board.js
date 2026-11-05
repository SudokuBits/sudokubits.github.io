// The sudoku board, drawn and moving like the app's board (BoardEffects.kt, SudokuGrid.kt,
// MOTION-AND-SOUND.md §2): highlights glide to the selected cell, a placed digit inks in, a
// finished row, column or box gets a gold seam, and a solved board gets the gold wave before each
// box lifts, the center first.
(() => {
  const SWEEP = 650;
  const WAVE = 950;
  const STAGGER = 40;
  const GLOW_WIDTH = 2.5;
  const LIFT_ORDER = [4, 1, 2, 5, 8, 7, 6, 3, 0];
  const LIFT_START = WAVE - 70;

  const rowOf = (i) => Math.floor(i / 9);
  const colOf = (i) => i % 9;
  const boxOf = (i) => Math.floor(rowOf(i) / 3) * 3 + Math.floor(colOf(i) / 3);
  const rowCells = (r) => Array.from({ length: 9 }, (_, c) => r * 9 + c);
  const colCells = (c) => Array.from({ length: 9 }, (_, r) => r * 9 + c);
  const boxCells = (b) => {
    const top = Math.floor(b / 3) * 3;
    const left = (b % 3) * 3;
    return Array.from({ length: 9 }, (_, k) => (top + Math.floor(k / 3)) * 9 + left + (k % 3));
  };
  const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, reduced() ? 0 : ms));

  class SudokuBoard {
    constructor(element, { interactive = false } = {}) {
      this.el = element;
      this.el.classList.add("board");
      this.el.replaceChildren();
      this.interactive = interactive;
      this.glows = [];
      this.frame = 0;
      this.timers = [];

      const hl = document.createElement("div");
      hl.className = "board-hl";
      hl.setAttribute("aria-hidden", "true");
      hl.innerHTML = '<span class="hl-row"></span><span class="hl-col"></span><span class="hl-box"></span><span class="hl-cell"></span>';
      this.hl = hl;

      const boxes = document.createElement("div");
      boxes.className = "board-boxes";
      this.boxes = [];
      this.cells = new Array(81);
      for (let b = 0; b < 9; b++) {
        const box = document.createElement("div");
        box.className = "box";
        for (const i of boxCells(b)) {
          const cell = document.createElement(interactive ? "button" : "span");
          cell.className = "cell";
          cell.dataset.index = i;
          if (interactive) {
            cell.type = "button";
            cell.tabIndex = -1;
          }
          box.append(cell);
          this.cells[i] = cell;
        }
        boxes.append(box);
        this.boxes.push(box);
      }

      const lines = document.createElement("div");
      lines.className = "board-lines";
      lines.setAttribute("aria-hidden", "true");

      this.el.append(hl, boxes, lines);
      this.selected = null;
    }

    // ---- Digits ----

    setDigit(i, digit, { kind = "player", ink = true } = {}) {
      const cell = this.cells[i];
      cell.querySelector(".notes")?.remove();
      cell.querySelector(".digit")?.remove();
      cell.classList.remove("is-player", "is-hint", "is-given", "is-wrong");
      if (!digit) return;
      const span = document.createElement("span");
      span.className = "digit";
      span.textContent = digit;
      if (ink && !reduced()) span.classList.add("ink");
      cell.classList.add(`is-${kind}`);
      cell.prepend(span);
    }

    clearDigit(i, { unink = false } = {}) {
      const digit = this.cells[i].querySelector(".digit");
      const done = () => this.setDigit(i, 0);
      if (!digit) return done();
      if (unink && !reduced()) {
        digit.classList.remove("ink");
        digit.classList.add("unink");
        digit.addEventListener("animationend", done, { once: true });
      } else done();
    }

    setNotes(i, notes) {
      const cell = this.cells[i];
      cell.querySelector(".notes")?.remove();
      if (!notes || !notes.size) return;
      const grid = document.createElement("span");
      grid.className = "notes";
      grid.setAttribute("aria-hidden", "true");
      for (let d = 1; d <= 9; d++) {
        const mark = document.createElement("span");
        if (notes.has(d)) mark.textContent = d;
        grid.append(mark);
      }
      cell.append(grid);
    }

    setWrong(i, wrong) {
      this.cells[i].classList.toggle("is-wrong", wrong);
    }

    /** One soft red ring and a 1.06x beat around the wrong number (W1). */
    pulse(i) {
      const cell = this.cells[i];
      const digit = cell.querySelector(".digit");
      digit?.classList.remove("ink");
      if (reduced()) return;
      digit?.classList.add("beat");
      const ring = document.createElement("span");
      ring.className = "ring";
      ring.setAttribute("aria-hidden", "true");
      ring.addEventListener("animationend", () => ring.remove(), { once: true });
      cell.append(ring);
    }

    // ---- Highlights ----

    /** The row, column, box and cell highlights glide to [i]; the first selection appears in place. */
    select(i) {
      this.selected = i;
      if (i === null || i === undefined) {
        this.el.classList.remove("has-selection");
        this.cells.forEach((cell) => cell.classList.remove("is-selected"));
        return;
      }
      const first = !this.el.classList.contains("has-selection");
      if (first) this.hl.querySelectorAll("span").forEach((s) => (s.style.transition = "none"));
      this.hl.style.setProperty("--r", rowOf(i));
      this.hl.style.setProperty("--c", colOf(i));
      this.hl.style.setProperty("--br", Math.floor(rowOf(i) / 3));
      this.hl.style.setProperty("--bc", Math.floor(colOf(i) / 3));
      if (first) {
        this.hl.offsetWidth;
        this.hl.querySelectorAll("span").forEach((s) => (s.style.transition = ""));
      }
      this.el.classList.add("has-selection");
      this.cells.forEach((cell, k) => cell.classList.toggle("is-selected", k === i));
    }

    /** Cells holding [digit] are tinted (they fade in). */
    showSame(values, digit) {
      this.cells.forEach((cell, k) => cell.classList.toggle("is-same", !!digit && values[k] === digit));
    }

    // ---- Gold ----

    /** The cells of every row, column and box through [i] that [isDone] says are complete. */
    static finishedUnits(i, isDone) {
      const units = [rowCells(rowOf(i)), colCells(colOf(i)), boxCells(boxOf(i))];
      return units.filter((unit) => unit.every(isDone));
    }

    /** A gold sweep over [cells], moving out from [origin] (a seam on a finished line). */
    sweep(origin, cells, duration = SWEEP) {
      if (reduced() || !cells.length) return Promise.resolve();
      let maxDistance = 0;
      const distances = new Map();
      for (const cell of cells) {
        const d = Math.max(Math.abs(rowOf(cell) - rowOf(origin)), Math.abs(colOf(cell) - colOf(origin)));
        distances.set(cell, d);
        maxDistance = Math.max(maxDistance, d);
      }
      return new Promise((resolve) => {
        this.glows.push({ distances, maxDistance, duration, start: performance.now(), resolve });
        if (!this.frame) this.frame = requestAnimationFrame((t) => this.tick(t));
      });
    }

    tick(now) {
      const levels = new Float32Array(81);
      this.glows = this.glows.filter((glow) => {
        const p = Math.min(1, (now - glow.start) / glow.duration);
        for (const [cell, d] of glow.distances) {
          const behind = p * (glow.maxDistance + GLOW_WIDTH) - d;
          if (behind > 0 && behind < GLOW_WIDTH) levels[cell] = Math.max(levels[cell], Math.sin((Math.PI * behind) / GLOW_WIDTH));
        }
        if (p >= 1) glow.resolve();
        return p < 1;
      });
      this.cells.forEach((cell, k) => cell.style.setProperty("--glow", levels[k].toFixed(3)));
      this.frame = this.glows.length ? requestAnimationFrame((t) => this.tick(t)) : 0;
    }

    /** The solved finale (F1): the gold wave from [origin], then each box lifts, the center first. */
    async finale(origin = 40) {
      this.select(null);
      this.showSame([], 0);
      const wave = this.sweep(origin, Array.from({ length: 81 }, (_, k) => k), WAVE);
      LIFT_ORDER.forEach((box, step) => {
        this.later(() => this.boxes[box].classList.add("is-lifted"), reduced() ? 0 : LIFT_START + step * STAGGER);
      });
      await wave;
      await wait(LIFT_START + LIFT_ORDER.length * STAGGER + 300 - WAVE);
    }

    lower() {
      this.boxes.forEach((box) => box.classList.remove("is-lifted"));
    }

    grey(on) {
      this.el.classList.toggle("is-grey", on);
    }

    later(fn, ms) {
      this.timers.push(setTimeout(fn, ms));
    }

    stop() {
      this.timers.forEach(clearTimeout);
      this.timers = [];
      cancelAnimationFrame(this.frame);
      this.frame = 0;
      this.glows.forEach((glow) => glow.resolve());
      this.glows = [];
      this.cells.forEach((cell) => cell.style.setProperty("--glow", 0));
    }
  }

  SudokuBoard.rowOf = rowOf;
  SudokuBoard.colOf = colOf;
  SudokuBoard.boxOf = boxOf;
  SudokuBoard.wait = wait;
  window.SudokuBoard = SudokuBoard;
})();
