// register.js
const nameInput = document.getElementById('playerName');
const gameSelectBox = document.getElementById('gameSelect');
const gameList = document.getElementById('gameList');
const submitBtn = document.getElementById('submitBtn');
const resultBox = document.getElementById('result');
const nameError = document.getElementById('nameError');
const vk = document.getElementById('virtualKeyboard');

const focusItems = [
  document.getElementById('usernameField'),
  document.getElementById('gameField'),
  document.getElementById('submitField')
];

let focusIndex = 0;
let vkRow = 0, vkCol = 0;
let typing = true;
let gameSelectMode = false;

const vkKeys = [
  ["A","B","C","D","E","F","G","H","I","J"],
  ["K","L","M","N","O","P","Q","R","S","T"],
  ["U","V","W","X","Y","Z"],
  ["Enter","Delete"]
];

// 仮想キーボード作成
vk.innerHTML = "";
vkKeys.forEach((row, rIndex) => {
  const rowDiv = document.createElement("div");
  rowDiv.className = "vk-row";
  row.forEach((key, cIndex) => {
    const span = document.createElement("span");
    span.textContent = key;

    // クリック・タッチで入力処理
    span.addEventListener("click", () => handleVirtualKeyPress(key, rIndex, cIndex));
    span.addEventListener("touchstart", (e) => { 
      e.preventDefault(); // スクロール防止
      handleVirtualKeyPress(key, rIndex, cIndex);
    });

    rowDiv.appendChild(span);
  });
  vk.appendChild(rowDiv);
});
vk.classList.remove("hidden");

const vkRows = vk.querySelectorAll(".vk-row");
updateVK();

let username = "";
let selectedGame = "snake-game";
gameSelectBox.textContent = displayGameName(selectedGame);
let gameIndex = 0;

// ========= キー入力 =========
document.addEventListener("keydown", e => {
  const key = e.key.toLowerCase();

  if (typing) {
    if (key === "q") prevFocus();
    else if (key === "a") moveVK(-1);
    else if (key === "d") moveVK(1);
    else if (key === "w") moveVKRow(-1);
    else if (key === "x") moveVKRow(1);
    else if (key === "e") handleVKEnter();
  } else if (gameSelectMode) {
    if (key === "w") moveGameSelection(-1);
    else if (key === "x") moveGameSelection(1);
    else if (key === "e") selectGameAndNext();
    else if (key === "q") prevFocus();
  } else {
    if (key === "e") submitRegistration();
    else if (key === "q") prevFocus();
  }
});

// ========= クリック操作 =========

// ゲーム欄クリック → 一覧を開く
gameSelectBox.addEventListener("click", () => {
  setFocus(1, { openGameSelector: true });
});
gameSelectBox.addEventListener("touchstart", (e) => {
  e.preventDefault();
  setFocus(1, { openGameSelector: true });
});

// ゲーム一覧の各項目クリック
Array.from(gameList.children).forEach((item, idx) => {
  item.addEventListener("click", () => {
    gameIndex = idx;
    updateGameList();
    selectGameAndNext();
  });
  item.addEventListener("touchstart", (e) => {
    e.preventDefault();
    gameIndex = idx;
    updateGameList();
    selectGameAndNext();
  });
});

// 登録ボタンクリック
submitBtn.addEventListener("click", () => submitRegistration());
submitBtn.addEventListener("touchstart", (e) => {
  e.preventDefault();
  submitRegistration();
});

// ========= フォーカス制御 =========
function updateFocus() {
  focusItems.forEach((el, i) => {
    el.classList.toggle("active", i === focusIndex);
  });
}

function setFocus(index, { openGameSelector = false } = {}) {
  focusIndex = index;
  typing = (focusIndex === 0);
  vk.classList.toggle("hidden", !typing);

  if (focusIndex === 1) {
    gameSelectMode = openGameSelector;
    if (openGameSelector) {
      syncGameIndexWithSelected();
      gameList.classList.remove("hidden");
      updateGameList();
    } else {
      gameList.classList.add("hidden");
    }
  } else {
    gameSelectMode = false;
    gameList.classList.add("hidden");
  }

  updateFocus();
  updateVK();
}

