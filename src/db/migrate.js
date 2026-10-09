const DATABASE_VERSION = 11;

// アプリの起動時に一度呼ばれる。端末に保存されているバージョンを見て、足りない変更だけを順に適用する。
// テーブルを変えるときは DATABASE_VERSION を上げ、下に `if (currentVersion === 11) { ... }` を足す。
export async function migrateDbIfNeeded(db) {
  const row = await db.getFirstAsync('PRAGMA user_version');
  let currentVersion = row?.user_version ?? 0;
  if (currentVersion >= DATABASE_VERSION) return;

  if (currentVersion === 0) {
    await db.execAsync(`
      PRAGMA journal_mode = 'wal';
      CREATE TABLE maps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        image_file TEXT NOT NULL,
        width INTEGER NOT NULL,
        height INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);
    currentVersion = 1;
  }

  if (currentVersion === 1) {
    // x と y は画像の左上を (0, 0)、右下を (1, 1) とした割合。
    // ピクセルではなく割合で持つので、画面の大きさや拡大率が変わっても位置がずれない。
    await db.execAsync(`
      CREATE TABLE markers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        map_id INTEGER NOT NULL,
        emoji TEXT NOT NULL,
        x REAL NOT NULL,
        y REAL NOT NULL,
        created_at INTEGER NOT NULL
      );
      CREATE INDEX markers_map_id ON markers (map_id);
    `);
    currentVersion = 2;
  }

  if (currentVersion === 2) {
    // 矢印。(x1, y1) が始点、(x2, y2) が矢じりのある終点、(cx, cy) が曲がり具合を決める制御点。
    // どれも絵文字と同じく、画像に対する割合で持つ。
    await db.execAsync(`
      CREATE TABLE arrows (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        map_id INTEGER NOT NULL,
        x1 REAL NOT NULL,
        y1 REAL NOT NULL,
        x2 REAL NOT NULL,
        y2 REAL NOT NULL,
        cx REAL NOT NULL,
        cy REAL NOT NULL,
        color TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
      CREATE INDEX arrows_map_id ON arrows (map_id);
    `);
    currentVersion = 3;
  }

  if (currentVersion === 3) {
    // フォルダ。マップは多くても1つのフォルダに入る。folder_id が NULL のマップは、どのフォルダにも入っていない。
    await db.execAsync(`
      CREATE TABLE folders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
      ALTER TABLE maps ADD COLUMN folder_id INTEGER;
      CREATE INDEX maps_folder_id ON maps (folder_id);
    `);
    currentVersion = 4;
  }

  if (currentVersion === 4) {
    // 組み合わせ。2枚のマップを並べて表示するための、名前付きの組。
    // first_map_id が上、second_map_id が下に表示するマップ。
    await db.execAsync(`
      CREATE TABLE combos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        first_map_id INTEGER NOT NULL,
        second_map_id INTEGER NOT NULL,
        created_at INTEGER NOT NULL
      );
    `);
    currentVersion = 5;
  }

  if (currentVersion === 5) {
    // 組み合わせもフォルダに入れられるようにする。マップと同じく、NULL はどのフォルダにも入っていないことを表す。
    // 組み合わせが入るフォルダと、その2枚のマップが入るフォルダは、別々でよい。
    await db.execAsync(`
      ALTER TABLE combos ADD COLUMN folder_id INTEGER;
      CREATE INDEX combos_folder_id ON combos (folder_id);
    `);
    currentVersion = 6;
  }

  if (currentVersion === 6) {
    // 絵文字に付けるメモ。空文字はメモ無し。note_size は吹き出しの大きさ（0 が小、1 が中、2 が大）。
    await db.execAsync(`
      ALTER TABLE markers ADD COLUMN note TEXT NOT NULL DEFAULT '';
      ALTER TABLE markers ADD COLUMN note_size INTEGER NOT NULL DEFAULT 1;
    `);
    currentVersion = 7;
  }

  if (currentVersion === 7) {
    // 一覧に出すアイコン。マップ・フォルダ・組み合わせのどれにも付けられる。
    // icon_type は ''（決めていない）、'emoji'（絵文字）、'photo'（写真）のどれか。
    // icon_value は、絵文字ならその絵文字、写真ならアプリ内に保存した画像のファイル名。
    await db.execAsync(`
      ALTER TABLE maps ADD COLUMN icon_type TEXT NOT NULL DEFAULT '';
      ALTER TABLE maps ADD COLUMN icon_value TEXT NOT NULL DEFAULT '';
      ALTER TABLE folders ADD COLUMN icon_type TEXT NOT NULL DEFAULT '';
      ALTER TABLE folders ADD COLUMN icon_value TEXT NOT NULL DEFAULT '';
      ALTER TABLE combos ADD COLUMN icon_type TEXT NOT NULL DEFAULT '';
      ALTER TABLE combos ADD COLUMN icon_value TEXT NOT NULL DEFAULT '';
    `);
    currentVersion = 8;
  }

  if (currentVersion === 8) {
    // アプリ全体の設定。キーと値（JSON の文字列）の組で持つ。今はデザイン（key = 'theme'）だけ。
    await db.execAsync(`
      CREATE TABLE settings (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );
    `);
    currentVersion = 9;
  }

  if (currentVersion === 9) {
    // フォルダの入れ子（二段まで）。parent_id は、入っているフォルダ（一段目のフォルダ）の id。NULL は一段目。
    await db.execAsync(`
      ALTER TABLE folders ADD COLUMN parent_id INTEGER;
      CREATE INDEX folders_parent_id ON folders (parent_id);
    `);
    currentVersion = 10;
  }

  if (currentVersion === 10) {
    // 絵文字と矢印の大きさ（倍率）。標準は 1。絵文字は大きさ、矢印は太さ（矢じりの大きさも一緒に）。
    await db.execAsync(`
      ALTER TABLE markers ADD COLUMN scale REAL NOT NULL DEFAULT 1;
      ALTER TABLE arrows ADD COLUMN scale REAL NOT NULL DEFAULT 1;
    `);
    currentVersion = 11;
  }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}
