/* =========================================================
   script.js (index.html 用)
   - 物理キーボード と MQTT 入力を統一的に処理
   - 可視化も同じ経路で実行
   ========================================================= */

/* ==========================
   メニュー操作用変数
   ========================== */
const buttons = document.querySelectorAll(".menu-btn");
let currentIndex = 0;
const playerCountSpan = document.getElementById("playerCount");
const aleartMessage = document.getElementById("alert");

const API_URL = "https://icdcgr8server-production.up.railway.app/players";
let playerCount = 0;

/* ==========================
   メニューのハイライト更新
   ========================== */
function updateHighlight() {
  buttons.forEach((btn, i) => {
    btn.classList.toggle("active", i === currentIndex);
  });
}

/* ==========================
   プレイヤー人数取得
   ========================== */
async function fetchPlayerCount() {
  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error("Failed to fetch player data");
    const data = await res.json();
    playerCount = data.length;
    playerCountSpan.textContent = playerCount;
  } catch (err) {
    console.error(err);
    playerCountSpan.textContent = "Error";
  }
}

/* ==========================
   ページ遷移処理（人数チェック付き）
   ========================== */
function tryNavigate(link) {
  if (link.includes("Roulette") && playerCount <= 1) {
    const need = 2 - playerCount;
    aleartMessage.textContent =
      `⚠️ At least 2 players are required to play the roulette. ${need} more player(s) needed.`;
    return;
  }
  window.location.href = link;
}

/* ==========================
   キー可視化（共通）
   ========================== */
function flashKeyPanel(key) {
  const panel = document.querySelector(`.key-panel[data-key="${key}"]`);
  if (panel) {
    panel.classList.add("active");
    setTimeout(() => panel.classList.remove("active"), 200);
  }
}

/* ==========================
   共通キー処理（物理/仮想どちらもここを通す）
   ========================== */
function handleMenuKeyUnified(rawKey) {
  const key = String(rawKey || "").toLowerCase();
  if (!["q","w","e","a","s","d","z","x","c"].includes(key)) return;

  flashKeyPanel(key);

  if (key === "a") {
    currentIndex = (currentIndex - 1 + buttons.length) % buttons.length;
    updateHighlight();
  } else if (key === "d") {
    currentIndex = (currentIndex + 1) % buttons.length;
    updateHighlight();
  } else if (key === "e") {
    const link = buttons[currentIndex].dataset.link;
    tryNavigate(link);
  } else if (key === "x") {
    fetchPlayerCount();
  }
}

/* ==========================
   入力ソース 1) 物理キーボード
   ========================== */
document.addEventListener("keydown", (e) => {
  document.dispatchEvent(new CustomEvent("menu-virtual-key", {
    detail: { key: e.key, source: "keyboard" }
  }));
});

/* ==========================
   入力ソース 2) MQTT（仮想）
   ========================== */
document.addEventListener("menu-virtual-key", (e) => {
  handleMenuKeyUnified(e.detail?.key);
});

/* ==========================
   マウスクリックでも遷移可能
   ========================== */
buttons.forEach((btn, i) => {
  btn.addEventListener("click", () => {
    currentIndex = i;
    updateHighlight();
    const link = btn.dataset.link;
    tryNavigate(link);
  });
});

/* ==========================
   Reset Input Mapping
   ========================== */
document.addEventListener('DOMContentLoaded', () => {
  const resetBtn = document.getElementById('resetMappingBtn');
  resetBtn.addEventListener('click', () => {
    window.inputMapping = [0,1,2,3,4,5,6,7,8]; // デフォルトに戻す
    localStorage.removeItem("inputMapping");
    alert('Input mapping has been reset to default.');
    console.log('window.inputMapping =', window.inputMapping);
  });

  // ページ入室時に音楽停止を指示
  if (window.mqttClient && window.mqttClient.connected) {
    window.mqttClient.publish("dance/playSong", "0");
    console.log("🛑 Sent stop music command");
  } else {
    console.warn("⚠️ MQTT client not ready, cannot stop music");
  }
});

/* ==========================
   初期処理
   ========================== */
updateHighlight();
fetchPlayerCount();
setInterval(fetchPlayerCount, 10000);
