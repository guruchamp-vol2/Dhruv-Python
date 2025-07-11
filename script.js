// WebSocket URL configuration
const WEBSOCKET_URL = (() => {
  const hostname = window.location.hostname;
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
  const port = isLocalhost ? 8081 : ''; // Updated port to 8081
  const protocol = isLocalhost ? 'ws' : 'wss';
  // Use the actual Railway URL for production
  if (!isLocalhost) {
    return 'wss://fighting-game-server-production.up.railway.app';
  }
  return `${protocol}://${hostname}${port ? `:${port}` : ''}`;
})();

// For debugging
console.log('WebSocket URL:', WEBSOCKET_URL);

let ws = null;
let wsRetryCount = 0;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

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
let playerId = null;
let roomId = null;
let isHost = false;

// WebSocket connection and online game handling
let currentRoomId = null;
let isOnlineGame = false;

// Get the base URL for assets based on environment
const BASE_URL = (() => {
  const isGitHub = window.location.hostname.includes('github.io');
  if (isGitHub) {
    // Remove URL encoding from the path
    return 'https://guruchamp-vol2.github.io/Dhruv-Python/game to be name/';
  }
  return '/';
})();

console.log('Using BASE_URL:', BASE_URL);

// Character image configuration with exact filenames
const characterImages = {
  mario: "mario.png",
  luigi: "luigi.png",
  kirby: "kirby.png",
  sonic: "sonic.png",
  tails: "Tails.png",      // Note the capital T
  shadow: "shadow.png",
  toriel: "toriel.png",
  sans: "sans.png",
  mettaton: "Mettaton.png", // Note the capital M
  kris: "kris.png",
  susie: "susie.png",
  jevil: "jevil.png",
  spadeking: "spadeking.png",
  berdly: "berdly.png",
  noelle: "noelle.png",
  spamton: "spamton.png"
};

// Initialize image objects
const p1Img = new Image();
const p2Img = new Image();
const aiImg = new Image();

// Simplified image loading function that uses preloaded images
function loadCharacterImage(character) {
  return new Promise((resolve, reject) => {
    // Get the preloaded image element
    const imgId = `${character}-img`;
    const preloadedImg = document.getElementById(imgId);
    
    if (!preloadedImg) {
      console.error(`No preloaded image found for ${character} with ID ${imgId}`);
      createFallbackImage(character, resolve);
      return;
    }

    // Check if image is already loaded
    if (preloadedImg.complete && preloadedImg.naturalWidth > 0) {
      console.log(`Image for ${character} already loaded successfully`, {
        src: preloadedImg.src,
        naturalWidth: preloadedImg.naturalWidth,
        naturalHeight: preloadedImg.naturalHeight
      });
      resolve(preloadedImg);
      return;
    }

    // Set up load and error handlers
    const loadHandler = () => {
      console.log(`Successfully loaded ${character}`, {
        src: preloadedImg.src,
        naturalWidth: preloadedImg.naturalWidth,
        naturalHeight: preloadedImg.naturalHeight
      });
      resolve(preloadedImg);
    };

    const errorHandler = () => {
      console.error(`Failed to load image for ${character}`, {
        src: preloadedImg.src,
        naturalWidth: preloadedImg.naturalWidth,
        naturalHeight: preloadedImg.naturalHeight
      });
      createFallbackImage(character, resolve);
    };

    preloadedImg.addEventListener('load', loadHandler);
    preloadedImg.addEventListener('error', errorHandler);

    // Force a reload if the image is in an error state
    if (preloadedImg.complete && preloadedImg.naturalWidth === 0) {
      const currentSrc = preloadedImg.src;
      preloadedImg.src = '';
      preloadedImg.src = currentSrc;
    }
  });
}

function createFallbackImage(character, resolve) {
  console.log(`Creating fallback image for ${character}`);
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  
  // Create a more visible fallback
  ctx.fillStyle = '#666666';
  ctx.fillRect(0, 0, 64, 64);
  
  // Add a border
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.strokeRect(2, 2, 60, 60);
  
  // Add character name
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(character, 32, 32);
  
  const fallbackImg = new Image();
  fallbackImg.src = canvas.toDataURL();
  fallbackImg.onload = () => {
    console.log(`Fallback image created for ${character}`);
    resolve(fallbackImg);
  };
}

