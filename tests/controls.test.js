import { describe, it } from 'node:test';
import assert from 'node:assert';
import { GAME_CONFIG } from '../src/game/constants.js';

/**
 * Helper function for clamping basket horizontal position within playable area.
 */
function clampBasketX(targetX, basketWidth, screenWidth) {
  const half = basketWidth / 2;
  return Math.max(half, Math.min(targetX, screenWidth - half));
}

describe('Controls and Boundary Clamping', () => {
  it('clamps basket position within safe screen boundaries', () => {
    const screenWidth = GAME_CONFIG.width; // 500
    const basketWidth = 100; // 100x80
    const halfWidth = basketWidth / 2; // 50

    // Center
    assert.strictEqual(clampBasketX(250, basketWidth, screenWidth), 250);

    // Off-screen to the left (e.g. -50 or 0)
    assert.strictEqual(clampBasketX(-50, basketWidth, screenWidth), halfWidth);
    assert.strictEqual(clampBasketX(10, basketWidth, screenWidth), halfWidth);

    // Off-screen to the right (e.g. 550 or 500)
    assert.strictEqual(clampBasketX(550, basketWidth, screenWidth), screenWidth - halfWidth);
    assert.strictEqual(clampBasketX(490, basketWidth, screenWidth), screenWidth - halfWidth);
  });

  it('calculates slowed velocity appropriately', () => {
    const normalSpeed = GAME_CONFIG.baseBasketSpeed;
    const slowFactor = GAME_CONFIG.bugSlowFactor;
    const slowedSpeed = normalSpeed * slowFactor;

    assert.strictEqual(slowedSpeed < normalSpeed, true);
    assert.strictEqual(Math.round(slowedSpeed), Math.round(normalSpeed * 0.55));
  });
});

