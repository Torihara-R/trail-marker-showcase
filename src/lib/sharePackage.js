import { firstGrapheme } from './emoji.js';
import { ICON_EMOJI, ICON_PHOTO, iconEmojiFrom, iconPhotoFile } from './icons.js';
import { MAX_NAME_LENGTH } from './names.js';
import { cleanNote, cleanNoteSize } from './notes.js';
import { cleanSize } from './sizes.js';

// 共有ファイルの形式。
// 中身は zip で、manifest.json（マップの名前、絵文字、矢印、フォルダの中のフォルダ）と images/ の画像、icons/ のアイコンの写真が入っている。
// 形式を変えるときは PACKAGE_VERSION を上げる。古いアプリは、新しいバージョンのファイルを読み込まない。
export const PACKAGE_FORMAT = 'trailmarker';
export const PACKAGE_VERSION = 1;
export const PACKAGE_EXTENSION = '.trailmarker';
export const MANIFEST_NAME = 'manifest.json';

const MAX_MAPS = 200;
const MAX_COMBOS = 500;
const MAX_SUBFOLDERS = 100;
const MAX_ITEMS_PER_MAP = 2000;
const MAX_IMAGE_SIDE = 100000;
const MAX_EMOJI_LENGTH = 32;
const IMAGE_ENTRY_PATTERN = /^images\/[A-Za-z0-9_-]+\.[A-Za-z0-9]+$/;
const ICON_ENTRY_PATTERN = /^icons\/[A-Za-z0-9_-]+\.[A-Za-z0-9]+$/;
// 画像の拡張子として受け付ける形。英小文字と数字だけで、8文字まで。
// 画像の種類（png、jpg など）は決め打ちにしない。取り込める画像の種類は端末の写真アプリ次第で、
// AVIF のような新しい形式もある。種類を限ると、自分で書き出したファイルを自分で読めなくなる。
const EXTENSION_PATTERN = /^\.[a-z0-9]{1,8}$/;
const DEFAULT_IMAGE_EXTENSION = '.jpg';
const COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;
const DEFAULT_ARROW_COLOR = '#E53935';

// 読み込めない理由を、そのまま利用者に見せられる文で持つエラー。
export class PackageError extends Error {}

// ファイル名の拡張子を、ドット付きの小文字で返す。無ければ空文字。
export function extensionOf(fileName) {
  const dot = fileName.lastIndexOf('.');
  return dot <= 0 ? '' : fileName.slice(dot).toLowerCase();
}

// 共有ファイルの名前に使えるよう、ファイル名に使えない文字を置き換える。
export function safeFileName(name) {
  const cleaned = name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').trim();
  return Array.from(cleaned).slice(0, 40).join('') || 'trailmarker';
}

// 読み込む側が受け付ける形の拡張子だけを使う。合わないものは既定の拡張子にする。
// 画像を表示する部品は中身から形式を判断するので、拡張子が実際の形式と違っても表示できる。
function entryExtension(fileName) {
  const extension = extensionOf(fileName);
  return EXTENSION_PATTERN.test(extension) ? extension : DEFAULT_IMAGE_EXTENSION;
}

// entry（マップ・フォルダ・組み合わせの1件分）に、item のアイコンを足して返す。アイコンを決めていなければ、何も足さない。
// 写真のアイコンは、zip のどの名前に入れるかを icons に足す。
function withIcon(entry, item, icons) {
  if (item.iconType === ICON_EMOJI) {
    const emoji = iconEmojiFrom(item.iconValue);
    return emoji === '' ? entry : { ...entry, icon: { type: ICON_EMOJI, emoji } };
  }
  const iconFile = iconPhotoFile(item);
  if (iconFile === null) return entry;
  const entryName = `icons/${icons.length + 1}${entryExtension(iconFile)}`;
  icons.push({ entryName, iconFile });
  return { ...entry, icon: { type: ICON_PHOTO, image: entryName } };
}

