import { engine as okinawa } from 'okinawa.js';
import { Item } from 'okinawa.js';
import { MATH } from 'okinawa.js';

import Meteor from './meteor';

export default class Shot extends Item {
  constructor(creator, position, angle) {
    super();

    this.spriteName = 'shot';

    // The object which originated the shot (player, npc, etc)
    this.creator = creator;

    this.size.x = okinawa.sprites.sprites[this.spriteName][3];
    this.size.y = okinawa.sprites.sprites[this.spriteName][4];

    this.position = position;

    this.speedMagnitude = 5;

    this.setRotation(angle);

    let direction = MATH.angleToDirectionVector(angle);
    direction = direction.normalize();

    this.speed.x = direction.x * this.speedMagnitude;
    this.speed.y = direction.y * this.speedMagnitude;

    this.maxRadius = this.getRadius();
    this.collisionRadius = 12;
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
    // Cannot collide with other shots
    if (what instanceof Shot) {
      return false;
    }

    // Cannot collide with its own creator
    if (what == this.creator) {
      return false;
    }

    // Win!
    if (what instanceof Meteor) {
      okinawa.game.points.add(50);
    }

    // Should be done only if we are going to return true in this function
    super.collide();

    // true == should be removed
    return true;
  }
}
