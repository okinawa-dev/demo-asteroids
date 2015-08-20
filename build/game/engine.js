// engine.js built on 2015-06-01-19-21-30

function Engine()
{
  this.options      = null;
  this.logs         = null;
  this.core         = null;
  this.math         = null;
  this.device       = null;
  this.effects      = null;
  this.particles    = null;
  this.sprites      = null;
  this.sounds       = null;
  this.clock        = null;
  this.localization = null;
  this.input        = null;
  this.controls     = null;
  this.gui          = null;
  this.scenes       = null;
  this.preloader    = null;
  this.game         = null;

  this.externalCallback = null;
}

Engine.prototype.initialize = function(canvasElementId, gameClassName, callbackFunction)
{
  this.options      = new Engine.Options();
  this.logs         = new Engine.Logs();
  this.core         = new Engine.Core();
  this.math         = new Engine.MATH.Math();
  this.device       = new Engine.Device();
  this.effects      = new Engine.Effects();
  this.particles    = new Engine.ParticleCollection();
  this.sprites      = new Engine.Sprites();
  this.sounds       = new Engine.Sounds();
  this.clock        = new Engine.Clock();
  this.localization = new Engine.Localization();
  this.input        = new Engine.INPUT.Controller();
  this.gui          = new Engine.GUI.GuiElement();
  this.scenes       = new Engine.SceneCollection();
  this.preloader    = new Engine.Preloader();

  engine.logs.log('Engine.initialize', 'Initializing starts...');

  try {
    this.game = new window[gameClassName]();
  }
  catch(err) {
    engine.logs.log('Engine.initialize', 'Error instantiating game class');
    return;
  }

  if (callbackFunction != null)
    this.externalCallback = callbackFunction;

  this.core.initialize(canvasElementId);
  this.math.initialize();
  this.device.initialize();
  this.effects.initialize();
  this.particles.initialize();
  this.sprites.initialize();
  this.sounds.initialize();

  this.clock.initialize();
  this.clock.suscribeOneSecond('testFPS', function() { 
        if (engine.options.showFps)
          engine.gui.get('console').addText('fps', engine.core.fpsPassed + ' fps');
        engine.core.fpsPassed = 0;
      });

  this.input.initialize();
  this.localization.initialize();

  // TODO maybe remove this from global engine someday
  // Global GUI
  var console = new Engine.GUI.GuiConsole();
  console.setSize(170, 30);
  console.setPosition(15 + console.size.x / 2, 15 + console.size.y / 2); // left down 
  console.order = Engine.GUI.ORDENATION.UP;

  this.gui.initialize();
  this.gui.attachItem(console, 'console');

  this.scenes.initialize();

  this.preloader.playable = false; // Just in case
  this.preloader.initialize();
  this.game.initialize();
}

Engine.prototype.external = function(eventType, id, message)
{
  if (this.externalCallback != null)
  {
    setTimeout(function() { 
      try {
        engine.externalCallback(eventType, id, message);
      } 
      catch (err) {
        engine.logs.log('Engine.external', 'Error with external callback with event ' + eventType + ' ' + id);
      }
    }, 1);

  }
}

Engine.Options = function()
{
  // Use requestAnimationFrame instead of SetTimeOut in the main game loop
  this.useAnimationFrame = false;

  // Draw smooth particles instead of pixel rectangles
  this.useSmoothParticles = false;

  // drawHelpers:
  this.drawBoundingBoxes = false;
  this.drawMaxRadius = false;
  this.drawCollisionRadius = false;
  this.drawOrigins = false;
  this.drawCenters = false;
  this.drawTrackers = false;
  this.drawDirectionVectors = false;

  // screenInfos
  this.showFps = false; // frames per second
  this.showStatistics = false; // num items, particles, effects, etc
  this.showResizeMessage = true; // show an announcement when resize happens

  // Console inform
  this.outputPressedKeys = false;
  this.outputPressedCombos = false;
  this.outputClicks = false;

  // Show LogHandler info in the navigator console
  this.debugInConsole = false;
  // Redirect console info to a html element
  // Useful for mobile debug
  this.debugInHtml = false;
  this.debugFunctionNames = false;

  this.allowPause = true; // allow pausing the game pressing the P key
  this.allowHalt = false; // allow halting the engine pressing the escape key
  this.allowFForFps = true; // allow pressing F to show FPS on screen
  this.pauseOnWindowChange = false;
  this.avoidLeavingPage = false;
  this.preventDefaultKeyStrokes = true;

  // Show the language screen?
  this.useLanguageScreen = false;
  this.defaultLanguage = 'english';

  // prepend this url to the url/path of the assets in the preloader 
  // only used if != null
  // should start with the protocol, i.e. 'http://whatever.com/assets/'
  // if null, window.location will be used
  this.assetsURLPrefix = null;
}

Engine.Options.prototype.addOptions = function(opts) 
{    
  // Merge engine options and local game options in a single object
  for (var attr in opts) { 
    this[attr] = opts[attr]; 
  }
}

Engine.Core = function() 
{

  this.FRAMES_PER_SECOND = 60;
  this.TIME_PER_FRAME = 1000/this.FRAMES_PER_SECOND; // milliseconds

  this.paused = false;
  this.halted = false;
  
  // Drawing state
  this.canvas = null;
  this.ctx = null;

  this.size = new Engine.MATH.Point(500, 500);

  // Should use requestAnimationFrame or not
  this.useAnimationFrame = false;
  this.timeLastRender = new Date().getTime(); // Time since last render
  this.timeGameStart  = new Date().getTime(); // Init time

  // To count frames per second
  this.fpsPassed = 0;           // frames rendered since last time
  this.fps = this.FRAMES_PER_SECOND; // updated only each second
}

// Game Initialization
Engine.Core.prototype.initialize = function(canvasElementId) 
{
  engine.logs.log('Engine.Core.initialize', 'Initializing engine core object');

  this.canvas = document.getElementById(canvasElementId);
  this.size.x = this.canvas.width;
  this.size.y = this.canvas.height;
  this.timeLastRender = new Date().getMilliseconds();

  this.ctx = this.canvas.getContext && this.canvas.getContext('2d');
  
  if (!this.ctx)
  { 
      engine.logs.log('Engine.Core.initialize', 'Old browser, unable to create canvas context');
      alert('Unable to get canvas context. Old browser?'); 
      return null;
  }

  engine.logs.log('Engine.Core.initialize', 'UserAgent: ' + engine.device.getUserAgent());

  // Sometimes this is slower, I don't know why, and that makes me angry :(
  if ((engine.options.useAnimationFrame == false) || (window.requestAnimationFrame == null))
  {
    this.useAnimationFrame = false;
    engine.logs.log('Engine.Core.initialize', 'NOT using requestAnimationFrame');
  }
  else
  {
    this.useAnimationFrame = true;
    engine.logs.log('Engine.Core.initialize', 'Modern browser, using requestAnimationFrame');
  }

  // Start main loop
  this.loop(); 

  return 1;
}

// Game Initialization
Engine.Core.prototype.activate = function() 
{
  engine.logs.log('Engine.activate', 'Starting engine');

  engine.game.activate();
  engine.gui.activate();

  engine.scenes.advanceScene();
}

Engine.Core.prototype.eventKeyPressed = function(keyCode)
{
  // engine.logs.log('Engine.eventKeyPressed', 'Key Pressed: ' + keyCode);

  if ((keyCode == Engine.INPUT.KEYS.P) && (engine.options.allowPause == true))
  {
    if (this.paused)
      this.unpauseGame();
    else if (engine.scenes.getCurrentScene().playable != false)
      this.pauseGame();
  }
  else if ((keyCode == Engine.INPUT.KEYS.ESC) && (engine.options.allowHalt == true))
  {
    if (this.halted)
    {
      this.halted = false;
      engine.logs.log('Engine.eventKeyPressed', 'Engine un-halted');
      // To avoid a jump in animations and movements, as timeLastRender haven has not been 
      // updated since last step()
      this.timeLastRender = new Date().getTime();
      this.loop();
    }
    else
    {
      this.halted = true;
      engine.logs.log('Engine.eventKeyPressed', 'Engine halted');
      engine.gui.get('console').addText('halt', 'Engine halted');
      engine.gui.draw(this.ctx); // Force draw before halting the loop
    }
  }
  else if ((keyCode == Engine.INPUT.KEYS.F) && (engine.options.allowFForFps == true))
  {
    if (engine.options.showFps == true)
      engine.options.showFps = false;
    else
      engine.options.showFps = true;
  }
}

// Game Loop
Engine.Core.prototype.loop = function() 
{ 
  var now = new Date().getTime();
  var dt = now - this.timeLastRender;

  if (dt >= engine.core.TIME_PER_FRAME)
  {
    this.timeLastRender = now;
    var sc = engine.scenes.getCurrentScene();

    if (this.halted)
      return;

    // Only the current scene
    if (sc && (sc.isCurrent == true))
    {
      // Only advance game logic if game is not paused
      if (this.paused == false)
      {
        sc.step(dt);
        if (engine.game != undefined)
          engine.game.step(dt);
        engine.effects.step(dt);
        engine.particles.step(dt);
      }

      engine.clock.step(dt);
      engine.gui.step(dt);
      
      // Render current level
      sc.draw(this.ctx);

      engine.effects.draw(this.ctx);
      engine.particles.draw(this.ctx);

      // FPS related stuff
      this.fpsPassed++;

      if (engine.options.showStatistics == true)
      {
        if (sc.getAttachedItems().length > 0)
          engine.gui.get('console').addText('numItems', sc.getAttachedItems().length + ' ' + engine.localization.get('items'));
        if (engine.effects.effects.length > 0)
          engine.gui.get('console').addText('numEffects', engine.effects.effects.length + ' ' + engine.localization.get('effects'));  
        if (engine.particles.particles.length > 0)
          engine.gui.get('console').addText('numParticles', engine.particles.particles.length + ' ' + engine.localization.get('particles'));
      }

      engine.gui.draw(this.ctx);
    }

    // If the loop has been executed, wait a full TIME_PER_FRAME until next loop step
    dt = 0;
  }

  if (this.useAnimationFrame == true)
    window.requestAnimationFrame(function() { engine.core.loop(); });
  else
  {
    setTimeout(function() { engine.core.loop(); }, engine.core.TIME_PER_FRAME - dt);
  }
}

Engine.Core.prototype.clearScreen = function() 
{ 
  this.ctx.clearRect(0, 0, this.size.x, this.size.y);
}

Engine.Core.prototype.pauseGame = function() 
{ 
  if (engine.options.allowPause == false)
    return;

  this.paused = true; 

  if (engine.gui.get('pause') == null)
  {
    var text = new Engine.GUI.GuiText(engine.localization.get('paused'), 500, 30);
    text.setFontColor('#FF2222');
    text.setAlign(Engine.GUI.ALIGN.CENTER);
    text.setPosition(this.size.x/2, this.size.y/2 + 100);

    engine.gui.attachItem(text, 'pause');
  }
}

Engine.Core.prototype.unpauseGame = function() 
{ 
  if (engine.options.allowPause == false)
    return;

  this.paused = false; 

  engine.gui.detachItem('pause');
}


// Global addEvent to fix old IE way of attaching events
function addEvent(evnt, elem, func) 
{
  if (elem.addEventListener)  
    // W3C DOM
    elem.addEventListener(evnt, func, false);
  else if (elem.attachEvent) 
    // IE DOM
    elem.attachEvent('on' + evnt, func);
    // If we want to expose the currentTarget (non-existent in older IE)
    // elem.attachEvent('on' + evnt, function(a) { a.currentTarget = elem; func(a); });
  else 
    // Not much to do
    elem['on' + evnt] = func;
}

// get protocol and hostname
function getProtocolAndHost()
{
  var result = '';

  if (window.location.protocol != 'file:')
    result += window.location.protocol + '//';

  if (window.location.host != '')
    result += window.location.host + '/';

  return result;
}

// Polyfill for the Array.isArray function
Array.isArray || (Array.isArray = function ( a ) {
    return'' + a !== a && {}.toString.call( a ) == '[object Array]'
});

// Polyfill for the Object.create function
Object.create || (Object.create = function ( o ) {
    if (arguments.length > 1) {
        throw new Error('Object.create implementation only accepts the first parameter.');
    }
    function F() {}
    F.prototype = o;
    return new F();
});

// Polyfill for the JS Object.keys function.
// From https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Object/keys
if (!Object.keys) {
  Object.keys = (function () {
    'use strict';
    var hasOwnProperty = Object.prototype.hasOwnProperty,
        hasDontEnumBug = !({toString: null}).propertyIsEnumerable('toString'),
        dontEnums = [
          'toString',
          'toLocaleString',
          'valueOf',
          'hasOwnProperty',
          'isPrototypeOf',
          'propertyIsEnumerable',
          'constructor'
        ],
        dontEnumsLength = dontEnums.length;

    return function (obj) {
      if (typeof obj !== 'object' && (typeof obj !== 'function' || obj === null)) {
        throw new TypeError('Object.keys called on non-object');
      }

      var result = [], prop, i;

      for (prop in obj) {
        if (hasOwnProperty.call(obj, prop)) {
          result.push(prop);
        }
      }

      if (hasDontEnumBug) {
        for (i = 0; i < dontEnumsLength; i++) {
          if (hasOwnProperty.call(obj, dontEnums[i])) {
            result.push(dontEnums[i]);
          }
        }
      }
      return result;
    };
  }());
}

function detectIE()
{
  var userAgent = navigator.userAgent.toLowerCase();

  if (/msie/.test(userAgent))
    return parseFloat((userAgent.match(/.*(?:rv|ie)[\/: ](.+?)([ \);]|$)/) || [])[1]);

  if (navigator.appVersion.indexOf('Trident/') > 0)
    return 11;
  
  return -1;
}


Engine.MATH = {};

// Object to store mathematical and graphical auxiliar 
// functions that have no other place to be ;)

Engine.MATH.Math = function()
{
}

Engine.MATH.Math.prototype.initialize = function()
{
}

Engine.MATH.Math.prototype.activate = function()
{
}

// Distance between two Engine.MATH.Point objects
Engine.MATH.Math.prototype.pointDistance = function(origin, destination)
{
  if ((destination.x == undefined) || (destination.y == undefined) || 
      (origin.x == undefined) || (origin.y == undefined))
    return -1;

  return Math.sqrt(Math.pow(destination.x - origin.x, 2) + Math.pow(destination.y - origin.y, 2));
}


Engine.MATH.Math.prototype.angleToDirectionVector = function(angle)
{
  var result = new Engine.MATH.Point();

  result.x = Math.cos(angle);
  result.y = Math.sin(angle);

  return result;
}

Engine.MATH.Point = function(a, b) 
{
  if (undefined == a)
    this.x = 0;
  else 
    this.x = a;

  if (undefined == b)
    this.y = 0;
  else 
    this.y = b;
}

Engine.MATH.Point.prototype.magnitude = function()
{
  return Math.sqrt(this.x * this.x + this.y * this.y);
}

Engine.MATH.Point.prototype.normalize = function()
{
  var magnitude = this.magnitude();
  return new Engine.MATH.Point(this.x / magnitude, this.y / magnitude);
}

Engine.MATH.Point.prototype.equals = function(p)
{
  if (p instanceof Engine.MATH.Point == false)
    return false;
  
  return ( (this.x == p.x) && (this.y == p.y) );
}

// Rotation matrix = 
//   | cos(r)  -sin(r) |
//   | sin(r)   cos(r) |

// Inner representation for fast access
//   | a b |
//   | c d |

Engine.MATH.Rotation = function() 
{
  this.angle = 0;

  // Matrix for zero degrees rotation
  this.a = 1;
  this.b = 0;
  this.c = 0;
  this.d = 1;
}

Engine.MATH.Rotation.prototype.getAngle = function()
{
  return this.angle;
}

Engine.MATH.Rotation.prototype.rotate = function(dRot)
{
  this.update(this.angle + dRot);
}

Engine.MATH.Rotation.prototype.update = function(newAngle)
{
  this.angle = newAngle;

  this.a = Math.cos(this.angle);
  this.b = -Math.sin(this.angle);
  this.c = Math.sin(this.angle);
  this.d = Math.cos(this.angle);
}

Engine.MATH.Rotation.prototype.transformPosition = function(point)
{
  return new Engine.MATH.Point(point.x * this.a + point.y * this.b, point.x * this.c + point.y * this.d);
}

// Object to store screen, graphical, and browser auxiliar 
// functions that have no other place to be ;)

Engine.Device = function()
{
  this.canvasGlobalOffset = new Engine.MATH.Point();
  this.isTouchDevice = false;

  this.isResizing = false;
  this._clearTimeOutId = null;
}

Engine.Device.prototype.initialize = function()
{
  this.isTouchDevice = this.detectTouchDevice();

  if (this.isTouchDevice)
    engine.logs.log('Engine.Initialize', 'Touch device detected');
  else
    engine.logs.log('Engine.Initialize', 'Touch device NOT detected');

  // Get the offset of the DOM element used to capture the touch events
  this.canvasGlobalOffset = engine.device.getGlobalOffset(engine.core.canvas);

  addEvent('resize', window, function(event) {

    engine.device.isResizing = true;

    if (engine.options.showResizeMessage == true)
      engine.gui.get('console').addText('resize', 'Resizing!'); 
    // engine.logs.log('Engine.INPUT.Controller.onResize', 'Window resized');        

    // Recalculate if window is resized
    engine.device.canvasGlobalOffset = engine.device.getGlobalOffset(engine.core.canvas);

    clearTimeout(this._clearTimeOutId);
    this._clearTimeOutId = setTimeout(engine.device.doneResizing, 1000);

  });

  if (engine.options.avoidLeavingPage == true)
    this.avoidLeavingPage();
}

Engine.Device.prototype.doneResizing = function()
{
  engine.device.isResizing = false;

  if (engine.options.showResizeMessage == true)
    engine.gui.get('console').addText('resize', 'Resizing done');   
}

Engine.Device.prototype.activate = function()
{
}

Engine.Device.prototype.getGlobalScroll = function()
{
  var pos = new Engine.MATH.Point(0, 0);

  // All browsers except IE < 9
  if (window.pageYOffset)
  {
    pos.x = window.pageXOffset;
    pos.y = window.pageYOffset;
  }
  else
  {
    // Try to fall back if IE < 9, don't know for sure if this is gonna
    // work fine
    var element = document.getElementsByTagName('html')[0];

    if (element.scrollTop)
    {
      pos.x = element.scrollLeft;
      pos.y = element.scrollTop;
    }
  }

  return pos;
}

// Distance in pixels of a DOM element from the origin of the navigator
Engine.Device.prototype.getGlobalOffset = function(element)
{
  var pos = new Engine.MATH.Point(0, 0);
  pos.x = element.offsetLeft;
  pos.y = element.offsetTop;

  while (element = element.offsetParent)
  {
    pos.x += element.offsetLeft;
    pos.y += element.offsetTop;    
  }

  return pos;
}

Engine.Device.prototype.detectTouchDevice = function()
{
  if (('ontouchstart' in window) || window.DocumentTouch && (document instanceof DocumentTouch))
    return true;
  return false;
}

Engine.Device.prototype.getUserAgent = function()
{
  return navigator.userAgent;
}

Engine.Device.prototype.avoidLeavingPage = function()
{
  window.onbeforeunload = function() {
    return '';
  }
}

// Tricks got from stackoverflow
// http://stackoverflow.com/questions/3665115/create-a-file-in-memory-for-user-to-download-not-through-server
Engine.Device.prototype.createAndDownloadFile = function(filename, text)
{
  // IE
  if (window.navigator.msSaveOrOpenBlob) 
  {
    var blob = new Blob([text],{
        type: 'text/csv;charset=utf-8;',
    });

    window.navigator.msSaveOrOpenBlob(blob, filename)
  }
  // Other browsers
  else
  {
    var link = document.createElement('a');

    link.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    link.setAttribute('download', filename);    

    // In Firefox the element has to be placed inside the DOM
    document.body.appendChild(link)
    link.click();  
    document.body.removeChild(link)  
  }
}

