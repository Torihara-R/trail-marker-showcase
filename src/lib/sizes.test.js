import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  DEFAULT_SIZE,
  SIZE_STEPS,
  canStepSize,
  cleanSize,
  emojiFontSize,
  emojiTouchSize,
  sizeLabel,
  stepSize,
} from './sizes.js';

test('cleanSize: 数でなければ標準にし、範囲に収めて、小数第2位までにする', () => {
  for (const value of [undefined, null, 'x', NaN, Infinity]) {
    assert.equal(cleanSize(value), DEFAULT_SIZE, String(value));
  }
  assert.equal(cleanSize(1.5), 1.5);
  assert.equal(cleanSize(0), 0.25);
  assert.equal(cleanSize(-3), 0.25);
  assert.equal(cleanSize(100), 4);
  assert.equal(cleanSize(1.23456), 1.23);
});

test('stepSize: 段階を1つずつ動かす', () => {
  assert.equal(stepSize(1, 1), 1.5);
  assert.equal(stepSize(1, -1), 0.75);
  assert.equal(stepSize(0.5, 1), 0.75);
  assert.equal(stepSize(2, -1), 1.5);
});

test('stepSize: 端では止まる', () => {
  assert.equal(stepSize(3, 1), 3);
  assert.equal(stepSize(0.5, -1), 0.5);
  // 範囲の外の値からも、端の段階に収まる。
  assert.equal(stepSize(4, 1), 3);
  assert.equal(stepSize(0.25, -1), 0.5);
});

test('stepSize: 段階の間の値（読み込んだものなど）からは、次の段階へ動く', () => {
  assert.equal(stepSize(1.2, 1), 1.5);
  assert.equal(stepSize(1.2, -1), 1);
  assert.equal(stepSize(0.6, 1), 0.75);
  assert.equal(stepSize(0.6, -1), 0.5);
});

test('stepSize: 何度続けても、段階の範囲の外には出ない', () => {
  let value = 1;
  for (let count = 0; count < 20; count += 1) value = stepSize(value, 1);
  assert.equal(value, SIZE_STEPS[SIZE_STEPS.length - 1]);
  for (let count = 0; count < 20; count += 1) value = stepSize(value, -1);
  assert.equal(value, SIZE_STEPS[0]);
});

test('canStepSize: 端では、それ以上動かせない', () => {
  assert.equal(canStepSize(3, 1), false);
  assert.equal(canStepSize(3, -1), true);
  assert.equal(canStepSize(0.5, -1), false);
  assert.equal(canStepSize(0.5, 1), true);
  assert.equal(canStepSize(1, 1), true);
  assert.equal(canStepSize(1, -1), true);
});

test('sizeLabel: パーセントで表す', () => {
  assert.equal(sizeLabel(1), '100%');
  assert.equal(sizeLabel(0.75), '75%');
  assert.equal(sizeLabel(undefined), '100%');
});

test('emojiFontSize: 倍率に比例する', () => {
  assert.equal(emojiFontSize(1), 26);
  assert.equal(emojiFontSize(2), 52);
  assert.equal(emojiFontSize(0.5), 13);
});

test('emojiTouchSize: 小さくしても、指で触れる範囲は標準より小さくならない。大きくすると広がる', () => {
  assert.equal(emojiTouchSize(0.5), 44);
  assert.equal(emojiTouchSize(1), 44);
  assert.equal(emojiTouchSize(2), 88);
});
