import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  NEST_LIMIT_MESSAGE,
  arrangeFolders,
  canCreateFolderIn,
  canMoveFolder,
  moveTargets,
  withFolderPaths,
} from './folderTree.js';

// 名前順で渡される想定（データベースの並び）。
const folders = [
  { id: 3, name: 'A ゲーム', parentId: null },
  { id: 5, name: 'ソロ', parentId: 3 },
  { id: 4, name: 'B ゲーム', parentId: null },
  { id: 6, name: 'タイム', parentId: 3 },
  { id: 7, name: 'ソロ', parentId: 4 },
];

test('arrangeFolders: 一段目の下に、その中の二段目を並べる。道筋と深さを足す', () => {
  const arranged = arrangeFolders(folders);
  assert.deepEqual(
    arranged.map((folder) => [folder.id, folder.depth, folder.path]),
    [
      [3, 0, 'A ゲーム'],
      [5, 1, 'A ゲーム ＞ ソロ'],
      [6, 1, 'A ゲーム ＞ タイム'],
      [4, 0, 'B ゲーム'],
      [7, 1, 'B ゲーム ＞ ソロ'],
    ]
  );
});

test('arrangeFolders: parentId が無いデータ（古い形）は、すべて一段目になる', () => {
  const arranged = arrangeFolders([
    { id: 1, name: 'a' },
    { id: 2, name: 'b' },
  ]);
  assert.deepEqual(
    arranged.map((folder) => [folder.id, folder.depth, folder.parentId]),
    [
      [1, 0, null],
      [2, 0, null],
    ]
  );
});

test('arrangeFolders: 壊れたデータ（親が無い、親が二段目、自分が親）は、一段目として扱う', () => {
  const arranged = arrangeFolders([
    { id: 1, name: '親', parentId: null },
    { id: 2, name: '子', parentId: 1 },
    { id: 3, name: '孫', parentId: 2 },
    { id: 4, name: '迷子', parentId: 99 },
    { id: 5, name: '自分', parentId: 5 },
  ]);
  const byId = Object.fromEntries(arranged.map((folder) => [folder.id, folder.depth]));
  assert.deepEqual(byId, { 1: 0, 2: 1, 3: 0, 4: 0, 5: 0 });
  // どのフォルダも1回ずつだけ出る。
  assert.equal(arranged.length, 5);
});

test('canCreateFolderIn: 一段目のフォルダの中には作れる。二段目の中、存在しないフォルダの中には作れない', () => {
  assert.deepEqual(canCreateFolderIn(folders, null), { ok: true });
  assert.deepEqual(canCreateFolderIn(folders, 3), { ok: true });
  assert.deepEqual(canCreateFolderIn(folders, 5), { ok: false, reason: NEST_LIMIT_MESSAGE });
  assert.equal(canCreateFolderIn(folders, 99).ok, false);
});

test('canMoveFolder: 中にフォルダが無いフォルダは、一段目のフォルダの中へ移せる', () => {
  assert.deepEqual(canMoveFolder(folders, 7, 3), { ok: true });
  // 二段目のフォルダを、別の親へ移す。
  assert.deepEqual(canMoveFolder(folders, 5, 4), { ok: true });
});

test('canMoveFolder: 一段目へ出すのは、いつでもできる', () => {
  assert.deepEqual(canMoveFolder(folders, 5, null), { ok: true });
  assert.deepEqual(canMoveFolder(folders, 3, null), { ok: true });
});

test('canMoveFolder: 中にフォルダがあるフォルダは、別のフォルダの中へ移せない（三段になる）', () => {
  const result = canMoveFolder(folders, 3, 4);
  assert.equal(result.ok, false);
  assert.match(result.reason, /二段/);
});

test('canMoveFolder: 自分自身の中、二段目のフォルダの中、存在しないフォルダの中へは移せない', () => {
  assert.equal(canMoveFolder(folders, 4, 4).ok, false);
  assert.equal(canMoveFolder(folders, 4, 5).ok, false);
  assert.equal(canMoveFolder(folders, 4, 99).ok, false);
  assert.equal(canMoveFolder(folders, 99, 3).ok, false);
});

test('moveTargets: 移し先の候補は、一段目のフォルダのうち、自分自身以外', () => {
  assert.deepEqual(
    moveTargets(folders, 3).map((folder) => folder.id),
    [4]
  );
  assert.deepEqual(
    moveTargets(folders, 7).map((folder) => folder.id),
    [3, 4]
  );
});

test('withFolderPaths: フォルダに入っているものに、道筋の名前を入れる。入っていないものはそのまま', () => {
  const items = [
    { id: 1, name: 'a', folderId: 5, folderName: 'ソロ' },
    { id: 2, name: 'b', folderId: 3, folderName: 'A ゲーム' },
    { id: 3, name: 'c', folderId: null, folderName: null },
  ];
  const result = withFolderPaths(items, folders);
  assert.equal(result[0].folderName, 'A ゲーム ＞ ソロ');
  assert.equal(result[1].folderName, 'A ゲーム');
  assert.equal(result[2].folderName, null);
});
