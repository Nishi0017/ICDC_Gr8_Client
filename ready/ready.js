// ===== URLパラメータで人数を取得 =====
const urlParams = new URLSearchParams(window.location.search);
const players = (urlParams.get('players') || "").split(',').filter(p => p);
const numPlayers = parseInt(players.length || "1", 10);
const game = urlParams.get('game') || "";

// game → 最大プレイヤー数マップ
const PadNumMap = {
  "snake-game": 4,
  "tank-game": 2,
  "shooting-game": 3,
  "basketball-game": 4 
};

// game → 遷移先マップ
const gameUrlMap = {
  "snake-game": "../SnakeGame/snake.html",
  "tank-game": "../TankGame/tank.html",
  "shooting-game": "../ShootingGame/shooting.html",
  "basketball-game": "../BasketballGame/basketball.html"
};

const matContainer = document.getElementById("mat-container");
const instructionEl = document.getElementById("instruction");

const padOrder = [0,1,2,3,4,5,6,7,8]; // 光らせる順番
let inputMapping = Array(9).fill(null); // 元idx → 新idx の変換マップ

// ===== 必要パッド数を計算 =====
//const maxPlayers = PadNumMap[game]; // ゲームの最大人数
//const padsPerPlayer = Math.floor(padOrder.length / maxPlayers);
//const requiredPads = padsPerPlayer * numPlayers;

const requiredPads = numPlayers * Math.floor(9 / PadNumMap[game]); // 必要なパッド数

// 実際に設定するパッド順
const usedPadOrder = padOrder.slice(0, requiredPads);

let currentConfigIndex = 0;

/*
// MQTT接続
const host = "wss://b38edc2604c14abc8b3ee5433d86202d.s1.eu.hivemq.cloud:8884/mqtt";
const options = {
  username: "ICDC_Gr8",
  password: "icdc_Gr8",
  clean: true,
  connectTimeout: 4000,
};
const client = mqtt.connect(host, options);
let latestStates = Array(9).fill(0);

client.on("connect", () => {
  console.log("✅ Connected to HiveMQ Cloud");
  client.subscribe("dance/mat");
});

client.on("message", (topic, message) => {
  if (topic === "dance/mat") {
    const states = message.toString().trim().split(",").map(v => parseInt(v, 10));
    latestStates = states;
    handlePadInput(states);
  }
});
*/

