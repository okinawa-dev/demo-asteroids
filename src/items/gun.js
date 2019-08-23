import engine from 'okinawa.js/src/engine';
import Item from 'okinawa.js/src/item';
import * as MATH from 'okinawa.js/src/math/math';
import Shot from './shot';

export default class Gun extends Item {
  constructor() {
    super();

    this.size = new MATH.Point(10, 10);
  }
  step(dt) {
    // Not necessary if there are no animations, but here it is
    // engine.sprites.step(dt, this);
    super.step(dt);
  }

  draw(ctx) {
    super.draw(ctx);
  }

  shoot(creator) {
    // var pos = this.getPosition();
    var shot = new Shot(creator, this.getPosition(), this.getRotation());
    engine.scenes.getCurrentScene().attachItem(shot);
  }

  collide() {
    // Guns are not physical objects
    return false;
  }
}
