import './style.css';
import Phaser from 'phaser';
import { GAME_CONFIG, GAME_STATES, ITEM_TYPES, getRandomItemType } from './src/game/constants.js';
import { GameState } from './src/game/gameState.js';
import { audioManager } from './src/game/audio.js';

// DOM Elements
const gameStartDiv = document.querySelector('#gameStartDiv');
const gameStartBtn = document.querySelector('#gameStartBtn');
const menuSoundBtn = document.querySelector('#menuSoundBtn');
const menuBestScore = document.querySelector('#menuBestScore');
const targetScoreInput = document.querySelector('#targetScoreInput');
const timeLimitInput = document.querySelector('#timeLimitInput');

const gamePauseDiv = document.querySelector('#gamePauseDiv');
const resumeBtn = document.querySelector('#resumeBtn');
const pauseRestartBtn = document.querySelector('#pauseRestartBtn');
const pauseSoundBtn = document.querySelector('#pauseSoundBtn');

const gameEndDiv = document.querySelector('#gameEndDiv');
const gameWinLoseBadge = document.querySelector('#gameWinLoseBadge');
const gameWinLoseSpan = document.querySelector('#gameWinLoseSpan');
const newRecordBanner = document.querySelector('#newRecordBanner');
const gameEndScoreSpan = document.querySelector('#gameEndScoreSpan');
const gameEndBestSpan = document.querySelector('#gameEndBestSpan');
const gameEndCaughtSpan = document.querySelector('#gameEndCaughtSpan');
const gameEndComboSpan = document.querySelector('#gameEndComboSpan');
const playAgainBtn = document.querySelector('#playAgainBtn');
const mainMenuBtn = document.querySelector('#mainMenuBtn');

const gameHud = document.querySelector('#gameHud');
const hudScore = document.querySelector('#hudScore');
const hudTarget = document.querySelector('#hudTarget');
const hudTargetWrap = document.querySelector('#hudTargetWrap');
const hudBest = document.querySelector('#hudBest');
const hudTimer = document.querySelector('#hudTimer');
const hudCombo = document.querySelector('#hudCombo');
const hudPauseBtn = document.querySelector('#hudPauseBtn');
const hudSoundBtn = document.querySelector('#hudSoundBtn');
const hudFullscreenBtn = document.querySelector('#hudFullscreenBtn');
const menuFullscreenBtn = document.querySelector('#menuFullscreenBtn');
const hudFrenzyBadge = document.querySelector('#hudFrenzyBadge');
const frenzySec = document.querySelector('#frenzySec');
const hudSlowBadge = document.querySelector('#hudSlowBadge');
const slowSec = document.querySelector('#slowSec');

const heartElements = [
  document.querySelector('#heart1'),
  document.querySelector('#heart2'),
  document.querySelector('#heart3'),
];

// Initialize GameState instance
const gameState = new GameState({
  targetScore: parseInt(targetScoreInput.value, 10) || GAME_CONFIG.defaultTargetScore,
  timeLimit: parseInt(timeLimitInput.value, 10) || GAME_CONFIG.defaultTimeLimit,
});

// Update initial best score UI
if (menuBestScore) menuBestScore.textContent = gameState.bestScore;
if (hudBest) hudBest.textContent = gameState.bestScore;

class GameScene extends Phaser.Scene {
  constructor() {
    super('scene-game');
    this.player = null;
    this.itemsGroup = null;
    this.cursor = null;
    this.keyA = null;
    this.keyD = null;
    this.keyP = null;
    this.keyEsc = null;
    this.spawnTimerEvent = null;
    this.emitter = null;
    this.bgMusic = null;
    this.fallSpeed = GAME_CONFIG.baseFallSpeed;
    this.pointerTargetX = null;
    this.isPointerActive = false;
  }

