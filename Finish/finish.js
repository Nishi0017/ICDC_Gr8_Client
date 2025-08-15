// ===== 固定設定（3×3用） =====
const padOrder = [0,1,2,3,4,5,6,7,8]; // 光らせる順番（全9枚）
let inputMapping = Array(9).fill(null); // 元idx → 新idx の変換マップ
let currentConfigIndex = 0;
let waitingForRelease = false; // 踏みっぱなし防止

// ===== UI作成（3×3固定） =====
const matContainer = document.getElementById("mat-container");
const instructionEl = document.getElementById("instruction");

function createPadGrid3x3() {
  matContainer.innerHTML = "";
  matContainer.style.gridTemplateColumns = "repeat(3, 80px)";
  
  for (let i = 0; i < 9; i++) {
    const cell = document.createElement("div");
    cell.style.display = "flex";
    cell.style.flexDirection = "column";
    cell.style.alignItems = "center";

    const spacer = document.createElement("div");
    spacer.style.height = "20px";
    cell.appendChild(spacer);

    const pad = document.createElement("div");
    pad.classList.add("pad");
    pad.dataset.index = i;

    cell.appendChild(pad);
    matContainer.appendChild(cell);
  }
}

// ===== ハイライト処理 =====
function highlightPad(idx) {
  document.querySelectorAll(".pad[data-index]").forEach(p => {
    p.classList.remove("active");
    if (parseInt(p.dataset.index) === idx) {
      p.classList.add("active");
    }
  });
}

// ===== 設定完了処理 =====
function finishConfig() {
  // 未割り当てを埋める
  for (let i = 0; i < inputMapping.length; i++) {
    if (inputMapping[i] === null) {
      inputMapping[i] = currentConfigIndex++;
    }
  }
  document.querySelectorAll(".pad").forEach(p => p.classList.remove("active"));
  instructionEl.textContent = "Reset to the initial 3×3 layout!";
  console.log("Mapping:", inputMapping);
  localStorage.setItem("inputMapping", JSON.stringify(inputMapping));

  // 終了後にメニュー画面へ戻る
  setTimeout(() => {
    window.location.href = "../index.html";
  }, 1000);
}

// ===== 設定ステップ =====
function startConfigStep() {
  if (currentConfigIndex >= padOrder.length) {
    finishConfig();
    return;
  }
  const targetPad = padOrder[currentConfigIndex];
  highlightPad(targetPad);
  instructionEl.textContent = `Step on the highlighted panel (${targetPad + 1})`;
}

// ===== 入力処理 =====
function handlePadInput(states) {
  const activePads = states.map((v,i) => v === 1 ? i : null).filter(v => v !== null);
  if (activePads.length !== 1 || waitingForRelease) return;

  const pressedPad = activePads[0];
  if (inputMapping[pressedPad] !== null) return;

  // 割り当て
  inputMapping[pressedPad] = currentConfigIndex;
  console.log(`✅ Pad ${pressedPad + 1} assigned to ${currentConfigIndex}`);
  
  // 視覚フィードバック
  const padEl = document.querySelector(`.pad[data-index="${pressedPad}"]`);
  if(padEl) padEl.classList.add("configured");

  currentConfigIndex++;
  waitingForRelease = true; // 離すまで次の入力を無効化

  if (currentConfigIndex >= padOrder.length) {
    finishConfig();
    return;
  }
  startConfigStep();
}

// ===== MQTT接続 =====
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

// 入力解除監視（踏みっぱなし防止用）
client.on("message", (topic, message) => {
  if (topic === "dance/mat") {
    const states = message.toString().trim().split(",").map(v => parseInt(v,10));
    latestStates = states;

    // 離したら次の入力を受け付け
    if(waitingForRelease && states.every(s => s===0)) {
      waitingForRelease = false;
    }

    handlePadInput(states);
  }
});

// ===== 初期化 =====
createPadGrid3x3();
startConfigStep();
