const KATAKANA = /[ァ-ヶ]/g;
const KATAKANA_TO_HIRAGANA_OFFSET = 0x60;

// 検索用に表記をそろえる。全角と半角、大文字と小文字、ひらがなとカタカナを区別しない。
export function normalizeForSearch(text) {
  return text
    .normalize('NFKC')
    .toLowerCase()
    .replace(KATAKANA, (char) =>
      String.fromCharCode(char.charCodeAt(0) - KATAKANA_TO_HIRAGANA_OFFSET)
    )
    .trim();
}

// 空白で区切った語をすべて名前に含むマップだけを返す。検索語が空なら全件を返す。
export function filterMapsByName(maps, query) {
  const words = normalizeForSearch(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return maps;

  return maps.filter((map) => {
    const name = normalizeForSearch(map.name);
    return words.every((word) => name.includes(word));
  });
}
