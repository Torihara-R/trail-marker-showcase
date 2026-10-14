# トレイルマーカー (Trail Marker) — 設計とテストの紹介

マップの画像に、絵文字・矢印・メモを書き込んで、自分だけのマップを作れる iPhone アプリ「トレイルマーカー」です。
このリポジトリは、アプリの **設計と、端末の機能を使わない計算・規則の部分（テスト付き）** を紹介するためのものです。アプリ本体は、非公開のリポジトリで開発しています。

> A mobile app (Expo / React Native, JavaScript) for annotating your own map images with emoji, arrows and notes. This repository shows the app's design and its pure-logic modules with tests. The full app source is in a private repository.

状態: 開発中（最初のリリースは、日本の App Store の予定）。サポートページ: https://trail-marker.pages.dev/

<!--
📷 写真を貼る場所 1（アプリ全体）
  画面写真を docs/images/01-list.png として保存して、この囲み（コメント）を外して、下の画像の行だけを残す。
  ![マップの一覧（フォルダ・アイコン付き）](docs/images/01-list.png)
-->

## アプリでできること

- マップの画像を取り込み、名前を付けて保存。名前で検索（ひらがな・カタカナ、全角・半角を区別しない）
- 絵文字を置く・動かす・大きさを変える。矢印を指でなぞって引き、曲げたり、色・太さを変えたりできる
- 絵文字にメモを付ける。見るだけの「表示」では、タップすると吹き出しで読める
- フォルダ（二段まで）、2枚を並べて見る「組み合わせ」、同じフォルダのマップの切り替え
- 一覧のアイコン（絵文字・写真）、背景の色・写真、ボタンの色を、好きに変えられる
- フォルダやマップを、ファイル（`.trailmarker`）にして共有・読み込み。サーバーは使わない

<img src="docs/images/03-note.jpg" alt="見本のマップに、絵文字、矢印、メモの吹き出しを置いた「表示」の画面" width="280">

<!--
📷 写真を貼る場所 2（書き込み）
  docs/images/02-edit.png（絵文字と矢印を置いた編集の画面）
  ![絵文字と矢印を置いたところ](docs/images/02-edit.png)
-->

## 設計で考えたところ

全体の方針は、**「計算と規則」を、端末の機能から切り離して、テストで守る**ことです。
画面や、データベース・ファイルの読み書きは、端末の機能（Expo / React Native）に頼りますが、
形の計算、規則、データの検査は、ただの関数にして、`node --test` だけで検証できるようにしています。

| 考えたこと | どうしたか | コード | テスト |
|---|---|---|---|
| 画面の大きさや拡大に左右されず、位置を保存し、共有ファイルでも使う | 位置を、画像に対する割合（0〜1）で保存する | [`mapGeometry.js`](src/lib/mapGeometry.js) | [`mapGeometry.test.js`](src/lib/mapGeometry.test.js) |
| 指でなぞった矢印を、曲げたり、まっすぐに戻したりしたい | 始点・制御点・終点の、2次ベジェ曲線で表す。矢じりの向き、タップの当たり判定、割合と px の変換を計算する | [`arrowGeometry.js`](src/lib/arrowGeometry.js) | [`arrowGeometry.test.js`](src/lib/arrowGeometry.test.js) |
| 絵文字のメモを、画面の端でも、はみ出さず読みたい | 吹き出しを、絵文字の真上（入らなければ真下）に、左右を寄せて置く。しっぽの位置も計算する | [`noteGeometry.js`](src/lib/noteGeometry.js) | [`notes.test.js`](src/lib/notes.test.js) |
| 名前の検索で、表記ゆれに強くしたい | NFKC で正規化し、カタカナをひらがなに寄せて、空白で区切った語を「すべて含む」で探す | [`searchText.js`](src/lib/searchText.js) | [`searchText.test.js`](src/lib/searchText.test.js) |
| フォルダを二段まで入れ子にしたい。ぐるぐる回る構造は避けたい | 二段までに限ることで、循環が起きない規則にする。移せるか・作れるかを、関数で判定する | [`folderTree.js`](src/lib/folderTree.js) | [`folderTree.test.js`](src/lib/folderTree.test.js) |
| 背景の色を自由に選べても、文字が読めるようにしたい | 背景から、カード・文字・枠線の色を作り、WCAG のコントラスト比で、ボタンの色を必要なときだけ調整する | [`themeColors.js`](src/lib/themeColors.js) | [`themeColors.test.js`](src/lib/themeColors.test.js) |
| 他人が作った共有ファイルを、安全に読みたい | 形式にバージョンを持たせ、値の範囲・ファイルの場所・大きさを1つずつ検査する。壊れた部分は読み飛ばす | [`sharePackage.js`](src/lib/sharePackage.js) | [`sharePackage.test.js`](src/lib/sharePackage.test.js)、[`sharePackageZip.test.js`](src/lib/sharePackageZip.test.js) |
| 端末のデータベースを、アプリの更新のたびに安全に変えたい | バージョン番号を見て、足りない変更だけを順に適用する | [`migrate.js`](src/db/migrate.js) | — |