// ===== 人数ごとにUI生成 =====
function createPadGrid(playerNames = []) {
  matContainer.innerHTML = "";
  let layout = [];
  let namePositions = [];
  let padSymbols = {};
  const PadNum= PadNumMap[game];

  if (PadNum === 1) {
    matContainer.style.gridTemplateColumns = "repeat(3, 80px)";
    layout = Array.from({ length: 9 }, (_, i) => i);
    namePositions = [1];
    layout.forEach(i => padSymbols[i] = (i+1).toString());
  } 
  else if (PadNum === 2) {
    matContainer.style.gridTemplateColumns = "repeat(7, 80px)";
    layout = [
      "", 0, "", "", "", 4, "",
      1, "e", 2, "", 5, "e", 6,
      "", 3, "", "", "", 7, ""
    ];
    namePositions = [0, 4];
    padSymbols = { 
      0: "↔", 4: "↔", 
      1: "←", 5: "←", 
      2: "→", 6: "→", 
      3: "S", 7: "S" 
    };
  } 
  else if (PadNum === 3) {
    if (numPlayers === 3) {
      matContainer.style.gridTemplateColumns = "repeat(11, 80px)";
      layout = [ 
        "",  0 , "", "", "",  3 , "", "", "",  6 , "",
         1, "e",  2, "",  4, "e",  5, "",  7, "e",  8
      ];
      namePositions = [0, 3, 6];
    } else if (numPlayers === 2) {
      matContainer.style.gridTemplateColumns = "repeat(7, 80px)";
      layout = [
        "", 0, "", "", "", 3, "",
        1, "e", 2, "", 4, "e", 5
      ];
      namePositions = [0, 3];
    }
    padSymbols = {
      0: "S", 3: "S", 
      6: "S", 1: "←", 
      4: "←", 7: "←", 
      2: "→", 5: "→", 
      8: "→" };
  } 
  else if (PadNum === 4) {
    padSymbols = {};
    if (numPlayers === 4) {
      matContainer.style.gridTemplateColumns = "repeat(7, 80px)";
      layout = [
         0, "e",  1, "",  2, "e",  3,
        "",  "", "", "", "",  "", "",
         4, "e",  5, "",  6, "e",  7
      ];
      namePositions = [0, 2, 4, 6];
    } else if (numPlayers === 3) {
      matContainer.style.gridTemplateColumns = "repeat(11, 80px)";
      layout = [
        0, "e", 1, "", 2, "e", 3, "", 4, "e", 5
      ];
      namePositions = [0, 2, 4];
    } else if (numPlayers === 2) {
      matContainer.style.gridTemplateColumns = "repeat(7, 80px)";
      layout = [
        0, "e",1, "", 2, "e", 3
      ];
      namePositions = [0, 2];
    }
    if (game === "basketball-game") {
      padSymbols = { 
        0: "↔", 2: "↔", 4: "↔", 6: "↔",
        1: "S", 3: "S", 5: "S", 7: "S",
        8: "" 
      };
    } else if (game === "snake-game") {
      padSymbols = {
        0: "←", 2: "←", 4: "←", 6: "←",
        1: "→", 3: "→", 5: "→", 7: "→",
        8: ""
      };
    }
  }

  let nameIndexMap = {};
  namePositions.forEach((pos, i) => { nameIndexMap[pos] = i; });

  layout.forEach((v) => {
    const cell = document.createElement("div");
    cell.style.display = "flex";
    cell.style.flexDirection = "column";
    cell.style.alignItems = "center";

    if (typeof v === "number" && namePositions.includes(v)) {
      const nameIdx = nameIndexMap[v];
      const nameDiv = document.createElement("div");
      nameDiv.textContent = playerNames[nameIdx] || `Player${nameIdx + 1}`;
      nameDiv.style.marginBottom = "4px";
      nameDiv.style.fontWeight = "bold";
      cell.appendChild(nameDiv);
    } else {
      const spacer = document.createElement("div");
      spacer.style.height = "20px";
      cell.appendChild(spacer);
    }

    const pad = document.createElement("div");
    pad.classList.add("pad");
    if (v === "" || v === " ") {
      pad.classList.add("empty");
    } else if (typeof v === "string" && v === "e") {
      pad.classList.add("extra");
      pad.textContent = "E";
    } else {
      pad.dataset.index = v;
      pad.textContent = padSymbols[v] || "";
    }

    cell.appendChild(pad);
    matContainer.appendChild(cell);
  });
}

// ===== パッド操作 =====
function highlightPad(idx) {
  document.querySelectorAll(".pad[data-index]").forEach(p => {
    p.classList.remove("active");
    if (parseInt(p.dataset.index) === idx) {
      p.classList.add("active");
    }
  });
}

// ===== 完了処理 =====
function finishConfig() {
  // 未割り当てパッドを自動で埋める
  for (let i = 0; i < inputMapping.length; i++) {
    if (inputMapping[i] === null) {
      inputMapping[i] = currentConfigIndex++;
    }
  }
  document.querySelectorAll(".pad").forEach(p => p.classList.remove("active"));
  instructionEl.textContent = "すべての設定が完了しました！";
  console.log("変換マッピング:", inputMapping);
  localStorage.setItem("inputMapping", JSON.stringify(inputMapping));

  const nextPage = gameUrlMap[game];
  if (nextPage) {
    const playersParam = encodeURIComponent(players.join(","));
    window.location.href = `${nextPage}?players=${playersParam}`;
  }
}

// ===== 設定ステップ =====
function startConfigStep() {
  if (currentConfigIndex >= usedPadOrder.length) {
    finishConfig();
    return;
  }
  const targetPad = usedPadOrder[currentConfigIndex];
  highlightPad(targetPad);
  instructionEl.textContent = `光っているパネル(${targetPad + 1})を踏んでください`;
}

// ===== 入力処理 =====
function handlePadInput(states) {
  const activePads = states.map((v, i) => v === 1 ? i : null).filter(v => v !== null);
  if (activePads.length !== 1) return;
  const pressedPad = activePads[0];
  if (inputMapping[pressedPad] !== null) return;

  inputMapping[pressedPad] = currentConfigIndex;
  console.log(`✅ パッド ${pressedPad + 1} を ${currentConfigIndex} に割り当て`);
  currentConfigIndex++;

  if (currentConfigIndex >= usedPadOrder.length) {
    finishConfig();
    return;
  }
  startConfigStep();
}

// ===== 初期描画 =====
createPadGrid(players);
startConfigStep();
