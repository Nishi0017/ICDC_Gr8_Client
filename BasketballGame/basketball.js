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
playerImg.src = "Images/player.png";
const ballImg = new Image();
ballImg.src = "Images/basketball.png";
const hoopImg = new Image();
hoopImg.src = "Images/hoop.png";

/* 複数プレイヤー設定 */
let players = [
  { x: 100, y: canvas.height - 150, width: 80, height: 120, speed: 4, moving: false, direction: 1, score: 0, controls: { move: "KeyA", action: "KeyS" }, phase: "moveX", angle: Math.PI / 4, ball: null, sKeyPressed: false },
  { x: 300, y: canvas.height - 150, width: 80, height: 120, speed: 4, moving: false, direction: 1, score: 0, controls: { move: "KeyK", action: "KeyL" }, phase: "moveX", angle: Math.PI / 4, ball: null, sKeyPressed: false }
];

/* 当たり判定センサー */
let topSensor, leftWall, rightWall, bottomWall;

/* タイマー */
let gameTime = 30;
let timerInterval;
let gameOver = false;

let scoreMessage = "";
let messageTimer = 0;

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
  players.forEach(p => {
    if (e.code === p.controls.move) {
      p.moving = true;
    }
    if (e.code === p.controls.action && !p.sKeyPressed) {
      p.sKeyPressed = true;
      if (p.phase === "moveX") {
        p.moving = false;
        p.phase = "angleSelect";
      } else if (p.phase === "angleSelect") {
        const clamped = Math.max(0.01, Math.min(Math.PI - 0.01, p.angle));
        p.angle = clamped;
        p.ball = {
          x: p.x + p.width / 2,
          y: p.y,
          vx: 10 * Math.cos(p.angle),
          vy: -10 * Math.sin(p.angle),
          radius: 20,
        };
        p.phase = "shoot";
      }
    }
  });
});

document.addEventListener("keyup", (e) => {
  players.forEach(p => {
    if (e.code === p.controls.move) {
      p.moving = false;
    }
    if (e.code === p.controls.action) {
      p.sKeyPressed = false;
    }
  });
});

/* 更新処理 */
function update() {
  updateSensors();
  players.forEach(p => {
    if (p.phase === "moveX" && p.moving) {
      p.x += p.speed * p.direction;
      if (p.x < 0 || p.x + p.width > canvas.width) {
        p.direction *= -1;
      }
    }

    if (p.phase === "angleSelect" && p.moving) {
      p.angle += 0.02;
      if (p.angle >= Math.PI) p.angle = 0.02;
    }

    if (p.phase === "shoot" && p.ball) {
      p.ball.x += p.ball.vx;
      p.ball.y += p.ball.vy;
      p.ball.vy += 0.08;

      if (
        p.ball.x > topSensor.x &&
        p.ball.x < topSensor.x + topSensor.w &&
        p.ball.y > topSensor.y &&
        p.ball.y < topSensor.y + topSensor.h &&
        p.ball.vy > 0
      ) {
        p.score += 1;
        scoreMessage = `Nice Shot! Player ${players.indexOf(p)+1}`;
        messageTimer = 60;
        resetPlayer(p);
        return;
      }

      if (
        (p.ball.x > leftWall.x && p.ball.x < leftWall.x + leftWall.w &&
         p.ball.y > leftWall.y && p.ball.y < leftWall.y + leftWall.h) ||
        (p.ball.x > rightWall.x && p.ball.x < rightWall.x + rightWall.w &&
         p.ball.y > rightWall.y && p.ball.y < rightWall.y + rightWall.h)
      ) {
        p.ball.vx *= -0.5;
      }

      if (
        p.ball.x > bottomWall.x && p.ball.x < bottomWall.x + bottomWall.w &&
        p.ball.y > bottomWall.y && p.ball.y < bottomWall.y + bottomWall.h
      ) {
        p.ball.vy *= -0.5;
      }

      if (p.ball.y > canvas.height) {
        resetPlayer(p);
      }
    }
  });

  if (messageTimer > 0) {
    messageTimer--;
  }
}

function resetPlayer(p) {
  p.ball = null;
  p.phase = "moveX";
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

  players.forEach(p => {
    if (p.ball) {
      ctx.drawImage(ballImg, p.ball.x - p.ball.radius, p.ball.y - p.ball.radius, p.ball.radius*2, p.ball.radius*2);
    }
    if (p.phase === "angleSelect") {
      ctx.beginPath();
      ctx.moveTo(p.x + p.width / 2, p.y);
      ctx.lineTo(
        p.x + p.width / 2 + 100 * Math.cos(p.angle),
        p.y - 100 * Math.sin(p.angle)
      );
      ctx.stroke();
    }
  });

  ctx.font = "24px Arial";
  ctx.fillStyle = "black";
  ctx.fillText("Time: " + gameTime, canvas.width - 160, 40);

  if (messageTimer > 0) {
    ctx.font = "32px Arial";
    ctx.fillStyle = "rgb(255,100,0)";
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
