const buttons = document.querySelectorAll(".menu-btn");
let currentIndex = 0;
const playerCountSpan = document.getElementById("playerCount");

const API_URL = "https://icdcgr8server-production.up.railway.app/players"; // players.json取得API

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
    playerCountSpan.textContent = data.length;
  } catch (err) {
    console.error(err);
    playerCountSpan.textContent = "Error";
  }
}

// キー操作
document.addEventListener("keydown", (e) => {
  if (e.key === "a" || e.key === "A") {
    currentIndex = (currentIndex - 1 + buttons.length) % buttons.length;
    updateHighlight();
  } else if (e.key === "d" || e.key === "D") {
    currentIndex = (currentIndex + 1) % buttons.length;
    updateHighlight();
  } else if (e.key === "w" || e.key === "W") {
    const link = buttons[currentIndex].dataset.link;
    window.location.href = link;
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
    window.location.href = link;
  });
});

// 初期処理
updateHighlight();
fetchPlayerCount();

// 一定間隔で人数更新（10秒ごと）
setInterval(fetchPlayerCount, 10000);