// Duplicated in utils.js, as a global function, just for really, really old IEs
Engine.Device.prototype.detectIE = function()
{
  var userAgent = navigator.userAgent.toLowerCase();

  if (/msie/.test(userAgent))
    return parseFloat((userAgent.match(/.*(?:rv|ie)[\/: ](.+?)([ \);]|$)/) || [])[1]);

  if (navigator.appVersion.indexOf('Trident/') > 0)
    return 11;

  return -1;
}

Engine.Device.prototype.isIE = function()
{
  // First detect IE 6-10, second detect IE 11
  if (navigator.userAgent.indexOf('MSIE') !== -1 || navigator.appVersion.indexOf('Trident/') > 0)
    return true;

  return false;
}



Engine.Logs = function()
{
}

Engine.Logs.prototype.log = function (fileName, message, object) 
{
  var result = [];

  if (engine.options.debugInConsole == false)
    return;

  if (engine.options.debugFunctionNames == true)
    result.push(fileName);

  if (Array.isArray(message))
    result.push(message.join(' '));
  else
    result.push(message);
  if (object)
    result.push(object);

  if ((engine.options.debugInHtml == true) && (engine.core.canvas != undefined))
  {
    var e = document.createElement('div');
    e.innerHTML = result;
    engine.core.canvas.parentNode.appendChild(e);
  }
  // Old IE, console is not initialized by default
  else if (typeof window.console === "undefined" || typeof window.console.log === "undefined")
  {
    // Do nothing?
  }
  else
  {
    window.console.log(result);
  }
}

// Init namespace
Engine.INPUT = {};

// Keyboard key codes
Engine.INPUT.KEYS = {

  // Engine Control
  ANY_KEY: -1,

  // Utils
  INSERT: 45,
  DELETE: 46,
  SPACEBAR: 32,
  ESC: 27,
  BACKSPACE: 8,
  TAB: 9,
  ENTER: 13,
  SHIFT: 16,
  CTRL: 17,
  ALT: 18,
  PAUSE: 19,
  CAPS_LOCK: 20,
  PAGE_UP: 33,
  PAGE_DOWN: 34,
  END: 35,
  HOME: 36,

  // Cursors
  LEFT: 37,
  UP: 38,
  RIGHT: 39,
  DOWN: 40,

  // Letters
  A: 65,
  B: 66,
  C: 67,
  D: 68,
  E: 69,
  F: 70,
  G: 71,
  H: 72,
  I: 73,
  J: 74,
  K: 75,
  L: 76,
  M: 77,
  N: 78,
  O: 79,
  P: 80,
  Q: 81,
  R: 82,
  S: 83,
  T: 84,
  U: 85,
  V: 86,
  W: 87,
  X: 88,
  Y: 89,
  Z: 90,

  // Numbers
  ZERO: 48,
  ONE: 49,
  TWO: 50,
  THREE: 51,
  FOUR: 52,
  FIVE: 53,
  SIX: 54,
  SEVEN: 55,
  EIGHT: 56,
  NINE: 57,

  // Others
  LEFT_WINDOW_KEY: 91,
  RIGHT_WINDOW_KEY : 92,
  SELECT_KEY: 93,
  NUMPAD_0: 96,
  NUMPAD_1: 97,
  NUMPAD_2: 98,
  NUMPAD_3: 99,
  NUMPAD_4: 100,
  NUMPAD_5: 101,
  NUMPAD_6: 102,
  NUMPAD_7: 103,
  NUMPAD_8: 104,
  NUMPAD_9: 105,
  MULTIPLY: 106,
  ADD: 107,
  SUBTRACT: 109,
  DECIMAL_POINT: 110,
  DIVIDE: 111,
  F1 : 112,
  F2 : 113,
  F3 : 114,
  F4 : 115,
  F5 : 116,
  F6 : 117,
  F7 : 118,
  F8 : 119,
  F9 : 120,
  F10: 121,
  F11: 122,
  F12: 123,
  NUM_LOCK: 144,
  SCROLL_LOCK: 145,
  SEMI_COLON: 186,
  EQUAL_SIGN: 187,
  COMMA: 188,
  DASH: 189,
  PERIOD: 190,
  FORWARD_SLASH: 191,
  GRAVE_ACCENT: 192,
  OPEN_BRACKET: 219,
  BACK_SLASH: 220,
  CLOSE_BRAKET: 221,
  SINGLE_QUOTE: 222

};

// Types of combos
Engine.INPUT.COMBO_TYPES = {
  CONSECUTIVE: 1,   // One key after the other
  SIMULTANEOUS: 2  // Keys pressed at the same time
};


Engine.INPUT.Controller = function()
{
  // Same as KEYBOARD, but with code:key ordering
  // Built in the initialize method
  this.inverseKeyboard = {};

  // Object with the keys pressed == true
  this.pressed = {};                           // { keyCode : true/false }
  this.lastPressed = [];                       // list of last pressed key codes
  this.lastPressedTime = new Date().getTime(); // Time when a key was pressed last time

  this.currentInputController = null;
}

Engine.INPUT.Controller.prototype.initialize = function() 
{
  // Build the inverseKeyboard
  for (var prop in Engine.INPUT.KEYS)
    if (Engine.INPUT.KEYS.hasOwnProperty(prop)) 
      this.inverseKeyboard[Engine.INPUT.KEYS[prop]] = prop;

  // Using document instead of window in the key-press events 
  // because old IEs did not implement them in the window object

  addEvent('keyup', document, function(event) { 
    engine.input.onKeyup(event); 
    // event.preventDefault();
  });

  addEvent('keydown', document, function(event) { 
    engine.input.onKeydown(event); 
    if (engine.options.preventDefaultKeyStrokes == true)
      event.preventDefault();
  });

  addEvent('blur', window, function(event) { 
    engine.input.resetKeys(); 
    // Pause the game when we change tab or window
    if (engine.options.pauseOnWindowChange) {
      engine.pauseGame();
    }
    // event.preventDefault();
  });

  // Capture touch events
  addEvent('touchstart', engine.core.canvas, function(event) {
    
    engine.input.onClickStart(event.touches[0].clientX, event.touches[0].clientY);

    // So touch would work in Android browser
    if ( navigator.userAgent.match(/Android/i) )
        event.preventDefault();
    return false;
  });

  addEvent('touchmove', engine.core.canvas, function(event) {
    event.preventDefault();
    return false;
  });

  addEvent('touchend', engine.core.canvas, function(event) {
    event.preventDefault();
    return false;
  });

  // Capture click events
  addEvent('click', engine.core.canvas, function(event) {

    engine.input.onClickStart(event.clientX, event.clientY);
    event.preventDefault();    
    return false;
  });

  addEvent('mousedown', engine.core.canvas, function(event) {
    event.preventDefault();    
    return false;
  });

  // To avoid selections
  // document.onselectstart = function() { return false; }
}

Engine.INPUT.Controller.prototype.activate = function()
{
}

Engine.INPUT.Controller.prototype.getCurrentInputcontroller = function() 
{ 
  return this.currentInputController; 
}

Engine.INPUT.Controller.prototype.setCurrentInputController = function(controller)
{
  this.currentInputController = controller;
}

Engine.INPUT.Controller.prototype.isKeyPressed = function(keyCode) 
{
  return this.pressed[keyCode];
}

Engine.INPUT.Controller.prototype.onKeydown = function(event) 
{
  // Avoid multiple events when holding keys
  if (this.pressed[event.keyCode] == true)
    return;

  // The key is pressed
  this.pressed[event.keyCode] = true;

  // Add to the array of last pressed keys, and update times
  this.addLastPressed(event.keyCode);
}

Engine.INPUT.Controller.prototype.onKeyup = function(event) 
{
  delete this.pressed[event.keyCode];
}

Engine.INPUT.Controller.prototype.onClickStart = function(x, y)
{
  // If the screen is being modified, ignore touch events for safety
  if (engine.device.isResizing == true)
    return;

  var position = new Engine.MATH.Point(x, y);
  // var position = new Engine.MATH.Point(event.changedTouches[0].pageX, event.changedTouches[0].pageY); // ontouchend

  // Apply correction if the scroll has moved
  var scroll = engine.device.getGlobalScroll();

  position.x += scroll.x;
  position.y += scroll.y;

  // engine.logs.log('Engine.INPUT.Controller.onTouchStart', 'Touch in position: ' +position.x+' '+position.y);        

  if ((position.x < engine.device.canvasGlobalOffset.x) || (position.y < engine.device.canvasGlobalOffset.y) || 
      (position.x > engine.device.canvasGlobalOffset.x + engine.core.canvas.width) ||
      (position.y > engine.device.canvasGlobalOffset.y + engine.core.canvas.height))
  {
    // engine.logs.log('Engine.INPUT.Controller.onTouchStart', 'Touch outside the canvas, ignoring');   
    // engine.gui.get('console').addText('touch', 'Pos ' + position.x + ' ' + position.y); 
  }
  else
  {
    position.x -= engine.device.canvasGlobalOffset.x;
    position.y -= engine.device.canvasGlobalOffset.y;

    // engine.logs.log('Engine.INPUT.Controller.onTouchStart', 'Touch inside the canvas, got it!');
    // engine.gui.get('console').addText('touch', 'Pos ' + position.x + ' ' + position.y); 

    this.currentInputController.detectClick(position);
  }
}

Engine.INPUT.Controller.prototype.resetKeys = function() 
{
  for(var key in this.pressed)
    this.pressed[key] = false;
}

Engine.INPUT.Controller.prototype.addLastPressed = function(keyCode)
{  
  // Inform to listening objects in the current scene
  this.currentInputController.informKeyPressed(keyCode);

  var now = new Date().getTime()

  // If a second has passed, clear the pressed keys list
  if (now - this.lastPressedTime > 1000)
    this.lastPressed = [];

  this.lastPressedTime = now;
  this.lastPressed.push(keyCode);

  // Only save last 10 elements 
  if (this.lastPressed.length > 10)
    this.lastPressed.shift();

  if (engine.options.outputPressedKeys == true)
    engine.logs.log('Input.addLastPressed', 'Pressed key: ' + this.inverseKeyboard[keyCode], now);

  // Inform combo performed to currentInputController if needed
  var whichCombo = this.currentInputController.detectCombo();

  if (whichCombo != null)
    this.currentInputController.informComboPerformed(whichCombo, now);
}

Engine.INPUT.Controller.prototype.addClick = function(id)
{
  this.currentInputController.informClick(id);

  if (engine.options.outputClicks == true)
    engine.logs.log('Input.addClick', 'Click over: ' + id);
}

Engine.INPUT.Controller.prototype.getKeyFromCode = function(keyCode)
{
  return this.inverseKeyboard[keyCode];
}

Engine.INPUT.Controller.prototype.convertKeyToNumber = function(keyCode)
{
  switch(keyCode)
  {
    case Engine.INPUT.KEYS.NINE: 
      return 9;
    case Engine.INPUT.KEYS.EIGTH: 
      return 8;
    case Engine.INPUT.KEYS.SEVEN: 
      return 7;
    case Engine.INPUT.KEYS.SIX: 
      return 6;
    case Engine.INPUT.KEYS.FIVE: 
      return 5;
    case Engine.INPUT.KEYS.FOUR: 
      return 4;
    case Engine.INPUT.KEYS.THREE: 
      return 3;
    case Engine.INPUT.KEYS.TWO: 
      return 2;
    case Engine.INPUT.KEYS.ONE: 
      return 1;
    case Engine.INPUT.KEYS.ZERO: 
      return 0;
    default:
      break;
  }
  return -1;
}

Engine.INPUT.Controller.prototype.convertNumberToKey = function(number)
{
  switch(number)
  {
    case 9: 
      return Engine.INPUT.KEYS.NINE;
    case 8: 
      return Engine.INPUT.KEYS.EIGTH;
    case 7: 
      return Engine.INPUT.KEYS.SEVEN;
    case 6: 
      return Engine.INPUT.KEYS.SIX;
    case 5: 
      return Engine.INPUT.KEYS.FIVE;
    case 4: 
      return Engine.INPUT.KEYS.FOUR;
    case 3: 
      return Engine.INPUT.KEYS.THREE;
    case 2: 
      return Engine.INPUT.KEYS.TWO;
    case 1: 
      return Engine.INPUT.KEYS.ONE;
    case 0: 
      return Engine.INPUT.KEYS.ZERO;
    default:
      break;
  }
  return Engine.INPUT.KEYS.ZERO;
}


Engine.INPUT.SceneInput = function()
{
  // List of combos to detect
  // Combos will be defined in the form
  // combos[comboName] = { comboType: type, comboKeys: [list of keys], lastTime: time }
  this.combos = {};

  // { keyCode : [ list of structures of type 
  //                      { 
  //                          listeningOb:   ob listening to the event,
  //                          listeningFunc: function to be called inside listeningOb,
  //                          onPause:       bool, if ob should be informed with the game on pause,
  //                      } 
  //             ] 
  // }
  this.comboListeners = {};  

  this.keyListeners = {}; // { keyCode : [ list of objects listening to the event ] }

  // List of clickable zones
  // clickableZones[zoneName] = { 
  //                  position : x, y of its center, 
  //                  size : x, y (rectangle form),
  //                  character : character to emulate when it's touched
  //                        }
  this.clickableZones = {};

  this.clickListeners = []; // array of elements listening to click events
}

Engine.INPUT.SceneInput.prototype.initialize = function() 
{

}

Engine.INPUT.SceneInput.prototype.activate = function() 
{
  engine.input.setCurrentInputController(this);

  // Always have the common controls
  this.addKeyListener( engine.core, 'eventKeyPressed', [ Engine.INPUT.KEYS.P, Engine.INPUT.KEYS.ESC, Engine.INPUT.KEYS.F ], true );
}

// Engine.INPUT.SceneInput.prototype.testLog = function()
// {
//   var res = '[';
//   for (var j = 0, len_j = this.lastPressed.length; j < len_j; j++)
//     res += this.lastPressed[j] + ', ';
//   res += ']';

//   engine.logs.log('Input.testLog', res);
// }

Engine.INPUT.SceneInput.prototype.addKeyListener = function(object, funcName, keyList, onPause)
{
  if (onPause == undefined)
    onPause = false;

  var element = [];
  element['listeningOb'] = object;
  element['listeningFunc'] = funcName;
  element['onPause'] = onPause;

  for (var i = 0, len = keyList.length; i < len; i++)
  {
    if (this.keyListeners[keyList[i]] == undefined)
      this.keyListeners[keyList[i]] = [ element ];
    else
      this.keyListeners[keyList[i]].push(element);
  }
}

Engine.INPUT.SceneInput.prototype.addClickListener = function(object, funcName, onPause)
{
  if (onPause == undefined)
    onPause = false;

  var element = [];
  element['listeningOb'] = object;
  element['listeningFunc'] = funcName;
  element['onPause'] = onPause;

  this.clickListeners.push(element);
}

Engine.INPUT.SceneInput.prototype.informKeyPressed = function(keyCode)
{
  var listeners = [];
  
  // Objects listening to the actual key pressed
  if (this.keyListeners[keyCode] != undefined)
    listeners = listeners.concat(this.keyListeners[keyCode]);

  // Objects listening to ANY key pressed
  if (this.keyListeners[Engine.INPUT.KEYS.ANY_KEY] != undefined)
    listeners = listeners.concat(this.keyListeners[Engine.INPUT.KEYS.ANY_KEY]);

  if (listeners == undefined)
    return;

  for (var i = 0, len = listeners.length; i < len; i++)
  {
    var which = listeners[i];

    // If the listening object should not be informed on pause
    if (!which.onPause && engine.paused)
      continue;

    // If the object has the function, inform
    if (which.listeningOb[which.listeningFunc] != undefined)
      which.listeningOb[which.listeningFunc](keyCode);
  }
}

Engine.INPUT.SceneInput.prototype.informClick = function(id)
{  
  if (typeof(this.clickListeners) === 'undefined')
    return;

  for (var i = 0, len = this.clickListeners.length; i < len; i++)
  {
    var which = this.clickListeners[i];

    // If the listening object should not be informed on pause
    if (!which.onPause && engine.paused)
      continue;

    // If the object has the function, inform
    if (typeof(which.listeningOb[which.listeningFunc]) !== 'undefined')
      which.listeningOb[which.listeningFunc](id);
  }
}

Engine.INPUT.SceneInput.prototype.defineCombo = function(name, type, list)
{
  this.combos[name] = { comboType: type, comboKeys: list, lastTime: 0 };
}

Engine.INPUT.SceneInput.prototype.addComboListener = function(object, funcName, comboNames, onPause)
{
  if (onPause == undefined)
    onPause = false;

  var element = [];
  element['listeningOb'] = object;
  element['listeningFunc'] = funcName;  
  element['onPause'] = onPause;

  for (var i = 0, len = comboNames.length; i < len; i++)
  {
    if (this.comboListeners[comboNames[i]] == undefined)
      this.comboListeners[comboNames[i]] = [ element ];
    else
      this.comboListeners[comboNames[i]].push(element);
  }
}

Engine.INPUT.SceneInput.prototype.informComboPerformed = function(comboName, time)
{
  if (engine.options.outputPressedCombos == true)
    engine.logs.log('Input.informComboPerformed', 'Combo activated: ' + comboName, time);

  // Update last time performed
  this.combos[comboName].lastTime = time;

  var listeners = this.comboListeners[comboName];

  if (listeners == undefined)
    return;

  for (var i = 0, len = listeners.length; i < len; i++)
  {
    var which = listeners[i];

    // If the listening object should not be informed on pause
    if (!which.onPause && engine.paused)
      continue;

    // If the object has the function, inform
    if (which.listeningOb[which.listeningFunc] != undefined)
      which.listeningOb[which.listeningFunc](comboName);
  }

  // Control of combo result should be done in Controls.informComboPerformed
  return;
}

Engine.INPUT.SceneInput.prototype.detectCombo = function()
{
  for (var comboName in this.combos)
  {
    var combo = this.combos[comboName];

    // All the keys pressed at the same time
    if (combo.comboType == Engine.INPUT.COMBO_TYPES.SIMULTANEOUS)
    {
      for (var j = 0, len_j = combo.comboKeys.length; j < len_j; j++)
      {
        // Any of the keys is not pressed, combo failed
        if (!engine.input.isKeyPressed(combo.comboKeys[j]))
          break;
        // All pressed, this is the last one and it's also pressed, combo win!
        if ((j == len_j - 1) && (engine.input.isKeyPressed(combo.comboKeys[j])))
          return comboName;
      } 
    }
    // Keys pressed in a consecutive way
    else if (combo.comboType == Engine.INPUT.COMBO_TYPES.CONSECUTIVE)
    {
      var lp_len = engine.input.lastPressed.length;
      var ck_len = combo.comboKeys.length;

      // If pressed list shorter than combo
      if (lp_len < ck_len)
        return null;

      for (var j = 1; (j <= ck_len) && (j <= lp_len); j++)
      {
        // Non-match
        if (combo.comboKeys[ck_len - j] != engine.input.lastPressed[lp_len - j])
          break;

        // Last element and everyone match
        if ( (j >= ck_len) || (j >= lp_len) )
          return comboName;
      }
    }
  }

  // No combos found
  return null;
}

Engine.INPUT.SceneInput.prototype.addClickZone = function(id, location, rectangleSize, ch)
{
  this.clickableZones[id] = {
    position : location,
    size : rectangleSize,
    character : ch
  }
}

