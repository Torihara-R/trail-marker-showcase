import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  PACKAGE_FORMAT,
  PACKAGE_VERSION,
  PackageError,
  buildPackage,
  extensionOf,
  parseManifest,
  safeFileName,
} from './sharePackage.js';

const sampleMaps = [
  {
    id: 3,
    name: '森のコース',
    imageFile: '1700000000000-abc123.png',
    width: 1200,
    height: 800,
    markers: [
      { id: 9, emoji: '🍄', x: 0.25, y: 0.5, note: 'ここでキノコ', noteSize: 2, scale: 1.5 },
    ],
    arrows: [
      { id: 4, x1: 0.1, y1: 0.2, x2: 0.8, y2: 0.9, cx: 0.45, cy: 0.55, color: '#1E88E5', scale: 0.5 },
    ],
  },
  {
    id: 5,
    name: '海のコース',
    imageFile: '1700000000001-def456.JPG',
    width: 640,
    height: 480,
    markers: [],
    arrows: [],
  },
];

function manifestWith(overrides) {
  const { manifest } = buildPackage({ name: 'レース' },sampleMaps);
  return JSON.stringify({ ...manifest, ...overrides });
}

test('extensionOf: 拡張子をドット付きの小文字で返す', () => {
  assert.equal(extensionOf('a.PNG'), '.png');
  assert.equal(extensionOf('images/1.jpg'), '.jpg');
  assert.equal(extensionOf('noext'), '');
});

test('safeFileName: ファイル名に使えない文字を置き換え、空なら既定の名前にする', () => {
  assert.equal(safeFileName('レース/コース:1'), 'レース_コース_1');
  assert.equal(safeFileName('   '), 'trailmarker');
});

test('buildPackage: 画像に連番の名前を付け、id などアプリ内だけの値は入れない', () => {
  const { manifest, images } = buildPackage({ name: 'レース' },sampleMaps);
  assert.equal(manifest.format, PACKAGE_FORMAT);
  assert.equal(manifest.version, PACKAGE_VERSION);
  assert.deepEqual(manifest.folder, { name: 'レース' });
  assert.deepEqual(images, [
    { entryName: 'images/1.png', imageFile: '1700000000000-abc123.png' },
    { entryName: 'images/2.jpg', imageFile: '1700000000001-def456.JPG' },
  ]);
  assert.deepEqual(manifest.maps[0].markers, [
    { emoji: '🍄', x: 0.25, y: 0.5, note: 'ここでキノコ', noteSize: 2, scale: 1.5 },
  ]);
  assert.equal('id' in manifest.maps[0], false);
  assert.equal('id' in manifest.maps[0].arrows[0], false);
});

test('buildPackage: フォルダ名が null なら、フォルダ無しの共有になる', () => {
  assert.equal(buildPackage(null, sampleMaps).manifest.folder, null);
});

test('parseManifest: buildPackage の結果をそのまま読み戻せる', () => {
  const { manifest } = buildPackage({ name: 'レース' },sampleMaps);
  const parsed = parseManifest(JSON.stringify(manifest));
  assert.equal(parsed.folderName, 'レース');
  assert.equal(parsed.maps.length, 2);
  assert.deepEqual(parsed.maps[0], {
    name: '森のコース',
    image: 'images/1.png',
    width: 1200,
    height: 800,
    icon: null,
    subfolder: null,
    markers: [{ emoji: '🍄', x: 0.25, y: 0.5, note: 'ここでキノコ', noteSize: 2, scale: 1.5 }],
    arrows: [
      { x1: 0.1, y1: 0.2, x2: 0.8, y2: 0.9, cx: 0.45, cy: 0.55, color: '#1E88E5', scale: 0.5 },
    ],
  });
});

test('parseManifest: 別の種類のファイルや壊れたファイルは PackageError にする', () => {
  assert.throws(() => parseManifest('これは JSON ではない'), PackageError);
  assert.throws(() => parseManifest('[]'), PackageError);
  assert.throws(() => parseManifest(manifestWith({ format: 'something-else' })), PackageError);
  assert.throws(() => parseManifest(manifestWith({ maps: [] })), PackageError);
  assert.throws(() => parseManifest(manifestWith({ version: 'x' })), PackageError);
});

