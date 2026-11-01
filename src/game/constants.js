/**
 * Game constants and item configurations for Apple Catcher.
 */

export const GAME_CONFIG = {
  width: 500,
  height: 500,
  initialLives: 3,
  defaultTimeLimit: 30,
  defaultTargetScore: 10,
  baseBasketSpeed: 350,
  baseFallSpeed: 250,
  maxFallSpeed: 520,
  frenzyRequiredStreak: 5,
  frenzyDurationMs: 5000,
  frenzyMultiplier: 2,
  bugSlowDurationMs: 3000,
  bugSlowFactor: 0.55,
  clockBonusSeconds: 5,
  maxActiveItems: 3,
};

export const STORAGE_KEYS = {
  bestScore: 'appleCatcherBestScore',
  soundEnabled: 'appleCatcherSound',
};

export const GAME_STATES = {
  MENU: 'MENU',
  PLAYING: 'PLAYING',
  PAUSED: 'PAUSED',
  GAME_OVER: 'GAME_OVER',
};

export const ITEM_TYPES = {
  NORMAL_APPLE: {
    id: 'apple',
    name: 'Normal Apple',
    points: 1,
    weight: 65,
    isPositive: true,
    incrementsCombo: true,
    missPenaltyLife: true,
    speedMultiplier: 1.0,
    floatingText: '+1',
    floatingColor: '#2ecc71',
  },
  ROTTEN_APPLE: {
    id: 'rotten_apple',
    name: 'Rotten Apple',
    points: -2,
    weight: 12,
    isPositive: false,
    incrementsCombo: false,
    missPenaltyLife: false,
    speedMultiplier: 0.95,
    floatingText: '-2',
    floatingColor: '#e74c3c',
    screenFlash: true,
    basketShake: true,
  },
  BUG: {
    id: 'bug',
    name: 'Bug / Insect',
    points: 0,
    weight: 8,
    isPositive: false,
    incrementsCombo: false,
    missPenaltyLife: false,
    speedMultiplier: 1.05,
    slowsPlayer: true,
    slowDurationMs: 3000,
    floatingText: 'SLOWED!',
    floatingColor: '#f1c40f',
    basketShake: true,
  },
  GOLDEN_APPLE: {
    id: 'golden_apple',
    name: 'Golden Apple',
    points: 5,
    weight: 5,
    isPositive: true,
    incrementsCombo: true,
    missPenaltyLife: false,
    speedMultiplier: 1.25,
    floatingText: '+5',
    floatingColor: '#ffd700',
  },
  CLOCK: {
    id: 'clock',
    name: 'Clock / Extra Time',
    points: 0,
    weight: 4,
    isPositive: true,
    incrementsCombo: false,
    missPenaltyLife: false,
    extraTimeSec: 5,
    speedMultiplier: 1.1,
    floatingText: '+5 SEC',
    floatingColor: '#00f0ff',
  },
  BOMB: {
    id: 'bomb',
    name: 'Bomb',
    points: 0,
    weight: 6,
    isPositive: false,
    incrementsCombo: false,
    missPenaltyLife: false,
    lifePenalty: 1,
    speedMultiplier: 1.0,
    floatingText: '-1 LIFE',
    floatingColor: '#ff2a2a',
    screenFlash: true,
    basketShake: true,
  },
};

/**
 * Returns a normalized weighted random item definition.
 * @param {Array<object>} itemsList - Optional override list of items with .weight
 * @returns {object} The chosen item definition
 */
export function getRandomItemType(itemsList = Object.values(ITEM_TYPES)) {
  const totalWeight = itemsList.reduce((sum, item) => sum + (item.weight || 0), 0);
  if (totalWeight <= 0) return itemsList[0];

  const randomVal = Math.random() * totalWeight;
  let runningSum = 0;

  for (const item of itemsList) {
    runningSum += item.weight || 0;
    if (randomVal <= runningSum) {
      return item;
    }
  }

  return itemsList[0];
}

