// Game state
const GAME_STATE = {
    players: {
        player1: { 
            health: 1000, 
            character: null, 
            x: 100, 
            y: 400, 
            velocityX: 0, 
            velocityY: 0, 
            isJumping: false,
            isAttacking: false,
            attackCooldown: 0,
            attackDamage: 50,
            attackRange: 100,
            attackAnimation: 0,
            direction: 1 // 1 for right, -1 for left
        },
        player2: { 
            health: 1000, 
            character: null, 
            x: 600, 
            y: 400, 
            velocityX: 0, 
            velocityY: 0, 
            isJumping: false,
            isAttacking: false,
            attackCooldown: 0,
            attackDamage: 50,
            attackRange: 100,
            attackAnimation: 0,
            direction: -1
        },
        ai: { 
            health: 1000, 
            character: null, 
            x: 600, 
            y: 400, 
            velocityX: 0, 
            velocityY: 0, 
            isJumping: false,
            isAttacking: false,
            attackCooldown: 0,
            attackDamage: 50,
            attackRange: 100,
            attackAnimation: 0,
            direction: -1
        }
    },
    selectedMode: 'Classic',
    aiEnabled: true,
    aiDifficulty: 'Easy',
    gameStarted: false,
    selectedCharacters: [],
    effects: [] // Visual effects like hit sparks
};

// Game configuration
const GAME_CONFIG = {
    CANVAS_WIDTH: 800,
    CANVAS_HEIGHT: 600,
    DEBUG: true,
    ASSETS_PATH: 'images/',  // Updated path for assets
    FPS: 60,
    MOVEMENT_SPEED: 5,
    JUMP_FORCE: 15,
    GRAVITY: 0.8,
    GROUND_Y: 500,
    CHARACTER_WIDTH: 100,
    CHARACTER_HEIGHT: 150,
    ATTACK_COOLDOWN: 30,
    ATTACK_DURATION: 15,
    EFFECT_DURATION: 10
};

// Debug utilities
const DEBUG = {
    log(msg, data) {
        console.log(msg, data || '');
        this.updateDebug(msg, data);
    },
    error(msg, error) {
        console.error(msg, error || '');
        this.updateDebug(msg, error, true);
    },
    updateDebug(msg, data, isError = false) {
        const debug = document.getElementById('debug');
        if (!debug) return;
        
        const text = data ? `${msg}\n${JSON.stringify(data, null, 2)}` : msg;
        const color = isError ? '#ff0000' : '#00ff00';
        debug.innerHTML = `<div style="color: ${color}">${text}</div>${debug.innerHTML}`;
    }
};

// Initialize game
function initGame() {
    DEBUG.log('Initializing game...');
    
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) {
        DEBUG.error('Canvas element not found');
        return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
        DEBUG.error('Could not get canvas context');
        return;
    }

    // Set canvas size
    canvas.width = GAME_CONFIG.CANVAS_WIDTH;
    canvas.height = GAME_CONFIG.CANVAS_HEIGHT;

    // Center canvas on screen
    canvas.style.position = 'fixed';
    canvas.style.top = '50%';
    canvas.style.left = '50%';
    canvas.style.transform = 'translate(-50%, -50%)';

    // Initialize player characters
    if (GAME_STATE.selectedCharacters.length > 0) {
        const selectedChar = GAME_STATE.selectedCharacters[0];
        DEBUG.log('Selected character:', selectedChar);
        
        GAME_STATE.players.player1.character = selectedChar;
        
        // Set opponent character
        if (!GAME_STATE.aiEnabled && GAME_STATE.selectedCharacters[1]) {
            GAME_STATE.players.player2.character = GAME_STATE.selectedCharacters[1];
        } else if (GAME_STATE.aiEnabled) {
            GAME_STATE.players.ai.character = selectedChar;
        }
    } else {
        DEBUG.error('No characters selected');
        return;
    }

    // Game loop
    let lastTime = 0;
    function gameLoop(timestamp) {
        const deltaTime = timestamp - lastTime;
        lastTime = timestamp;

        update(deltaTime);
        draw(ctx);
        requestAnimationFrame(gameLoop);
    }

    // Start game loop
    requestAnimationFrame(gameLoop);

    // Add event listeners
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    
    DEBUG.log('Game initialized successfully');
}

