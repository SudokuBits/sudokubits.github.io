(() => {
  // The shipped Classic puzzle easy-001, solved in naked-single order.
  const moves = [
    [6, 3], [1, 7], [5, 6], [11, 5], [13, 7], [14, 3], [15, 1], [19, 3],
    [22, 4], [23, 8], [24, 5], [27, 8], [29, 4], [34, 3], [36, 7], [39, 4],
    [40, 9], [41, 2], [32, 1], [35, 2], [43, 8], [42, 6], [48, 3], [51, 4],
    [53, 1], [55, 4], [61, 7], [62, 6], [57, 8], [60, 9], [54, 3], [63, 5],
    [66, 7], [65, 8], [71, 4], [72, 9], [74, 7], [75, 6], [76, 1], [77, 4],
    [78, 8],
  ];
  const board = document.querySelector(".puzzle-board");
  const cells = board.querySelectorAll(".puzzle-row span");
  const toggle = document.querySelector(".puzzle-toggle");
  const label = toggle.querySelector("span");
  const playIcon = toggle.querySelector(".play-icon");
  const pauseIcon = toggle.querySelector(".pause-icon");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  let playing = !reducedMotion.matches;
  let nextMove = 0;
  let timer;

  function schedule() {
    clearTimeout(timer);
    if (!playing || document.hidden) return;
    const delay = nextMove === moves.length ? 2600 : nextMove === 0 ? 750 : 320;
    timer = setTimeout(advance, delay);
  }

  function advance() {
    if (nextMove === moves.length) {
      for (const [index] of moves) {
        cells[index].textContent = "";
        cells[index].classList.remove("placed");
      }
      for (const row of board.children) row.classList.remove("is-complete");
      nextMove = 0;
    } else {
      const [index, digit] = moves[nextMove++];
      const cell = cells[index];
      cell.textContent = digit;
      cell.classList.add("placed");
      const row = cell.parentElement;
      if (!row.querySelector("span:empty")) row.classList.add("is-complete");
    }
    schedule();
  }

  function syncPlayback() {
    label.textContent = playing ? "Pause preview" : "Play preview";
    playIcon.toggleAttribute("hidden", playing);
    pauseIcon.toggleAttribute("hidden", !playing);
    schedule();
  }

  toggle.addEventListener("click", () => {
    playing = !playing;
    syncPlayback();
  });
  reducedMotion.addEventListener("change", ({ matches }) => {
    if (matches) {
      playing = false;
      syncPlayback();
    }
  });
  document.addEventListener("visibilitychange", schedule);
  toggle.hidden = false;
  syncPlayback();
})();
