// Element references
const form = document.getElementById('registerForm');
const nameInput = document.getElementById('playerName');
const gameSelect = document.getElementById('gameSelect');
const resultBox = document.getElementById('result');
const nameError = document.getElementById('nameError');

// Validation function
function validateName(name){
  const trimmed = name.trim();
  if (!trimmed) return "Please enter your player name.";
  if (trimmed.length < 2) return "Name must be at least 2 characters.";
  return "";
}

// フォーム送信処理
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  nameError.style.display = 'none';
  resultBox.style.display = 'none';

  const name = nameInput.value;
  const game = gameSelect.value;

  const err = validateName(name);
  if (err){
    nameError.textContent = err;
    nameError.style.display = 'block';
    nameInput.focus();
    return;
  }

  const player = {
    name: name.trim(),
    game,
    timestamp: new Date().toISOString()
  };

  try {
    // ★ RailwayのURL + POST
    const res = await fetch('https://icdcgr8server-production.up.railway.app/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(player)
    });

    if (!res.ok) throw new Error('Failed to register');

    const data = await res.json();

    resultBox.innerHTML = `
      <strong>${data.message}</strong><br />
      Player Name: ${escapeHtml(player.name)}<br />
      Selected Game: ${escapeHtml(displayGameName(player.game))}<br />
      Registered At: ${new Date(player.timestamp).toLocaleString()}
    `;
    resultBox.style.display = 'block';
  } catch (error) {
    resultBox.innerHTML = `<strong style="color:red;">Error:</strong> ${error.message}`;
    resultBox.style.display = 'block';
  }
});


// Display name for game options
function displayGameName(key){
  const map = {
    'dance-mat': '3x3 Dance Mat Game',
    'rocket-coop': 'Cooperative Rocket Game',
    'multiplayer-snake': 'Multiplayer Snake',
    'custom': 'Other (Custom)'
  };
  return map[key] || key;
}

// Simple HTML escape
function escapeHtml(s){
  return String(s)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#39;');
}

// Populate from previous registration if available (optional)
(function populateFromStorage(){
  const raw = localStorage.getItem('playerRegistration');
  if (raw){
    const p = JSON.parse(raw);
    if (p.name) nameInput.value = p.name;
    if (p.game) gameSelect.value = p.game;
  }
})();
