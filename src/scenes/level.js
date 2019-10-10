import engine from 'okinawa.js/src/engine';
import Scene from 'okinawa.js/src/scenes/scene';
import * as GUI from 'okinawa.js/src/gui/gui';
import * as MATH from 'okinawa.js/src/math/math';
import * as ITEMS from '../items/items';

export default class Level extends Scene {
  constructor() {
    super();
    this.timeLastMeteor = 0;
  }

  initialize() {
    super.initialize();

    // Level GUI
    let points = new GUI.GuiText();
    points.setSize(250, 30);
    points.setPosition(
      15 + points.size.x / 2,
      engine.core.size.y - 15 - points.size.y / 2
    ); // left down
    points.setText(engine.localization.get('points') + ': 0');
    this.gui.attachItem(points, 'points');
  }

  activate() {
    this.attachItem(engine.player.getAvatar());

    super.activate();
  }

  draw(ctx) {
    super.draw(ctx);
  }

  step(dt) {
    super.step(dt);

    this.checkBoundaries();
    this.checkCollisions();

    let now = new Date().getTime();

    if (now - this.timeLastMeteor > engine.options.meteorPeriodicity) {
      this.timeLastMeteor = now;

      let meteor = new ITEMS.Meteor(1, 1.5); // (size, speed)
      let side = Math.floor(Math.random() * 4);
      let angle = Math.random() * Math.PI; // 180 degrees

      switch (side) {
        case 0: // up
          meteor.position.x = Math.random() * engine.core.size.x;
          meteor.position.y = 1 - meteor.size.y;
          break;

        case 1: // right
          meteor.position.x = 1 - meteor.size.x;
          meteor.position.y = Math.random() * engine.core.size.y;
          angle += Math.PI / 2;
          break;

        case 2: // down
          meteor.position.x = Math.random() * engine.core.size.x;
          meteor.position.y = engine.core.size.y + meteor.size.y - 1;
          angle -= Math.PI;
          break;

        default:
        case 3: // left
          meteor.position.x = engine.core.size.x + meteor.size.x - 1;
          meteor.position.y = Math.random() * engine.core.size.y;
          angle -= Math.PI / 2;
          break;
      }

      let direction = MATH.angleToDirectionVector(angle);
      direction = direction.normalize();

      meteor.speed.x = direction.x * meteor.linearSpeed;
      meteor.speed.y = direction.y * meteor.linearSpeed;

      this.attachItem(meteor);
    }
  }

  checkBoundaries() {
    // Reset the list of removed objects
    this._resetRemoved();

    let item;

    for (let i = 0; i < this.getAttachedItems().length; i++) {
      item = this.getAttachedItems()[i];

      // Item outside the screen -> remove
      if (
        item.position.x > engine.core.size.x + item.size.x ||
        item.position.x < 0 - item.size.x ||
        item.position.y < 0 - item.size.y ||
        item.position.y > engine.core.size.y + item.size.y
      ) {
        this.detachItem(item);
      }
    }

    // Remove any objects marked for removal
    this._finalizeRemoved();
  }

  checkCollisions() {
    // Reset the list of removed objects
    this._resetRemoved();

    let a, b;

    for (let i = 0; i < this.getAttachedItems().length; i++) {
      a = this.getAttachedItems()[i];

      // Objects without collisionRadius do not collide
      if (a.collisionRadius === 0) {
        continue;
      }

      for (let j = i + 1; j < this.getAttachedItems().length; j++) {
        b = this.getAttachedItems()[j];

        // Objects without collisionRadius do not collide
        if (b.collisionRadius === 0) {
          continue;
        }

        if (
          Math.abs(a.position.x - b.position.x) >
          a.size.x / 2 + b.size.x / 2
        ) {
          continue;
        }

        if (
          Math.abs(a.position.y - b.position.y) >
          a.size.y / 2 + b.size.y / 2
        ) {
          continue;
        }

        if (
          MATH.pointDistance(a.position, b.position) <=
          a.collisionRadius + b.collisionRadius
        ) {
          // Collide and remove each object
          if (a.collide(b) === true) this.detachItem(a);

          if (b.collide(a) === true) this.detachItem(b);
        }
      }
    }

    // Remove any objects marked for removal
    this._finalizeRemoved();
  }
}