test('parseManifest: 新しいバージョンのファイルは、更新を促す文で断る', () => {
  assert.throws(
    () => parseManifest(manifestWith({ version: PACKAGE_VERSION + 1 })),
    (error) => error instanceof PackageError && error.message.includes('更新')
  );
});

test('parseManifest: 画像の場所が images/ の外を指していたら断る', () => {
  const { manifest } = buildPackage({ name: 'レース' },sampleMaps);
  const badImages = [
    '../secret.png',
    '/etc/passwd',
    'images/../x.png',
    'images/sub/x.png',
    'images/x',
    'images/x.toolongextension',
    42,
  ];
  for (const image of badImages) {
    const broken = { ...manifest, maps: [{ ...manifest.maps[0], image }] };
    assert.throws(() => parseManifest(JSON.stringify(broken)), PackageError, String(image));
  }
});

// 実機で見つかった不具合の再発防止。AVIF の地図を共有すると、読み込み側が
// 「画像の情報が壊れています」と断っていた。受け付ける画像の種類を決め打ちにしていたため。
test('画像の種類を限らない。AVIF など、どの形式の地図も書き出して読み戻せる', () => {
  for (const imageFile of ['map.avif', 'map.heif', 'map.HEIC', 'map.webp', 'map.bmp', 'map.jxl']) {
    const { manifest, images } = buildPackage(null, [{ ...sampleMaps[0], imageFile }]);
    const parsed = parseManifest(JSON.stringify(manifest));
    assert.equal(parsed.maps[0].image, images[0].entryName, imageFile);
    assert.equal(extensionOf(parsed.maps[0].image), extensionOf(imageFile), imageFile);
  }
});

test('buildPackage: 拡張子が無い・変な形のときは既定の拡張子にして、読み込める名前にする', () => {
  for (const imageFile of ['noextension', 'map.p n g', 'map.verylongextension']) {
    const { manifest, images } = buildPackage(null, [{ ...sampleMaps[0], imageFile }]);
    assert.equal(images[0].entryName, 'images/1.jpg', imageFile);
    assert.equal(parseManifest(JSON.stringify(manifest)).maps[0].image, 'images/1.jpg');
  }
});

test('parseManifest: 画像の大きさがおかしければ断る', () => {
  const { manifest } = buildPackage({ name: 'レース' },sampleMaps);
  for (const width of [0, -5, 'wide', null, 1e9]) {
    const broken = { ...manifest, maps: [{ ...manifest.maps[0], width }] };
    assert.throws(() => parseManifest(JSON.stringify(broken)), PackageError, String(width));
  }
});

test('parseManifest: 位置を範囲内に収め、壊れた絵文字や矢印は読み飛ばす', () => {
  const { manifest } = buildPackage({ name: 'レース' },sampleMaps);
  const map = {
    ...manifest.maps[0],
    markers: [
      { emoji: '⭐🔥', x: 1.5, y: -0.2 },
      { emoji: '', x: 0.5, y: 0.5 },
      { emoji: '🍄', x: 'left', y: 0.5 },
      'not an object',
    ],
    arrows: [
      { x1: -1, y1: 0.5, x2: 3, y2: 0.5, cx: 9, cy: -9, color: 'red' },
      { x1: 0.1, y1: 0.1, x2: 0.2 },
    ],
  };
  const parsed = parseManifest(JSON.stringify({ ...manifest, maps: [map] }));
  assert.deepEqual(parsed.maps[0].markers, [
    { emoji: '⭐', x: 1, y: 0, note: '', noteSize: 1, scale: 1 },
  ]);
  assert.deepEqual(parsed.maps[0].arrows, [
    { x1: 0, y1: 0.5, x2: 1, y2: 0.5, cx: 2, cy: -1, color: '#E53935', scale: 1 },
  ]);
});

test('parseManifest: 名前が無い・長すぎるときは整える', () => {
  const { manifest } = buildPackage({ name: 'レース' },sampleMaps);
  const longName = 'あ'.repeat(200);
  const parsed = parseManifest(
    JSON.stringify({
      ...manifest,
      folder: { name: '   ' },
      maps: [
        { ...manifest.maps[0], name: longName },
        { ...manifest.maps[1], name: 123 },
      ],
    })
  );
  assert.equal(parsed.folderName, '読み込んだフォルダ');
  assert.equal(Array.from(parsed.maps[0].name).length, 60);
  assert.equal(parsed.maps[1].name, 'マップ 2');
});

