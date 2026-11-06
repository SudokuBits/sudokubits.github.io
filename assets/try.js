(() => {
  // A playable easy puzzle (the shipped Classic easy-002) with the app's rules: three hearts, up
  // to three hints, notes, unlimited undo, and the same board motion and sounds.
  const ID = "easy-002";
  const GIVENS = "500000329231859700479230000000572410000080900180903600005108000800007103000325006";
  const SOLUTION = "568714329231859764479236581693572418754681932182943675345168297826497153917325846";
  const STORE = `sudokubits-try-${ID}`;
  const HEARTS = 3;
  const HINTS = 3;

  const element = document.getElementById("try-board");
  if (!element || !window.SudokuBoard) return;
  const { rowOf, colOf, boxOf } = SudokuBoard;
  const board = new SudokuBoard(element, { interactive: true });
  const $ = (id) => document.getElementById(id);
  const pad = $("try-pad");
  const timeOut = $("try-time");
  const heartsOut = $("try-hearts");
  const hintsOut = $("try-hints");
  const result = $("try-result");
  const live = $("try-live");
  const notesButton = $("try-notes");
  const soundButton = $("try-sound");

  const given = [...GIVENS].map(Number);
  const solution = [...SOLUTION].map(Number);
  let state;
  let notesMode = false;
  let history = [];
  let selected = null;
  let tickTimer = 0;

  // ---------- Sound: the app's own effects, loaded only once the visitor turns sound on ----------

  const sound = {
    on: false,
    ctx: null,
    buffers: new Map(),
    last: new Map(),
    names: ["tap_1", "tap_2", "tap_3", "tap_4", "tap_5", "tap_6", "tap_7", "tap_8", "tap_9", "line", "lines", "number_done", "mistake", "solved", "hint", "erase", "undo", "note", "game_over"],
    async enable() {
      this.ctx ??= new (window.AudioContext || window.webkitAudioContext)();
      await this.ctx.resume();
      await Promise.all(this.names.filter((n) => !this.buffers.has(n)).map(async (name) => {
        try {
          const data = await (await fetch(`assets/sfx/${name}.wav`)).arrayBuffer();
          this.buffers.set(name, await this.ctx.decodeAudioData(data));
        } catch {
          // A sound that fails to load is skipped.
        }
      }));
    },
    play(name) {
      if (!this.on || !this.ctx) return;
      const buffer = this.buffers.get(name);
      const now = performance.now();
      if (!buffer || now - (this.last.get(name) ?? 0) < 40) return;
      this.last.set(name, now);
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(this.ctx.destination);
      source.start();
    },
  };

  soundButton.addEventListener("click", async () => {
    sound.on = !sound.on;
    soundButton.setAttribute("aria-pressed", sound.on);
    if (sound.on) await sound.enable();
  });

  // ---------- State ----------

  function fresh() {
    return { values: [...given], wrong: [], notes: Array.from({ length: 81 }, () => []), hearts: HEARTS, hints: HINTS, elapsed: 0, started: false, solved: false, over: false };
  }

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE));
      if (saved && saved.values?.length === 81) return { ...fresh(), ...saved };
    } catch {
      // A broken save starts the puzzle over.
    }
    return fresh();
  }

  function save() {
    try {
      localStorage.setItem(STORE, JSON.stringify(state));
    } catch {
      // Progress stays for this visit only.
    }
  }

  const isCorrect = (i) => state.values[i] !== 0 && state.values[i] === solution[i];
  const isWrong = (i) => state.wrong.includes(i);
  const remaining = (d) => 9 - state.values.filter((v, i) => v === d && isCorrect(i)).length;

  // ---------- Drawing ----------

  function label(i) {
    const where = `Row ${rowOf(i) + 1}, column ${colOf(i) + 1}`;
    const v = state.values[i];
    if (given[i]) return `${where}, ${v}, given`;
    if (v) return `${where}, ${v}${isWrong(i) ? ", wrong" : ""}`;
    if (state.notes[i].length) return `${where}, notes ${state.notes[i].join(" ")}`;
    return `${where}, empty`;
  }

  function drawCell(i, ink = false) {
    const v = state.values[i];
    if (given[i]) board.setDigit(i, v, { kind: "given", ink: false });
    else if (v) board.setDigit(i, v, { kind: state.hinted?.includes(i) ? "hint" : "player", ink });
    else {
      board.setDigit(i, 0);
      board.setNotes(i, new Set(state.notes[i]));
    }
    board.setWrong(i, isWrong(i));
    board.cells[i].setAttribute("aria-label", label(i));
  }

  function drawAll() {
    for (let i = 0; i < 81; i++) drawCell(i);
    drawPad();
    drawStatus();
    board.grey(state.over);
    if (selected !== null) highlight();
  }

  function drawPad(flip) {
    for (const key of pad.children) {
      const d = Number(key.dataset.digit);
      const left = remaining(d);
      const done = left === 0;
      key.querySelector("small").textContent = left;
      if (done !== key.classList.contains("is-done")) {
        if (flip === d) {
          key.classList.remove("flip");
          key.offsetWidth;
          key.classList.add("flip");
          setTimeout(() => key.classList.toggle("is-done", done), 150);
        } else key.classList.toggle("is-done", done);
      }
      key.setAttribute("aria-label", done ? `${d}, all placed` : `${d}, ${left} left`);
    }
  }

  function drawStatus() {
    const s = Math.floor(state.elapsed / 1000);
    timeOut.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
    hintsOut.textContent = state.hints;
    $("try-hint").disabled = state.hints === 0 || state.solved || state.over;
    [...heartsOut.children].forEach((heart, k) => heart.classList.toggle("is-empty", k >= state.hearts));
    heartsOut.setAttribute("aria-label", `${state.hearts} of ${HEARTS} hearts left`);
  }

  function highlight() {
    board.select(selected);
    const v = selected === null ? 0 : state.values[selected];
    board.showSame(state.values.map((value, i) => (isWrong(i) ? 0 : value)), v && !isWrong(selected) ? v : 0);
  }

  function say(text) {
    live.textContent = "";
    requestAnimationFrame(() => (live.textContent = text));
  }

  // ---------- Timer ----------

  function tick() {
    clearInterval(tickTimer);
    if (!state.started || state.solved || state.over || document.hidden) return;
    let last = performance.now();
    tickTimer = setInterval(() => {
      const now = performance.now();
      state.elapsed += now - last;
      last = now;
      drawStatus();
    }, 1000);
  }

  document.addEventListener("visibilitychange", () => {
    tick();
    save();
  });

  function begin() {
    if (state.started) return;
    state.started = true;
    tick();
  }

  // ---------- Moves ----------

  function select(i, focus = true) {
    selected = i;
    board.cells.forEach((cell, k) => (cell.tabIndex = k === i ? 0 : -1));
    if (focus) board.cells[i].focus({ preventScroll: true });
    highlight();
  }

  function rewards(i) {
    const units = SudokuBoard.finishedUnits(i, isCorrect);
    const d = state.values[i];
    const numberDone = remaining(d) === 0;
    drawPad(numberDone ? d : undefined);
    if (state.values.every((v, k) => isCorrect(k))) return solve(i);
    if (units.length) board.sweep(i, [...new Set(units.flat())]);
    if (units.length > 1) sound.play("lines");
    else if (units.length) sound.play("line");
    else if (numberDone) sound.play("number_done");
    if (units.length) say(`${units.length > 1 ? "Lines" : "Line"} finished`);
  }

  function place(d) {
    const i = selected;
    if (i === null || given[i] || state.solved || state.over || isCorrect(i)) return;
    begin();
    if (notesMode) {
      const notes = new Set(state.notes[i]);
      if (state.values[i]) return;
      history.push({ i, value: 0, wrong: false, notes: [...notes] });
      if (notes.has(d)) notes.delete(d);
      else notes.add(d);
      state.notes[i] = [...notes].sort();
      drawCell(i);
      sound.play("note");
      return save();
    }
    if (state.values[i] === d) return;
    history.push({ i, value: state.values[i], wrong: isWrong(i), notes: state.notes[i] });
    state.values[i] = d;
    state.notes[i] = [];
    if (d === solution[i]) {
      state.wrong = state.wrong.filter((k) => k !== i);
      drawCell(i, true);
      sound.play(`tap_${d}`);
      highlight();
      rewards(i);
    } else {
      state.wrong = [...state.wrong.filter((k) => k !== i), i];
      state.hearts--;
      drawCell(i, true);
      board.pulse(i);
      const heart = heartsOut.children[state.hearts];
      heart.classList.remove("is-draining");
      heart.offsetWidth;
      heart.classList.add("is-draining");
      sound.play("mistake");
      drawStatus();
      highlight();
      say(`${d} doesn't go there. ${state.hearts} ${state.hearts === 1 ? "heart" : "hearts"} left.`);
      if (state.hearts === 0) gameOver();
    }
    save();
  }

  function erase() {
    const i = selected;
    if (i === null || given[i] || state.solved || state.over || isCorrect(i)) return;
    if (!state.values[i] && !state.notes[i].length) return;
    history.push({ i, value: state.values[i], wrong: isWrong(i), notes: state.notes[i] });
    state.values[i] = 0;
    state.notes[i] = [];
    state.wrong = state.wrong.filter((k) => k !== i);
    drawCell(i);
    highlight();
    sound.play("erase");
    save();
  }

  function undo() {
    if (state.solved || state.over) return;
    const last = history.pop();
    if (!last) return;
    const { i } = last;
    state.values[i] = last.value;
    state.notes[i] = last.notes;
    state.wrong = state.wrong.filter((k) => k !== i);
    if (last.wrong) state.wrong.push(i);
    drawCell(i);
    drawPad();
    select(i);
    sound.play("undo");
    save();
  }

  function hint() {
    if (state.hints === 0 || state.solved || state.over) return;
    let i = selected;
    if (i === null || given[i] || isCorrect(i)) {
      const open = state.values.map((_, k) => k).filter((k) => !isCorrect(k));
      i = open[Math.floor(Math.random() * open.length)];
    }
    begin();
    state.hints--;
    state.values[i] = solution[i];
    state.notes[i] = [];
    state.wrong = state.wrong.filter((k) => k !== i);
    state.hinted = [...(state.hinted ?? []), i];
    select(i);
    drawCell(i, true);
    drawStatus();
    sound.play("hint");
    say(`Hint: ${solution[i]} in row ${rowOf(i) + 1}, column ${colOf(i) + 1}.`);
    highlight();
    rewards(i);
    save();
  }

  async function solve(i) {
    state.solved = true;
    clearInterval(tickTimer);
    save();
    drawStatus();
    sound.play("solved");
    await board.finale(i);
    showResult();
  }

  async function gameOver() {
    state.over = true;
    clearInterval(tickTimer);
    save();
    drawStatus();
    await SudokuBoard.wait(360);
    board.select(null);
    board.grey(true);
    sound.play("game_over");
    showResult();
  }

  function showResult() {
    const s = Math.floor(state.elapsed / 1000);
    const time = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
    result.classList.toggle("is-over", state.over);
    result.querySelector("h3").textContent = state.solved ? "Solved!" : "Out of hearts";
    result.querySelector("p").textContent = state.solved
      ? `You finished in ${time} with ${state.hearts} ${state.hearts === 1 ? "heart" : "hearts"} left. The app has more than 600 more puzzles waiting, in four modes and six difficulties.`
      : "Every puzzle has one solution, so each number can be found with logic. Try again: the board starts fresh.";
    result.querySelector(".try-again").textContent = state.solved ? "Play again" : "Try again";
    result.hidden = false;
    say(state.solved ? `Solved in ${time}.` : "Out of hearts.");
  }

  function restart() {
    board.stop();
    board.lower();
    board.grey(false);
    state = fresh();
    history = [];
    notesMode = false;
    notesButton.setAttribute("aria-pressed", "false");
    pad.classList.remove("notes-on");
    result.hidden = true;
    clearInterval(tickTimer);
    save();
    drawAll();
    select(given.findIndex((v) => v === 0));
  }

  // ---------- Input ----------

  for (let d = 1; d <= 9; d++) {
    const key = document.createElement("button");
    key.type = "button";
    key.className = "key";
    key.dataset.digit = d;
    key.innerHTML = `<span class="num">${d}</span><svg class="check" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg><small></small>`;
    key.addEventListener("click", () => place(d));
    pad.append(key);
  }

  element.addEventListener("click", (event) => {
    const cell = event.target.closest(".cell");
    if (cell) select(Number(cell.dataset.index));
  });

  function toggleNotes() {
    notesMode = !notesMode;
    notesButton.setAttribute("aria-pressed", notesMode);
    pad.classList.toggle("notes-on", notesMode);
    say(notesMode ? "Notes on" : "Notes off");
  }

  document.getElementById("try").addEventListener("keydown", (event) => {
    if (event.target.closest("a, .try-result")) return;
    if (selected === null) return;
    const moves = { ArrowUp: -9, ArrowDown: 9, ArrowLeft: -1, ArrowRight: 1 };
    if (event.key in moves) {
      event.preventDefault();
      const r = rowOf(selected);
      const c = colOf(selected);
      const next = {
        ArrowUp: ((r + 8) % 9) * 9 + c,
        ArrowDown: ((r + 1) % 9) * 9 + c,
        ArrowLeft: r * 9 + ((c + 8) % 9),
        ArrowRight: r * 9 + ((c + 1) % 9),
      }[event.key];
      return select(next);
    }
    if (/^[1-9]$/.test(event.key)) {
      event.preventDefault();
      return place(Number(event.key));
    }
    if (event.key === "Backspace" || event.key === "Delete" || event.key === "0") {
      event.preventDefault();
      return erase();
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
      event.preventDefault();
      return undo();
    }
    if (event.key.toLowerCase() === "n" && !event.ctrlKey && !event.metaKey) toggleNotes();
  });

  $("try-undo").addEventListener("click", undo);
  $("try-erase").addEventListener("click", erase);
  $("try-hint").addEventListener("click", hint);
  notesButton.addEventListener("click", toggleNotes);
  $("try-restart").addEventListener("click", restart);
  result.querySelector(".try-again").addEventListener("click", restart);

  // ---------- Start ----------

  state = load();
  drawAll();
  if (state.solved || state.over) showResult();
  else tick();
  if (state.solved) board.boxes.forEach((box) => box.classList.add("is-lifted"));
  const first = given.findIndex((v) => v === 0);
  selected = first;
  board.cells.forEach((cell, k) => (cell.tabIndex = k === first ? 0 : -1));
  window.addEventListener("pagehide", save);
})();
