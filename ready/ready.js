const lightsContainer = document.getElementById("lights");
const countdownEl = document.getElementById("countdown");
const gameImage = document.getElementById("gameImage");

const params = new URLSearchParams(window.location.search);
const selectedGame = params.get("game");

// ゲームごとの設定
const gamesConfig = {
    "snake-game": { img: "Image/snake.png", lights: 4 },
    "tank-game": { img: "Image/tank.png", lights: 2 },
};

// 選択ゲーム情報を設定
const config = gamesConfig[selectedGame] || { img: "default.png", lights: 2 };
gameImage.src = config.img;

// ライト生成
const lights = [];
for (let i = 0; i < config.lights; i++) {
    const div = document.createElement("div");
    div.className = "light";
    lightsContainer.appendChild(div);
    lights.push(div);
}

// キー割り当て（W,S,A,D.. ライト操作を簡易に）
let activeLights = Array(config.lights).fill(false);
let countdownTimer = null;
let countdownValue = 3;

function checkStart() {
    if (activeLights.every(v => v) && !countdownTimer) {
        startCountdown();
    }
}


function startCountdown() {
    countdownValue = 3;
    countdownEl.textContent = countdownValue;
    countdownTimer = setInterval(() => {
        countdownValue--;
        if (countdownValue > 0) {
            countdownEl.textContent = countdownValue;
        } else {
            clearInterval(countdownTimer);
            countdownEl.textContent = "GO!";
            setTimeout(() => {
                // 選んだゲームページへ遷移
               const pathMap = {
                    "tank-game": "../TankGame/tank.html",
                    "snake-game": "../SnakeGame/snake.html",
                };
                window.location.href = pathMap[selectedGame] || "default.html";
            }, 1000);
        }
    }, 1000);
}

document.addEventListener("keydown", (e) => {
    // W,S,A,D.. をライトに対応させる
    const keys = ["w","s","a","d","q","e"];
    keys.forEach((key,i) => {
        if(e.key.toLowerCase() === key && i < lights.length) {
            activeLights[i] = true;
            lights[i].classList.add("active");
            checkStart();
        }
    });
});
