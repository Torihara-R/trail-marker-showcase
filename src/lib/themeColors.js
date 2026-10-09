// アプリのデザイン（背景の色・背景の画像・ボタンの色）の設定と、そこから画面で使う色を作る計算。
// 端末の機能を使わない部分だけを置く。保存と画面への反映は src/components/ThemeProvider.js が行う。

export const DEFAULT_BACKGROUND_COLOR = '#F6F7F9';
export const DEFAULT_ACCENT_COLOR = '#2F6FED';
// 背景の画像を選んだときの、最初の濃さ。
export const DEFAULT_IMAGE_OPACITY = 0.6;
export const MIN_IMAGE_OPACITY = 0.1;
const OPACITY_STEP = 0.1;

export const DEFAULT_THEME = {
  backgroundColor: DEFAULT_BACKGROUND_COLOR,
  accentColor: DEFAULT_ACCENT_COLOR,
  // 背景の画像のファイル名。使っていなければ空文字。
  backgroundImage: '',
  imageOpacity: DEFAULT_IMAGE_OPACITY,
};

// 選ぶだけで使える色。好きな色は、色の入力欄に #RRGGBB で入れる。
export const BACKGROUND_PRESETS = [
  { name: '標準', color: '#F6F7F9' },
  { name: '白', color: '#FFFFFF' },
  { name: 'クリーム', color: '#FFF4DD' },
  { name: 'ミント', color: '#E6F4EA' },
  { name: 'そら', color: '#E4F0FB' },
  { name: 'ラベンダー', color: '#EEE9FB' },
  { name: '黒', color: '#0F1115' },
  { name: '紺', color: '#101A2E' },
];

export const ACCENT_PRESETS = [
  { name: '青', color: '#2F6FED' },
  { name: '黄', color: '#FFC21A' },
  { name: '赤', color: '#E5484D' },
  { name: 'オレンジ', color: '#F76808' },
  { name: '緑', color: '#2EA043' },
  { name: '紫', color: '#7C5CFA' },
  { name: 'ピンク', color: '#E64980' },
];

const LIGHT_TEXT = '#1B1F24';
const WHITE = '#FFFFFF';
const BLACK = '#000000';
// 色どうしの読みやすさ（コントラスト比）の下限。WCAG が文字以外の部品に求める 3:1 に合わせる。
const MIN_CONTRAST = 3;
// ボタンの中の文字の下限。文字は小さいので、WCAG の通常の文字の基準 4.5:1 に合わせる。
const MIN_LABEL_CONTRAST = 4.5;

// 入力された色を、#RRGGBB（英大文字）にそろえる。#RGB や、# を付けない入力も受け付ける。色として読めなければ null。
export function normalizeHex(text) {
  if (typeof text !== 'string') return null;
  const match = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(text.trim());
  if (!match) return null;
  const digits = match[1].length === 3 ? [...match[1]].map((digit) => digit + digit).join('') : match[1];
  return `#${digits.toUpperCase()}`;
}

function toRgb(hex) {
  return [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16));
}

function toHex(rgb) {
  return `#${rgb
    .map((value) => Math.round(Math.min(255, Math.max(0, value))).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()}`;
}

