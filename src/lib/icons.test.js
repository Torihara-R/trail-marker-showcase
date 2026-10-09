import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ICON_EMOJI, ICON_PHOTO, NO_ICON, centerSquare, iconEmojiFrom, iconPhotoFile } from './icons.js';

test('iconEmojiFrom: 最初の1文字だけを取り出す', () => {
  assert.equal(iconEmojiFrom('🍄⭐'), '🍄');
  assert.equal(iconEmojiFrom('  🏁  '), '🏁');
  assert.equal(iconEmojiFrom('🇯🇵 日本'), '🇯🇵');
  assert.equal(iconEmojiFrom('森'), '森');
});

test('iconEmojiFrom: 空や文字列でないもの、長すぎるものは空にする', () => {
  assert.equal(iconEmojiFrom(''), '');
  assert.equal(iconEmojiFrom('   '), '');
  assert.equal(iconEmojiFrom(undefined), '');
  assert.equal(iconEmojiFrom(42), '');
  // 結合記号をいくつでも重ねられるので、長さに上限を付けている。
  assert.equal(iconEmojiFrom(`a${'́'.repeat(100)}`), '');
});

test('iconPhotoFile: 写真のアイコンのときだけファイル名を返す', () => {
  assert.equal(iconPhotoFile({ iconType: ICON_PHOTO, iconValue: 'a.png' }), 'a.png');
  assert.equal(iconPhotoFile({ iconType: ICON_EMOJI, iconValue: '🍄' }), null);
  assert.equal(iconPhotoFile({ iconType: ICON_PHOTO, iconValue: '' }), null);
  assert.equal(iconPhotoFile(NO_ICON), null);
  // アイコンの項目を持たないもの（古い形のデータ）でも落ちない。
  assert.equal(iconPhotoFile({}), null);
});

test('centerSquare: 横長・縦長の画像から、中央の正方形を切り出す', () => {
  assert.deepEqual(centerSquare(400, 300), { originX: 50, originY: 0, width: 300, height: 300 });
  assert.deepEqual(centerSquare(300, 401), { originX: 0, originY: 50, width: 300, height: 300 });
  assert.deepEqual(centerSquare(256, 256), { originX: 0, originY: 0, width: 256, height: 256 });
});