Engine.INPUT.SceneInput.prototype.detectClick = function(position)
{
  for (var clickId in this.clickableZones)
  {
    var clickZone = this.clickableZones[clickId];

    // engine.logs.log('Engine.INPUT.SceneInput.detectTouch', 'Testing ' + clickId + ' zone');

    if ((position.x >= clickZone.position.x - clickZone.size.x / 2 ) && 
        (position.x <= clickZone.position.x + clickZone.size.x / 2 ) && 
        (position.y >= clickZone.position.y - clickZone.size.y / 2 ) && 
        (position.y <= clickZone.position.y + clickZone.size.y / 2 ))
    {
      // Touch done!
      // engine.logs.log('Engine.INPUT.SceneInput.detectTouch', 'Touch OK, zone: ' + clickId);
      // engine.gui.get('console').addText('touch', clickId); 

      // Save the emulated key
      if (clickZone.character != null)
        engine.input.addLastPressed(clickZone.character);

      engine.input.addClick(clickId);
    }
  }
}
/*
 *  Base object
 *  Everything on screen should inherit from here
 */

Engine.Item = function()
{
  this.spriteName = null;

  // If false, will not be rendered by the spriteHandler
  this._visible  = true;

  this.position = new Engine.MATH.Point();
  this.size     = new Engine.MATH.Point();
  this.scaling  = new Engine.MATH.Point(1, 1);  

  this.speed    = new Engine.MATH.Point();
  this.maxVel   = 0; // maximum speed
  this.accel    = 0; // acceleration 

  this.vRot     = 0; // rotation speed
  this.maxVRot  = 0; // max rotation speed
  this.accelRot = 0; // rotation accel
  this.rotation = new Engine.MATH.Rotation();

  this.globalAlpha     = 1;

  this.maxRadius       = 0;  // object radius
  this.collisionRadius = 0;  // smaller radius for collsions

  // If isAnimated == true, the object itself would call the spriteHandler to ask 
  // for its new frame, etc
  this.isAnimated      = false;
  this.currentFrame    = 0;  // for animations
  // this.numFrames       = 1;
  this.numLoops        = 1;  // times the animation has been repeated
  // for animations (last time when frame changed)
  this.forceFrameSpeed = 0;  // 0 == spriteHandler will use default animation speed
  this.timeLastFrame   = 0;  // new Date().getTime();    

  // Object hierarchy on the screen
  this._attachedItems  = [];   // objects attached to current position
  this._removedItems   = [];   // objects to be removed at the end of step() 
  this._parent         = null; // object this item is attached to
}

Engine.Item.prototype.initialize = function()
{
}

Engine.Item.prototype.activate = function()
{
  for (var i = 0, len = this._attachedItems.length; i < len; i++) 
  {
    var what = this._attachedItems[i];
    what.activate();
  }
}

Engine.Item.prototype.getVisible = function() { return this._visible; }
Engine.Item.prototype.setVisible = function(value) { this._visible = value; }

Engine.Item.prototype.getParent = function() { return this._parent; }
Engine.Item.prototype.setParent = function(parent)
{
  this._parent = parent;
}

Engine.Item.prototype.getParentScene = function()
{
  var p = this._parent;
  while ((p != undefined) && (p != null))
  {
    if (Engine.Scene.prototype.isPrototypeOf(p))
      return p;
    else
      p = p.getParent();
  }

  return null;
}

Engine.Item.prototype.getAttachedItems = function() { return this._attachedItems; }
Engine.Item.prototype.attachItem = function(what)
{
  // this._attachedItems[this._attachedItems.length] = what;
  this._attachedItems.push(what);
  what.setParent(this);
}

Engine.Item.prototype.detachItem = function(what)
{
  this._removedItems.push(what);
  what.setParent(null);
  // delete this.items[index]; // mark the position as undefined, does not change the array size
  // this.items.splice(index, 1);
}

Engine.Item.prototype.detachAllItems = function()
{
  for (var i = 0, len = this._attachedItems.length; i < len; i++) 
  {
    var what = this._attachedItems[i];
    
    // recursive !!
    what.detachAllItems();
    // what._finalizeRemoved();

    this.detachItem(what);
  }

  this._finalizeRemoved();
}

Engine.Item.prototype._resetItems = function()
{
  this._attachedItems.length = 0;
}

// Reset the list of removed items
Engine.Item.prototype._resetRemoved = function() 
{
  this._removedItems.length = 0; 
}

// Remove any items marked for removal
Engine.Item.prototype._finalizeRemoved = function() 
{
  for (var i = 0, len = this._removedItems.length; i < len; i++) 
  {
    var what = this._removedItems[i];
    var idx = this._attachedItems.indexOf(what);
    
    if(idx != -1) 
    {
      // what.detachAllItems();
      this._attachedItems.splice(idx, 1);
    }
  }
  // Reset the list of removed objects
  this._resetRemoved();
}

Engine.Item.prototype.setImage = function(spriteName)
{
  this.spriteName = spriteName;

  this.size = engine.sprites.getSpriteSize(spriteName);
}

Engine.Item.prototype.getOrigin = function()
{
  var center = this.getPosition();

  return new Engine.MATH.Point(center.x - this.size.x/2, center.y - this.size.y/2);
}

Engine.Item.prototype.getPosition = function()
{
  var result = new Engine.MATH.Point();
  var parentPosition = new Engine.MATH.Point();
  var transformedPosition = new Engine.MATH.Point();
  
  if (this._parent != null)
  {
    parentPosition = this._parent.getPosition();
    transformedPosition = this._parent.rotation.transformPosition(this.position);
    result.x = transformedPosition.x + parentPosition.x;
    result.y = transformedPosition.y + parentPosition.y;
  }
  else
  {
    result.x = this.position.x;
    result.y = this.position.y;    
  }

  return result;
}

Engine.Item.prototype.setPosition = function(x, y)
{
  this.position.x = x;
  this.position.y = y;  
}

Engine.Item.prototype.getSize = function() { return this.size; }
Engine.Item.prototype.setSize = function(x, y)
{
  this.size.x = x;
  this.size.y = y;  
}

Engine.Item.prototype.getScaling = function() { return this.scaling; }
Engine.Item.prototype.setScaling = function(x, y)
{
  this.scaling.x = x;
  this.scaling.y = y;  
}

Engine.Item.prototype.getSpeed = function() { return this.speed; }
Engine.Item.prototype.setSpeed = function(x, y)
{
  this.speed.x = x;
  this.speed.y = y;  
}

Engine.Item.prototype.getParentPosition = function()
{
  if (this._parent != null)
    return this._parent.getPosition();
  else
    return new Engine.MATH.Point();
}

Engine.Item.prototype.getParentSpeed = function()
{
  if (this._parent != null)
    return this._parent.getSpeed();
  else
    return new Engine.MATH.Point();
}

Engine.Item.prototype.getRadius = function()
{
  return Math.sqrt(Math.pow(this.size.x/2, 2) + Math.pow(this.size.y/2, 2));
}

Engine.Item.prototype.getMagnitude = function() 
{
  return Math.sqrt(this.speed.x * this.speed.x + this.speed.y * this.speed.y);
}

Engine.Item.prototype.move = function(dx, dy)
{
  this.position.x += dx;
  this.position.y += dy;
}

Engine.Item.prototype.rotate = function(dRot)
{
  this.rotation.rotate(dRot);
}

Engine.Item.prototype.setRotation = function(rot)
{
  this.rotation.update(rot);
}

Engine.Item.prototype.getRotation = function()
{  
  if (this._parent != null)
    return this.rotation.getAngle() + this._parent.getRotation();
  else
    return this.rotation.getAngle();
}

Engine.Item.prototype.draw = function(ctx)
{
  if (this._visible == true)
  {
    for (var i = 0, len = this._attachedItems.length; i < len; i++)
      this._attachedItems[i].draw(ctx);

    if (this.spriteName != null)
      engine.sprites.draw(ctx, this);

    if (engine.options.drawBoundingBoxes == true)
      this.drawHelper(ctx, 'spriteBox');
    if (engine.options.drawMaxRadius == true)
      this.drawHelper(ctx, 'maxRadius');
    if (engine.options.drawCollisionRadius == true)
      this.drawHelper(ctx, 'collisionRadius');
    if (engine.options.drawOrigins == true)
      this.drawHelper(ctx, 'origin');
    if (engine.options.drawCenters == true)
      this.drawHelper(ctx, 'center');
    if (engine.options.drawDirectionVectors == true)
      this.drawHelper(ctx, 'direction');
  }
}

Engine.Item.prototype.step = function(dt)
{
  if ((this.speed.x != 0) || (this.speed.y != 0))
    this.move(this.speed.x * dt / engine.core.TIME_PER_FRAME, this.speed.y * dt / engine.core.TIME_PER_FRAME);
  
  if (this.vRot != 0)
    this.rotate(this.vRot * dt / engine.core.TIME_PER_FRAME);

  // Advance the necessary frames in the animation if needed
  if ((this.isAnimated == true) && (this.spriteName != null))
    engine.sprites.step(dt, this);

  for (var i = 0, len = this._attachedItems.length; i < len; i++)
    this._attachedItems[i].step(dt);

  // Remove any objects marked for removal
  this._finalizeRemoved();
}

Engine.Item.prototype.eventAnimationRestart = function() 
{
}

Engine.Item.prototype.drawHelper = function(ctx, what)
{
  var pos = this.getPosition();
  var size = this.getSize();
  var scale = this.getScaling();

  // Draw the collisionRadius
  if ('maxRadius' == what)
  {
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, this.maxRadius, 0 , 2 * Math.PI, false);
    ctx.closePath();
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#FF0000';
    ctx.stroke();
  }
  else if ('collisionRadius' == what)
  {
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, this.collisionRadius, 0 , 2 * Math.PI, false);
    ctx.closePath();
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#FF0000';
    ctx.stroke();
  }
  // Draw the origin
  else if ('origin' == what)
  {
    ctx.fillStyle = '#FF0000';
    ctx.fillRect(pos.x - size.x/2 * scale.x, pos.y - size.y/2 * scale.y, 2, 2);  
  }
  else if ('center' == what)
  {
    ctx.fillStyle = '#FF0000';
    ctx.fillRect(pos.x, pos.y, 2, 2);
  }
  else if ('spriteBox' == what)
  {
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#FF0000';
    ctx.strokeRect(pos.x - size.x/2 * scale.x, 
                   pos.y - size.y/2 * scale.y, 
                   size.x * scale.x, 
                   size.y * scale.y);
  }
  else if ('direction' == what)
  {
    var speed = this.getSpeed();

    ctx.lineWidth = 1;
    ctx.strokeStyle = '#FF0000';
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.lineTo(pos.x + speed.x * 10, pos.y + speed.y * 10);
    ctx.stroke();    
  }
}

// By default, when an item collides, it is deleted
// Objects which inherit from Item must implement their own collide method
Engine.Item.prototype.collide = function()
{
  // Delete the attached items
  this.detachAllItems();

  // true if object should be removed, false otherwise
  return true;
}

Engine.Tracker = function(callback) 
{
  Engine.Item.call(this);

  this.callback = callback;
}

Engine.Tracker.prototype = Object.create(Engine.Item.prototype);
Engine.Tracker.prototype.constructor = Engine.Tracker;


Engine.Tracker.prototype.initialize = function()
{
  Engine.Item.prototype.initialize.call(this);
}

Engine.Tracker.prototype.activate = function()
{
  Engine.Item.prototype.activate.call(this);
}

Engine.Tracker.prototype.step = function (dt)
{
  // Item.step is where the attached items steps are called, so they go 
  // after updating the tracker

  Engine.Item.prototype.step.call(this, dt);
}

Engine.Tracker.prototype.draw = function (ctx) 
{
  Engine.Item.prototype.draw.call(this, ctx); 
}

Engine.Tracker.prototype.forceDetach = function()
{
  if (this.getParent() != null)
  {
    // Move all children from here to the parent
    for (var i = 0, len = this.getAttachedItems().length; i < len; i++)
    {
      var element = this.getAttachedItems()[i];

      element.position.x += this.position.x;
      element.position.y += this.position.y;

      // Exit speed, so the element does not stop
      // element.speed.x = direction.x * this.trackSpeed;
      // element.speed.y = direction.y * this.trackSpeed;

      this.detachItem(element);
      this.getParent().attachItem(element);
    }

    // Suicide!
    this.getParent().detachItem(this);  
  }
}

Engine.TrackerCircle = function(callback) 
{
  Engine.Tracker.call(this, callback);

  // For circular tracks
  this.circleAngle = 0.1;
  this.circleRadius = 60;
}

Engine.TrackerCircle.prototype = Object.create(Engine.Tracker.prototype);
Engine.TrackerCircle.prototype.constructor = Engine.TrackerCircle;


Engine.TrackerCircle.prototype.initialize = function()
{
  Engine.Tracker.prototype.initialize.call(this);
}

Engine.TrackerCircle.prototype.activate = function()
{
  Engine.Tracker.prototype.activate.call(this);
}

Engine.TrackerCircle.prototype.step = function (dt)
{
  this.circleAngle += this.trackSpeed * dt / engine.core.TIME_PER_FRAME;
  this.position.x = Math.cos(this.circleAngle) * this.circleRadius;
  this.position.y = Math.sin(this.circleAngle) * this.circleRadius;

  // Tracker.step is where the attached items steps are called, so they go 
  // after updating the tracker

  // Call inherited function 
  Engine.Tracker.prototype.step.call(this, dt);
}

Engine.TrackerCircle.prototype.draw = function (ctx) 
{
  // Call inherited function 
  Engine.Tracker.prototype.draw.call(this, ctx); 

  if (engine.options.drawTrackers == true)
  {
    var pos = this.getParentPosition();
    var gradient = ctx.createLinearGradient(pos.x - this.circleRadius, pos.y, 
                                            pos.x + this.circleRadius, pos.y);
    gradient.addColorStop(0, '#009');
    gradient.addColorStop(1, '#900');
    ctx.strokeStyle = gradient;
    // ctx.strokeStyle = '#FF0000';
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.arc(pos.x, pos.y, this.circleRadius, 0, 2 * Math.PI, false);
    ctx.closePath();
    ctx.stroke();
  }
}


Engine.TrackerBezier = function(callback) 
{
  Engine.Tracker.call(this, callback);

  // Example of bezier speed
  this.trackSpeed = 1/250;

  // For Bezier tracks
  this.bezierAdvance = 0;

  this.p0 = null;
  this.p1 = null;
  this.p2 = null;
  this.p3 = null;

  // var p0 = { x: -60,  y: -10  };
  // var p1 = { x: -70,  y: -200 };
  // var p2 = { x: -125, y: -200 };
  // var p3 = { x: 100,  y: -350 };

  // this.bezierPoints(p0, p1, p2, p3);
}

Engine.TrackerBezier.prototype = Object.create(Engine.Tracker.prototype);
Engine.TrackerBezier.prototype.constructor = Engine.TrackerBezier;


Engine.TrackerBezier.prototype.initialize = function()
{
  Engine.Tracker.prototype.initialize.call(this);
}

Engine.TrackerBezier.prototype.activate = function()
{
  Engine.Tracker.prototype.activate.call(this);
}

Engine.TrackerBezier.prototype.bezierPoints = function(p0, p1, p2, p3)
{
  this.p0 = p0;
  this.p1 = p1;
  this.p2 = p2;
  this.p3 = p3;

  this.cx = 3 * (this.p1.x - this.p0.x)
  this.bx = 3 * (this.p2.x - this.p1.x) - this.cx;
  this.ax = this.p3.x - this.p0.x - this.cx - this.bx;

  this.cy = 3 * (this.p1.y - this.p0.y);
  this.by = 3 * (this.p2.y - this.p1.y) - this.cy;
  this.ay = this.p3.y - this.p0.y - this.cy - this.by;  
}

Engine.TrackerBezier.prototype.step = function (dt)
{
  var t = this.bezierAdvance;
  this.bezierAdvance += this.trackSpeed * dt / engine.core.TIME_PER_FRAME;

  var oldX = this.position.x;
  var oldY = this.position.y;

  this.position.x = this.ax*(t*t*t) + this.bx*(t*t) + this.cx*t + this.p0.x;
  this.position.y = this.ay*(t*t*t) + this.by*(t*t) + this.cy*t + this.p0.y;

  // inform the attached items we are moving
  // for (var i = 0, len = this.getAttachedItems().length; i < len; i++)
  // {
  //   var element = this.getAttachedItems()[i];
  //   if (this.position.x > oldX)
  //     element.informEvent(EVENTS.RIGHT);
  //   else if (this.position.x < oldX)
  //     element.informEvent(EVENTS.LEFT);
  //   if (this.position.y > oldY)
  //     element.informEvent(EVENTS.DOWN);
  //   else if (this.position.y < oldY)
  //     element.informEvent(EVENTS.UP);
  // }

  // End of the curve
  if (this.bezierAdvance > 1) 
  {
    this.bezierAdvance = 1;

    if (this.getParent() != null)
    {
      // Move all children from here to the parent
      for (var i = 0, len = this.getAttachedItems().length; i < len; i++)
      {
        var element = this.getAttachedItems()[i];

        element.position.x += this.position.x;
        element.position.y += this.position.y;

        this.detachItem(element);
        this.getParent().attachItem(element);
      }

      // Suicide!
      this.getParent().detachItem(this);
    }

    if (this.callback)
      this.callback();
  }

  // Tracker.step is where the attached items steps are called, so they go 
  // after updating the tracker

  // Call inherited function 
  Engine.Tracker.prototype.step.call(this, dt);
}

Engine.TrackerBezier.prototype.draw = function (ctx) 
{
  // Call inherited function 
  Engine.Tracker.prototype.draw.call(this, ctx); 

  if (engine.options.drawTrackers == true)
  {
    var pos = this.getParentPosition();
    var gradient = ctx.createLinearGradient(pos.x + this.p0.x, pos.y + this.p0.y, 
                                            pos.x + this.p3.x, pos.y + this.p3.y);
    gradient.addColorStop(0, '#009');
    gradient.addColorStop(1, '#900');
    ctx.strokeStyle = gradient;
    ctx.fillStyle = null;

    ctx.lineWidth = 1;
    // ctx.strokeStyle = '#FF0000';

    ctx.beginPath();
    ctx.moveTo(pos.x + this.p0.x, pos.y + this.p0.y);
    ctx.bezierCurveTo(pos.x + this.p1.x, pos.y + this.p1.y, 
                      pos.x + this.p2.x, pos.y + this.p2.y, 
                      pos.x + this.p3.x, pos.y + this.p3.y);
    ctx.stroke();
  }
}


Engine.TrackerSine = function(callback) 
{
  Engine.Tracker.call(this, callback);

  this.position        = new Engine.MATH.Point(0, 0); 
  this.amplitudeVector = new Engine.MATH.Point(10, 10); // { x: 10, y: 10};
  this.frequencyVector = new Engine.MATH.Point(1, 1);   // { x: 1, y: 1};
  // phase in degrees (will be converted to radians)
  this.phaseVector     = new Engine.MATH.Point(0, 0);   // { x: 1, y: 1};

  this.initTime = 0;
}

Engine.TrackerSine.prototype = Object.create(Engine.Tracker.prototype);
Engine.TrackerSine.prototype.constructor = Engine.TrackerSine;


Engine.TrackerSine.prototype.initialize = function()
{
  Engine.Tracker.prototype.initialize.call(this);

  this.initTime = new Date().getTime();
}

Engine.TrackerSine.prototype.activate = function()
{
  Engine.Tracker.prototype.activate.call(this);

  this.initTime = new Date().getTime();
}

