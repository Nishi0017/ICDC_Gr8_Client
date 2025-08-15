// =====================
// MQTT接続設定
// =====================
const host = "wss://b38edc2604c14abc8b3ee5433d86202d.s1.eu.hivemq.cloud:8884/mqtt";
const options = {
  username: "ICDC_Gr8",
  password: "icdc_Gr8",
  clean: true,
  connectTimeout: 4000,
  reconnectPeriod: 2000, // ← 自動再接続
};

// 9キーのデフォルト配列（q,w,e,a,s,d,z,x,c）
const keyMap = ["q","w","e","a","s","d","z","x","c"];

// 保存されたマッピング（例: [2,0,1,3,4,5,6,7,8] など）
let inputMapping = null;
try {
  const stored = localStorage.getItem("inputMapping");
  if (stored) inputMapping = JSON.parse(stored);
} catch (e) {
  console.warn("⚠️ Failed to load inputMapping:", e);
}

// MQTT接続
const client = mqtt.connect(host, options);

// 状態保持
let prevStates = Array(9).fill(0);

// ログの出し過ぎ防止
let lastLogAt = 0;
function rateLog(msg) {
  const now = performance.now();
  if (now - lastLogAt > 1000) {
    console.log(msg);
    lastLogAt = now;
  }
}

// =====================
// 接続イベント
// =====================
client.on("connect", () => {
  console.log("✅ Connected to HiveMQ Cloud");
  client.subscribe("dance/mat", err => {
    if (!err) console.log("📡 Subscribed to dance/mat");
  });
});

client.on("reconnect", () => rateLog("♻️ Reconnecting..."));
client.on("close", () => rateLog("🔌 Connection closed"));
client.on("offline", () => rateLog("📴 Offline"));
client.on("error", (err) => console.error("❌ MQTT Error:", err?.message || err));

// =====================
// メッセージ受信
// 形式: "0,1,0,0,0,0,0,0,0"
// =====================
client.on("message", (topic, message) => {
  if (topic !== "dance/mat") return;

  const text = message.toString().trim();
  // 軽くフォーマットチェック
  if (!/^[0-1](,[0-1]){8}$/.test(text)) {
    // 不正な形式は無視
    return;
  }

  let states = text.split(",").map(v => v === "1" ? 1 : 0);

  // マッピング適用（任意）
  if (inputMapping && Array.isArray(inputMapping) && inputMapping.length === 9) {
    const remapped = Array(9).fill(0);
    for (let originalIdx = 0; originalIdx < 9; originalIdx++) {
      const v = states[originalIdx];
      if (v === 1) {
        const mappedIdx = inputMapping[originalIdx];
        if (mappedIdx != null && mappedIdx >= 0 && mappedIdx < 9) {
          remapped[mappedIdx] = 1;
        }
      }
    }
    states = remapped;
  }

  // 差分で keydown / keyup を発火
  for (let idx = 0; idx < 9; idx++) {
    const val = states[idx];
    const prev = prevStates[idx];
    if (val === 1 && prev === 0) {
      const kd = new KeyboardEvent("keydown", {
        key: keyMap[idx],
        code: `Key${keyMap[idx].toUpperCase()}`, // 一部のゲームで code を参照する対策
        bubbles: true, cancelable: true, composed: true
      });
      window.dispatchEvent(kd);
      prevStates[idx] = 1;
    } else if (val === 0 && prev === 1) {
      const ku = new KeyboardEvent("keyup", {
        key: keyMap[idx],
        code: `Key${keyMap[idx].toUpperCase()}`,
        bubbles: true, cancelable: true, composed: true
      });
      window.dispatchEvent(ku);
      prevStates[idx] = 0;
    }
  }
});

// =====================
// 予防策: タブ非表示時に押しっぱなしを解放
// （フォーカス外れでkeyupが届かないケース対策）
// =====================
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    for (let i = 0; i < 9; i++) {
      if (prevStates[i] === 1) {
        const ku = new KeyboardEvent("keyup", {
          key: keyMap[i],
          code: `Key${keyMap[i].toUpperCase()}`,
          bubbles: true, cancelable: true, composed: true
        });
        window.dispatchEvent(ku);
        prevStates[i] = 0;
      }
    }
  }
});
