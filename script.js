// WebSocket URL configuration
const WEBSOCKET_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'ws://localhost:8001'
  : 'wss://fighting-game-server-production.up.railway.app';

// --- Character Setup ---
const characters = [
  "mario", "luigi", "kirby", "sonic", "tails", "shadow",
  "toriel", "sans", "mettaton", "kris", "susie",
  "jevil", "spadeking", "berdly", "noelle", "spamton"
];
const cooldowns = {
  mario: 750, luigi: 750, kirby: 750, sonic: 750, tails: 750,
  shadow: 500, toriel: 750, sans: 500, mettaton: 1250,
  kris: 1250, susie: 1500, jevil: 1250, spadeking: 1500,
  berdly: 750, noelle: 750, spamton: 500
};

let p1Char = null, p2Char = null, aiChar = null;
let aiDifficulty = "medium";
let aiEnabled = true;
let gameMode = "versus";
const MODERN_LIVES = 3;

// Add these variables at the top of your file
let ws = null;
let playerId = null;
let roomId = null;
let isHost = false;

// WebSocket connection and online game handling
let currentRoomId = null;
let isOnlineGame = false;

// Add a mapping for case-sensitive filenames
const characterImages = {
  mario: 'mario.png',
  luigi: 'luigi.png',
  kirby: 'kirby.png',
  sonic: 'sonic.png',
  tails: 'Tails.png',
  shadow: 'shadow.png',
  toriel: 'toriel.png',
  sans: 'sans.png',
  mettaton: 'Mettaton.png',
  kris: 'kris.png',
  susie: 'susie.png',
  jevil: 'jevil.png',
  spadeking: 'spadeking.png',
  berdly: 'berdly.png',
  noelle: 'noelle.png',
  spamton: 'spamton.png'
};

// --- Character Select UI ---
document.getElementById("game-mode").addEventListener("change", (e) => {
  gameMode = e.target.value;
  if (gameMode === "coop" || gameMode === "moderncoop") {
    document.getElementById("ai-toggle").checked = true;
    document.getElementById("ai-toggle").disabled = true;
    aiEnabled = true;
    document.getElementById("ai-characters").style.display = "flex";
    document.getElementById("ai-difficulty").disabled = false;
    document.getElementById("ai-health").style.display = "block";
  } else if (gameMode === "versus" || gameMode === "modern") {
    document.getElementById("ai-toggle").disabled = false;
  } else if (gameMode === "onlineclassic" || gameMode === "onlinemodern") {
    const hostGame = confirm("Do you want to host the game?");
    isHost = hostGame;
    isOnlineGame = true;
    
    if (hostGame) {
      initializeOnlineGame(gameMode);
    } else {
      const code = prompt("Enter room code:");
      if (code) {
        initializeOnlineGame(gameMode);
        // Join existing room after connection is established
        setTimeout(() => {
          ws.send(JSON.stringify({
            type: 'join_room',
            roomId: code
          }));
        }, 1000);
      }
    }
  }
  validateStart();
});
document.getElementById("ai-difficulty").addEventListener("change", e => {
  aiDifficulty = e.target.value;
});
document.getElementById("ai-toggle").addEventListener("change", e => {
  aiEnabled = e.target.checked;
  document.getElementById("ai-characters").style.display = aiEnabled ? "flex" : "none";
  document.getElementById("ai-difficulty").disabled = !aiEnabled;
  document.getElementById("ai-health").style.display = aiEnabled ? "block" : "none";
  validateStart();
});

const p1Container = document.getElementById("p1-characters");
const p2Container = document.getElementById("p2-characters");
const aiContainer = document.getElementById("ai-characters");
characters.forEach(char => {
  function createChar(container, selectFn) {
    const img = document.createElement("img");
    img.src = `images/${characterImages[char]}`;
    img.alt = char;
    img.addEventListener("click", () => selectFn(char, img));
    container.appendChild(img);
  }
  createChar(p1Container, (char, img) => selectCharacter(1, char, img));
  createChar(p2Container, (char, img) => selectCharacter(2, char, img));
  createChar(aiContainer, selectAICharacter);
});
function selectCharacter(player, char, imgElement) {
  if (player === 1) {
    p1Char = char;
    document.querySelectorAll("#p1-characters img").forEach(i => i.classList.remove("selected"));
    imgElement.classList.add("selected");
  } else if (player === 2) {
    p2Char = char;
    document.querySelectorAll("#p2-characters img").forEach(i => i.classList.remove("selected"));
    imgElement.classList.add("selected");
  }
  validateStart();
}
function selectAICharacter(char, imgElement) {
  aiChar = char;
  document.querySelectorAll("#ai-characters img").forEach(i => i.classList.remove("selected"));
  imgElement.classList.add("selected");
  validateStart();
}
function validateStart() {
  if ((aiEnabled || gameMode === "coop" || gameMode === "moderncoop" || gameMode === "modern")) {
    document.getElementById("start-game").disabled = !(p1Char && p2Char && aiChar);
  } else {
    document.getElementById("start-game").disabled = !(p1Char && p2Char);
  }
}