  preload() {
    this.load.image('bg', '/assets/bg.png');
    this.load.image('basket', '/assets/basket.png');
    this.load.image('apple', '/assets/apple.png');
    this.load.image('money', '/assets/money.png');

    // Vector SVG item assets
    this.load.svg('rotten_apple', '/assets/rotten_apple.svg', { width: 40, height: 40 });
    this.load.svg('golden_apple', '/assets/golden_apple.svg', { width: 40, height: 40 });
    this.load.svg('bug', '/assets/bug.svg', { width: 40, height: 40 });
    this.load.svg('clock', '/assets/clock.svg', { width: 40, height: 40 });
    this.load.svg('bomb', '/assets/bomb.svg', { width: 40, height: 40 });

    // Audio assets if available
    this.load.audio('coin', '/assets/coin.mp3');
    this.load.audio('bgMusic', '/assets/bgMusic.mp3');
  }

  create() {
    // Background
    this.add.image(0, 0, 'bg').setOrigin(0, 0);

    // Optional background music
    try {
      if (this.sound.get('bgMusic') === null && this.cache.audio.exists('bgMusic')) {
        this.bgMusic = this.sound.add('bgMusic', { volume: 0.015, loop: true });
        if (audioManager.soundEnabled) {
          this.bgMusic.play();
        }
      }
    } catch {
      // Audio autoplay policy handled gracefully
    }

    // Player Basket
    const basketY = GAME_CONFIG.height - 55;
    this.player = this.physics.add.image(GAME_CONFIG.width / 2, basketY, 'basket').setOrigin(0.5, 0.5);
    this.player.setCollideWorldBounds(true);
    this.player.setImmovable(true);
    this.player.body.allowGravity = false;

    // Hitbox tuned for basket rim
    this.player.setSize(this.player.width * 0.75, this.player.height * 0.35);
    this.player.setOffset(this.player.width * 0.125, this.player.height * 0.5);

    // Particle Emitter for successful catch
    this.emitter = this.add.particles(0, 0, 'money', {
      speed: 120,
      gravityY: 150,
      scale: { start: 0.05, end: 0.01 },
      alpha: { start: 1, end: 0 },
      lifespan: 400,
      duration: 120,
      emitting: false,
    });

    // Items Physics Group
    this.itemsGroup = this.physics.add.group();

    // Overlap collision detection
    this.physics.add.overlap(this.player, this.itemsGroup, this.onItemOverlap, null, this);

    // Keyboard inputs
    this.cursor = this.input.keyboard.createCursorKeys();
    this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keyP = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P);
    this.keyEsc = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

    // Prevent arrow key default page scrolling
    this.input.keyboard.addCapture([
      Phaser.Input.Keyboard.KeyCodes.UP,
      Phaser.Input.Keyboard.KeyCodes.DOWN,
      Phaser.Input.Keyboard.KeyCodes.LEFT,
      Phaser.Input.Keyboard.KeyCodes.RIGHT,
      Phaser.Input.Keyboard.KeyCodes.SPACE,
    ]);

    // Pointer (Mouse / Touch) controls
    this.input.on('pointerdown', (pointer) => {
      this.isPointerActive = true;
      this.pointerTargetX = pointer.x;
    });

    this.input.on('pointermove', (pointer) => {
      if (pointer.isDown || this.isPointerActive) {
        this.pointerTargetX = pointer.x;
      }
    });

    this.input.on('pointerup', () => {
      this.isPointerActive = false;
      this.pointerTargetX = null;
    });

    // Multi-Item Spawn Timer Event
    this.spawnTimerEvent = this.time.addEvent({
      delay: 1100,
      callback: this.spawnItem,
      callbackScope: this,
      loop: true,
    });

