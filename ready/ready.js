// ===== URLパラメータで人数を取得 =====
const urlParams = new URLSearchParams(window.location.search);
const players = (urlParams.get('players') || "").split(',').filter(p => p);
console.log("人数:", players.length, players);
const numPlayers = parseInt(players.length || "1", 10);

const matContainer = document.getElementById("mat-container");
const instructionEl = document.getElementById("instruction");

let currentConfigIndex = 0;
let singlePressStartTime = null;
const holdTimeRequired = 3000; // 3秒間
const padOrder = [0,1,2,3,4,5,6,7,8]; // 光らせる順番
let inputMapping = Array(9).fill(null); // 元idx → 新idx の変換マップ

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

// ===== 人数ごとにUI生成 =====
function createPadGrid(playerNames = []) {
  matContainer.innerHTML = "";
  let layout = [];
  let namePositions = [];
  let padSymbols = {}; // パッド番号 → 表示文字

  if (numPlayers === 1) {
    matContainer.style.gridTemplateColumns = "repeat(3, 80px)";
    layout = Array.from({ length: 9 }, (_, i) => i);
    namePositions = [1];
    layout.forEach(i => padSymbols[i] = (i+1).toString());
  } 
  else if (numPlayers === 2) {
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
  else if (numPlayers === 3) {
    matContainer.style.gridTemplateColumns = "repeat(11, 80px)";
    layout = [
      "", 0, "", "", "", 3, "", "", "", 6, "",
      1, "e", 2, "", 4, "e", 5, "", 7, "e", 8
    ];
    namePositions = [0, 3, 6];
    padSymbols = {
      0: "S", 3: "S", 6: "S",
      1: "←", 4: "←", 7: "←",
      2: "→", 5: "→", 8: "→"
    };
  } 
  else if (numPlayers === 4) {
    matContainer.style.gridTemplateColumns = "repeat(8, 80px)";
    layout = [
       0, "e",  1, "",  2, "e",  3, "",
      "", "", "", "", "", "", "", "",
       4, "e",  5, "",  6, "e",  7, ""
    ];
    namePositions = [0, 2, 4, 6];
    padSymbols = {}; // 必要なら追加
  }

  let nameIndexMap = {};
  namePositions.forEach((pos, i) => {
    nameIndexMap[pos] = i;
  });

  layout.forEach((v) => {
    const cell = document.createElement("div");
    cell.style.display = "flex";
    cell.style.flexDirection = "column";
    cell.style.alignItems = "center";

    // 名前表示
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

    // パッド本体
    const pad = document.createElement("div");
    pad.classList.add("pad");
    if (v === "" || v === " ") {
      pad.classList.add("empty");
    } 
    else if (typeof v === "string" && v === "e") {
      pad.classList.add("extra"); // 表示専用パッド
      pad.textContent = "E";
    } 
    else {
      pad.dataset.index = v; // 操作対象
      pad.textContent = padSymbols[v] || "";
    }

    cell.appendChild(pad);
    matContainer.appendChild(cell);
  });
}

// ===== パッド操作 =====
function highlightPad(idx) {
  document.querySelectorAll(".pad").forEach(p => {
    p.classList.remove("active");
    if (parseInt(p.dataset.index) === idx) {
      p.classList.add("active");
    }
  });
}

function markConfigured(idx) {
  const pad = document.querySelector(`.pad[data-index='${idx}']`);
  if (pad) {
    pad.classList.remove("active");
    pad.classList.add("configured");
  }
}

// ===== 設定ステップ =====
function startConfigStep() {
  if (currentConfigIndex >= padOrder.length) {
    instructionEl.textContent = "すべての設定が完了しました！";
    console.log("変換マッピング:", inputMapping);
    return;
  }
  const targetPad = padOrder[currentConfigIndex];
  highlightPad(targetPad);
  instructionEl.textContent = `光っているパネル(${targetPad + 1})を3秒間踏んでください`;
}

function handlePadInput(states) {
  const activePads = states.map((v, i) => v === 1 ? i : null).filter(v => v !== null);
  const targetPad = padOrder[currentConfigIndex];

  if (activePads.length === 1 && activePads[0] === targetPad) {
    if (singlePressStartTime === null) {
      singlePressStartTime = Date.now();
    } else if (Date.now() - singlePressStartTime >= holdTimeRequired) {
      inputMapping[targetPad] = currentConfigIndex;
      markConfigured(targetPad);
      currentConfigIndex++;
      singlePressStartTime = null;
      startConfigStep();
    }
  } else {
    singlePressStartTime = null;
  }
}

// ===== 入力マッピング適用 =====
function remapInput(states) {
  let remapped = Array(9).fill(0);
  states.forEach((v, i) => {
    if (v === 1) {
      const newIdx = inputMapping[i];
      if (newIdx !== null) {
        remapped[newIdx] = 1;
      }
    }
  });
  return remapped;
}

// ===== 初期描画 =====
createPadGrid(players);
startConfigStep();
