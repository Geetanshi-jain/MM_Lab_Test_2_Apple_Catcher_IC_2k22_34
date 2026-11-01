import { describe, it } from 'node:test';
import assert from 'node:assert';
import { GameState } from '../src/game/gameState.js';
import { ITEM_TYPES } from '../src/game/constants.js';

describe('Scoring Rules', () => {
  it('awards 1 point for normal apple', () => {
    const state = new GameState({ targetScore: 100, timeLimit: 60 });
    state.startRound();
    const result = state.catchItem(ITEM_TYPES.NORMAL_APPLE);

    assert.strictEqual(result.scoreDelta, 1);
    assert.strictEqual(state.score, 1);
  });

  it('awards 5 points for golden apple', () => {
    const state = new GameState({ targetScore: 100, timeLimit: 60 });
    state.startRound();
    const result = state.catchItem(ITEM_TYPES.GOLDEN_APPLE);

    assert.strictEqual(result.scoreDelta, 5);
    assert.strictEqual(state.score, 5);
  });

  it('subtracts 2 points for rotten apple and never drops below zero', () => {
    const state = new GameState({ targetScore: 100, timeLimit: 60 });
    state.startRound();

    // From 0 score
    const result1 = state.catchItem(ITEM_TYPES.ROTTEN_APPLE);
    assert.strictEqual(result1.scoreDelta, -2);
    assert.strictEqual(state.score, 0); // clamped at 0

    // From 1 score
    state.catchItem(ITEM_TYPES.NORMAL_APPLE);
    assert.strictEqual(state.score, 1);
    const result2 = state.catchItem(ITEM_TYPES.ROTTEN_APPLE);
    assert.strictEqual(result2.scoreDelta, -2);
    assert.strictEqual(state.score, 0); // 1 - 2 = 0 (never negative)

    // From 5 score
    state.catchItem(ITEM_TYPES.GOLDEN_APPLE);
    assert.strictEqual(state.score, 5);
    state.catchItem(ITEM_TYPES.ROTTEN_APPLE);
    assert.strictEqual(state.score, 3);
  });

  it('doubles positive scoring during 2x Frenzy', () => {
    const state = new GameState({ targetScore: 100, timeLimit: 60 });
    state.startRound();

    // Trigger Frenzy by catching 5 normal apples
    for (let i = 0; i < 5; i++) {
      state.catchItem(ITEM_TYPES.NORMAL_APPLE);
    }
    assert.strictEqual(state.comboStreak, 5);
    assert.strictEqual(state.frenzyActive, true);
    assert.strictEqual(state.score, 5);

    // In frenzy: normal apple = 1 * 2 = 2
    const frenzyNormal = state.catchItem(ITEM_TYPES.NORMAL_APPLE);
    assert.strictEqual(frenzyNormal.scoreDelta, 2);
    assert.strictEqual(state.score, 7);

    // In frenzy: golden apple = 5 * 2 = 10
    const frenzyGolden = state.catchItem(ITEM_TYPES.GOLDEN_APPLE);
    assert.strictEqual(frenzyGolden.scoreDelta, 10);
    assert.strictEqual(state.score, 17);
  });

  it('does NOT multiply negative scoring penalties during Frenzy', () => {
    const state = new GameState({ targetScore: 100, timeLimit: 60 });
    state.startRound();

    // Activate frenzy
    for (let i = 0; i < 5; i++) {
      state.catchItem(ITEM_TYPES.NORMAL_APPLE);
    }
    assert.strictEqual(state.frenzyActive, true);
    const scoreBefore = state.score; // 5

    // Catch rotten apple during frenzy
    const result = state.catchItem(ITEM_TYPES.ROTTEN_APPLE);
    assert.strictEqual(result.scoreDelta, -2); // exactly -2, NOT -4!
    assert.strictEqual(state.score, scoreBefore - 2);
  });
});