    // Start in paused state until user clicks Start Game
    if (gameState.status !== GAME_STATES.PLAYING) {
      this.scene.pause('scene-game');
    }
  }

  spawnItem() {
    if (gameState.status !== GAME_STATES.PLAYING) return;

    // Check active items count: scale active limit from 1 up to 3 based on score
    const currentActive = this.itemsGroup.countActive(true);
    let maxAllowed = 2;
    if (gameState.score >= 12 || gameState.timeLimit - gameState.timeRemaining > 20) {
      maxAllowed = 3;
    }
    if (currentActive >= maxAllowed) return;

    const itemDef = getRandomItemType();
    const padding = 35;
    const spawnX = Phaser.Math.Between(padding, GAME_CONFIG.width - padding);

    const spriteKey = itemDef.id;
    const itemSprite = this.itemsGroup.create(spawnX, -20, spriteKey);

    if (itemSprite) {
      itemSprite.setOrigin(0.5, 0.5);
      itemSprite.itemDef = itemDef;

      // Speed calculation with progressive difficulty
      const speed = (this.fallSpeed + Math.min(180, gameState.score * 8)) * (itemDef.speedMultiplier || 1);
      itemSprite.setVelocityY(speed);

      // Subtle wobble or spin for visual polish
      if (itemDef.id === 'bomb' || itemDef.id === 'golden_apple') {
        itemSprite.setAngularVelocity(Phaser.Math.Between(-60, 60));
      }
    }
  }

  onItemOverlap(player, itemSprite) {
    if (!itemSprite.active || gameState.status !== GAME_STATES.PLAYING) return;

    const itemDef = itemSprite.itemDef || ITEM_TYPES.NORMAL_APPLE;
    const catchX = itemSprite.x;
    const catchY = itemSprite.y;

    // Deactivate and destroy item immediately to prevent duplicate collision
    itemSprite.destroy();

    // Process catch in pure GameState
    const result = gameState.catchItem(itemDef);
    if (!result) return;

    // Visual & Sound Feedback
    this.handleItemFX(result, catchX, catchY);
    updateHUD();

    if (result.gameOver) {
      this.handleGameOver(result.gameOverReason);
    }
  }

  handleItemFX(result, x, y) {
    // 1. Floating Text
    if (result.floatingText) {
      this.showFloatingText(x, y, result.floatingText, result.floatingColor);
    }

    // 2. Sound synthesis
    switch (result.item.id) {
      case 'apple':
        audioManager.playCollect();
        break;
      case 'golden_apple':
        audioManager.playGolden();
        break;
      case 'rotten_apple':
        audioManager.playRotten();
        break;
      case 'bug':
        audioManager.playBuzz();
        break;
      case 'clock':
        audioManager.playClock();
        break;
      case 'bomb':
        audioManager.playBomb();
        break;
      default:
        audioManager.playCollect();
    }

    if (result.frenzyActivated) {
      audioManager.playFrenzy();
      this.showFloatingText(GAME_CONFIG.width / 2, GAME_CONFIG.height / 2, '⚡ 2X FRENZY!', '#ffaa00', 32);
    }

    // 3. Basket bounce or shake animation
    if (result.basketShake) {
      this.tweens.add({
        targets: this.player,
        x: this.player.x + (Math.random() > 0.5 ? 8 : -8),
        yoyo: true,
        repeat: 3,
        duration: 40,
        ease: 'Quad.easeInOut',
      });
    } else {
      // Catch bounce
      this.tweens.add({
        targets: this.player,
        scaleY: 1.15,
        scaleX: 0.9,
        yoyo: true,
        duration: 80,
        ease: 'Back.easeOut',
      });
    }

    // 4. Particles on good catches
    if (result.item.isPositive) {
      this.emitter.setPosition(x, y);
      this.emitter.explode(8);
    }

    // 5. Screen flash on damage / bomb / rotten
    if (result.screenFlash) {
      this.cameras.main.flash(200, 255, 60, 60, false);
    }
  }

  onItemMissed(itemSprite) {
    if (!itemSprite.active) return;
    const itemDef = itemSprite.itemDef || ITEM_TYPES.NORMAL_APPLE;
    const missX = itemSprite.x;
    itemSprite.destroy();

    if (gameState.status !== GAME_STATES.PLAYING) return;

    const result = gameState.missItem(itemDef);
    if (!result) return;

    if (result.lifeDelta < 0) {
      audioManager.playLifeLoss();
      this.showFloatingText(missX, GAME_CONFIG.height - 30, '-1 LIFE', '#ff3344');
      this.cameras.main.flash(180, 220, 40, 40, false);
    }

    updateHUD();

    if (result.gameOver) {
      this.handleGameOver(result.gameOverReason);
    }
  }

  showFloatingText(x, y, text, color = '#ffffff', fontSize = 22) {
    const floatText = this.add.text(x, y, text, {
      fontFamily: 'Inter, Arial, sans-serif',
      fontSize: `${fontSize}px`,
      fontWeight: '800',
      color: color,
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5, 0.5);

    this.tweens.add({
      targets: floatText,
      y: y - 50,
      alpha: 0,
      duration: 750,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        floatText.destroy();
      },
    });
  }

  update(time, delta) {
    if (gameState.status !== GAME_STATES.PLAYING) return;

    // Check pause key (P or Esc)
    if (Phaser.Input.Keyboard.JustDown(this.keyP) || Phaser.Input.Keyboard.JustDown(this.keyEsc)) {
      pauseGame();
      return;
    }

    // Advance GameState time
    const timeResult = gameState.updateTime(delta);
    if (timeResult.gameOver) {
      this.handleGameOver(timeResult.gameOverReason);
      return;
    }

    updateHUD();

    // Basket Movement speed
    const currentSpeed = gameState.isSlowed
      ? GAME_CONFIG.baseBasketSpeed * GAME_CONFIG.bugSlowFactor
      : GAME_CONFIG.baseBasketSpeed;

    const { left, right } = this.cursor;
    const isLeft = left.isDown || this.keyA.isDown;
    const isRight = right.isDown || this.keyD.isDown;

    if (isLeft) {
      this.player.setVelocityX(-currentSpeed);
      this.pointerTargetX = null; // Keyboard overrides pointer
    } else if (isRight) {
      this.player.setVelocityX(currentSpeed);
      this.pointerTargetX = null;
    } else if (this.pointerTargetX !== null) {
      // Smooth pointer tracking
      const diffX = this.pointerTargetX - this.player.x;
      if (Math.abs(diffX) > 4) {
        const dir = Math.sign(diffX);
        const pointerSpeed = Math.min(currentSpeed, Math.abs(diffX) * 15);
        this.player.setVelocityX(dir * pointerSpeed);
      } else {
        this.player.setVelocityX(0);
      }
    } else {
      this.player.setVelocityX(0);
    }

    // Screen bounds clamping
    const halfW = this.player.width * 0.45;
    if (this.player.x < halfW) {
      this.player.setX(halfW);
      this.player.setVelocityX(0);
    } else if (this.player.x > GAME_CONFIG.width - halfW) {
      this.player.setX(GAME_CONFIG.width - halfW);
      this.player.setVelocityX(0);
    }

    // Check missed falling items at bottom boundary
    const children = this.itemsGroup.getChildren();
    for (let i = children.length - 1; i >= 0; i--) {
      const item = children[i];
      if (item && item.y >= GAME_CONFIG.height - 10) {
        this.onItemMissed(item);
      }
    }
  }

  handleGameOver(reason) {
    audioManager.playGameOver();
    this.scene.pause('scene-game');

    // Clean up active falling items
    if (this.itemsGroup) {
      this.itemsGroup.clear(true, true);
    }

    // Show Game Over UI
    const isWin = reason === 'target_reached' || gameState.score >= gameState.targetScore;
    gameWinLoseBadge.textContent = isWin ? 'Stage Cleared!' : 'Game Over';
    gameWinLoseSpan.textContent = isWin ? '🏆 You Won!' : (reason === 'no_lives' ? '💔 Out of Lives!' : '⏱️ Time’s Up!');
    gameWinLoseSpan.style.color = isWin ? '#10b981' : '#ef4444';

    gameEndScoreSpan.textContent = gameState.score;
    gameEndBestSpan.textContent = gameState.bestScore;
    gameEndCaughtSpan.textContent = gameState.applesCaught;
    gameEndComboSpan.textContent = gameState.maxComboStreak;

    if (newRecordBanner) {
      newRecordBanner.style.display = gameState.isNewRecord ? 'block' : 'none';
    }

    gameHud.style.display = 'none';
    gamePauseDiv.style.display = 'none';
    gameEndDiv.style.display = 'flex';
  }

  resetSceneForNewRound() {
    // Clear items and temporary tweens
    if (this.itemsGroup) {
      this.itemsGroup.clear(true, true);
    }
    this.tweens.killAll();

    // Reset player position and velocity
    if (this.player) {
      this.player.setPosition(GAME_CONFIG.width / 2, GAME_CONFIG.height - 55);
      this.player.setVelocity(0, 0);
      this.player.setScale(1, 1);
    }

    this.pointerTargetX = null;
    this.isPointerActive = false;
    this.fallSpeed = GAME_CONFIG.baseFallSpeed;
  }
}