function update(deltaTime) {
    if (!GAME_STATE.gameStarted) return;

    // Update player positions and states
    updatePlayer(GAME_STATE.players.player1);
    if (!GAME_STATE.aiEnabled) {
        updatePlayer(GAME_STATE.players.player2);
    } else {
        updateAI(GAME_STATE.players.ai);
    }

    // Update attack cooldowns and animations
    Object.values(GAME_STATE.players).forEach(player => {
        if (player.attackCooldown > 0) player.attackCooldown--;
        if (player.attackAnimation > 0) player.attackAnimation--;
    });

    // Update effects
    GAME_STATE.effects = GAME_STATE.effects.filter(effect => {
        effect.duration--;
        return effect.duration > 0;
    });

    // Apply gravity
    Object.values(GAME_STATE.players).forEach(player => {
        if (player.y < GAME_CONFIG.GROUND_Y) {
            player.velocityY += GAME_CONFIG.GRAVITY;
            player.y += player.velocityY;
        } else {
            player.y = GAME_CONFIG.GROUND_Y;
            player.velocityY = 0;
            player.isJumping = false;
        }
    });

    // Check collisions and combat
    checkCombat();
}

function draw(ctx) {
    // Clear canvas
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);

    // Draw ground
    ctx.fillStyle = '#333';
    ctx.fillRect(0, GAME_CONFIG.GROUND_Y, GAME_CONFIG.CANVAS_WIDTH, 
                GAME_CONFIG.CANVAS_HEIGHT - GAME_CONFIG.GROUND_Y);

    // Draw players
    drawPlayer(ctx, GAME_STATE.players.player1, 'Player 1');
    if (GAME_STATE.aiEnabled) {
        drawPlayer(ctx, GAME_STATE.players.ai, 'AI');
    } else {
        drawPlayer(ctx, GAME_STATE.players.player2, 'Player 2');
    }

    // Draw effects
    GAME_STATE.effects.forEach(effect => {
        ctx.fillStyle = effect.color;
        ctx.globalAlpha = effect.duration / GAME_CONFIG.EFFECT_DURATION;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    });

    // Draw health bars
    drawHealthBars(ctx);
}

function drawPlayer(ctx, player, label) {
    if (!player.character) return;

    // Draw character
    ctx.fillStyle = player.isAttacking ? '#ff0000' : '#ff4d4d';
    ctx.fillRect(player.x, player.y - GAME_CONFIG.CHARACTER_HEIGHT, 
                GAME_CONFIG.CHARACTER_WIDTH, GAME_CONFIG.CHARACTER_HEIGHT);

    // Draw attack animation if attacking
    if (player.attackAnimation > 0) {
        const attackX = player.direction === 1 ? 
            player.x + GAME_CONFIG.CHARACTER_WIDTH : 
            player.x - player.attackRange;
        
        ctx.fillStyle = 'yellow';
        ctx.globalAlpha = player.attackAnimation / GAME_CONFIG.ATTACK_DURATION;
        ctx.fillRect(attackX, 
                    player.y - GAME_CONFIG.CHARACTER_HEIGHT, 
                    player.attackRange, 
                    GAME_CONFIG.CHARACTER_HEIGHT);
        ctx.globalAlpha = 1;
    }

    // Draw label
    ctx.fillStyle = '#fff';
    ctx.font = '16px Bangers';
    ctx.textAlign = 'center';
    ctx.fillText(label, player.x + GAME_CONFIG.CHARACTER_WIDTH/2, 
                player.y - GAME_CONFIG.CHARACTER_HEIGHT - 10);
}

function drawHealthBars(ctx) {
    const barWidth = 200;
    const barHeight = 20;
    const margin = 20;

    // Player 1 health bar
    drawHealthBar(ctx, margin, margin, barWidth, barHeight, 
                 GAME_STATE.players.player1.health, 'Player 1');

    // Player 2/AI health bar
    drawHealthBar(ctx, GAME_CONFIG.CANVAS_WIDTH - margin - barWidth, margin, 
                 barWidth, barHeight, 
                 GAME_STATE.aiEnabled ? GAME_STATE.players.ai.health : GAME_STATE.players.player2.health,
                 GAME_STATE.aiEnabled ? 'AI' : 'Player 2');
}