// Update character selection UI with better error handling
function createCharacterSelectImage(char, container, selectFn) {
  const div = document.createElement('div');
  div.className = 'character-select-wrapper';
  
  const img = document.createElement("img");
  img.classList.add("character-select-img");
  img.alt = char;
  img.title = char;
  
  // Show loading state
  img.src = 'data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="%23eee"/><text x="50%" y="50%" font-family="Arial" font-size="12" fill="%23666" text-anchor="middle">Loading...</text></svg>';
  
  // Add status indicator
  const status = document.createElement('div');
  status.className = 'character-status';
  status.style.fontSize = '12px';
  status.style.marginTop = '4px';
  status.textContent = 'Loading...';
  
  loadCharacterImage(char)
    .then(loadedImg => {
      img.src = loadedImg.src;
      status.textContent = 'Ready';
      status.style.color = 'green';
    })
    .catch(error => {
      console.error(`Error loading ${char}:`, error);
      status.textContent = 'Error';
      status.style.color = 'red';
    });
  
  img.addEventListener("click", () => selectFn(char, img));
  div.appendChild(img);
  div.appendChild(status);
  container.appendChild(div);
}

// Create character selection UI
const p1Container = document.getElementById("p1-characters");
const p2Container = document.getElementById("p2-characters");
const aiContainer = document.getElementById("ai-characters");

