import * as okinawa from 'okinawa.js';
import game from './src/game';

// Create and initialize game object
// parameters:
//   1) canvas DOM element id
//   2) game object, already instantiated
//   3) optional callback function to inform of certain events inside the game
const engine = okinawa.init('game-canvas', game);

export default engine;