// === GAME LOGIC ===

let canvas = null, ctx = null;
let p1, p2, ai, keys = {}, projectiles = [];
const groundY = 300, gravity = 1;
const p1Img = new Image(), p2Img = new Image(), aiImg = new Image();
let p1LastAttack = 0, p2LastAttack = 0, aiLastAttack = 0, gameEnded = false;

document.addEventListener("keydown", e => {
  keys[e.key] = true;
  if (isModernMode()) {
    if (p1 && !p1.isOut && p1.lives > 0 && e.key.toLowerCase() === "q" && p1.energy === 100) useUltimateModern(p1, 1);
    if (p2 && !p2.isOut && p2.lives > 0 && e.key.toLowerCase() === "o" && p2.energy === 100) useUltimateModern(p2, 2);
  } else {
    if (p1 && p1.health > 0 && e.key.toLowerCase() === "q" && p1.energy === 100) useUltimateClassic(p1, 1);
    if (p2 && p2.health > 0 && e.key.toLowerCase() === "o" && p2.energy === 100) useUltimateClassic(p2, 2);
  }
});
document.addEventListener("keyup", e => keys[e.key] = false);

document.getElementById("start-game").addEventListener("click", () => {
  document.getElementById("character-select").style.display = "none";
  document.getElementById("game-screen").style.display = "block";
  startGame();
});

function isModernMode() {
  return gameMode === "modern" || gameMode === "moderncoop";
}
function makeModernPlayer(x, y, facing) {
  return {
    x, y, percent: 0, lives: MODERN_LIVES, vy: 0, facing,
    energy: 0, knockback: 0, knockbackDir: 0, isOut: false
  };
}
function getCurrentTarget() {
  // Returns the first alive player (prefers p1)
  if (isModernMode()) {
    if (p1 && !p1.isOut && p1.lives > 0) return p1;
    if (p2 && !p2.isOut && p2.lives > 0) return p2;
  } else {
    if (p1 && p1.health > 0) return p1;
    if (p2 && p2.health > 0) return p2;
  }
  return null;
}

function startGame() {
  document.getElementById("game-over").style.display = "none";
  p1Img.src = `images/${characterImages[p1Char]}`;
  p2Img.src = `images/${characterImages[p2Char]}`;
  if ((aiEnabled || gameMode === "coop" || gameMode === "moderncoop" || gameMode === "modern") && aiChar) {
    aiImg.src = `images/${characterImages[aiChar]}`;
  }

  if (isModernMode()) {
    p1 = makeModernPlayer(100, 300, "right");
    p2 = makeModernPlayer(600, 300, "left");
    ai = makeModernPlayer(350, 300, "left");
  } else {
    p1 = { x: 100, y: 300, health: 1000, vy: 0, facing: "right", energy: 0, knockback: 0, knockbackDir: 0 };
    p2 = { x: 600, y: 300, health: 1000, vy: 0, facing: "left", energy: 0, knockback: 0, knockbackDir: 0 };
    ai = { x: 350, y: 300, health: 1000, vy: 0, facing: "left", energy: 0, knockback: 0, knockbackDir: 0 };
  }
  projectiles = [];
  gameEnded = false;
  p1LastAttack = 0; p2LastAttack = 0; aiLastAttack = 0;
  canvas = document.getElementById("gameCanvas");
  ctx = canvas.getContext("2d");
  requestAnimationFrame(gameLoop);
}

