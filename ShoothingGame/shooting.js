const MAX_PLAYERS = 3; // ★ここを1〜3に変更するだけで人数調整可能 

const gameArea = document.getElementById('gameArea');
const gameOverText = document.getElementById('gameOver');
const timerElement = document.getElementById('timer');
const scoreBoardElement = document.getElementById('scoreBoard');

const gameWidth = 400;
const playerSpeed = 10;
const bulletSpeed = 5;
const enemySpeed = 2;

let bullets = [];
let enemies = [];
let timeLeft = 60; // 制限時間（秒）

let scores = {};
let playerStatus = {};

// プレイヤー生成
for (let i = 1; i <= MAX_PLAYERS; i++) {
  const player = document.createElement('div');
  player.classList.add('player');
  player.style.backgroundImage = `url('player${i}.png')`;
  player.style.left = `${100 + (i - 1) * 80}px`;
  gameArea.appendChild(player);

  scores[`p${i}`] = 0;
  playerStatus[`p${i}`] = {
    alive: true,
    element: player,
    x: 100 + (i - 1) * 80,
    canShoot: true,
    canMove: true
  };
}

// スコア表示更新
function updateScoreBoard() {
  scoreBoardElement.textContent = Object.keys(scores)
    .map((key, idx) => `P${idx + 1}: ${scores[key]}`)
    .join(' | ');
}
updateScoreBoard();

// キー設定（プレイヤーごとに操作キー割り当て）
const controls = {
  p1: { left: 'q', right: 'e', shoot: 'w' },
  p2: { left: 'z', right: 'c', shoot: 'x' },
  p3: { left: 'j', right: 'l', shoot: 'i' }
};

// プレイヤー操作
document.addEventListener('keydown', (e) => {
  Object.entries(playerStatus).forEach(([key, player]) => {
    if (!player.alive || !player.canMove) return;
    if (e.key === controls[key].left) player.x -= playerSpeed;
    if (e.key === controls[key].right) player.x += playerSpeed;
    if (e.key === controls[key].shoot && player.canShoot) shootBullet(player, key);
  });
});

// 弾発射
function shootBullet(player, owner) {
  const bullet = document.createElement('div');
  bullet.classList.add('bullet');
  bullet.style.left = `${player.x + 12}px`;
  bullet.style.bottom = '40px';
  bullet.dataset.owner = owner;
  gameArea.appendChild(bullet);
  bullets.push(bullet);
}

// 敵生成
function spawnEnemy() {
  const enemy = document.createElement('div');
  enemy.classList.add('enemy');
  enemy.style.left = `${Math.floor(Math.random() * (gameWidth - 30))}px`;
  enemy.style.top = '0px';
  gameArea.appendChild(enemy);
  enemies.push(enemy);
}

// プレイヤー更新
function updatePlayers() {
  Object.values(playerStatus).forEach(player => {
    player.x = Math.max(0, Math.min(gameWidth - 30, player.x));
    player.element.style.left = `${player.x}px`;
  });
}

// 弾更新
function updateBullets() {
  bullets.forEach((bullet, i) => {
    const bottom = parseInt(bullet.style.bottom);
    bullet.style.bottom = `${bottom + bulletSpeed}px`;
    if (bottom > 600) {
      gameArea.removeChild(bullet);
      bullets.splice(i, 1);
    }
  });
}

// 敵更新
function updateEnemies() {
  enemies.forEach((enemy, i) => {
    let top = parseInt(enemy.style.top);
    enemy.style.top = `${top + enemySpeed}px`;

    // 弾との衝突
    bullets.forEach((bullet, j) => {
      if (isColliding(bullet, enemy)) {
        let owner = bullet.dataset.owner;
        scores[owner] += 5;
        updateScoreBoard();
        gameArea.removeChild(enemy);
        gameArea.removeChild(bullet);
        enemies.splice(i, 1);
        bullets.splice(j, 1);
      }
    });

    // プレイヤーとの衝突
    for (const key in playerStatus) {
      const player = playerStatus[key];
      if (player.alive && isColliding(enemy, player.element)) {
        freezePlayer(key, 3000);
        gameArea.removeChild(enemy);
        enemies.splice(i, 1);
      }
    }

    if (top > 600) {
      gameArea.removeChild(enemy);
      enemies.splice(i, 1);
    }
  });
}

// 当たり判定
function isColliding(a, b) {
  const rect1 = a.getBoundingClientRect();
  const rect2 = b.getBoundingClientRect();
  return !(
    rect1.right < rect2.left ||
    rect1.left > rect2.right ||
    rect1.bottom < rect2.top ||
    rect1.top > rect2.bottom
  );
}

// プレイヤーを一定時間動けなくする
function freezePlayer(playerKey, duration) {
  let player = playerStatus[playerKey];
  player.canMove = false;
  player.canShoot = false;
  player.element.style.opacity = '0.5';
  setTimeout(() => {
    player.canMove = true;
    player.canShoot = true;
    player.element.style.opacity = '1';
  }, duration);
}

// ゲーム終了
function endGame() {
  clearInterval(gameLoop);
  clearInterval(spawnLoop);
  clearInterval(timerInterval);

  let winner = '';
  const maxScore = Math.max(...Object.values(scores));
  const winners = Object.keys(scores).filter(k => scores[k] === maxScore);

  if (winners.length === 1) {
    winner = `🎉 Player ${winners[0].slice(1)} 勝利！ 🎉`;
  } else {
    winner = `🤝 引き分け！ 🤝`;
  }

  gameOverText.textContent = `${winner}\n(${Object.entries(scores).map(([k, v], idx) => `P${idx + 1}: ${v}`).join(' / ')})`;
  gameOverText.hidden = false;
}

// メインループ
const gameLoop = setInterval(() => {
  updatePlayers();
  updateBullets();
  updateEnemies();
}, 30);

// 敵出現ループ
const spawnLoop = setInterval(spawnEnemy, 1500);

// タイマー処理（1分制限）
const timerInterval = setInterval(() => {
  timeLeft--;
  timerElement.textContent = timeLeft;
  if (timeLeft <= 0) endGame();
}, 1000);
