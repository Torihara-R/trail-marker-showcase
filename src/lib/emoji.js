// 最初から並べておく絵文字。特定のゲームに寄らない、目印として使いやすいものを選んでいる。
export const DEFAULT_EMOJI = [
  '⭐',
  '🍄',
  '🚩',
  '🏁',
  '⚠️',
  '❗',
  '❓',
  '✅',
  '❌',
  '➡️',
  '⬅️',
  '⬆️',
  '⬇️',
  '↩️',
  '💨',
  '🔥',
  '💧',
  '❄️',
  '💣',
  '💰',
  '🎁',
  '🔑',
  '🚧',
  '👀',
];

const ZERO_WIDTH_JOINER = 0x200d;

function isRegionalIndicator(codePoint) {
  return codePoint >= 0x1f1e6 && codePoint <= 0x1f1ff;
}

// 直前の文字にくっついて、合わせて1文字として表示される符号。
function isExtender(codePoint) {
  return (
    codePoint === 0xfe0e || // 異体字セレクタ（文字表示）
    codePoint === 0xfe0f || // 異体字セレクタ（絵文字表示）
    codePoint === 0x20e3 || // 囲み（1️⃣ など）
    (codePoint >= 0x1f3fb && codePoint <= 0x1f3ff) || // 肌の色
    (codePoint >= 0xe0020 && codePoint <= 0xe007f) || // タグ（一部の旗）
    (codePoint >= 0x0300 && codePoint <= 0x036f) || // 結合記号
    codePoint === 0x3099 || // 濁点
    codePoint === 0x309a // 半濁点
  );
}

// 入力された文字列から、画面上で「最初の1文字」に見える部分を取り出す。
// 絵文字は内部では複数の符号でできていることがある（国旗、家族、肌の色つきなど）。
// 符号を1つだけ切り出すと壊れるので、ひとまとまりで取り出す。
export function firstGrapheme(text) {
  const codePoints = Array.from(text.trim(), (char) => char.codePointAt(0));
  if (codePoints.length === 0) return '';

  // 国旗は地域指示符号2つで1文字になる。
  let end = isRegionalIndicator(codePoints[0]) && isRegionalIndicator(codePoints[1]) ? 2 : 1;

  while (end < codePoints.length) {
    if (isExtender(codePoints[end])) {
      end += 1;
    } else if (codePoints[end] === ZERO_WIDTH_JOINER && end + 1 < codePoints.length) {
      // ゼロ幅接合子は、次の絵文字とつないで1文字にする（👨‍👩‍👧 など）。
      end += 2;
    } else {
      break;
    }
  }

  return String.fromCodePoint(...codePoints.slice(0, end));
}

// 複数の絵文字リストを、重複を除いて1つにまとめる。先に渡したリストほど前に並ぶ。
export function buildPalette(...lists) {
  return [...new Set(lists.flat())];
}
