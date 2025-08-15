// ==========================
// Canvas の初期設定
// ==========================
const canvas = document.getElementById('gameCanvas'); 
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// ==========================
// 戦車の画像読み込み
// ==========================
const tankImg1 = new Image();
tankImg1.src = 'images/tank1-body.png';
const tankImg2 = new Image();
tankImg2.src = 'images/tank2-body.png';

const turretImg1 = new Image();
turretImg1.src = 'images/tank1-kuti.png';
const turretImg2 = new Image();
turretImg2.src = 'images/tank2-kuti.png';

// ==========================
// プレイヤー名取得
// ==========================
const urlParams = new URLSearchParams(window.location.search);
const players = (urlParams.get('players') || "").split(',').filter(p => p);
// 2名固定なので
const player1Name = players[0] || "PLAYER 1";
const player2Name = players[1] || "PLAYER 2";


// ==========================
// 定数設定
// ==========================
const GRAVITY = 0.05;

// ==========================
// 戦車クラス
// ==========================
class Tank {
  constructor(x, img, turretImg, controls, flipped = false, name = "PLAYER") {
    this.x = x;
    this.y = canvas.height - 70;
    this.width = 125;
    this.height = 80;
    this.img = img;
    this.flipped = flipped;

    this.speed = 3;

    this.turretPivotX = 65;
    this.turretPivotY = 22.5;
    this.turretImg = turretImg;
    this.turretWidth = this.width * 0.5;
    this.turretHeight = this.height * 0.3;
    this.turretAngle = 0;
    this.turretDirection = 1;

    this.controls = controls;
    this.bullets = [];
    this.hp = 100;
    this.alive = true;
    this.canShoot = true; // ★連射防止フラグ
    this.name = name;     // ← 修正済み
  }

  moveForward() {
    if (!this.alive) return;
    const move = this.flipped ? -this.speed : this.speed;
    this.x += move;
    if (this.x < 0) this.x = 0;
    if (this.x + this.width > canvas.width) this.x = canvas.width - this.width;
  }

  moveBackward() {
    if (!this.alive) return;
    const move = this.flipped ? this.speed : -this.speed;
    this.x += move;
    if (this.x < 0) this.x = 0;
    if (this.x + this.width > canvas.width) this.x = canvas.width - this.width;
  }

  rotateTurretAuto() {
    this.turretAngle += 0.02 * this.turretDirection;

    if(!this.flipped) {
      if (this.turretAngle <= -Math.PI) {
        this.turretAngle = -Math.PI;
        this.turretDirection = 1;
      }
      if (this.turretAngle >= 0) {
        this.turretAngle = 0;
        this.turretDirection = -1;
      }
    } else {
      if (this.turretAngle >= Math.PI) {
        this.turretAngle = Math.PI;
        this.turretDirection = -1;
      }
      if (this.turretAngle <= 0) {
        this.turretAngle = 0;
        this.turretDirection = 1;
      }
    }
  }

  shoot() {
    if (!this.alive) return;
    const barrelLength = this.turretWidth;
    const pivotWorldX = this.x + this.turretPivotX;
    const pivotWorldY = this.y + this.turretPivotY;

    let angle = this.turretAngle;
    if (this.flipped) {
      angle = -Math.PI + this.turretAngle;
    }

    this.bullets.push({
      x: pivotWorldX + Math.cos(angle) * barrelLength,
      y: pivotWorldY + Math.sin(angle) * barrelLength,
      speedX: Math.cos(angle) * 5,
      speedY: Math.sin(angle) * 5
    });
  }

