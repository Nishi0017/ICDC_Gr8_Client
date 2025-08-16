/* =========================================================
   mqtt_receiver.js
   ESP32マット → MQTT → Webページ入力ブリッジ
   - Tankゲーム: keys[] を直接制御（ある場合）
   - index.html: カスタムイベント "menu-virtual-key" を常に発火
   - ブラウザ制限回避のため KeyboardEvent は使わない
   ========================================================= */

/* ==========================
   MQTT接続設定
   ========================== */
const host = "wss://b38edc2604c14abc8b3ee5433d86202d.s1.eu.hivemq.cloud:8884/mqtt";
const options = {
  username: "ICDC_Gr8",
  password: "icdc_Gr8",
  clean: true,
  connectTimeout: 4000,
  reconnectPeriod: 2000, // 自動再接続
};

/* ==========================
   キー配列 (ダンスマット9キー)
   ========================== */
const keyMap = ["q", "w", "e", "a", "s", "d", "z", "x", "c"];

// 保存されたキー配置マッピング（例: [2,0,1,3,4,5,6,7,8]）
try {
  const stored = localStorage.getItem("inputMapping");
  if (stored) window.inputMapping = JSON.parse(stored);
} catch(e){ console.warn(e); }

// デフォルトマッピング確保
if (!window.inputMapping) window.inputMapping = [0,1,2,3,4,5,6,7,8];

/* ==========================
   MQTTクライアント作成
   ========================== */
const client = mqtt.connect(host, options);

/* ==========================
   前回のキー状態（押しっぱなし判定用）
   ========================== */
let prevStates = Array(9).fill(0);

/* ==========================
   ログ頻度制限（1秒に1回）
   ========================== */
let lastLogAt = 0;
function rateLog(msg) {
  const now = performance.now();
  if (now - lastLogAt > 1000) {
    console.log(msg);
    lastLogAt = now;
  }
}

/* ==========================
   ページ判定（Tankゲームの有無だけ見る）
   ※ index側は常にカスタムイベントで通知するので判定不要
   ========================== */
const hasTankKeys = typeof keys !== "undefined"; // Tankゲームページなら true
console.log(`📄 mqtt_receiver.js loaded. TankKeys: ${hasTankKeys}`);

/* ==========================
   MQTTイベントハンドラ
   ========================== */
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

/* ==========================
   MQTTメッセージ受信
   フォーマット: "0,1,0,0,0,0,0,0,0"
   ========================== */
client.on("message", (topic, message) => {
  if (topic !== "dance/mat") return;

  let states = message.toString().trim().split(",").map(v => v === "1" ? 1 : 0);

  // キーマッピング適用
  if (window.inputMapping && Array.isArray(window.inputMapping) && window.inputMapping.length === 9) {
    const remapped = Array(9).fill(0);
    for (let originalIdx = 0; originalIdx < 9; originalIdx++) {
      if (states[originalIdx] === 1) {
        const mappedIdx = window.inputMapping[originalIdx];
        if (mappedIdx != null && mappedIdx >= 0 && mappedIdx < 9) {
          remapped[mappedIdx] = 1;
        }
      }
    }
    states = remapped;
    console.log("🔄 Remapped states:", states);
  }

  for (let idx = 0; idx < 9; idx++) {
    const val = states[idx];
    const prev = prevStates[idx];
    const key = keyMap[idx];

    if (val === 1 && prev === 0) {
      if (hasTankKeys) keys[key] = true;
      document.dispatchEvent(new CustomEvent("menu-virtual-key", {
        detail: { key, states: [...states], source: "mqtt" }
      }));
      if (typeof flashKeyPanel === "function") flashKeyPanel(key);
      prevStates[idx] = 1;
    } else if (val === 0 && prev === 1) {
      if (hasTankKeys) keys[key] = false;
      prevStates[idx] = 0;
    }
  }
});

/* ==========================
   予防策: タブ非表示時に押しっぱなし解除
   ========================== */
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    for (let i = 0; i < 9; i++) {
      if (prevStates[i] === 1) {
        if (hasTankKeys) {
          keys[keyMap[i]] = false;
        }
        prevStates[i] = 0;
      }
    }
  }
});