function drawHealthBar(ctx, x, y, width, height, health, label) {
    // Background
    ctx.fillStyle = '#333';
    ctx.fillRect(x, y, width, height);

    // Health
    const healthWidth = (health / 1000) * width;
    ctx.fillStyle = health > 300 ? '#2ecc71' : health > 100 ? '#f1c40f' : '#e74c3c';
    ctx.fillRect(x, y, healthWidth, height);

    // Border
    ctx.strokeStyle = '#fff';
    ctx.strokeRect(x, y, width, height);

    // Label
    ctx.fillStyle = '#fff';
    ctx.font = '16px Bangers';
    ctx.textAlign = 'center';
    ctx.fillText(`${label}: ${health}`, x + width/2, y - 5);
}

function updatePlayer(player) {
    // Update position based on velocity
    player.x += player.velocityX;
    
    // Keep player in bounds
    player.x = Math.max(0, Math.min(player.x, GAME_CONFIG.CANVAS_WIDTH - GAME_CONFIG.CHARACTER_WIDTH));
}

function updateAI(ai) {
    const player = GAME_STATE.players.player1;
    const difficulty = {
        'Easy': 0.02,
        'Medium': 0.04,
        'Hard': 0.06
    }[GAME_STATE.aiDifficulty];

    // Move towards player
    if (Math.abs(player.x - ai.x) > GAME_CONFIG.CHARACTER_WIDTH) {
        ai.velocityX = player.x < ai.x ? -GAME_CONFIG.MOVEMENT_SPEED : GAME_CONFIG.MOVEMENT_SPEED;
        ai.direction = player.x < ai.x ? -1 : 1;
    } else {
        ai.velocityX = 0;
        
        // Attack if in range and cooldown is ready
        if (ai.attackCooldown <= 0 && Math.random() < difficulty * 2) {
            ai.isAttacking = true;
            ai.attackAnimation = GAME_CONFIG.ATTACK_DURATION;
            ai.attackCooldown = GAME_CONFIG.ATTACK_COOLDOWN;
        }
    }

    // Random jumping
    if (!ai.isJumping && Math.random() < difficulty) {
        ai.velocityY = -GAME_CONFIG.JUMP_FORCE;
        ai.isJumping = true;
    }
}

function handleKeyDown(event) {
    if (!GAME_STATE.gameStarted) return;

    const player1 = GAME_STATE.players.player1;
    const player2 = GAME_STATE.players.player2;

    switch(event.key) {
        // Player 1 controls
        case 'ArrowLeft':
            player1.velocityX = -GAME_CONFIG.MOVEMENT_SPEED;
            player1.direction = -1;
            break;
        case 'ArrowRight':
            player1.velocityX = GAME_CONFIG.MOVEMENT_SPEED;
            player1.direction = 1;
            break;
        case 'ArrowUp':
            if (!player1.isJumping) {
                player1.velocityY = -GAME_CONFIG.JUMP_FORCE;
                player1.isJumping = true;
            }
            break;
        case ' ': // Space to attack for Player 1
            if (player1.attackCooldown <= 0) {
                player1.isAttacking = true;
                player1.attackAnimation = GAME_CONFIG.ATTACK_DURATION;
                player1.attackCooldown = GAME_CONFIG.ATTACK_COOLDOWN;
            }
            break;

        // Player 2 controls (if AI is disabled)
        case 'a':
            if (!GAME_STATE.aiEnabled) {
                player2.velocityX = -GAME_CONFIG.MOVEMENT_SPEED;
                player2.direction = -1;
            }
            break;
        case 'd':
            if (!GAME_STATE.aiEnabled) {
                player2.velocityX = GAME_CONFIG.MOVEMENT_SPEED;
                player2.direction = 1;
            }
            break;
        case 'w':
            if (!GAME_STATE.aiEnabled && !player2.isJumping) {
                player2.velocityY = -GAME_CONFIG.JUMP_FORCE;
                player2.isJumping = true;
            }
            break;
        case 'e': // E to attack for Player 2
            if (!GAME_STATE.aiEnabled && player2.attackCooldown <= 0) {
                player2.isAttacking = true;
                player2.attackAnimation = GAME_CONFIG.ATTACK_DURATION;
                player2.attackCooldown = GAME_CONFIG.ATTACK_COOLDOWN;
            }
            break;
    }
}

function handleKeyUp(event) {
    if (!GAME_STATE.gameStarted) return;

    const player1 = GAME_STATE.players.player1;
    const player2 = GAME_STATE.players.player2;

    switch(event.key) {
        // Player 1 controls
        case 'ArrowLeft':
        case 'ArrowRight':
            player1.velocityX = 0;
            break;

        // Player 2 controls
        case 'a':
        case 'd':
            if (!GAME_STATE.aiEnabled) player2.velocityX = 0;
            break;
    }
}

