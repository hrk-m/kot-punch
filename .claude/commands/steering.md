# /steering —docs/ を永続的なプロジェクト知識として管理する

# ドキュメント管理

<background_information> **役割**: `docs/` をプロジェクトの永続メモリとして維持する。

**ミッション**:

- 初期生成: コードベースからコア docs を生成する（初回）
- 同期: docs とコードベースの整合を維持する（運用）
- 保持: ユーザーのカスタマイズを尊重し、更新は加筆中心で行う

**成功基準**:

- ドキュメントが網羅的な一覧ではなく、要件とアーキテクチャのパターンを捉えている
- コードドリフトを検出し、報告できる
- `docs/prd/*.md` と `docs/architecture.md` を信頼できる一次情報として扱う </background_information>

<instructions>
## 共通ルール

- **言語**: 日本語（技術用語は英語）
- **全体一次情報**: `docs/prd/index.md` と `docs/architecture.md` を「アプリ全体のコード知識」として最優先で参照する

---

## シナリオ判定

`docs/` の状態を確認する:

**初期生成モード**: 空、またはコアファイル（`docs/prd/index.md`, `docs/architecture.md`）が不足している  
**同期モード**: すべてのコアファイルが存在する

### ドキュメントレイアウト

```
docs/
  prd/                       # アプリ全体の機能要件（PRD）
    index.md                 # 全体サマリー・インデックス（自動更新）
    {feature-name}.md        # 機能ごとの要件詳細（必要時のみ）
  architecture.md            # アプリ全体のディレクトリ構成と実装責務
```

### 全体コード把握の起点（必須）

- `docs/prd/index.md`: 全体サマリー・機能要件の起点として読む
- `docs/prd/{feature-name}.md`: 機能単位の要件差分を確認する
- `docs/architecture.md`: ディレクトリ構成と実装責務の起点として読む
- `/planning` や `/task` で生成された `docs/tasks/{タスク名}/prd.md` が存在する場合は、上記全体情報と矛盾しないか確認する

---

## 初期生成フロー

1. `settings/templates/docs/` からテンプレートを読み込む（存在する場合）
2. コードベースを分析する（JIT）:
   - `glob_file_search` でソースファイルを探索
   - `read_file` で README, package.json などを読み取り
   - `grep` でパターンを検索
3. パターンを抽出する（一覧化しない）:
   - PRD: 目的、価値、コア機能
   - Architecture: ディレクトリ責務、実装箇所、境界
4. docs ファイルを生成する（テンプレートに従う）:
   - `docs/prd/index.md`（常に生成）
   - `docs/prd/{feature-name}.md`（機能が 2 件以上のとき）
   - `docs/architecture.md`（常に生成）
5. `settings/rules/steering-principles.md` から原則を読み込む
6. レビュー用サマリーを提示する

**注力点**: ファイル/依存関係のカタログではなく、意思決定を導くパターンに集中する。

---

## 同期フロー

1. 既存 docs をすべて読み込む:
   - `docs/prd/index.md`
   - `docs/prd/*.md`
   - `docs/architecture.md`
2. コードベースの変更を分析する（JIT）
3. ドリフトを検出する:
   - **Docs → Code**: 欠落要素 → 警告
   - **Code → Docs**: 新しいパターン → 更新候補
   - **カスタムファイル**: 関連性を確認
4. 更新案を提示する（加筆中心、ユーザー記述を保持）
5. 変更点・警告・推奨事項を報告する

**更新方針**: 置換ではなく追加。ユーザーセクションを保持する。

---

## 粒度の原則

`settings/rules/steering-principles.md` より:

> "If new code follows existing patterns, docs shouldn't need large structural updates."

網羅的な一覧ではなく、パターンと原則を記述する。

**悪い例**: ディレクトリツリーの全ファイルを列挙する  
**良い例**: 具体例つきで構成パターンを説明する

</instructions>

## ツール案内

- `glob_file_search`: ソース/設定ファイルを探索する
- `read_file`: docs や設定ファイルを読む
- `grep`: パターンを検索する
- `list_dir`: 構造を分析する
- `AskUserQuestion`: docs とコードの不整合や要件の不明点確認に使う

**JIT 方針**: 必要になった時点で取得し、先読みしすぎない。

## 出力形式

チャットサマリーのみ（ファイルは直接更新）。

### 初期生成:

```
✅ Docs 作成完了

## 生成物:
- docs/prd/index.md: [全体サマリー]
- docs/prd/{feature-name}.md: [機能詳細, 任意]
- docs/architecture.md: [ディレクトリアーキテクチャ]

信頼できる一次情報としてレビュー・承認してください。
```

### 同期:

```
✅ Docs 更新完了

## 変更点:
- docs/prd/index.md: 機能サマリーを追加
- docs/architecture.md: 実装箇所を追加

## コードドリフト:
- import 規約に従っていないコンポーネント

## 推奨事項:
- 大きな PRD セクションは `docs/prd/{feature-name}.md` への分割を検討
```

## 例

### 初期生成

**入力**: 空の docs、React TypeScript プロジェクト  
**出力**: `docs/prd/index.md` と `docs/architecture.md` に全体パターンを生成

### 同期

**入力**: 既存 docs と新しい `/api` ディレクトリ  
**出力**: `docs/architecture.md` を更新し、非準拠ファイルを警告、PRD 分割を提案

## 安全性とフォールバック

- **セキュリティ**: キー・パスワード・シークレットは絶対に含めない（原則参照）
- **不確実性**: 両方の可能性を報告し、ユーザーに確認する
- **保持**: 迷ったら置換ではなく追加する

## 補足

- `docs/prd/index.md` と `docs/architecture.md` は必須
- `docs/prd/{feature-name}.md` は任意（機能が 2 件以上のときに使用）
- テンプレートと原則は外部カスタマイズ可能
- 一覧化ではなくパターン重視
- "ゴールデンルール": 既存パターンに沿う新規コードでは docs 構造の変更を不要にする
- エージェント固有のツールディレクトリ（例: `.cursor/`, `.gemini/`, `.claude/`）は記述しない
- `settings/` の内容は docs ファイルに記述しない（settings はメタデータであり、プロジェクト知識ではない）
- 全体要件は `docs/prd/index.md` に集約する
- アプリ全体のディレクトリアーキテクチャは `docs/architecture.md` に集約する

## Property Inspector 変更時の追記事項

- `com.hrk-m.kot-punch.sdPlugin/ui/` の差分で設定項目を削除した場合は、削除した UI（例: `Increment By` スライダー）を明示して報告する
- UI 差分のみで検証コマンドを実行しない場合は「ビルドへの影響なしのため未実施」と明記し、実施済みと断定しない
- Property Inspector 反映には Stream Deck の再起動が必要なため、再起動後に変更が見えることを案内する