function gameLoop() {
  if (gameEnded) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const now = performance.now();

  if (isModernMode()) {
    if (!p1.isOut && p1.lives > 0) movePlayerModern(p1, ["a", "d", "w"]);
    if (!p2.isOut && p2.lives > 0) movePlayerModern(p2, ["ArrowLeft", "ArrowRight", "ArrowUp"]);
    applyGravity(p1); applyGravity(p2);
    if ((aiEnabled || gameMode === "moderncoop" || gameMode === "modern") && !ai.isOut && ai.lives > 0) {
      handleAIModern(ai, now);
      applyGravity(ai);
    }
    checkOutOfBounds(p1, 100, 300);
    checkOutOfBounds(p2, 600, 300);
    checkOutOfBounds(ai, 350, 300);

    if (!p1.isOut && p1.lives > 0 && keys["e"] && now - p1LastAttack >= cooldowns[p1Char]) {
      performAttackModern(p1, p1Char, 1);
      p1LastAttack = now;
    }
    if (!p2.isOut && p2.lives > 0 && keys["l"] && now - p2LastAttack >= cooldowns[p2Char]) {
      performAttackModern(p2, p2Char, 2);
      p2LastAttack = now;
    }

    moveProjectilesModern();

    if (!p1.isOut && p1.lives > 0) ctx.drawImage(p1Img, p1.x, p1.y, 100, 100);
    if (!p2.isOut && p2.lives > 0) ctx.drawImage(p2Img, p2.x, p2.y, 100, 100);
    if ((aiEnabled || gameMode === "moderncoop" || gameMode === "modern") && !ai.isOut && ai.lives > 0) ctx.drawImage(aiImg, ai.x, ai.y, 100, 100);

    document.getElementById("p1-health").textContent = `P1: ${p1.percent}% | Lives: ${p1.lives}`;
    document.getElementById("p2-health").textContent = `P2: ${p2.percent}% | Lives: ${p2.lives}`;
    document.getElementById("ai-health").textContent =
      (aiEnabled || gameMode === "moderncoop" || gameMode === "modern") ? `AI: ${ai.percent}% | Lives: ${ai.lives}` : "";

    updateEnergyBars();

    // Win/Lose logic
    if (gameMode === "modern") {
      let alive = [p1, p2, ai].filter(p => !p.isOut && p.lives > 0);
      if (alive.length <= 1) {
        let winner = p1.lives > 0 ? "Player 1" : p2.lives > 0 ? "Player 2" : "AI";
        showGameOver(winner);
        return;
      }
    } else if (gameMode === "moderncoop") {
      if (ai.lives <= 0 || ai.isOut) {
        showGameOver("You win!");
        return;
      }
      if ((p1.lives <= 0 || p1.isOut) && (p2.lives <= 0 || p2.isOut)) {
        showGameOver("You lose!");
        return;
      }
    }
    requestAnimationFrame(gameLoop);
    return;
  }

  if (p1.health > 0) movePlayer(p1, ["a", "d", "w"]);
  if (p2.health > 0) movePlayer(p2, ["ArrowLeft", "ArrowRight", "ArrowUp"]);
  applyGravity(p1); applyGravity(p2);

  if ((aiEnabled || gameMode === "coop") && ai.health > 0) {
    handleAI(ai, now);
    applyGravity(ai);
  }

  if (p1.health > 0 && keys["e"] && now - p1LastAttack >= cooldowns[p1Char]) {
    performAttack(p1, p1Char, 1);
    p1LastAttack = now;
  }
  if (p2.health > 0 && keys["l"] && now - p2LastAttack >= cooldowns[p2Char]) {
    performAttack(p2, p2Char, 2);
    p2LastAttack = now;
  }

  moveProjectiles();

  if (p1.health > 0) ctx.drawImage(p1Img, p1.x, p1.y, 100, 100);
  if (p2.health > 0) ctx.drawImage(p2Img, p2.x, p2.y, 100, 100);
  if ((aiEnabled || gameMode === "coop") && ai.health > 0) ctx.drawImage(aiImg, ai.x, ai.y, 100, 100);

  document.getElementById("p1-health").textContent = `Player 1: ${Math.max(0, p1.health)}`;
  document.getElementById("p2-health").textContent = `Player 2: ${Math.max(0, p2.health)}`;
  document.getElementById("ai-health").textContent = (aiEnabled || gameMode === "coop") ? `AI: ${Math.max(0, ai.health)}` : "";

  updateEnergyBars();

  if (gameMode === "versus") {
    const alive = [];
    if (p1.health > 0) alive.push("Player 1");
    if (p2.health > 0) alive.push("Player 2");
    if ((aiEnabled || gameMode === "coop") && ai.health > 0) alive.push("AI");
    if (alive.length === 1) {
      showGameOver(alive[0]);
      return;
    }
  } else if (gameMode === "coop") {
    if ((aiEnabled || gameMode === "coop") && ai.health <= 0) {
      showGameOver("win");
      return;
    }
    if (p1.health <= 0 && p2.health <= 0) {
      showGameOver("lose");
      return;
    }
  }
  requestAnimationFrame(gameLoop);
}

