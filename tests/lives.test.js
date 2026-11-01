import { describe, it } from 'node:test';
import assert from 'node:assert';
import { GameState } from '../src/game/gameState.js';
import { ITEM_TYPES, GAME_STATES } from '../src/game/constants.js';

describe('Lives and Game Over Rules', () => {
  it('starts with exactly 3 lives', () => {
    const state = new GameState();
    state.startRound();
    assert.strictEqual(state.lives, 3);
  });

  it('deducts one life when a normal apple is missed', () => {
    const state = new GameState({ timeLimit: 60 });
    state.startRound();

    const missResult = state.missItem(ITEM_TYPES.NORMAL_APPLE);
    assert.strictEqual(missResult.lifeDelta, -1);
    assert.strictEqual(state.lives, 2);
  });

  it('deducts one life when a bomb is caught', () => {
    const state = new GameState({ timeLimit: 60 });
    state.startRound();

    const bombResult = state.catchItem(ITEM_TYPES.BOMB);
    assert.strictEqual(bombResult.lifeDelta, -1);
    assert.strictEqual(state.lives, 2);
  });

  it('does NOT deduct life when missing non-penalty items', () => {
    const state = new GameState({ timeLimit: 60 });
    state.startRound();

    state.missItem(ITEM_TYPES.ROTTEN_APPLE);
    assert.strictEqual(state.lives, 3);

    state.missItem(ITEM_TYPES.GOLDEN_APPLE);
    assert.strictEqual(state.lives, 3);

    state.missItem(ITEM_TYPES.CLOCK);
    assert.strictEqual(state.lives, 3);

    state.missItem(ITEM_TYPES.BUG);
    assert.strictEqual(state.lives, 3);

    state.missItem(ITEM_TYPES.BOMB);
    assert.strictEqual(state.lives, 3);
  });

  it('triggers game over when lives reach 0 and stops further actions', () => {
    const state = new GameState({ timeLimit: 60 });
    state.startRound();

    state.missItem(ITEM_TYPES.NORMAL_APPLE); // lives = 2
    state.missItem(ITEM_TYPES.NORMAL_APPLE); // lives = 1
    const lastMiss = state.missItem(ITEM_TYPES.NORMAL_APPLE); // lives = 0

    assert.strictEqual(state.lives, 0);
    assert.strictEqual(lastMiss.gameOver, true);
    assert.strictEqual(state.status, GAME_STATES.GAME_OVER);

    // After game over, further catches or misses return null and do not change state
    const afterResult = state.catchItem(ITEM_TYPES.NORMAL_APPLE);
    assert.strictEqual(afterResult, null);
    assert.strictEqual(state.score, 0);
  });
});