characters.forEach(char => {
  createCharacterSelectImage(char, p1Container, (char, img) => selectCharacter(1, char, img));
  createCharacterSelectImage(char, p2Container, (char, img) => selectCharacter(2, char, img));
  createCharacterSelectImage(char, aiContainer, selectAICharacter);
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
  
  // Load character images with error handling
  Promise.all([
    loadCharacterImage(p1Char),
    loadCharacterImage(p2Char),
    ...(((aiEnabled || gameMode === "coop" || gameMode === "moderncoop" || gameMode === "modern") && aiChar) ? [loadCharacterImage(aiChar)] : [])
  ]).then(([p1LoadedImg, p2LoadedImg, aiLoadedImg]) => {
    console.log("All character images loaded successfully");
    p1Img.src = p1LoadedImg.src;
    p2Img.src = p2LoadedImg.src;
    if (aiLoadedImg) {
      aiImg.src = aiLoadedImg.src;
    }
    
    // Initialize game state
    projectiles = [];
    gameEnded = false;
    p1LastAttack = 0;
    p2LastAttack = 0;
    aiLastAttack = 0;

    // Initialize canvas
    canvas = document.getElementById("gameCanvas");
    ctx = canvas.getContext("2d");

    // Initialize players
    if (isModernMode()) {
      p1 = makeModernPlayer(100, 300, "right");
      p2 = makeModernPlayer(600, 300, "left");
      ai = makeModernPlayer(350, 300, "left");
    } else {
      p1 = { x: 100, y: 300, health: 1000, vy: 0, facing: "right", energy: 0, knockback: 0, knockbackDir: 0 };
      p2 = { x: 600, y: 300, health: 1000, vy: 0, facing: "left", energy: 0, knockback: 0, knockbackDir: 0 };
      ai = { x: 350, y: 300, health: 1000, vy: 0, facing: "left", energy: 0, knockback: 0, knockbackDir: 0 };
    }

    // Start game loop
    requestAnimationFrame(gameLoop);
  }).catch(error => {
    console.error("Failed to load character images:", error);
    alert("Failed to load character images. Please check the console for details.");
  });
}

// AI behavior patterns
const AI_PATTERNS = {
  defensive: {
    attackRange: 150,
    retreatRange: 100,
    jumpProbability: 0.1,
    attackProbability: 0.4,
    movementSpeed: 4
  },
  aggressive: {
    attackRange: 200,
    retreatRange: 50,
    jumpProbability: 0.15,
    attackProbability: 0.6,
    movementSpeed: 6
  },
  balanced: {
    attackRange: 175,
    retreatRange: 75,
    jumpProbability: 0.12,
    attackProbability: 0.5,
    movementSpeed: 5
  }
};

// Enhanced AI handling function
function handleAI(ai, now) {
  const target = getCurrentTarget();
  if (!target) return;

  // Use ultimate when energy is full and target is in range
  if (ai.energy === 100) {
    const dx = target.x - ai.x;
    const dist = Math.abs(dx);
    if (dist < 300) {  // Only use ultimate when close enough
      useUltimateClassic(ai, 3);
      return;
    }
  }

  // Select behavior pattern based on difficulty and situation
  let pattern;
  if (aiDifficulty === "easy") {
    pattern = AI_PATTERNS.defensive;
  } else if (aiDifficulty === "medium") {
    pattern = AI_PATTERNS.balanced;
  } else {
    // Hard AI dynamically switches between patterns based on health
    pattern = ai.health < 300 ? AI_PATTERNS.defensive :
             ai.health > 700 ? AI_PATTERNS.aggressive :
             AI_PATTERNS.balanced;
  }

  const dx = target.x - ai.x;
  const dy = target.y - ai.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  ai.facing = dx > 0 ? "right" : "left";

  // Strategic movement
  if (dist > pattern.attackRange) {
    // Approach target
    ai.x += (dx > 0 ? 1 : -1) * pattern.movementSpeed;
  } else if (dist < pattern.retreatRange) {
    // Retreat from target
    ai.x -= (dx > 0 ? 1 : -1) * pattern.movementSpeed;
  }

  // Jumping logic
  if (ai.y === groundY) {  // Only jump when on ground
    if (dy < -30 || Math.random() < pattern.jumpProbability) {
      ai.vy = -15;
    }
  }

  // Attack logic
  if (dist < pattern.attackRange && now - aiLastAttack >= cooldowns[aiChar]) {
    if (Math.random() < pattern.attackProbability) {
      performAttack(ai, aiChar, 3);
      aiLastAttack = now;
    }
  }

  // Dodge projectiles
  const nearbyProjectiles = projectiles.filter(p => 
    Math.abs(p.x - ai.x) < 150 && 
    Math.abs(p.y - ai.y) < 50 &&
    ((p.vx > 0 && p.x < ai.x) || (p.vx < 0 && p.x > ai.x))
  );
  
  if (nearbyProjectiles.length > 0 && ai.y === groundY) {
    ai.vy = -15; // Jump to dodge
  }
}

// Enhanced Modern AI handling
function handleAIModern(ai, now) {
  const target = getCurrentTarget();
  if (!target || ai.isOut || ai.lives <= 0) return;

  // Use ultimate when energy is full and target is in range
  if (ai.energy === 100) {
    const dx = target.x - ai.x;
    const dist = Math.abs(dx);
    if (dist < 300) {  // Only use ultimate when close enough
      useUltimateModern(ai, 3);
      return;
    }
  }

  // Select behavior pattern based on difficulty and situation
  let pattern;
  if (aiDifficulty === "easy") {
    pattern = AI_PATTERNS.defensive;
  } else if (aiDifficulty === "medium") {
    pattern = AI_PATTERNS.balanced;
  } else {
    // Hard AI dynamically switches between patterns based on lives
    pattern = ai.lives === 1 ? AI_PATTERNS.defensive :
             ai.lives === MODERN_LIVES ? AI_PATTERNS.aggressive :
             AI_PATTERNS.balanced;
  }

  const dx = target.x - ai.x;
  const dy = target.y - ai.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  ai.facing = dx > 0 ? "right" : "left";

  // Strategic movement
  if (dist > pattern.attackRange) {
    // Approach target
    ai.x += (dx > 0 ? 1 : -1) * pattern.movementSpeed;
  } else if (dist < pattern.retreatRange) {
    // Retreat from target
    ai.x -= (dx > 0 ? 1 : -1) * pattern.movementSpeed;
  }

  // Jumping logic
  if (ai.y === groundY) {  // Only jump when on ground
    if (dy < -30 || Math.random() < pattern.jumpProbability) {
      ai.vy = -15;
    }
  }

  // Attack logic
  if (dist < pattern.attackRange && now - aiLastAttack >= cooldowns[aiChar]) {
    if (Math.random() < pattern.attackProbability) {
      performAttackModern(ai, aiChar, 3);
      aiLastAttack = now;
    }
  }

  // Dodge projectiles
  const nearbyProjectiles = projectiles.filter(p => 
    Math.abs(p.x - ai.x) < 150 && 
    Math.abs(p.y - ai.y) < 50 &&
    ((p.vx > 0 && p.x < ai.x) || (p.vx < 0 && p.x > ai.x))
  );
  
  if (nearbyProjectiles.length > 0 && ai.y === groundY) {
    ai.vy = -15; // Jump to dodge
  }
}

function gameLoop(timestamp) {
  if (gameEnded) return;
  
  const now = Date.now();
  
  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw background
  const bgImg = document.getElementById("fight-background");
  if (bgImg) {
    ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
  }
  
  // Update game state based on mode
  if (isModernMode()) {
    // Modern mode updates
    if (!p1.isOut && p1.lives > 0) {
      movePlayer(p1, ["a", "d", "w"]);
      applyGravity(p1);
    }
    if (!p2.isOut && p2.lives > 0) {
      movePlayer(p2, ["ArrowLeft", "ArrowRight", "ArrowUp"]);
      applyGravity(p2);
    }
    
    // AI updates for modern mode
    if ((aiEnabled || gameMode === "moderncoop" || gameMode === "modern") && !ai.isOut && ai.lives > 0) {
      handleAIModern(ai, now);
      applyGravity(ai);
    }
  } else {
    // Classic mode updates
      movePlayer(p1, ["a", "d", "w"]);
      movePlayer(p2, ["ArrowLeft", "ArrowRight", "ArrowUp"]);
    if (aiEnabled || gameMode === "coop") {
      handleAI(ai, now);
    }
  }
  
  // Draw characters
  if (p1Img && !p1.isOut) {
    ctx.save();
    if (p1.facing === "left") {
      ctx.scale(-1, 1);
      ctx.drawImage(p1Img, -p1.x - 50, p1.y - 50, 100, 100);
    } else {
      ctx.drawImage(p1Img, p1.x - 50, p1.y - 50, 100, 100);
    }
    ctx.restore();
  }
  
  if (p2Img && !p2.isOut) {
    ctx.save();
    if (p2.facing === "left") {
      ctx.scale(-1, 1);
      ctx.drawImage(p2Img, -p2.x - 50, p2.y - 50, 100, 100);
    } else {
      ctx.drawImage(p2Img, p2.x - 50, p2.y - 50, 100, 100);
    }
    ctx.restore();
  }
  
  if ((aiEnabled || gameMode === "coop" || gameMode === "moderncoop" || gameMode === "modern") && aiImg && !ai.isOut) {
    ctx.save();
    if (ai.facing === "left") {
      ctx.scale(-1, 1);
      ctx.drawImage(aiImg, -ai.x - 50, ai.y - 50, 100, 100);
  } else {
      ctx.drawImage(aiImg, ai.x - 50, ai.y - 50, 100, 100);
    }
    ctx.restore();
  }
  
  // Draw projectiles
  projectiles.forEach(proj => {
    ctx.fillStyle = proj.color || "red";
    ctx.fillRect(proj.x - 5, proj.y - 5, 10, 10);
  });
  
  // Update HUD
  if (isModernMode()) {
    document.getElementById("p1-health").textContent = `P1: ${p1.percent}% | Lives: ${p1.lives}`;
    document.getElementById("p2-health").textContent = `P2: ${p2.percent}% | Lives: ${p2.lives}`;
    if (aiEnabled || gameMode === "coop" || gameMode === "moderncoop" || gameMode === "modern") {
      document.getElementById("ai-health").textContent = `AI: ${ai.percent}% | Lives: ${ai.lives}`;
    }
  } else {
    document.getElementById("p1-health").textContent = `Player 1: ${p1.health}`;
    document.getElementById("p2-health").textContent = `Player 2: ${p2.health}`;
    if (aiEnabled || gameMode === "coop") {
      document.getElementById("ai-health").textContent = `AI: ${ai.health}`;
    }
  }
  
  updateEnergyBars();
  
  // Continue game loop
  requestAnimationFrame(gameLoop);
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
  if (keys[keysList[0]]) {
    player.x = Math.max(0, player.x - 5);
    player.facing = "left";
  }
  if (keys[keysList[1]]) {
    player.x = Math.min(canvas.width - 100, player.x + 5);
    player.facing = "right";
  }
  if (keys[keysList[2]] && player.y === groundY) {
    player.vy = -15;
  }
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
    targets.forEach(target => {
      const range = 100;
      const inRange = (
        target.x < player.x + range &&
        target.x + 100 > player.x &&
        Math.abs(target.y - player.y) < 50
      );
      if (inRange) {
        target.health -= type === "sword" ? 30 : 20;
        player.energy = Math.min(100, player.energy + 15);
        target.energy = Math.min(100, target.energy + 8);
        target.knockback = type === "sword" ? 14 : 10;
        target.knockbackDir = target.x < player.x ? -1 : 1;
      }
    });
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
  // Calculate the center of the projectile and target
  const projCenterX = proj.x;
  const projCenterY = proj.y;
  const targetCenterX = target.x + 50;
  const targetCenterY = target.y + 50;

  // Calculate the distance between centers
  const dx = projCenterX - targetCenterX;
  const dy = projCenterY - targetCenterY;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // Check if the distance is less than the sum of the radii
  // (projectile radius + half target width)
  return distance < (proj.size + 50);
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
  console.log('Connecting to WebSocket server:', WEBSOCKET_URL);
  ws = new WebSocket(WEBSOCKET_URL);
  
  ws.onopen = () => {
    console.log('Connected to server');
    // Send initial connection message
    ws.send(JSON.stringify({
      type: 'init'
    }));
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log('Received message:', data);
    
    switch(data.type) {
      case 'init':
        playerId = data.playerId;
        console.log('Received player ID:', playerId);
        // Create a new room if host
        if (isHost) {
          console.log('Creating room...');
          ws.send(JSON.stringify({
            type: 'create_room',
            gameMode: mode
          }));
        }
        break;

      case 'room_created':
        roomId = data.roomId;
        currentRoomId = data.roomId;
        // Display room code with enhanced visibility
        displayMessage(`🎮 Room Code: ${roomId}\n\nShare this code with your opponent to join!\n\nWaiting for opponent...`, true);
        console.log('Room created:', roomId);
        break;

      case 'player_joined':
        if (data.success) {
          displayMessage('Connected! Game starting soon...', false);
          currentRoomId = data.roomId;
          console.log('Joined room:', currentRoomId);
        } else {
          displayMessage('Failed to join room. Please check the code and try again.', false);
          console.error('Failed to join room:', data.message);
        }
        break;

      case 'game_start':
        // Start the game with received player data
        console.log('Starting game with players:', data.players);
        startOnlineGame(data.players);
        break;

      case 'game_update':
        // Update game state with received data
        if (data.state) {
          updateOnlineGameState(data.state);
        }
        break;

      case 'player_disconnected':
        displayMessage("Other player disconnected! Returning to menu...");
        console.log('Other player disconnected');
        setTimeout(() => {
          window.location.reload();
        }, 3000);
        break;

      case 'error':
        displayMessage(data.message, false);
        console.error('Server error:', data.message);
        break;
    }
  };

  ws.onclose = () => {
    console.log('WebSocket connection closed');
    displayMessage("Connection to server lost! Please refresh the page.", false);
    setTimeout(() => {
      window.location.reload();
    }, 3000);
  };

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
    displayMessage("Error connecting to server! Please try again.", false);
  };
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
    console.log('Attempting to connect to WebSocket server at:', WEBSOCKET_URL);
    
    try {
        ws = new WebSocket(WEBSOCKET_URL);
        
        ws.onopen = () => {
            console.log('Successfully connected to WebSocket server');
            document.getElementById("game-mode").querySelector('option[value="onlineclassic"]').disabled = false;
            document.getElementById("game-mode").querySelector('option[value="onlinemodern"]').disabled = false;
            
            // Send initial connection message
            ws.send(JSON.stringify({
                type: 'init'
            }));
        };
        
        ws.onerror = (error) => {
            console.error('WebSocket connection error:', error);
            handleWebSocketError();
        };
        
        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('Received message:', data);
                
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
                        if (isOnlineGame && data.gameState) {
                            handleOnlineGameUpdate(data.gameState);
                        }
                        break;
                        
                    case 'player_disconnected':
                        displayMessage('Other player disconnected');
                        resetGame();
                        break;
                        
                    case 'error':
                        displayMessage(data.message);
                        console.error('Server error:', data.message);
                        break;
                }
            } catch (error) {
                console.error('Error processing message:', error);
                displayMessage('Error processing game data');
            }
        };
        
        ws.onclose = (event) => {
            console.log('WebSocket connection closed:', event);
            if (isOnlineGame) {
                displayMessage("Connection to server lost! Please refresh the page.");
                setTimeout(() => {
                    window.location.reload();
                }, 3000);
            } else {
                handleWebSocketError();
            }
        };
        
    } catch (error) {
        console.error('Failed to initialize WebSocket:', error);
        handleWebSocketError();
    }
}

