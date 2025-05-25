const characters = ["mario", "kirby"];

let selectedP1 = null;
let selectedP2 = null;
let sprites = {};
let player1, player2;
let projectiles = [];
let canvas, ctx;

function loadSprites(callback) {
  let loaded = 0;
  characters.forEach(name => {
    const img = new Image();
    img.src = `images/${name}.png`;
    img.onload = () => {
      sprites[name] = img;
      if (++loaded === characters.length) callback();
    };
  });
}

function createCharacterSelectors() {
  const p1Container = document.getElementById("player1-select");
  const p2Container = document.getElementById("player2-select");

  characters.forEach(name => {
    const img1 = document.createElement("img");
    img1.src = `images/${name}.png`;
    img1.onclick = () => {
      document.querySelectorAll("#player1-select img").forEach(i => i.classList.remove("selected"));
      img1.classList.add("selected");
      selectedP1 = name;
      checkStart();
    };

    const img2 = document.createElement("img");
    img2.src = `images/${name}.png`;
    img2.onclick = () => {
      document.querySelectorAll("#player2-select img").forEach(i => i.classList.remove("selected"));
      img2.classList.add("selected");
      selectedP2 = name;
      checkStart();
    };

    p1Container.appendChild(img1);
    p2Container.appendChild(img2);
  });
}

function checkStart() {
  const btn = document.getElementById("startBtn");
  btn.disabled = !(selectedP1 && selectedP2);
}

document.getElementById("startBtn").onclick = () => {
  document.getElementById("startBtn").style.display = "none";
  document.querySelector("h1").style.display = "none";
  document.querySelectorAll(".select-section").forEach(el => el.style.display = "none");

  canvas = document.getElementById("gameCanvas");
  canvas.style.display = "block";
  ctx = canvas.getContext("2d");

  player1 = {
    x: 100, y: 300, vx: 0, vy: 0,
    sprite: sprites[selectedP1],
    controls: { left: "ArrowLeft", right: "ArrowRight", up: "ArrowUp", shoot: "Enter" },
    health: 100,
    facing: 1
  };

  player2 = {
    x: 600, y: 300, vx: 0, vy: 0,
    sprite: sprites[selectedP2],
    controls: { left: "KeyA", right: "KeyD", up: "KeyW", shoot: "Space" },
    health: 100,
    facing: -1
  };

  document.addEventListener("keydown", handleKeyDown);
  document.addEventListener("keyup", handleKeyUp);
  requestAnimationFrame(gameLoop);
};

let keys = {};

function handleKeyDown(e) {
  keys[e.code] = true;
  if (e.code === player1.controls.shoot) shoot(player1);
  if (e.code === player2.controls.shoot) shoot(player2);
}

function handleKeyUp(e) {
  keys[e.code] = false;
}

function shoot(player) {
  projectiles.push({
    x: player.x + (player.facing > 0 ? 60 : -10),
    y: player.y + 20,
    vx: player.facing * 6,
    from: player
  });
}

function updatePlayer(player) {
  if (keys[player.controls.left]) player.vx = -3, player.facing = -1;
  else if (keys[player.controls.right]) player.vx = 3, player.facing = 1;
  else player.vx = 0;

  if (keys[player.controls.up] && player.y >= 300) player.vy = -10;

  player.vy += 0.5;
  player.x += player.vx;
  player.y += player.vy;

  if (player.y > 300) {
    player.y = 300;
    player.vy = 0;
  }
}

function detectHit(proj, target) {
  return (
    proj.x > target.x &&
    proj.x < target.x + 64 &&
    proj.y > target.y &&
    proj.y < target.y + 64
  );
}

function gameLoop() {
  updatePlayer(player1);
  updatePlayer(player2);

  projectiles = projectiles.filter(p => {
    p.x += p.vx;
    const target = p.from === player1 ? player2 : player1;
    if (detectHit(p, target)) {
      target.health -= 10;
      return false;
    }
    return p.x > 0 && p.x < canvas.width;
  });

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "red";
  ctx.fillRect(20, 20, player1.health * 2, 10);

  ctx.fillStyle = "blue";
  ctx.fillRect(560, 20, player2.health * 2, 10);

  ctx.drawImage(player1.sprite, player1.x, player1.y, 64, 64);
  ctx.drawImage(player2.sprite, player2.x, player2.y, 64, 64);

  ctx.fillStyle = "white";
  projectiles.forEach(p => ctx.fillRect(p.x, p.y, 10, 4));

  requestAnimationFrame(gameLoop);
}

loadSprites(createCharacterSelectors);
