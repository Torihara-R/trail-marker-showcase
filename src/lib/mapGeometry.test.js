import assert from 'node:assert/strict';
import { test } from 'node:test';

import { clamp01, fitContain } from './mapGeometry.js';

test('fitContain: 横長の画像は幅いっぱいに収まる', () => {
  assert.deepEqual(fitContain(400, 600, 2000, 1000), { width: 400, height: 200 });
});

test('fitContain: 縦長の画像は高さいっぱいに収まる', () => {
  assert.deepEqual(fitContain(400, 600, 1000, 3000), { width: 200, height: 600 });
});

test('fitContain: 表示領域より小さい画像は拡大される', () => {
  assert.deepEqual(fitContain(400, 600, 100, 100), { width: 400, height: 400 });
});

test('fitContain: 大きさが分からないときは 0 を返す', () => {
  assert.deepEqual(fitContain(0, 600, 100, 100), { width: 0, height: 0 });
  assert.deepEqual(fitContain(400, 600, 0, 100), { width: 0, height: 0 });
  assert.deepEqual(fitContain(400, 600, undefined, 100), { width: 0, height: 0 });
});

test('clamp01: 0〜1 の外の値を端に寄せる', () => {
  assert.equal(clamp01(-0.2), 0);
  assert.equal(clamp01(0.4), 0.4);
  assert.equal(clamp01(1.3), 1);
});
