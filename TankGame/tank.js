// ======================
//  ゲーム初期設定
// ======================
const canvas = document.getElementById('gameCanvas'); 
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// 重力（弾の落下加速度）
const GRAVITY = 0.05;

// ======================
//  画像読み込み用関数
// ======================
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = src;
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`${src} の読み込みに失敗しました`));
  });
}

// 画像パス
const imagePaths = {
  tankImg1: 'Images/tank1-body.png',
  tankImg2: 'Images/tank2-body.png',
  turretImg1: 'Images/tank1-kuti.png',
  turretImg2: 'Images/tank2-kuti.png'
};

// ======================
//  戦車クラス
// ======================
class Tank {
  constructor(x, img, turretImg, controls, flipped = false) {
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
    console.log("🔄 自動旋回中");
    this.turretAngle += 0.02 * this.turretDirection;
    if (!this.flipped) {
      if (this.turretAngle <= -Math.PI) { this.turretAngle = -Math.PI; this.turretDirection = 1; }
      if (this.turretAngle >= 0) { this.turretAngle = 0; this.turretDirection = -1; }
    } else {
      if (this.turretAngle >= Math.PI) { this.turretAngle = Math.PI; this.turretDirection = -1; }
      if (this.turretAngle <= 0) { this.turretAngle = 0; this.turretDirection = 1; }
    }
  }

  shoot() {
    if (!this.alive) return;
    const barrelLength = this.turretWidth;
    const pivotWorldX = this.x + this.turretPivotX;
    const pivotWorldY = this.y + this.turretPivotY;
    let angle = this.turretAngle;
    if (this.flipped) angle = -Math.PI + this.turretAngle;

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

      if (b.x > enemy.x && b.x < enemy.x + enemy.width &&
          b.y > enemy.y && b.y < enemy.y + enemy.height &&
          enemy.alive) {
        enemy.hp -= 10;
        this.bullets.splice(i, 1);

        if (enemy.hp <= 0) {
          enemy.hp = 0;
          enemy.alive = false;
          showWinner(this === tank1 ? "PLAYER 1 WIN!" : "PLAYER 2 WIN!");
        }
      }

      if (b.x < 0 || b.x > canvas.width || b.y > canvas.height) this.bullets.splice(i, 1);
    });
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    if (this.flipped) { ctx.translate(this.width, 0); ctx.scale(-1, 1); }

    ctx.save();
    ctx.translate(this.turretPivotX, this.turretPivotY);
    ctx.rotate(this.flipped ? -this.turretAngle : this.turretAngle);
    ctx.drawImage(this.turretImg, -this.turretWidth / 4, -this.turretHeight / 2, this.turretWidth, this.turretHeight);
    ctx.restore();

    ctx.drawImage(this.img, 0, 0, this.width, this.height);
    ctx.restore();

    // HPバー
    ctx.fillStyle = "red";
    ctx.fillRect(this.x, this.y - 20, this.width, 10);
    ctx.fillStyle = "lime";
    ctx.fillRect(this.x, this.y - 20, (this.width * this.hp) / 100, 10);

    // 弾
    this.bullets.forEach(b => {
      ctx.beginPath();
      ctx.arc(b.x, b.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = 'black';
      ctx.fill();
    });
  }
}

// ======================
//  キー入力管理
// ======================
const keys = {};
window.addEventListener('keydown', e => { keys[e.key] = true; });
window.addEventListener('keyup', e => { keys[e.key] = false; });

// ======================
//  背景描画
// ======================
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

// ======================
//  勝者表示
// ======================
function showWinner(text) {
  const winText = document.getElementById("winnerText");
  winText.innerText = text;
  winText.style.opacity = 1;

  const sound = document.getElementById("winSound");
  if (sound) { sound.currentTime = 0; sound.play().catch(()=>{}); }

  setTimeout(() => {
    alert(text);
    location.reload();
  }, 3000);
}

// ======================
//  ゲームループ
// ======================
function update(tank1, tank2) {
  drawBackground();

  if (keys[tank1.controls.angleHold]) tank1.rotateTurretAuto();
  if (keys[tank1.controls.forward]) tank1.moveForward();
  if (keys[tank1.controls.backward]) tank1.moveBackward();
  if (keys[tank1.controls.shoot]) { keys[tank1.controls.shoot] = false; tank1.shoot(); }

  if (keys[tank2.controls.angleHold]) tank2.rotateTurretAuto();
  if (keys[tank2.controls.forward]) tank2.moveForward();
  if (keys[tank2.controls.backward]) tank2.moveBackward();
  if (keys[tank2.controls.shoot]) { keys[tank2.controls.shoot] = false; tank2.shoot(); }

  tank1.updateBullets(tank2);
  tank2.updateBullets(tank1);

  tank1.draw();
  tank2.draw();

  requestAnimationFrame(() => update(tank1, tank2));
}

let tank1, tank2;

// ======================
//  全画像ロード後にゲーム開始
// ======================
Promise.all([
  loadImage(imagePaths.tankImg1),
  loadImage(imagePaths.tankImg2),
  loadImage(imagePaths.turretImg1),
  loadImage(imagePaths.turretImg2)
])
.then(([tankImg1, tankImg2, turretImg1, turretImg2]) => {
  tank1 = new Tank(100, tankImg1, turretImg1, { angleHold: 'q', forward: 'e', backward: 'w', shoot: 'c' }, false);
  tank2 = new Tank(canvas.width - 150, tankImg2, turretImg2, { angleHold: 's', forward: 'z', backward: 'd', shoot: 'x' }, true);
  update(tank1, tank2);
})
.catch(err => console.error(err));
