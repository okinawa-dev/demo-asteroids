import { engine as okinawa } from 'okinawa.js';
import { Background } from 'okinawa.js';

export default class StarBackground extends Background {
  constructor() {
    super();

    this.BACKGROUND_SPEED = 8;
    this.BACKGROUND_STARS = 30;

    this.speeds = [];
    this.offsets = [];
    this.parallaxDisplacement = 5;

    this.starfields = [];
  }

  initialize() {
    for (let depth = 0; depth < 3; depth++) {
      // Create a generic background
      this.starfields[depth] = document.createElement('canvas');
      this.starfields[depth].layer = depth;
      this.starfields[depth].width =
        okinawa.core.size.x + (depth + 1) * this.parallaxDisplacement;
      this.starfields[depth].height = okinawa.core.size.y;
      this.starfields[depth].ctx = this.starfields[depth].getContext('2d');

      this.speeds[depth] = this.BACKGROUND_SPEED + (depth + 1) * 7;
      this.offsets[depth] = 0;

      // fill the deepest layer with black background
      if (depth === 0) {
        this.starfields[depth].ctx.fillStyle = '#000';
        this.starfields[depth].ctx.fillRect(
          0,
          0,
          this.starfields[depth].width,
          this.starfields[depth].height,
        );
      }

      this.starfields[depth].ctx.fillStyle = '#FFF';
      this.starfields[depth].ctx.globalAlpha = ((depth + 1) * 2) / 10;

      // Now draw a bunch of random 2 pixel
      // rectangles onto the offscreen canvas
      for (let i = 0; i < this.BACKGROUND_STARS; i++) {
        this.starfields[depth].ctx.fillRect(
          Math.floor(Math.random() * this.starfields[depth].width),
          Math.floor(Math.random() * this.starfields[depth].height),
          depth + 1,
          depth + 1,
        );
      }
    }
  }

  step(dt) {
    // Call inherited function
    // okinawa.Background.prototype.step.call(this, dt);

    for (let depth = 0; depth < 3; depth++) {
      this.offsets[depth] += this.speeds[depth] / dt;
      this.offsets[depth] =
        this.offsets[depth] % this.starfields[depth].height;
    }
  }

  draw(ctx) {
    // Call inherited function
    // okinawa.Background.prototype.draw.call(this, ctx);

    for (let depth = 0; depth < 3; depth++) {
      let intOffset = Math.floor(this.offsets[depth]);
      let remaining = this.starfields[depth].height - intOffset;
      let maxWidth = this.starfields[depth].width;

      // Parallax offset of each layer in the background
      let parallaxOffset;

      // No player or one the three first screens (preloader, menu or initial animation)
      if (
        typeof okinawa.player == 'undefined' ||
        okinawa.player === null ||
        okinawa.currentScene <= 2
      ) {
        parallaxOffset =
          ((depth + 1) *
            this.parallaxDisplacement *
            (okinawa.core.size.x / 2)) /
          okinawa.core.size.x;
      } else {
        let playerDisplacement = okinawa.player.getAvatar().getPosition().x;

        parallaxOffset = Math.round(
          ((depth + 1) * this.parallaxDisplacement * playerDisplacement) /
            okinawa.core.size.x,
        );

        if (parallaxOffset < 0) parallaxOffset = 0;
        else if (parallaxOffset + okinawa.core.size.x > maxWidth)
          parallaxOffset = maxWidth - okinawa.core.size.x;
      }

      // Draw the top half of the starfield
      if (intOffset > 0) {
        ctx.drawImage(
          this.starfields[depth],
          0 + parallaxOffset,
          remaining,
          okinawa.core.size.x,
          intOffset,
          0,
          0,
          okinawa.core.size.x,
          intOffset,
        );
      }

      // Draw the bottom half of the starfield
      if (remaining > 0) {
        ctx.drawImage(
          this.starfields[depth],
          0 + parallaxOffset,
          0,
          okinawa.core.size.x,
          remaining,
          0,
          intOffset,
          okinawa.core.size.x,
          remaining,
        );
      }
    }
  }
}
