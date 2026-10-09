import { firstGrapheme } from './emoji.js';

// 一覧に並ぶマップ・フォルダ・組み合わせのアイコン。種類（iconType）と値（iconValue）の組で持つ。
//   ''      … 決めていない。元の見た目（マップは地図の画像、フォルダは 📁、組み合わせは2枚の画像）で出す
//   'emoji' … 絵文字。iconValue はその絵文字
//   'photo' … 写真。iconValue はアプリ内に保存した画像のファイル名
export const ICON_NONE = '';
export const ICON_EMOJI = 'emoji';
export const ICON_PHOTO = 'photo';

export const NO_ICON = { iconType: ICON_NONE, iconValue: '' };

const MAX_ICON_EMOJI_LENGTH = 32;

// 入力された文字列から、アイコンにする絵文字を1つ取り出す。使えないときは空文字。
export function iconEmojiFrom(text) {
  if (typeof text !== 'string') return '';
  const emoji = firstGrapheme(text);
  return emoji.length > MAX_ICON_EMOJI_LENGTH ? '' : emoji;
}

// アイコンに使っている写真のファイル名。写真のアイコンでなければ null。
export function iconPhotoFile(item) {
  return item.iconType === ICON_PHOTO && typeof item.iconValue === 'string' && item.iconValue !== ''
    ? item.iconValue
    : null;
}

// 画像の中央から、できるだけ大きな正方形を切り出すときの範囲（px）。
export function centerSquare(width, height) {
  const side = Math.min(width, height);
  return {
    originX: Math.floor((width - side) / 2),
    originY: Math.floor((height - side) / 2),
    width: side,
    height: side,
  };
}
