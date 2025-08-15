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

  // 可視化は常に点灯（MQTT・物理どちらも）
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
  // 物理キーもカスタムイベントへ合流させる
  document.dispatchEvent(new CustomEvent("menu-virtual-key", {
    detail: { key: e.key, source: "keyboard" }
  }));
});

/* ==========================
   入力ソース 2) MQTT（仮想）
   - mqtt_receiver.js がこのイベントを発火します
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
   初期処理
   ========================== */
updateHighlight();
fetchPlayerCount();

// ※ マッピング初期化は必要なときだけ実施してください
// localStorage.removeItem("inputMapping");
// console.log("🗑️ inputMapping deleted");

setInterval(fetchPlayerCount, 10000);
