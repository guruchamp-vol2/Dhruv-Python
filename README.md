# 2D Fighting Game

A Super Smash Bros-style fighting game with online multiplayer support.

## Features
- Multiple playable characters with unique abilities
- Local and online multiplayer
- Modern and classic game modes
- AI opponents with adjustable difficulty
- Real-time multiplayer using WebSocket

## Play Online
Visit [game-url] to play online!

## Local Development
1. Clone the repository
2. Install Node.js
3. Run `npm install` to install dependencies
4. Start the WebSocket server: `node server.js`
5. In a separate terminal, serve the game: `python3 -m http.server 8000`
6. Visit `http://localhost:8000` in your browser

## Controls
- Player 1:
  - WASD: Movement
  - E: Attack
  - Q: Ultimate (when energy is full)

- Player 2:
  - Arrow Keys: Movement
  - L: Attack
  - O: Ultimate (when energy is full) 