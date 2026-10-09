// フォルダの入れ子（二段まで）の規則と、並べ方の計算。端末の機能を使わない部分だけを置く。
//
// フォルダは、最初の画面に並ぶ「一段目」と、その中に作る「二段目」の二段まで。
// 二段目のフォルダの中には、フォルダを作れない。二段までなので、フォルダがぐるぐる回る構造にはならない。
// フォルダは parentId で親を指す。一段目は null。

export const PATH_SEPARATOR = ' ＞ ';

// この文を、画面に出す。
export const NEST_LIMIT_MESSAGE = 'フォルダは二段までです。この中には、フォルダを作れません。';

// フォルダを、一段目 → その中の二段目の順に並べ直す。それぞれの中の並びは、渡された順のまま。
// 各フォルダに depth（0 が一段目、1 が二段目）と path（「親 ＞ 子」の形の名前）を足す。
// 親が見つからない・親が二段目、といった壊れたデータは、一段目として扱う。
export function arrangeFolders(folders) {
  const byId = new Map(folders.map((folder) => [folder.id, folder]));
  const parentOf = (folder) => {
    const parent = folder.parentId == null ? null : byId.get(folder.parentId);
    return parent && parent.parentId == null && parent.id !== folder.id ? parent : null;
  };

  const topLevel = folders.filter((folder) => parentOf(folder) === null);
  const arranged = [];
  for (const folder of topLevel) {
    arranged.push({ ...folder, parentId: null, depth: 0, path: folder.name });
    for (const child of folders) {
      if (parentOf(child) === folder) {
        arranged.push({
          ...child,
          depth: 1,
          path: `${folder.name}${PATH_SEPARATOR}${child.name}`,
        });
      }
    }
  }
  return arranged;
}

// parentId のフォルダの中に、新しくフォルダを作れるか。null（一段目に作る）はいつでも作れる。
export function canCreateFolderIn(folders, parentId) {
  if (parentId == null) return { ok: true };
  const parent = folders.find((folder) => folder.id === parentId);
  if (!parent) return { ok: false, reason: '入れるフォルダが見つかりません。' };
  if (parent.parentId != null) return { ok: false, reason: NEST_LIMIT_MESSAGE };
  return { ok: true };
}

// folderId のフォルダを、parentId のフォルダの中へ移せるか。parentId が null なら、一段目へ出す。
// 中にフォルダを持つフォルダは、別のフォルダの中には入れられない（三段になるため）。
export function canMoveFolder(folders, folderId, parentId) {
  const folder = folders.find((candidate) => candidate.id === folderId);
  if (!folder) return { ok: false, reason: 'フォルダが見つかりません。' };
  if (parentId == null) return { ok: true };
  if (parentId === folderId) return { ok: false, reason: '自分自身の中には入れられません。' };
  const hasSubfolders = folders.some((candidate) => candidate.parentId === folderId);
  if (hasSubfolders) {
    return {
      ok: false,
      reason: 'このフォルダの中にフォルダがあるので、別のフォルダの中には入れられません（フォルダは二段までです）。',
    };
  }
  return canCreateFolderIn(folders, parentId);
}

// 別のフォルダの中へ移せる、移し先の候補（一段目のフォルダのうち、自分自身以外）。
export function moveTargets(folders, folderId) {
  return arrangeFolders(folders).filter(
    (candidate) => candidate.depth === 0 && candidate.id !== folderId
  );
}

// マップや組み合わせ（folderId を持つもの）に、フォルダの名前を「親 ＞ 子」の形で入れる。
// 一覧の検索結果に、どのフォルダのものかを出すために使う。フォルダに入っていないものは、folderName が null のまま。
export function withFolderPaths(items, folders) {
  const pathById = new Map(arrangeFolders(folders).map((folder) => [folder.id, folder.path]));
  return items.map((item) =>
    item.folderId == null ? item : { ...item, folderName: pathById.get(item.folderId) ?? item.folderName }
  );
}
