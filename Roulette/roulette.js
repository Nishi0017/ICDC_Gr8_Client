// ルーレットシステムの状態管理
let currentStage = 'countdown';
let playersData = [];
let gameData = [];
let selectedGame = null;
let selectedPlayerCount = null;
let selectedPlayers = [];
let selectedMusic = null;

// DOM要素
const countdown = document.getElementById('countdown');
const countdownNumber = document.getElementById('countdownNumber');
const gameRoulette = document.getElementById('gameRoulette');
// ★ 人数ルーレットは使わない（取得もしない）
const playerSelectionRoulette = document.getElementById('playerSelectionRoulette');
const musicRoulette = document.getElementById('musicRoulette');
const finalResult = document.getElementById('finalResult');
const finalResultContent = document.getElementById('finalResultContent');
const startGameBtn = document.getElementById('startGameBtn');
const popup = document.getElementById('popup');
const popupText = document.getElementById('popupText');

// ルーレット関連の変数
let currentCanvas = null;
let currentItems = [];
let startAngle = 0;
let arc = 0;
let spinning = false;
let spinTime = 0;
let spinTimeTotal = 0;
let spinAngle = 0;

// 色の配列
const colors = ["#FF9999", "#FFCC99", "#FFFF99", "#99FF99", "#99CCFF", "#CC99FF"];

// ゲーム定義（プレイ可能人数レンジ）
const GAME_DEFS = [
  { key: 'snake-game',    name: 'Snake Game',    min: 2, max: 4 },
  { key: 'tank-game',     name: 'Tank Game',     min: 2, max: 2 },
  { key: 'shooting-game', name: 'Shooting Game', min: 1, max: 3 },
  { key: 'basket-game',   name: 'Basket Game',   min: 1, max: 4 }
];

// ========== ユーティリティ ==========

function hideAll() {
  gameRoulette.classList.add('hidden');
  playerSelectionRoulette.classList.add('hidden');
  musicRoulette.classList.add('hidden');
  finalResult.classList.add('hidden');
}

function resetWheel() {
  startAngle = 0;
  arc = 0;
  spinning = false;
  spinTime = 0;
  spinTimeTotal = 0;
  spinAngle = 0;
  currentItems = [];
  currentCanvas = null;
}

function getGameDisplayName(gameKey) {
  const found = GAME_DEFS.find(g => g.key === gameKey);
  return found ? found.name : String(gameKey);
}

function easeOutCubic(t, b, c, d) {
  t /= d;
  t--;
  return c * (t * t * t + 1) + b;
}

function showResult(elementId, text) {
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = text;
    element.classList.remove('hidden');
  }
  // ポップアップ表示
  popupText.textContent = text;
  popup.style.display = 'flex';
  setTimeout(() => { popup.style.display = 'none'; }, 2000);
}

// ========== 初期化 ==========

async function initialize() {
  try {
    await loadPlayers();
    startCountdown();
  } catch (err) {
    console.error("初期化失敗", err);
  }
}

// プレイヤーデータの読み込み
async function loadPlayers() {
  try {
    const res = await fetch("https://icdcgr8server-production.up.railway.app/players");
    const data = await res.json();
    // サーバー上のプレイヤー情報（name, game, music）を保存
    playersData = data.map(p => ({ name: p.name, game: p.game, music: p.music || null }));

    // ゲームごとにグループ化
    const gameGroups = {};
    playersData.forEach(player => {
      if (!player.game) return;
      if (!gameGroups[player.game]) gameGroups[player.game] = [];
      gameGroups[player.game].push(player);
    });

    gameData = Object.entries(gameGroups).map(([game, players]) => ({
      game,
      players,
      count: players.length
    }));

    console.log("プレイヤーデータ:", playersData);
    console.log("ゲームデータ:", gameData);
  } catch (err) {
    console.error("プレイヤーデータ読み込み失敗", err);
    throw err;
  }
}

// ========== カウントダウン ==========

function startCountdown() {
  hideAll();
  countdown.classList.remove('hidden');
  let count = 3;

  const countdownInterval = setInterval(() => {
    countdownNumber.textContent = count;
    countdownNumber.style.animation = 'none';
    countdownNumber.offsetHeight; // リフロー
    countdownNumber.style.animation = 'countdownPulse 1s ease-in-out';

    if (count <= 1) {
      clearInterval(countdownInterval);
      setTimeout(() => {
        countdown.classList.add('hidden');
        startGameRoulette();
      }, 1000);
    }
    count--;
  }, 1000);
}

// ========== ゲーム選択 ==========

