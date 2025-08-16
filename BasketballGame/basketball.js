const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

/* URLパラメータからプレイヤー名取得 */
const urlParams = new URLSearchParams(window.location.search);
let playerNames = urlParams.get("players")?.split(",") || ["Player1", "Player2"];
playerNames = playerNames.slice(0, 4); // 最大4人まで

/* ゴール位置・サイズ */
let HOOP_X = canvas.width - 240;
let HOOP_Y = 100;
let HOOP_W = 200;
let HOOP_H = 150;

/* 画像読み込み */
const ballImg = new Image();
ballImg.src = "Images/basketball.png";
const hoopImg = new Image();
hoopImg.src = "Images/hoop.png";

// プレイヤー画像を人数分読み込み
const playerImgs = playerNames.map((_, i) => {
  const img = new Image();
  img.src = `Images/player${i + 1}.png`;
  return img;
});

/* プレイヤー設定 */
let players = playerNames.map((name, index) => ({
  name: name,
  x: 100 + index * 200,
  y: canvas.height - 150,
  width: 80,
  height: 120,
  speed: 4,
  moving: false,
  direction: 1,
  score: 0,
  controls: { move: index === 0 ? "KeyQ" : index === 1 ? "KeyE" : index === 2 ? "KeyS" : "KeyZ",
              action: index === 0 ? "KeyW" : index === 1 ? "KeyA" : index === 2 ? "KeyD" : "KeyX" },
  phase: "moveX",
  angle: Math.PI / 4,
  ball: null,
  sKeyPressed: false
}));

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
        p.ball.x > topSensor.x - 10 &&
        p.ball.x < topSensor.x + topSensor.w + 10 &&
        p.ball.y > topSensor.y - 10 &&
        p.ball.y < topSensor.y + topSensor.h + 10 &&
        p.ball.vy > 0
      ) {
        p.score += 1;
        scoreMessage = `Nice Shot! ${p.name}`;
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

/* メッセージ用アルファ値 */
let messageAlpha = 0;

/* 更新処理 */
function update() {
  updateSensors();
  players.forEach(p => {
    // ...既存処理...
  });

  if (messageTimer > 0) {
    messageTimer--;
    messageAlpha = Math.min(1, messageAlpha + 0.05);
  } else {
    messageAlpha = Math.max(0, messageAlpha - 0.05);
  }
}

/* 描画処理 */
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(hoopImg, HOOP_X, HOOP_Y, HOOP_W, HOOP_H);

  /* スコアボード */
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(10, 10, 200, 50 + players.length * 30);
  ctx.font = "18px 'Orbitron'";
  ctx.fillStyle = "white";
  ctx.textAlign = "left";
  ctx.fillText("SCORE", 20, 35);

  players.forEach((p, i) => {
    ctx.fillText(`${p.name}: ${p.score}`, 20, 70 + i*30);
  });

  /* タイマー（円形） */
  const cx = canvas.width - 80, cy = 80, r = 40;
  ctx.beginPath();
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 8;
  ctx.arc(cx, cy, r, -Math.PI/2, -Math.PI/2 + (gameTime/30)*2*Math.PI);
  ctx.stroke();
  ctx.font = "20px 'Press Start 2P'";
  ctx.fillStyle = "white";
  ctx.textAlign = "center";
  ctx.fillText(gameTime, cx, cy+8);

  /* プレイヤー描画 */
  players.forEach((p, i) => {
    ctx.drawImage(playerImgs[i], p.x, p.y, p.width, p.height);
    ctx.font = "16px 'Orbitron'";
    ctx.fillStyle = "yellow";
    ctx.textAlign = "center";
    ctx.fillText(p.name, p.x + p.width/2, p.y + p.height + 20);
  });

  /* ボールと角度ガイド */
  players.forEach(p => {
    if (p.ball) {
      ctx.drawImage(ballImg, p.ball.x - p.ball.radius, p.ball.y - p.ball.radius, p.ball.radius*2, p.ball.radius*2);
    }
    if (p.phase === "angleSelect") {
      ctx.strokeStyle = "orange";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p.x + p.width/2, p.y);
      ctx.lineTo(
        p.x + p.width/2 + 100 * Math.cos(p.angle),
        p.y - 100 * Math.sin(p.angle)
      );
      ctx.stroke();
    }
  });

  /* メッセージ */
  if (messageAlpha > 0) {
    ctx.font = "40px 'Press Start 2P'";
    ctx.fillStyle = `rgba(255,165,0,${messageAlpha})`;
    ctx.textAlign = "center";
    ctx.fillText(scoreMessage, canvas.width / 2, 150);
  }

  /* Game Over画面 */
  if (gameOver) {
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = "60px 'Orbitron'";
    ctx.fillStyle = "red";
    ctx.textAlign = "center";
    ctx.fillText("GAME OVER", canvas.width/2, canvas.height/2 - 100);

    let ranking = [...players].map((p) => ({player: p.name, score: p.score}))
      .sort((a, b) => b.score - a.score);

    ranking.forEach((r, i) => {
      ctx.font = "28px 'Orbitron'";
      ctx.fillStyle = i === 0 ? "gold" : "white";
      ctx.fillText(`${i+1}. ${r.player} - ${r.score}`, canvas.width/2, canvas.height/2 + i*40);
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
