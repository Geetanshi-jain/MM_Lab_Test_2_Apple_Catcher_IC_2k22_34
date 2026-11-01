import { describe, it } from 'node:test';
import assert from 'node:assert';
import { GameState } from '../src/game/gameState.js';
import { ITEM_TYPES } from '../src/game/constants.js';

describe('Power-ups and Penalties', () => {
  it('catching a bug slows the basket for 3 seconds', () => {
    const state = new GameState({ timeLimit: 60 });
    state.startRound();

    assert.strictEqual(state.isSlowed, false);
    const result = state.catchItem(ITEM_TYPES.BUG);

    assert.strictEqual(result.isSlowed, true);
    assert.strictEqual(state.isSlowed, true);
    assert.strictEqual(state.slowTimeRemainingMs, 3000);

    // Advance 1.5 seconds: still slowed
    state.updateTime(1500);
    assert.strictEqual(state.isSlowed, true);
    assert.strictEqual(state.slowTimeRemainingMs, 1500);

    // Advance another 1.5 seconds: slow effect expires
    state.updateTime(1500);
    assert.strictEqual(state.isSlowed, false);
    assert.strictEqual(state.slowTimeRemainingMs, 0);
  });

  it('repeated bug catches refresh the duration without permanently slowing', () => {
    const state = new GameState({ timeLimit: 60 });
    state.startRound();

    state.catchItem(ITEM_TYPES.BUG);
    state.updateTime(2000); // 1000ms left
    assert.strictEqual(state.slowTimeRemainingMs, 1000);

    // Catch bug again
    state.catchItem(ITEM_TYPES.BUG);
    assert.strictEqual(state.slowTimeRemainingMs, 3000); // refreshed to 3s

    state.updateTime(3000);
    assert.strictEqual(state.isSlowed, false);
  });

  it('catching a clock adds 5 seconds to remaining time', () => {
    const state = new GameState({ timeLimit: 30 });
    state.startRound();

    state.updateTime(10000); // 20s remaining
    assert.strictEqual(Math.round(state.timeRemaining), 20);

    const clockResult = state.catchItem(ITEM_TYPES.CLOCK);
    assert.strictEqual(clockResult.timeDelta, 5);
    assert.strictEqual(Math.round(state.timeRemaining), 25);
  });

  it('timer never displays or drops below zero during game over', () => {
    const state = new GameState({ timeLimit: 10 });
    state.startRound();

    const result = state.updateTime(15000); // elapsed 15s when limit was 10s
    assert.strictEqual(result.gameOver, true);
    assert.strictEqual(state.timeRemaining, 0);
  });
});

