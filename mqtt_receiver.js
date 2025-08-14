// MQTT接続設定
const host = "wss://b38edc2604c14abc8b3ee5433d86202d.s1.eu.hivemq.cloud:8884/mqtt";
const options = {
  username: "ICDC_Gr8",
  password: "icdc_Gr8",
  clean: true,
  connectTimeout: 4000,
};

// デフォルトキー
const keyMap = ["q","w","e","a","s","d","z","x","c"];

// 保存されたマッピング
let inputMapping = null;
try {
  const stored = localStorage.getItem("inputMapping");
  if (stored) inputMapping = JSON.parse(stored);
} catch(e) {
  console.warn("⚠️ Failed to load inputMapping:", e);
}

const client = mqtt.connect(host, options);
client.on("connect", () => {
  console.log("✅ Connected to HiveMQ Cloud");
  client.subscribe("dance/mat", err => { if (!err) console.log("📡 Subscribed to dance/mat"); });
});

// 前回状態を保持
let prevStates = Array(9).fill(0);

client.on("message", (topic, message) => {
  if (topic !== "dance/mat") return;

  let states = message.toString().trim().split(",").map(v => parseInt(v,10));

  // マッピングがあれば並び替え
  if (inputMapping && Array.isArray(inputMapping)) {
    const remapped = Array(9).fill(0);
    states.forEach((v, originalIdx) => {
      if (v === 1) {
        const mappedIdx = inputMapping[originalIdx];
        if (mappedIdx !== null && mappedIdx !== undefined) remapped[mappedIdx] = 1;
      }
    });
    states = remapped;
  }

  states.forEach((val, idx) => {
  const key = keyMap[idx];
  if (val === 1 && prevStates[idx] === 0) {
    // 踏み始め
    const kd = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, composed: true });
    window.dispatchEvent(kd);
    prevStates[idx] = 1;
  } else if (val === 0 && prevStates[idx] === 1) {
    // 踏み離し
    const ku = new KeyboardEvent("keyup", { key, bubbles: true, cancelable: true, composed: true });
    window.dispatchEvent(ku);
    prevStates[idx] = 0;
  }
});

});
