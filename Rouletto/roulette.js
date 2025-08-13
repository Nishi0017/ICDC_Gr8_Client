const canvas = document.getElementById("wheelCanvas");
const ctx = canvas.getContext("2d");
const resultDisplay = document.getElementById("result");
const spinBtn = document.getElementById("spinBtn");
const popup = document.getElementById("popup");
const popupText = document.getElementById("popupText");

let items = [];
const colors = ["#FF9999", "#FFCC99", "#FFFF99", "#99FF99", "#99CCFF", "#CC99FF"];

async function loadPlayers() {
    try {
        const res = await fetch("https://icdcgr8server-production.up.railway.app/players");
        const data = await res.json();
        // players.json が [{name:"○○"},...] 形式なら
        items = data.map(p => p.name);
        arc = Math.PI * 2 / items.length;
        drawWheel();
    } catch (err) {
        console.error("プレイヤー読み込み失敗", err);
    }
}


let startAngle = 0;
let arc = Math.PI * 2 / items.length;
let spinAngle = 0;
let spinTime = 0;
let spinTimeTotal = 0;
let spinning = false;

function drawWheel() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    items.forEach((item, i) => {
        let angle = startAngle + i * arc;
        ctx.fillStyle = colors[i % colors.length];
        ctx.beginPath();
        ctx.moveTo(250, 250);
        ctx.arc(250, 250, 250, angle, angle + arc, false);
        ctx.lineTo(250, 250);
        ctx.fill();

        ctx.save();
        ctx.translate(250, 250);
        ctx.rotate(angle + arc / 2);
        ctx.textAlign = "right";
        ctx.fillStyle = "#333";
        ctx.font = "bold 18px sans-serif";
        ctx.fillText(item, 230, 10);
        ctx.restore();
    });

    // 上のポインター
    ctx.fillStyle = "#333";
    ctx.beginPath();
    ctx.moveTo(250 - 15, 0);
    ctx.lineTo(250 + 15, 0);
    ctx.lineTo(250, 30);
    ctx.closePath();
    ctx.fill();
}

function rotateWheel() {
    spinTime += 30;
    if (spinTime >= spinTimeTotal) {
        stopRotateWheel();
        return;
    }
    // 減速感を自然にする easing
    let spinAngleChange = easeOutCubic(spinTime, spinAngle, 0 - spinAngle, spinTimeTotal);
    startAngle += (spinAngleChange * Math.PI / 180);
    drawWheel();
    requestAnimationFrame(rotateWheel);
}

function stopRotateWheel() {
    let degrees = startAngle * 180 / Math.PI + 90;
    let arcd = arc * 180 / Math.PI;
    let index = Math.floor((360 - (degrees % 360)) / arcd) % items.length;
    const selected = items[index];

    resultDisplay.textContent = "結果: " + selected;

    // ポップアップ演出
    popupText.textContent = selected;
    popup.style.display = "flex";

    // 「ドドン！」効果音
    const dodonSound = new Audio("dodon.mp3");
    dodonSound.play();

    // 2秒後に閉じる
    setTimeout(() => {
        popup.style.display = "none";
    }, 2000);

    spinning = false;
}


// cubic easing（スムーズ減速）
function easeOutCubic(t, b, c, d) {
    t /= d;
    t--;
    return c * (t * t * t + 1) + b;
}

spinBtn.addEventListener("click", () => {
    if (spinning) return; // 連打防止
    spinning = true;

    spinAngle = Math.random() * 150 // ゆっくりめ初速
    spinTime = 0;
    spinTimeTotal = Math.random() * 5000 + 6000; // 長め減速
    rotateWheel();
});

// 初期描画
loadPlayers();

