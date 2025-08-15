// ==== register.js (置き換え) ====
const nameInput = document.getElementById('playerName');
const gameSelectBox = document.getElementById('gameSelect');
const gameList = document.getElementById('gameList');
const musicSelectBox = document.getElementById('musicSelect');
const musicList = document.getElementById('musicList');
const submitBtn = document.getElementById('submitBtn');
const resultBox = document.getElementById('result');
const nameError = document.getElementById('nameError');
const vk = document.getElementById('virtualKeyboard');

const focusItems = [
  document.getElementById('usernameField'),
  document.getElementById('gameField'),
  document.getElementById('musicField'),
  document.getElementById('submitField')
];

let focusIndex = 0;
let vkRow = 0, vkCol = 0;
let typing = true;
let gameSelectMode = false;
let musicSelectMode = false;

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
    span.addEventListener("click", () => handleVirtualKeyPress(key, rIndex, cIndex));
    span.addEventListener("touchstart", (e) => { e.preventDefault(); handleVirtualKeyPress(key, rIndex, cIndex); });
    rowDiv.appendChild(span);
  });
  vk.appendChild(rowDiv);
});
vk.classList.remove("hidden");
const vkRows = vk.querySelectorAll(".vk-row");

// 入力状態
let username = "";
let selectedGame = "snake-game";
let selectedMusic = "classical";
gameSelectBox.textContent = displayGameName(selectedGame);
musicSelectBox.textContent = displayMusicName(selectedMusic);
let gameIndex = 0;
let musicIndex = 0;

// ===== 可視化（3x3パネル点灯）: MQTT/キーボード共通で使用 =====
function flashKeyPanel(key) {
  const panel = document.querySelector(`#keyVisualizer .panel[data-key="${key}"]`);
  if (!panel) return;
  panel.classList.add("active");
  setTimeout(() => panel.classList.remove("active"), 150);
}
// mqtt_receiver.js からも呼べるように
window.flashKeyPanel = flashKeyPanel;

// ===== 物理キーボード＆MQTTカスタムイベント → 共通ロジックへ =====
document.addEventListener("keydown", (e) => {
  const key = e.key.toLowerCase();
  if ("qweasdzxc".includes(key)) flashKeyPanel(key);
  handleLogicalKey(key);
});

// ★ 追加: ESP32→MQTT→Web の入力（カスタムイベント）を購読
document.addEventListener("menu-virtual-key", (e) => {
  const key = (e.detail && e.detail.key || "").toLowerCase();
  if (!key) return;
  if ("qweasdzxc".includes(key)) flashKeyPanel(key);
  handleLogicalKey(key);
});

// ====== 共通キー処理（ここに挙動を集約） ======
function handleLogicalKey(key) {
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
  } else if (musicSelectMode) {
    if (key === "w") moveMusicSelection(-1);
    else if (key === "x") moveMusicSelection(1);
    else if (key === "e") selectMusicAndNext();
    else if (key === "q") prevFocus();
  } else {
    if (key === "e") submitRegistration();
    else if (key === "q") prevFocus();
  }
}

// ========= クリック操作 =========
gameSelectBox.addEventListener("click", () => setFocus(1, { openGameSelector: true }));
gameSelectBox.addEventListener("touchstart", (e) => { e.preventDefault(); setFocus(1, { openGameSelector: true }); });
musicSelectBox.addEventListener("click", () => setFocus(2, { openMusicSelector: true }));
musicSelectBox.addEventListener("touchstart", (e) => { e.preventDefault(); setFocus(2, { openMusicSelector: true }); });

Array.from(gameList.children).forEach((item, idx) => {
  item.addEventListener("click", () => { gameIndex = idx; updateGameList(); selectGameAndNext(); });
  item.addEventListener("touchstart", (e) => { e.preventDefault(); gameIndex = idx; updateGameList(); selectGameAndNext(); });
});
Array.from(musicList.children).forEach((item, idx) => {
  item.addEventListener("click", () => { musicIndex = idx; updateMusicList(); selectMusicAndNext(); });
  item.addEventListener("touchstart", (e) => { e.preventDefault(); musicIndex = idx; updateMusicList(); selectMusicAndNext(); });
});

submitBtn.addEventListener("click", () => submitRegistration());
submitBtn.addEventListener("touchstart", (e) => { e.preventDefault(); submitRegistration(); });

