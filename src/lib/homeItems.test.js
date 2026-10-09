import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildFolderItems, buildHomeItems } from './homeItems.js';

const folders = [
  { id: 1, name: 'レース', mapCount: 2, comboCount: 1 },
  { id: 2, name: '探索', mapCount: 0, comboCount: 0 },
];

const maps = [
  { id: 10, name: '森のコース', folderId: 1, folderName: 'レース' },
  { id: 11, name: '海のコース', folderId: 1, folderName: 'レース' },
  { id: 12, name: '練習用マップ', folderId: null, folderName: null },
];

const combos = [
  { id: 20, name: '森 → 海', folderId: 1, folderName: 'レース', firstMapId: 10, secondMapId: 11 },
  { id: 21, name: '練習の見比べ', folderId: null, folderName: null, firstMapId: 12, secondMapId: 10 },
];

function summarize(items) {
  return items.map((item) => {
    const folderMark = item.showFolder ? ':withFolder' : '';
    if (item.type === 'header') return `header:${item.title}`;
    if (item.type === 'folder') return `folder:${item.folder.id}`;
    if (item.type === 'combo') return `combo:${item.combo.id}${folderMark}`;
    return `map:${item.map.id}${folderMark}`;
  });
}

function buildHome(overrides) {
  return summarize(buildHomeItems({ maps, folders, combos, query: '', ...overrides }));
}

test('最初の画面: フォルダに入れていない組み合わせ、フォルダ、フォルダに入れていないマップの順に並べる', () => {
  assert.deepEqual(buildHome({}), [
    'header:組み合わせ',
    'combo:21',
    'header:フォルダ',
    'folder:1',
    'folder:2',
    'header:フォルダに入れていないマップ',
    'map:12',
  ]);
});

test('最初の画面: フォルダに入っている組み合わせは出さない', () => {
  const filedCombos = combos.filter((combo) => combo.folderId !== null);
  assert.deepEqual(buildHome({ combos: filedCombos }), [
    'header:フォルダ',
    'folder:1',
    'folder:2',
    'header:フォルダに入れていないマップ',
    'map:12',
  ]);
});

test('最初の画面: フォルダも組み合わせも無ければ、見出しを出さずにマップだけを並べる', () => {
  const looseMaps = maps.map((map) => ({ ...map, folderId: null, folderName: null }));
  assert.deepEqual(buildHome({ maps: looseMaps, folders: [], combos: [] }), [
    'map:10',
    'map:11',
    'map:12',
  ]);
});

test('最初の画面: フォルダに入れていないマップが無ければ、その見出しも出さない', () => {
  const filedMaps = maps.filter((map) => map.folderId !== null);
  assert.deepEqual(buildHome({ maps: filedMaps, combos: [] }), [
    'header:フォルダ',
    'folder:1',
    'folder:2',
  ]);
});

test('最初の画面: 検索すると、フォルダの中も含めた組み合わせとマップを名前で探す', () => {
  assert.deepEqual(buildHome({ query: 'こーす' }), ['map:10:withFolder', 'map:11:withFolder']);
  assert.deepEqual(buildHome({ query: '練習' }), ['combo:21:withFolder', 'map:12:withFolder']);
  assert.deepEqual(buildHome({ query: '森' }), ['combo:20:withFolder', 'map:10:withFolder']);
  assert.deepEqual(buildHome({ query: '存在しない' }), []);
});

test('最初の画面: 空白だけの検索語は、検索していないものとして扱う', () => {
  assert.equal(buildHome({ query: '   ' })[0], 'header:組み合わせ');
});

const folderMaps = maps.filter((map) => map.folderId === 1);
const folderCombos = combos.filter((combo) => combo.folderId === 1);

function buildFolder(overrides) {
  return summarize(
    buildFolderItems({ maps: folderMaps, combos: folderCombos, query: '', ...overrides })
  );
}

test('フォルダの画面: 組み合わせがあれば、見出しで組み合わせとマップを分ける', () => {
  assert.deepEqual(buildFolder({}), [
    'header:組み合わせ',
    'combo:20',
    'header:マップ',
    'map:10',
    'map:11',
  ]);
});

test('フォルダの画面: 組み合わせが無ければ、見出しを出さずにマップだけを並べる', () => {
  assert.deepEqual(buildFolder({ combos: [] }), ['map:10', 'map:11']);
});

test('フォルダの画面: 組み合わせだけのときは、マップの見出しを出さない', () => {
  assert.deepEqual(buildFolder({ maps: [] }), ['header:組み合わせ', 'combo:20']);
});

const subfolders = [
  { id: 30, name: 'ソロ', parentId: 1, mapCount: 0, comboCount: 0 },
  { id: 31, name: 'タイム', parentId: 1, mapCount: 0, comboCount: 0 },
];

test('最初の画面: 二段目のフォルダは並べない（親のフォルダの中で見る）', () => {
  assert.deepEqual(buildHome({ folders: [...folders, ...subfolders], combos: [], maps: [] }), [
    'header:フォルダ',
    'folder:1',
    'folder:2',
  ]);
});

test('フォルダの画面: 中のフォルダ、組み合わせ、マップの順に、見出しで分けて並べる', () => {
  assert.deepEqual(buildFolder({ folders: subfolders }), [
    'header:フォルダ',
    'folder:30',
    'folder:31',
    'header:組み合わせ',
    'combo:20',
    'header:マップ',
    'map:10',
    'map:11',
  ]);
});

test('フォルダの画面: 中のフォルダとマップだけのときは、組み合わせの見出しを出さない', () => {
  assert.deepEqual(buildFolder({ folders: subfolders, combos: [] }), [
    'header:フォルダ',
    'folder:30',
    'folder:31',
    'header:マップ',
    'map:10',
    'map:11',
  ]);
});

test('フォルダの画面: 検索すると、中のフォルダは出さず、直下の組み合わせとマップだけを探す', () => {
  assert.deepEqual(buildFolder({ folders: subfolders, query: 'ソロ' }), []);
  assert.deepEqual(buildFolder({ folders: subfolders, query: '海' }), ['combo:20', 'map:11']);
});

test('フォルダの画面: 検索すると、そのフォルダの中だけを探し、フォルダ名は付けない', () => {
  assert.deepEqual(buildFolder({ query: '海' }), ['combo:20', 'map:11']);
  assert.deepEqual(buildFolder({ query: '森' }), ['combo:20', 'map:10']);
  assert.deepEqual(buildFolder({ query: '存在しない' }), []);
});