Engine.TrackerSine.prototype.step = function (dt)
{
  this.position.x += this.amplitudeVector.x * 
                        Math.sin((new Date().getTime() - this.initTime)/1000 * 
                          this.frequencyVector.x + 
                          this.phaseVector.x/180 * 
                          Math.PI) * (dt / 1000);
  this.position.y += this.amplitudeVector.y * 
                        Math.sin((new Date().getTime() - this.initTime)/1000 * 
                          this.frequencyVector.y + 
                          this.phaseVector.y/180 * 
                          Math.PI) * (dt / 1000);

  // Tracker.step is where the attached items steps are called, so they go 
  // after updating the tracker

  // Call inherited function 
  Engine.Tracker.prototype.step.call(this, dt);
}

Engine.TrackerSine.prototype.draw = function (ctx) 
{
  // Call inherited function 
  Engine.Tracker.prototype.draw.call(this, ctx); 

  if (engine.options.drawTrackers == true)
  {
    var pos = this.getParentPosition();
    ctx.strokeStyle = '#FF0000';
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.lineTo(pos.x + this.position.x, pos.y + this.position.y);
    ctx.closePath();
    ctx.stroke();
  }
}


Engine.TrackerFollow = function(callback) 
{
  Engine.Tracker.call(this, callback);

  this.targetOb = null;
  this.lastDirection = null; // In case target disappears

  this.trackSpeed = 1;
};

Engine.TrackerFollow.prototype = Object.create(Engine.Tracker.prototype);
Engine.TrackerFollow.prototype.constructor = Engine.TrackerFollow;


Engine.TrackerFollow.prototype.initialize = function()
{
  Engine.Tracker.prototype.initialize.call(this);
};

Engine.TrackerFollow.prototype.activate = function()
{
  Engine.Tracker.prototype.activate.call(this);
};

Engine.TrackerFollow.prototype.setTarget = function(target)
{
  this.targetOb = target;
};

Engine.TrackerFollow.prototype.step = function(dt)
{
  var pos = this.getPosition();
  var targetPos = this.targetOb.getPosition();
  var direction = null;
  var forceDetach = false;

  // The target has been removed from the scene
  if (this.targetOb.getParent() === null)
  {
    direction = this.lastDirection;
    forceDetach = true;
  }
  else
  {
    direction = new Engine.MATH.Point(targetPos.x - pos.x,
                                      targetPos.y - pos.y);

    direction = direction.normalize();
    this.lastDirection = direction;
  }

  var movement = new Engine.MATH.Point(direction.x * this.trackSpeed, 
                                       direction.y * this.trackSpeed);
  var futurePos = new Engine.MATH.Point(pos.x + movement.x,
                                        pos.y + movement.y);

  var distanceToTarget = engine.math.pointDistance(pos, targetPos);
  var distanceToFuture = engine.math.pointDistance(pos, futurePos);

  if ((forceDetach === false) && (distanceToTarget > distanceToFuture))
  {
    this.position.x = futurePos.x;
    this.position.y = futurePos.y;
  }
  else
  {
    if (this.getParent() !== null)
    {
      this.position.x = targetPos.x;
      this.position.y = targetPos.y;

      // Move all children from here to the parent
      for (var i = 0, len = this.getAttachedItems().length; i < len; i++)
      {
        var element = this.getAttachedItems()[i];

        element.position.x += this.position.x;
        element.position.y += this.position.y;

        // Exit speed, so the element does not stop
        element.speed.x = direction.x * this.trackSpeed;
        element.speed.y = direction.y * this.trackSpeed;

        this.detachItem(element);
        this.getParent().attachItem(element);
      }

      // Suicide!
      this.getParent().detachItem(this);
    }

    if (this.callback)
      this.callback();
  }

  // Tracker.step is where the attached items steps are called, so they go 
  // after updating the tracker

  // Call inherited function 
  Engine.Tracker.prototype.step.call(this, dt);
};

Engine.TrackerFollow.prototype.draw = function(ctx) 
{
  // Call inherited function 
  Engine.Tracker.prototype.draw.call(this, ctx); 

  if (engine.options.drawTrackers === true)
  {
    var pos = this.getPosition();
    var targetPos = this.targetOb.getPosition();
    var gradient = ctx.createLinearGradient(pos.x, pos.y, 
                                            targetPos.x, targetPos.y);
    gradient.addColorStop(0, '#009');
    gradient.addColorStop(1, '#900');
    ctx.strokeStyle = gradient;
    // ctx.strokeStyle = '#FF0000';
    ctx.lineWidth = 1;
    
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.lineTo(targetPos.x, targetPos.y);
    ctx.stroke();
  }
};

Engine.Particle = function(position, speed) 
{
  Engine.Item.call(this);

  this.setPosition(position.x, position.y);
  this.setSpeed(speed.x, speed.y);

  this.ttl    = -1;
  this.lived  = 0;
  this.color  = [];
  this.size   = 2;    
}

Engine.Particle.prototype = Object.create(Engine.Item.prototype);
Engine.Particle.prototype.constructor = Engine.Particle;


Engine.Particle.prototype.initialize = function() 
{
}

Engine.Particle.prototype.activate = function() 
{
}

Engine.Particle.prototype.step = function(dt) 
{
  this.move(this.speed.x * dt / engine.core.TIME_PER_FRAME,
            this.speed.y * dt / engine.core.TIME_PER_FRAME);

  this.lived++;
}

// Not needed, the particles will be drawn inside the ParticleCollection object
Engine.Particle.prototype.draw = function(ctx) 
{
}

// Will never be used, the particles are not attached to the scene
Engine.Particle.prototype.collide = function(what)
{
  // Particles are not physical objects
  return false;
}

Engine.ParticleCollection = function() 
{
  this.particles         = [];
  this.maxParticles      = 10000;
  this._removedParticles = [];   // particles to be removed at the end of step() 

  this.effectField = document.createElement('canvas');
  this.effectField.width = engine.core.size.x; 
  this.effectField.height = engine.core.size.y;
  this.effectField.ctx = this.effectField.getContext('2d');
  // this.effectField.ctx.globalCompositeOperation = 'darker';
  // this.effectField.ctx.fillStyle = 'rgba(' + this.particleColor.join(',') + ')';
}

Engine.ParticleCollection.prototype.initialize = function()
{
  this.particles         = [];
  this.maxParticles      = 10000;
  this._removedParticles = [];
}

Engine.ParticleCollection.prototype.addParticle = function(particle)
{
  if (this.particles.length > this.maxParticles)
    return;

  this.particles.push(particle);
}

Engine.ParticleCollection.prototype.removeParticle = function(what)
{
  this._removedParticles.push(what);
}

Engine.ParticleCollection.prototype._resetItems = function()
{
  this.particles.length = 0;
}

// Reset the list of removed items
Engine.ParticleCollection.prototype._resetRemoved = function() 
{
  this._removedParticles.length = 0; 
}

// Remove any items marked for removal
Engine.ParticleCollection.prototype._finalizeRemoved = function() 
{
  for (var i = 0, len = this._removedParticles.length; i < len; i++) 
  {
    var what = this._removedParticles[i];
    var idx = this.particles.indexOf(what);
    
    if(idx != -1) 
    {
      // what.detachAllItems();
      this.particles.splice(idx, 1);
    }
  }
}

Engine.ParticleCollection.prototype.step = function (dt)
{
  var i, len = this.particles.length, p;

  for (var i = 0; i < len; i++)
  {
    p = this.particles[i];

    if (p.lived > p.ttl)
      this.removeParticle(p);
    else
      p.step(dt);
  }

  // Remove any objects marked for removal
  this._finalizeRemoved();
  // Reset the list of removed objects
  // this._resetRemoved();
}

Engine.ParticleCollection.prototype.draw = function (ctx) 
{
  if (this.particles.length > 0)
  {
    this.effectField.ctx.clearRect ( 0 , 0 , engine.core.size.x , engine.core.size.y );

    var particle, i = -1;
    while (particle = this.particles[++i])
    {
      var tmpColor = [particle.color[0] - particle.lived * 3, 
                      particle.color[1] - particle.lived,
                      particle.color[2],
                      particle.color[3]];

      this.effectField.ctx.fillStyle = 'rgba(' + tmpColor.join(',') + ')';
      this.effectField.ctx.fillRect(particle.position.x, 
                                    particle.position.y, 
                                    particle.size, 
                                    particle.size);
    }

    ctx.drawImage(this.effectField, 0, 0, engine.core.size.x, engine.core.size.y);
  }
}


Engine.Emitter = function(particleSpeed, magnitude, spread) 
{
  Engine.Item.call(this);
  
  // this.position = new Engine.MATH.Point(0, 0);
  // this.speed    = new Engine.MATH.Point(0, 0);
  this.size     = new Engine.MATH.Point(10, 10);

  // velocity vector of the particles
  this.particleSpeed = particleSpeed;

  this.magnitude     = magnitude;

  this.particleColor = [255,255,255,255]; // [255,47,30,255]; // [66,167,222,255];
  this.particleLife  = 100;
  this.particleSize  = 3;

  this.started       = false;

  this.spread        = spread;
  this.emissionRate  = 3;
}

Engine.Emitter.prototype = Object.create(Engine.Item.prototype);
Engine.Emitter.prototype.constructor = Engine.Emitter;


Engine.Emitter.prototype.start = function() { this.started = true; }
Engine.Emitter.prototype.stop = function() { this.started = false; }

Engine.Emitter.prototype.createParticle = function()
{
  var modifier = Math.random() * this.spread - this.spread / 2;

  var angle = this.getRotation() + modifier;
  
  var direction = engine.math.angleToDirectionVector(angle);
  direction = direction.normalize();

  var particleSpeed = new Engine.MATH.Point(direction.x * this.particleSpeed,
                                            direction.y * this.particleSpeed);


  // Initial position of the particle
  var position = this.getPosition();

  var particle = new Engine.Particle(position, particleSpeed);

  particle.ttl = Math.random() * this.particleLife;
  particle.color = this.particleColor;
  particle.size = this.particleSize;

  // this.particles.push(particle);
  engine.particles.addParticle(particle);
}

Engine.Emitter.prototype.step = function (dt)
{
  Engine.Item.prototype.step.call(this, dt);
  
  // this.emissionCount = this.emissionCount++ % this.emissionRate;

  if (this.started == true) 
  {
    for (var i = 0; i < this.emissionRate; i++)
    {
      this.createParticle();
    }
  }
}

Engine.Emitter.prototype.draw = function (ctx) 
{
  Engine.Item.prototype.draw.call(this, ctx);
}

Engine.Emitter.prototype.collide = function(what)
{
  // Emitters are not physical objects
  return false;
}

Engine.Effect = function(effectType, x, y, vx, vy) 
{
  Engine.Item.call(this);

  var spriteData = engine.sprites.sprites[effectType];

  this.size = new Engine.MATH.Point(spriteData[3], spriteData[4]);
  this.numFrames = spriteData[5];

  // position of the particle
  this.position = new Engine.MATH.Point(x, y);
  // velocity vector of the particle
  this.speed    = new Engine.MATH.Point(vx, vy);

  this.lived    = 0; // Num of steps lived
  this.lifeTime = 0; // Max num of steps to live (if 0 then ignored)
  this.maxLoops = 1; // Num of loops to be rendered

  this.spriteName = effectType;

  this.initialScaling = 1;
  this.finalScaling   = 1;

  this.transparencyMethod = 0; // 0 -> no, 1->appear, 2->disappear
  this.globalAlpha        = 1;
}

Engine.Effect.prototype = Object.create(Engine.Item.prototype);
Engine.Effect.prototype.constructor = Engine.Effect;


Engine.Effect.prototype.step = function(dt) 
{
  // Call inherited function 
  Engine.Item.prototype.step.call(this, dt);

  // var preFrame = this.currentFrame;
  this.lived++;

  var newScaling = 1;

  if ((this.initialScaling != 1) || (this.finalScaling != 1))
  {
    newScaling = this.initialScaling + (this.finalScaling - this.initialScaling) * this.lived / this.lifeTime;

    this.scaling.x = newScaling;
    this.scaling.y = newScaling;
  }

  if (this.transparencyMethod == 2) // disappearing
  {
    if (this.lifeTime != 0)
      this.globalAlpha = 1 - this.lived / this.lifeTime;
    else
      this.globalAlpha = 1 - this.currentFrame / this.numFrames;
  }
  else if (this.transparencyMethod == 1) // appearing
  {
    if (this.lifeTime != 0)
      this.globalAlpha = this.lived / this.lifeTime;
    else
      this.globalAlpha = this.currentFrame / this.numFrames;
  }
  
  // If the effect is animated, advance its frames
  if (this.isAnimated == true)
    engine.sprites.step(dt, this);

  // if (preFrame != this.currentFrame)
  //   engine.logs.log('Effect', 'pre ' + preFrame + ' current ' + this.currentFrame);
}

Engine.Effect.prototype.draw = function(ctx) 
{
  // Call inherited function 
  Engine.Item.prototype.draw.call(this, ctx);
}

Engine.Effects = function()
{
  this.effects = [];
  this.removed = [];
}

Engine.Effects.prototype.initialize = function() 
{ 
  // engine.logs.log('effectHandler.initialize', 'Initializing effects Handler');

  this.effects.length = 0;
}

Engine.Effects.prototype.removeEffect = function(eff)
{
  this.removed.push(eff);
}

// Reset the list of removed objects
Engine.Effects.prototype._resetRemoved = function() 
{
  this.removed.length = 0; 
}

// Remove any objects marked for removal
Engine.Effects.prototype._finalizeRemoved = function() 
{
  for(var i = 0, len = this.removed.length; i < len; i++) 
  {
    var idx = this.effects.indexOf(this.removed[i]);
    if(idx != -1) 
      this.effects.splice(idx, 1);
  }
}

Engine.Effects.prototype.step = function(dt) 
{
  this._resetRemoved();

  for (var i = 0, len = this.effects.length; i < len; i++) 
  {
    var eff = this.effects[i];

    eff.step(dt);

    // Effect lasts only the expected lifetime
    if ((eff.lifeTime > 0) && (eff.lived > eff.lifeTime))
      this.removeEffect(eff);

    // Effect lasts only one complete loop
    if ((eff.maxLoops > 0) && (eff.numLoops > eff.maxLoops))
      this.removeEffect(eff);
  }

  this._finalizeRemoved();
}

Engine.Effects.prototype.draw = function(ctx) 
{
  for (var i = 0, len = this.effects.length; i < len; i++) 
  {
    this.effects[i].draw(ctx);
  }
}

// The coordinates passed are the ones from the center
Engine.Effects.prototype.addEffect= function(type, x, y, vx, vy) 
{
  // var effectH = engine.sprites.sprites[type][3];
  // var effectW = engine.sprites.sprites[type][4];       

  eff = new Engine.Effect(type, x, y, vx, vy);
  this.effects.push(eff);

  // Returns the effect to add further changes
  return eff;
}


// Specific clock for every scene (one different instance in each scene)
// It's not aligned: it means the different subcriptions to the clock are executed in
// different times: two suscriptions to 500ms events would be called 500ms after each 
// subscription, not at the same time

Engine.UnalignedClock = function()
{
  this.clockEvents = {};
}

Engine.UnalignedClock.prototype.initialize = function() 
{
  this.clockEvents = {};
}

Engine.UnalignedClock.prototype.activate = function() 
{
  // The events could be suscribed since game initalization
  // so we do not remove them when the scene is activated
  // this.clockEvents = {};
}

Engine.UnalignedClock.prototype.suscribe = function(id, object, func, time)
{
  if (this.clockEvents[id] != undefined)
    engine.logs.log('UnalignedClock.suscribe', 'Object suscribing to clock event with repeated id ' + id);

  this.clockEvents[id] = { 
    ob : object,
    f : func,
    t : time,
    dt : 0
  };  
}

Engine.UnalignedClock.prototype.unsuscribe = function(id)
{
  delete this.clockEvents[id];
}

Engine.UnalignedClock.prototype.step = function(dt)
{
  var ids = Object.keys(this.clockEvents);

  for (var i = 0, len = ids.length; i < len; i++)
  {
    var item = this.clockEvents[ids[i]];

    item.dt += dt;

    if (item.dt >= item.t)
    {
      // engine.logs.log('UnalignedClock.step', 'Suscribed clock call: ' + ids[i]); // + ' ' + item.f);

      if (item.ob != undefined)
      {
        item.ob[item.f]();
      }
      else
      {
        // Call the suscribed function
        item.f();
      }

      item.dt = 0;
    }
  }
}

// ********************
// ********************
// ********************

Engine.Clock = function()
{
  this.startTime   = 0; // game init
  this.passedTime  = 0; // time passed
 

  this.ticker500    = 0;
  this.listeners500 = {};
  this.ticker1      = 0;
  this.listeners1   = {};
  this.ticker5      = 0;
  this.listeners5   = {};
}

Engine.Clock.prototype.initialize = function() {
  this.startTime = new Date().getTime(); // Init time
}

Engine.Clock.prototype.step = function(dt) {
  this.ticker1 += dt;
  this.ticker5 += dt;
  this.ticker500 += dt;

  if (this.ticker1 >= 1000) {
    this.informListeners(this.listeners1);
    this.ticker1 = 0;
  }

  if (this.ticker5 >= 5000) {
    this.informListeners(this.listeners5);
    this.ticker5 = 0;
  }

  if (this.ticker500 >= 500) {
    this.informListeners(this.listeners500);
    this.ticker500 = 0;
  }
}

Engine.Clock.prototype.draw = function(ctx) {

}

Engine.Clock.prototype.suscribe500 = function(name, func) {
  this.listeners500[name] = func;
}

Engine.Clock.prototype.suscribeOneSecond = function(name, func) {
  this.listeners1[name] = func;
}

Engine.Clock.prototype.suscribeFiveSeconds = function(name, func) {
  this.listeners5[name] = func;
}

Engine.Clock.prototype.informListeners = function(listenersList) {
  for(ob in listenersList) {
    listenersList[ob](); // call the function

    // // the callback exists
    // if (ob[listenersList[ob]] != undefined ) {
    //   // ob[listenersList[ob]](); // call the function
    //   listenersList[ob].apply();
    // }
  }
}

Engine.Localization = function()
{
  this.fallbackLanguage = 'english';
  this.selectedLanguage = '';
  this.stringTables = {};

  this.baseTexts = {
    'english' : 
    {
      'paused'  : 'Paused, press P to continue',
      'loaded'  : 'Loading',
      'items'   : 'items',
      'effects' : 'effects',
      'particles' : 'particles',
      'choose_language' : 'Choose language',
      'english' : 'English',
      'spanish' : 'Spanish'
    },
    'spanish' : 
    {
      'paused'  : 'Pausa, pulsa P para continuar',
      'loaded'  : 'Cargando',
      'items'   : 'elementos',
      'effects' : 'efectos',
      'particles' : 'partículas',
      'choose_language' : 'Escoge el idioma',  
      'english' : 'English',
      'spanish' : 'Español'
    }
  };  
}

Engine.Localization.prototype.initialize = function() 
{ 
  // engine.logs.log('localization.initialize', 'Initializing localization handler');

  // initial lenguage
  this.selectedLanguage = 'english'; 

  for (var lang in this.baseTexts) {
    this.stringTables[lang] = [];
    this.addTextsToStringTable(lang, this.baseTexts[lang]);
  }

  // engine.controls.addKeyListener( this, 'eventKeyPressed', [Engine.INPUT.KEYS.L, ] ); // change language
}

// Engine.Localization.prototype.eventKeyPressed = function(keyCode)
// {
//   engine.logs.log('Localization.eventKeyPressed', 'Key Pressed: ' + keyCode);

//   if (keyCode == KEYBOARD.L)
//   {
//     if (this.selectedLanguage == 'spanish')
//       this.selectLanguage('english');
//     else
//       this.selectLanguage('spanish');
//   }
// }

