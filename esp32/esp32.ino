#include "WT2605C_Player.h"
#include <NeoPixelBus.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>

// -------------------- MP3設定 --------------------
#define MP3_UART_RX 16
#define MP3_UART_TX 17
WT2605C<HardwareSerial> mp3Player;

// -------------------- ダンスマットボタン設定 --------------------
const uint8_t BTN_PINS[9] = {4,5,23,27,32,33,0,2,15}; 

// -------------------- NeoPixel LEDストリップ設定 --------------------
const uint8_t STRIP_PIN[9]  = {13,14,18,19,21,22,25,26,12};
const uint16_t STRIP_LEN[9] = {4,4,4,4,4,4,4,4,4};

NeoPixelBus<NeoGrbFeature, NeoEsp32Rmt0Ws2812xMethod> s0(STRIP_LEN[0], STRIP_PIN[0]);
NeoPixelBus<NeoGrbFeature, NeoEsp32Rmt1Ws2812xMethod> s1(STRIP_LEN[1], STRIP_PIN[1]);
NeoPixelBus<NeoGrbFeature, NeoEsp32Rmt2Ws2812xMethod> s2(STRIP_LEN[2], STRIP_PIN[2]);
NeoPixelBus<NeoGrbFeature, NeoEsp32Rmt3Ws2812xMethod> s3(STRIP_LEN[3], STRIP_PIN[3]);
NeoPixelBus<NeoGrbFeature, NeoEsp32Rmt4Ws2812xMethod> s4(STRIP_LEN[4], STRIP_PIN[4]);
NeoPixelBus<NeoGrbFeature, NeoEsp32Rmt5Ws2812xMethod> s5(STRIP_LEN[5], STRIP_PIN[5]);
NeoPixelBus<NeoGrbFeature, NeoEsp32Rmt6Ws2812xMethod> s6(STRIP_LEN[6], STRIP_PIN[6]);
NeoPixelBus<NeoGrbFeature, NeoEsp32Rmt7Ws2812xMethod> s7(STRIP_LEN[7], STRIP_PIN[7]);
NeoPixelBus<NeoGrbFeature, NeoEsp32BitBangWs2812xMethod> s8(STRIP_LEN[8], STRIP_PIN[8]);

// カラー変化用
unsigned long lastChange = 0;
const unsigned long intervalMs = 200; // 色切り替え間隔（ミリ秒）
int colorIndex = 0;

// 仮想キー入力用（必要なければ削除可）
char keyMap[9]     = {'q','w','e','a','s','d','z','x','c'};
char keyMapHold[9] = {'1','2','3','4','5','6','7','8','9'};
unsigned long holdUntil[9] = {0};

RgbColor colorFromIndex(int idx) {
  switch(idx) {
    case 0: return makeColor(255, 0, 0);   // 赤
    case 1: return makeColor(255, 127, 0); // オレンジ
    case 2: return makeColor(255, 255, 0); // 黄
    case 3: return makeColor(0, 255, 0);   // 緑
    case 4: return makeColor(0, 0, 255);   // 青
    case 5: return makeColor(75, 0, 130);  // 紫
    default:return makeColor(255, 255, 255); // 白（フォールバック）
  }
}



// -------------------- LED色 --------------------
const float globalBrightness = 1.0f;
RgbColor makeColor(uint8_t r, uint8_t g, uint8_t b) {
  if(globalBrightness >= 0.999f) return RgbColor(r,g,b);
  return RgbColor(uint8_t(r*globalBrightness), uint8_t(g*globalBrightness), uint8_t(b*globalBrightness));
}

// 白色を固定点灯に使用
const RgbColor pressColor = makeColor(255,255,255);

void beginAllStrips(){
  s0.Begin(); s1.Begin(); s2.Begin(); s3.Begin(); s4.Begin();
  s5.Begin(); s6.Begin(); s7.Begin(); s8.Begin();
  s0.ClearTo(RgbColor(0)); s1.ClearTo(RgbColor(0)); s2.ClearTo(RgbColor(0));
  s3.ClearTo(RgbColor(0)); s4.ClearTo(RgbColor(0)); s5.ClearTo(RgbColor(0));
  s6.ClearTo(RgbColor(0)); s7.ClearTo(RgbColor(0)); s8.ClearTo(RgbColor(0));
  showAll();
}

void setStripSolidNoShow(uint8_t idx, const RgbColor& c){
  switch(idx){
    case 0: s0.ClearTo(c); break; case 1: s1.ClearTo(c); break;
    case 2: s2.ClearTo(c); break; case 3: s3.ClearTo(c); break;
    case 4: s4.ClearTo(c); break; case 5: s5.ClearTo(c); break;
    case 6: s6.ClearTo(c); break; case 7: s7.ClearTo(c); break;
    default: s8.ClearTo(c); break;
  }
}

