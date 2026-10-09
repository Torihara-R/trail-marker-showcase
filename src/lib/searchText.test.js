import assert from 'node:assert/strict';
import { test } from 'node:test';

import { filterMapsByName, normalizeForSearch } from './searchText.js';

const maps = [
  { id: 1, name: 'キノコ峠 ショートカット' },
  { id: 2, name: 'Rainbow Course' },
  { id: 3, name: 'うみべのコース２' },
];

function namesFor(query) {
  return filterMapsByName(maps, query).map((map) => map.id);
}

test('検索語が空なら全件を返す', () => {
  assert.deepEqual(namesFor(''), [1, 2, 3]);
  assert.deepEqual(namesFor('   '), [1, 2, 3]);
});

test('名前の一部で見つかる', () => {
  assert.deepEqual(namesFor('峠'), [1]);
  assert.deepEqual(namesFor('コース'), [3]);
});

test('ひらがなとカタカナを区別しない', () => {
  assert.deepEqual(namesFor('きのこ'), [1]);
  assert.deepEqual(namesFor('ウミベ'), [3]);
});

test('大文字と小文字、全角と半角を区別しない', () => {
  assert.deepEqual(namesFor('rainbow'), [2]);
  assert.deepEqual(namesFor('ＲＡＩＮＢＯＷ'), [2]);
  assert.deepEqual(namesFor('2'), [3]);
});

test('空白で区切った語はすべて含む必要がある', () => {
  assert.deepEqual(namesFor('キノコ ショート'), [1]);
  assert.deepEqual(namesFor('キノコ course'), []);
});

test('一致しなければ空の配列を返す', () => {
  assert.deepEqual(namesFor('存在しない名前'), []);
});

test('normalizeForSearch は前後の空白を取り除く', () => {
  assert.equal(normalizeForSearch('  マップ  '), 'まっぷ');
});
