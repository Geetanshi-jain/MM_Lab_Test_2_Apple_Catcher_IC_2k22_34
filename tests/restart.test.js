import { describe, it } from 'node:test';
import assert from 'node:assert';
import { GameState } from '../src/game/gameState.js';
import { ITEM_TYPES, GAME_STATES } from '../src/game/constants.js';

describe('Restart and Persistence Integrity', () => {
  it('resets score, lives, timers, combo, and penalties on new round', () => {
    const state = new GameState({ timeLimit: 30, targetScore: 20 });
    state.startRound();

    // Play round: score points, take damage, get slowed
    state.catchItem(ITEM_TYPES.GOLDEN_APPLE); // score = 5
    state.missItem(ITEM_TYPES.NORMAL_APPLE); // lives = 2
    state.updateTime(5000); // 5 seconds elapsed (25s left)
    state.catchItem(ITEM_TYPES.BUG); // apply bug slow (3000ms remaining)

    assert.strictEqual(state.score, 5);
    assert.strictEqual(state.lives, 2);
    assert.strictEqual(state.isSlowed, true);
    assert.strictEqual(Math.round(state.timeRemaining), 25);

    // Now restart the round: verify all effects including slow are wiped clean
    state.startRound({ timeLimit: 30, targetScore: 20 });

    assert.strictEqual(state.score, 0);
    assert.strictEqual(state.lives, 3);
    assert.strictEqual(state.comboStreak, 0);
    assert.strictEqual(state.frenzyActive, false);
    assert.strictEqual(state.isSlowed, false);
    assert.strictEqual(state.slowTimeRemainingMs, 0);
    assert.strictEqual(state.timeRemaining, 30);
    assert.strictEqual(state.status, GAME_STATES.PLAYING);
  });

  it('preserves best score across round restarts', () => {
    const state = new GameState({ timeLimit: 30 });
    state.startRound();

    state.catchItem(ITEM_TYPES.GOLDEN_APPLE); // 5
    state.catchItem(ITEM_TYPES.GOLDEN_APPLE); // 10
    assert.strictEqual(state.bestScore, 10);

    // Restart
    state.startRound();
    assert.strictEqual(state.score, 0);
    assert.strictEqual(state.bestScore, 10); // preserved!
  });
});
