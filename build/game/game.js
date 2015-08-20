// game.js built on 2015-06-01-19-21-30

function Game() 
{
  // Generic
  this.options = null;
  this.loader = null;
  this.player = null;

  // Game specific
  this.commonBackground = null;
  this.points = null;
}

Game.prototype.initialize = function()
{
  // The specific game options could be reached as game.options AND as engine.options
  this.options = new Game.Options();
  engine.options.addOptions(this.options);

  // Common background for every screen
  this.commonBackground = new Game.Background();
  this.commonBackground.initialize()

  this.loader = new Game.Loader();
  this.loader.initialize();

  this.player = new Game.Player();
  this.player.initialize();

  this.points = new Game.Points();
  this.points.initialize();
}

// Game Initialization
Game.prototype.activate = function() 
{
  engine.logs.log('Game.activate', 'Starting game');

  var lvl = new Game.SCENES.Initial();
  lvl.addBackground(this.commonBackground);
  lvl.playable = true;
  lvl.initialize();

  engine.scenes.addScene(lvl, 'start_game'); 

  lvl = new Game.SCENES.Level();
  lvl.addBackground(this.commonBackground);
  lvl.playable = true;
  lvl.initialize();

  engine.scenes.addScene(lvl, 'main_game'); 
}

Game.prototype.step = function(dt)
{
  // Only for logic, the avatar and other elements in the scene
  // will be updated via the scene hierarchy
  this.player.step(dt);
}

Game.Loader = function() 
{
}

// Game.Loader Initialization
Game.Loader.prototype.initialize = function() 
{
  // engine.preloader.addAnimation(anim_name, path, 
  // xStart, yStart, width, height, frames, initFrame, speed)

  engine.preloader.addSprite({ name: 'starship', path: 'game/images/ship.png', width: 50, height: 50 });

  // **************
  //  Enemies 
  // **************
  engine.preloader.addSprite({ name: 'meteor', path: 'game/images/meteor.png', width: 60, height: 60 });

  // **************
  //  Shots
  // **************
  engine.preloader.addSprite({ name: 'shot', path: 'game/images/shot.png', width: 10, height: 10 });

  // **************
  //  Effects
  // **************
  engine.preloader.addAnimation({ name: 'explosion', path: 'game/images/effect.explosion.png', 
                           xStart: 0, yStart: 0, width: 48, height: 47, frames: 11, initFrame: 0, speed: 14 });
  engine.preloader.addSprite({ name: 'halo', path: 'game/images/effect.halo.png', width: 63, height: 63 });


  // **************
  //  Sounds
  // **************
  engine.preloader.addSound(({ name: 'explosion', path: 'game/sounds/fridobeck_explosion.mp3' }));
  engine.preloader.addSound(({ name: 'shot', path: 'game/sounds/halgrimm_shot.mp3' }));

  // First screen: preloader with progress bar
  engine.preloader.addBackground(engine.game.commonBackground);
  engine.preloader.initialize(); // Usually empty
  engine.scenes.addScene(engine.preloader, 'preloader');
  engine.scenes.setScene(0);

  engine.localization.addTextsToStringTable('english', this.localization_en());
  engine.localization.addTextsToStringTable('spanish', this.localization_es());  
  engine.localization.selectLanguage(engine.game.options.defaultLanguage);  
}

Game.Loader.prototype.localization_en = function()
{
  return {
    'game_name'       : 'Game',
    'press_spacebar'  : 'Press the spacebar to start',
    'touch_screen'    : 'Touch the screen to continue',
    'points'          : 'Points',
    'accumulated'     : 'Accumulated points',
    'totals'          : 'Total points',
  }
}

Game.Loader.prototype.localization_es = function()
{
  return {
    'game_name'       : 'Juego',
    'press_spacebar'  : 'Pulsa espacio para comenzar',
    'touch_screen'    : 'Toca la pantalla para continuar',  
    'points'          : 'Puntos',
    'accumulated'     : 'Puntos acumulados',
    'totals'          : 'Puntos totales',
  }
}

// Init namespace
Game.SCENES = {};


Game.SCENES.Initial = function() 
{
  Engine.Scene.call(this);
}

Game.SCENES.Initial.prototype = Object.create(Engine.Scene.prototype);
Game.SCENES.Initial.prototype.constructor = Game.SCENES.Initial;

