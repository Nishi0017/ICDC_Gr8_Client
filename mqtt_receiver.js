// MQTT接続設定
const host = "wss://b38edc2604c14abc8b3ee5433d86202d.s1.eu.hivemq.cloud:8884/mqtt";
const options = {
  username: "ICDC_Gr8",
  password: "icdc_Gr8",
  clean: true,
  connectTimeout: 4000,
};

const keyMap = ["q", "w", "e", "a", "s", "d", "z", "x", "c"];

const client = mqtt.connect(host, options);

client.on("connect", () => {
  console.log("✅ Connected to HiveMQ Cloud");
  client.subscribe("dance/mat", (err) => {
    if (!err) console.log("📡 Subscribed to dance/mat");
  });
});

client.on("message", (topic, message) => {
  const payload = message.toString().trim();
  console.log(`💡 ${topic}: ${payload}`);

  if (topic === "dance/mat") {
    const states = payload.split(",").map(v => parseInt(v, 10));
    states.forEach((val, idx) => {
      if (val === 1) {
        // キー押下イベントを発火
        const key = keyMap[idx];
        document.dispatchEvent(new KeyboardEvent("keydown", { key }));
        console.log(`🔹 Simulated key: ${key}`);
      }
    });
  }
});
