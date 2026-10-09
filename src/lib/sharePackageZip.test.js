import assert from 'node:assert/strict';
import { test } from 'node:test';

import JSZip from 'jszip';

import { MANIFEST_NAME, buildPackage, parseManifest } from './sharePackage.js';

// src/lib/shareFiles.js と同じ手順で zip を作り、読み戻す。
// 端末のファイル操作は使わず、画像の代わりに適当なバイト列を入れる。

const maps = [
  {
    name: '森のコース',
    imageFile: 'a.png',
    width: 1200,
    height: 800,
    iconType: 'photo',
    iconValue: 'icon-a.png',
    markers: [{ emoji: '🍄', x: 0.25, y: 0.5, note: 'ここでキノコ', noteSize: 2, scale: 1.5 }],
    arrows: [
      { x1: 0.1, y1: 0.2, x2: 0.8, y2: 0.9, cx: 0.45, cy: 0.55, color: '#1E88E5', scale: 0.5 },
    ],
  },
  {
    name: '海のコース',
    imageFile: 'b.jpg',
    width: 640,
    height: 480,
    iconType: 'emoji',
    iconValue: '🌊',
    markers: [],
    arrows: [],
  },
];

const imageBytes = {
  'a.png': Uint8Array.from([137, 80, 78, 71, 0, 255, 1, 2, 3]),
  'b.jpg': Uint8Array.from([255, 216, 255, 224, 9, 8, 7]),
};

const iconBytes = {
  'icon-a.png': Uint8Array.from([137, 80, 78, 71, 4, 5, 6]),
  'icon-folder.png': Uint8Array.from([137, 80, 78, 71, 7, 8, 9, 10]),
};

test('zip にまとめたものを読み戻すと、名前・絵文字・矢印・画像・アイコンが元のまま出てくる', async () => {
  const folder = { name: 'レース', iconType: 'photo', iconValue: 'icon-folder.png' };
  const { manifest, images, icons } = buildPackage(folder, maps);
  const zip = new JSZip();
  zip.file(MANIFEST_NAME, JSON.stringify(manifest));
  for (const image of images) {
    zip.file(image.entryName, imageBytes[image.imageFile]);
  }
  for (const icon of icons) {
    zip.file(icon.entryName, iconBytes[icon.iconFile]);
  }
  const packed = await zip.generateAsync({ type: 'uint8array', compression: 'STORE' });

  const opened = await JSZip.loadAsync(packed);
  const parsed = parseManifest(await opened.file(MANIFEST_NAME).async('string'));

  assert.equal(parsed.folderName, 'レース');
  assert.deepEqual(
    parsed.maps.map((map) => map.name),
    ['森のコース', '海のコース']
  );
  assert.deepEqual(parsed.maps[0].markers, maps[0].markers);
  assert.deepEqual(parsed.maps[0].arrows, maps[0].arrows);

  for (const [index, map] of parsed.maps.entries()) {
    const restored = await opened.file(map.image).async('uint8array');
    assert.deepEqual(Array.from(restored), Array.from(imageBytes[maps[index].imageFile]));
  }

  assert.deepEqual(parsed.maps[1].icon, { type: 'emoji', emoji: '🌊' });
  const folderIcon = await opened.file(parsed.folderIcon.image).async('uint8array');
  assert.deepEqual(Array.from(folderIcon), Array.from(iconBytes['icon-folder.png']));
  const mapIcon = await opened.file(parsed.maps[0].icon.image).async('uint8array');
  assert.deepEqual(Array.from(mapIcon), Array.from(iconBytes['icon-a.png']));
});

test('zip ではないデータは開けない', async () => {
  await assert.rejects(JSZip.loadAsync(Uint8Array.from([1, 2, 3, 4, 5])));
});