Engine.Localization.prototype.get = function(stringId)
{
  var text = this.stringTables[this.selectedLanguage][stringId];

  if ( text != undefined )
    return text;
  else 
    return this.stringTables[this.fallbackLanguage][stringId];
}

Engine.Localization.prototype.addStringTable = function(language, table) 
{
  this.stringTables[language] = table;
}

Engine.Localization.prototype.setBaseTexts = function(table) 
{
  this.baseTexts = table;
}

Engine.Localization.prototype.addTextsToStringTable = function(language, table)
{
  for (var prop in table)
    this.stringTables[language][prop] = table[prop];
}

Engine.Localization.prototype.selectLanguage = function(language) 
{
  this.selectedLanguage = language;
}

// Init namespace
Engine.GUI = {};

// Constants
Engine.GUI.ORDENATION = { UP : 0, DOWN : 1 };
Engine.GUI.EVENTS = { SELECTION : 0 };
Engine.GUI.ALIGN = { LEFT : 'left', RIGHT : 'right', CENTER : 'center'  };


Engine.GUI.GuiElement = function(parentItem)
{
  Engine.Item.call(this);

  this.guiId = null;

  if (parentItem != undefined)
    this.setParent(parentItem);
  else
    this.guiId = 'globalGUI';

  this.inputCallbacks = { }; // { keyCode : callback_function }

  this.guiElements = { }; // { "id" : guiElement object}

  this.blink = false;
}

Engine.GUI.GuiElement.prototype = Object.create(Engine.Item.prototype);
Engine.GUI.GuiElement.prototype.constructor = Engine.GUI.GuiElement;


Engine.GUI.GuiElement.prototype.initialize = function()
{
  Engine.Item.prototype.initialize.call(this);
}

Engine.GUI.GuiElement.prototype.activate = function()
{
  Engine.Item.prototype.activate.call(this);
}

Engine.GUI.GuiElement.prototype.draw = function(ctx)
{
  Engine.Item.prototype.draw.call(this, ctx);
}

Engine.GUI.GuiElement.prototype.step = function(dt)
{
  Engine.Item.prototype.step.call(this, dt);
}

Engine.GUI.GuiElement.prototype.setBlink = function(value)
{
  var scene = this.getParentScene();

  if (scene == null)
    return;

  if (value == true)
  {
    this.blink = true;
    scene.clock.suscribe(this.guiId + '_clock', this, 'blinkStep', 350);
  }
  else
  {
    this.blink = false;
    this.setVisible(true);
    scene.clock.unsuscribe(this.guiId + '_clock');
  }
}

Engine.GUI.GuiElement.prototype.blinkStep = function()
{
  if ((this.blink == true) && (this.getVisible() == true))
    this.setVisible(false);
  else if ((this.blink == true) && (this.getVisible() == false))
    this.setVisible(true);
  // Should not happen, ever
  else if (this.blink == false)
    this.setVisible(true);
}

Engine.GUI.GuiElement.prototype.addInputCallback = function(key, callback)
{
  var scene = this.getParentScene();

  if (scene == null)
    return;

  scene.input.addKeyListener( this, 'eventKeyPressed', [ key ], true ); // true == inform in pause too

  this.inputCallbacks[key] = callback;
}

Engine.GUI.GuiElement.prototype.eventKeyPressed = function(keyCode)
{
  // engine.logs.log('Gui.eventKeyPressed', 'Key Pressed: ' + keyCode);

  if ( this.inputCallbacks[keyCode] != undefined)
    this.inputCallbacks[keyCode]();
}

Engine.GUI.GuiElement.prototype.getElement = function(id)
{
  var ret = this.guiElements[id];
  if (ret != undefined)
    return ret;
  return null;
}
Engine.GUI.GuiElement.prototype.get = function(id) { return this.getElement(id); }

Engine.GUI.GuiElement.prototype.attachItem = function(what, id)
{
  this.guiElements[id] = what;
  what.guiId = id;
  // this.guiElementsIds = Object.keys(this.guiElements);

  Engine.Item.prototype.attachItem.call(this, what);
}

Engine.GUI.GuiElement.prototype.detachItem = function(id)
{
  if (id != undefined)
  {
    Engine.Item.prototype.detachItem.call(this, this.get(id));

    delete this.guiElements[id];

    // this.guiElementsIds = Object.keys(this.guiElements);  
  }
}

Engine.GUI.GuiElement.prototype.detachAllItems = function()
{
  var keys = Object.keys(this.guiElements);

  for (var i = 0, len = keys.length; i < len; i++) 
  {
    // Recursive in-depth
    this.guiElements[keys[i]].detachAllItems();
    this.detachItem(keys[i]);
  }

  this.guiElements = { };
  // this.guiElementsIds = [];

  this._finalizeRemoved();

  // Don't, in GUI the elements are detached by id, not by object
  // Engine.Item.prototype.detachAllItems.call(this);
}

Engine.GUI.GuiElement.prototype._resetItems = function()
{
  this.attachedItems.length = 0;
  this.guiElements = { };
}

Engine.GUI.GuiText = function(txt, x, y)
{
  Engine.GUI.GuiElement.call(this);

  this.text = txt;
  this.font = 'BaseFont,"Courier New"';
  this.fontSize = 20;
  this.fontColor = '#FFFFFF'; // white
  this.fontBorderColor = '#000000'; // black
  this.textAlign = Engine.GUI.ALIGN.LEFT;

  // to avoid magic numbers which really does not fit with 
  // different fonts
  this.verticalOffset = 20;
  this.horizontalOffset = 10;

  if ((x == undefined) || (y == undefined))
  {
    this.size.x = 100;
    this.size.y = 30;
  }
  else
  {
    this.size.x = x;
    this.size.y = y;
  }

  // New GuiText version with its own canvas
  this._canvasRendering = true;
  this._innerCanvas = document.createElement('canvas');
  this._innerCanvas.width  = this.size.x;
  this._innerCanvas.height = this.size.y;
  this._innerContext = this._innerCanvas.getContext('2d');
  // Should re-render the canvas?
  this._innerChange  = true;
}

Engine.GUI.GuiText.prototype = Object.create(Engine.GUI.GuiElement.prototype);
Engine.GUI.GuiText.prototype.constructor = Engine.GUI.GuiText;


Engine.GUI.GuiText.prototype.initialize = function()
{
  Engine.GUI.GuiElement.prototype.initialize.call(this);
}

Engine.GUI.GuiText.prototype.activate = function()
{
  Engine.GUI.GuiElement.prototype.activate.call(this);
}

// Mask Item.getSize
// Engine.GUI.GuiText.prototype.getSize = function()
// {
//   var size = Engine.GUI.GuiElement.prototype.getSize.call(this);

//   // Be sure the size is never zero, or we will have an exception
//   // when trying to render the innerCanvas
//   if ((size.x == 0) || (size.y == 0))
//     return new Engine.MATH.Point(100, 30);
//   else
//     return size;
// }

Engine.GUI.GuiText.prototype.setSize = function(x, y)
{
  Engine.GUI.GuiElement.prototype.setSize.call(this, x, y);
  this._innerCanvas.width  = this.size.x;
  this._innerCanvas.height = this.size.y;
  this._innerChange = true;
}

// Mask Item.getPosition
// Engine.GUI.GuiText.prototype.getPosition = function()
// {
//   if (this.getParent() != undefined)
//   {
//     return this.getParent().getPosition();
//   }

//   return new Engine.MATH.Point(0, 0);
// }

Engine.GUI.GuiText.prototype.setText = function(txt)
{
  if (this.text == txt)
    return;

  this.text = txt;
  this._innerChange = true;
}

Engine.GUI.GuiText.prototype._updateInnerRender = function()
{
  var pos = this.getPosition();
  var size = this.getSize();
  var scale = this.getScaling();

  var where = new Engine.MATH.Point(this.horizontalOffset, this.verticalOffset);

  if (this.textAlign == Engine.GUI.ALIGN.CENTER)
  {
    where.x = this.size.x / 2;
  }
  else if (this.textAlign == Engine.GUI.ALIGN.RIGHT)
  {
    where.x = this.size.x - this.horizontalOffset;
  }

  this._innerContext.clearRect(0, 0, this.size.x, this.size.y);
  this._innerContext.strokeStyle = this.fontBorderColor;
  this._innerContext.fillStyle   = this.fontColor;
  this._innerContext.textAlign   = this.textAlign;     
  this._innerContext.font        = 'bold '+this.fontSize+'px '+this.font;

  this._innerContext.strokeText(this.text, where.x, where.y); 
  this._innerContext.fillText(this.text, where.x, where.y); 

  this._innerChange = false;
}

Engine.GUI.GuiText.prototype.draw = function(ctx)
{
  if (this.getVisible() == true)
  {
    var pos = this.getPosition();
    var size = this.getSize();

    if (this._canvasRendering == false)
    {
      // var scale = this.getScaling();
      var offset = new Engine.MATH.Point(this.horizontalOffset, this.verticalOffset);

      if (this.textAlign == Engine.GUI.ALIGN.CENTER)
      {
        offset.x = this.size.x / 2;
      }
      else if (this.textAlign == Engine.GUI.ALIGN.RIGHT)
      {
        offset.x = this.size.x - this.horizontalOffset;
      }

      ctx.strokeStyle = this.fontBorderColor;
      ctx.fillStyle = this.fontColor;
      ctx.textAlign = this.textAlign;     
      ctx.font = 'bold '+this.fontSize+'px '+this.font;

      ctx.strokeText( this.text, 
                      pos.x - (size.x / 2) + offset.x, 
                      pos.y - (size.y / 2) + offset.y);

      ctx.fillText( this.text,
                    pos.x - (size.x / 2) + offset.x, 
                    pos.y - (size.y / 2) + offset.y);
    }
    else
    {    
      if (this._innerChange == true)
        this._updateInnerRender();

      ctx.drawImage(this._innerCanvas, pos.x - this.size.x / 2, pos.y - this.size.y / 2);
    }
  }

  // Call inherited function 
  Engine.GUI.GuiElement.prototype.draw.call(this, ctx);
}

Engine.GUI.GuiText.prototype.step = function(dt)
{
  // Call inherited function 
  Engine.GUI.GuiElement.prototype.step.call(this, dt);
}

Engine.GUI.GuiText.prototype.setFont = function(font) { this.font = font; }
Engine.GUI.GuiText.prototype.setFontSize = function(size) { this.fontSize = size; }
Engine.GUI.GuiText.prototype.setFontColor = function(color) { this.fontColor = color; }
Engine.GUI.GuiText.prototype.setFontBorderColor = function(color) { this.fontBorderColor = color; }
Engine.GUI.GuiText.prototype.setAlign = function(align) { this.textAlign = align; }
Engine.GUI.GuiText.prototype.setCanvasRendering = function(value) { this._canvasRendering = value; }
Engine.GUI.GuiText.prototype.setVerticalOffset = function(offset) { this.verticalOffset = offset; }
Engine.GUI.GuiText.prototype.setHorizontalOffset = function(offset) { this.horizontalOffset = offset; }


Engine.GUI.GuiConsole = function(txt)
{
  Engine.GUI.GuiElement.call(this);

  this._texts = {}; // { id : [ 'text to show on scene', GuiText object, insertionTime ] }
  this._textKeys = []; // keys of this._texts
  this._textsToRemove = [];

  this.order = Engine.GUI.ORDENATION.DOWN;
}

Engine.GUI.GuiConsole.prototype = Object.create(Engine.GUI.GuiElement.prototype);
Engine.GUI.GuiConsole.prototype.constructor = Engine.GUI.GuiConsole;


Engine.GUI.GuiConsole.prototype.initialize = function()
{
  Engine.GUI.GuiElement.prototype.initialize.call(this);
}

Engine.GUI.GuiConsole.prototype.activate = function()
{
  Engine.GUI.GuiElement.prototype.activate.call(this);
}

Engine.GUI.GuiConsole.prototype.draw = function(ctx)
{
  var len = this._textKeys.length;

  if (len == 0)
    return;

  // var pos = this.getPosition();
  var yPos = 0;
  var xPos = 0;

  var now = new Date().getTime();

  for (var i = 0; i < len; i++)
  {
    var textInfo = this._texts[this._textKeys[i]];

    var text = textInfo[1];
    var time = textInfo[2];

    // Delete old messages
    if (time + 2000 < now)
    {
      // just marked as "toRemove"
      this._textsToRemove.push(this._textKeys[i]);
      // this.detachItem(text);
    }
    else
    {
      text.setPosition(xPos, yPos);
      // text.draw(ctx);

      if (this.order == Engine.GUI.ORDENATION.DOWN)
        yPos = yPos + 20;
      else
        yPos = yPos - 20;
    }
  }

  // Call inherited function 
  Engine.GUI.GuiElement.prototype.draw.call(this, ctx);
}

Engine.GUI.GuiConsole.prototype.step = function(dt)
{
  // Call inherited function 
  Engine.GUI.GuiElement.prototype.step.call(this, dt);

  var len = this._textsToRemove.length;

  if (len > 0)
  {
    for (var i = 0; i < len; i++) 
    {
      this.detachItem(this._textsToRemove[i]);
      delete this._texts[this._textsToRemove[i]];
    }

    this._textKeys = Object.keys(this._texts);
    this._textsToRemove = [];
  }
}

Engine.GUI.GuiConsole.prototype.addText = function(key, text)
{
  if (this._texts[key] != undefined)
  {
    if (this._texts[key][0] != text)
    {
      this._texts[key][0] = text;
      this._texts[key][1].setText(text); // Same GuiText object
    }
    this._texts[key][2] = new Date().getTime();
  }
  else
  {
    var txt = new Engine.GUI.GuiText(text, this.size.x, this.size.y);
    txt.setSize(this.size.x, this.size.y);
    // Save time of last text addition
    this._texts[key] = [ text, txt, new Date().getTime() ];
    this._textKeys = Object.keys(this._texts);

    this.attachItem(txt, key);
  }
}

Engine.GUI.GuiMenu = function(txt)
{
  Engine.GUI.GuiElement.call(this);

  this._menuOptions = {}; // { id : [ 'text to show on scene', GuiText object, object to inform ] }
  this._menuIds = []; // keys of this._menuOptions

  this.currentOption = 0; // index of _menuOptions currently selected

  this.selector = new Engine.GUI.GuiElement();
  this.selector.setImage('selector');
  this.selector.setPosition(0, -5);
  this.attachItem(this.selector);
}

Engine.GUI.GuiMenu.prototype = Object.create(Engine.GUI.GuiElement.prototype);
Engine.GUI.GuiMenu.prototype.constructor = Engine.GUI.GuiMenu;


Engine.GUI.GuiMenu.prototype.initialize = function()
{
  Engine.GUI.GuiElement.prototype.initialize.call(this);
}

Engine.GUI.GuiMenu.prototype.activate = function()
{
  Engine.GUI.GuiElement.prototype.activate.call(this);

  this.selector.setBlink(true);

  var scene = this.getParentScene();

  if (scene == null)
    return;

  scene.input.addKeyListener( this, 'eventKeyPressed', [ Engine.INPUT.KEYS.UP, Engine.INPUT.KEYS.DOWN, Engine.INPUT.KEYS.ENTER ], true ); 
}

Engine.GUI.GuiMenu.prototype.draw = function(ctx)
{
  var len = this._menuIds.length;

  if (len == 0)
    return;

  // var pos = this.getPosition();
  var size = this.getSize();
  var yPos = 0;
  var xPos = 0;

  for (var i = 0; i < len; i++)
  {
    var textInfo = this._menuOptions[this._menuIds[i]];
    var text = textInfo[1];

    text.setPosition(xPos, yPos);
    // text.draw(ctx);

    if (i == this.currentOption)
      this.selector.setPosition( - size.x/2 - 10, yPos);

    yPos = yPos + 20;
  }

  // Call inherited function 
  Engine.GUI.GuiElement.prototype.draw.call(this, ctx);
}

Engine.GUI.GuiMenu.prototype.step = function(dt)
{
  // Call inherited function 
  Engine.GUI.GuiElement.prototype.step.call(this, dt);
}

Engine.GUI.GuiMenu.prototype.addMenuOption = function(id, text, ob)
{
  // this._menuOptions.push( { 
  //   id : ident, 
  //   text : txt, 
  //   guiOb : new Engine.GUI.GuiText(txt, this.size.x, this.size.y),
  //   object : ob 
  // } );


  if (this._menuOptions[id] != undefined)
  {
    if (this._menuOptions[id][0] != text)
    {
      this._menuOptions[id][0] = text;
      this._menuOptions[id][1].setText(text); // Same GuiText object
    }
    this._menuOptions[id][2] = new Date().getTime();
  }
  else
  {
    var txt = new Engine.GUI.GuiText(text, this.size.x, this.size.y);
    txt.setSize(this.size.x, this.size.y);
    // Save time of last text addition
    this._menuOptions[id] = [ text, txt, ob ];
    this._menuIds = Object.keys(this._menuOptions);

    // So step and draw are autocalled
    this.attachItem(txt, id);
  }
}

Engine.GUI.GuiMenu.prototype.eventKeyPressed = function(keyCode)
{
  if (keyCode == Engine.INPUT.KEYS.UP)
  {
    if (this.currentOption > 0)
      this.currentOption--;
  }
  else if (keyCode == Engine.INPUT.KEYS.DOWN)
  {
    if (this.currentOption < this._menuIds.length-1)
      this.currentOption++;
  }
  else if (keyCode == Engine.INPUT.KEYS.ENTER)
  {
    var option = this._menuOptions[ this._menuIds[ this.currentOption ] ];

    if (option[2] != undefined)
      if (option[2].eventGuiAction)
        option[2].eventGuiAction(this.guiId, Engine.GUI.EVENTS.SELECTION, this._menuIds[ this.currentOption ])
  }
}




Engine.GUI.GuiNumberMenu = function(txt)
{
  Engine.GUI.GuiElement.call(this);

  this._menuOptions = {}; // { id : [ 'text to show on scene', GuiText object, object to inform ] }
  this._menuIds = []; // keys of this._menuOptions

  this._optionsPlaced = false;
}

Engine.GUI.GuiNumberMenu.prototype = Object.create(Engine.GUI.GuiElement.prototype);
Engine.GUI.GuiNumberMenu.prototype.constructor = Engine.GUI.GuiNumberMenu;


Engine.GUI.GuiNumberMenu.prototype.initialize = function()
{
  Engine.GUI.GuiElement.prototype.initialize.call(this);
}

Engine.GUI.GuiNumberMenu.prototype.activate = function()
{
  Engine.GUI.GuiElement.prototype.activate.call(this);

  var scene = this.getParentScene();

  if (scene == null)
    return;

  // Build a list with the keys we will use to select from the menu
  var keyList = [];

  switch (this._menuIds.length)
  {
    case 9:
      keyList.push( Engine.INPUT.KEYS.NINE );
    case 8:
      keyList.push( Engine.INPUT.KEYS.EIGHT );
    case 7:
      keyList.push( Engine.INPUT.KEYS.SEVEN );
    case 6:
      keyList.push( Engine.INPUT.KEYS.SIX );
    case 5:
      keyList.push( Engine.INPUT.KEYS.FIVE );
    case 4:
      keyList.push( Engine.INPUT.KEYS.FOUR );
    case 3:
      keyList.push( Engine.INPUT.KEYS.THREE );
    case 2:
      keyList.push( Engine.INPUT.KEYS.TWO );
    case 1:
      keyList.push( Engine.INPUT.KEYS.ONE );
    default:
      break;
  }

  // Listen to all the keys
  scene.input.addKeyListener( this, 'eventKeyPressed', keyList, true ); 

  // Touch areas
  if (engine.device.isTouchDevice)
  {
    // Be sure every text is in their position
    this.placeOptions();

    for (var i = 0, len = this._menuIds.length; i < len; i++)
    {
      var textInfo = this._menuOptions[this._menuIds[i]];
      var text = textInfo[2];

      scene.input.addClickZone('number_menu_' + this.guiId + '_' + i, 
        text.getPosition(),
        text.getSize(),
        engine.input.convertNumberToKey(i + 1));
    }     
  }
}

