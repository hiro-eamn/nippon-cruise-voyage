# NIPPON CRUISE｜わたしの船旅

ChatGPT のサイト機能で作ったサイトを、Firebase（ログイン・データベース）と GitHub（コード管理・公開）で動くように移したものです。

## 構成

| 場所 | 内容 |
| --- | --- |
| `public/` | サイト本体（HTML / CSS / JS / 画像）。ビルド不要でそのまま公開できます |
| `public/firebase-config.js` | Firebase プロジェクトの接続情報（**要設定**） |
| `public/firebase-backend.js` | 以前の `/api/*` サーバーの代わり。Firestore と Google ログインで同じ機能を提供 |
| `firestore.rules` | データベースのアクセス権（誰が何を読める・書けるか） |
| `firebase.json` | Firebase Hosting / Firestore の設定 |
| `.github/workflows/pages.yml` | `main` に push すると `public/` を GitHub Pages に公開 |

元サイトからの主な変更点:

- ログインは「ChatGPT でログイン」→「Google でログイン」または「メールアドレス＋パスワード」
- 管理者バックアップは「サーバー保存」→「JSON ダウンロード」
- ヘッダーの「表示を試す」（乗船前・乗船中・下船後などの切り替え）、寄港地マップ、乗船コードは、検証用に**誰でも**使えます。
  本番運用するときは管理者限定に戻してください（`production.js` と `port-map.js` の `previewMode` の条件に `feedbackIsAdmin` を足す）
- サンプル予約の出港日は 2026-11-29。それ以降は 30 日ごとに自動で繰り上がり、カウントダウンが続きます
- 改善要望の送信は 1 ブラウザあたり 1 分に 1 回・1 日 5 回まで

## データの保存先（Firestore）

- `users/{uid}` … 個人の記録（スタンプ・メモ・チェックリスト）。本人だけ読み書き可
- `profiles/{uid}` … ニックネームとアバター。だれでも閲覧可
- `posts/{id}` と `posts/{id}/comments` … みんなの旅の投稿とコメント。だれでも閲覧可、書き込みはログイン必須
- `media/{id}` … 写真（JPEG を文字列で保存。Storage を使わないので無料プランで動きます）
- `hiddenPosts` / `reports` / `feedback` / `audit` … 非表示の投稿・通報・改善要望・操作履歴
- `admins/{uid}` … ここに自分の UID のドキュメントを作ると管理者メニューが出ます

## 公開先

- サイト: https://hiro-eamn.github.io/nippon-cruise-voyage/
- コード: https://github.com/hiro-eamn/nippon-cruise-voyage
- データベース: Firebase プロジェクト `nippon-cruise-voyage`（無料の Spark プラン、Firestore は東京リージョン）

## 初期設定（1〜6 は設定済み。別のプロジェクトで作り直すときの手順）

1. [Firebase コンソール](https://console.firebase.google.com/) でプロジェクトを作成
2. **Firestore Database** を作成（本番モード、ロケーションは `asia-northeast1` 推奨）
3. Firestore の「ルール」タブに `firestore.rules` の内容を貼り付けて公開
4. **Authentication** → ログイン方法 → **Google** と **メール / パスワード** を有効化
5. プロジェクトの設定 → マイアプリ → ウェブアプリを追加し、表示された `firebaseConfig` を `public/firebase-config.js` に貼り付け
6. 公開先のドメイン（例: `ユーザー名.github.io`）を Authentication → 設定 → **承認済みドメイン** に追加
7. 管理者にしたいアカウントでサイトに一度ログインし、Authentication のユーザー一覧で UID を確認して、
   Firestore に `admins/{そのUID}` という空のドキュメントを作成

`firebase-config.js` が未設定の間も、サイトは閲覧専用（ログイン・投稿なし）で表示されます。

## 公開方法

- **GitHub Pages**: このフォルダを GitHub リポジトリの `main` に push し、リポジトリの Settings → Pages → Source を「GitHub Actions」にする
- **Firebase Hosting**（代替）: `firebase deploy`（Firebase CLI が必要）。ルールも同時に反映されます

## 手元で確認

```
python -m http.server 8765 --directory public
```

`http://localhost:8765/` を開きます（`localhost` は Firebase の承認済みドメインに最初から入っています。`127.0.0.1` ではログインできません）。

## 更新のしかた

`public/` のファイルを書き換えて GitHub の `main` に反映すると、1分ほどでサイトに自動公開されます。
`firestore.rules` を変えたときは、Firebase コンソールの Firestore →「ルール」に貼り付けて公開してください（GitHub に置くだけでは反映されません）。