test('メモ: 項目が無いファイルではメモ無しになり、おかしな値は整える', () => {
  const { manifest } = buildPackage({ name: 'レース' },sampleMaps);
  const map = {
    ...manifest.maps[0],
    markers: [
      { emoji: '🍄', x: 0.1, y: 0.1 },
      { emoji: '⭐', x: 0.2, y: 0.2, note: '  近道  ', noteSize: 0 },
      { emoji: '🚩', x: 0.3, y: 0.3, note: 42, noteSize: 9 },
      { emoji: '🔥', x: 0.4, y: 0.4, note: 'あ'.repeat(500), noteSize: 2 },
    ],
  };
  const { markers } = parseManifest(JSON.stringify({ ...manifest, maps: [map] })).maps[0];
  assert.deepEqual(markers[0], { emoji: '🍄', x: 0.1, y: 0.1, note: '', noteSize: 1, scale: 1 });
  assert.deepEqual(markers[1], { emoji: '⭐', x: 0.2, y: 0.2, note: '近道', noteSize: 0, scale: 1 });
  assert.deepEqual(markers[2], { emoji: '🚩', x: 0.3, y: 0.3, note: '', noteSize: 1, scale: 1 });
  assert.equal(Array.from(markers[3].note).length, 200);
  assert.equal(markers[3].noteSize, 2);
});

test('組み合わせ: 2枚を「何番目のマップか」で書き出し、読み戻せる', () => {
  // sampleMaps の id は 3 と 5。
  const combos = [{ id: 40, name: '森 → 海', firstMapId: 3, secondMapId: 5 }];
  const { manifest } = buildPackage({ name: 'レース' },sampleMaps, combos);
  assert.deepEqual(manifest.combos, [{ name: '森 → 海', first: 0, second: 1 }]);
  assert.deepEqual(parseManifest(JSON.stringify(manifest)).combos, [
    { name: '森 → 海', first: 0, second: 1, icon: null, subfolder: null },
  ]);
});

test('組み合わせ: 共有するマップに含まれないマップを使うものは、ファイルに入れない', () => {
  const combos = [
    { name: '外のマップを使う', firstMapId: 3, secondMapId: 999 },
    { name: '中だけ', firstMapId: 5, secondMapId: 3 },
  ];
  const { manifest } = buildPackage({ name: 'レース' },sampleMaps, combos);
  assert.deepEqual(manifest.combos, [{ name: '中だけ', first: 1, second: 0 }]);
});

test('組み合わせ: 番号がおかしいものや、同じマップ2枚のものは読み飛ばす', () => {
  const { manifest } = buildPackage({ name: 'レース' },sampleMaps);
  const combos = [
    { name: '正しい', first: 1, second: 0 },
    { name: '範囲の外', first: 0, second: 2 },
    { name: '負の番号', first: -1, second: 0 },
    { name: '同じマップ', first: 0, second: 0 },
    { name: '小数', first: 0.5, second: 1 },
    { name: 123, first: 0, second: 1 },
    'not an object',
  ];
  const parsed = parseManifest(JSON.stringify({ ...manifest, combos }));
  assert.deepEqual(parsed.combos, [
    { name: '正しい', first: 1, second: 0, icon: null, subfolder: null },
    { name: '組み合わせ 2', first: 0, second: 1, icon: null, subfolder: null },
  ]);
});

test('組み合わせ: 項目が無いファイル（古いアプリで作ったもの）も読み込める', () => {
  const { manifest } = buildPackage({ name: 'レース' },sampleMaps);
  const withoutCombos = { ...manifest };
  delete withoutCombos.combos;
  assert.deepEqual(parseManifest(JSON.stringify(withoutCombos)).combos, []);
});