// --- AI TARGETTING ---
function handleAI(ai, now) {
  const target = getCurrentTarget();
  if (!target) return;

  // Use ultimate when energy is full
  if (ai.energy === 100) {
    useUltimateClassic(ai, 3);
    return;
  }

  // Existing AI logic
  const dx = target.x - ai.x;
  const dy = target.y - ai.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  ai.facing = dx > 0 ? "right" : "left";

  if (aiDifficulty === "easy") {
    if (Math.random() < 0.02 && now - aiLastAttack >= cooldowns[aiChar]) {
      performAttack(ai, aiChar, 3);
      aiLastAttack = now;
    }
    if (Math.random() < 0.02) ai.vy = -15;
    if (Math.random() < 0.03) ai.x += dx > 0 ? 5 : -5;
  } else if (aiDifficulty === "medium") {
    if (dist < 150 && now - aiLastAttack >= cooldowns[aiChar]) {
      performAttack(ai, aiChar, 3);
      aiLastAttack = now;
    }
    if (dist > 200) ai.x += dx > 0 ? 5 : -5;
    if (dy < -50 && ai.y === groundY) ai.vy = -15;
  } else if (aiDifficulty === "hard") {
    if (dist < 200 && now - aiLastAttack >= cooldowns[aiChar]) {
      performAttack(ai, aiChar, 3);
      aiLastAttack = now;
    }
    if (Math.abs(dx) > 100) ai.x += dx > 0 ? 6 : -6;
    if (dy < -30 && ai.y === groundY) ai.vy = -15;
    if (dist < 100) ai.x += dx > 0 ? -4 : 4;
  }
}
function handleAIModern(ai, now) {
  const target = getCurrentTarget();
  if (!target) return;

  // Use ultimate when energy is full
  if (ai.energy === 100) {
    useUltimateModern(ai, 3);
    return;
  }

  // Existing AI logic
  const dx = target.x - ai.x;
  const dy = target.y - ai.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  ai.facing = dx > 0 ? "right" : "left";

  if (aiDifficulty === "easy") {
    if (Math.random() < 0.02 && now - aiLastAttack >= cooldowns[aiChar]) {
      performAttackModern(ai, aiChar, 3);
      aiLastAttack = now;
    }
    if (Math.random() < 0.02) ai.vy = -15;
    if (Math.random() < 0.03) ai.x += dx > 0 ? 5 : -5;
  } else if (aiDifficulty === "medium") {
    if (dist < 150 && now - aiLastAttack >= cooldowns[aiChar]) {
      performAttackModern(ai, aiChar, 3);
      aiLastAttack = now;
    }
    if (dist > 200) ai.x += dx > 0 ? 5 : -5;
    if (dy < -50 && ai.y === groundY) ai.vy = -15;
  } else if (aiDifficulty === "hard") {
    if (dist < 200 && now - aiLastAttack >= cooldowns[aiChar]) {
      performAttackModern(ai, aiChar, 3);
      aiLastAttack = now;
    }
    if (Math.abs(dx) > 100) ai.x += dx > 0 ? 6 : -6;
    if (dy < -30 && ai.y === groundY) ai.vy = -15;
    if (dist < 100) ai.x += dx > 0 ? -4 : 4;
  }
}