void showAll(){
  s0.Show(); s1.Show(); s2.Show(); s3.Show(); s4.Show();
  s5.Show(); s6.Show(); s7.Show(); s8.Show();
}

// =====================
// Wi-Fi / MQTT設定
// =====================
const char* ssid = "シィグのiPhone";
const char* pass = "dsonxf4m43agg";

const char* mqtt_server = "b38edc2604c14abc8b3ee5433d86202d.s1.eu.hivemq.cloud";
const int mqtt_port = 8883;
const char* mqtt_user = "ICDC_Gr8";
const char* mqtt_pass = "icdc_Gr8";

WiFiClientSecure espClient;
PubSubClient client(espClient);

// =====================
// ダンスマット状態
// =====================
int matState[9] = {0};
int lastMatState[9] = {0};

// =====================
// Wi-Fi接続
// =====================
void connectWiFi(){
  WiFi.begin(ssid, pass);
  Serial.print("Connecting WiFi");
  while(WiFi.status() != WL_CONNECTED){
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected: " + WiFi.localIP().toString());
}

// =====================
// MQTT接続
// =====================
void connectMQTT(){
  espClient.setInsecure();
  client.setServer(mqtt_server, mqtt_port);

  String clientId = "ESP32Client-" + WiFi.macAddress();

  while(!client.connected()){
    Serial.print("Connecting MQTT...");
    if(client.connect(clientId.c_str(), mqtt_user, mqtt_pass)){
      Serial.println("connected");

      client.subscribe("dance/mat");
      client.subscribe("dance/command");
      client.subscribe("dance/playSong");

      Serial.println("Subscribed to topics:");
      Serial.println("  dance/mat");
      Serial.println("  dance/command");
      Serial.println("  dance/playSong");
    } else{
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" retry in 5s");
      delay(5000);
    }
  }
}

// =====================
// ESP32 setup
// =====================
void setup(){
  Serial.begin(115200);

  for(uint8_t i=0; i<9; i++){ pinMode(BTN_PINS[i], INPUT_PULLUP); }

  beginAllStrips();
  showAll();

  Serial2.begin(115200, SERIAL_8N1, MP3_UART_RX, MP3_UART_TX);
  mp3Player.init(Serial2);
  mp3Player.volume(5);

  connectWiFi();

  client.setCallback([](char* topic, byte* payload, unsigned int length){
    String msg = "";
    for(unsigned int i=0; i<length; i++) { msg += (char)payload[i]; }
    Serial.print("Message arrived ["); Serial.print(topic); Serial.print("]: "); 
    Serial.println(msg);

    if(String(topic) == "dance/playSong"){
      int songNum = msg.toInt();
      Serial.println("Playing song number: " + String(songNum));
      if (songNum == 0) {
        mp3Player.stop();
        Serial.println("Music stopped");
      } else {
        mp3Player.playMode(WT2605C_SINGLE_CYCLE);
        mp3Player.playSDRootSong(songNum);
      }
    }
  });

  connectMQTT();

  Serial.println("=== Ready for dance mat test ===");
}

// =====================
// ESP32 loop
// =====================
void loop(){
  if(!client.connected()) connectMQTT();
  client.loop();

  unsigned long now = millis();

  // 色変化のタイマー
  if(now - lastChange >= intervalMs){
    colorIndex = (colorIndex+1)%6;
    lastChange = now;
  }
  const RgbColor runColor = colorFromIndex(colorIndex);

  // シリアル入力チェック（キーボード押下シミュレーション）
  if (Serial.available() > 0) {
    char c = tolower(Serial.read());
    for (int j = 0; j < 9; j++) {
      if (c == keyMap[j] || c == keyMapHold[j]){
        matState[j] = 1;
        holdUntil[j] = now + 1000;
      }
    }
  }

  // ボタン状態読み取り
  for(uint8_t i=0; i<9; i++){
    bool pressed = (digitalRead(BTN_PINS[i]) == LOW) ||
                   (holdUntil[i] > 0 && now <= holdUntil[i]);
    matState[i] = pressed ? 1 : 0;
  }

  // LED表示（押されている間だけ色を変化させて点灯）
  for(uint8_t i=0; i<9; i++){
    if(matState[i] == 1){
      setStripSolidNoShow(i, runColor); // カラフル点灯
    } else {
      setStripSolidNoShow(i, RgbColor(0)); // 消灯
    }
  }
  showAll();

  // MQTT送信（状態変化があった時のみ）
  bool changed = false;
  for(int i=0; i<9; i++){
    if(matState[i] != lastMatState[i]){
      changed = true;
      break;
    }
  }
  if(changed){
    String payload = "";
    for(int i=0; i<9; i++){
      payload += String(matState[i]);
      if(i<8) payload += ",";
    }
    client.publish("dance/mat", payload.c_str());
    memcpy(lastMatState, matState, sizeof(matState));
  }
}
