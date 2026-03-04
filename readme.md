<!-- server.js → Express + DB + Socket init
socket/index.js → Game engine logic
debugTestCourtPiece.js → 4-player simulator -->




# Court Piece Multiplayer Game

## Overview
Real-time multiplayer Court Piece card game built using:

- Node.js
- Express
- Socket.io
- MongoDB 

## Features
- Trump selection logic
- Dealer rotation
- Team-based scoring
- 13-hand round system
- Goon & Full Court logic

## Architecture
- Modular socket logic
- Separate dealManager
- Separate trumpManager
- Rule engine for trick evaluation

## How to Run

cd server
npm install
npm start
