import engine from 'okinawa.js/src/engine';

export default class Points {
  constructor() {
    this.totalPoints = 0;
    this.gameInitTime = 0;
  }

  initialize() {}

  add(points) {
    this.totalPoints += points;

    let scene = engine.scenes.getCurrentScene();
    let guiItem = scene.gui.get('points');

    if (typeof guiItem != 'undefined') {
      guiItem.setText(
        engine.localization.get('points') + ': ' + this.totalPoints
      );
    }
  }
}