// Determine optimal render type (WebGL when supported, 2D Canvas fallback)
function getOptimalRenderType() {
  try {
    const testCanvas = document.createElement('canvas');
    const hasWebGL = !!(window.WebGLRenderingContext && (testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl')));
    return hasWebGL ? Phaser.WEBGL : Phaser.CANVAS;
  } catch {
    return Phaser.CANVAS;
  }
}

// Phaser Configuration
const config = {
  type: getOptimalRenderType(),
  width: GAME_CONFIG.width,
  height: GAME_CONFIG.height,
  parent: 'gameContainer',
  canvas: document.querySelector('#gameCanvas'),
  scale: {
    mode: Phaser.Scale.FIT,
    parent: 'gameContainer',
    autoCenter: Phaser.Scale.NO_CENTER,
    width: GAME_CONFIG.width,
    height: GAME_CONFIG.height,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 }, // Handled deterministically per item
      debug: false,
    },
  },
  scene: [GameScene],
};

const game = new Phaser.Game(config);

// Expose on window for testing, automation, and debug inspection
if (typeof window !== 'undefined') {
  window.game = game;
  window.gameState = gameState;
  window.audioManager = audioManager;
}

// HUD Update Helper
function updateHUD() {
  if (hudScore) hudScore.textContent = gameState.score;
  if (hudBest) hudBest.textContent = gameState.bestScore;
  if (hudTarget) hudTarget.textContent = gameState.targetScore;
  if (hudTimer) hudTimer.textContent = Math.ceil(gameState.timeRemaining);

  // Update Hearts
  heartElements.forEach((heart, idx) => {
    if (heart) {
      if (idx < gameState.lives) {
        heart.classList.remove('lost');
        heart.textContent = '❤️';
      } else {
        heart.classList.add('lost');
        heart.textContent = '🖤';
      }
    }
  });

  // Combo Streak text
  if (hudCombo) {
    if (gameState.comboStreak >= 2) {
      hudCombo.textContent = `🔥 Combo x${gameState.comboStreak}`;
    } else {
      hudCombo.textContent = '';
    }
  }

  // Frenzy Badge
  if (hudFrenzyBadge && frenzySec) {
    if (gameState.frenzyActive) {
      hudFrenzyBadge.style.display = 'inline-block';
      frenzySec.textContent = Math.ceil(gameState.frenzyTimeRemainingMs / 1000);
    } else {
      hudFrenzyBadge.style.display = 'none';
    }
  }

  // Slow Badge
  if (hudSlowBadge && slowSec) {
    if (gameState.isSlowed) {
      hudSlowBadge.style.display = 'inline-block';
      slowSec.textContent = Math.ceil(gameState.slowTimeRemainingMs / 1000);
    } else {
      hudSlowBadge.style.display = 'none';
    }
  }
}

