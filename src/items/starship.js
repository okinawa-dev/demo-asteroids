import { engine as okinawa } from 'okinawa.js';
import { Item } from 'okinawa.js';
import { Emitter } from 'okinawa.js';

import Shot from './shot';
import Gun from './gun';

export default class Starship extends Item {
  constructor(type) {
    super();

    this.spriteName = type;

    this.size.x = okinawa.sprites.sprites[this.spriteName][3];
    this.size.y = okinawa.sprites.sprites[this.spriteName][4];

    // for collisions
    this.maxRadius = this.getRadius();
    this.collisionRadius = 24;

    this.gunRack = [];

    this.motorEffect = null;
  }

  initialize() {
    super.initialize();

    // Create thrusts (particle speed, magnitude, spread)
    this.motorEffect = new Emitter(1, 1, Math.PI / 5);
    this.motorEffect.setPosition(-20, -1);
    this.motorEffect.setRotation(Math.PI);
    this.attachItem(this.motorEffect);

    // Create guns
    let gun = new Gun();
    gun.setPosition(20, 0);

    this.gunRack.push(gun);
    this.attachItem(gun);

    // Rotate the ship, because in the original image it looks towards the right side
    this.setRotation(-Math.PI / 2);
  }

  step(dt) {
    // Not necessary if there are no animations, but here it is
    // okinawa.sprites.step(dt, this);

    super.step(dt);

    if (okinawa.player.isThrusting === true) {
      this.motorEffect.start();
    } else {
      this.motorEffect.stop();
    }
  }

  draw(ctx) {
    super.draw(ctx);
  }

  collide(what) {
    // Cannot collide with our own shots
    if (what instanceof Shot && what.creator == this) {
      return false;
    }

    // Colliding with any other thing = less speed and lose points
    this.speed.x = this.speed.x / 10;
    this.speed.y = this.speed.y / 10;

    okinawa.game.points.add(-10);

    // should not be removed
    return false;
  }

  shoot() {
    for (let i = 0, len = this.gunRack.length; i < len; i++) {
      this.gunRack[i].shoot(this);
    }

    okinawa.sounds.play('shot');
  }
}
