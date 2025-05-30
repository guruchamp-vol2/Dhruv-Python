const WebSocket = require('ws');

// Use the port provided by Railway or default to 8001
const PORT = process.env.PORT || 8001;

const wss = new WebSocket.Server({ port: PORT });

console.log(`WebSocket server is running on port ${PORT}`);

// Store active game rooms
const gameRooms = new Map();

wss.on('connection', (ws) => {
    let roomId = null;
    let playerId = null;

    console.log('New client connected');

    ws.on('message', (message) => {
        const data = JSON.parse(message);
        
        switch(data.type) {
            case 'create_room':
                roomId = Math.random().toString(36).substring(2, 8);
                gameRooms.set(roomId, {
                    players: [{ ws, id: data.playerId }],
                    gameState: {}
                });
                playerId = data.playerId;
                ws.send(JSON.stringify({ type: 'room_created', roomId }));
                console.log(`Room created: ${roomId}`);
                break;

            case 'join_room':
                if (gameRooms.has(data.roomId)) {
                    const room = gameRooms.get(data.roomId);
                    if (room.players.length < 2) {
                        roomId = data.roomId;
                        playerId = data.playerId;
                        room.players.push({ ws, id: playerId });
                        
                        // Notify both players that game can start
                        room.players.forEach(player => {
                            player.ws.send(JSON.stringify({
                                type: 'game_start',
                                players: room.players.map(p => p.id)
                            }));
                        });
                        console.log(`Player joined room: ${roomId}`);
                    } else {
                        ws.send(JSON.stringify({ type: 'error', message: 'Room is full' }));
                    }
                } else {
                    ws.send(JSON.stringify({ type: 'error', message: 'Room not found' }));
                }
                break;

            case 'game_update':
                if (roomId && gameRooms.has(roomId)) {
                    const room = gameRooms.get(roomId);
                    // Update game state
                    room.gameState = { ...room.gameState, ...data.gameState };
                    
                    // Broadcast to other player
                    room.players.forEach(player => {
                        if (player.id !== playerId) {
                            player.ws.send(JSON.stringify({
                                type: 'game_update',
                                gameState: data.gameState
                            }));
                        }
                    });
                }
                break;
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
        if (roomId && gameRooms.has(roomId)) {
            const room = gameRooms.get(roomId);
            // Notify other player about disconnection
            room.players.forEach(player => {
                if (player.id !== playerId && player.ws.readyState === WebSocket.OPEN) {
                    player.ws.send(JSON.stringify({ type: 'player_disconnected' }));
                }
            });
            gameRooms.delete(roomId);
            console.log(`Room deleted: ${roomId}`);
        }
    });
}); 