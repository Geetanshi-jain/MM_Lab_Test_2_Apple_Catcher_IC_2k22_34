/**
 * GameState: Pure business logic for Apple Catcher game session.
 * Handles scoring, lives, timer, combo streaks, Frenzy mode, penalties, and high score persistence.
 */

import { GAME_CONFIG, STORAGE_KEYS, GAME_STATES, ITEM_TYPES } from './constants.js';

export class GameState {
  constructor(options = {}) {
    this.targetScore = options.targetScore || GAME_CONFIG.defaultTargetScore;
    this.timeLimit = options.timeLimit || GAME_CONFIG.defaultTimeLimit;
    this.timeRemaining = this.timeLimit;
    this.initialLives = options.initialLives || GAME_CONFIG.initialLives;
    this.lives = this.initialLives;
    this.score = 0;
    this.bestScore = this.loadBestScore();
    this.comboStreak = 0;
    this.maxComboStreak = 0;
    this.frenzyActive = false;
    this.frenzyTimeRemainingMs = 0;
    this.isSlowed = false;
    this.slowTimeRemainingMs = 0;
    this.status = GAME_STATES.MENU;
    this.isNewRecord = false;
    this.applesCaught = 0;
    this.totalCatches = 0;
    this.totalMisses = 0;
  }