// Game Flow Functions
function startNewRound() {
  const targetScore = parseInt(targetScoreInput.value, 10) || GAME_CONFIG.defaultTargetScore;
  const timeLimit = parseInt(timeLimitInput.value, 10) || GAME_CONFIG.defaultTimeLimit;

  audioManager.ensureContext();
  gameState.startRound({ targetScore, timeLimit });

  const scene = game.scene.getScene('scene-game');
  if (scene) {
    scene.resetSceneForNewRound();
    game.scene.resume('scene-game');
  }

  gameStartDiv.style.display = 'none';
  gamePauseDiv.style.display = 'none';
  gameEndDiv.style.display = 'none';
  gameHud.style.display = 'block';

  updateHUD();
}

function pauseGame() {
  if (gameState.status !== GAME_STATES.PLAYING) return;
  gameState.pause();
  game.scene.pause('scene-game');
  gamePauseDiv.style.display = 'flex';
}

function resumeGame() {
  if (gameState.status !== GAME_STATES.PAUSED) return;
  gameState.resume();
  game.scene.resume('scene-game');
  gamePauseDiv.style.display = 'none';
}

function showMainMenu() {
  gameState.status = GAME_STATES.MENU;
  game.scene.pause('scene-game');
  const scene = game.scene.getScene('scene-game');
  if (scene) scene.resetSceneForNewRound();

  if (menuBestScore) menuBestScore.textContent = gameState.bestScore;
  gameHud.style.display = 'none';
  gamePauseDiv.style.display = 'none';
  gameEndDiv.style.display = 'none';
  gameStartDiv.style.display = 'flex';
}

