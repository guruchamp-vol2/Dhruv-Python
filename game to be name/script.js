const characters = [
  "mario", "luigi", "kirby", "sonic", "tails", "shadow",
  "toriel", "sans", "mettaton", "kris", "susie",
  "jevil", "spadeking", "berdly", "noelle", "spamton"
];

let p1Char = null;
let p2Char = null;

const p1Container = document.getElementById("p1-characters");
const p2Container = document.getElementById("p2-characters");

characters.forEach(char => {
  const img1 = document.createElement("img");
  img1.src = `images/${char}.png`;
  img1.alt = char;
  img1.addEventListener("click", () => selectCharacter(1, char, img1));
  p1Container.appendChild(img1);

  const img2 = document.createElement("img");
  img2.src = `images/${char}.png`;
  img2.alt = char;
  img2.addEventListener("click", () => selectCharacter(2, char, img2));
  p2Container.appendChild(img2);
});

function selectCharacter(player, char, imgElement) {
  if (player === 1) {
    p1Char = char;
    document.querySelectorAll("#p1-characters img").forEach(i => i.classList.remove("selected"));
    imgElement.classList.add("selected");
  } else {
    p2Char = char;
    document.querySelectorAll("#p2-characters img").forEach(i => i.classList.remove("selected"));
    imgElement.classList.add("selected");
  }

  document.getElementById("start-game").disabled = !(p1Char && p2Char);
}

document.getElementById("start-game").addEventListener("click", () => {
  document.getElementById("character-select").style.display = "none";
  document.getElementById("game-screen").style.display = "block";
  startGame();
  document.getElementById("instruction-screen").style.display = "none"; // Hide instructions after start
});

// ---------------------- Game Logic ---------------------- //
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let p1 = { x: 100, y: 300, health: 1000, vx: 0, vy: 0, facing: 1, shieldActive: false, shieldTimer: 0 };
let p2 = { x: 600, y: 300, health: 1000, vx: 0, vy: 0, facing: -1, shieldActive: false, shieldTimer: 0 };

let projectiles = [];

let p1Img = new Image();
let p2Img = new Image();

const gravity = 1;
const groundY = 300;

let keys = {};

document.addEventListener("keydown", e => keys[e.key] = true);
document.addEventListener("keyup", e => keys[e.key] = false);

function startGame() {
  p1Img.src = `images/${p1Char}.png`;
  p2Img.src = `images/${p2Char}.png`;
  p1Img.onload = () => { 
    p1.x = 100; 
    p1.y = groundY; 
  };
  p2Img.onload = () => { 
    p2.x = 600; 
    p2.y = groundY; 
  };
  p1.health = 1000;
  p2.health = 1000;
  requestAnimationFrame(gameLoop);
}

function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Player Movement
  if (keys["a"]) p1.x -= 5;
  if (keys["d"]) p1.x += 5;
  if (keys["w"] && p1.y === groundY) p1.vy = -15;
  if (keys["ArrowLeft"]) p2.x -= 5;
  if (keys["ArrowRight"]) p2.x += 5;
  if (keys["ArrowUp"] && p2.y === groundY) p2.vy = -15;

  // Shield Activation
  if (keys["Shift"]) activateShield(1);
  if (keys["Enter"]) activateShield(2);

  // Gravity
  p1.vy += gravity;
  p2.vy += gravity;
  p1.y += p1.vy;
  p2.y += p2.vy;

  if (p1.y > groundY) { p1.y = groundY; p1.vy = 0; }
  if (p2.y > groundY) { p2.y = groundY; p2.vy = 0; }

  // Attack projectiles
  if (keys["r"]) shootProjectile(p1);
  if (keys["l"]) shootProjectile(p2);

  // Update projectiles
  projectiles.forEach(p => {
    p.x += p.vx;
  });

  // Collision detection
  projectiles = projectiles.filter(p => {
    let hit = false;
    if (p.owner === 1 && checkCollision(p, p2)) {
      if (p2.shieldActive) {
        p2.health -= 5; // Half damage if shield is active
      } else {
        p2.health -= 10;
      }
      hit = true;
    } else if (p.owner === 2 && checkCollision(p, p1)) {
      if (p1.shieldActive) {
        p1.health -= 5; // Half damage if shield is active
      } else {
        p1.health -= 10;
      }
      hit = true;
    }
    return !hit && p.x >= 0 && p.x <= canvas.width;
  });

  // Check for game over
  if (p1.health <= 0) {
    showGameOver(1);
  } else if (p2.health <= 0) {
    showGameOver(2);
  }

  // Draw characters
  ctx.drawImage(p1Img, p1.x, p1.y, 100, 100);
  ctx.drawImage(p2Img, p2.x, p2.y, 100, 100);

  // Draw projectiles
  ctx.fillStyle = "red";
  projectiles.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
    ctx.fill();
  });

  // Draw shield overlay
  if (p1.shieldActive) {
    ctx.fillStyle = "rgba(0, 0, 255, 0.5)"; // Blue shield overlay
    ctx.fillRect(p1.x, p1.y, 100, 100);
  }
  if (p2.shieldActive) {
    ctx.fillStyle = "rgba(0, 0, 255, 0.5)";
    ctx.fillRect(p2.x, p2.y, 100, 100);
  }

  // Health Display
  document.getElementById("p1-health").textContent = `Player 1: ${p1.health}`;
  document.getElementById("p2-health").textContent = `Player 2: ${p2.health}`;

  requestAnimationFrame(gameLoop);
}

function shootProjectile(player) {
  const x = player.x + (player === p1 ? 100 : 0);
  const direction = player === p1 ? 1 : -1;
  projectiles.push({ x: x, y: player.y + 50, vx: direction * 7, owner: player === p1 ? 1 : 2 });
}

function checkCollision(proj, target) {
  return proj.x > target.x && proj.x < target.x + 100 &&
         proj.y > target.y && proj.y < target.y + 100;
}

function activateShield(player) {
  if (player === 1 && p1.shieldTimer <= 0) {
    p1.shieldActive = true;
    p1.shieldTimer = 200; // Shield lasts for 200 frames (~6.67 seconds)
  }
  if (player === 2 && p2.shieldTimer <= 0) {
    p2.shieldActive = true;
    p2.shieldTimer = 200;
  }
}

function showGameOver(winner) {
  const gameOverScreen = document.getElementById("game-over-screen");
  gameOverScreen.style.display = "block";

  if (winner === 1) {
    gameOverScreen.innerHTML = "Game Over, Player 2 Died!";
  } else {
    gameOverScreen.innerHTML = "Game Over, Player 1 Died!";
  }

  setTimeout(() => {
    resetGame();
  }, 3000);
}

function resetGame() {
  p1.health = 1000;
  p2.health = 1000;
  p1.x = 100;
  p2.x = 600;
  p1.y = groundY;
  p2.y = groundY;
  p1.shieldActive = false;
  p2.shieldActive = false;
  document.getElementById("game-over-screen").style.display = "none";
  document.getElementById("character-select").style.display = "block";
  document.getElementById("game-screen").style.display = "none";
  p1Char = null;
  p2Char = null;
}