  loadBestScore() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = window.localStorage.getItem(STORAGE_KEYS.bestScore);
        const parsed = parseInt(stored, 10);
        return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
      }
    } catch {
      // LocalStorage unavailable or permission denied
    }
    return 0;
  }

  saveBestScore(score) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(STORAGE_KEYS.bestScore, score.toString());
      }
    } catch {
      // Ignore storage errors gracefully
    }
  }

  startRound(options = {}) {
    if (options.targetScore !== undefined) {
      this.targetScore = options.targetScore;
    }
    if (options.timeLimit !== undefined) {
      this.timeLimit = options.timeLimit;
    }

    this.score = 0;
    this.lives = this.initialLives;
    this.timeRemaining = this.timeLimit;
    this.comboStreak = 0;
    this.maxComboStreak = 0;
    this.frenzyActive = false;
    this.frenzyTimeRemainingMs = 0;
    this.isSlowed = false;
    this.slowTimeRemainingMs = 0;
    this.isNewRecord = false;
    this.applesCaught = 0;
    this.totalCatches = 0;
    this.totalMisses = 0;
    this.status = GAME_STATES.PLAYING;

    return this;
  }

  pause() {
    if (this.status === GAME_STATES.PLAYING) {
      this.status = GAME_STATES.PAUSED;
    }
  }

  resume() {
    if (this.status === GAME_STATES.PAUSED) {
      this.status = GAME_STATES.PLAYING;
    }
  }

  catchItem(itemDef) {
    if (this.status !== GAME_STATES.PLAYING) {
      return null;
    }

    this.totalCatches++;
    let scoreDelta = 0;
    let lifeDelta = 0;
    let timeDelta = 0;
    let frenzyActivated = false;

    // 1. Scoring calculation
    if (itemDef.points > 0) {
      const multiplier = this.frenzyActive ? GAME_CONFIG.frenzyMultiplier : 1;
      scoreDelta = itemDef.points * multiplier;
      this.score += scoreDelta;
      this.applesCaught++;

      if (this.score > this.bestScore) {
        this.bestScore = this.score;
        this.isNewRecord = true;
        this.saveBestScore(this.bestScore);
      }
    } else if (itemDef.points < 0) {
      // Negative points are NOT multiplied
      scoreDelta = itemDef.points;
      this.score = Math.max(0, this.score + scoreDelta);
    }

    // 2. Combo & Frenzy handling
    if (itemDef.incrementsCombo) {
      this.comboStreak++;
      if (this.comboStreak > this.maxComboStreak) {
        this.maxComboStreak = this.comboStreak;
      }
      if (this.comboStreak > 0 && this.comboStreak % GAME_CONFIG.frenzyRequiredStreak === 0) {
        this.frenzyActive = true;
        this.frenzyTimeRemainingMs = GAME_CONFIG.frenzyDurationMs;
        frenzyActivated = true;
      }
    } else {
      // Obstacle or negative item resets combo
      this.comboStreak = 0;
    }

    // 3. Life penalties (Bomb)
    if (itemDef.lifePenalty) {
      lifeDelta = -itemDef.lifePenalty;
      this.lives = Math.max(0, this.lives - itemDef.lifePenalty);
    }

    // 4. Movement penalty (Bug)
    if (itemDef.slowsPlayer) {
      this.isSlowed = true;
      this.slowTimeRemainingMs = itemDef.slowDurationMs || GAME_CONFIG.bugSlowDurationMs;
    }

    // 5. Extra time bonus (Clock)
    if (itemDef.extraTimeSec) {
      timeDelta = itemDef.extraTimeSec;
      this.timeRemaining += itemDef.extraTimeSec;
    }

    // Check game over condition
    let isGameOver = false;
    let reason = null;

    if (this.lives <= 0) {
      this.status = GAME_STATES.GAME_OVER;
      isGameOver = true;
      reason = 'no_lives';
    } else if (this.targetScore > 0 && this.score >= this.targetScore) {
      this.status = GAME_STATES.GAME_OVER;
      isGameOver = true;
      reason = 'target_reached';
    }

    return {
      item: itemDef,
      scoreDelta,
      lifeDelta,
      timeDelta,
      score: this.score,
      lives: this.lives,
      comboStreak: this.comboStreak,
      frenzyActive: this.frenzyActive,
      frenzyActivated,
      isSlowed: this.isSlowed,
      floatingText: (scoreDelta > 0 && this.frenzyActive && itemDef.points > 0)
        ? `+${scoreDelta}`
        : itemDef.floatingText,
      floatingColor: itemDef.floatingColor,
      screenFlash: itemDef.screenFlash || false,
      basketShake: itemDef.basketShake || false,
      gameOver: isGameOver,
      gameOverReason: reason,
    };
  }

  missItem(itemDef) {
    if (this.status !== GAME_STATES.PLAYING) {
      return null;
    }

    this.totalMisses++;
    let lifeDelta = 0;
    let isGameOver = false;
    let reason = null;

    // Missing normal apple resets combo streak and deducts 1 life
    if (itemDef.missPenaltyLife) {
      this.comboStreak = 0;
      lifeDelta = -1;
      this.lives = Math.max(0, this.lives - 1);

      if (this.lives <= 0) {
        this.status = GAME_STATES.GAME_OVER;
        isGameOver = true;
        reason = 'no_lives';
      }
    }

    return {
      item: itemDef,
      lifeDelta,
      lives: this.lives,
      comboStreak: this.comboStreak,
      gameOver: isGameOver,
      gameOverReason: reason,
    };
  }

  updateTime(deltaMs) {
    if (this.status !== GAME_STATES.PLAYING) {
      return { gameOver: false };
    }

    // Decrement countdown timer
    this.timeRemaining = Math.max(0, this.timeRemaining - deltaMs / 1000);

    // Update Frenzy timer
    if (this.frenzyActive) {
      this.frenzyTimeRemainingMs -= deltaMs;
      if (this.frenzyTimeRemainingMs <= 0) {
        this.frenzyActive = false;
        this.frenzyTimeRemainingMs = 0;
      }
    }

    // Update Slow timer
    if (this.isSlowed) {
      this.slowTimeRemainingMs -= deltaMs;
      if (this.slowTimeRemainingMs <= 0) {
        this.isSlowed = false;
        this.slowTimeRemainingMs = 0;
      }
    }

    // Timer expiration
    if (this.timeRemaining <= 0) {
      this.status = GAME_STATES.GAME_OVER;
      return {
        gameOver: true,
        gameOverReason: 'time_up',
        timeRemaining: 0,
      };
    }

    return {
      gameOver: false,
      timeRemaining: this.timeRemaining,
      frenzyActive: this.frenzyActive,
      frenzySecondsRemaining: Math.ceil(this.frenzyTimeRemainingMs / 1000),
      isSlowed: this.isSlowed,
      slowSecondsRemaining: Math.ceil(this.slowTimeRemainingMs / 1000),
    };
  }
}

