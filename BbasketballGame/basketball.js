const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

/* ゴール位置・サイズ */
let HOOP_X = canvas.width - 240;
let HOOP_Y = 100;
let HOOP_W = 200;
let HOOP_H = 150;

/* 画像読み込み */
const playerImg = new Image();
playerImg.src = "player.png";
const ballImg = new Image();
ballImg.src = "basketball.png";
const hoopImg = new Image();
hoopImg.src = "hoop.png";

/* 複数プレイヤー設定 */
let players = [
  { x: 100, y: canvas.height - 150, width: 80, height: 120, speed: 4, moving: false, direction: 1, score: 0, controls: { move: "KeyA", action: "KeyS" } },
  { x: 300, y: canvas.height - 150, width: 80, height: 120, speed: 4, moving: false, direction: 1, score: 0, controls: { move: "KeyK", action: "KeyL" } }
];
let currentPlayerIndex = 0;

/* ボール・ゲーム状態 */
let ball = null;
let phase = "moveX"; // moveX, angleSelect, shoot
let angle = Math.PI / 4;
let scoreMessage = "";
let messageTimer = 0;

/* タイマー */
let gameTime = 30;
let timerInterval;
let gameOver = false;

let sKeyPressed = false;

/* 当たり判定センサー */
let topSensor, leftWall, rightWall, bottomWall;

function startTimer() {
  timerInterval = setInterval(() => {
    gameTime--;
    if (gameTime <= 0) {
      gameTime = 0;
      clearInterval(timerInterval);
      gameOver = true;
    }
  }, 1000);
}

function updateSensors() {
  const rimTopY = HOOP_Y + HOOP_H * 0.4;
  const rimBottomY = rimTopY + HOOP_H * 0.6;
  const rimLeftX = HOOP_X + HOOP_W * 0.2;
  const rimRightX = HOOP_X + HOOP_W * 0.65;
  const topBarX = HOOP_X + HOOP_W * 0.2;
  const barW = HOOP_W * 0.4;

  topSensor  = { x: topBarX,    y: rimTopY,    w: barW, h: 5 };
  leftWall   = { x: rimLeftX,   y: rimTopY+10, w: 5,    h: rimBottomY - rimTopY };
  rightWall  = { x: rimRightX,  y: rimTopY-40, w: 5,    h: rimBottomY - rimTopY + 27 };
  bottomWall = { x: topBarX+10, y: rimBottomY-15, w: barW, h: 5 };
}

/* 画面リサイズ対応 */
window.addEventListener("resize", () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  HOOP_X = canvas.width - 240;
  players.forEach(p => p.y = canvas.height - 150);
  updateSensors();
});

/* 操作 */
document.addEventListener("keydown", (e) => {
  if (gameOver) return;
  const p = players[currentPlayerIndex];

  if (e.code === p.controls.move) {
    p.moving = true;
  }

  if (e.code === p.controls.action && !sKeyPressed) {
    sKeyPressed = true;
    if (phase === "moveX") {
      p.moving = false;
      phase = "angleSelect";
    } else if (phase === "angleSelect") {
      const clamped = Math.max(0.01, Math.min(Math.PI - 0.01, angle));
      angle = clamped;
      ball = {
        x: p.x + p.width / 2,
        y: p.y,
        vx: 10 * Math.cos(angle),
        vy: -10 * Math.sin(angle),
        radius: 20,
      };
      phase = "shoot";
    }
  }
});

document.addEventListener("keyup", (e) => {
  const p = players[currentPlayerIndex];
  if (e.code === p.controls.move) {
    p.moving = false;
  }
  if (e.code === p.controls.action) {
    sKeyPressed = false;
  }
});

/* 更新処理 */
function update() {
  updateSensors();
  const p = players[currentPlayerIndex];

  if (phase === "moveX" && p.moving) {
    p.x += p.speed * p.direction;
    if (p.x < 0 || p.x + p.width > canvas.width) {
      p.direction *= -1;
    }
  }

  if (phase === "angleSelect" && p.moving) {
    angle += 0.02;
    if (angle >= Math.PI) angle = 0.02;
  }

  if (phase === "shoot" && ball) {
    ball.x += ball.vx;
    ball.y += ball.vy;
    ball.vy += 0.08;

    if (
      ball.x > topSensor.x &&
      ball.x < topSensor.x + topSensor.w &&
      ball.y > topSensor.y &&
      ball.y < topSensor.y + topSensor.h &&
      ball.vy > 0
    ) {
      p.score += 1;
      scoreMessage = `Nice Shot! Player ${currentPlayerIndex+1}`;
      messageTimer = 60;
      nextPlayer();
      return;
    }

    if (
      (ball.x > leftWall.x && ball.x < leftWall.x + leftWall.w &&
       ball.y > leftWall.y && ball.y < leftWall.y + leftWall.h) ||
      (ball.x > rightWall.x && ball.x < rightWall.x + rightWall.w &&
       ball.y > rightWall.y && ball.y < rightWall.y + rightWall.h)
    ) {
      ball.vx *= -0.5;
    }

    if (
      ball.x > bottomWall.x && ball.x < bottomWall.x + bottomWall.w &&
      ball.y > bottomWall.y && ball.y < bottomWall.y + bottomWall.h
    ) {
      ball.vy *= -0.5;
    }

    if (ball.y > canvas.height) {
      nextPlayer();
    }
  }

  if (messageTimer > 0) {
    messageTimer--;
  }
}

/* プレイヤー交代 */
function nextPlayer() {
  ball = null;
  phase = "moveX";
  currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
}

/* 描画処理 */
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(hoopImg, HOOP_X, HOOP_Y, HOOP_W, HOOP_H);

  players.forEach((p, i) => {
    ctx.drawImage(playerImg, p.x, p.y, p.width, p.height);
    ctx.font = "20px Arial";
    ctx.fillStyle = "black";
    ctx.fillText(`P${i+1}: ${p.score}`, 20, 80 + i*30);
  });

  if (ball) {
    ctx.drawImage(ballImg, ball.x - ball.radius, ball.y - ball.radius, ball.radius*2, ball.radius*2);
  }

  if (phase === "angleSelect") {
    const p = players[currentPlayerIndex];
    ctx.beginPath();
    ctx.moveTo(p.x + p.width / 2, p.y);
    ctx.lineTo(
      p.x + p.width / 2 + 100 * Math.cos(angle),
      p.y - 100 * Math.sin(angle)
    );
    ctx.stroke();
  }

  ctx.font = "24px Arial";
  ctx.fillStyle = "black";
  ctx.fillText("Time: " + gameTime, canvas.width - 160, 40);

  if (messageTimer > 0) {
    ctx.font = "32px Arial";
    ctx.fillStyle = "orange";
    ctx.fillText(scoreMessage, canvas.width / 2 - 150, 100);
  }

  if (gameOver) {
    ctx.font = "48px Arial";
    ctx.fillStyle = "red";
    ctx.fillText("Game Over", canvas.width / 2 - 150, canvas.height / 2 - 50);

    let ranking = [...players].map((p, i) => ({player: i+1, score: p.score}))
      .sort((a, b) => b.score - a.score);

    ranking.forEach((r, i) => {
      ctx.fillStyle = "black";
      ctx.fillText(`${i+1}位: Player ${r.player} - ${r.score}点`, canvas.width / 2 - 150, canvas.height / 2 + 50 + i*40);
    });
  }
}

/* メインループ */
function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

/* ゲーム開始 */
window.onload = () => {
  updateSensors();
  startTimer();
  gameLoop();
};
