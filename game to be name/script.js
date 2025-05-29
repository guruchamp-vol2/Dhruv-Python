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

document.getElementById("game-mode").addEventListener("change", (e) => {
  gameMode = e.target.value;
  if (gameMode === "coop") {
    document.getElementById("ai-toggle").checked = true;
    document.getElementById("ai-toggle").disabled = true;
    aiEnabled = true;
    document.getElementById("ai-characters").style.display = "flex";
    document.getElementById("ai-difficulty").disabled = false;
    document.getElementById("ai-health").style.display = "block";
  } else if (gameMode === "versus") {
    document.getElementById("ai-toggle").disabled = false;
  } else if (gameMode === "online") {
    alert("Online mode is in development. Please use local multiplayer for now!");
    document.getElementById("game-mode").value = "versus";
    gameMode = "versus";
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
    img.src = `images/${char}.png`;
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
  if ((aiEnabled || gameMode === "coop")) {
    document.getElementById("start-game").disabled = !(p1Char && p2Char && aiChar);
  } else {
    document.getElementById("start-game").disabled = !(p1Char && p2Char);
  }
}

// --- GAME LOGIC BELOW ---

let canvas = null, ctx = null;
let p1, p2, ai, keys = {}, projectiles = [];
const groundY = 300, gravity = 1;
const p1Img = new Image(), p2Img = new Image(), aiImg = new Image();
let p1LastAttack = 0, p2LastAttack = 0, aiLastAttack = 0, gameEnded = false;

document.addEventListener("keydown", e => {
  keys[e.key] = true;
  if (p1 && p1.health > 0 && e.key.toLowerCase() === "q" && p1.energy === 100) useUltimate(p1, 1);
  if (p2 && p2.health > 0 && e.key.toLowerCase() === "o" && p2.energy === 100) useUltimate(p2, 2);
});
document.addEventListener("keyup", e => keys[e.key] = false);

document.getElementById("start-game").addEventListener("click", () => {
  document.getElementById("character-select").style.display = "none";
  document.getElementById("game-screen").style.display = "block";
  startGame();
});

function startGame() {
  document.getElementById("game-over").style.display = "none";
  p1Img.src = `images/${p1Char}.png`;
  p2Img.src = `images/${p2Char}.png`;
  if ((aiEnabled || gameMode === "coop") && aiChar) aiImg.src = `images/${aiChar}.png`;

  p1 = { x: 100, y: 300, health: 1000, vy: 0, facing: "right", energy: 0 };
  p2 = { x: 600, y: 300, health: 1000, vy: 0, facing: "left", energy: 0 };
  ai = { x: 350, y: 300, health: 1000, vy: 0, facing: "left", energy: 0 };
  projectiles = [];
  gameEnded = false;

  canvas = document.getElementById("gameCanvas");
  ctx = canvas.getContext("2d");

  requestAnimationFrame(gameLoop);
}

function gameLoop() {
  if (gameEnded) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Only move alive characters
  if (p1.health > 0) movePlayer(p1, ["a", "d", "w"]);
  if (p2.health > 0) movePlayer(p2, ["ArrowLeft", "ArrowRight", "ArrowUp"]);
  applyGravity(p1);
  applyGravity(p2);

  if ((aiEnabled || gameMode === "coop") && ai.health > 0) {
    handleAI(ai, p1, performance.now());
    applyGravity(ai);
  }

  const now = performance.now();
  // Only allow alive to attack
  if (p1.health > 0 && keys["e"] && now - p1LastAttack >= cooldowns[p1Char]) {
    performAttack(p1, p1Char, 1);
    p1LastAttack = now;
  }
  if (p2.health > 0 && keys["l"] && now - p2LastAttack >= cooldowns[p2Char]) {
    performAttack(p2, p2Char, 2);
    p2LastAttack = now;
  }

  moveProjectiles();

  // Only draw alive characters
  if (p1.health > 0) ctx.drawImage(p1Img, p1.x, p1.y, 100, 100);
  if (p2.health > 0) ctx.drawImage(p2Img, p2.x, p2.y, 100, 100);
  if ((aiEnabled || gameMode === "coop") && ai.health > 0) ctx.drawImage(aiImg, ai.x, ai.y, 100, 100);

  document.getElementById("p1-health").textContent = `Player 1: ${p1.health}`;
  document.getElementById("p2-health").textContent = `Player 2: ${p2.health}`;
  document.getElementById("ai-health").textContent = (aiEnabled || gameMode === "coop") ? `AI: ${ai.health}` : "";

  updateEnergyBars(); // Energy bar display

  // Winner logic:
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

// --- Movement and Facing ---
function movePlayer(player, keysList) {
  if (keys[keysList[0]]) {
    player.x -= 5;
    player.facing = "left";
  }
  if (keys[keysList[1]]) {
    player.x += 5;
    player.facing = "right";
  }
  if (keys[keysList[2]] && player.y === groundY) player.vy = -15;
}

function applyGravity(player) {
  player.vy += gravity;
  player.y += player.vy;
  if (player.y > groundY) {
    player.y = groundY;
    player.vy = 0;
  }
}

// --- AI Movement/Attacking & Facing ---
function handleAI(ai, target, now) {
  if (!(aiEnabled || gameMode === "coop") || ai.health <= 0) return;
  const dist = target.x - ai.x;
  const jump = Math.random();
  const aiType = getAttackType(aiChar);

  if (aiType === "gun") {
    const idealMin = 250, idealMax = 400;
    if (Math.abs(dist) < idealMin) {
      ai.x -= Math.sign(dist) * 3;
      ai.facing = dist < 0 ? "left" : "right";
    } else if (Math.abs(dist) > idealMax) {
      ai.x += Math.sign(dist) * 2;
      ai.facing = dist > 0 ? "right" : "left";
    } else {
      ai.facing = dist > 0 ? "right" : "left";
    }
    if (jump < 0.01 && ai.y === groundY) ai.vy = -12;
    if (
      Math.abs(dist) > idealMin && Math.abs(dist) < idealMax &&
      now - aiLastAttack >= cooldowns[aiChar]
    ) {
      performAttack(ai, aiChar, 3);
      aiLastAttack = now;
    }
    // AI Ultimate
    if (ai.energy === 100 && now - aiLastAttack >= 2500) {
      useUltimate(ai, 3);
      aiLastAttack = now;
    }
  } else {
    switch (aiDifficulty) {
      case "easy":
        if (Math.random() < 0.01) {
          ai.x += dist > 0 ? 2 : -2;
          ai.facing = dist > 0 ? "right" : "left";
        }
        if (jump < 0.005 && ai.y === groundY) ai.vy = -10;
        if (Math.random() < 0.01 && now - aiLastAttack >= cooldowns[aiChar]) {
          performAttack(ai, aiChar, 3);
          aiLastAttack = now;
        }
        break;
      case "medium":
        ai.x += dist > 0 ? 2 : -2;
        ai.facing = dist > 0 ? "right" : "left";
        if (jump < 0.01 && ai.y === groundY) ai.vy = -12;
        if (Math.abs(dist) < 150 && now - aiLastAttack >= cooldowns[aiChar]) {
          performAttack(ai, aiChar, 3);
          aiLastAttack = now;
        }
        break;
      case "hard":
        ai.x += dist > 0 ? 3 : -3;
        ai.facing = dist > 0 ? "right" : "left";
        if (jump < 0.02 && ai.y === groundY) ai.vy = -14;
        if (Math.abs(dist) < 200 && now - aiLastAttack >= cooldowns[aiChar] && Math.random() < 0.9) {
          performAttack(ai, aiChar, 3);
          aiLastAttack = now;
        }
        break;
    }
    if (ai.energy === 100 && now - aiLastAttack >= 2500) {
      useUltimate(ai, 3);
      aiLastAttack = now;
    }
  }
}

// --- Attack Logic ---
function performAttack(player, character, owner) {
  if (player.health <= 0) return;
  const type = getAttackType(character);
  let targets;
  if (gameMode === "coop") {
    if (owner === 1 || owner === 2) {
      targets = [ai];
    } else if (owner === 3) {
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
      if (p.owner === 1 || p.owner === 2) {
        targets = [ai];
      } else if (p.owner === 3) {
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
      if (checkCollision(p, targets[i])) {
        targets[i].health -= p.damage;
        let ownerObj = (p.owner === 1) ? p1 : (p.owner === 2) ? p2 : ai;
        ownerObj.energy = Math.min(100, ownerObj.energy + 10);
        targets[i].energy = Math.min(100, targets[i].energy + 8);
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
  }
}

function shootProjectile(player, char, owner) {
  if (player.health <= 0) return;
  const { color, size, speed, damage } = getCharacterProjectile(char);
  let vx = player.facing === "right" ? speed : -speed;
  const x = player.x + (player.facing === "right" ? 100 : 0);
  projectiles.push({ x, y: player.y + 50, vx, size, color, damage, owner });
}

function useUltimate(player, owner) {
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
      if (target.health > 0) target.health -= 100;
    });
  }
  player.energy = 0;
  updateEnergyBars();
}

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
  if (gameMode === "coop") {
    if (winner === "win") {
      gameOverText.textContent = "You win!";
    } else if (winner === "lose") {
      gameOverText.textContent = "You lose!";
    }
  } else if (winner === "Players (Co-op)") {
    gameOverText.textContent = `Players win (Co-op)!`;
  } else {
    gameOverText.textContent = `${winner} wins!`;
  }
  gameOverText.style.display = "block";
  setTimeout(() => {
    gameOverText.style.display = "none";
    p1 = { x: 100, y: 300, health: 1000, vy: 0, facing: "right", energy: 0 };
    p2 = { x: 600, y: 300, health: 1000, vy: 0, facing: "left", energy: 0 };
    if (aiEnabled || gameMode === "coop") ai = { x: 350, y: 300, health: 1000, vy: 0, facing: "left", energy: 0 };
    keys = {};
    projectiles = [];
    startGame();
  }, 5000);
}

// --- Energy Bar Display ---
function updateEnergyBars() {
  let p1bar = document.getElementById("p1-energy");
  let p2bar = document.getElementById("p2-energy");
  let aibar = document.getElementById("ai-energy");
  if (!p1bar || !p2bar || !aibar) return;

  p1bar.style.width = `${p1.energy}%`;
  p2bar.style.width = `${p2.energy}%`;
  aibar.style.width = `${ai.energy}%`;
}