test('アイコン: 絵文字はそのまま、写真は icons/ の連番の名前で書き出し、読み戻せる', () => {
  const folder = { name: 'レース', iconType: 'emoji', iconValue: '🏁' };
  const maps = [
    { ...sampleMaps[0], iconType: 'photo', iconValue: '1700000000002-aaa111.png' },
    { ...sampleMaps[1], iconType: '', iconValue: '' },
  ];
  const combos = [
    { name: '森 → 海', firstMapId: 3, secondMapId: 5, iconType: 'photo', iconValue: 'b.JPG' },
  ];
  const { manifest, images, icons } = buildPackage(folder, maps, combos);

  assert.deepEqual(manifest.folder, { name: 'レース', icon: { type: 'emoji', emoji: '🏁' } });
  assert.deepEqual(manifest.maps[0].icon, { type: 'photo', image: 'icons/1.png' });
  // アイコンを決めていないものには、項目を足さない。
  assert.equal('icon' in manifest.maps[1], false);
  assert.deepEqual(manifest.combos[0].icon, { type: 'photo', image: 'icons/2.jpg' });
  assert.deepEqual(icons, [
    { entryName: 'icons/1.png', iconFile: '1700000000002-aaa111.png' },
    { entryName: 'icons/2.jpg', iconFile: 'b.JPG' },
  ]);
  // アイコンの写真は、地図の画像とは別に数える。
  assert.equal(images.length, 2);

  const parsed = parseManifest(JSON.stringify(manifest));
  assert.deepEqual(parsed.folderIcon, { type: 'emoji', emoji: '🏁' });
  assert.deepEqual(parsed.maps[0].icon, { type: 'photo', image: 'icons/1.png' });
  assert.equal(parsed.maps[1].icon, null);
  assert.deepEqual(parsed.combos[0].icon, { type: 'photo', image: 'icons/2.jpg' });
});

test('アイコン: 項目が無いファイル（古いアプリで作ったもの）は、アイコン無しで読み込める', () => {
  const { manifest } = buildPackage({ name: 'レース' }, sampleMaps);
  const parsed = parseManifest(JSON.stringify(manifest));
  assert.equal(parsed.folderIcon, null);
  assert.equal(parsed.maps[0].icon, null);
  assert.equal(parseManifest(JSON.stringify({ ...manifest, folder: null })).folderIcon, null);
});

test('アイコン: おかしな値はアイコン無しにして、マップは読み込む', () => {
  const { manifest } = buildPackage({ name: 'レース' }, sampleMaps);
  const badIcons = [
    'emoji',
    42,
    [],
    { type: 'emoji' },
    { type: 'emoji', emoji: '' },
    { type: 'emoji', emoji: 7 },
    { type: 'photo' },
    { type: 'photo', image: '../secret.png' },
    { type: 'photo', image: 'images/1.png' },
    { type: 'photo', image: 'icons/sub/1.png' },
    { type: 'photo', image: 'icons/1' },
    { type: 'photo', image: 'icons/1.toolongextension' },
    { type: 'video', image: 'icons/1.png' },
  ];
  for (const icon of badIcons) {
    const broken = { ...manifest, maps: [{ ...manifest.maps[0], icon }] };
    const parsed = parseManifest(JSON.stringify(broken));
    assert.equal(parsed.maps[0].icon, null, JSON.stringify(icon));
    assert.equal(parsed.maps[0].name, '森のコース');
  }
});

test('アイコン: 絵文字は最初の1文字だけにする', () => {
  const { manifest } = buildPackage({ name: 'レース' }, sampleMaps);
  const withIcon = {
    ...manifest,
    folder: { name: 'レース', icon: { type: 'emoji', emoji: '⭐🔥' } },
  };
  assert.deepEqual(parseManifest(JSON.stringify(withIcon)).folderIcon, {
    type: 'emoji',
    emoji: '⭐',
  });
});

// 二段目のフォルダ。親のフォルダ（id 1）の中に、「ソロ」（id 11）と「タイム」（id 12）。
const subfolders = [
  { id: 11, name: 'ソロ', iconType: 'emoji', iconValue: '🏁' },
  { id: 12, name: 'タイム', iconType: '', iconValue: '' },
];

test('大きさ: 絵文字と矢印の倍率を書き出して読み戻す。項目が無い・おかしな値は標準（1）にし、範囲に収める', () => {
  const { manifest } = buildPackage(null, sampleMaps);
  const map = {
    ...manifest.maps[0],
    markers: [
      { emoji: '🍄', x: 0.1, y: 0.1 },
      { emoji: '⭐', x: 0.2, y: 0.2, scale: 2 },
      { emoji: '🚩', x: 0.3, y: 0.3, scale: 'big' },
      { emoji: '🔥', x: 0.4, y: 0.4, scale: 100 },
    ],
    arrows: [
      { x1: 0, y1: 0, x2: 1, y2: 1, cx: 0.5, cy: 0.5, scale: 3 },
      { x1: 0, y1: 0, x2: 1, y2: 1, cx: 0.5, cy: 0.5 },
    ],
  };
  const parsed = parseManifest(JSON.stringify({ ...manifest, maps: [map] })).maps[0];
  assert.deepEqual(
    parsed.markers.map((marker) => marker.scale),
    [1, 2, 1, 4]
  );
  assert.deepEqual(
    parsed.arrows.map((arrow) => arrow.scale),
    [3, 1]
  );
});

