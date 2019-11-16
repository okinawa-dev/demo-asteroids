import { engine as okinawa } from 'okinawa.js';
import { Scene } from 'okinawa.js';
import { INPUT } from 'okinawa.js';

export default class InitialScene extends Scene {
  constructor() {
    super();
  }

  // Will be called after creation of this object
  initialize() {
    super.initialize();

    // This object will be listening to the spacebar key
    // When pressed, our eventKeyPressed functions will be called
    this.input.addKeyListener(this, 'eventKeyPressed', [INPUT.KEYS.SPACEBAR]);
  }

  // Will be called when the scene starts being playable
  activate() {
    let avatar = okinawa.player.getAvatar();

    // Position the player avatar in the proper place
    avatar.setPosition(okinawa.core.size.x / 2, okinawa.core.size.y / 2);

    // Attach the player avatar to this scene
    this.attachItem(avatar);

    super.activate();
  }

  draw(ctx) {
    super.draw(ctx);
  }

  step(dt) {
    super.step(dt);
  }

  eventKeyPressed(keyCode) {
    if (keyCode == INPUT.KEYS.SPACEBAR) {
      okinawa.scenes.advanceScene();
    }
  }
}
