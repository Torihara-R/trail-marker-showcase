// 絵文字に付けるメモ。普段は隠しておき、絵文字をタップしたときだけ吹き出しで見せる。

export const MAX_NOTE_LENGTH = 200;

// 吹き出しの大きさ。保存するのは番号（0 が小、1 が中、2 が大）。
export const NOTE_SIZE_LABELS = ['小', '中', '大'];
export const DEFAULT_NOTE_SIZE = 1;

// 前後の空白を取り、長すぎる分を切る。文字列でなければ空のメモにする。
export function cleanNote(value) {
  if (typeof value !== 'string') return '';
  return Array.from(value.trim()).slice(0, MAX_NOTE_LENGTH).join('');
}

export function cleanNoteSize(value) {
  const isValid = Number.isInteger(value) && value >= 0 && value < NOTE_SIZE_LABELS.length;
  return isValid ? value : DEFAULT_NOTE_SIZE;
}
