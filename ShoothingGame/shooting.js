// URLパラメータ取得
const urlParams = new URLSearchParams(window.location.search);
let playerNames = urlParams.get('players')?.split(',') || ['Player1', 'Player2'];

// 最小2人、最大3人
playerNames = playerNames.slice(0, 3);
if (playerNames.length < 2) playerNames.push(`Player${playerNames.length + 1}`);

const MAX_PLAYERS = playerNames.length;


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

const playerColors = ['red', 'blue', 'green'];

for (let i = 0; i < MAX_PLAYERS; i++) {
  const player = document.createElement('div');
  player.classList.add('player');
  player.style.backgroundImage = `url('Images/player${i+1}.png')`;
  player.style.left = `${100 + i * 80}px`;
  gameArea.appendChild(player);

  // 名前ラベル
  const nameLabel = document.createElement('div');
  nameLabel.classList.add('playerName');
  nameLabel.textContent = playerNames[i];
  nameLabel.style.position = 'absolute';
  nameLabel.style.color = 'white';
  nameLabel.style.fontSize = '14px';
  nameLabel.style.textAlign = 'center';
  gameArea.appendChild(nameLabel);

  scores[`p${i+1}`] = 0;
  playerStatus[`p${i+1}`] = {
    alive: true,
    element: player,
    nameLabel: nameLabel, // 追加
    x: 100 + i * 80,
    canShoot: true,
    canMove: true
  };
}

// 画面下部にプレイヤーカラー四角を表示
const bottomBar = document.createElement('div');
bottomBar.style.position = 'absolute';
bottomBar.style.bottom = '0';
bottomBar.style.left = '0';
bottomBar.style.width = '100%';
bottomBar.style.height = '50px';
bottomBar.style.display = 'flex';
bottomBar.style.justifyContent = 'space-around';
bottomBar.style.alignItems = 'center';
bottomBar.style.backgroundColor = 'black'; // 任意で背景色
document.body.appendChild(bottomBar);

for (let i = 0; i < MAX_PLAYERS; i++) {
  const box = document.createElement('div');
  box.style.width = '50px';
  box.style.height = '30px';
  box.style.backgroundColor = playerColors[i];
  box.style.color = 'white';
  box.style.textAlign = 'center';
  box.style.lineHeight = '30px';
  box.textContent = playerNames[i];
  bottomBar.appendChild(box);
}


// スコア表示更新
function updateScoreBoard() {
  scoreBoardElement.textContent = Object.keys(scores)
    .map((key, idx) => `P${idx + 1}: ${scores[key]}`)
    .join(' | ');
}
updateScoreBoard();

// キー設定
const controls = {
  p1: { left: 'q', right: 'e', shoot: 'w' },
  p2: { left: 'z', right: 'c', shoot: 'x' },
  p3: { left: 'j', right: 'l', shoot: 'i' }
};

// 押下状態を記録するフラグ（★追加）
let keyPressed = {};

// プレイヤー操作（★変更）
document.addEventListener('keydown', (e) => {
  if (keyPressed[e.key]) return; // 押しっぱなし防止
  keyPressed[e.key] = true;

  Object.entries(playerStatus).forEach(([key, player]) => {
    if (!player.alive || !player.canMove) return;
    if (e.key === controls[key].left) player.x -= playerSpeed;
    if (e.key === controls[key].right) player.x += playerSpeed;
    if (e.key === controls[key].shoot && player.canShoot) shootBullet(player, key);
  });
});

document.addEventListener('keyup', (e) => {
  keyPressed[e.key] = false; // キーを離したら解除
});

// ==== 既存の keyPressed を使ってMQTT入力を反映 ====

// MQTT入力イベントを受け取る
document.addEventListener("menu-virtual-key", (e) => {
  const key = e.detail.key;     // 押されたキー（例: 'q', 'w', 'e' ...）
  const states = e.detail.states; // 9キー全体の状態
  const isDown = states[keyMap.indexOf(key)] === 1; // 1なら押下中

  // 押された瞬間
  if (isDown && !keyPressed[key]) {
    keyPressed[key] = true;
    Object.entries(playerStatus).forEach(([pKey, player]) => {
      if (!player.alive || !player.canMove) return;
      if (key === controls[pKey].left) player.x -= playerSpeed;
      if (key === controls[pKey].right) player.x += playerSpeed;
      if (key === controls[pKey].shoot && player.canShoot) shootBullet(player, pKey);
    });
  }

  // 離された瞬間
  if (!isDown && keyPressed[key]) {
    keyPressed[key] = false;
  }
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

// 敵生成（障害物画像）
function spawnEnemy() {
  const enemy = document.createElement('div');
  enemy.classList.add('enemy');
  enemy.style.left = `${Math.floor(Math.random() * (gameWidth - 30))}px`;
  enemy.style.top = '0px';
  enemy.style.backgroundImage = "url('Images/inseki1.png')";
  enemy.style.backgroundSize = "cover";
  enemy.style.backgroundPosition = "center";
  gameArea.appendChild(enemy);
  enemies.push(enemy);
}

// プレイヤー更新
function updatePlayers() {
  Object.values(playerStatus).forEach(player => {
    player.x = Math.max(0, Math.min(gameWidth - 30, player.x));
    player.element.style.left = `${player.x}px`;

    // 名前ラベルをロケット下に追従
    player.nameLabel.style.left = `${player.x}px`;
    player.nameLabel.style.bottom = '0px'; // ロケットの下
    player.nameLabel.style.width = '40px';
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
