# AGENTS.md

**sudokubits.github.io**: the website for **SudokuBits**, an Android sudoku game (a calm, offline
sudoku game for Android). It is the home page, a playable puzzle, and the privacy policy and terms the
Play Store listing links to.

The one rules file for every coding agent: Codex reads it directly, Claude Code through
[CLAUDE.md](CLAUDE.md), Gemini and Antigravity through [GEMINI.md](GEMINI.md). Put rule changes here,
never in CLAUDE.md or GEMINI.md.

## The app is the source of truth

The app lives in its own repo: `D:\Android\Projects\SudokuOffline` on this machine, origin
`github.com/Jccqt/SudokuOffline` (private). Its `AGENTS.md` maps its docs; read by section, never
a whole file. The site follows the app, never the other way round:

- **Colors**: the tokens at the top of `style.css` copy `ui/theme/Color.kt` and `BoardColors.kt`.
  When the app changes a color, change the matching token (light and dark), and name the app's
  decision (G-number) in the comment.
- **Motion**: durations and easings copy `ui/theme/Motion.kt`. No bounce, no loops.
- **Look**: the app's `docs/design/IDENTITY.md` ("Rules in code"). Gold only for rewards (a solved line,
  a finished board); mistake red is the only red.
- **Boards** (every board on the site: the hero, Try a puzzle, the mode minis): cell lines 1px, box
  lines and frame 2px (G157); cell lines ≥ 3:1 on the board, ≥ 2.5:1 on every tint; box lines clearly
  heavier.
- **Words**: features, modes and numbers must match the app (spec `REQUIREMENTS.md`). Players read
  "Google Play Games", never "Play Games" (G141), and "hearts", never "mistakes".
- **Checklists for this site** are written in the app's `ROADMAP.md` → Release (for example "The
  website project's checklist"). Do them here; tick them there only when the owner asks.

## Files

No build step, no framework, no package manager: plain HTML, CSS and JS served by GitHub Pages.

| Path | What |
|---|---|
| `index.html` | Home page (hero board, modes, Try a puzzle, Learn with Jc, footer) |
| `privacy.html`, `terms.html` | English policies |
| `th/`, `ja/` | Thai and Japanese copies of the policies |
| `style.css` | All styles; tokens at the top |
| `assets/board.js` | The board, drawn and animated like the app's `SudokuGrid.kt` |
| `assets/try.js`, `intro.js`, `loop.js`, `site.js`, `theme.js` | The puzzle, intro, hero loop, nav, light/dark |
| `assets/art/`, `assets/sfx/` | Avatars, ranks and Jc from the app; the app's own sounds |

## Hard rules (never break)

- **Never move or rename** `privacy.html`, `terms.html` or their `th/` and `ja/` copies: the Play
  Console and the app link to these URLs.
- **Policy pages**: when a page's content changes, change its "Last updated" date (in that page's
  language and format). An English change reaches the Thai and Japanese copies too, unless the app's
  checklist says a part stays English-only (the HK, MY and TW sections do).
- The developer is named **J.C. Calayag** (the Play Console developer name) on every page; the contact
  is `support.sudokubits@gmail.com`. "Jc" alone is the eagle mascot.
- **No analytics, trackers, cookies, ad scripts or third-party embeds.** The policy says we have none.
  External loads stay as they are (the Google Play badge images).
- Every page works without JavaScript, in light and dark, and at phone width (375px) with no
  sideways scroll.

## Working rules

- Work on a branch (`feat/`, `fix/` or `chore/`; never `codex` in a branch name), never straight on
  `main`. Open a PR with `gh` to `SudokuBits/sudokubits.github.io`.
- Conventional commits (`feat:`, `fix:`, `refactor:`, `chore:`, `docs:`), subject ≤ 72 chars, for the
  PR title and every commit.
- **Commits must never end up orphaned**: only add new commits (no `--amend`, rebase, `reset`,
  force-push), don't delete unmerged branches.
- **No AI co-author** (`Co-Authored-By`) and **no AI attribution anywhere** ("Generated with Claude
  Code / Codex", 🤖 …): not in commits, PRs, comments or release notes.
- Check changes in the browser preview (`.claude/launch.json` → `site`, `localhost:8000`): the pages
  you touched, light and dark, desktop and 375px.
- Explanations to the owner: short, clear, little jargon.