// 相対輝度（WCAG の定義）。0 が黒、1 が白。
function luminance(hex) {
  const [r, g, b] = toRgb(hex).map((value) => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// 2色の読みやすさ。1（同じ色）から 21（黒と白）。
export function contrastRatio(first, second) {
  const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

// from から to へ、amount（0〜1）だけ近づけた色。
function mix(from, to, amount) {
  const [a, b] = [toRgb(from), toRgb(to)];
  return toHex(a.map((value, index) => value + (b[index] - value) * amount));
}

// color が、どの背景の上でも読めるよう、足りなければ背景と逆の側（明るい背景なら黒、暗い背景なら白）へ少しずつ寄せる。
function ensureContrast(color, backgrounds, minimum = MIN_CONTRAST) {
  const worst = (candidate) => Math.min(...backgrounds.map((bg) => contrastRatio(candidate, bg)));
  if (worst(color) >= minimum) return color;
  const target = luminance(backgrounds[0]) > 0.4 ? BLACK : WHITE;
  for (let amount = 0.05; amount <= 1; amount += 0.05) {
    const candidate = mix(color, target, amount);
    if (worst(candidate) >= minimum) return candidate;
  }
  return target;
}

// ボタンの文字（白か暗い色）の色。ボタンの色の上で、読みやすいほうを選ぶ。
function labelColorOn(fill) {
  return contrastRatio(fill, WHITE) >= contrastRatio(fill, LIGHT_TEXT) ? WHITE : LIGHT_TEXT;
}

// ボタンの色を、次の2つを両方満たす色に調整する。選ばれた色がすでに満たしていれば、そのまま使う。
//  1. 背景やカードの上で見分けがつく（MIN_CONTRAST 以上）。文字や枠線にも使うため。
//  2. ボタンの中の文字が読める（MIN_LABEL_CONTRAST 以上）。赤やピンクは、白でも暗い色でも読みにくいことがある。
// 満たさないときは、黒か白へ少しずつ近づけ、いちばん元の色に近いものを選ぶ。
function fitPrimary(accent, backgrounds) {
  const margin = (color) =>
    Math.min(
      ...backgrounds.map((bg) => contrastRatio(color, bg) / MIN_CONTRAST),
      contrastRatio(color, labelColorOn(color)) / MIN_LABEL_CONTRAST
    );
  if (margin(accent) >= 1) return accent;
  for (let amount = 0.03; amount <= 1; amount += 0.03) {
    const candidates = [mix(accent, BLACK, amount), mix(accent, WHITE, amount)]
      .filter((color) => margin(color) >= 1)
      .sort((first, second) => margin(second) - margin(first));
    if (candidates.length > 0) return candidates[0];
  }
  return accent;
}

function withAlpha(hex, alpha) {
  const [r, g, b] = toRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// 背景の色とボタンの色から、画面で使う色の一式を作る。
// 背景が暗いときは、カード・文字・枠線も暗い画面向けにする。ボタンの色は、背景やカードの上で読めるよう、必要なら少しだけ調整する。
export function buildColors({ backgroundColor, accentColor }) {
  const background = normalizeHex(backgroundColor) ?? DEFAULT_BACKGROUND_COLOR;
  const accent = normalizeHex(accentColor) ?? DEFAULT_ACCENT_COLOR;
  const dark = contrastRatio(background, WHITE) > contrastRatio(background, LIGHT_TEXT);

  const surface = dark ? mix(background, WHITE, 0.08) : WHITE;
  const primary = fitPrimary(accent, [background, surface]);

  return {
    dark,
    background,
    surface,
    text: dark ? '#F3F4F6' : LIGHT_TEXT,
    textMuted: dark ? '#A1A7B3' : '#6B7280',
    border: dark ? mix(background, WHITE, 0.18) : '#E3E6EA',
    primary,
    // 選択中の絵文字の背景。地図が透けて見える半透明にしている。
    selection: withAlpha(primary, dark ? 0.28 : 0.18),
    onPrimary: labelColorOn(primary),
    danger: ensureContrast(dark ? '#FF6B6B' : '#D93A3A', [background, surface]),
  };
}

// 背景の画像の濃さを、1段階（10%）上げる（direction が 1）・下げる（-1）。範囲は 10%〜100%。
export function stepOpacity(opacity, direction) {
  const next = Math.round((opacity + direction * OPACITY_STEP) * 10) / 10;
  return Math.min(1, Math.max(MIN_IMAGE_OPACITY, next));
}

// 保存されていた設定を、使える形に整える。項目が無い・壊れているときは、標準の値にする。
export function cleanTheme(raw) {
  const source = typeof raw === 'object' && raw !== null && !Array.isArray(raw) ? raw : {};
  const opacity = Number.isFinite(source.imageOpacity) ? source.imageOpacity : DEFAULT_IMAGE_OPACITY;
  return {
    backgroundColor: normalizeHex(source.backgroundColor) ?? DEFAULT_BACKGROUND_COLOR,
    accentColor: normalizeHex(source.accentColor) ?? DEFAULT_ACCENT_COLOR,
    // 画像のファイル名は、アプリが付けた名前（英数字と . _ -）だけを受け付ける。
    backgroundImage:
      typeof source.backgroundImage === 'string' && /^[A-Za-z0-9._-]{1,100}$/.test(source.backgroundImage)
        ? source.backgroundImage
        : '',
    imageOpacity: Math.min(1, Math.max(MIN_IMAGE_OPACITY, Math.round(opacity * 10) / 10)),
  };
}