// ========== MODERN LOGIC =============
function movePlayerModern(player, keysList) {
  if (player.knockback && !player.isOut && player.lives > 0) {
    player.x += player.knockback * player.knockbackDir;
    player.knockback *= 0.85;
    if (Math.abs(player.knockback) < 1) player.knockback = 0;
    return;
  }
  if (keys[keysList[0]]) { player.x -= 5; player.facing = "left"; }
  if (keys[keysList[1]]) { player.x += 5; player.facing = "right"; }
  if (keys[keysList[2]] && player.y === groundY) player.vy = -15;
}
function checkOutOfBounds(player, startX, startY) {
  if (player.isOut) return;
  if (player.x < -80 || player.x > canvas.width + 30 ||
      player.y > canvas.height + 50 || player.y < -120) {
    player.lives--;
    if (player.lives <= 0) {
      player.isOut = true;
    } else {
      Object.assign(player, { x: startX, y: startY, percent: 0, vy: 0, knockback: 0, knockbackDir: 0 });
    }
  }
}
function performAttackModern(player, character, owner) {
  if (player.isOut || player.lives <= 0) return;
  const type = getAttackType(character);
  let targets;
  if (gameMode === "moderncoop") {
    if (owner === 1 || owner === 2) targets = [ai];
    else if (owner === 3) {
      targets = [];
      if (p1.lives > 0 && !p1.isOut) targets.push(p1);
      if (p2.lives > 0 && !p2.isOut) targets.push(p2);
    }
  } else {
    targets = [p1, p2];
    if (aiEnabled || gameMode === "moderncoop" || gameMode === "modern") targets.push(ai);
    targets = targets.filter((_, idx) => (idx + 1) !== owner && targets[idx].lives > 0 && !targets[idx].isOut);
  }
  if (type === "gun") {
    shootProjectileModern(player, character, owner);
  } else {
    targets.forEach(target => {
      const range = 100;
      const inRange = (
        target.x < player.x + range &&
        target.x + 100 > player.x &&
        Math.abs(target.y - player.y) < 50
      );
      if (inRange) {
        takeHitModern(
          target,
          type === "sword" ? 30 : 20,
          player.facing === "right" ? 1 : -1,
          type === "sword" ? 14 : 10,
          player
        );
      }
    });
  }
}
function moveProjectilesModern() {
  projectiles.forEach(p => p.x += p.vx);
  projectiles = projectiles.filter(p => {
    let targets;
    if (gameMode === "moderncoop") {
      if (p.owner === 1 || p.owner === 2) targets = [ai];
      else if (p.owner === 3) {
        targets = [];
        if (p1.lives > 0 && !p1.isOut) targets.push(p1);
        if (p2.lives > 0 && !p2.isOut) targets.push(p2);
      }
    } else {
      targets = [p1, p2];
      if (aiEnabled || gameMode === "moderncoop" || gameMode === "modern") targets.push(ai);
      targets = targets.filter((_, idx) => (idx + 1) !== p.owner && targets[idx].lives > 0 && !targets[idx].isOut);
    }
    let hit = false;
    for (let i = 0; i < targets.length; i++) {
      if (checkCollision(p, targets[i]) && targets[i].lives > 0 && !targets[i].isOut) {
        takeHitModern(targets[i], p.damage, p.vx > 0 ? 1 : -1, p.size >= 15 ? 25 : 10, (p.owner === 1) ? p1 : (p.owner === 2) ? p2 : ai);
        hit = true;
        break;
      }
    }
    return !hit && p.x >= 0 && p.x <= canvas.width;
  });
  projectiles.forEach(p => {
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  });
}
function takeHitModern(player, damage, attackerDir, baseKnock, attacker) {
  player.percent += damage;
  player.knockback = baseKnock * (1 + player.percent / 100);
  player.knockbackDir = attackerDir;
  if (attacker) attacker.energy = Math.min(100, (attacker.energy || 0) + 10);
  player.energy = Math.min(100, (player.energy || 0) + 8);
}

// --- ULTIMATES ---
function useUltimateClassic(player, owner) {
  if (player.health <= 0) return;
  if (getAttackType(owner === 1 ? p1Char : owner === 2 ? p2Char : aiChar) === "gun") {
    const vx = player.facing === "right" ? 18 : -18;
    const x = player.x + (player.facing === "right" ? 100 : 0);
    projectiles.push({
      x, y: player.y + 50, vx, size: 20, color: "#ff0", damage: 120, owner
    });
  } else {
    const targets = [];
    if (owner === 1) { if (ai.health > 0) targets.push(ai); if (p2.health > 0) targets.push(p2);}
    if (owner === 2) { if (ai.health > 0) targets.push(ai); if (p1.health > 0) targets.push(p1);}
    if (owner === 3) { if (p1.health > 0) targets.push(p1); if (p2.health > 0) targets.push(p2);}
    targets.forEach(target => {
      if (target.health > 0) {
        target.health -= 100;
        target.knockback = 28;
        target.knockbackDir = (target.x < player.x) ? -1 : 1;
      }
    });
  }
  player.energy = 0;
  updateEnergyBars();
}
function useUltimateModern(player, owner) {
  if (player.isOut || player.lives <= 0) return;
  if (getAttackType(owner === 1 ? p1Char : owner === 2 ? p2Char : aiChar) === "gun") {
    const vx = player.facing === "right" ? 18 : -18;
    const x = player.x + (player.facing === "right" ? 100 : 0);
    projectiles.push({
      x, y: player.y + 50, vx, size: 20, color: "#ff0", damage: 70, owner
    });
  } else {
    const targets = [];
    if (owner === 1) { if (ai.lives > 0 && !ai.isOut) targets.push(ai); if (p2.lives > 0 && !p2.isOut) targets.push(p2);}
    if (owner === 2) { if (ai.lives > 0 && !ai.isOut) targets.push(ai); if (p1.lives > 0 && !p1.isOut) targets.push(p1);}
    if (owner === 3) { if (p1.lives > 0 && !p1.isOut) targets.push(p1); if (p2.lives > 0 && !p2.isOut) targets.push(p2);}
    targets.forEach(target => {
      takeHitModern(target, 55, (target.x < player.x) ? -1 : 1, 28, player);
    });
  }
  player.energy = 0;
  updateEnergyBars();
}
function shootProjectileModern(player, char, owner) {
  if (player.isOut || player.lives <= 0) return;
  const { color, size, speed, damage } = getCharacterProjectile(char);
  let vx = player.facing === "right" ? speed : -speed;
  const x = player.x + (player.facing === "right" ? 100 : 0);
  projectiles.push({ x, y: player.y + 50, vx, size, color, damage, owner });
}

