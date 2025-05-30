const WebSocket = require('ws');

// Use the port provided by Railway or default to 8001
const PORT = process.env.PORT || 8001;

const wss = new WebSocket.Server({
  port: PORT,
  // Add CORS headers for GitHub Pages and localhost
  verifyClient: (info) => {
    const origin = info.origin || info.req.headers.origin;
    const allowedOrigins = [
      'https://guruchamp-vol2.github.io',
      'http://localhost:8000',
      'http://127.0.0.1:8000',
      'https://dhruv-python-production.up.railway.app'
    ];
    
    if (!allowedOrigins.includes(origin)) {
      console.log('Rejected connection from:', origin);
      return false;
    }
    return true;
  }
});

console.log(`WebSocket server is running on port ${PORT}`);

// Store active game rooms
const gameRooms = new Map();

wss.on('connection', (ws, req) => {
  console.log('New client connected');
  let roomId = null;
  let playerId = null;

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('Received message:', data);

      switch (data.type) {
        case 'init':
          // Handle initial connection
          playerId = Math.random().toString(36).substring(7);
          ws.send(JSON.stringify({ type: 'init_ack', playerId }));
          break;

        case 'create_room':
          // Create a new room
          roomId = Math.random().toString(36).substring(5);
          gameRooms.set(roomId, {
            players: [{ id: playerId, ws }],
            gameMode: data.gameMode
          });
          ws.send(JSON.stringify({ type: 'room_created', roomId }));
          console.log('Room created:', roomId);
          break;

        case 'join_room':
          // Join an existing room
          const room = gameRooms.get(data.roomId);
          if (room && room.players.length < 2) {
            roomId = data.roomId;
            room.players.push({ id: playerId, ws });
            
            // Notify both players that the game can start
            room.players.forEach(player => {
              player.ws.send(JSON.stringify({
                type: 'game_start',
                players: room.players.map(p => p.id)
              }));
            });
          } else {
            ws.send(JSON.stringify({ type: 'error', message: 'Room full or not found' }));
          }
          break;

        case 'game_state':
          // Forward game state to the other player in the room
          const currentRoom = gameRooms.get(roomId);
          if (currentRoom) {
            const otherPlayer = currentRoom.players.find(p => p.id !== playerId);
            if (otherPlayer) {
              otherPlayer.ws.send(JSON.stringify({
                type: 'game_state',
                state: data.state
              }));
            }
          }
          break;
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    if (roomId && gameRooms.has(roomId)) {
      const room = gameRooms.get(roomId);
      const otherPlayer = room.players.find(p => p.id !== playerId);
      
      if (otherPlayer) {
        otherPlayer.ws.send(JSON.stringify({ type: 'player_disconnected' }));
      }
      
      gameRooms.delete(roomId);
    }
  });
}); 