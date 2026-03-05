const difficultySelect = document.getElementById("difficulty");
const resetBtn = document.getElementById("resetBtn");
const boardEl = document.getElementById("board");
const minesLeftEl = document.getElementById("minesLeft");
const timerEl = document.getElementById("timer");
const messageEl = document.getElementById("message");

const DIFFICULTIES = {
  easy: { rows: 9, cols: 9, mines: 10 },
  medium: { rows: 16, cols: 16, mines: 40 },
  hard: { rows: 16, cols: 30, mines: 99 },
};

let board = [];
let rows = 0;
let cols = 0;
let totalMines = 0;
let minesPlaced = false;
let gameOver = false;
let timer = 0;
let timerHandle = null;
let suppressClick = false;

function initGame() {
  const setting = DIFFICULTIES[difficultySelect.value];
  rows = setting.rows;
  cols = setting.cols;
  totalMines = setting.mines;

  board = createEmptyBoard(rows, cols);
  minesPlaced = false;
  gameOver = false;
  timer = 0;
  stopTimer();
  messageEl.textContent = "";
  messageEl.className = "message";

  buildBoardDom();
  renderBoard();
  updateStatus();
}

function createEmptyBoard(r, c) {
  return Array.from({ length: r }, (_, row) =>
    Array.from({ length: c }, (_, col) => ({
      row,
      col,
      isMine: false,
      isRevealed: false,
      isFlagged: false,
      adjacent: 0,
      exploded: false,
    }))
  );
}

function buildBoardDom() {
  boardEl.innerHTML = "";
  boardEl.style.gridTemplateColumns = `repeat(${cols}, 30px)`;

  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "cell";
      btn.setAttribute("aria-label", `第${r + 1}行第${c + 1}列`);

      btn.addEventListener("click", () => {
        if (suppressClick) {
          suppressClick = false;
          return;
        }
        handleLeftClick(r, c);
      });

      btn.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        toggleFlag(r, c);
      });

      // 移动端长按插旗
      let pressTimer = null;
      btn.addEventListener("touchstart", () => {
        pressTimer = window.setTimeout(() => {
          toggleFlag(r, c);
          suppressClick = true;
        }, 380);
      });
      btn.addEventListener("touchend", () => {
        if (pressTimer) {
          clearTimeout(pressTimer);
          pressTimer = null;
        }
      });
      btn.addEventListener("touchcancel", () => {
        if (pressTimer) {
          clearTimeout(pressTimer);
          pressTimer = null;
        }
      });

      board[r][c].element = btn;
      boardEl.appendChild(btn);
    }
  }
}

function handleLeftClick(r, c) {
  if (gameOver) return;
  const cell = board[r][c];
  if (cell.isFlagged) return;

  if (!minesPlaced) {
    placeMines(r, c);
    calculateAdjacents();
    minesPlaced = true;
    startTimer();
  }

  if (cell.isRevealed) {
    chordReveal(r, c);
    return;
  }

  if (cell.isMine) {
    cell.exploded = true;
    endGame(false);
    return;
  }

  revealSafeArea(r, c);
  if (checkWin()) {
    endGame(true);
    return;
  }
  renderBoard();
}

function toggleFlag(r, c) {
  if (gameOver) return;
  const cell = board[r][c];
  if (cell.isRevealed) return;

  if (!cell.isFlagged && getFlagCount() >= totalMines) return;
  cell.isFlagged = !cell.isFlagged;

  updateStatus();
  renderCell(cell);
}

function placeMines(safeRow, safeCol) {
  const forbidden = new Set();
  forbidden.add(`${safeRow},${safeCol}`);
  forEachNeighbor(safeRow, safeCol, (nr, nc) => forbidden.add(`${nr},${nc}`));

  const candidates = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const key = `${r},${c}`;
      if (!forbidden.has(key)) candidates.push([r, c]);
    }
  }

  for (let i = candidates.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  for (let i = 0; i < totalMines; i += 1) {
    const [r, c] = candidates[i];
    board[r][c].isMine = true;
  }
}

function calculateAdjacents() {
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const cell = board[r][c];
      if (cell.isMine) continue;
      let count = 0;
      forEachNeighbor(r, c, (nr, nc) => {
        if (board[nr][nc].isMine) count += 1;
      });
      cell.adjacent = count;
    }
  }
}

