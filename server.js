const WebSocket = require('ws');
const http = require('http');

// Use the port provided by Railway or default to 8081
const PORT = process.env.PORT || 8081;
const HOST = process.env.HOST || '0.0.0.0';

console.log('WebSocket server starting on port', PORT);

// Create an HTTP server
const server = http.createServer((req, res) => {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('WebSocket server is running\n');
});

// Create WebSocket server with optimized settings
const wss = new WebSocket.Server({ 
  server,
  perMessageDeflate: false,  // Disable compression for better performance
  clientTracking: true,
  verifyClient: (info) => {
    console.log('Origin:', info.origin);
    return true;  // Accept all connections
  }
});

// Set server timeout
server.timeout = 0;  // Disable timeout
server.keepAliveTimeout = 0;  // Disable keep-alive timeout

// Store active game rooms
const gameRooms = new Map();

wss.on('connection', (ws) => {
  console.log('New client connected');
  
  // Set WebSocket timeout
  ws.isAlive = true;
  ws.on('pong', () => {
    ws.isAlive = true;
  });

  // Handle messages
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('Received message:', data);

      switch (data.type) {
        case 'init':
          // Generate a unique player ID
          const playerId = Math.random().toString(36).substring(2, 8);
          ws.playerId = playerId;
          ws.send(JSON.stringify({ 
            type: 'init',
            playerId: playerId 
          }));
          break;

        case 'create_room':
          // Create a new room with a short, readable code
          const roomId = Math.random().toString(36).substring(2, 7).toUpperCase();
          gameRooms.set(roomId, { 
            players: new Set([ws]),
            gameMode: data.gameMode,
            host: ws.playerId
          });
          ws.roomId = roomId;
          console.log('Room created:', roomId);
          ws.send(JSON.stringify({ 
            type: 'room_created', 
            roomId: roomId
          }));
          break;

        case 'join_room':
          // Join existing room
          const room = gameRooms.get(data.roomId);
          if (room) {
            if (room.players.size >= 2) {
              ws.send(JSON.stringify({
                type: 'error',
                message: 'Room is full'
              }));
              return;
            }
            room.players.add(ws);
            ws.roomId = data.roomId;
            
            // Notify all players in room
            room.players.forEach(player => {
              player.send(JSON.stringify({
                type: 'player_joined',
                success: true,
                roomId: data.roomId,
                playerId: ws.playerId
              }));
            });
          } else {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Room not found'
            }));
          }
          break;

        case 'game_update':
          // Broadcast game updates to other players in room
          if (ws.roomId) {
            const currentRoom = gameRooms.get(ws.roomId);
            if (currentRoom) {
              currentRoom.players.forEach(player => {
                if (player !== ws && player.readyState === WebSocket.OPEN) {
                  player.send(JSON.stringify({
                    type: 'game_update',
                    playerId: ws.playerId,
                    state: data.state
                  }));
                }
              });
            }
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

  // Handle disconnection
  ws.on('close', () => {
    console.log('Client disconnected');
    if (ws.roomId) {
      const room = gameRooms.get(ws.roomId);
      if (room) {
        room.players.delete(ws);
        if (room.players.size === 0) {
          gameRooms.delete(ws.roomId);
          console.log('Room deleted:', ws.roomId);
        } else {
          // Notify remaining players
          room.players.forEach(player => {
            player.send(JSON.stringify({
              type: 'player_left',
              playerId: ws.playerId
            }));
          });
        }
      }
    }
  });
});

// Heartbeat to keep connections alive
const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      console.log('Terminating inactive client');
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping(() => {});
  });
}, 30000);

wss.on('close', () => {
  clearInterval(interval);
});

// Start the server
server.listen(PORT, HOST, () => {
  console.log('WebSocket server is running on port', PORT);
}); 