// === CLASSIC LOGIC ===
function movePlayer(player, keysList) {
  if (player.knockback && player.health > 0) {
    player.x += player.knockback * player.knockbackDir;
    player.knockback *= 0.85;
    if (Math.abs(player.knockback) < 1) player.knockback = 0;
    player.x = Math.max(0, Math.min(canvas.width - 100, player.x));
    return;
  }
  if (keys[keysList[0]]) { player.x -= 5; player.facing = "left"; }
  if (keys[keysList[1]]) { player.x += 5; player.facing = "right"; }
  if (keys[keysList[2]] && player.y === groundY) player.vy = -15;
  player.x = Math.max(0, Math.min(canvas.width - 100, player.x));
}
function applyGravity(player) {
  player.vy += gravity;
  player.y += player.vy;
  if (player.y > groundY) {
    player.y = groundY;
    player.vy = 0;
  }
}
function performAttack(player, character, owner) {
  if (player.health <= 0) return;
  const type = getAttackType(character);
  let targets;
  if (gameMode === "coop") {
    if (owner === 1 || owner === 2) targets = [ai];
    else if (owner === 3) {
      targets = [];
      if (p1.health > 0) targets.push(p1);
      if (p2.health > 0) targets.push(p2);
    }
  } else {
    targets = [p1, p2];
    if (aiEnabled || gameMode === "coop") targets.push(ai);
    targets = targets.filter((_, idx) => (idx + 1) !== owner && targets[idx].health > 0);
  }
  if (type === "gun") {
    shootProjectile(player, character, owner);
  } else {
    targets.forEach(target => performMeleeAttack(player, target, type));
  }
}
function moveProjectiles() {
  projectiles.forEach(p => p.x += p.vx);
  projectiles = projectiles.filter(p => {
    let targets;
    if (gameMode === "coop") {
      if (p.owner === 1 || p.owner === 2) targets = [ai];
      else if (p.owner === 3) {
        targets = [];
        if (p1.health > 0) targets.push(p1);
        if (p2.health > 0) targets.push(p2);
      }
    } else {
      targets = [p1, p2];
      if (aiEnabled || gameMode === "coop") targets.push(ai);
      targets = targets.filter((_, idx) => (idx + 1) !== p.owner && targets[idx].health > 0);
    }
    let hit = false;
    for (let i = 0; i < targets.length; i++) {
      if (checkCollision(p, targets[i]) && targets[i].health > 0) {
        targets[i].health -= p.damage;
        let ownerObj = (p.owner === 1) ? p1 : (p.owner === 2) ? p2 : ai;
        ownerObj.energy = Math.min(100, ownerObj.energy + 10);
        targets[i].energy = Math.min(100, targets[i].energy + 8);
        let baseKB = (p.size >= 15) ? 25 : 10;
        targets[i].knockback = baseKB;
        targets[i].knockbackDir = (p.vx > 0) ? 1 : -1;
        hit = true;
        break;
      }
    }
    return !hit && p.x >= 0 && p.x <= canvas.width;
  });
  projectiles.forEach(p => {
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  });
}
function performMeleeAttack(attacker, target, type) {
  if (attacker.health <= 0 || target.health <= 0) return;
  const range = 100;
  const damage = type === "sword" ? 30 : 20;
  const inRange = (
    target.x < attacker.x + range &&
    target.x + 100 > attacker.x &&
    Math.abs(target.y - attacker.y) < 50
  );
  if (inRange) {
    target.health -= damage;
    attacker.energy = Math.min(100, attacker.energy + 15);
    target.energy = Math.min(100, target.energy + 8);
    target.knockback = (type === "sword" ? 14 : 10);
    target.knockbackDir = (target.x < attacker.x) ? -1 : 1;
  }
}
function shootProjectile(player, char, owner) {
  if (player.health <= 0) return;
  const { color, size, speed, damage } = getCharacterProjectile(char);
  let vx = player.facing === "right" ? speed : -speed;
  const x = player.x + (player.facing === "right" ? 100 : 0);
  projectiles.push({ x, y: player.y + 50, vx, size, color, damage, owner });
}