<!--
📷 写真を貼る場所 3（デザインと入れ子）
  docs/images/04-dark.png（暗い背景のデザイン設定）、docs/images/05-combo.png（2枚を並べた「組み合わせ」）
  ![暗い背景](docs/images/04-dark.png)
  ![2枚を並べて表示](docs/images/05-combo.png)
-->

### 実機で見つかった不具合を、テストにして残す

共有ファイルの読み込みで、「画像の情報が壊れています」と出る不具合が、実機で見つかりました。
原因は、読み込み側が、画像の拡張子を6種類に決め打ちにしていて、AVIF の地図を断っていたことでした。
**画像の種類を限らず、拡張子の「形」だけを検査する**ように直し、AVIF など複数の形式を、書き出して読み戻す回帰テストを足しました
（[`sharePackage.test.js`](src/lib/sharePackage.test.js) の「画像の種類を限らない」）。

利用者に見せるエラーの文は短くしてあるので、表示だけで原因を決めつけず、開発中だけ、詳しい原因をログに出す作りにして、原因を特定しました。

### 他人が作ったファイルを、信用しない

共有ファイルは、ほかの人が作ったものです。次のように扱っています（[`sharePackage.js`](src/lib/sharePackage.js)）。

- 画像の場所は `images/英数字.拡張子` の形だけを受け付け、`../` などの、場所を外へ指す書き方は断る
- 名前は長さを切り詰め、位置は範囲内に収め、壊れた絵文字や矢印は読み飛ばす（全体を読めなくしない）
- 新しいバージョンのファイルは、更新を促す文で断る。古いバージョンのファイル（項目が足りないもの）は、そのまま読める
- 画像・アイコンの保存名は、アプリ側で付け直し、ファイルの中の名前は使わない

## 技術

| | |
|---|---|
| 言語・基盤 | JavaScript、Expo SDK 57、React Native 0.86、Expo Router |
| データ | expo-sqlite（バージョン管理つきのマイグレーション）、画像はファイルとして保存 |
| 描画 | react-native-svg（矢印）、自前のジェスチャー（ドラッグ・タップ） |
| 共有ファイル | jszip（zip）。中身は JSON と画像 |
| テスト | Node.js 標準のテスト（`node --test`）。アプリ本体では 128 件 |
| 個人情報 | サーバー、アカウント、解析は無し。データは端末の中だけ |

## テストを動かす

このリポジトリの計算と規則の部分は、アプリ本体と切り離して、単独で動きます。

```
npm install
npm test
```

## このリポジトリにあるもの

```
src/lib/   端末の機能を使わない、計算・規則・検査と、そのテスト
src/db/    データベースのマイグレーション（バージョン管理）
docs/      写真を置く場所
```

画面、データベースの読み書き、ファイルの入出力など、アプリ本体のコードは含みません。

## 権利について

Copyright (c) 2026 Torihara-R. All rights reserved.

このリポジトリのソースコードは、閲覧・評価の目的で公開しています。許可なく、複製・再配布・改変・ストアへの公開をすることは、できません。
