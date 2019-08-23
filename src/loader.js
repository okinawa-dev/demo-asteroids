import engine from 'okinawa.js/src/engine';

export default class Loader {
  constructor() {}

  // Game.Loader Initialization
  initialize() {
    // engine.preloader.addAnimation(anim_name, path,
    // xStart, yStart, width, height, frames, initFrame, speed)

    engine.preloader.addSprite({
      name: 'starship',
      path: 'assets/images/ship.png',
      width: 50,
      height: 50
    });

    // **************
    //  Enemies
    // **************
    engine.preloader.addSprite({
      name: 'meteor',
      path: 'assets/images/meteor.png',
      width: 60,
      height: 60
    });

    // **************
    //  Shots
    // **************
    engine.preloader.addSprite({
      name: 'shot',
      path: 'assets/images/shot.png',
      width: 10,
      height: 10
    });

    // **************
    //  Effects
    // **************
    engine.preloader.addAnimation({
      name: 'explosion',
      path: 'assets/images/effect.explosion.png',
      xStart: 0,
      yStart: 0,
      width: 48,
      height: 47,
      frames: 11,
      initFrame: 0,
      speed: 14
    });

    engine.preloader.addSprite({
      name: 'halo',
      path: 'assets/images/effect.halo.png',
      width: 63,
      height: 63
    });

    // **************
    //  Sounds
    // **************
    engine.preloader.addSound({
      name: 'explosion',
      path: 'assets/sounds/fridobeck_explosion.mp3'
    });

    engine.preloader.addSound({
      name: 'shot',
      path: 'assets/sounds/halgrimm_shot.mp3'
    });

    // **************
    //  Fonts
    // **************
    engine.preloader.addFont({
      name: 'baseFont',
      path: 'assets/fonts/visitor1.ttf'
    });

    // First screen: preloader with progress bar
    engine.preloader.addBackground(engine.game.commonBackground);
    engine.preloader.initialize(); // Usually empty
    engine.scenes.addScene(engine.preloader, 'preloader');
    engine.scenes.setScene(0);

    engine.localization.addTextsToStringTable(
      'english',
      this.localization_en()
    );
    engine.localization.addTextsToStringTable(
      'spanish',
      this.localization_es()
    );
    engine.localization.selectLanguage(engine.game.options.defaultLanguage);
  }

  localization_en() {
    return {
      game_name: 'Game',
      press_spacebar: 'Press the spacebar to start',
      touch_screen: 'Touch the screen to continue',
      points: 'Points',
      accumulated: 'Accumulated points',
      totals: 'Total points'
    };
  }

  localization_es() {
    return {
      game_name: 'Juego',
      press_spacebar: 'Pulsa espacio para comenzar',
      touch_screen: 'Toca la pantalla para continuar',
      points: 'Puntos',
      accumulated: 'Puntos acumulados',
      totals: 'Puntos totales'
    };
  }
}