Engine.GUI.GuiNumberMenu.prototype.placeOptions = function()
{
  var len = this._menuIds.length;

  if (len == 0)
    return;

  // var pos = this.getPosition();
  var size = this.getSize();
  var yPos = 0;
  var xPos = 0;

  for (var i = 0; i < len; i++)
  {
    var textInfo = this._menuOptions[this._menuIds[i]];
    var text = textInfo[2];

    text.setPosition(xPos, yPos);
    // text.draw(ctx);

    if (engine.device.isTouchDevice == true)
      yPos = yPos + 50;
    else
      yPos = yPos + 20;
  }  

  this._optionsPlaced = true;
}


Engine.GUI.GuiNumberMenu.prototype.draw = function(ctx)
{
  if (this._optionsPlaced == false)
    this.placeOptions();

  // Call inherited function 
  Engine.GUI.GuiElement.prototype.draw.call(this, ctx);
}

Engine.GUI.GuiNumberMenu.prototype.step = function(dt)
{
  // Call inherited function 
  Engine.GUI.GuiElement.prototype.step.call(this, dt);
}

Engine.GUI.GuiNumberMenu.prototype.addMenuOption = function(id, text, ob)
{
  // this._menuOptions.push( { 
  //   id : ident, 
  //   text : txt, 
  //   guiOb : new Engine.GUI.GuiText(txt, this.size.x, this.size.y),
  //   object : ob 
  // } );

  this._optionsPlaced = false;

  if (this._menuOptions[id] != undefined)
  {
    if (this._menuOptions[id][0] != text)
    {
      this._menuOptions[id][0] = text;
      this._menuOptions[id][1].setText(text); // Same GuiText object
    }
    this._menuOptions[id][2] = new Date().getTime();
  }
  else
  {
    var position = this._menuIds.length;

    var txt = new Engine.GUI.GuiText( '' + (position + 1) + ' - ' + text, this.size.x, this.size.y);
    txt.setSize(this.size.x, this.size.y);
    // Save time of last text addition
    this._menuOptions[ position.toString() ] = [ id, text, txt, ob ];
    this._menuIds = Object.keys(this._menuOptions);

    // So step and draw are autocalled
    this.attachItem(txt, id);
  }
}

Engine.GUI.GuiNumberMenu.prototype.eventKeyPressed = function(keyCode)
{
  var number = engine.input.convertKeyToNumber(keyCode);

  // Should not happen
  if (number > this._menuIds.length)
    return;

  var id = (number - 1).toString();
  var option = this._menuOptions[ this._menuIds[ id ] ];

  if (option[3] != undefined)
    if (option[3].eventGuiAction)
      option[3].eventGuiAction(this.guiId, Engine.GUI.EVENTS.SELECTION, option[0]);

}




Engine.GUI.GuiWindow = function(txt)
{
  Engine.GUI.GuiElement.call(this);

  this.size.x = 200;
  this.size.y = 100;
}

Engine.GUI.GuiWindow.prototype = Object.create(Engine.GUI.GuiElement.prototype);
Engine.GUI.GuiWindow.prototype.constructor = Engine.GUI.GuiWindow;


Engine.GUI.GuiWindow.prototype.initialize = function()
{
  Engine.GUI.GuiElement.prototype.initialize.call(this);
}

Engine.GUI.GuiWindow.prototype.activate = function()
{
  Engine.GUI.GuiElement.prototype.activate.call(this);
}

Engine.GUI.GuiWindow.prototype.draw = function(ctx)
{
  var pos =   this.getPosition();
  var size =  this.getSize();
  var scale = this.getScaling();

  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.fillRect( pos.x - (size.x / 2) * scale.x + 1, 
                pos.y - (size.y / 2) * scale.y + 1, 
                size.x * scale.x - 2, 
                size.y * scale.y - 2);

  ctx.lineWidth = 1;
  ctx.strokeStyle = 'grey';
  ctx.strokeRect( pos.x - (size.x / 2) * scale.x, 
                  pos.y - (size.y / 2) * scale.y, 
                  size.x * scale.x, 
                  size.y * scale.y);

  Engine.GUI.GuiElement.prototype.draw.call(this, ctx);
}

Engine.GUI.GuiWindow.prototype.step = function(dt)
{
  Engine.GUI.GuiElement.prototype.step.call(this, dt);
}





Engine.GUI.GuiButton = function(txt)
{
  Engine.GUI.GuiElement.call(this);

  this.buttonToEmulate = null;

  this.spriteName = '';
  this.image      = null;
}

Engine.GUI.GuiButton.prototype = Object.create(Engine.GUI.GuiElement.prototype);
Engine.GUI.GuiButton.prototype.constructor = Engine.GUI.GuiButton;


Engine.GUI.GuiButton.prototype.initialize = function(button)
{
  Engine.GUI.GuiElement.prototype.initialize.call(this);

  if (button != undefined)
    this.buttonToEmulate = button;
}

Engine.GUI.GuiButton.prototype.activate = function()
{
  Engine.GUI.GuiElement.prototype.activate.call(this);

  var scene = this.getParentScene();
  var pos = this.getPosition();

  // Add touch area to the scene input controller
  scene.input.addClickZone('button_zone_' + this.guiId, 
    pos,
    this.getSize(),
    this.buttonToEmulate);

  if (this.spriteName != '')
  {
    if (this.image == null)
      this.image = new Engine.GUI.GuiElement();

    this.image.setPosition(0, 0);
    this.image.setImage(this.spriteName);
    this.attachItem(this.image);    
  }

  // Listen to all the keys
  // scene.input.addKeyListener( this, 'eventKeyPressed', keyList, true ); 
}

Engine.GUI.GuiButton.prototype.setButtonToEmulate = function(button)
{
  this.buttonToEmulate = button;
}

Engine.GUI.GuiButton.prototype.draw = function(ctx)
{
  Engine.GUI.GuiElement.prototype.draw.call(this, ctx);
}

Engine.GUI.GuiButton.prototype.step = function(dt)
{
  Engine.GUI.GuiElement.prototype.step.call(this, dt);
}

Engine.Background = function()
{ 
  Engine.Item.call(this);

  this.backgroundType = 'image'; // { color, image }

  this.color = 'black';
  this.spriteName = null;

  this.position.x = engine.core.size.x / 2;
  this.position.y = engine.core.size.y / 2;

  this.pauseScroll = false;

  this.verticalScroll = false;
  this.verticalOffset = 0;
  this.verticalSpeed = 0;
  this.horizontalScroll = false;
  this.horizontalOffset = 0;
  this.horizontalSpeed = 0;
}

Engine.Background.prototype = Object.create(Engine.Item.prototype);
Engine.Background.prototype.constructor = Engine.Background;


Engine.Background.prototype.initialize = function()
{
  Engine.Item.prototype.initialize.call(this);
}

Engine.Background.prototype.activate = function()
{
  Engine.Item.prototype.activate.call(this);  

  this.verticalOffset = 0;
  this.horizontalOffset = 0;
}

Engine.Background.prototype.step = function(dt) 
{
  Engine.Item.prototype.step.call(this, dt);

  // Not necessary if there are no animations, but here it is
  // if (this.spriteName != null)
  //   engine.sprites.step(dt, this);

  if (this.pauseScroll == false)
  {
    // Calculate the offset if we have scroll
    // Note: vertical OR horizontal scroll, NOT both
    if (this.verticalScroll == true)
    {
      this.verticalOffset += this.verticalSpeed * dt / engine.core.TIME_PER_FRAME;
      this.verticalOffset = Math.floor(this.verticalOffset % engine.core.size.y);  
    }
    else if (this.horizontalScroll == true)
    {
      this.horizontalOffset += this.horizontalSpeed * dt / engine.core.TIME_PER_FRAME;
      this.horizontalOffset = Math.floor(this.horizontalOffset % engine.core.size.x);
    }
  }
}

Engine.Background.prototype.draw = function(ctx) 
{
  if (this.backgroundType == 'color')
  {
    ctx.fillStyle = this.color;
    ctx.fillRect(0,0, engine.core.size.x, engine.core.size.y);
  }
  else if (this.backgroundType == 'image') 
  {
    if (this.verticalScroll == true)
    {
      var intOffset = Math.floor(this.verticalOffset);
      var remaining = engine.core.size.y - intOffset;

      // Draw the top half of the background
      if(intOffset > 0) 
      {

        ctx.drawImage(engine.sprites.getImage(this.spriteName),
                  0, remaining,
                  engine.core.size.x, intOffset,
                  0, 0,
                  engine.core.size.x, intOffset);
      }

      // Draw the bottom half of the background
      if(remaining > 0) 
      {
        ctx.drawImage(engine.sprites.getImage(this.spriteName),
                0, 0,
                engine.core.size.x, remaining,
                0, intOffset,
                engine.core.size.x, remaining);
      }  
    }
    else if (this.horizontalScroll == true)
    {
      var intOffset = Math.floor(this.horizontalOffset);
      var remaining = engine.core.size.x - intOffset;

      // Draw the right half of the background (left side of the image)
      if(intOffset > 0) 
      {

        ctx.drawImage(engine.sprites.getImage(this.spriteName),
                  0, 0,
                  intOffset, engine.core.size.y,
                  remaining, 0,
                  intOffset, engine.core.size.y);
      }

      // Draw the left half of the background (right side of the image)
      if(remaining > 0) 
      {
        ctx.drawImage(engine.sprites.getImage(this.spriteName),
                intOffset, 0,
                remaining, engine.core.size.y,
                0, 0,
                remaining, engine.core.size.y);
      }    
    }
    else
    {
      // ctx, object
      // draw itself without using the parent draw function (Item.draw)
      engine.sprites.draw(ctx, this);
    }

    // Engine.Item.prototype.draw.call(this, ctx);
  }
}

Engine.Scene = function()
{
  Engine.Item.call(this);

  this.playable    = false; // This screen is playable
  this.backgrounds = [];    

  this.isCurrent   = false; // Is the screen being used now

  this.gui         = new Engine.GUI.GuiElement(this); // Different Gui for each scene

  this.clock       = new Engine.UnalignedClock();
  this.input       = new Engine.INPUT.SceneInput();
}

Engine.Scene.prototype = Object.create(Engine.Item.prototype);
Engine.Scene.prototype.constructor = Engine.Scene;


Engine.Scene.prototype.initialize = function()
{
  Engine.Item.prototype.initialize.call(this);

  this.gui.initialize();
  this.clock.initialize();
  this.input.initialize();
}

Engine.Scene.prototype.activate = function()
{
  Engine.Item.prototype.activate.call(this);

  this.gui.activate();
  this.clock.activate();
  this.input.activate();

  for (var i = 0, len = this.backgrounds.length; i < len; i++) 
    this.backgrounds[i].activate();
}

Engine.Scene.prototype.draw = function(ctx)
{
  // Test for safety: clean the full scene
  // If everything is well coded in the game, in theory this could be removed
  ctx.clearRect(0, 0, engine.core.size.x, engine.core.size.y);  

  for (var i = 0, len = this.backgrounds.length; i < len; i++) 
    this.backgrounds[i].draw(ctx);

  Engine.Item.prototype.draw.call(this, ctx);

  this.gui.draw(ctx);
}

Engine.Scene.prototype.step = function(dt)
{
  for (var i = 0, len = this.backgrounds.length; i < len; i++) 
  {
    this.backgrounds[i].step(dt);
  }

  this.clock.step(dt);

  Engine.Item.prototype.step.call(this, dt);

  this.gui.step(dt);
}

Engine.Scene.prototype.addBackground = function(background)
{
  this.backgrounds.push(background);
}

Engine.Preloader = function()
{
  Engine.Scene.call(this);

  this.timeStarted      = 0;  // timestamp when activate() was called
  this.percentageLoaded = 0;  // Percentage of files loaded
  this.incremental      = 0;  // current loader step in the incrementalLoader function
  this.imageAssets      = []; // Assets to load
  this.totalImages      = 0;  // Number of different images to be loaded
  this.soundAssets      = []; 
  this.totalFonts       = 0;  // Number of fonts to be loaded

  this.message          = null;
}

Engine.Preloader.prototype = Object.create(Engine.Scene.prototype);
Engine.Preloader.prototype.constructor = Engine.Preloader;

Engine.Preloader.prototype.initialize = function()
{
  Engine.Scene.prototype.initialize.call(this);
}

Engine.Preloader.prototype.activate = function()
{
  engine.logs.log('Preloader.activate', 'Loading assets');

  Engine.Scene.prototype.activate.call(this);

  this.timeStarted = new Date().getTime();

  for (var i = 0, len = this.imageAssets.length; i < len; i++) 
  {
    var what = this.imageAssets[i];

    this.addImageToLoad(what);
  }

  for (var i = 0, len = this.soundAssets.length; i < len; i++) 
  {
    var what = this.soundAssets[i];

    this.addSoundToLoad(what);
  }

  this.message = new Engine.GUI.GuiText(engine.localization.get('loaded') + ' ' + this.percentageLoaded + '%', 300, 30);
  this.message.setPosition(engine.core.size.x/2, engine.core.size.y/2 + 100);
  this.message.setAlign(Engine.GUI.ALIGN.CENTER);
  this.message.setVerticalOffset(20);
  // this.message.setFontSize(20);
  this.message.setFontColor('#FF2222');
  this.gui.attachItem(this.message, 'msg_loading');
}

Engine.Preloader.prototype.addAnimation = function(data)
{
  this.imageAssets.push(data);
}

Engine.Preloader.prototype.addSprite = function(data)
{
  // Add information for a complete animation spritesheet, with only
  // one image
  data.xStart = 0;
  data.yStart = 0;
  data.frames = 1;
  data.initFrame = 0;
  data.speed = 0;

  this.addAnimation(data);
}

Engine.Preloader.prototype.addImageToLoad = function(data) 
{
  var image = null;

  // Load only new images
  if (!engine.sprites.imageExists(data.path))
  {
    image = new Image();

    addEvent('load', image, function() { 
      engine.preloader.incrementalLoader(); 
    });

    // src always have to be set after adding the event listener, due to bug in IE8
    if (engine.options.assetsURLPrefix != null)
      image.src = engine.options.assetsURLPrefix + data.path;
    else
      image.src = getProtocolAndHost() + data.path;

    this.totalImages++;

    engine.sprites.addImage(data.path, image);
  }

  // Save only new sprites
  if (!engine.sprites.spriteExists(data.name))
  {
    engine.sprites.addSprite(data.name, data.path, data.xStart, data.yStart, 
                             data.width, data.height, data.frames, data.initFrame, data.speed);
  }
}

Engine.Preloader.prototype.addSound = function(data)
{
  this.soundAssets.push(data);
}

Engine.Preloader.prototype.addSoundToLoad = function(data)
{
  var sound = null;

  // Load only new images
  if (!engine.sounds.soundExists(data.path))
  {
    var path = data.path;

    if (engine.options.assetsURLPrefix != null)
      path = engine.options.assetsURLPrefix + path;
    else
      path = getProtocolAndHost() + path;

    sound = new Audio(path);
    // sound.src = data.path;
    sound.load();

    addEvent('canplaythrough', sound, function() { 
      engine.preloader.incrementalLoader('sound'); 
    });

    engine.sounds.addSound(data.name, data.path, sound);
  }
}

Engine.Preloader.prototype.addFont = function(url, fontFamily, flag)
{
  // load a font asynchonously using the Font.js library
  var font = new Font();

  this.totalFonts++;

  font.onerror = function(err) 
  {
    engine.logs.log('Preloader.addFont', 'Error loading a font: ' + err);
  }
  font.onload = function() 
  {
    engine.logs.log('Preloader.addFont', 'Font loaded');
    engine.preloader.incrementalLoader('font'); 
  }

  font.fontFamily = fontFamily;

  if (typeof flag != 'undefined')
    font.src = url;
  else
  {
    if (engine.options.assetsURLPrefix != null)
      font.src = engine.options.assetsURLPrefix + url;
    else
      font.src = getProtocolAndHost() + url;
  }
}

Engine.Preloader.prototype.incrementalLoader = function(info)
{
  var total = this.totalImages + this.soundAssets.length + this.totalFonts;
  
  this.incremental += 1;

  this.percentageLoaded = Math.floor(this.incremental * 100 / total);
}

Engine.Preloader.prototype.draw = function(ctx)
{
  Engine.Scene.prototype.draw.call(this, ctx);

  // Loading bar
  var barWidth = engine.core.size.x / 3;

  ctx.fillStyle = '#FF2222';
  ctx.fillRect((engine.core.size.x - barWidth) / 2 + 1, 
                  engine.core.size.y/2 + 51, 
                  this.percentageLoaded * barWidth / 100, 15);

  ctx.lineWidth = 2;
  ctx.strokeStyle = '#FFEEEE';
  ctx.strokeRect((engine.core.size.x - barWidth) / 2, 
                  engine.core.size.y/2 + 50, 
                  barWidth + 2, 16);
}

Engine.Preloader.prototype.step = function(dt)
{
  Engine.Scene.prototype.step.call(this, dt);

  this.message.setText( engine.localization.get('loaded') + ' ' + this.percentageLoaded + '%' );

  var timeLived = new Date().getTime() - this.timeStarted;
  
  // At least one second to load resources
  if ((this.percentageLoaded >= 100) && (timeLived > 1000))
  {
    engine.core.activate();
    engine.external('LOADED', null, null);
  }
}

Engine.SceneCollection = function()
{
  this.collection         = null;  // Array in the form scenes[i] = { 'scene': scene, 'name': name }
  this.currentSceneIndex  = null;
  this.currentSceneName   = null;
  this.currentScene       = null;
}

Engine.SceneCollection.prototype.initialize = function()
{
  this.collection         = [];
  this.currentSceneIndex  = 0;
  this.currentSceneName   = '';
  this.currentScene       = null;
}

Engine.SceneCollection.prototype.activate = function()
{
  // Nothing to do here
}

Engine.SceneCollection.prototype.draw = function(ctx)
{
  // Nothing to do here
}

Engine.SceneCollection.prototype.step = function(dt)
{
  // Nothing to do here
}

Engine.SceneCollection.prototype.getCurrentScene = function() 
{ 
  return this.currentScene;
}

// Change an active game scene
// do not use 'this', as this function could be called out
Engine.SceneCollection.prototype.setScene = function(num) 
{ 
  // Old scene
  var oldScene = engine.scenes.currentScene;

  if ((engine.scenes.currentScene != undefined) && (engine.scenes.currentScene != null))
  {
    engine.scenes.currentScene.isCurrent = false;
  }

  engine.core.clearScreen();

  // New scene
  engine.scenes.currentSceneIndex      = num;
  engine.scenes.currentSceneName       = engine.scenes.collection[num].name;
  engine.scenes.currentScene           = engine.scenes.collection[num].scene;
  engine.scenes.currentScene.isCurrent = true;
  engine.scenes.currentScene.activate();
  
  if (engine.game.player != undefined)
    engine.game.player.activate();

  engine.logs.log('Engine.ScreenCollection.setScene', 
                  'Set Scene: ' + engine.scenes.currentSceneName + ' (' + engine.scenes.currentSceneIndex + ')');

  engine.external('SCENE_CHANGE', null, null);
}

Engine.SceneCollection.prototype.addScene = function(scene, name)
{
  engine.logs.log('Engine.ScreenCollection.addScene', 'Add Scene: ' + name);

  scene.isCurrent = false;

  this.collection.push( { 'scene': scene, 'name': name } );
}