// アプリ内のデータから、共有ファイルの中身を組み立てる。
// folder は { name, iconType, iconValue }。null なら、フォルダ無しの共有になる。
// subfolders は、folder の中のフォルダ（二段目）。各要素は { id, name, iconType, iconValue }。folder が null のときは使わない。
// maps の各要素は { id, folderId, name, imageFile, width, height, iconType, iconValue, markers, arrows }。
// combos の各要素は { folderId, name, firstMapId, secondMapId, iconType, iconValue }。2枚とも maps に入っている組み合わせだけを含める。
// maps と combos の folderId が subfolders のどれかの id なら、そのフォルダに入っているものとして書き出す（subfolder に何番目かを入れる）。
// 戻り値の images は、zip のどの名前にどの地図の画像を入れるかの対応。icons は、アイコンの写真についての同じ対応。
export function buildPackage(folder, maps, combos = [], subfolders = []) {
  const icons = [];
  const usedSubfolders = folder === null ? [] : subfolders;
  const subfolderIndexById = new Map(usedSubfolders.map((subfolder, index) => [subfolder.id, index]));
  // 入っているフォルダが二段目のフォルダなら、何番目かを足す。そうでなければ何も足さない。
  const withSubfolder = (entry, item) =>
    subfolderIndexById.has(item.folderId)
      ? { ...entry, subfolder: subfolderIndexById.get(item.folderId) }
      : entry;

  let manifestFolder = null;
  if (folder !== null) {
    manifestFolder = withIcon({ name: folder.name }, folder, icons);
    if (usedSubfolders.length > 0) {
      manifestFolder.subfolders = usedSubfolders.map((subfolder) =>
        withIcon({ name: subfolder.name }, subfolder, icons)
      );
    }
  }

  const images = [];
  const manifestMaps = maps.map((map, index) => {
    const entryName = `images/${index + 1}${entryExtension(map.imageFile)}`;
    images.push({ entryName, imageFile: map.imageFile });
    const entry = {
      name: map.name,
      image: entryName,
      width: map.width,
      height: map.height,
      markers: map.markers.map(({ emoji, x, y, note, noteSize, scale }) => ({
        emoji,
        x,
        y,
        note: cleanNote(note),
        noteSize: cleanNoteSize(noteSize),
        scale: cleanSize(scale),
      })),
      arrows: map.arrows.map(({ x1, y1, x2, y2, cx, cy, color, scale }) => ({
        x1,
        y1,
        x2,
        y2,
        cx,
        cy,
        color,
        scale: cleanSize(scale),
      })),
    };
    return withIcon(withSubfolder(entry, map), map, icons);
  });

  // アプリ内の id は端末ごとに違うので、組み合わせは「何番目のマップか」で2枚を指す。
  const indexByMapId = new Map(maps.map((map, index) => [map.id, index]));
  const manifestCombos = combos
    .filter((combo) => indexByMapId.has(combo.firstMapId) && indexByMapId.has(combo.secondMapId))
    .map((combo) =>
      withIcon(
        withSubfolder(
          {
            name: combo.name,
            first: indexByMapId.get(combo.firstMapId),
            second: indexByMapId.get(combo.secondMapId),
          },
          combo
        ),
        combo,
        icons
      )
    );

  return {
    manifest: {
      format: PACKAGE_FORMAT,
      version: PACKAGE_VERSION,
      folder: manifestFolder,
      maps: manifestMaps,
      combos: manifestCombos,
    },
    images,
    icons,
  };
}

function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function cleanName(value, fallback) {
  if (typeof value !== 'string') return fallback;
  const name = Array.from(value.trim()).slice(0, MAX_NAME_LENGTH).join('');
  return name === '' ? fallback : name;
}

function parseMarker(raw) {
  if (!isObject(raw) || typeof raw.emoji !== 'string') return null;
  if (!Number.isFinite(raw.x) || !Number.isFinite(raw.y)) return null;
  const emoji = firstGrapheme(raw.emoji);
  if (emoji === '' || emoji.length > MAX_EMOJI_LENGTH) return null;
  return {
    emoji,
    x: clamp(raw.x, 0, 1),
    y: clamp(raw.y, 0, 1),
    // メモは後から足した項目。入っていないファイルでは、メモ無し・大きさ「中」になる。
    note: cleanNote(raw.note),
    noteSize: cleanNoteSize(raw.noteSize),
    // 大きさは後から足した項目。入っていないファイルでは、標準の大きさになる。
    scale: cleanSize(raw.scale),
  };
}

function parseArrow(raw) {
  if (!isObject(raw)) return null;
  const keys = ['x1', 'y1', 'x2', 'y2', 'cx', 'cy'];
  if (!keys.every((key) => Number.isFinite(raw[key]))) return null;
  return {
    x1: clamp(raw.x1, 0, 1),
    y1: clamp(raw.y1, 0, 1),
    x2: clamp(raw.x2, 0, 1),
    y2: clamp(raw.y2, 0, 1),
    cx: clamp(raw.cx, -1, 2),
    cy: clamp(raw.cy, -1, 2),
    color:
      typeof raw.color === 'string' && COLOR_PATTERN.test(raw.color)
        ? raw.color
        : DEFAULT_ARROW_COLOR,
    scale: cleanSize(raw.scale),
  };
}

// 配列でなければ空として扱う。壊れている要素は読み飛ばす。
function parseItems(raw, parseItem) {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(0, MAX_ITEMS_PER_MAP)
    .map(parseItem)
    .filter((item) => item !== null);
}

function isValidSide(value) {
  return Number.isFinite(value) && value > 0 && value <= MAX_IMAGE_SIDE;
}

