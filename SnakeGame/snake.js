const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const resultText = document.getElementById("result");

const gridSize = 20;
const tileCount = canvas.width / gridSize;

let players = [];
let gameLoop = null;

const directions = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 }
};

const playerConfigs = [
  { color: 'lime', keys: { left: 'q', right: 'w' }, startX: 5, startY: 5, dir: 'right' },
  { color: 'red', keys: { left: 'e', right: 'a' }, startX: 25, startY: 25, dir: 'left' },
  { color: 'blue', keys: { left: 's', right: 'd' }, startX: 5, startY: 25, dir: 'right' },
  { color: 'yellow', keys: { left: 'z', right: 'x' }, startX: 25, startY: 5, dir: 'left' }
];

function createPlayer(config, name) {
  return {
    name: name,
    color: config.color,
    body: [{ x: config.startX, y: config.startY }],
    dir: config.dir,
    keys: config.keys,
    alive: true,
    growCounter: 0,
    cause: null
  };
}

function startGame(playerNames) {
  players = [];
  clearInterval(gameLoop);
  resultText.innerHTML = "";

  for (let i = 0; i < playerNames.length; i++) {
    players.push(createPlayer(playerConfigs[i], playerNames[i]));
  }

  document.addEventListener('keydown', handleKey);
  gameLoop = setInterval(() => {
    update();
    draw();
  }, 400); // スピードを遅く
}

// 既存の handleKey を修正
function handleKey(key) {
  players.forEach(p => {
    if (!p.alive) return;
    if (key === p.keys.left) turn(p, -1);
    else if (key === p.keys.right) turn(p, 1);
  });
}

// キーボード入力用
document.addEventListener('keydown', e => handleKey(e.key));

// MQTT入力用（mqtt_receiver.jsが発火するカスタムイベント）
document.addEventListener("menu-virtual-key", e => {
  handleKey(e.detail.key);
});


function turn(player, dirChange) {
  const dirs = ['up', 'right', 'down', 'left'];
  let idx = dirs.indexOf(player.dir);
  idx = (idx + dirChange + 4) % 4;
  player.dir = dirs[idx];
}

function update() {
  players.forEach(player => {
    if (!player.alive) return;

    const head = player.body[0];
    const move = directions[player.dir];
    const newHead = { x: head.x + move.x, y: head.y + move.y };

    // 壁衝突
    if (newHead.x < 0 || newHead.x >= tileCount ||
        newHead.y < 0 || newHead.y >= tileCount) {
      player.alive = false;
      player.cause = 'wall';
      return;
    }

    // 他プレイヤーや自分の体衝突
    for (let p of players) {
      for (let b of p.body) {
        if (b.x === newHead.x && b.y === newHead.y) {
          player.alive = false;
          player.cause = 'body';
          return;
        }
      }
    }

    player.body.unshift(newHead);
    player.growCounter++;
    if (player.growCounter % 20 !== 0) {
      player.body.pop();
    }
  });

  // 勝敗チェック
  const alivePlayers = players.filter(p => p.alive);
  if (alivePlayers.length <= 1) {
    clearInterval(gameLoop);
    draw();
    setTimeout(showRanking, 500);
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  players.forEach(player => {
    if (!player.alive) return;

    // スネーク描画
    ctx.fillStyle = player.color;
    player.body.forEach(segment => {
      ctx.fillRect(segment.x * gridSize, segment.y * gridSize, gridSize, gridSize);
    });

    // プレイヤーネーム描画（頭の位置の上）
    ctx.fillStyle = "white"; // 黒だと背景と混ざるので白に
    ctx.font = "14px Arial";
    ctx.textAlign = "center";
    ctx.fillText(player.name, head.x * gridSize + gridSize / 2, head.y * gridSize - 5);

  });
}

function showRanking() {
  let rankingData = players.map(p => ({
    player: p,
    alive: p.alive,
    length: p.body.length,
    cause: p.cause
  }));

  rankingData.sort((a, b) => {
    if (a.alive && !b.alive) return -1;
    if (!a.alive && b.alive) return 1;
    if (b.length !== a.length) return b.length - a.length;
    if (a.cause === 'wall' && b.cause !== 'wall') return 1;
    if (b.cause === 'wall' && a.cause !== 'wall') return -1;
    return 0;
  });

  let rank = 1;
  rankingData.forEach((item, i) => {
    if (i > 0) {
      let prev = rankingData[i - 1];
      if (
        item.alive !== prev.alive ||
        item.length !== prev.length ||
        item.cause !== prev.cause
      ) {
        rank = i + 1;
      }
    }
    item.rank = rank;
  });

  let displayOrder = [...rankingData].reverse();
  resultText.innerHTML = "";

  displayOrder.forEach((entry, index) => {
    setTimeout(() => {
      let div = document.createElement("div");
      div.classList.add("rank-item", `rank-${entry.rank}`);
      div.textContent = `${entry.rank}位: ${entry.player.name}`;
      resultText.prepend(div);
      setTimeout(() => div.classList.add("show"), 50);
    }, index * 1200);
  });
}

// カウントダウンを表示してからゲーム開始
// カウントダウンを表示してからゲーム開始
function countdownAndStart(playerNames) {
  let count = 3;
  const countdownInterval = setInterval(() => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 数字を白で表示
    ctx.fillStyle = "white";
    ctx.font = "72px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(count, canvas.width / 2, canvas.height / 2);

    count--;
    if (count < 0) {
      clearInterval(countdownInterval);
      startGame(playerNames);
    }
  }, 1000);
}


// URLパラメータからプレイヤー名取得してカウントダウン開始
(function initFromParams() {
  const params = new URLSearchParams(window.location.search);
  const playersParam = params.get("players");
  if (playersParam) {
    const playerNames = playersParam.split(",").map(name => decodeURIComponent(name));
    countdownAndStart(playerNames);
  }
})();
