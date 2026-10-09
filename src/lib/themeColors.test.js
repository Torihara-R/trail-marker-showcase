import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  ACCENT_PRESETS,
  BACKGROUND_PRESETS,
  DEFAULT_THEME,
  buildColors,
  cleanTheme,
  contrastRatio,
  normalizeHex,
  stepOpacity,
} from './themeColors.js';

test('normalizeHex: #RRGGBB に直す。# なし・3桁・小文字も受け付ける', () => {
  assert.equal(normalizeHex('#2f6fed'), '#2F6FED');
  assert.equal(normalizeHex('2f6fed'), '#2F6FED');
  assert.equal(normalizeHex('#fc0'), '#FFCC00');
  assert.equal(normalizeHex('  #FFFFFF  '), '#FFFFFF');
});

test('normalizeHex: 色として読めないものは null', () => {
  for (const text of ['', '#12', '#12345', '#1234567', 'red', '#GGGGGG', '#12 456', null, undefined, 42]) {
    assert.equal(normalizeHex(text), null, String(text));
  }
});

test('contrastRatio: 黒と白は 21、同じ色は 1', () => {
  assert.equal(Math.round(contrastRatio('#000000', '#FFFFFF')), 21);
  assert.equal(contrastRatio('#336699', '#336699'), 1);
});

test('buildColors: 標準の設定では、今までの見た目（明るい画面、青いボタン）のまま', () => {
  const colors = buildColors(DEFAULT_THEME);
  assert.equal(colors.dark, false);
  assert.equal(colors.background, '#F6F7F9');
  assert.equal(colors.surface, '#FFFFFF');
  assert.equal(colors.text, '#1B1F24');
  assert.equal(colors.primary, '#2F6FED');
  assert.equal(colors.onPrimary, '#FFFFFF');
  assert.equal(colors.danger, '#D93A3A');
});

test('buildColors: 暗い背景では、カードは背景より少し明るく、文字は明るい色になる', () => {
  const colors = buildColors({ backgroundColor: '#0F1115', accentColor: '#2F6FED' });
  assert.equal(colors.dark, true);
  assert.notEqual(colors.surface, '#FFFFFF');
  assert.ok(contrastRatio(colors.text, colors.surface) >= 7);
  assert.ok(contrastRatio(colors.text, colors.background) >= 7);
});

test('buildColors: どの組み合わせでも、文字・ボタンが背景とカードの上で読める', () => {
  for (const background of BACKGROUND_PRESETS) {
    for (const accent of ACCENT_PRESETS) {
      const colors = buildColors({ backgroundColor: background.color, accentColor: accent.color });
      const label = `${background.name} × ${accent.name}`;
      for (const base of [colors.background, colors.surface]) {
        assert.ok(contrastRatio(colors.text, base) >= 4.5, `${label}: 文字`);
        assert.ok(contrastRatio(colors.primary, base) >= 3, `${label}: ボタンの色`);
        assert.ok(contrastRatio(colors.danger, base) >= 3, `${label}: 削除の色`);
      }
      assert.ok(contrastRatio(colors.onPrimary, colors.primary) >= 4.5, `${label}: ボタンの文字`);
    }
  }
});

test('buildColors: 明るい背景の黄色は、読めるよう濃く調整する。暗い背景ではそのまま', () => {
  const onLight = buildColors({ backgroundColor: '#FFFFFF', accentColor: '#FFC21A' });
  assert.notEqual(onLight.primary, '#FFC21A');
  const onDark = buildColors({ backgroundColor: '#0F1115', accentColor: '#FFC21A' });
  assert.equal(onDark.primary, '#FFC21A');
  // 黄色のボタンの上の文字は、白ではなく暗い色にする。
  assert.equal(onDark.onPrimary, '#1B1F24');
});

test('buildColors: おかしな色が入っていたら、標準の色にする', () => {
  const colors = buildColors({ backgroundColor: 'まっくろ', accentColor: undefined });
  assert.equal(colors.background, '#F6F7F9');
  assert.equal(colors.primary, '#2F6FED');
});

test('stepOpacity: 10% ずつ動かし、10%〜100% の外には出ない', () => {
  assert.equal(stepOpacity(0.6, 1), 0.7);
  assert.equal(stepOpacity(0.6, -1), 0.5);
  assert.equal(stepOpacity(1, 1), 1);
  assert.equal(stepOpacity(0.1, -1), 0.1);
  // 浮動小数点の誤差がたまらない。
  let value = 0.1;
  for (let count = 0; count < 9; count += 1) value = stepOpacity(value, 1);
  assert.equal(value, 1);
});

test('cleanTheme: 項目が無い・壊れているときは標準の値にし、使える値は残す', () => {
  assert.deepEqual(cleanTheme(undefined), DEFAULT_THEME);
  assert.deepEqual(cleanTheme('x'), DEFAULT_THEME);
  assert.deepEqual(cleanTheme([]), DEFAULT_THEME);
  assert.deepEqual(
    cleanTheme({ backgroundColor: '#101A2E', accentColor: 'ffc21a', backgroundImage: 'bg-1.jpg', imageOpacity: 0.34 }),
    { backgroundColor: '#101A2E', accentColor: '#FFC21A', backgroundImage: 'bg-1.jpg', imageOpacity: 0.3 }
  );
});

test('cleanTheme: 画像の名前に、場所を指す文字（../ など）は受け付けない。濃さは範囲に収める', () => {
  for (const backgroundImage of ['../secret.jpg', 'a/b.jpg', '', 42, null]) {
    assert.equal(cleanTheme({ backgroundImage }).backgroundImage, '', String(backgroundImage));
  }
  assert.equal(cleanTheme({ imageOpacity: 5 }).imageOpacity, 1);
  assert.equal(cleanTheme({ imageOpacity: -1 }).imageOpacity, 0.1);
  assert.equal(cleanTheme({ imageOpacity: 'x' }).imageOpacity, 0.6);
});