// --- Shared utilities ---
function getCharacterProjectile(char) {
  switch (char) {
    case "sans": return { color: "white", size: 4, speed: 10, damage: 15 };
    case "spamton": return { color: "yellow", size: 7, speed: 6, damage: 12 };
    case "shadow": return { color: "purple", size: 6, speed: 8, damage: 14 };
    default: return { color: "gray", size: 5, speed: 6, damage: 10 };
  }
}
function getAttackType(char) {
  const sword = ["kris", "susie", "jevil", "spadeking", "mettaton"];
  const gun = ["sans", "spamton", "shadow"];
  return sword.includes(char) ? "sword" : gun.includes(char) ? "gun" : "punch";
}
function checkCollision(proj, target) {
  return (
    proj.x > target.x &&
    proj.x < target.x + 100 &&
    proj.y > target.y &&
    proj.y < target.y + 100
  );
}
function showGameOver(winner) {
  gameEnded = true;
  const gameOverText = document.getElementById("game-over");
  gameOverText.textContent = winner + " wins!";
  gameOverText.style.display = "block";
  setTimeout(() => {
    gameOverText.style.display = "none";
    startGame();
  }, 5000);
}
function updateEnergyBars() {
  let p1bar = document.getElementById("p1-energy");
  let p2bar = document.getElementById("p2-energy");
  let aibar = document.getElementById("ai-energy");
  if (!p1bar || !p2bar || !aibar) return;
  p1bar.style.width = `${p1.energy}%`;
  p2bar.style.width = `${p2.energy}%`;
  aibar.style.width = `${ai.energy}%`;
}

// Add this function after your existing code
function initializeOnlineGame(mode) {
  console.log('Initializing online game...');
  console.log('Connecting to WebSocket server:', WEBSOCKET_URL);
  
  try {
    ws = new WebSocket(WEBSOCKET_URL);
    
    ws.onopen = () => {
      console.log('Successfully connected to server');
      // Send initial connection message
      ws.send(JSON.stringify({
        type: 'init'
      }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('Received message:', data);
        
        switch(data.type) {
          case 'init':
            playerId = data.playerId;
            console.log('Received player ID:', playerId);
            if (isHost) {
              console.log('Creating room as host...');
              ws.send(JSON.stringify({
                type: 'create_room',
                gameMode: mode
              }));
            }
            break;

          case 'room_created':
            roomId = data.roomId;
            currentRoomId = data.roomId;
            alert(`Your Room Code: ${roomId}\nShare this code with your opponent!`);
            console.log('Room created:', roomId);
            break;

          case 'game_start':
            console.log('Starting game with players:', data.players);
            startOnlineGame(data.players);
            break;

          case 'game_update':
            if (data.state) {
              updateOnlineGameState(data.state);
            }
            break;

          case 'player_disconnected':
            alert("Other player disconnected!");
            console.log('Other player disconnected');
            window.location.reload();
            break;

          case 'error':
            alert(data.message);
            console.error('Server error:', data.message);
            break;
        }
      } catch (error) {
        console.error('Error processing message:', error);
        alert('Error processing game data. Please try again.');
      }
    };

    ws.onclose = (event) => {
      console.log('WebSocket connection closed:', event);
      alert("Connection to server lost! Please refresh the page.");
      window.location.reload();
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      alert("Error connecting to game server! Please try again later.");
    };
  } catch (error) {
    console.error('Error initializing WebSocket:', error);
    alert('Failed to connect to game server. Please try again later.');
  }
}

function startOnlineGame(players) {
  document.getElementById("character-select").style.display = "none";
  document.getElementById("game-screen").style.display = "block";
  
  const isPlayer1 = players[0].id === playerId;
  
  if (gameMode === "onlineclassic") {
    p1 = { x: isPlayer1 ? 100 : 600, y: 300, health: 1000, vy: 0, 
           facing: isPlayer1 ? "right" : "left", energy: 0 };
    p2 = { x: isPlayer1 ? 600 : 100, y: 300, health: 1000, vy: 0, 
           facing: isPlayer1 ? "left" : "right", energy: 0 };
  } else {
    p1 = makeModernPlayer(isPlayer1 ? 100 : 600, 300, isPlayer1 ? "right" : "left");
    p2 = makeModernPlayer(isPlayer1 ? 600 : 100, 300, isPlayer1 ? "left" : "right");
  }
  
  // Set character images using the mapping
  const p1Char = isPlayer1 ? players[0].character : players[1].character;
  const p2Char = isPlayer1 ? players[1].character : players[0].character;
  p1Img.src = `images/${characterImages[p1Char]}`;
  p2Img.src = `images/${characterImages[p2Char]}`;
  
  gameLoop();
}

function updateOnlineGameState(state) {
  // Update opponent's state
  if (gameMode === "onlineclassic") {
    p2.x = state.x;
    p2.y = state.y;
    p2.health = state.health;
    p2.vy = state.vy;
    p2.facing = state.facing;
    p2.energy = state.energy;
  } else {
    p2.x = state.x;
    p2.y = state.y;
    p2.percent = state.percent;
    p2.lives = state.lives;
    p2.vy = state.vy;
    p2.facing = state.facing;
    p2.energy = state.energy;
    p2.isOut = state.isOut;
  }
}

// Modify your gameLoop function to send state updates
const sendGameState = () => {
  if (!ws || !playerId) return;
  
  const state = gameMode === "onlineclassic" ? {
    x: p1.x,
    y: p1.y,
    health: p1.health,
    vy: p1.vy,
    facing: p1.facing,
    energy: p1.energy
  } : {
    x: p1.x,
    y: p1.y,
    percent: p1.percent,
    lives: p1.lives,
    vy: p1.vy,
    facing: p1.facing,
    energy: p1.energy,
    isOut: p1.isOut
  };
  
  ws.send(JSON.stringify({
    type: 'game_update',
    state: state
  }));
};

// Add state sending to your gameLoop
function gameLoop() {
  if (isOnlineGame) {
    // Send player state to server
    sendGameState();
  }
  // ... existing gameLoop code ...
  
  requestAnimationFrame(gameLoop);
}

function initializeWebSocket() {
    ws = new WebSocket(WEBSOCKET_URL);
    
    ws.onopen = () => {
        console.log('Connected to game server');
    };
    
    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        displayMessage('Connection error! Please try again later.');
    };
    
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        switch(data.type) {
            case 'room_created':
                currentRoomId = data.roomId;
                displayMessage(`Room created! Room ID: ${data.roomId}`);
                break;
                
            case 'game_start':
                isOnlineGame = true;
                startOnlineGame(data.players);
                break;
                
            case 'game_update':
                if (isOnlineGame) {
                    handleOnlineGameUpdate(data.gameState);
                }
                break;
                
            case 'player_disconnected':
                displayMessage('Other player disconnected');
                resetGame();
                break;
                
            case 'error':
                displayMessage(data.message);
                break;
        }
    };
    
    ws.onclose = () => {
        console.log('Disconnected from game server');
        isOnlineGame = false;
    };
}

