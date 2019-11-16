import { engine as okinawa } from 'okinawa.js';
import { Item } from 'okinawa.js';
import { MATH } from 'okinawa.js';

import Shot from './shot';

export default class Gun extends Item {
  constructor() {
    super();

    this.size = new MATH.Point(10, 10);
  }
  step(dt) {
    // Not necessary if there are no animations, but here it is
    // okinawa.sprites.step(dt, this);
    super.step(dt);
  }

  draw(ctx) {
    super.draw(ctx);
  }

  shoot(creator) {
    // var pos = this.getPosition();
    var shot = new Shot(creator, this.getPosition(), this.getRotation());
    okinawa.scenes.getCurrentScene().attachItem(shot);
  }

  collide() {
    // Guns are not physical objects
    return false;
  }
}