test('二段目のフォルダ: フォルダの項目に入れて書き出し、マップと組み合わせは「何番目か」で指す。読み戻せる', () => {
  const maps = [
    { ...sampleMaps[0], folderId: 11 },
    { ...sampleMaps[1], folderId: 1 },
  ];
  const combos = [{ name: '森 → 海', firstMapId: 3, secondMapId: 5, folderId: 12 }];
  const { manifest } = buildPackage({ id: 1, name: 'レース' }, maps, combos, subfolders);

  assert.deepEqual(manifest.folder.subfolders, [
    { name: 'ソロ', icon: { type: 'emoji', emoji: '🏁' } },
    { name: 'タイム' },
  ]);
  assert.equal(manifest.maps[0].subfolder, 0);
  // 親のフォルダの直下のマップには、項目を足さない。
  assert.equal('subfolder' in manifest.maps[1], false);
  assert.equal(manifest.combos[0].subfolder, 1);

  const parsed = parseManifest(JSON.stringify(manifest));
  assert.deepEqual(
    parsed.subfolders,
    [
      { name: 'ソロ', icon: { type: 'emoji', emoji: '🏁' } },
      { name: 'タイム', icon: null },
    ]
  );
  assert.equal(parsed.maps[0].subfolder, 0);
  assert.equal(parsed.maps[1].subfolder, null);
  assert.equal(parsed.combos[0].subfolder, 1);
});

test('二段目のフォルダ: 項目が無いファイル（古いアプリで作ったもの）は、二段目のフォルダ無しで読み込める', () => {
  const { manifest } = buildPackage({ id: 1, name: 'レース' }, sampleMaps);
  assert.equal('subfolders' in manifest.folder, false);
  const parsed = parseManifest(JSON.stringify(manifest));
  assert.deepEqual(parsed.subfolders, []);
  assert.equal(parsed.maps[0].subfolder, null);
});

test('二段目のフォルダ: フォルダ無しの共有では、二段目のフォルダを書き出さない', () => {
  const { manifest } = buildPackage(null, [{ ...sampleMaps[0], folderId: 11 }], [], subfolders);
  assert.equal(manifest.folder, null);
  assert.equal('subfolder' in manifest.maps[0], false);
  assert.deepEqual(parseManifest(JSON.stringify(manifest)).subfolders, []);
});

test('二段目のフォルダ: 番号がおかしいときは、親のフォルダの直下に入れる。壊れた要素も番号を詰めない', () => {
  const { manifest } = buildPackage({ id: 1, name: 'レース' }, sampleMaps, [], subfolders);
  const broken = {
    ...manifest,
    folder: { name: 'レース', subfolders: ['x', { name: '  ' }, { name: 'ソロ' }] },
    maps: [
      { ...manifest.maps[0], subfolder: 2 },
      { ...manifest.maps[1], subfolder: 3 },
    ],
  };
  const parsed = parseManifest(JSON.stringify(broken));
  // 壊れた要素は、名前を補って残す。そうしないと、後ろの番号がずれる。
  assert.deepEqual(
    parsed.subfolders.map((subfolder) => subfolder.name),
    ['フォルダ 1', 'フォルダ 2', 'ソロ']
  );
  assert.equal(parsed.maps[0].subfolder, 2);
  assert.equal(parsed.maps[1].subfolder, null);
});

test('parseManifest: markers や arrows が無くても読み込める', () => {
  const { manifest } = buildPackage(null, sampleMaps);
  const map = { ...manifest.maps[0] };
  delete map.markers;
  delete map.arrows;
  const parsed = parseManifest(JSON.stringify({ ...manifest, maps: [map] }));
  assert.equal(parsed.folderName, null);
  assert.deepEqual(parsed.maps[0].markers, []);
  assert.deepEqual(parsed.maps[0].arrows, []);
});
