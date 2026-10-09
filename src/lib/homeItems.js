import { filterMapsByName, normalizeForSearch } from './searchText.js';

// 最初の画面の一覧に並べる行を作る。
// 検索していないとき: フォルダに入れていない組み合わせ、フォルダ、フォルダに入れていないマップの順。
// 検索しているとき: フォルダの中も含めた、名前が一致する組み合わせとマップ。どのフォルダのものか分かるようにする。
export function buildHomeItems({ maps, folders, combos, query }) {
  if (isSearching(query)) {
    return searchResults(maps, combos, query);
  }

  const looseCombos = combos.filter((combo) => combo.folderId === null);
  const looseMaps = maps.filter((map) => map.folderId === null);
  // 最初の画面には、一段目のフォルダだけを並べる。二段目のフォルダは、親のフォルダを開いて見る。
  const topFolders = folders.filter((folder) => folder.parentId == null);
  const items = [];

  if (looseCombos.length > 0) {
    items.push({ type: 'header', key: 'header-combos', title: '組み合わせ' });
    items.push(...looseCombos.map((combo) => comboItem(combo, false)));
  }
  if (topFolders.length > 0) {
    items.push({ type: 'header', key: 'header-folders', title: 'フォルダ' });
    items.push(...topFolders.map(folderItem));
  }
  // 上に組み合わせやフォルダがあるときだけ、マップにも見出しを付ける。
  if (items.length > 0 && looseMaps.length > 0) {
    items.push({ type: 'header', key: 'header-maps', title: 'フォルダに入れていないマップ' });
  }
  items.push(...looseMaps.map((map) => mapItem(map, false)));
  return items;
}

// フォルダの画面の一覧に並べる行を作る。maps と combos には、そのフォルダに入っているものだけを渡す。
// folders には、そのフォルダの中のフォルダ（二段目）を渡す。
// フォルダ、組み合わせ、マップの順。上に何かあるときだけ、見出しで分ける。
// 検索しているときは、そのフォルダの直下の組み合わせとマップだけを探す（中のフォルダは出さない）。
export function buildFolderItems({ maps, combos, folders = [], query }) {
  if (isSearching(query)) {
    return searchResults(maps, combos, query).map((item) => ({ ...item, showFolder: false }));
  }

  const items = [];
  if (folders.length > 0) {
    items.push({ type: 'header', key: 'header-folders', title: 'フォルダ' });
    items.push(...folders.map(folderItem));
  }
  if (combos.length > 0) {
    items.push({ type: 'header', key: 'header-combos', title: '組み合わせ' });
    items.push(...combos.map((combo) => comboItem(combo, false)));
  }
  if (items.length > 0 && maps.length > 0) {
    items.push({ type: 'header', key: 'header-maps', title: 'マップ' });
  }
  items.push(...maps.map((map) => mapItem(map, false)));
  return items;
}

function folderItem(folder) {
  return { type: 'folder', key: `folder-${folder.id}`, folder };
}

function isSearching(query) {
  return normalizeForSearch(query) !== '';
}

function searchResults(maps, combos, query) {
  // filterMapsByName は name を見るだけなので、組み合わせにもそのまま使える。
  return [
    ...filterMapsByName(combos, query).map((combo) => comboItem(combo, true)),
    ...filterMapsByName(maps, query).map((map) => mapItem(map, true)),
  ];
}

function comboItem(combo, showFolder) {
  return { type: 'combo', key: `combo-${combo.id}`, combo, showFolder };
}

function mapItem(map, showFolder) {
  return { type: 'map', key: `map-${map.id}`, map, showFolder };
}
