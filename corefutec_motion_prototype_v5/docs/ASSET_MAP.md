# HTMLとアセットの対応

## 2026年10月26日 — ホーム（/）

| HTML | CSS | JS |
|---|---|---|
| /index.html | assets/style.css、assets/page-variants.css、assets/home.css | assets/motion.js |
| 既存の下層18ページ | 従来どおり（変更なし） | 従来どおり（変更なし） |

home.cssはホームだけで読み込み、全ルールを.page-homeで限定しています。既存の共通トークン、ナビ、見出し演出を再利用。ホームのカードDOMを削除したため、motion.jsのカード処理はカードが存在せず開始されません。既存の共通アセット分割は今回の範囲に含めません。

## ホームのHTML編集元

ホームはプロジェクト直下の `index.html` を通常のHTMLとして編集し、`node build.mjs` で `dist/index.html` にコピーします。2スペースのインデントとタグの階層に沿う改行を維持します。下層18ページの生成方法は変更していません。