function startGameRoulette() {
  currentStage = 'game';
  resetWheel();

  // 候補作成：登録があるゲームのみ。なければ全ゲームから選ぶ
  let items = gameData.map(g => g.game);
  if (items.length === 0) {
    items = GAME_DEFS.map(g => g.key);
    console.warn('登録ゲームが無いので、全ゲームから選択します。');
  }
  currentItems = items;

  currentCanvas = document.getElementById('gameWheelCanvas');
  arc = Math.PI * 2 / currentItems.length;

  hideAll();
  gameRoulette.classList.remove('hidden');
  drawWheel();

  setTimeout(() => { spinWheel(); }, 1000);
}

// ========== 音楽選択 ==========

function startMusicRoulette() {
  currentStage = 'music';
  resetWheel();

  currentCanvas = document.getElementById('musicWheelCanvas');

  // まだプレイヤーは未確定なので、全登録者の音楽嗜好を優先。無ければデフォルト。
  const allPrefs = playersData.map(p => p.music).filter(Boolean);
  const uniqueMusic = [...new Set(allPrefs)];
  currentItems = uniqueMusic.length > 0
    ? uniqueMusic
    : ['classical', 'jazz', 'rock', 'electronic', 'ambient'];

  arc = Math.PI * 2 / currentItems.length;

  hideAll();
  musicRoulette.classList.remove('hidden');
  drawWheel();

  setTimeout(() => { spinWheel(); }, 1000);
}

// ========== プレイヤー選択（順番決め・抽選） ==========

function startPlayerSelectionRoulette() {
  currentStage = 'playerSelection';
  resetWheel();

  // 念のため selectedPlayerCount が未設定の場合のフォールバック
  if (selectedPlayerCount == null) {
    const def = GAME_DEFS.find(g => g.key === selectedGame);
    selectedPlayerCount = Math.min(playersData.length, def ? def.max : playersData.length);
  }

  currentCanvas = document.getElementById('playerSelectionWheelCanvas');

  // まだ選ばれていない人だけを候補に
  const availablePlayers = playersData.map(p => p.name)
    .filter(name => !selectedPlayers.includes(name));

  // 利用可能な人数が足りない場合は、残りをすべて選ぶ
  const remain = selectedPlayerCount - selectedPlayers.length;
  if (availablePlayers.length === 0) {
    console.error('利用可能なプレイヤーがいません');
    setTimeout(() => showFinalResult(), 1000);
    return;
  }
  if (availablePlayers.length < remain) {
    console.warn(`利用可能なプレイヤー数が不足。要求:${remain}, 利用可能:${availablePlayers.length}`);
    selectedPlayerCount = selectedPlayers.length + availablePlayers.length;
  }

  currentItems = availablePlayers;
  arc = Math.PI * 2 / currentItems.length;

  hideAll();
  // 直前は musicRoulette なのでそれを隠し、プレイヤー選択を表示
  playerSelectionRoulette.classList.remove('hidden');
  drawWheel();

  setTimeout(() => { spinWheel(); }, 1000);
}

// ========== 最終結果表示 ==========
function showFinalResult() {
  currentStage = 'final';
  hideAll();

  const gameDisplayName = getGameDisplayName(selectedGame);
  const playerLines = selectedPlayers.map((name, idx) => `P${idx + 1}: ${name}`).join(' / ');

  finalResultContent.innerHTML = `
    <div><strong>ゲーム:</strong> ${gameDisplayName}</div>
    <div><strong>プレイヤー数:</strong> ${selectedPlayerCount}人</div>
    <div><strong>プレイヤー:</strong> ${playerLines}</div>
    <div><strong>音楽:</strong> ${selectedMusic}</div>
  `;

  finalResult.classList.remove('hidden');

  // ★ ここで自動ページ移動
  const params = new URLSearchParams({
    game: selectedGame,
    players: selectedPlayers.join(','),
    music: selectedMusic
  });
  console.log("ゲーム開始:", params.toString());

  // 2秒後に Ready ページへ移動
  setTimeout(() => {
    window.location.href = `../ready/ready.html?${params.toString()}`;
  }, 2000);
}


// ========== 描画/回転 ==========

function drawWheel() {
  const ctx = currentCanvas.getContext("2d");
  ctx.clearRect(0, 0, currentCanvas.width, currentCanvas.height);

  if (currentItems.length === 0) return; // 安全策

  if (currentStage === 'game') {
    const gameCounts = {};
    gameData.forEach(g => { gameCounts[g.game] = g.count; });

    currentItems.forEach((item, i) => {
      let angle = startAngle + i * arc;
      ctx.fillStyle = colors[i % colors.length];
      ctx.beginPath();
      ctx.moveTo(250, 250);
      ctx.arc(250, 250, 250, angle, angle + arc, false);
      ctx.lineTo(250, 250);
      ctx.fill();

      // テキスト（ゲーム名 + 重複数）
      ctx.save();
      ctx.translate(250, 250);
      ctx.rotate(angle + arc / 2);
      ctx.textAlign = "right";
      ctx.fillStyle = "#333";
      ctx.font = "bold 16px sans-serif";

      const gameName = getGameDisplayName(item);
      const count = gameCounts[item] || 0;
      let displayText = `${gameName} (${count}人)`;
      if (displayText.length > 15) displayText = displayText.substring(0, 13) + '...';

      ctx.fillText(displayText, 230, 8);
      ctx.restore();
    });
  } else {
    currentItems.forEach((item, i) => {
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
      ctx.font = "bold 16px sans-serif";

      let displayText = String(item);
      if (displayText.length > 10) displayText = displayText.substring(0, 8) + '...';

      ctx.fillText(displayText, 230, 8);
      ctx.restore();
    });
  }

  // ポインター
  ctx.fillStyle = "#333";
  ctx.beginPath();
  ctx.moveTo(250 - 15, 0);
  ctx.lineTo(250 + 15, 0);
  ctx.lineTo(250, 30);
  ctx.closePath();
  ctx.fill();
}