function checkCombat() {
    const player1 = GAME_STATE.players.player1;
    const opponent = GAME_STATE.aiEnabled ? GAME_STATE.players.ai : GAME_STATE.players.player2;

    // Check player 1's attack
    if (player1.isAttacking && player1.attackAnimation > 0) {
        const attackBox = {
            x: player1.direction === 1 ? player1.x + GAME_CONFIG.CHARACTER_WIDTH : 
                                       player1.x - player1.attackRange,
            y: player1.y - GAME_CONFIG.CHARACTER_HEIGHT,
            width: player1.attackRange,
            height: GAME_CONFIG.CHARACTER_HEIGHT
        };

        const opponentBox = {
            x: opponent.x,
            y: opponent.y - GAME_CONFIG.CHARACTER_HEIGHT,
            width: GAME_CONFIG.CHARACTER_WIDTH,
            height: GAME_CONFIG.CHARACTER_HEIGHT
        };

        if (checkBoxCollision(attackBox, opponentBox)) {
            // Deal damage
            opponent.health = Math.max(0, opponent.health - player1.attackDamage);
            
            // Create hit effect
            GAME_STATE.effects.push({
                x: opponent.x + GAME_CONFIG.CHARACTER_WIDTH/2,
                y: opponent.y - GAME_CONFIG.CHARACTER_HEIGHT/2,
                radius: 20,
                color: '#ffff00',
                duration: GAME_CONFIG.EFFECT_DURATION
            });
        }
    }

    // Check opponent's attack
    if (opponent.isAttacking && opponent.attackAnimation > 0) {
        const attackBox = {
            x: opponent.direction === 1 ? opponent.x + GAME_CONFIG.CHARACTER_WIDTH : 
                                        opponent.x - opponent.attackRange,
            y: opponent.y - GAME_CONFIG.CHARACTER_HEIGHT,
            width: opponent.attackRange,
            height: GAME_CONFIG.CHARACTER_HEIGHT
        };

        const player1Box = {
            x: player1.x,
            y: player1.y - GAME_CONFIG.CHARACTER_HEIGHT,
            width: GAME_CONFIG.CHARACTER_WIDTH,
            height: GAME_CONFIG.CHARACTER_HEIGHT
        };

        if (checkBoxCollision(attackBox, player1Box)) {
            // Deal damage
            player1.health = Math.max(0, player1.health - opponent.attackDamage);
            
            // Create hit effect
            GAME_STATE.effects.push({
                x: player1.x + GAME_CONFIG.CHARACTER_WIDTH/2,
                y: player1.y - GAME_CONFIG.CHARACTER_HEIGHT/2,
                radius: 20,
                color: '#ffff00',
                duration: GAME_CONFIG.EFFECT_DURATION
            });
        }
    }

    // Reset attack states
    player1.isAttacking = false;
    opponent.isAttacking = false;
}

function checkBoxCollision(box1, box2) {
    return box1.x < box2.x + box2.width &&
           box1.x + box1.width > box2.x &&
           box1.y < box2.y + box2.height &&
           box1.y + box1.height > box2.y;
}

function startGame() {
    GAME_STATE.gameStarted = true;
    GAME_STATE.selectedMode = document.querySelector('.mode-button.active').textContent;
    GAME_STATE.aiEnabled = document.querySelector('.ai-controls input[type="checkbox"]').checked;
    GAME_STATE.aiDifficulty = document.querySelector('.difficulty-button.active').textContent;

    // Initialize player positions
    Object.values(GAME_STATE.players).forEach(player => {
        player.health = 1000;
    });

    // Hide menu and show canvas
    document.querySelector('.hero').style.display = 'none';
    document.querySelector('.characters').style.display = 'none';
    document.getElementById('gameCanvas').style.display = 'block';

    // Start the game
    initGame();
}

// Initialize character selection
document.addEventListener('DOMContentLoaded', () => {
    const characterGrid = document.getElementById('characterGrid');
    
    // Add click handlers for mode buttons
    document.querySelectorAll('.mode-button').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.mode-button').forEach(b => b.classList.remove('active'));
            button.classList.add('active');
        });
    });

    // Add click handlers for difficulty buttons
    document.querySelectorAll('.difficulty-button').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.difficulty-button').forEach(b => b.classList.remove('active'));
            button.classList.add('active');
        });
    });
}); 