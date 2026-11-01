import { describe, it } from 'node:test';
import assert from 'node:assert';
import { GameState } from '../src/game/gameState.js';
import { ITEM_TYPES } from '../src/game/constants.js';

describe('Combo Streak and Frenzy Mode', () => {
  it('increments combo streak on successful normal and golden apple catches', () => {
    const state = new GameState({ timeLimit: 60 });
    state.startRound();

    state.catchItem(ITEM_TYPES.NORMAL_APPLE);
    assert.strictEqual(state.comboStreak, 1);

    state.catchItem(ITEM_TYPES.GOLDEN_APPLE);
    assert.strictEqual(state.comboStreak, 2);

    state.catchItem(ITEM_TYPES.NORMAL_APPLE);
    assert.strictEqual(state.comboStreak, 3);
  });

  it('resets combo streak when a normal apple is missed', () => {
    const state = new GameState({ timeLimit: 60 });
    state.startRound();

    state.catchItem(ITEM_TYPES.NORMAL_APPLE);
    state.catchItem(ITEM_TYPES.NORMAL_APPLE);
    assert.strictEqual(state.comboStreak, 2);

    state.missItem(ITEM_TYPES.NORMAL_APPLE);
    assert.strictEqual(state.comboStreak, 0);
  });

  it('resets combo streak when an obstacle or negative item is caught', () => {
    const state = new GameState({ timeLimit: 60 });

    // Rotten apple resets
    state.startRound();
    state.catchItem(ITEM_TYPES.NORMAL_APPLE);
    state.catchItem(ITEM_TYPES.NORMAL_APPLE);
    state.catchItem(ITEM_TYPES.ROTTEN_APPLE);
    assert.strictEqual(state.comboStreak, 0);

    // Bug resets
    state.startRound();
    state.catchItem(ITEM_TYPES.NORMAL_APPLE);
    state.catchItem(ITEM_TYPES.BUG);
    assert.strictEqual(state.comboStreak, 0);

    // Bomb resets
    state.startRound();
    state.catchItem(ITEM_TYPES.NORMAL_APPLE);
    state.catchItem(ITEM_TYPES.BOMB);
    assert.strictEqual(state.comboStreak, 0);
  });

  it('activates 2x Frenzy for 5 seconds upon 5 consecutive qualifying catches', () => {
    const state = new GameState({ timeLimit: 60 });
    state.startRound();

    for (let i = 0; i < 4; i++) {
      state.catchItem(ITEM_TYPES.NORMAL_APPLE);
      assert.strictEqual(state.frenzyActive, false);
    }

    const fifthCatch = state.catchItem(ITEM_TYPES.NORMAL_APPLE);
    assert.strictEqual(fifthCatch.frenzyActivated, true);
    assert.strictEqual(state.frenzyActive, true);
    assert.strictEqual(state.frenzyTimeRemainingMs, 5000);

    // Update time: after 5 seconds, Frenzy expires
    state.updateTime(5000);
    assert.strictEqual(state.frenzyActive, false);
  });
});

