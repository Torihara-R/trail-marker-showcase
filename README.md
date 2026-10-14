# トレイルマーカー (Trail Marker)

マップの画像に、絵文字・矢印・メモを書き込んで、自分だけのマップを作れる iPhone アプリです。

このリポジトリは、アプリのうち、端末の機能に依存しない計算・規則の部分を、テストと一緒に公開するものです。アプリ本体は非公開のリポジトリで開発しています。

> An iPhone app (Expo / React Native, JavaScript) for annotating your own map images with emoji, arrows and notes. This repository contains the app's platform-independent logic with its tests; the full app source is private.

<img src="docs/images/03-note.jpg" alt="見本のマップに、絵文字・矢印・メモの吹き出しを置いた画面" width="280">

## アプリの機能

- マップの画像を取り込んで保存し、名前で検索する
- 絵文字を置く・動かす・大きさを変える。矢印を引いて、曲げたり、色や太さを変えたりする
- 絵文字にメモを付け、「表示」でタップすると吹き出しで読む
- フォルダ（二段まで）、2枚を並べて見る「組み合わせ」
- 背景の色や写真、ボタンの色を変える
- フォルダやマップを、ファイル（`.trailmarker`）にして共有・読み込む

サーバーやアカウントは使わず、データは端末の中だけに保存します。

## このリポジトリの内容

| ファイル | 内容 |
|---|---|
| `src/lib/mapGeometry.js` | 位置を、画像に対する割合（0〜1）で扱う変換 |
| `src/lib/arrowGeometry.js` | 矢印（2次ベジェ曲線）の形、矢じり、タップの当たり判定 |
| `src/lib/noteGeometry.js` | メモの吹き出しの位置 |
| `src/lib/searchText.js` | 名前の検索（全角・半角、ひらがな・カタカナの違いを吸収） |
| `src/lib/folderTree.js` | フォルダの入れ子（二段まで）の規則 |
| `src/lib/themeColors.js` | 背景色から画面の配色を作る（コントラスト比を保つ） |
| `src/lib/sharePackage.js` | 共有ファイルの形式と、読み込み時の検査 |
| `src/db/migrate.js` | データベースのマイグレーション |

各ファイルのテストは、同じフォルダの `*.test.js` です。

## テストの実行

Node.js が必要です。

```
npm install
npm test
```

## 使用技術

JavaScript、Expo SDK 57、React Native、expo-sqlite、react-native-svg、jszip、Node.js 標準のテストランナー

## ライセンス

Copyright (c) 2026 Torihara-R. All rights reserved.

ソースコードは、閲覧・評価の目的で公開しています。許可なく、複製・再配布・改変・ストアへの公開をすることはできません。
