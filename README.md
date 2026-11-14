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

元サイトからの変更点は、ログインが「ChatGPT でログイン」→「Google でログイン」になったことと、
管理者バックアップが「サーバー保存」→「JSON ダウンロード」になったことだけです。画面や機能はそのままです。

## データの保存先（Firestore）

- `users/{uid}` … 個人の記録（スタンプ・メモ・チェックリスト）。本人だけ読み書き可
- `profiles/{uid}` … ニックネームとアバター。だれでも閲覧可
- `posts/{id}` と `posts/{id}/comments` … みんなの旅の投稿とコメント。だれでも閲覧可、書き込みはログイン必須
- `media/{id}` … 写真（JPEG を文字列で保存。Storage を使わないので無料プランで動きます）
- `hiddenPosts` / `reports` / `feedback` / `audit` … 非表示の投稿・通報・改善要望・操作履歴
- `admins/{uid}` … ここに自分の UID のドキュメントを作ると管理者メニューが出ます

## 初期設定

1. [Firebase コンソール](https://console.firebase.google.com/) でプロジェクトを作成
2. **Firestore Database** を作成（本番モード、ロケーションは `asia-northeast1` 推奨）
3. Firestore の「ルール」タブに `firestore.rules` の内容を貼り付けて公開
4. **Authentication** → ログイン方法 → **Google** を有効化
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
python -m http.server 8765 --bind 127.0.0.1 --directory public
```

`http://127.0.0.1:8765/` を開きます（`localhost` / `127.0.0.1` は Firebase の承認済みドメインに最初から入っています）。