function prevFocus() {
  if (focusIndex === 0) return;
  if (focusIndex === 2) {
    setFocus(1, { openGameSelector: true });
  } else if (focusIndex === 1) {
    setFocus(0);
  }
}

// ========= 仮想キーボード操作 =========
function moveVKRow(dir) {
  vkRow = (vkRow + dir + vkRows.length) % vkRows.length;
  vkCol = Math.min(vkCol, vkRows[vkRow].children.length - 1);
  updateVK();
}
function moveVK(dir) {
  vkCol = Math.max(0, Math.min(vkCol + dir, vkRows[vkRow].children.length - 1));
  updateVK();
}

function handleVKEnter() {
  const key = vkRows[vkRow].children[vkCol].textContent;
  handleVirtualKeyPress(key, vkRow, vkCol);
}

function handleVirtualKeyPress(key, rowIndex, colIndex) {
  if (key === "Enter") {
    const err = validateName(username);
    if (err) {
      nameError.textContent = err;
      nameError.style.display = "block";
      return;
    }
    nameError.style.display = "none";
    setFocus(1, { openGameSelector: true });
  } else if (key === "Delete") {
    username = username.slice(0, -1);
    nameInput.value = username;
    if (username.trim().length > 0) {
      nameError.style.display = "none";
    }
  } else {
    username += key;
    nameInput.value = username;
    if (username.trim().length > 0) {
      nameError.style.display = "none";
    }
  }
}

function updateVK() {
  vkRows.forEach(r => Array.from(r.children).forEach(c => c.classList.remove("active")));
  if (vkRows[vkRow] && vkRows[vkRow].children[vkCol]) {
    vkRows[vkRow].children[vkCol].classList.add("active");
  }
}

// ========= ゲーム選択 =========
function syncGameIndexWithSelected() {
  const items = Array.from(gameList.children);
  const idx = items.findIndex(el => el.dataset.value === selectedGame);
  gameIndex = idx >= 0 ? idx : 0;
}

function updateGameList() {
  Array.from(gameList.children).forEach((el, i) => {
    el.classList.toggle("active", i === gameIndex);
  });
}

function moveGameSelection(dir) {
  gameIndex = (gameIndex + dir + gameList.children.length) % gameList.children.length;
  updateGameList();
}

function selectGameAndNext() {
  selectedGame = gameList.children[gameIndex].dataset.value;
  gameSelectBox.textContent = displayGameName(selectedGame);
  setFocus(2);
}

// ========= 登録 =========
function submitRegistration() {
  const err = validateName(username);
  if (err) {
    nameError.textContent = err;
    nameError.style.display = "block";
    setFocus(0);
    return;
  }
  nameError.style.display = "none";

  const player = { name: username.trim(), game: selectedGame, timestamp: new Date().toISOString() };

  fetch('https://icdcgr8server-production.up.railway.app/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(player)
  })
    .then(res => res.json())
    .then(data => {
      resultBox.innerHTML = `<strong>${data.message}</strong>`;
      resultBox.style.display = 'block';
      setTimeout(() => history.back(), 1500);
    })
    .catch(err => {
      resultBox.innerHTML = `<strong style="color:red;">Error:</strong> ${err.message}`;
      resultBox.style.display = 'block';
    });
}

// ========= ヘルパー =========
function validateName(name) {
  const trimmed = name.trim();
  if (!trimmed) return "Please enter at least 1 character.";
  return "";
}

function displayGameName(key) {
  const map = { 'snake-game': 'Snake Game', 'tank-game': 'Tank Game' };
  return map[key] || key;
}

// 初期化
(function populateFromStorage() {
  const raw = localStorage.getItem('playerRegistration');
  if (raw) {
    const p = JSON.parse(raw);
    if (p.name) { username = p.name; nameInput.value = username; }
    if (p.game) { selectedGame = p.game; gameSelectBox.textContent = displayGameName(selectedGame); }
  }
})();
updateFocus();