  updateBullets(enemy) {
    this.bullets.forEach((b, i) => {
      b.x += b.speedX;
      b.y += b.speedY;
      b.speedY += GRAVITY;

      if (
        b.x > enemy.x &&
        b.x < enemy.x + enemy.width &&
        b.y > enemy.y &&
        b.y < enemy.y + enemy.height &&
        enemy.alive
      ) {
        enemy.hp -= 10;
        this.bullets.splice(i, 1);
        if (enemy.hp <= 0) {
          enemy.hp = 0;
          enemy.alive = false;
          showWinner(this === tank1 ? "PLAYER 1 WIN!" : "PLAYER 2 WIN!");
        }
      }

      if (b.x < 0 || b.x > canvas.width || b.y > canvas.height) {
        this.bullets.splice(i, 1);
      }
    });
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    if (this.flipped) {
      ctx.translate(this.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.save();
    ctx.translate(this.turretPivotX, this.turretPivotY);
    ctx.rotate(this.flipped ? -this.turretAngle : this.turretAngle);
    ctx.drawImage(
      this.turretImg,
      -this.turretWidth / 4,
      -this.turretHeight / 2,
      this.turretWidth,
      this.turretHeight
    );
    ctx.restore();

    ctx.drawImage(this.img, 0, 0, this.width, this.height);
    ctx.restore();

    // 名前表示
    ctx.fillStyle = "white";
    ctx.font = "16px Arial";
    ctx.textAlign = "center";
    ctx.fillText(this.name, this.x + this.width / 2, this.y - 25);

    // HPバー描画
    ctx.fillStyle = "red";
    ctx.fillRect(this.x, this.y - 20, this.width, 10);
    ctx.fillStyle = "lime";
    ctx.fillRect(this.x, this.y - 20, (this.width * this.hp) / 100, 10);

    this.bullets.forEach(b => {
      ctx.beginPath();
      ctx.arc(b.x, b.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = 'black';
      ctx.fill();
    });
  }
}

// ==========================
// プレイヤー戦車作成
// ==========================
const tank1 = new Tank(100, tankImg1, turretImg1,
  { angleHold: 'q', forward: 'e', backward: 'w', shoot: 'a' }, false, player1Name);
const tank2 = new Tank(canvas.width - 150, tankImg2, turretImg2,
  { angleHold: 's', forward: 'z', backward: 'd', shoot: 'x' }, true, player2Name);

// ==========================
// キー入力管理（連射防止対応）
// ==========================
const keys = {};
window.addEventListener('keydown', e => {
  keys[e.key] = true;
});
window.addEventListener('keyup', e => {
  keys[e.key] = false;
  // 離したら再び発射可能
  if (e.key === tank1.controls.shoot) tank1.canShoot = true;
  if (e.key === tank2.controls.shoot) tank2.canShoot = true;
});

// ==========================
// 背景描画
// ==========================
function drawBackground() {
  const skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  skyGrad.addColorStop(0, '#8B0000');
  skyGrad.addColorStop(0.3, '#FF4500');
  skyGrad.addColorStop(0.6, '#D2B48C');
  skyGrad.addColorStop(0.8, '#4B3621');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#3B2F2F';
  ctx.fillRect(0, canvas.height - 50, canvas.width, 50);
}

// ==========================
// ゲームループ
// ==========================
function update() {
  drawBackground();

  if (keys[tank1.controls.angleHold]) tank1.rotateTurretAuto();
  if (keys[tank1.controls.forward]) tank1.moveForward();
  if (keys[tank1.controls.backward]) tank1.moveBackward();
  if (keys[tank1.controls.shoot] && tank1.canShoot) {
    tank1.shoot();
    tank1.canShoot = false;
  }

  if (keys[tank2.controls.angleHold]) tank2.rotateTurretAuto();
  if (keys[tank2.controls.forward]) tank2.moveForward();
  if (keys[tank2.controls.backward]) tank2.moveBackward();
  if (keys[tank2.controls.shoot] && tank2.canShoot) {
    tank2.shoot();
    tank2.canShoot = false;
  }

  tank1.updateBullets(tank2);
  tank2.updateBullets(tank1);

  tank1.draw();
  tank2.draw();

  requestAnimationFrame(update);
}

// ==========================
// 勝者表示
// ==========================
function showWinner(text) {
  const winText = document.getElementById("winnerText");
  winText.innerText = text;
  winText.style.opacity = 1;

  const sound = document.getElementById("winSound");
  sound.currentTime = 0;
  sound.play();

  setTimeout(() => {
    alert(text);
    location.reload();
  }, 3000);
}

// ==========================
// ゲーム開始
// ==========================
update();