function revealSafeArea(startR, startC) {
  const queue = [[startR, startC]];

  while (queue.length > 0) {
    const [r, c] = queue.shift();
    const cell = board[r][c];
    if (cell.isRevealed || cell.isFlagged) continue;

    cell.isRevealed = true;
    if (cell.adjacent !== 0) continue;

    forEachNeighbor(r, c, (nr, nc) => {
      const next = board[nr][nc];
      if (!next.isRevealed && !next.isFlagged && !next.isMine) {
        queue.push([nr, nc]);
      }
    });
  }
}

function chordReveal(r, c) {
  const cell = board[r][c];
  if (!cell.isRevealed || cell.adjacent === 0) return;

  let flagCount = 0;
  const hiddenNeighbors = [];
  forEachNeighbor(r, c, (nr, nc) => {
    const neighbor = board[nr][nc];
    if (neighbor.isFlagged) flagCount += 1;
    if (!neighbor.isFlagged && !neighbor.isRevealed) {
      hiddenNeighbors.push([nr, nc]);
    }
  });

  if (flagCount !== cell.adjacent) return;

  for (const [nr, nc] of hiddenNeighbors) {
    const neighbor = board[nr][nc];
    if (neighbor.isMine) {
      neighbor.exploded = true;
      endGame(false);
      return;
    }
    revealSafeArea(nr, nc);
  }

  if (checkWin()) {
    endGame(true);
    return;
  }
  renderBoard();
}

function endGame(isWin) {
  gameOver = true;
  stopTimer();

  if (isWin) {
    messageEl.textContent = "恭喜你，排雷成功！";
    messageEl.className = "message win";
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const cell = board[r][c];
        if (cell.isMine) cell.isFlagged = true;
      }
    }
  } else {
    messageEl.textContent = "踩雷了，再来一局！";
    messageEl.className = "message lose";
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const cell = board[r][c];
        if (cell.isMine) cell.isRevealed = true;
      }
    }
  }

  updateStatus();
  renderBoard();
}

function checkWin() {
  let revealedCount = 0;
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const cell = board[r][c];
      if (cell.isRevealed && !cell.isMine) revealedCount += 1;
    }
  }
  return revealedCount === rows * cols - totalMines;
}

function renderBoard() {
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      renderCell(board[r][c]);
    }
  }
  updateStatus();
}

function renderCell(cell) {
  const el = cell.element;
  el.className = "cell";
  el.textContent = "";

  if (cell.isRevealed) {
    el.classList.add("revealed");
    el.disabled = true;

    if (cell.isMine) {
      el.classList.add("mine");
      el.textContent = cell.exploded ? "X" : "*";
      return;
    }

    if (cell.adjacent > 0) {
      el.textContent = String(cell.adjacent);
      el.classList.add(`n${cell.adjacent}`);
    }
    return;
  }

  if (gameOver) {
    el.disabled = true;
  } else {
    el.disabled = false;
  }

  if (cell.isFlagged) {
    el.classList.add("flagged");
    // 失败时把错旗显示出来，帮助复盘
    if (gameOver && !cell.isMine) {
      el.textContent = "!";
    } else {
      el.textContent = "F";
    }
  }
}

function updateStatus() {
  minesLeftEl.textContent = String(totalMines - getFlagCount());
  timerEl.textContent = String(timer);
}

function getFlagCount() {
  let count = 0;
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      if (board[r][c].isFlagged) count += 1;
    }
  }
  return count;
}

function startTimer() {
  stopTimer();
  timerHandle = window.setInterval(() => {
    timer += 1;
    timerEl.textContent = String(timer);
  }, 1000);
}

function stopTimer() {
  if (timerHandle) {
    clearInterval(timerHandle);
    timerHandle = null;
  }
}

function forEachNeighbor(r, c, callback) {
  for (let dr = -1; dr <= 1; dr += 1) {
    for (let dc = -1; dc <= 1; dc += 1) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      callback(nr, nc);
    }
  }
}

difficultySelect.addEventListener("change", initGame);
resetBtn.addEventListener("click", initGame);

initGame();