function updateSoundButtonLabels(enabled) {
  const label = enabled ? '🔊 Sound: ON' : '🔇 Sound: OFF';
  if (menuSoundBtn) menuSoundBtn.textContent = label;
  if (pauseSoundBtn) pauseSoundBtn.textContent = label;
  if (hudSoundBtn) hudSoundBtn.textContent = enabled ? '🔊' : '🔇';
  if (game.sound) {
    game.sound.mute = !enabled;
  }
}

// Event Listeners
gameStartBtn.addEventListener('click', () => {
  audioManager.playClick();
  startNewRound();
});

playAgainBtn.addEventListener('click', () => {
  audioManager.playClick();
  startNewRound();
});

mainMenuBtn.addEventListener('click', () => {
  audioManager.playClick();
  showMainMenu();
});

resumeBtn.addEventListener('click', () => {
  audioManager.playClick();
  resumeGame();
});

pauseRestartBtn.addEventListener('click', () => {
  audioManager.playClick();
  startNewRound();
});

hudPauseBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  audioManager.playClick();
  if (gameState.status === GAME_STATES.PLAYING) {
    pauseGame();
  } else if (gameState.status === GAME_STATES.PAUSED) {
    resumeGame();
  }
});

const handleSoundToggle = (e) => {
  if (e) e.stopPropagation();
  const enabled = audioManager.toggleSound();
  audioManager.playClick();
  updateSoundButtonLabels(enabled);
};

if (menuSoundBtn) menuSoundBtn.addEventListener('click', handleSoundToggle);
if (pauseSoundBtn) pauseSoundBtn.addEventListener('click', handleSoundToggle);
if (hudSoundBtn) hudSoundBtn.addEventListener('click', handleSoundToggle);

function toggleFullscreen() {
  const container = document.querySelector('#gameContainer');
  if (!document.fullscreenElement) {
    if (container.requestFullscreen) {
      container.requestFullscreen().catch(() => {});
    } else if (container.webkitRequestFullscreen) {
      container.webkitRequestFullscreen();
    }
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    }
  }
}

if (hudFullscreenBtn) {
  hudFullscreenBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    audioManager.playClick();
    toggleFullscreen();
  });
}

if (menuFullscreenBtn) {
  menuFullscreenBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    audioManager.playClick();
    toggleFullscreen();
  });
}

// Global keyboard restart / start shortcut
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyF') {
    toggleFullscreen();
  } else if (e.code === 'Space' || e.code === 'Enter') {
    if (gameStartDiv.style.display !== 'none') {
      startNewRound();
    } else if (gameEndDiv.style.display !== 'none') {
      startNewRound();
    }
  }
});

// Initial sound UI sync
updateSoundButtonLabels(audioManager.soundEnabled);
