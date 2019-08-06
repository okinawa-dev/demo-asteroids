export default class Options {
  constructor() {
    // Possible languages= 'spanish', 'english'
    this.defaultLanguage = 'english';

    this.debugInConsole = true;

    // Each meteorPeriodicity milliseconds a new meteor appears on the screen
    this.meteorPeriodicity = 500; // milliseconds
    this.shotPeriodicity = 200;
  }
}