// ========= フォーカス制御 =========
function updateFocus() {
  focusItems.forEach((el, i) => el.classList.toggle("active", i === focusIndex));
}
function setFocus(index, { openGameSelector = false, openMusicSelector = false } = {}) {
  focusIndex = index;
  typing = (focusIndex === 0);
  vk.classList.toggle("hidden", !typing);

  if (focusIndex === 1) {
    gameSelectMode = openGameSelector;
    musicSelectMode = false;
    if (openGameSelector) { syncGameIndexWithSelected(); gameList.classList.remove("hidden"); updateGameList(); }
    else { gameList.classList.add("hidden"); }
    musicList.classList.add("hidden");
  } else if (focusIndex === 2) {
    gameSelectMode = false;
    musicSelectMode = openMusicSelector;
    gameList.classList.add("hidden");
    if (openMusicSelector) { syncMusicIndexWithSelected(); musicList.classList.remove("hidden"); updateMusicList(); }
    else { musicList.classList.add("hidden"); }
  } else {
    gameSelectMode = false;
    musicSelectMode = false;
    gameList.classList.add("hidden");
    musicList.classList.add("hidden");
  }
  updateFocus();
  updateVK();
}
function prevFocus() {
  if (focusIndex === 0) return;
  if (focusIndex === 3) setFocus(2, { openMusicSelector: true });
  else if (focusIndex === 2) setFocus(1, { openGameSelector: true });
  else if (focusIndex === 1) setFocus(0);
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
  handleVirtualKeyPress(key);
}
function handleVirtualKeyPress(key) {
  if (key === "Enter") {
    const err = validateName(username);
    if (err) { nameError.textContent = err; nameError.style.display = "block"; return; }
    nameError.style.display = "none";
    setFocus(1, { openGameSelector: true });
  } else if (key === "Delete") {
    username = username.slice(0, -1);
    nameInput.value = username;
    if (username.trim().length > 0) nameError.style.display = "none";
  } else {
    username += key;
    nameInput.value = username;
    if (username.trim().length > 0) nameError.style.display = "none";
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
  const items = Array.from(gameList.children);
  items.forEach((el, i) => {
    el.classList.toggle("active", i === gameIndex);
    if (i === gameIndex) el.scrollIntoView({ block: "nearest", behavior: "smooth" });
  });
}
function moveGameSelection(dir) {
  gameIndex = (gameIndex + dir + gameList.children.length) % gameList.children.length;
  updateGameList();
}
function selectGameAndNext() {
  selectedGame = gameList.children[gameIndex].dataset.value;
  gameSelectBox.textContent = displayGameName(selectedGame);
  setFocus(2, { openMusicSelector: true });
}

// ========= 音楽選択 =========
function syncMusicIndexWithSelected() {
  const items = Array.from(musicList.children);
  const idx = items.findIndex(el => el.dataset.value === selectedMusic);
  musicIndex = idx >= 0 ? idx : 0;
}
function updateMusicList() {
  const items = Array.from(musicList.children);
  items.forEach((el, i) => {
    el.classList.toggle("active", i === musicIndex);
    if (i === musicIndex) el.scrollIntoView({ block: "nearest", behavior: "smooth" });
  });
}
function moveMusicSelection(dir) {
  musicIndex = (musicIndex + dir + musicList.children.length) % musicList.children.length;
  updateMusicList();
}
function selectMusicAndNext() {
  selectedMusic = musicList.children[musicIndex].dataset.value;
  musicSelectBox.textContent = displayMusicName(selectedMusic);
  setFocus(3);
}

// ========= 登録 =========
function submitRegistration() {
  const err = validateName(username);
  if (err) { nameError.textContent = err; nameError.style.display = "block"; setFocus(0); return; }
  nameError.style.display = "none";

  const player = { name: username.trim(), game: selectedGame, music: selectedMusic, timestamp: new Date().toISOString() };

  fetch('https://icdcgr8server-production.up.railway.app/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(player)
  })
  .then(res => {
    if (!res.ok) return res.text().then(t => { throw new Error(t || 'Registration failed'); });
    return res.json();
  })
  .then(data => {
    resultBox.innerHTML = `<strong>${data.message || 'Registration completed.'}</strong><br>You will be redirected to the top page in a few seconds...`;
    resultBox.style.display = 'block';
    setTimeout(() => { window.location.href = '../index.html'; }, 2000);
  })
  .catch(err => {
    resultBox.innerHTML = `<strong style="color:red;">Registration failed:</strong> ${err.message}`;
    resultBox.style.display = 'block';
  });
}

// ========= ヘルパー =========
function validateName(name) {
  const trimmed = name.trim();
  if (!trimmed) return "Please enter at least 1 character.";
  return "";
}
function displayMusicName(key) {
  const map = { 'classical': 'Classical', 'jazz': 'Jazz', 'rock': 'Rock', 'electronic': 'Electronic', 'ambient': 'Ambient' };
  return map[key] || key;
}
function displayGameName(key) {
  const map = { 'snake-game': 'Snake Game', 'tank-game': 'Tank Game', 'shooting-game': 'Shooting Game', 'basketball-game': 'Basketball Game'};
  return map[key] || key;
}

// 初期化
(function populateFromStorage() {
  const raw = localStorage.getItem('playerRegistration');
  if (raw) {
    const p = JSON.parse(raw);
    if (p.name) { username = p.name; nameInput.value = username; }
    if (p.game) {
      selectedGame = p.game;
      gameSelectBox.textContent = displayGameName(selectedGame);
      const gameItems = Array.from(gameList.children);
      const gameIdx = gameItems.findIndex(el => el.dataset.value === selectedGame);
      gameIndex = gameIdx >= 0 ? gameIdx : 0;
    }
    if (p.music) {
      selectedMusic = p.music;
      musicSelectBox.textContent = displayMusicName(selectedMusic);
      const musicItems = Array.from(musicList.children);
      const musicIdx = musicItems.findIndex(el => el.dataset.value === selectedMusic);
      musicIndex = musicIdx >= 0 ? musicIdx : 0;
    }
  }
  // 初期状態でリストは非表示
  gameList.classList.add('hidden');
  musicList.classList.add('hidden');
})();
updateFocus();
