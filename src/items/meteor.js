import { engine as okinawa } from 'okinawa.js';
import { Item } from 'okinawa.js';

import Shot from './shot';

export default class Meteor extends Item {
  constructor(size, speed) {
    super();

    this.spriteName = 'meteor';

    this.size.x = okinawa.sprites.sprites[this.spriteName][3];
    this.size.y = okinawa.sprites.sprites[this.spriteName][4];

    this.linearSpeed = speed;

    this.vRot = Math.PI / 600;

    this.scaling.x = size;
    this.scaling.y = size;

    this.maxRadius = this.getRadius();
    this.collisionRadius = 29;
  }

  step(dt) {
    super.step(dt);

    // Not necessary if there are no animations, but here it is
    // okinawa.sprites.step(dt, this);
  }

  draw(ctx) {
    super.draw(ctx);
  }

  collide(what) {
    super.collide();

    let newVx = what.speed.x;
    let newVy = what.speed.y;

    // The shots are fast and the effect is awkward... better not so much
    if (what instanceof Shot) {
      newVx = what.speed.x / 10;
      newVy = what.speed.y / 10;
    }

    let effect = okinawa.effects.addEffect(
      'halo',
      this.position.x,
      this.position.y,
      this.speed.x + newVx,
      this.speed.y + newVy,
    );
    effect.initialScaling = 2;
    effect.finalScaling = 3;
    effect.lifeTime = 20;
    effect.vRot = Math.PI / 100;
    effect.transparencyMethod = 2; // disappearing

    for (let i = 0; i < 10; i++) {
      effect = okinawa.effects.addEffect(
        'explosion',
        this.position.x + (Math.random() - 0.5) * 40,
        this.position.y + (Math.random() - 0.5) * 40,
        this.speed.x + (Math.random() - 0.5),
        this.speed.y + (Math.random() - 0.5),
      );
      effect.scaling.x = Math.abs(Math.random() - 0.1);
      effect.scaling.y = effect.scaling.x;
      effect.vRot = ((Math.random() - 0.5) * Math.PI) / 50;
      effect.lifeTime = 100;
      effect.isAnimated = true;
      effect.transparencyMethod = Math.floor(Math.random() * 3);
    }

    okinawa.sounds.play('explosion');

    // true == should be removed
    return true;
  }
}