// アイコンは後から足した項目。入っていないときや、形がおかしいときは、アイコン無し（null）にする。
// アイコンが読めないだけで、マップごと読み込めなくなるのは避ける。
// 絵文字は { type: 'emoji', emoji }、写真は { type: 'photo', image }（image は zip の中の場所）で返す。
function parseIcon(raw) {
  if (!isObject(raw)) return null;
  if (raw.type === ICON_EMOJI) {
    const emoji = iconEmojiFrom(raw.emoji);
    return emoji === '' ? null : { type: ICON_EMOJI, emoji };
  }
  if (
    raw.type === ICON_PHOTO &&
    typeof raw.image === 'string' &&
    ICON_ENTRY_PATTERN.test(raw.image) &&
    EXTENSION_PATTERN.test(extensionOf(raw.image))
  ) {
    return { type: ICON_PHOTO, image: raw.image };
  }
  return null;
}

// フォルダの中のフォルダ（二段目）は、フォルダの項目の中に配列で入っている。
// マップと組み合わせは、それを「何番目か」で指す。番号がずれないよう、壊れている要素も、名前だけの要素として残す。
function parseSubfolders(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, MAX_SUBFOLDERS).map((subfolder, index) => ({
    name: cleanName(isObject(subfolder) ? subfolder.name : undefined, `フォルダ ${index + 1}`),
    icon: isObject(subfolder) ? parseIcon(subfolder.icon) : null,
  }));
}

// 入っている二段目のフォルダの番号。範囲の外や、書かれていないときは null（一段目のフォルダに入る）。
function parseSubfolderRef(value, subfolderCount) {
  return Number.isInteger(value) && value >= 0 && value < subfolderCount ? value : null;
}

function parseMap(raw, index, subfolderCount) {
  const brokenImage = new PackageError('共有ファイルの中の、画像の情報が壊れています。');
  if (!isObject(raw)) throw brokenImage;
  if (typeof raw.image !== 'string' || !IMAGE_ENTRY_PATTERN.test(raw.image)) throw brokenImage;
  if (!EXTENSION_PATTERN.test(extensionOf(raw.image))) throw brokenImage;
  if (!isValidSide(raw.width) || !isValidSide(raw.height)) throw brokenImage;

  return {
    name: cleanName(raw.name, `マップ ${index + 1}`),
    image: raw.image,
    width: raw.width,
    height: raw.height,
    icon: parseIcon(raw.icon),
    subfolder: parseSubfolderRef(raw.subfolder, subfolderCount),
    markers: parseItems(raw.markers, parseMarker),
    arrows: parseItems(raw.arrows, parseArrow),
  };
}

// 組み合わせは、2枚を「何番目のマップか」で指している。番号が範囲の外や、同じマップ2枚のものは読み飛ばす。
function parseCombos(raw, mapCount, subfolderCount) {
  if (!Array.isArray(raw)) return [];
  const isMapIndex = (value) => Number.isInteger(value) && value >= 0 && value < mapCount;
  return raw
    .slice(0, MAX_COMBOS)
    .filter(
      (combo) =>
        isObject(combo) &&
        isMapIndex(combo.first) &&
        isMapIndex(combo.second) &&
        combo.first !== combo.second
    )
    .map((combo, index) => ({
      name: cleanName(combo.name, `組み合わせ ${index + 1}`),
      first: combo.first,
      second: combo.second,
      icon: parseIcon(combo.icon),
      subfolder: parseSubfolderRef(combo.subfolder, subfolderCount),
    }));
}

// 共有ファイルの manifest.json を読み取る。
// ほかの人が作ったファイルなので、中身を信用せず、形と値の範囲を1つずつ確かめる。
// 読み込めないときは PackageError を投げる。
export function parseManifest(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new PackageError('共有ファイルの中身を読み取れませんでした。');
  }

  if (!isObject(data) || data.format !== PACKAGE_FORMAT) {
    throw new PackageError('トレイルマーカーの共有ファイルではありません。');
  }
  if (!Number.isInteger(data.version) || data.version < 1) {
    throw new PackageError('共有ファイルの中身を読み取れませんでした。');
  }
  if (data.version > PACKAGE_VERSION) {
    throw new PackageError(
      'このファイルは、新しいバージョンのアプリで作られています。アプリを更新してから読み込んでください。'
    );
  }
  if (!Array.isArray(data.maps) || data.maps.length === 0) {
    throw new PackageError('共有ファイルにマップが入っていません。');
  }
  if (data.maps.length > MAX_MAPS) {
    throw new PackageError(`マップが多すぎます（1つのファイルに ${MAX_MAPS} 件まで）。`);
  }

  // フォルダの中のフォルダ（二段目）は後から足した項目。入っていないファイルも読み込める。
  // フォルダが無い共有（folder が null）では、使わない。
  const subfolders = isObject(data.folder) ? parseSubfolders(data.folder.subfolders) : [];

  return {
    folderName: isObject(data.folder) ? cleanName(data.folder.name, '読み込んだフォルダ') : null,
    folderIcon: isObject(data.folder) ? parseIcon(data.folder.icon) : null,
    subfolders,
    maps: data.maps.map((map, index) => parseMap(map, index, subfolders.length)),
    // 組み合わせは後から足した項目。入っていないファイル（古いアプリで作ったもの）も読み込める。
    combos: parseCombos(data.combos, data.maps.length, subfolders.length),
  };
}