Engine.SceneCollection.prototype.insertScene = function(scene, name, num)
{
  scene.isCurrent = false;

  this.collection.splice(num, 0, { 'scene': scene, 'name': name });
}

// do not use 'this', as this function could be called out
Engine.SceneCollection.prototype.advanceScene = function() 
{
  // Not able to advance scene
  if (engine.scenes.currentSceneIndex + 1 >= engine.scenes.collection.length)
    return;

  // engine.logs.log('Engine.ScreenCollection.advanceScene', 'Advance Level', this.currentSceneIndex + 1);
  engine.scenes.setScene(engine.scenes.currentSceneIndex + 1);
}

Engine.SceneCollection.prototype.goBackScene = function() 
{
  // Not able to go back
  if (this.currentSceneIndex - 1 < 0)
    return;

  // engine.logs.log('Engine.ScreenCollection.advanceScene', 'Advance Level', this.currentSceneIndex + 1);
  this.setScene(this.currentSceneIndex - 1);
}

 
Engine.Sprites = function()
{
  // Information related to each sprite, as it was configured in the preloader, indexed by 
  // the sprite id/name
  // sprites[spriteName] = [imagePath, xStart, yStart, width, height, frames, initFrame, speed]
  this.sprites = {};

  // List of Image() objects used in the game, indexed by original URL
  // images[path] = object;
  this.images  = {};
}

Engine.Sprites.SPRITEINFO = {
  PATH : 0,
  XSTART : 1,
  YSTART : 2,
  WIDTH : 3,
  HEIGTH : 4,
  FRAMES : 5,
  INITFRAME : 6,
  FRAMESPEED : 7
}

Engine.Sprites.prototype.initialize = function() 
{ 
  // engine.logs.log('engine.sprites.initialize', 'Initializing sprites Handler');

  this.sprites.length = 0;
  this.images.length = 0;
}

Engine.Sprites.prototype.step = function(dt, object) 
{
  var fps       = this.sprites[object.spriteName][Engine.Sprites.SPRITEINFO.FRAMESPEED];
  var frames    = this.sprites[object.spriteName][Engine.Sprites.SPRITEINFO.FRAMES];
  var initFrame = this.sprites[object.spriteName][Engine.Sprites.SPRITEINFO.INITFRAME];

  // If the item wants to be rendered at different frame speed
  if (object.forceFrameSpeed != 0)
    fps = object.forceFrameSpeed;

  // if frames > 1 -> animation
  if (frames > 1)
  {
    var now = new Date().getTime();

    // If the animation just started
    if (object.timeLastFrame == 0)
      object.timeLastFrame = now;

    // If time enough has passed to change the currentFrame
    if (now - object.timeLastFrame > 1000 / fps)
    {
      var preFrame = object.currentFrame;

      object.currentFrame++;
      
      if (object.currentFrame >= initFrame + frames)
        object.currentFrame = initFrame;

      object.timeLastFrame = now;

      // If the animation restarts, increment loop counter
      if (preFrame == frames - 1) {
        object.numLoops += 1;
        if (object.eventAnimationRestart != undefined)
          object.eventAnimationRestart();
      }
    }
  }
}

Engine.Sprites.prototype.draw = function(ctx, object) 
{
  if (object.getVisible() == false)
    return;

  // sprites[i] -> [imagePath, xStart, yStart, width, height, frames, initFrame, speed]
  var image     = this.sprites[object.spriteName][Engine.Sprites.SPRITEINFO.PATH];
  var xStart    = this.sprites[object.spriteName][Engine.Sprites.SPRITEINFO.XSTART];
  var yStart    = this.sprites[object.spriteName][Engine.Sprites.SPRITEINFO.YSTART];
  var width     = this.sprites[object.spriteName][Engine.Sprites.SPRITEINFO.WIDTH];
  var height    = this.sprites[object.spriteName][Engine.Sprites.SPRITEINFO.HEIGTH];
  var frames    = this.sprites[object.spriteName][Engine.Sprites.SPRITEINFO.FRAMES];

  var position = object.getPosition();

  // Set transparency
  ctx.globalAlpha = object.globalAlpha;

  if (object.rotation.getAngle() != 0)
  {
    ctx.save();

    ctx.translate(position.x, position.y);
    ctx.rotate(object.rotation.getAngle());

    ctx.drawImage(this.images[image],
                  xStart + object.currentFrame * width, yStart, 
                  width, height, 
                  -width/2 * object.scaling.x, -height/2 * object.scaling.y,
                  width * object.scaling.x, height * object.scaling.y);

    ctx.restore();
  }
  // Draw without rotation
  else
  {
    ctx.drawImage(this.images[image],
                  xStart + object.currentFrame * width, yStart, 
                  width, height, 
                  position.x - width / 2 * object.scaling.x, position.y - height / 2 * object.scaling.y,
                  width * object.scaling.x, height * object.scaling.y);
  }

  // restore, just in case
  ctx.globalAlpha = 1;
}

Engine.Sprites.prototype.imageExists = function(path)
{
  return this.images.hasOwnProperty(path);
}

Engine.Sprites.prototype.spriteExists = function(name)
{
  return this.sprites.hasOwnProperty(name);
}

Engine.Sprites.prototype.addImage = function(path, object)
{
  this.images[path] = object;
}

Engine.Sprites.prototype.addSprite = function(name, path, xStart, yStart, width, height, frames, initFrame, speed)
{
  this.sprites[name] = [path, xStart, yStart, width, height, frames, initFrame, speed];
}

// Returns the object to be painted in the context
Engine.Sprites.prototype.getImage = function(spriteName)
{
  // this.sprites[spriteName][0] -> full path from the spriteName
  return this.images[this.sprites[spriteName][Engine.Sprites.SPRITEINFO.PATH]];
}

Engine.Sprites.prototype.getImageFromPath = function(path)
{
  return this.images[path];
}

Engine.Sprites.prototype.getSpriteData = function(spriteName)
{
  var ret = this.sprites[spriteName];

  if (ret != undefined)
      return ret;

  return null;
}

Engine.Sprites.prototype.getSpriteInfo = function(spriteName, value)
{
  var ret = this.sprites[spriteName];

  if (ret != undefined)
  {
    var info = ret[value];

    if (info != undefined)
      return info;
  }

  return null;
}

Engine.Sprites.prototype.getSpriteSize = function(spriteName)
{
  var ret = this.sprites[spriteName];
  var w = 0;
  var h = 0;

  if (ret != undefined)
  {
    w = ret[ Engine.Sprites.SPRITEINFO.WIDTH ];
    h = ret[ Engine.Sprites.SPRITEINFO.HEIGTH ];
  }

  return new Engine.MATH.Point(w,h);    
}


Engine.Sounds = function()
{
  // List of Audio() objects used in the game, indexed by id/name
  // sounds[name] = [object, original_path];
  this.sounds  = {};
}

Engine.Sounds.SOUNDINFO = {
  AUDIOOBJECT : 0,
  ORIGINALPATH : 1,
}

Engine.Sounds.prototype.initialize = function() 
{ 
  // engine.logs.log('engine.sounds.initialize', 'Initializing sound Handler');

  this.sounds.length = 0;
}

Engine.Sounds.prototype.step = function(dt, object) 
{
}

// Engine.Sounds.prototype.draw = function(ctx, object) 
// {
// }

Engine.Sounds.prototype.soundExists = function(path)
{
  var ids = Object.keys(this.sounds);

  for (var i = 0, len = ids.length; i < len; i++)
  {
    if (this.sounds[ids[i]][Engine.Sounds.SOUNDINFO.ORIGINALPATH] == path)
      return true;
  }

  return false;
}

Engine.Sounds.prototype.addSound = function(name, path, object)
{
  this.sounds[name] = [object, path];
}

Engine.Sounds.prototype.get = function(name)
{
  if (this.sounds[name] == undefined)
    return null;

  var sound = this.sounds[name][Engine.Sounds.SOUNDINFO.AUDIOOBJECT];

  // if already playing, clone the Audio object and use the new copy
  if (sound.currentTime > 0)
    sound = sound.cloneNode();

  return sound;
}

// Play the sound now
Engine.Sounds.prototype.play = function(name)
{
  var sound = this.get(name);

  if (sound != null)
  {
    // Sound already playing
    if (sound.currentTime > 0)
      sound.currentTime = 0;

    sound.play();
  }
}

Engine.Player = function ()
{ 
  engine.logs.log('Player.initialize', 'Initializing player object');

  this.avatar = null;
}

Engine.Player.prototype.getAvatar = function()
{
  return this.avatar;
}

Engine.Player.prototype.setAvatar = function(item)
{
  this.avatar = item;
}

Engine.Player.prototype.initialize = function()
{
}

Engine.Player.prototype.activate = function()
{
}

Engine.Player.prototype.step = function(dt)
{
}

Engine.Player.prototype.draw = function(ctx)
{
  // This object is not drawn, its avatar should be 
  // added as an attached item inside any screen
  return;
}



function Okinawa(canvasId, gameClassName, callbackFunction) 
{
  // Global variable
  engine = new Engine();

  // Game initialization

      // parameters: 
      //   1) canvas DOM element id
      //   2) game class name to be instatiated
      //   3) optional callback function to inform of certain events inside the game  

  // check document.readyState: if window is already loaded, the game wouldn't initialize

  if (document.readyState === "complete")
    engine.initialize(canvasId, gameClassName, callbackFunction);
  else
    addEvent('load', window, function() {
      engine.initialize(canvasId, gameClassName, callbackFunction);
    });

  return engine;
}
/**

  Font.js v2012.01.25
  (c) Mike "Pomax" Kamermans, 2012
  Licensed under MIT ("expat" flavour) license.
  Hosted on http://github.com/Pomax/Font.js

  This library adds Font objects to the general pool
  of available JavaScript objects, so that you can load
  fonts through a JavaScript object similar to loading
  images through a new Image() object.

  Font.js is compatible with all browsers that support
  <canvas> and Object.defineProperty - This includes
  all versions of Firefox, Chrome, Opera, IE and Safari
  that were 'current' (Firefox 9, Chrome 16, Opera 11.6,
  IE9, Safari 5.1) at the time Font.js was released.

  Font.js will not work on IE8 or below due to the lack
  of Object.defineProperty - I recommend using the
  solution outlined in http://ie6update.com/ for websites
  that are not corporate intranet sites, because as a home
  user you have no excuse not to have upgraded to Internet
  Explorer 9 yet, or simply not using Internet Explorer if
  you're still using Windows XP. If you have friends or
  family that still use IE8 or below: intervene.

  You may remove every line in this header except for
  the first block of four lines, for the purposes of
  saving space and minification. If minification strips
  the header, you'll have to paste that paragraph back in.

  Issue tracker: https://github.com/Pomax/Font.js/issues

**/

