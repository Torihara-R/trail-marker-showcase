import assert from 'node:assert/strict';
import { test } from 'node:test';

import { placeBubble, tailOffset } from './noteGeometry.js';
import { DEFAULT_NOTE_SIZE, MAX_NOTE_LENGTH, cleanNote, cleanNoteSize } from './notes.js';

test('cleanNote: 前後の空白を取り、文字列でなければ空にする', () => {
  assert.equal(cleanNote('  ここでキノコ  '), 'ここでキノコ');
  assert.equal(cleanNote('1行目\n2行目'), '1行目\n2行目');
  assert.equal(cleanNote(undefined), '');
  assert.equal(cleanNote(123), '');
});

test('cleanNote: 長すぎるメモは切る。絵文字を途中で切らない', () => {
  const long = '🍄'.repeat(MAX_NOTE_LENGTH + 50);
  const cleaned = cleanNote(long);
  assert.equal(Array.from(cleaned).length, MAX_NOTE_LENGTH);
  assert.equal(cleaned, '🍄'.repeat(MAX_NOTE_LENGTH));
});

test('cleanNoteSize: 0〜2 の整数だけを受け付け、それ以外は「中」にする', () => {
  assert.equal(cleanNoteSize(0), 0);
  assert.equal(cleanNoteSize(2), 2);
  for (const value of [3, -1, 1.5, '2', null, undefined]) {
    assert.equal(cleanNoteSize(value), DEFAULT_NOTE_SIZE, String(value));
  }
});

const frame = { frameWidth: 300, frameHeight: 400, gap: 20, margin: 6 };

test('placeBubble: 入るなら絵文字の真上に、中央をそろえて出す', () => {
  const position = placeBubble({ ...frame, anchorX: 150, anchorY: 200, bubbleWidth: 100, bubbleHeight: 50 });
  assert.deepEqual(position, { placement: 'above', left: 100, top: 130 });
});

test('placeBubble: 上に入りきらないときは真下に出す', () => {
  const position = placeBubble({ ...frame, anchorX: 150, anchorY: 30, bubbleWidth: 100, bubbleHeight: 50 });
  assert.deepEqual(position, { placement: 'below', left: 100, top: 50 });
});

test('placeBubble: 上にも下にも入りきらないときは上に出す', () => {
  const position = placeBubble({ ...frame, anchorX: 150, anchorY: 200, bubbleWidth: 100, bubbleHeight: 390 });
  assert.equal(position.placement, 'above');
});

test('placeBubble: 左右は地図からはみ出さないように寄せる', () => {
  const size = { bubbleWidth: 100, bubbleHeight: 50, anchorY: 200 };
  assert.equal(placeBubble({ ...frame, ...size, anchorX: 10 }).left, 6);
  assert.equal(placeBubble({ ...frame, ...size, anchorX: 295 }).left, 194);
});

test('placeBubble: 吹き出しが地図より広いときは左端に合わせる', () => {
  const position = placeBubble({ ...frame, anchorX: 150, anchorY: 200, bubbleWidth: 320, bubbleHeight: 50 });
  assert.equal(position.left, 6);
});

test('tailOffset: しっぽを絵文字の位置に合わせ、吹き出しの角からは内側に収める', () => {
  assert.equal(tailOffset({ anchorX: 150, bubbleLeft: 100, bubbleWidth: 100, inset: 14 }), 50);
  assert.equal(tailOffset({ anchorX: 10, bubbleLeft: 6, bubbleWidth: 100, inset: 14 }), 14);
  assert.equal(tailOffset({ anchorX: 295, bubbleLeft: 194, bubbleWidth: 100, inset: 14 }), 86);
});
