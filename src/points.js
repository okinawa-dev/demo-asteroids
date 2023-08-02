import { engine as okinawa } from 'okinawa.js';

export default class Points {
  constructor() {
    this.totalPoints = 0;
    this.gameInitTime = 0;
  }

  initialize() {}

  add(points) {
    this.totalPoints += points;

    let scene = okinawa.scenes.getCurrentScene();
    let guiItem = scene.gui.get('points');

    if (typeof guiItem != 'undefined') {
      guiItem.setText(
        okinawa.localization.get('points') + ': ' + this.totalPoints,
      );
    }
  }
}