function createRoom() {
    playerId = Math.random().toString(36).substring(2, 8);
    ws.send(JSON.stringify({
        type: 'create_room',
        playerId: playerId
    }));
}

function joinRoom(roomId) {
    playerId = Math.random().toString(36).substring(2, 8);
    ws.send(JSON.stringify({
        type: 'join_room',
        roomId: roomId,
        playerId: playerId
    }));
}

function sendGameUpdate(gameState) {
    if (isOnlineGame && ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'game_update',
            gameState: gameState
        }));
    }
}

function handleOnlineGameUpdate(gameState) {
    // Update opponent's position and actions
    if (gameState.opponent) {
        // Update opponent character position
        opponent.x = gameState.opponent.x;
        opponent.y = gameState.opponent.y;
        // Update opponent's actions/animations
        if (gameState.opponent.action) {
            opponent.currentAction = gameState.opponent.action;
        }
    }
}

function displayMessage(message) {
    // Create or update message display element
    let messageDiv = document.getElementById('message-display');
    if (!messageDiv) {
        messageDiv = document.createElement('div');
        messageDiv.id = 'message-display';
        messageDiv.style.position = 'fixed';
        messageDiv.style.top = '20px';
        messageDiv.style.left = '50%';
        messageDiv.style.transform = 'translateX(-50%)';
        messageDiv.style.padding = '10px 20px';
        messageDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        messageDiv.style.color = 'white';
        messageDiv.style.borderRadius = '5px';
        messageDiv.style.zIndex = '1000';
        document.body.appendChild(messageDiv);
    }
    messageDiv.textContent = message;
    setTimeout(() => {
        messageDiv.remove();
    }, 3000);
}

// Add UI elements for online gameplay
function createOnlineUI() {
    const onlineDiv = document.createElement('div');
    onlineDiv.style.position = 'fixed';
    onlineDiv.style.top = '10px';
    onlineDiv.style.right = '10px';
    onlineDiv.style.padding = '10px';
    onlineDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    onlineDiv.style.borderRadius = '5px';
    
    const createButton = document.createElement('button');
    createButton.textContent = 'Create Room';
    createButton.onclick = createRoom;
    
    const joinInput = document.createElement('input');
    joinInput.placeholder = 'Room ID';
    joinInput.style.marginLeft = '10px';
    
    const joinButton = document.createElement('button');
    joinButton.textContent = 'Join Room';
    joinButton.style.marginLeft = '5px';
    joinButton.onclick = () => joinRoom(joinInput.value);
    
    onlineDiv.appendChild(createButton);
    onlineDiv.appendChild(joinInput);
    onlineDiv.appendChild(joinButton);
    document.body.appendChild(onlineDiv);
}

// Initialize online functionality
window.addEventListener('load', () => {
    initializeWebSocket();
    createOnlineUI();
});
