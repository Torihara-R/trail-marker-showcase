// 地図の上に置く絵文字と矢印の、大きさ（倍率）の規則。端末の機能を使わない部分だけを置く。
// 倍率は、標準の大きさを 1 としたときの比。絵文字は大きさ、矢印は太さ（矢じりの大きさも一緒に）が倍率で変わる。

export const DEFAULT_SIZE = 1;
// 「−」「＋」で動かせる段階。標準（1）を真ん中の近くに置いている。
export const SIZE_STEPS = [0.5, 0.75, 1, 1.5, 2, 3];
// 共有ファイルなどから読み込むときに受け付ける範囲。
const MIN_SIZE = 0.25;
const MAX_SIZE = 4;

// 標準の大きさの絵文字の、文字の大きさと、指で触れる範囲（どちらも px）。
const BASE_EMOJI_FONT = 26;
const BASE_TOUCH_BOX = 44;

// 保存されていた・読み込んだ倍率を、使える値に整える。数でなければ標準（1）にする。
export function cleanSize(value) {
  if (!Number.isFinite(value)) return DEFAULT_SIZE;
  return Math.round(Math.min(MAX_SIZE, Math.max(MIN_SIZE, value)) * 100) / 100;
}

// 倍率を1段階、大きく（direction が 1）・小さく（-1）する。段階の間の値（読み込んだものなど）からも、次の段階へ動く。
// 端まで来たら、そこで止まる。
export function stepSize(current, direction) {
  const size = cleanSize(current);
  if (direction > 0) {
    return SIZE_STEPS.find((step) => step > size + 0.001) ?? SIZE_STEPS[SIZE_STEPS.length - 1];
  }
  return [...SIZE_STEPS].reverse().find((step) => step < size - 0.001) ?? SIZE_STEPS[0];
}

export function canStepSize(current, direction) {
  const size = cleanSize(current);
  return direction > 0
    ? size < SIZE_STEPS[SIZE_STEPS.length - 1] - 0.001
    : size > SIZE_STEPS[0] + 0.001;
}

export function sizeLabel(size) {
  return `${Math.round(cleanSize(size) * 100)}%`;
}

// 絵文字の文字の大きさ（px）。
export function emojiFontSize(scale) {
  return Math.round(BASE_EMOJI_FONT * cleanSize(scale));
}

// 絵文字の、指で触れる範囲の一辺（px）。小さくしても、指で触れやすい大きさを下回らない。
export function emojiTouchSize(scale) {
  return Math.max(BASE_TOUCH_BOX, Math.round(BASE_TOUCH_BOX * cleanSize(scale)));
}
