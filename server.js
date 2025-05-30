const WebSocket = require('ws');
const http = require('http');

// Use the port provided by Railway or default to 8001
const PORT = process.env.PORT || 8001;

// Create an HTTP server
const server = http.createServer((req, res) => {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('WebSocket server is running\n');
});

// Create WebSocket server attached to HTTP server
const wss = new WebSocket.Server({ 
  server,
  clientTracking: true,
  // Add WebSocket options
  perMessageDeflate: {
    zlibDeflateOptions: {
      chunkSize: 1024,
      memLevel: 7,
      level: 3
    },
    zlibInflateOptions: {
      chunkSize: 10 * 1024
    },
    clientNoContextTakeover: true,
    serverNoContextTakeover: true,
    serverMaxWindowBits: 10,
    concurrencyLimit: 10,
    threshold: 1024
  }
});

console.log(`WebSocket server starting on port ${PORT}`);

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
          playerId = Math.random().toString(36).substring(2, 8);
          ws.send(JSON.stringify({
            type: 'init',
            playerId: playerId
          }));
          break;

        case 'create_room':
          roomId = Math.random().toString(36).substring(2, 5);
          gameRooms.set(roomId, {
            host: playerId,
            players: [{ id: playerId, ws: ws }],
            gameMode: data.gameMode
          });
          ws.send(JSON.stringify({
            type: 'room_created',
            roomId: roomId
          }));
          console.log('Room created:', roomId);
          break;

        case 'join_room':
          const room = gameRooms.get(data.roomId);
          if (!room) {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Room not found'
            }));
            return;
          }
          if (room.players.length >= 2) {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Room is full'
            }));
            return;
          }
          roomId = data.roomId;
          room.players.push({ id: playerId, ws: ws });
          
          // Notify both players that game can start
          room.players.forEach(player => {
            player.ws.send(JSON.stringify({
              type: 'game_start',
              players: room.players.map(p => ({ id: p.id }))
            }));
          });
          break;

        case 'game_update':
          const currentRoom = gameRooms.get(roomId);
          if (currentRoom) {
            // Send update to other player
            currentRoom.players
              .filter(p => p.id !== playerId)
              .forEach(player => {
                if (player.ws.readyState === WebSocket.OPEN) {
                  player.ws.send(JSON.stringify({
                    type: 'game_update',
                    state: data.state
                  }));
                }
              });
          }
          break;
      }
    } catch (error) {
      console.error('Error processing message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format'
      }));
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    if (roomId && gameRooms.has(roomId)) {
      const room = gameRooms.get(roomId);
      // Notify other player about disconnection
      room.players
        .filter(p => p.id !== playerId)
        .forEach(player => {
          if (player.ws.readyState === WebSocket.OPEN) {
            player.ws.send(JSON.stringify({
              type: 'player_disconnected'
            }));
          }
        });
      // Clean up room
      gameRooms.delete(roomId);
      console.log('Room deleted:', roomId);
    }
  });

  // Send initial connection success
  ws.send(JSON.stringify({ type: 'connected' }));
});

// Handle server errors
wss.on('error', (error) => {
  console.error('WebSocket server error:', error);
});

// Start the server
server.listen(PORT, () => {
  console.log(`WebSocket server is running on port ${PORT}`);
}); 