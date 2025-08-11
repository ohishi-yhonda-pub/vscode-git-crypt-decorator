# Git Crypt Decorator

VSCodeでgit-cryptで暗号化されたファイルをエクスプローラーで視覚的に識別できる拡張機能です。

## 機能

- `.gitattributes`ファイルで`filter=git-crypt`が設定されているファイルを自動検出
- エクスプローラーで暗号化されたファイルに🔒バッジを表示
- カスタマイズ可能なバッジ、ツールチップ、色設定

## 使い方

1. 拡張機能をインストール
2. git-cryptが設定されたプロジェクトを開く
3. `.gitattributes`に`filter=git-crypt`が設定されているファイルが自動的にマークされます

## 設定

- `gitCryptDecorator.badge`: 表示するバッジ（デフォルト: 🔒）
- `gitCryptDecorator.tooltip`: ツールチップテキスト（デフォルト: Git-Crypt暗号化ファイル）
- `gitCryptDecorator.color`: バッジの色（VSCodeテーマカラー、デフォルト: editorWarning.foreground）

## .gitattributesの例

```
# 特定のファイルを暗号化
secrets.json filter=git-crypt diff=git-crypt
.env filter=git-crypt diff=git-crypt

# パターンマッチング
*.key filter=git-crypt diff=git-crypt
config/*.secret filter=git-crypt diff=git-crypt
```

## 開発

```bash
# 依存関係のインストール
npm install

# コンパイル
npm run compile

# ウォッチモード
npm run watch
```

## ライセンス

MIT