(function(window){

  // 1) Do we have a mechanism for binding implicit get/set?
  if(!Object.defineProperty) {
    throw("Font.js requires Object.defineProperty, which this browser does not support.");
  }

  // 2) Do we have Canvas2D available?
  if(!document.createElement("canvas").getContext) {
    throw("Font.js requires <canvas> and the Canvas2D API, which this browser does not support.");
  }

  // Make sure type arrays are available in IE9
  // Code borrowed from pdf.js (https://gist.github.com/1057924)
  (function(window) {
    try { var a = new Uint8Array(1); return; } catch (e) { }
    function subarray(start, end) { return this.slice(start, end); }
    function set_(array, offset) {
      var i, n = array.length;
      if (arguments.length < 2) { offset = 0; }
      for (i = 0; i < n; ++i, ++offset) { this[offset] = array[i] & 0xFF; }}
    function TypedArray(arg1) {
      var result, i;
      if (typeof arg1 === "number") {
        result = new Array(arg1);
        for (i = 0; i < arg1; ++i) { result[i] = 0; }
      } else { result = arg1.slice(0); }
      result.subarray = subarray;
      result.buffer = result;
      result.byteLength = result.length;
      result.set = set_;
      if (typeof arg1 === "object" && arg1.buffer) {
        result.buffer = arg1.buffer; }
      return result; }
    window.Uint8Array = TypedArray;
    window.Uint32Array = TypedArray;
    window.Int32Array = TypedArray;
  }(window));

  // Also make sure XHR understands typing.
  // Code based on pdf.js (https://gist.github.com/1057924)
  (function(window) {
    // shortcut for Opera - it's already fine
    if(window.opera) return;
    // shortcuts for browsers that already implement XHR minetyping
    if ("response" in XMLHttpRequest.prototype ||
        "mozResponseArrayBuffer" in XMLHttpRequest.prototype ||
        "mozResponse" in XMLHttpRequest.prototype ||
        "responseArrayBuffer" in XMLHttpRequest.prototype) { return; }
    var getter;
    // If we have access to the VBArray (i.e., we're in IE), use that
    if(window.VBArray) {
      getter = function() {
        return new Uint8Array(new VBArray(this.responseBody).toArray()); }}
    // Okay... umm.. untyped arrays? This may break completely.
    // (Android browser 2.3 and 3 don't do typed arrays)
    else { getter = function() { this.responseBody; }}
    Object.defineProperty(XMLHttpRequest.prototype, "response", {get: getter});
  }(window));


  // IE9 does not have binary-to-ascii built in O_O
  if(!window.btoa) {
    // Code borrowed from PHP.js (http://phpjs.org/functions/base64_encode:358)
    window.btoa = function(data) {
      var b64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
      var o1, o2, o3, h1, h2, h3, h4, bits, i = 0, ac = 0, enc = "", tmp_arr = [];
      if (!data) { return data; }
      do { // pack three octets into four hexets
          o1 = data.charCodeAt(i++);
          o2 = data.charCodeAt(i++);
          o3 = data.charCodeAt(i++);
          bits = o1 << 16 | o2 << 8 | o3;
          h1 = bits >> 18 & 0x3f;
          h2 = bits >> 12 & 0x3f;
          h3 = bits >> 6 & 0x3f;
          h4 = bits & 0x3f;
          // use hexets to index into b64, and append result to encoded string
          tmp_arr[ac++] = b64.charAt(h1) + b64.charAt(h2) + b64.charAt(h3) + b64.charAt(h4);
      } while (i < data.length);
      enc = tmp_arr.join('');
      var r = data.length % 3;
      return (r ? enc.slice(0, r - 3) : enc) + '==='.slice(r || 3);
    };
  }

  /**

    Not-borrowed-code starts here!

   **/
  function Font() {
    // if this is not specified, a random name is used
    this.fontFamily = "fjs" + (999999 * Math.random() | 0);
  }

  // the font resource URL
  Font.prototype.url = "";

  // the font's format ('truetype' for TT-OTF or 'opentype' for CFF-OTF)
  Font.prototype.format = "";

  // the font's byte code
  Font.prototype.data = "";

  // custom font, implementing the letter 'A' as zero-width letter.
  Font.prototype.base64 = "AAEAAAAKAIAAAwAgT1MvMgAAAAAAAACsAAAAWGNtYXAA"+
                          "AAAAAAABBAAAACxnbHlmAAAAAAAAATAAAAAQaGVhZAAAA"+
                          "AAAAAFAAAAAOGhoZWEAAAAAAAABeAAAACRobXR4AAAAAA"+
                          "AAAZwAAAAIbG9jYQAAAAAAAAGkAAAACG1heHAAAAAAAAA"+
                          "BrAAAACBuYW1lAAAAAAAAAcwAAAAgcG9zdAAAAAAAAAHs"+
                          "AAAAEAAEAAEAZAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"+
                          "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"+
                          "AAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAABAAMAAQA"+
                          "AAAwABAAgAAAABAAEAAEAAABB//8AAABB////wAABAAAA"+
                          "AAABAAAAAAAAAAAAAAAAMQAAAQAAAAAAAAAAAABfDzz1A"+
                          "AAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAEAAg"+
                          "AAAAAAAAABAAAAAQAAAAEAAAAAAAAAAAAAAAAAAAAAAAA"+
                          "AAAAAAAAAAQAAAAAAAAAAAAAAAAAIAAAAAQAAAAIAAQAB"+
                          "AAAAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAIAHgADAAEEC"+
                          "QABAAAAAAADAAEECQACAAIAAAAAAAEAAAAAAAAAAAAAAA"+
                          "AAAA==";

  // these metrics represent the font-indicated values,
  // not the values pertaining to text as it is rendered
  // on the page (use fontmetrics.js for this instead).
  Font.prototype.metrics = {
    quadsize: 0,
    leading: 0,
    ascent: 0,
    descent: 0,
    weightclass: 400
  };

  // Will this be a remote font, or a system font?
  Font.prototype.systemfont = false;

  // internal indicator that the font is done loading
  Font.prototype.loaded = false;

  /**
   * This function gets called once the font is done
   * loading, its metrics have been determined, and it
   * has been parsed for use on-page. By default, this
   * function does nothing, and users can bind their
   * own handler function.
   */
  Font.prototype.onload = function () {};

  /**
   * This function gets called when there is a problem
   * loading the font.
   */
  Font.prototype.onerror = function () {};

  // preassigned quad × quad context, for measurements
  Font.prototype.canvas = false;
  Font.prototype.context = false;

  /**
   * validation function to see if the zero-width styled
   * text is no longer zero-width. If this is true, the
   * font is properly done loading. If this is false, the
   * function calls itself via a timeout
   */
  Font.prototype.validate = function (target, zero, mark, font, timeout) {
    if (timeout !== false && timeout < 0 ) {
      this.onerror("Requested system font '"+this.fontFamily+"' could not be loaded (it may not be installed).");
      return;
    }
    var width = getComputedStyle(target, null).getPropertyValue("width").replace("px", '');
    // font has finished loading - remove the zero-width and
    // validation paragraph, but leave the actual font stylesheet (mark);
    if (width > 0) {
      document.head.removeChild(zero);
      document.body.removeChild(target);
      this.loaded = true;
      this.onload();
    }
    // font has not finished loading - wait 50ms and try again
    else {
      console.log("timing out");
      setTimeout(function () {
        font.validate(target, zero, mark, font, timeout === false ? false : timeout-50);
      },
      1000);
    }
  };

  /**
   * This gets called when the file is done downloading.
   */
  Font.prototype.ondownloaded = function () {
    var instance = this;

    // decimal to character
    var chr = function (val) {
      return String.fromCharCode(val);
    };

    // decimal to ushort
    var chr16 = function (val) {
      if (val < 256) { return chr(0) + chr(val); }
      var b1 = val >> 8;
      var b2 = val & 0xFF;
      return chr(b1) + chr(b2);
    };

    // decimal to hexadecimal
    // See http://phpjs.org/functions/dechex:382
    var dechex =  function (val) {
      if (val < 0) { val = 0xFFFFFFFF + val + 1; }
      return parseInt(val, 10).toString(16);
    };

    // unsigned short to decimal
    var ushort = function (b1, b2) {
      return 256 * b1 + b2;
    };

    // signed short to decimal
    var fword = function (b1, b2) {
      var negative = b1 >> 7 === 1, val;
      b1 = b1 & 0x7F;
      val = 256 * b1 + b2;
      // positive numbers are already done
      if (!negative) { return val; }
      // negative numbers need the two's complement treatment
      return val - 0x8000;
    };

    // unsigned long to decimal
    var ulong = function (b1, b2, b3, b4) {
      return 16777216 * b1 + 65536 * b2 + 256 * b3 + b4;
    };

    // unified error handling
    var error = function (msg) {
      instance.onerror(msg);
    };

    // we know about TTF (0x00010000) and CFF ('OTTO') fonts
    var ttf = chr(0) + chr(1) + chr(0) + chr(0);
    var cff = "OTTO";

    // so what kind of font is this?
    var data = this.data;
    var version = chr(data[0]) + chr(data[1]) + chr(data[2]) + chr(data[3]);
    var isTTF = (version === ttf);
    var isCFF = (isTTF ? false : version === cff);
    if (isTTF) { this.format = "truetype"; }
    else if (isCFF) { this.format = "opentype"; }
    // terminal error: stop running code
    else { error("Error: file at " + this.url + " cannot be interpreted as OpenType font."); return; }

    // ================================================================
    // if we get here, this is a legal font. Extract some font metrics,
    // and then wait for the font to be available for on-page styling.
    // ================================================================

    // first, we parse the SFNT header data
    var numTables = ushort(data[4], data[5]),
        tagStart = 12, ptr, end = tagStart + 16 * numTables, tags = {},
        tag;
    for (ptr = tagStart; ptr < end; ptr += 16) {
      tag = chr(data[ptr]) + chr(data[ptr + 1]) + chr(data[ptr + 2]) + chr(data[ptr + 3]);
      tags[tag] = {
        name: tag,
        checksum: ulong(data[ptr+4], data[ptr+5], data[ptr+6], data[ptr+7]),
        offset:   ulong(data[ptr+8], data[ptr+9], data[ptr+10], data[ptr+11]),
        length:   ulong(data[ptr+12], data[ptr+13], data[ptr+14], data[ptr+15])
      };
    }

    // first we define a quick error shortcut function:
    var checkTableError = function (tag) {
      if (!tags[tag]) {
        error("Error: font is missing the required OpenType '" + tag + "' table.");
        // return false, so that the result of this function can be used to stop running code
        return false;
      }
      return tag;
    };

    // Then we access the HEAD table for the "font units per EM" value.
    tag = checkTableError("head");
    if (tag === false) { return; }
    ptr = tags[tag].offset;
    tags[tag].version = "" + data[ptr] + data[ptr+1] + data[ptr+2] + data[ptr+3];
    var unitsPerEm = ushort(data[ptr+18], data[ptr+19]);
    this.metrics.quadsize = unitsPerEm;

    // We follow up by checking the HHEA table for ascent, descent, and leading values.
    tag = checkTableError("hhea");
    if (tag===false) { return; }
    ptr = tags[tag].offset;
    tags[tag].version = "" + data[ptr] + data[ptr+1] + data[ptr+2] + data[ptr+3];
    this.metrics.ascent  = fword(data[ptr+4], data[ptr+5]) / unitsPerEm;
    this.metrics.descent = fword(data[ptr+6], data[ptr+7]) / unitsPerEm;
    this.metrics.leading = fword(data[ptr+8], data[ptr+9]) / unitsPerEm;

    // And then finally we check the OS/2 table for the font-indicated weight class.
    tag = checkTableError("OS/2");
    if (tag===false) { return; }
    ptr = tags[tag].offset;
    tags[tag].version = "" + data[ptr] + data[ptr+1];
    this.metrics.weightclass = ushort(data[ptr+4], data[ptr+5]);

    // ==================================================================
    // Then the mechanism for determining whether the font is not
    // just done downloading, but also fully parsed and ready for
    // use on the page for typesetting: we pick a letter that we know
    // is supported by the font, and generate a font that implements
    // only that letter, as a zero-width glyph. We can then test
    // whether the font is available by checking whether a paragraph
    // consisting of just that letter, styled with "desiredfont, zwfont"
    // has zero width, or a real width. As long as it's zero width, the
    // font has not finished loading yet.
    // ==================================================================

    // To find a letter, we must consult the character map ("cmap") table
    tag = checkTableError("cmap");
    if (tag===false) { return; }
    ptr = tags[tag].offset;
    tags[tag].version = "" + data[ptr] + data[ptr+1];
    numTables = ushort(data[ptr+2], data[ptr+3]);

    // For the moment, we only look for windows/unicode records, with
    // a cmap subtable format 4 because OTS (the sanitiser used in
    // Chrome and Firefox) does not actually support anything else
    // at the moment.
    //
    // When http://code.google.com/p/chromium/issues/detail?id=110175
    // is resolved, remember to stab me to add support for the other
    // maps, too.
    //
    var encodingRecord, rptr, platformID, encodingID, offset, cmap314 = false;
    for (var encodingRecord = 0; encodingRecord < numTables; encodingRecord++) {
      rptr = ptr + 4 + encodingRecord * 8;
      platformID = ushort(data[rptr], data[rptr+1]);
      encodingID = ushort(data[rptr+2], data[rptr+3]);
      offset     = ulong(data[rptr+4], data[rptr+5], data[rptr+6], data[rptr+7]);
      if (platformID === 3 && encodingID === 1) { cmap314 = offset; }
    }

    // This is our fallback font - a minimal font that implements
    // the letter "A". We can transform this font to implementing
    // any character between 0x0000 and 0xFFFF by altering a
    // handful of letters.
    var printChar = "A";

    // Now, if we found a format 4 {windows/unicode} cmap subtable,
    // we can find a suitable glyph and modify the 'base64' content.
    if (cmap314 !== false) {

      ptr += cmap314;
      version = ushort(data[ptr], data[ptr+1]);
      if (version === 4) {
        // First find the number of segments in this map
        var segCount = ushort(data[ptr+6], data[ptr+7]) / 2;

        // Then, find the segment end characters. We'll use
        // whichever of those isn't a whitespace character
        // for our verification font, which we check based
        // on the list of Unicode 6.0 whitespace code points:
        var printable = function (chr) {
          return [0x0009,0x000A,0x000B,0x000C,0x000D,0x0020,0x0085,0x00A0,
                   0x1680,0x180E,0x2000,0x2001,0x2002,0x2003,0x2004,0x2005,
                   0x2006,0x2007,0x2008,0x2009,0x200A,0x2028,0x2029,0x202F,
                   0x205F,0x3000].indexOf(chr) === -1; }

        // Loop through the segments in search of a usable character code:
        var i = ptr + 14, e = ptr + 14 + 2 * segCount, endChar = false;
        for (; i < e; i += 2) {
          endChar = ushort(data[i], data[i+1]);
          if (printable(endChar)) { break; }
          endChar = false;
        }

        if (endChar != false) {
          // We now have a printable character to validate with!
          // We need to make sure to encode the correct "idDelta"
          // value for this character, because our "glyph" will
          // always be at index 1 (index 0 is reserved for .notdef).
          // As such, we need to set up a delta value such that:
          //
          //   [character code] + [delta value] == 1
          //
          printChar = String.fromCharCode(endChar);

          var delta = (-(endChar - 1) + 65536) % 65536;

          // Now we need to substitute the values in our
          // base64 font template. The CMAP modification
          // consists of generating a new base64 string
          // for the bit that indicates the encoded char.
          // In our 'A'-encoding font, this is:
          //
          //   0x00 0x41 0xFF 0xFF 0x00 0x00
          //   0x00 0x41 0xFF 0xFF 0xFF 0xC0
          //
          // which is the 20 letter base64 string at [380]:
          //
          //   AABB//8AAABB////wAAB
          //
          // We replace this with our new character:
          //
          //   [hexchar] 0xFF 0xFF 0x00 0x00
          //   [hexchar] 0xFF 0xFF [ delta ]
          //
          // Note: in order to do so properly, we need to
          // make sure that the bytes are base64 aligned, so
          // we have to add a leading 0x00:
          var newcode = chr(0) +                         // base64 padding byte
                        chr16(endChar) + chr16(0xFFFF) + // "endCount" array
                        chr16(0) +                       // cmap required padding
                        chr16(endChar) + chr16(0xFFFF) + // "startCount" array
                        chr16(delta) +                   // delta value
                        chr16(1);                        // delta terminator
          var newhex = btoa(newcode);

          // And now we replace the text in 'base64' at
          // position 380 with this new base64 string:
          this.base64 = this.base64.substring(0, 380) + newhex +
                         this.base64.substring(380 + newhex.length);
        }
      }
    }

    this.bootstrapValidation(printChar, false);
  }

  Font.prototype.bootstrapValidation = function (printChar, timeout) {
    // Create a stylesheet for using the zero-width font:
    var tfName = this.fontFamily+" testfont";
    var zerowidth = document.createElement("style");
    zerowidth.setAttribute("type", "text/css");
    zerowidth.innerHTML =  "@font-face {\n" +
                          "  font-family: '" + tfName + "';\n" +
                          "  src: url('data:application/x-font-ttf;base64," + this.base64 + "')\n" +
                          "       format('truetype');}";
    document.head.appendChild(zerowidth);

    // Create a validation stylesheet for the requested font, if it's a remote font:
    var realfont = false;
    if (!this.systemfont) {
      realfont = this.toStyleNode();
      document.head.appendChild(realfont);
    }

    // Create a validation paragraph, consisting of the zero-width character
    var para = document.createElement("p");
    para.style.cssText = "position: absolute; top: 0; left: 0; opacity: 0;";
    para.style.fontFamily = "'" + this.fontFamily + "', '" + tfName + "'";
    para.innerHTML = printChar + printChar + printChar + printChar + printChar +
                     printChar + printChar + printChar + printChar + printChar;
    document.body.appendChild(para);

    // Quasi-error: if there is no getComputedStyle, claim loading is done.
    if (typeof getComputedStyle === "undefined") {
      this.onload();
      error("Error: getComputedStyle is not supported by this browser.\n" +
            "Consequently, Font.onload() cannot be trusted."); }

    // If there is getComputedStyle, we do proper load completion verification.
    else {
      // If this is a remote font, we rely on the indicated quad size
      // for measurements. If it's a system font there will be no known
      // quad size, so we simply fix it at 1000 pixels.
      var quad = this.systemfont ? 1000 : this.metrics.quadsize;

      // Because we need to 'preload' a canvas with this
      // font, we have no idea how much surface area
      // we'll need for text measurements later on. So
      // be safe, we assign a surface that is quad² big,
      // and then when measureText is called, we'll
      // actually build a quick <span> to see how much
      // of that surface we don't need to look at.
      var canvas = document.createElement("canvas");
      canvas.width = quad;
      canvas.height = quad;
      this.canvas = canvas;

      // The reason we preload is because some browsers
      // will also take a few milliseconds to assign a font
      // to a Canvas2D context, so if measureText is called
      // later, without this preloaded context, there is no
      // time for JavaScript to "pause" long enough for the
      // context to properly load the font, and metrics may
      // be completely wrong. The solution is normally to
      // add in a setTimeout call, to give the browser a bit
      // of a breather, but then we can't do synchronous
      // data returns, and we need a callback just to get
      // string metrics, which is about as far from desired
      // as is possible.
      var context = canvas.getContext("2d");
      context.font = "1em '" + this.fontFamily + "'";
      context.fillStyle = "white";
      context.fillRect(-1, -1, quad+2, quad+2);
      context.fillStyle = "black";
      context.fillText("test text", 50, quad / 2);
      this.context = context;

      // ===================================================
      // Thanks to Opera and Firefox, we need to add in more
      // "you can do your thing, browser" moments. If we
      // call validate() as a straight function call, the
      // browser doesn't get the breathing space to perform
      // page styling. This is a bit mad, but until there's
      // a JS function for "make the browser update the page
      // RIGHT NOW", we're stuck with this.
      // ===================================================

      // We need to alias "this" because the keyword "this"
      // becomes the global context after the timeout.
      var local = this;
      var delayedValidate = function() {
        local.validate(para, zerowidth, realfont, local, timeout);
      };
      setTimeout(delayedValidate, 50);
    }
  };

  /**
   * We take a different path for System fonts, because
   * we cannot inspect the actual byte code.
   */
  Font.prototype.processSystemFont = function () {
    // Mark system font use-case
    this.systemfont = true;
    // There are font-declared metrics to work with.
    this.metrics = false;
    // However, we do need to check whether the font
    // is actually installed.
    this.bootstrapValidation("A", 1000);
  }

  /**
   * This gets called when font.src is set, (the binding
   * for which is at the end of this file).
   */
  Font.prototype.loadFont = function () {
    var font = this;

    // System font?
    if(this.url.indexOf(".") === -1) {
      setTimeout(function(){
        font.processSystemFont();
      }, 10);
      return;
    }

    // Remote font.
    var xhr = new XMLHttpRequest();
    xhr.open('GET', font.url, true);
    xhr.responseType = "arraybuffer";
    xhr.onload = function (evt) {
      var arrayBuffer = xhr.response;
      if (arrayBuffer) {
        font.data = new Uint8Array(arrayBuffer);
        font.ondownloaded();
      } else {
        font.onerror("Error downloading font resource from "+font.url);
      }
    };
    xhr.onerror = function (evt) {
      font.onerror("Error downloading font resource from "+font.url);
    };
    xhr.send(null);
  };

  // The stylenode can be added to the document head
  // to make the font available for on-page styling,
  // but it should be requested with .toStyleNode()
  Font.prototype.styleNode = false;

  /**
   * Get the DOM node associated with this Font
   * object, for page-injection.
   */
  Font.prototype.toStyleNode = function () {
    // If we already built it, pass that reference.
    if (this.styleNode) { return this.styleNode; }
    // If not, build a style element
    this.styleNode = document.createElement("style");
    this.styleNode.type = "text/css";
    var styletext = "@font-face {\n";
       styletext += "  font-family: '" + this.fontFamily + "';\n";
       styletext += "  src: url('" + this.url + "') format('" + this.format + "');\n";
       styletext += "}";
    this.styleNode.innerHTML = styletext;
    return this.styleNode;
  }

  /**
   * Measure a specific string of text, given this font.
   * If the text is too wide for our preallocated canvas,
   * it will be chopped up and the segments measured
   * separately.
   */
  Font.prototype.measureText = function (textString, fontSize) {
    if (!this.loaded) {
      this.onerror("measureText() was called while the font was not yet loaded");
      return false;
    }

    // Set up the right font size.
    this.context.font = fontSize + "px '"+this.fontFamily+"'";

    // Get the initial string width through our preloaded Canvas2D context
    var metrics = this.context.measureText(textString);

    // Assign the remaining default values, because the
    // TextMetrics object is horribly deficient.
    metrics.fontsize = fontSize;
    metrics.ascent  = 0;
    metrics.descent = 0;
    metrics.bounds  = { minx: 0,
                        maxx: metrics.width,
                        miny: 0,
                        maxy: 0 };
    metrics.height = 0;

    // Does the text fit on the canvas? If not, we have to
    // chop it up and measure each segment separately.
    var segments = [],
        minSegments = metrics.width / this.metrics.quadsize;
    if (minSegments <= 1) { segments.push(textString); }
    else {
      // TODO: add the chopping code here. For now this
      // code acts as placeholder
      segments.push(textString);
    }

    // run through all segments, updating the metrics as we go.
    var segmentLength = segments.length, i;
    for (i = 0; i < segmentLength; i++) {
      this.measureSegment(segments[i], fontSize, metrics);
    }
    return metrics;
  };

  /**
   * Measure a section of text, given this font, that is
   * guaranteed to fit on our preallocated canvas.
   */
  Font.prototype.measureSegment = function(textSegment, fontSize, metrics) {
    // Shortcut function for getting computed CSS values
    var getCSSValue = function (element, property) {
      return document.defaultView.getComputedStyle(element, null).getPropertyValue(property);
    };

    // We are going to be using you ALL over the place, little variable.
    var i;

    // For text leading values, we measure a multiline
    // text container as built by the browser.
    var leadDiv = document.createElement("div");
    leadDiv.style.position = "absolute";
    leadDiv.style.opacity = 0;
    leadDiv.style.font = fontSize + "px '" + this.fontFamily + "'";
    var numLines = 10;
    leadDiv.innerHTML = textSegment;
    for (i = 1; i < numLines; i++) {
      leadDiv.innerHTML += "<br/>" + textSegment;
    }
    document.body.appendChild(leadDiv);

    // First we guess at the leading value, using the standard TeX ratio.
    metrics.leading = 1.2 * fontSize;

    // We then try to get the real value based on how
    // the browser renders the text.
    var leadDivHeight = getCSSValue(leadDiv,"height");
    leadDivHeight = leadDivHeight.replace("px","");
    if (leadDivHeight >= fontSize * numLines) {
      metrics.leading = (leadDivHeight / numLines) | 0;
    }
    document.body.removeChild(leadDiv);

    // If we're not with a white-space-only string,
    // this is all we will be able to do.
    if (/^\s*$/.test(textSegment)) { return metrics; }

    // If we're not, let's try some more things.
    var canvas = this.canvas,
        ctx = this.context,
        quad = this.systemfont ? 1000 : this.metrics.quadsize,
        w = quad,
        h = quad,
        baseline = quad / 2,
        padding = 50,
        xpos = (quad - metrics.width) / 2;

    // SUPER IMPORTANT, HARDCORE NECESSARY STEP:
    // xpos may be a fractional number at this point, and
    // that will *complete* screw up line scanning, because
    // cropping a canvas on fractional coordiantes does
    // really funky edge interpolation. As such, we force
    // it to an integer.
    if (xpos !== (xpos | 0)) { xpos = xpos | 0; }

    // Set all canvas pixeldata values to 255, with all the content
    // data being 0. This lets us scan for data[i] != 255.
    ctx.fillStyle = "white";
    ctx.fillRect(-padding, -padding, w + 2 * padding, h + 2 * padding);
    // Then render the text centered on the canvas surface.
    ctx.fillStyle = "black";
    ctx.fillText(textSegment, xpos, baseline);

    // Rather than getting all four million+ subpixels, we
    // instead get a (much smaller) subset that we know
    // contains our text. Canvas pixel data is w*4 by h*4,
    // because {R,G,B,A} is stored as separate channels in
    // the array. Hence the factor 4.
    var scanwidth = (metrics.width + padding) | 0,
        scanheight = 4 * fontSize,
        x_offset = xpos - padding / 2,
        y_offset = baseline-scanheight / 2,
        pixelData = ctx.getImageData(x_offset, y_offset, scanwidth, scanheight).data;

    // Set up our scanline variables
    var i = 0,
        j = 0,
        w4 = scanwidth * 4,
        len = pixelData.length,
        mid = scanheight / 2;

    // Scan 1: find the ascent using a normal, forward scan
    while (++i < len && pixelData[i] === 255) {}
    var ascent = (i / w4) | 0;

    // Scan 2: find the descent using a reverse scan
    i = len - 1;
    while (--i > 0 && pixelData[i] === 255) {}
    var descent = (i / w4) | 0;

    // Scan 3: find the min-x value, using a forward column scan
    for (i = 0, j = 0; j < scanwidth && pixelData[i] === 255;) {
      i += w4;
      if (i >= len) { j++; i = (i - len) + 4; }}
    var minx = j;

    // Scan 3: find the max-x value, using a reverse column scan
    var step = 1;
    for (i = len-3, j = 0; j<scanwidth && pixelData[i] === 255; ) {
      i -= w4;
      if (i < 0) { j++; i = (len - 3) - (step++) * 4; }}
    var maxx = scanwidth - j;

    // We have all our metrics now, so fill in the
    // metrics object and return it to the user.
    metrics.ascent  = (mid - ascent);
    metrics.descent = (descent - mid);
    metrics.bounds  = { minx: minx - (padding / 2),
                        maxx: maxx - (padding / 2),
                        miny: -metrics.descent,
                        maxy: metrics.ascent };
    metrics.height = 1 + (descent - ascent);
    return metrics;
  };

  /**
   * we want Font to do the same thing Image does when
   * we set the "src" property value, so we use the
   * Object.defineProperty function to bind a setter
   * that does more than just bind values.
   */
  Object.defineProperty(Font.prototype, "src", { set: function(url) { this.url=url; this.loadFont(); }});

  /**
   * Bind to global scope
   */
  if(typeof define !== "undefined") {
    define(function() {
      return Font;
    });
  } else {
    window.Font = Font;
  }
}(window));
