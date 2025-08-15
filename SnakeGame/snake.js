const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const resultText = document.getElementById("result");

const gridSize = 20;
const tileCount = canvas.width / gridSize;

let players = [];
const maxPlayers = 4;
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

// プレイヤー作成
function createPlayer(config) {
  return {
    color: config.color,
    body: [{ x: config.startX, y: config.startY }],
    dir: config.dir,
    keys: config.keys,
    alive: true,
    growCounter: 0,
    cause: null
  };
}

// 初期化
for (let i = 0; i < maxPlayers; i++) {
  players.push(createPlayer(playerConfigs[i]));
}

document.addEventListener('keydown', handleKey);

function handleKey(e) {
  players.forEach(p => {
    if (!p.alive) return;
    const leftKey = p.keys.left;
    const rightKey = p.keys.right;

    if (e.key === leftKey) {
      turn(p, -1);
    } else if (e.key === rightKey) {
      turn(p, 1);
    }
  });
}

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

    // 自分 or 他人の体に衝突
    for (let p of players) {
      for (let b of p.body) {
        if (b.x === newHead.x && b.y === newHead.y) {
          player.alive = false;
          player.cause = 'body';
          return;
        }
      }
    }

    // 成長処理
    player.body.unshift(newHead);
    player.growCounter++;
    if (player.growCounter % 20 !== 0) { // 3秒ごとに成長
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
    ctx.fillStyle = player.color;
    for (let segment of player.body) {
      ctx.fillRect(segment.x * gridSize, segment.y * gridSize, gridSize, gridSize);
    }
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
      div.textContent = `${entry.rank}位: ${entry.player.color}`;
      resultText.prepend(div);
      setTimeout(() => div.classList.add("show"), 50);
      // 効果音例（任意）
      // new Audio("sounds/rank.mp3").play();
    }, index * 1200);
  });
}

const gameLoop = setInterval(() => {
  update();
  draw();
}, 150);