function spinWheel() {
  if (spinning || currentItems.length === 0) return;
  spinning = true;

  if (currentStage === 'game') {
    // 重み付き：登録者数ぶん重み。0件なら均等ランダム
    const weightedItems = [];
    gameData.forEach(g => {
      for (let i = 0; i < g.count; i++) weightedItems.push(g.game);
    });

    let selectedGameKey;
    if (weightedItems.length > 0) {
      const randomIndex = Math.floor(Math.random() * weightedItems.length);
      selectedGameKey = weightedItems[randomIndex];
    } else {
      // 均等ランダム
      selectedGameKey = currentItems[Math.floor(Math.random() * currentItems.length)];
    }

    const gameIndex = currentItems.indexOf(selectedGameKey);
    if (gameIndex !== -1) {
      const targetAngle = gameIndex * arc + arc / 2;
      spinAngle = (targetAngle * 180 / Math.PI) + Math.random() * 30 - 15;
    } else {
      spinAngle = Math.random() * 150;
    }
  } else {
    spinAngle = Math.random() * 150;
  }

  spinTime = 0;
  spinTimeTotal = Math.random() * 3000 + 4000;
  requestAnimationFrame(rotateWheel);
}

function rotateWheel() {
  spinTime += 30;
  if (spinTime >= spinTimeTotal) {
    stopRotateWheel();
    return;
  }
  let spinAngleChange = easeOutCubic(spinTime, spinAngle, 0 - spinAngle, spinTimeTotal);
  startAngle += (spinAngleChange * Math.PI / 180);
  drawWheel();
  requestAnimationFrame(rotateWheel);
}

function stopRotateWheel() {
  if (currentItems.length === 0) {
    spinning = false;
    return;
  }

  let degrees = startAngle * 180 / Math.PI + 90;
  let arcd = arc * 180 / Math.PI;
  let index = Math.floor((360 - (degrees % 360)) / arcd) % currentItems.length;
  const selected = currentItems[index];

  switch (currentStage) {
    case 'game': {
      selectedGame = selected;
      showResult('gameResult', `ゲーム: ${getGameDisplayName(selected)}`);

      // 最大人数を決定（最少人数は仕様上気にせず、参加可能最大のみ適用）
      const def = GAME_DEFS.find(g => g.key === selectedGame);
      const maxPlayers = def ? def.max : Math.max(1, playersData.length);
      selectedPlayerCount = Math.min(playersData.length, maxPlayers);

      // 次は音楽ルーレット
      setTimeout(() => startMusicRoulette(), 2000);
      break;
    }

    case 'music': {
      selectedMusic = selected;
      showResult('musicResult', `音楽: ${selected}`);

      // 必ずプレイヤー選択ルーレットへ（全員参加でも順番決定のため）
      selectedPlayers = [];
      setTimeout(() => startPlayerSelectionRoulette(), 2000);
      break;
    }

    case 'playerSelection': {
      // 同一人物の重複選択を避けるため currentItems から選ぶ前提
      selectedPlayers.push(selected);
      if (selectedPlayers.length < selectedPlayerCount) {
        showResult('playerSelectionResult', `プレイヤー${selectedPlayers.length}人目: ${selected}`);
        spinning = false;
        setTimeout(() => startPlayerSelectionRoulette(), 1200);
        return;
      }
      showResult('playerSelectionResult', `プレイヤー確定: ${selectedPlayers.join(', ')}`);
      setTimeout(() => showFinalResult(), 2000);
      break;
    }
  }

  spinning = false;
}
/*
// ゲーム開始ボタン
startGameBtn.addEventListener('click', () => {
  const params = new URLSearchParams({
    game: selectedGame,
    players: selectedPlayers.join(','),
    music: selectedMusic
  });
  console.log("ゲーム開始:", params.toString());
  window.location.href = `../ready/ready.html?${params.toString()}`;
});
*/

// 初期化開始
initialize();
