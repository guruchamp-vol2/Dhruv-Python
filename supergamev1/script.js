// Constants
const GAME_CONFIG = {
    CANVAS_WIDTH: 800,
    CANVAS_HEIGHT: 600,
    DEBUG: true,
    BASE_URL: 'https://guruchamp-vol2.github.io/Dhruv-Python'  // Changed to match working URL
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

// Game state
let canvas = null;
let ctx = null;
let testImage = null;

// Initialize game
async function initGame() {
    try {
        // Get canvas
        canvas = document.getElementById('gameCanvas');
        if (!canvas) {
            console.error('Canvas not found');
            return;
        }
        
        // Get context
        ctx = canvas.getContext('2d');
        if (!ctx) {
            console.error('Could not get canvas context');
            return;
        }
        
        // Clear canvas with purple background
        ctx.fillStyle = '#4a0072';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Create test image
        testImage = new Image();
        
        // Log all image events
        testImage.onload = () => {
            console.log('Image loaded successfully:', {
                width: testImage.width,
                height: testImage.height,
                src: testImage.src
            });
            
            // Draw image in center of canvas
            const x = (canvas.width - 100) / 2;
            const y = (canvas.height - 100) / 2;
            
            try {
                // Draw red background to see if canvas drawing works
                ctx.fillStyle = 'red';
                ctx.fillRect(x, y, 100, 100);
                
                // Try to draw the image
                ctx.drawImage(testImage, x, y, 100, 100);
                console.log('Image drawn successfully');
                
                // Draw yellow border to confirm drawing happened
                ctx.strokeStyle = 'yellow';
                ctx.strokeRect(x, y, 100, 100);
            } catch (error) {
                console.error('Failed to draw image:', error);
            }
        };
        
        testImage.onerror = (error) => {
            console.error('Failed to load image:', error);
            
            // Draw error indicator
            const x = (canvas.width - 100) / 2;
            const y = (canvas.height - 100) / 2;
            ctx.fillStyle = 'red';
            ctx.fillRect(x, y, 100, 100);
            ctx.strokeStyle = 'white';
            ctx.strokeRect(x, y, 100, 100);
        };
        
        // First try without CORS
        console.log('Attempting to load image...');
        testImage.src = './mario.png';
        
        // If that fails, try with CORS
        testImage.onerror = () => {
            console.log('Retrying with CORS...');
            testImage.crossOrigin = 'anonymous';
            testImage.src = 'https://guruchamp-vol2.github.io/Dhruv-Python/mario.png';
        };
        
    } catch (error) {
        console.error('Game initialization failed:', error);
    }
}

// Start when page loads
window.addEventListener('load', initGame);