# /steering — docs/ を永続的なプロジェクト知識として管理する

<background_information>

**役割**: `docs/` をプロジェクトの永続メモリとして維持する。

- **初期生成**: コードベースからコア docs を生成する（初回）
- **同期**: docs とコードベースの整合を維持する（運用）
- **保持**: ユーザーのカスタマイズを尊重し、更新は加筆中心で行う

</background_information>

<instructions>

## 共通ルール

- **言語**: 日本語（技術用語は英語）
- **一次情報**: `docs/spec.md` と `docs/architecture.md` を最優先で参照する
- **テンプレート準拠**: `docs/spec/*.md` を生成・更新するときは `.claude/commands/template/spec-feature.md` のセクション順を基本とし、Stream Deck の action・state・icon を持つ機能では `## ボタン・アイコン一覧` を省略しない

---

## シナリオ判定

`docs/` の状態を確認する:

- **初期生成モード**: `docs/spec.md` または `docs/architecture.md` が不足している
- **同期モード**: 両ファイルが存在する

### ドキュメントレイアウト

```
docs/
  spec.md                      # アプリ全体の機能要件（全体サマリー・インデックス）
  spec/{feature-name}.md       # 機能ごとの要件詳細（spec.md から分割、必要時のみ）
  architecture.md              # アプリ全体のディレクトリ構成と実装責務
  tasks/{タスク名}/
    prd.md                     # タスク要件（/plan で生成）
    tasks.md                   # 実装チェックリスト（/task で生成）
```

### spec.md の構造ルール

- `docs/spec/{feature-name}.md` が存在する場合は `spec.md` に **必ずリンクセクションを設ける**
- `docs/spec/{feature-name}.md` の作成・削除時は `spec.md` のリンクセクションも同時に更新する

```markdown
## 機能詳細

- [Clock In](./spec/clock-in.md)
- [Clock Out](./spec/clock-out.md)
```

---

## 初期生成フロー

1. コードベースを分析する（Glob / Read / Grep を JIT で使用）
2. パターンを抽出する（一覧化しない）:
   - Spec: 目的・価値・コア機能・ユーザーが押すボタンと対応する icon/state
   - Architecture: ディレクトリ責務・実装箇所・境界
3. 以下を生成する:
   - `docs/spec.md`（常に生成、全機能をまとめて記載）
   - `docs/architecture.md`（常に生成）
4. **spec.md の分割提案**（同期モードの分割フローと同じルールで実行）
5. レビュー用サマリーを提示する

**注力点**: ファイル一覧ではなく、意思決定を導くパターンに集中する。

---

## 同期フロー

1. 既存 docs をすべて読み込む（`docs/spec.md` / `docs/spec/*.md` / `docs/architecture.md`）
2. コードベースの変更を分析する（JIT）
3. ドリフトを検出する:
   - **Docs → Code**: 欠落要素 → 警告
   - **Code → Docs**: 新しいパターン → 更新候補
   - `manifest.template.json` や `com.hrk-m.kot-punch.sdPlugin/imgs/` にある button/icon/state 情報が `docs/spec/*.md` の `## ボタン・アイコン一覧` に反映されていない場合は更新対象として扱う
4. 更新案を提示する（加筆中心、ユーザー記述を保持）
5. **spec.md の分割提案**（下記ルールに従う）
6. 変更点・警告・推奨事項を報告する

**更新方針**: 置換ではなく追加。ユーザーセクションを保持する。

### spec.md 分割フロー（同期モード限定）

機能単位でグルーピングし、グループごとに `AskUserQuestion` で確認する。

**グルーピング基準**:
- コードベースの役割・実装箇所（ファイル・モジュール）が同じ機能 → 1ファイルにまとめる
- 役割・実装箇所が異なる機能 → 別ファイルに分ける

**スキップ条件**:
- すでに `spec/*.md` へのリンクのみのセクション
- 「## 機能詳細」などリンクインデックス自体のセクション

**承認時の処理**:
1. グループ名を英小文字 kebab-case に正規化しファイル名を決定（例: 出勤・退勤打刻グループ → `punch.md`）
2. `.claude/commands/template/spec-feature.md` をテンプレートとして読み込み、対象セクションの内容をテンプレートの各セクションに当てはめながら `docs/spec/{feature-name}.md` を書き出す
   - テンプレートの必須セクション（概要 / 前提条件 / 入出力 / 主フロー / 異常系 / ボタン・アイコン一覧）は必ず埋める
   - テンプレートの推奨セクション（状態遷移 / 制約 / エッジケース / 依存関係）はコードから読み取れる範囲で埋め、情報がない場合は該当セクションを省略する
   - `ボタン・アイコン一覧` には少なくとも「ユーザーが押すボタン」「対応する action/state」「表示 icon のパス」「その状態の役割」を書く
   - icon/state の根拠は `manifest.template.json` の `Actions[].States[].Image`、`Tooltip`、関連する `com.hrk-m.kot-punch.sdPlugin/imgs/` を優先して拾う
   - 単一 state の action でも 1 行以上記載し、`showErrorImage()` など共通 error 表示がある場合は error icon 行も追加する
   - `{プレースホルダー}` はすべて実際の内容に置き換える
3. `docs/spec.md` の該当セクション本文を削除し、リンクに差し替える:
   ```markdown
   ## 打刻ボタン

   [打刻ボタン](./spec/punch.md)
   ```
4. `docs/spec.md` の「## 機能詳細」リンクセクションに追記する

**禁止事項**: 却下・未回答のセクションを分割しない。

---

## 粒度の原則

網羅的な一覧ではなく、パターンと原則を記述する。

- **悪い例**: ディレクトリツリーの全ファイルを列挙する
- **良い例**: 具体例つきで構成パターンを説明する

</instructions>

## ツール案内

- `Glob` / `Grep` / `Read`: コードベース探索
- `Write` / `Edit`: docs ファイルの生成・更新
- `AskUserQuestion`: 不整合・要件の不明点確認、spec 分割の承認確認
  - 選択肢のどれも該当しない場合、ユーザーは自動的に表示される **"Other"** を選んで自由テキストを入力できる
  - `options` に "Other" を手動追加する必要はない（ツールが自動付与する）
  - ユーザーが "Other" を選択した場合は、入力内容を要件に反映してから次フェーズへ進む

## 出力形式

チャットサマリーのみ（ファイルは直接更新）。

**初期生成**:
```
✅ Docs 作成完了
- docs/spec.md: [全体サマリー]
- docs/architecture.md: [ディレクトリアーキテクチャ]
信頼できる一次情報としてレビュー・承認してください。
```

**同期**:
```
✅ Docs 更新完了
- 変更点: [更新内容]
- コードドリフト: [警告があれば]
- 分割提案: [承認・却下の結果]
```

## 安全性とフォールバック

- キー・パスワード・シークレットは絶対に含めない
- 不確実な場合は `AskUserQuestion` で確認する
- 迷ったら置換ではなく追加する

## 補足

- エージェント固有ディレクトリ（`.cursor/`, `.gemini/`, `.claude/` 等）は docs に記述しない
- `settings/` の内容は docs に記述しない（メタデータであり、プロジェクト知識ではない）

## Property Inspector 変更時の追記事項

- `com.hrk-m.kot-punch.sdPlugin/ui/` の差分で設定項目を削除した場合は、削除した UI を明示して報告する
- UI 差分のみで検証コマンドを実行しない場合は「ビルドへの影響なしのため未実施」と明記する
- Property Inspector 反映には Stream Deck の再起動が必要なため、再起動後に変更が見えることを案内する
