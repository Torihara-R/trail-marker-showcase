import assert from 'node:assert/strict';
import { test } from 'node:test';

import { DEFAULT_EMOJI, buildPalette, firstGrapheme } from './emoji.js';

test('firstGrapheme: 絵文字を1つ取り出す', () => {
  assert.equal(firstGrapheme('🍄'), '🍄');
  assert.equal(firstGrapheme('🍄⭐'), '🍄');
});

test('firstGrapheme: 前後の空白を無視し、空なら空文字を返す', () => {
  assert.equal(firstGrapheme('  ⭐  '), '⭐');
  assert.equal(firstGrapheme(''), '');
  assert.equal(firstGrapheme('   '), '');
});

test('firstGrapheme: 異体字セレクタつきの絵文字を壊さない', () => {
  assert.equal(firstGrapheme('⚠️🔥'), '⚠️');
  assert.equal(firstGrapheme('➡️'), '➡️');
});

test('firstGrapheme: 国旗を壊さない', () => {
  assert.equal(firstGrapheme('🇯🇵🇺🇸'), '🇯🇵');
});

test('firstGrapheme: 肌の色つきの絵文字を壊さない', () => {
  assert.equal(firstGrapheme('👍🏽👍'), '👍🏽');
});

test('firstGrapheme: 接合された絵文字を壊さない', () => {
  assert.equal(firstGrapheme('👨‍👩‍👧⭐'), '👨‍👩‍👧');
  assert.equal(firstGrapheme('🏳️‍🌈x'), '🏳️‍🌈');
});

test('firstGrapheme: 囲み数字を壊さない', () => {
  assert.equal(firstGrapheme('1️⃣2️⃣'), '1️⃣');
});

test('firstGrapheme: 絵文字以外の文字も1文字として取り出す', () => {
  assert.equal(firstGrapheme('ABC'), 'A');
  assert.equal(firstGrapheme('近道'), '近');
  assert.equal(firstGrapheme('がき'), 'が');
});

test('DEFAULT_EMOJI: どれも1文字として扱われ、重複が無い', () => {
  for (const emoji of DEFAULT_EMOJI) {
    assert.equal(firstGrapheme(emoji), emoji);
  }
  assert.equal(new Set(DEFAULT_EMOJI).size, DEFAULT_EMOJI.length);
});

test('buildPalette: 重複を除き、先のリストを前に並べる', () => {
  assert.deepEqual(buildPalette(['🔥'], ['⭐', '🔥'], ['🍄', '⭐']), ['🔥', '⭐', '🍄']);
  assert.deepEqual(buildPalette([], ['⭐']), ['⭐']);
});
