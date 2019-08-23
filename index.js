import game from './src/game';
import Okinawa from 'okinawa.js';

// Create and initialize game object
// parameters:
//   1) canvas DOM element id
//   2) game object, already instantiated
//   3) optional callback function to inform of certain events inside the game
Okinawa('game-canvas', game);