// Will be called after creation of this object
Game.SCENES.Initial.prototype.initialize = function()
{
  Engine.Scene.prototype.initialize.call(this);

  // This object will be listening to the spacebar key
  // When pressed, our eventKeyPressed functions will be called
  this.input.addKeyListener(this, 'eventKeyPressed', [ Engine.INPUT.KEYS.SPACEBAR ]);
}

// Will be called when the scene starts being playable
Game.SCENES.Initial.prototype.activate = function()
{
  var avatar = engine.game.player.getAvatar();

  // Position the player avatar in the proper place
  avatar.setPosition(engine.core.size.x/2, engine.core.size.y/2);

  // Attach the player avatar to this scene
  this.attachItem(avatar);  

  Engine.Scene.prototype.activate.call(this);
}

Game.SCENES.Initial.prototype.draw = function(ctx)
{
  Engine.Scene.prototype.draw.call(this, ctx);
}

Game.SCENES.Initial.prototype.step = function(dt)
{
  Engine.Scene.prototype.step.call(this, dt);
}

Game.SCENES.Initial.prototype.eventKeyPressed = function(keyCode)
{
  if (keyCode == Engine.INPUT.KEYS.SPACEBAR)
    engine.scenes.advanceScene();
}




Game.SCENES.Level = function() 
{
  Engine.Scene.call(this);

  this.timeLastMeteor = 0;
}

Game.SCENES.Level.prototype = Object.create(Engine.Scene.prototype);
Game.SCENES.Level.prototype.constructor = Game.SCENES.Level;

Game.SCENES.Level.prototype.initialize = function()
{
  Engine.Scene.prototype.initialize.call(this);

  // Level GUI
  var points = new Engine.GUI.GuiText();
  points.setSize(250, 30);
  points.setPosition(15 + points.size.x / 2, engine.core.size.y - 15 - points.size.y / 2); // left down 
  points.setText(engine.localization.get('points') + ': 0')
  this.gui.attachItem(points, 'points');  
}

Game.SCENES.Level.prototype.activate = function()
{
  this.attachItem(engine.game.player.getAvatar());

  Engine.Scene.prototype.activate.call(this);
}

Game.SCENES.Level.prototype.draw = function(ctx)
{
  Engine.Scene.prototype.draw.call(this, ctx);
}

