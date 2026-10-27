# コアフューテック企業・採用サイト

企業・採用情報を統合した静的サイトの試作です。編集元と生成物を分けて管理しています。

## 確認・ビルド

このフォルダで実行します。追加ライブラリのインストールは不要です。

```powershell
node build.mjs
```

生成後、[dist/index.html](dist/index.html) をブラウザーで開いて確認します。現時点の生成対象は33ページです。Google FontsとGoogle マップへの外部リンクはインターネット接続を利用します。

## フォルダ構成

```text
index.html                 ホームの編集元
build.mjs                  下層ページ生成・アセットのコピー
assets/
  css/                     CSS
  js/                      JavaScript
  images/                  写真・イラスト・マップSVG
  animations/              埋め込みアニメーション
  vendor/                  外部配布物・ライセンス
content/                   下層本文・フォーム定義・取得元データ
scripts/                   HTML整形・本文取得／監査ツール
docs/                      設計・調査・確認記録
  archive/                 過去版の説明資料
dist/                      ブラウザー確認・配布用の生成物
```

## 編集する場所

- ホームの文章・構造：`index.html`
- ホームの見た目：`assets/css/home.css`
- 共通／下層の見た目：`assets/css/style.css`、`assets/css/page-variants.css`
- ホームの演出：`assets/js/home-intro.js`、`assets/js/home-scroll.js`
- メニュー・共通の表示演出：`assets/js/motion.js`
- 下層本文・フォーム：`content/`、`build.mjs`

`dist/` は直接編集せず、編集元を修正して再生成してください。

## 資料・作業ツール

資料一覧は [docs/README.md](docs/README.md)、HTMLとアセットの対応は [docs/ASSET_MAP.md](docs/ASSET_MAP.md) を参照してください。

- `scripts/format-html.mjs`：ビルドで使用するHTML整形処理
- `scripts/content-fetch.mjs`：旧サイトの取得データを更新する調査ツール。ネットワーク接続と既存の調査キャッシュが必要です。
- `scripts/content-audit.mjs`：取得原文と生成サイトを照合する移行監査ツール。調査時点のキャッシュが必要です。

調査キャッシュはOSの一時フォルダ内の `corefutec-content-import/` を参照します。通常のビルドには不要です。

## お知らせの編集

- 一覧の見出し・分類・導入文・画像：`content/news-entries.json`
- 取得原文・公開日時：`content/source-pages.json`（原文記録は保持）
- 一覧／記事HTML・1ページの件数：`content/news.mjs`
- 専用スタイル・絞り込み：`assets/css/news.css`、`assets/js/news.js`
- 元記事から取得した画像：`assets/images/news/`

現在は6記事を1ページ5件、全2ページで生成します。記事を追加する際は原文記録と表示用データの両方を更新し、ビルドしてください。ページ数は記事数から算出します。

## 現在の制約

- お問い合わせ・応募フォームは試作用で、送信機能は未実装です。
- 公開・CMS化・旧サイトからのリダイレクト設定は行っていません。
- 古い設計資料・監査記録には過去時点のページ数や構成が含まれます。現行ファイルと本READMEを優先してください。
