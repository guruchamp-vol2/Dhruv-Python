// Game State
const GAME_STATE = {
    currentScreen: 'main-menu',
    selectedCharacters: {
        p1: null,
        p2: null
    },
    selectedStage: null,
    selectedMode: null,
    characters: [
        { id: 'fighter1', name: 'Dragon Knight', image: 'images/placeholder.png' },
        { id: 'fighter2', name: 'Shadow Ninja', image: 'images/placeholder.png' },
        { id: 'fighter3', name: 'Thunder Mage', image: 'images/placeholder.png' },
        { id: 'fighter4', name: 'Ice Queen', image: 'images/placeholder.png' },
        { id: 'fighter5', name: 'Fire Warrior', image: 'images/placeholder.png' },
        { id: 'fighter6', name: 'Wind Archer', image: 'images/placeholder.png' },
        { id: 'fighter7', name: 'Earth Golem', image: 'images/placeholder.png' },
        { id: 'fighter8', name: 'Light Paladin', image: 'images/placeholder.png' }
    ]
};

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeGame();
});

// Initialize game components
function initializeGame() {
    loadCharacterGrid();
    initializeEventListeners();
    setupCanvas();
}

// Load character selection grid
function loadCharacterGrid() {
    const grid = document.querySelector('.character-grid');
    GAME_STATE.characters.forEach(character => {
        const card = createCharacterCard(character);
        grid.appendChild(card);
    });
}

// Create character card element
function createCharacterCard(character) {
    const card = document.createElement('div');
    card.className = 'character-card';
    card.dataset.characterId = character.id;
    
    card.innerHTML = `
        <img src="${character.image}" alt="${character.name}">
        <h3>${character.name}</h3>
    `;
    
    card.addEventListener('click', () => selectCharacter(character));
    return card;
}

// Handle character selection
function selectCharacter(character) {
    const currentPlayer = !GAME_STATE.selectedCharacters.p1 ? 'p1' : 
                         !GAME_STATE.selectedCharacters.p2 ? 'p2' : null;
    
    if (!currentPlayer) return;
    
    GAME_STATE.selectedCharacters[currentPlayer] = character;
    updatePlayerInfo(currentPlayer, character);
    checkBattleReady();
}

// Update player information display
function updatePlayerInfo(player, character) {
    const playerInfo = document.querySelector(`#${player}-info .selected-character`);
    playerInfo.querySelector('img').src = character.image;
    playerInfo.querySelector('.character-name').textContent = character.name;
}

// Check if battle can start
function checkBattleReady() {
    const startBtn = document.querySelector('.start-btn');
    const stageSelect = document.querySelector('#stage-select');
    const modeSelect = document.querySelector('#mode-select');
    
    const isReady = GAME_STATE.selectedCharacters.p1 && 
                    GAME_STATE.selectedCharacters.p2 && 
                    stageSelect.value && 
                    modeSelect.value;
    
    startBtn.disabled = !isReady;
}

// Initialize event listeners
function initializeEventListeners() {
    // Stage selection
    document.querySelector('#stage-select').addEventListener('change', (e) => {
        GAME_STATE.selectedStage = e.target.value;
        checkBattleReady();
    });

    // Mode selection
    document.querySelector('#mode-select').addEventListener('change', (e) => {
        GAME_STATE.selectedMode = e.target.value;
        checkBattleReady();
    });
}

// Show specific screen
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
    GAME_STATE.currentScreen = screenId;
}

// Setup game canvas
function setupCanvas() {
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    
    // Set canvas size
    function resizeCanvas() {
        canvas.width = window.innerWidth * 0.8;
        canvas.height = window.innerHeight * 0.7;
    }
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
}

// Start battle
function startBattle() {
    if (!GAME_STATE.selectedCharacters.p1 || !GAME_STATE.selectedCharacters.p2) return;
    
    showScreen('battle-screen');
    initializeBattle();
}

// Initialize battle
function initializeBattle() {
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    
    // Set initial health
    document.querySelectorAll('.health-fill').forEach(health => {
        health.style.width = '100%';
    });
    
    // Initialize game loop
    let lastTime = 0;
    function gameLoop(timestamp) {
        const deltaTime = timestamp - lastTime;
        lastTime = timestamp;
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Update game state
        updateGame(deltaTime);
        
        // Draw game
        drawGame(ctx);
        
        // Continue game loop
        requestAnimationFrame(gameLoop);
    }
    
    requestAnimationFrame(gameLoop);
}

// Update game state
function updateGame(deltaTime) {
    // Update player positions, handle collisions, etc.
}

// Draw game elements
function drawGame(ctx) {
    // Draw background, players, effects, etc.
} 