function handleWebSocketError() {
    // Disable online modes when WebSocket is not available
    document.getElementById("game-mode").querySelector('option[value="onlineclassic"]').disabled = true;
    document.getElementById("game-mode").querySelector('option[value="onlinemodern"]').disabled = true;
    
    // If currently in online mode, switch to classic
    if (gameMode === "onlineclassic" || gameMode === "onlinemodern") {
        document.getElementById("game-mode").value = "versus";
        gameMode = "versus";
        displayMessage("Online mode is currently unavailable. Please try again later.");
    }
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

function displayMessage(message, isRoomCode = false) {
    let messageDiv = document.getElementById('message-display');
    if (!messageDiv) {
        messageDiv = document.createElement('div');
        messageDiv.id = 'message-display';
        messageDiv.style.position = 'fixed';
        messageDiv.style.top = '50%';
        messageDiv.style.left = '50%';
        messageDiv.style.transform = 'translate(-50%, -50%)';
        messageDiv.style.padding = '20px 40px';
        messageDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.95)';
        messageDiv.style.color = 'white';
        messageDiv.style.borderRadius = '15px';
        messageDiv.style.zIndex = '1000';
        messageDiv.style.fontSize = '28px';
        messageDiv.style.fontWeight = 'bold';
        messageDiv.style.textAlign = 'center';
        messageDiv.style.whiteSpace = 'pre-line';
        messageDiv.style.boxShadow = '0 0 20px rgba(255,255,255,0.3)';
        document.body.appendChild(messageDiv);
    }

    if (isRoomCode) {
        // Format room code to be more visible
        const parts = message.split(currentRoomId);
        messageDiv.innerHTML = parts[0] + 
          `<span style="color: #00ff00; font-size: 42px; background: rgba(0,255,0,0.2); padding: 10px 20px; border-radius: 8px; margin: 10px 5px; display: block;">${currentRoomId}</span>` + 
          parts[1];
        // Keep room codes visible longer
        setTimeout(() => {
            if (messageDiv && messageDiv.parentNode) {
                messageDiv.remove();
            }
        }, 10000); // 10 seconds for room codes
    } else {
        messageDiv.textContent = message;
        setTimeout(() => {
            if (messageDiv && messageDiv.parentNode) {
                messageDiv.remove();
            }
        }, 5000); // 5 seconds for other messages
    }
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
