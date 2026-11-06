(() => {
  // The shipped Classic puzzle easy-001, solved in naked-single order, played the way the app's
  // board moves: the highlights glide to a cell, its digit inks in, finished lines get a gold seam
  // and the solved board gets the wave and the center-first lift. Then it rests and starts over.
  const GIVENS = "102950048480200069609100027090560700013000005256087090001025000060039210020000053";
  const MOVES = [
    [6, 3], [1, 7], [5, 6], [11, 5], [13, 7], [14, 3], [15, 1], [19, 3],
    [22, 4], [23, 8], [24, 5], [27, 8], [29, 4], [34, 3], [36, 7], [39, 4],
    [40, 9], [41, 2], [32, 1], [35, 2], [43, 8], [42, 6], [48, 3], [51, 4],
    [53, 1], [55, 4], [61, 7], [62, 6], [57, 8], [60, 9], [54, 3], [63, 5],
    [66, 7], [65, 8], [71, 4], [72, 9], [74, 7], [75, 6], [76, 1], [77, 4],
    [78, 8],
  ];

  const element = document.getElementById("loop-board");
  if (!element || !window.SudokuBoard) return;
  const board = new SudokuBoard(element);
  const toggle = document.querySelector(".puzzle-toggle");
  const label = toggle.querySelector("span");
  const playIcon = toggle.querySelector(".play-icon");
  const pauseIcon = toggle.querySelector(".pause-icon");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

  const values = [...GIVENS].map(Number);
  values.forEach((digit, i) => digit && board.setDigit(i, digit, { kind: "given", ink: false }));

  let playing = !reducedMotion.matches;
  let onScreen = true;
  let move = 0;
  let phase = "select";
  let timer = 0;
  let busy = false;

  const running = () => playing && onScreen && !document.hidden;

  function schedule(delay) {
    clearTimeout(timer);
    if (running() && !busy) timer = setTimeout(step, delay);
  }

  function step() {
    if (phase === "select") {
      const [i] = MOVES[move];
      board.select(i);
      board.showSame(values, 0);
      phase = "place";
      schedule(280);
    } else if (phase === "place") {
      const [i, digit] = MOVES[move];
      values[i] = digit;
      board.setDigit(i, digit);
      board.showSame(values, digit);
      const units = SudokuBoard.finishedUnits(i, (k) => values[k] > 0);
      move++;
      if (units.length) board.sweep(i, [...new Set(units.flat())]);
      if (move === MOVES.length) {
        phase = "finale";
        schedule(420);
      } else {
        phase = "select";
        schedule(units.length ? 640 : 380);
      }
    } else if (phase === "finale") {
      busy = true;
      board.finale(MOVES[MOVES.length - 1][0]).then(() => {
        busy = false;
        phase = "reset";
        schedule(2600);
      });
    } else if (phase === "reset") {
      board.lower();
      for (const [i] of MOVES) {
        values[i] = 0;
        board.clearDigit(i, { unink: true });
      }
      move = 0;
      phase = "select";
      schedule(1100);
    }
  }

  function sync() {
    label.textContent = playing ? toggle.dataset.pause : toggle.dataset.play;
    playIcon.toggleAttribute("hidden", playing);
    pauseIcon.toggleAttribute("hidden", !playing);
    schedule(phase === "select" && move === 0 ? 900 : 300);
  }

  toggle.addEventListener("click", () => {
    playing = !playing;
    sync();
  });
  reducedMotion.addEventListener("change", ({ matches }) => {
    if (!matches) return;
    playing = false;
    sync();
  });
  document.addEventListener("visibilitychange", () => schedule(300));
  new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
    schedule(300);
  }).observe(element);

  toggle.hidden = false;
  // On the first visit the intro runs first; the loop starts once the board has been set down.
  const start = () => sync();
  if (document.documentElement.classList.contains("intro")) {
    document.addEventListener("sudokubits:intro-done", start, { once: true });
  } else start();
})();