Game.SCENES.Level.prototype.step = function(dt)
{
  Engine.Scene.prototype.step.call(this, dt);

  this.checkBoundaries();

  this.checkCollisions();

  var now = new Date().getTime();

  if (now - this.timeLastMeteor > engine.options.meteorPeriodicity)
  {
    this.timeLastMeteor = now;

    var meteor = new Game.ITEMS.Meteor(1, 1.5); // (size, speed)

    var side = Math.floor(Math.random() * 4);
    var angle = Math.random() * Math.PI; // 180 degrees

    switch(side)
    {
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

    var direction = engine.math.angleToDirectionVector(angle);
    direction = direction.normalize();

    meteor.speed.x = direction.x * meteor.linearSpeed;
    meteor.speed.y = direction.y * meteor.linearSpeed;

    this.attachItem(meteor);
  }
}

Game.SCENES.Level.prototype.checkBoundaries = function()
{
  // Reset the list of removed objects
  this._resetRemoved();

  var item;

  for (var i = 0; i < this.getAttachedItems().length; i++) 
  {
    item = this.getAttachedItems()[i];
    
    // Item outside the screen -> remove
    if ((item.position.x > engine.core.size.x + item.size.x) || 
        (item.position.x < 0 - item.size.x) || 
        (item.position.y < 0 - item.size.y) ||
        (item.position.y > engine.core.size.y + item.size.y) )
    {
      this.detachItem(item);
    }
  }

  // Remove any objects marked for removal
  this._finalizeRemoved();
}

Game.SCENES.Level.prototype.checkCollisions = function()
{
  // Reset the list of removed objects
  this._resetRemoved();

  var a, b;

  for (var i = 0; i < this.getAttachedItems().length; i++) 
  {
    a = this.getAttachedItems()[i];
    
    // Objects without collisionRadius do not collide
    if (a.collisionRadius == 0)
      continue;

    for (var j = i+1; j < this.getAttachedItems().length; j++)
    {
      b = this.getAttachedItems()[j];

      // Objects without collisionRadius do not collide
      if (b.collisionRadius == 0)
        continue;

      if (Math.abs(a.position.x - b.position.x) > a.size.x / 2 + b.size.x / 2)
        continue;

      if (Math.abs(a.position.y - b.position.y) > a.size.y / 2 + b.size.y / 2)
        continue;

      if (engine.math.pointDistance(a.position, b.position) <= a.collisionRadius + b.collisionRadius)
      {
        // Collide and remove each object
        if (a.collide(b) == true)
          this.detachItem(a);
        
        if (b.collide(a) == true)
          this.detachItem(b);
      }
    }
  }

  // Remove any objects marked for removal
  this._finalizeRemoved();
}

Game.Background = function()
{ 
  Engine.Background.call(this);

  this.BACKGROUND_SPEED = 8;
  this.BACKGROUND_STARS = 30;

  this.speeds = [];
  this.offsets = [];
  this.parallaxDisplacement = 5;

  this.starfields = [];
}

Game.Background.prototype = Object.create(Engine.Background.prototype);
Game.Background.prototype.constructor = Game.Background;

Game.Background.prototype.initialize = function() 
{
  for(var depth = 0; depth < 3; depth++) 
  {
    // Create a generic background
    this.starfields[depth] = document.createElement('canvas');
    this.starfields[depth].layer = depth; 
    this.starfields[depth].width = engine.core.size.x + (depth + 1) * this.parallaxDisplacement; 
    this.starfields[depth].height = engine.core.size.y;
    this.starfields[depth].ctx = this.starfields[depth].getContext('2d');

    this.speeds[depth] = this.BACKGROUND_SPEED + (depth + 1) * 7;
    this.offsets[depth] = 0;

    // fill the deepest layer with black background
    if (depth == 0)
    {
      this.starfields[depth].ctx.fillStyle = '#000';
      this.starfields[depth].ctx.fillRect(0,0, this.starfields[depth].width, this.starfields[depth].height);
    }

    this.starfields[depth].ctx.fillStyle = '#FFF';
    this.starfields[depth].ctx.globalAlpha = (depth + 1) * 2/10;

    // Now draw a bunch of random 2 pixel
    // rectangles onto the offscreen canvas
    for(var i = 0; i < this.BACKGROUND_STARS; i++) 
    {
      this.starfields[depth].ctx.fillRect(
                        Math.floor(Math.random() * this.starfields[depth].width),
                        Math.floor(Math.random() * this.starfields[depth].height),
                        depth + 1,  
                        depth + 1);
    } 
  }  
}

Game.Background.prototype.step = function(dt) 
{
  // Call inherited function 
  // Engine.Background.prototype.step.call(this, dt);

  for(var depth = 0; depth < 3; depth++) 
  {
    this.offsets[depth] += this.speeds[depth] / dt;
    this.offsets[depth] = this.offsets[depth] % this.starfields[depth].height;
  }
}

Game.Background.prototype.draw = function(ctx) 
{
  // Call inherited function 
  // Engine.Background.prototype.draw.call(this, ctx);

  for(var depth = 0; depth < 3; depth++) 
  {
    var intOffset = Math.floor(this.offsets[depth]);
    var remaining = this.starfields[depth].height - intOffset;
    var maxWidth  = this.starfields[depth].width;

    // Parallax offset of each layer in the background
    var parallaxOffset;

    // No player or one the three first screens (preloader, menu or initial animation)
    if ((engine.game.player == undefined) || (engine.currentScene <= 2))
    {
      parallaxOffset = (depth + 1) * this.parallaxDisplacement * (engine.core.size.x / 2) / engine.core.size.x;
    }
    else
    {
      var playerDisplacement = engine.game.player.getAvatar().getPosition().x;

      parallaxOffset = Math.round((depth + 1) * this.parallaxDisplacement * playerDisplacement / engine.core.size.x);
      
      if (parallaxOffset < 0) 
        parallaxOffset = 0;
      else if (parallaxOffset + engine.core.size.x > maxWidth)
        parallaxOffset = maxWidth - engine.core.size.x;
    }

    // Draw the top half of the starfield
    if(intOffset > 0) 
    {
      ctx.drawImage(this.starfields[depth],
                0 + parallaxOffset, remaining,
                engine.core.size.x, intOffset,
                0, 0,
                engine.core.size.x, intOffset);
    }

    // Draw the bottom half of the starfield
    if(remaining > 0) 
    {
      ctx.drawImage(this.starfields[depth],
              0 + parallaxOffset, 0,
              engine.core.size.x, remaining,
              0, intOffset,
              engine.core.size.x, remaining);
    }
  }
}

// Init namespace
Game.ITEMS = {};


Game.ITEMS.Meteor = function(size, speed)
{ 
  Engine.Item.call(this);

  this.spriteName = 'meteor';

  this.size.x   = engine.sprites.sprites[this.spriteName][3];
  this.size.y   = engine.sprites.sprites[this.spriteName][4];

  this.linearSpeed = speed;

  this.vRot     = Math.PI / 600;

  this.scaling.x = size;
  this.scaling.y  = size;

  this.maxRadius = this.getRadius();
  this.collisionRadius = 29;
}

Game.ITEMS.Meteor.prototype = Object.create(Engine.Item.prototype);
Game.ITEMS.Meteor.prototype.constructor = Game.ITEMS.Meteor;

Game.ITEMS.Meteor.prototype.step = function(dt) 
{
  Engine.Item.prototype.step.call(this, dt);

  // Not necessary if there are no animations, but here it is
  // engine.sprites.step(dt, this);
}

Game.ITEMS.Meteor.prototype.draw = function(ctx) 
{
  Engine.Item.prototype.draw.call(this, ctx);
}

Game.ITEMS.Meteor.prototype.collide = function(what)
{
  Engine.Item.prototype.collide.call(this);

  var newVx = what.speed.x;
  var newVy = what.speed.y;

  // The shots are fast and the effect is awkward... better not so much
  if (what instanceof Game.ITEMS.Shot)
  {
    newVx = what.speed.x / 10;
    newVy = what.speed.y / 10;
  }

  var effect = engine.effects.addEffect('halo', this.position.x, this.position.y, this.speed.x + newVx, this.speed.y + newVy);
  effect.initialScaling = 2;
  effect.finalScaling   = 3; 
  effect.lifeTime       = 20;
  effect.vRot           = Math.PI / 100;
  effect.transparencyMethod = 2; // disappearing

  for (var i = 0; i < 10; i++)
  {
    effect = engine.effects.addEffect('explosion', 
                                     this.position.x + (Math.random() - 0.5) * 40, this.position.y + (Math.random() - 0.5) * 40, 
                                     this.speed.x + (Math.random() - 0.5), this.speed.y + (Math.random() - 0.5));
    effect.scaling.x  = Math.abs(Math.random() - 0.1);
    effect.scaling.y  = effect.scaling.x;
    effect.vRot       = (Math.random() - 0.5) * Math.PI / 50;
    effect.lifeTime   = 100;
    effect.isAnimated = true;
    effect.transparencyMethod = Math.floor(Math.random() * 3);
  }

  engine.sounds.play('explosion');

  // true == should be removed
  return true;
}


Game.ITEMS.Starship = function(type)
{ 
  Engine.Item.call(this);

  this.spriteName = type;

  this.size.x    = engine.sprites.sprites[this.spriteName][3];
  this.size.y    = engine.sprites.sprites[this.spriteName][4];

  // for collisions
  this.maxRadius = this.getRadius();
  this.collisionRadius = 24;

  this.gunRack = [];

  this.motorEffect = null;
}

Game.ITEMS.Starship.prototype = Object.create(Engine.Item.prototype);
Game.ITEMS.Starship.prototype.constructor = Game.ITEMS.Starship;

Game.ITEMS.Starship.prototype.initialize = function()
{
  Engine.Item.prototype.initialize.call(this);

  // Create thrusts (particle speed, magnitude, spread)
  this.motorEffect = new Engine.Emitter(1, 1, Math.PI / 5);
  this.motorEffect.setPosition(-20, -1);
  this.motorEffect.setRotation(Math.PI);
  this.attachItem(this.motorEffect);

  // Create guns
  var gun = new Game.ITEMS.Gun();
  gun.setPosition(20, 0);

  this.gunRack.push(gun);
  this.attachItem(gun);

  // Rotate the ship, because in the original image it looks towards the right side
  this.setRotation(- Math.PI / 2);
}

Game.ITEMS.Starship.prototype.step = function(dt) 
{
  // Not necessary if there are no animations, but here it is
  // engine.sprites.step(dt, this);

  Engine.Item.prototype.step.call(this, dt);

  if (engine.game.player.isThrusting == true)
    this.motorEffect.start();
  else
    this.motorEffect.stop();
}

Game.ITEMS.Starship.prototype.draw = function(ctx) 
{
  Engine.Item.prototype.draw.call(this, ctx);
}

Game.ITEMS.Starship.prototype.collide = function(what)
{
  // Cannot collide with our own shots
  if ((what instanceof Game.ITEMS.Shot) && (what.creator == this))
    return false;

  // Colliding with any other thing = less speed and lose points
  this.speed.x = this.speed.x / 10;
  this.speed.y = this.speed.y / 10;

  engine.game.points.add(-10);

  // should not be removed
  return false;
}

Game.ITEMS.Starship.prototype.shoot = function()
{
  for(var i = 0, len = this.gunRack.length; i < len; i++) 
    this.gunRack[i].shoot(this);

  engine.sounds.play('shot');
}





Game.ITEMS.Shot = function(creator, position, angle)
{ 
  Engine.Item.call(this);

  this.spriteName = 'shot';

  // The object which originated the shot (player, npc, etc)
  this.creator     = creator;

  this.size.x     = engine.sprites.sprites[this.spriteName][3];
  this.size.y     = engine.sprites.sprites[this.spriteName][4];

  this.position = position;

  this.speedMagnitude = 5;

  this.setRotation(angle);

  var direction = engine.math.angleToDirectionVector(angle);
  direction = direction.normalize();

  this.speed.x = direction.x * this.speedMagnitude;
  this.speed.y = direction.y * this.speedMagnitude;

  this.maxRadius  = this.getRadius();
  this.collisionRadius = 12;
}

Game.ITEMS.Shot.prototype = Object.create(Engine.Item.prototype);
Game.ITEMS.Shot.prototype.constructor = Game.ITEMS.Shot;

Game.ITEMS.Shot.prototype.step = function(dt) 
{
  Engine.Item.prototype.step.call(this, dt);

  // Not necessary if there are no animations, but here it is
  // engine.sprites.step(dt, this); 
}

Game.ITEMS.Shot.prototype.draw = function(ctx) 
{
  Engine.Item.prototype.draw.call(this, ctx);
}

Game.ITEMS.Shot.prototype.collide = function(what)
{
  // Cannot collide with other shots
  if (what instanceof Game.ITEMS.Shot)
    return false;

  // Cannot collide with its own creator
  if (what == this.creator)
    return false;
  
  // Win!
  if (what instanceof Game.ITEMS.Meteor)
    engine.game.points.add(50);

  // Should be done only if we are going to return true in this function
  Engine.Item.prototype.collide.call(this);

  // true == should be removed
  return true;
}


Game.ITEMS.Gun = function()
{ 
  Engine.Item.call(this);

  this.size = new Engine.MATH.Point(10, 10);
}

Game.ITEMS.Gun.prototype = Object.create(Engine.Item.prototype);
Game.ITEMS.Gun.prototype.constructor = Game.ITEMS.Gun;

Game.ITEMS.Gun.prototype.step = function(dt) 
{
  // Not necessary if there are no animations, but here it is
  // engine.sprites.step(dt, this);

  Engine.Item.prototype.step.call(this, dt);
}

Game.ITEMS.Gun.prototype.draw = function(ctx) 
{
  Engine.Item.prototype.draw.call(this, ctx);
}

Game.ITEMS.Gun.prototype.shoot = function(creator)
{
  var pos = this.getPosition();

  var shot = new Game.ITEMS.Shot(creator, this.getPosition(), this.getRotation());
  engine.scenes.getCurrentScene().attachItem(shot);
}

Game.ITEMS.Gun.prototype.collide = function(what)
{
  // Guns are not physical objects
  return false;
}

Game.Player = function()
{ 
  Engine.Player.call(this);

  this.avatar = null;

  // for shooting
  this.timeLastShot = 0;

  this.isTurningLeft = false;
  this.isTurningRight = false;
  this.isThrusting = false;

  this.rotationSpeed = Math.PI/50;
  this.flightSpeed = 0.05; // More than 0.3 -> impossible to control
}

Game.Player.prototype = Object.create(Engine.Player.prototype);
Game.Player.prototype.constructor = Game.Player;

// Will be called after creation of this object
Game.Player.prototype.initialize = function()
{
  Engine.Player.prototype.initialize.call(this);

  this.avatar = new Game.ITEMS.Starship('starship');

  this.avatar.initialize();
}

Game.Player.prototype.activate = function()
{
  Engine.Player.prototype.activate.call(this);

  this.timeLastShot = 0;
  this.isTurningLeft = false;
  this.isTurningRight = false;
  this.isThrusting = false;

  // activate will be called everytime we change to a new scene,
  // so we should ask to the input controller of the new scene to inform us about
  // new key events

  this.getAvatar().getParentScene().input.addKeyListener(this, 'eventKeyPressed', [ Engine.INPUT.KEYS.SPACEBAR ]);
}

Game.Player.prototype.eventKeyPressed = function(keyCode)
{
  if (keyCode == Engine.INPUT.KEYS.SPACEBAR)
  {
    var now = new Date().getTime();

    // Enough time between shots
    if (now - this.timeLastShot > engine.options.shotPeriodicity)
    {
      this.avatar.shoot();
      this.timeLastShot = now;
    }
  }
}

Game.Player.prototype.step = function(dt)
{
  // If the avatar is not attached to a playable scene,
  // nothing to do
  if ((this.getAvatar().getParentScene() != undefined) &&
      (this.getAvatar().getParentScene().playable == false))
    return;

  // ------------------------------------------------
  //  Continuous keys (without events)
  // ------------------------------------------------

  if ( engine.input.isKeyPressed(Engine.INPUT.KEYS.LEFT) )
    this.isTurningLeft = true;
  else
    this.isTurningLeft = false;
  
  if ( engine.input.isKeyPressed(Engine.INPUT.KEYS.RIGHT) ) 
    this.isTurningRight = true; 
  else
    this.isTurningRight = false;
  
  if ( engine.input.isKeyPressed(Engine.INPUT.KEYS.UP) ) 
    this.isThrusting = true;
  else
    this.isThrusting = false;

  // ------------------------------------------------
  //  Rotation
  // ------------------------------------------------

  if (this.isTurningLeft == true)
    this.avatar.vRot = -this.rotationSpeed;
  else if (this.isTurningRight == true)
    this.avatar.vRot = this.rotationSpeed;
  else
    this.avatar.vRot = 0;    

  // ------------------------------------------------
  //  Thrusting
  // ------------------------------------------------

  if (this.isThrusting == true)
  {
    var dir = engine.math.angleToDirectionVector(this.avatar.rotation.getAngle());

    dir = dir.normalize();

    this.avatar.speed.x += dir.x * this.flightSpeed;
    this.avatar.speed.y += dir.y * this.flightSpeed;
  }

  // ------------------------------------------------
  //  Check Scene limits
  // ------------------------------------------------
  // To Do: maybe this should be in the scene code?
  
  // Check if we are inside the scene
  // Bounce right side
  if (this.avatar.position.x > engine.core.size.x)
  {
    this.avatar.move(-(this.avatar.size.x / 4), 0);
    this.avatar.speed.x = -this.avatar.speed.x / 2; 
  }
  // Bounce left side
  else if (this.avatar.position.x < 0)
  {
    this.avatar.move(this.avatar.size.x / 4, 0);
    this.avatar.speed.x = -this.avatar.speed.x / 2;
  }

  // Bounce lower side
  if (this.avatar.position.y > engine.core.size.y)
  {
    this.avatar.move(0, -this.avatar.size.y / 4);
    this.avatar.speed.y = -this.avatar.speed.y / 2;
  }
  // Bounce upper side
  else if (this.avatar.position.y < 0)
  {
    this.avatar.move(0, this.avatar.size.y / 4);
    this.avatar.speed.y = -this.avatar.speed.y / 2;
  } 
}




Game.Points = function() 
{
  this.totalPoints = 0;
  this.gameInitTime = 0;
}

Game.Points.prototype.initialize = function() 
{
}

Game.Points.prototype.add = function(points)
{
  this.totalPoints += points;

  var scene = engine.scenes.getCurrentScene();

  var guiItem = scene.gui.get('points');

  if (guiItem != undefined)
    guiItem.setText(engine.localization.get('points') + ': ' + this.totalPoints);
}

