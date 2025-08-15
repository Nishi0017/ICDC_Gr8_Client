const buttons = document.querySelectorAll(".menu-btn");
let currentIndex = 0;
const playerCountSpan = document.getElementById("playerCount");

const API_URL = "https://icdcgr8server-production.up.railway.app/players"; // players.json取得API
let playerCount = 0; // ← 現在の人数を保持

function updateHighlight() {
  buttons.forEach((btn, i) => {
    btn.classList.toggle("active", i === currentIndex);
  });
}

 

// プレイヤー人数取得
async function fetchPlayerCount() {
  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error("Failed to fetch player data");
    const data = await res.json();
    playerCount = data.length; // ← 保持
    playerCountSpan.textContent = playerCount;
  } catch (err) {
    console.error(err);
    playerCountSpan.textContent = "Error";
  }
}

const aleartMessage = document.getElementById("alert");

// ページ遷移処理（人数チェック付き）
function tryNavigate(link) {
  if (link.includes("Roulette") && playerCount <= 1) {
    const need = 2 - playerCount;
    aleartMessage.textContent = `⚠️ At least 2 players are required to play the roulette. ${need} more player(s) needed.`;
    return;
  }
  window.location.href = link;
}

// キー操作
document.addEventListener("keydown", (e) => {
  if (e.key === "a" || e.key === "A") {
    currentIndex = (currentIndex - 1 + buttons.length) % buttons.length;
    updateHighlight();
  } else if (e.key === "d" || e.key === "D") {
    currentIndex = (currentIndex + 1) % buttons.length;
    updateHighlight();
  } else if (e.key === "e" || e.key === "E") {
    const link = buttons[currentIndex].dataset.link;
    tryNavigate(link);
  } else if (e.key === "x" || e.key === "X") {
    fetchPlayerCount();
  }
});

// マウスクリックでも遷移可能
buttons.forEach((btn, i) => {
  btn.addEventListener("click", () => {
    currentIndex = i;
    updateHighlight();
    const link = btn.dataset.link;
    tryNavigate(link);
  });
});

// ==== キー可視化処理 ====
const keyPanels = document.querySelectorAll(".key-panel");

function flashKeyPanel(key) {
  const panel = document.querySelector(`.key-panel[data-key="${key}"]`);
  if (panel) {
    panel.classList.add("active");
    setTimeout(() => {
      panel.classList.remove("active");
    }, 200);
  }
}

document.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  if (["q", "w", "e", "a", "s", "d", "z", "x", "c"].includes(k)) {
    flashKeyPanel(k);
  }
});


// 初期処理
updateHighlight();
fetchPlayerCount();

// キーマッピングの初期化
localStorage.removeItem("inputMapping");
console.log("🗑️ inputMapping deleted");


// 一定間隔で人数更新（10秒ごと）
setInterval(fetchPlayerCount, 10000);

