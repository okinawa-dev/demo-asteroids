import { engine as okinawa } from 'okinawa.js';

export default class Loader {
  constructor() {}

  // Game.Loader Initialization
  initialize() {
    // okinawa.preloader.addAnimation(anim_name, path,
    // xStart, yStart, width, height, frames, initFrame, speed)

    okinawa.preloader.addSprite({
      name: 'starship',
      path: 'assets/images/ship.png',
      width: 50,
      height: 50,
    });

    // **************
    //  Enemies
    // **************
    okinawa.preloader.addSprite({
      name: 'meteor',
      path: 'assets/images/meteor.png',
      width: 60,
      height: 60,
    });

    // **************
    //  Shots
    // **************
    okinawa.preloader.addSprite({
      name: 'shot',
      path: 'assets/images/shot.png',
      width: 10,
      height: 10,
    });

    // **************
    //  Effects
    // **************
    okinawa.preloader.addAnimation({
      name: 'explosion',
      path: 'assets/images/effect.explosion.png',
      xStart: 0,
      yStart: 0,
      width: 48,
      height: 47,
      frames: 11,
      initFrame: 0,
      speed: 14,
    });

    okinawa.preloader.addSprite({
      name: 'halo',
      path: 'assets/images/effect.halo.png',
      width: 63,
      height: 63,
    });

    // **************
    //  Sounds
    // **************
    okinawa.preloader.addSound({
      name: 'explosion',
      path: 'assets/sounds/fridobeck_explosion.mp3',
    });

    okinawa.preloader.addSound({
      name: 'shot',
      path: 'assets/sounds/halgrimm_shot.mp3',
    });

    // **************
    //  Fonts
    // **************
    okinawa.preloader.addFont({
      name: 'baseFont',
      path: 'assets/fonts/visitor1.ttf',
    });

    // First screen: preloader with progress bar
    okinawa.preloader.addBackground(okinawa.game.commonBackground);
    okinawa.preloader.initialize(); // Usually empty
    okinawa.scenes.addScene(okinawa.preloader, 'preloader');
    okinawa.scenes.setScene(0);

    okinawa.localization.addTextsToStringTable(
      'english',
      this.localization_en()
    );
    okinawa.localization.addTextsToStringTable(
      'spanish',
      this.localization_es()
    );
    okinawa.localization.selectLanguage(okinawa.game.options.defaultLanguage);
  }

  localization_en() {
    return {
      game_name: 'Game',
      press_spacebar: 'Press the spacebar to start',
      touch_screen: 'Touch the screen to continue',
      points: 'Points',
      accumulated: 'Accumulated points',
      totals: 'Total points',
    };
  }

  localization_es() {
    return {
      game_name: 'Juego',
      press_spacebar: 'Pulsa espacio para comenzar',
      touch_screen: 'Toca la pantalla para continuar',
      points: 'Puntos',
      accumulated: 'Puntos acumulados',
      totals: 'Puntos totales',
    };
  }
}
