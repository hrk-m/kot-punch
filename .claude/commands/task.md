# /task — モックベース開発タスク生成コマンド

<background_information>

- **Mission**: PRD を実装可能なタスクへ分解し、実データ接続前にモックで動く縦切りを完成させる
- **Success Criteria**:
  - `docs/tasks/{タスク名}/tasks.md` が生成または更新される
  - タスクは **3フェーズ**（影響調査 → 空モック成立 → 重要処理の穴埋め）で構成される
  - フェーズ2で「全体が空のモック状態でも動作する」ことが明示される
  - フェーズ3で重要度順の穴埋め計画が明示される
  - 各フェーズにチェックポイントがある

</background_information>

<instructions>
## Core Task
`$ARGUMENTS` からタスク名を特定し、`docs/tasks/{タスク名}/prd.md` を元に
**モックベース開発用の実装タスク**を `docs/tasks/{タスク名}/tasks.md` に生成する。

### Task Name Input Rules

- `$ARGUMENTS` は `/planning` で確定したタスク名を受け取る（例: `countup-triple-multiplier`）
- 自然文が入力された場合は推測で進めず、`docs/tasks/{タスク名}/prd.md` の存在確認を優先する
- 対象 PRD が特定できない場合は `AskUserQuestion` でタスク名を確認する

## Mock First 原則

1. **Contract First**: 先に型・レスポンス形状・エラー形状を固定する
2. **Mock First**: API/DB 接続前にモックで画面と操作を成立させる
3. **Vertical Slice First**: 最初の 1 画面を end-to-end で完成させる
4. **Integration Later**: 実データ統合は別タスクとして明示的に切り出す

## ボタン設定確認（Required）

- `docs/tasks/{タスク名}/prd.md` を読む際は、**ボタン設定**（例: ボタン種別、活性/非活性条件、クリック時アクション）に関する記述を優先して確認する
- 既存 `docs/tasks/{タスク名}/tasks.md` と比較して、ボタン設定由来の変更点が見つかった場合は、反映前に `AskUserQuestion` で確認を取る
- `AskUserQuestion` の回答が空または未選択なら、推測で反映せず質問を再提示する

## 共通化方針確認（Required）

- 新規実装・改修対象を洗い出す際、既存コードで共通化できる候補（重複ロジック、共通 UI、ユーティリティ）を確認する
- 共通化候補がある場合は、`AskUserQuestion` で「今回のタスクで処理をまとめるか（実施/見送り）」を確認する
- `AskUserQuestion` の回答が空または未選択なら、推測で反映せず質問を再提示する

## Phase 2 モック範囲確認（Required）

- Phase 2 のタスク化前に、`AskUserQuestion` で「どこまでモック画面を作るか（対象画面/操作フロー/異常系）」を確認する
- 回答内容を Phase 2 の小タスクへ反映し、範囲外は `**INTEGRATION-LATER**` へ分離する
- `AskUserQuestion` の回答が空または未選択なら、推測で反映せず質問を再提示する

## 生成するタスク構造（必須順序: 3フェーズ）

1. Phase 1: Impact and Change Analysis
2. Phase 2: Mock Empty-State Baseline
3. Phase 3: Progressive Fill-In from Critical Paths

### フェーズ細分化ルール（Required）

- 各フェーズは必要に応じて `1.1` / `1.2` のような小タスクへ分割できる
- 小タスクの採番は `Phase X.Y` 形式で、親フェーズ配下に配置する
- 細分化してもフェーズの順序（1 → 2 → 3）は固定する
- フェーズ間をまたぐ依存は作らず、依存がある場合は後続フェーズへ移す

### タスクテンプレート

```markdown
## Phase 1: Impact and Change Analysis
### Phase 1.1: 関連実装を調査する
- [ ] 関連ディレクトリと既存実装パターンを読む
- [ ]* （任意）全体コードを俯瞰する（初期フェーズではチェックを付けない）

### Phase 1.2: 変更候補を特定する
- [ ] 影響/改修がありそうなファイルを列挙し、変更理由を 1 行で記載する
- [ ] 再利用可能コンポーネント・ユーティリティを列挙する
- [ ] 共通化候補がある場合は `AskUserQuestion` で統合方針（実施/見送り）を確認する
- [ ] **CHECKPOINT**: 変更対象ファイルと影響範囲が明確

## Phase 2: Mock Empty-State Baseline
### Phase 2.1: モック契約を固定する
- [ ] `AskUserQuestion` でモック画面の作成範囲（対象画面/操作フロー/異常系）を確認する
- [ ] `**MOCK-CONTRACT**` で API/Store の入出力型とレスポンス shape（正常/空/異常）を定義する

### Phase 2.2: 空モックで全体を成立させる
- [ ] `**MOCK-IMPL**` でモック provider/adapter とモックデータ生成ロジックを実装する
- [ ] 実装切替フラグ（mock/real）を追加する
- [ ] 全体が空データの状態でも画面表示と主要操作が成立するようにする
- [ ] loading/empty/error の表示を確認する
- [ ] **CHECKPOINT**: 実データなし + 空モックで end-to-end 実行可能

## Phase 3: Progressive Fill-In from Critical Paths
### Phase 3.1: 穴埋め対象を優先度付けする
- [ ] Phase 2 で作成したモック実装箇所を洗い出す
- [ ] 重要度（業務価値/失敗影響/利用頻度）で優先順位を付ける

### Phase 3.2: 重要処理から穴埋めする
- [ ] 優先度上位から処理を穴埋めする（分岐・バリデーション・状態遷移）
- [ ] ユースケースごとに `操作前提 / 操作 / 期待結果` とテスト観点を追加する
- [ ] `**INTEGRATION-LATER**` で実データ統合の後続作業を分離する
- [ ] **CHECKPOINT**: 主要ユースケースがモックで再現可能
```

## 実行手順

### Step 1: Context Load

- `docs/tasks/{タスク名}/prd.md`（必須）
- `docs/architecture.md`（必須）
- `docs/prd/index.md`（参照）
- `docs/tasks/{タスク名}/tasks.md`（既存があればマージ）

### Step 2: Task Generation Rules

- PRD のユーザーストーリーと受け入れ条件を、上記 3 フェーズへ配賦する
- フェーズ1では「どのファイルを改修するか」を必ず明記する
- ボタン設定に関する変更点は Phase 1 で明示し、影響ファイルと変更理由をセットで記載する
- フェーズ1で共通化候補を確認し、候補がある場合は `AskUserQuestion` で統合方針（実施/見送り）を確認する
- フェーズ1に「全体コードを俯瞰する」項目を置く場合は `- [ ]*` とし、初期フェーズの完了判定に含めない（未チェックのままにする）
- フェーズ2では「全体が空のモック状態で動作すること」を最優先にする
- フェーズ2の小タスク確定前に `AskUserQuestion` でモック画面の範囲を確認し、回答をタスクへ反映する
- フェーズ3では PRD から抽出した主要ユースケースを `操作前提 / 操作 / 期待結果` で追跡可能にする
- 実データ統合をフェーズ2-3の本体作業に混在させない
- 各タスクに成果物（対象ファイル or テスト観点）を最低 1 つ書く
- タスク階層は `Phase -> Phase X.Y -> checklist` を上限とする

### Step 3: Markers

- `**MOCK-CONTRACT**`: 型・インターフェース・レスポンス契約
- `**MOCK-IMPL**`: モックデータ/モック実装本体
- `**INTEGRATION-LATER**`: 実データ統合の後続作業
- `(P)`: 並列実行可能
- `- [ ]*`: 任意（MVP 後回し可）

### Step 4: Finalize

- `docs/tasks/{タスク名}/tasks.md` を作成または更新
- 既存項目がある場合は置換でなく追記・統合を優先

## Important Constraints

- PRD 未確定ならタスク生成を開始しない
- フェーズ1の影響範囲特定なしにフェーズ2へ進まない
- フェーズ2（空モック成立）なしにフェーズ3へ進まない
- モック実装と実データ統合を同時に計画しない
- 初期フェーズでは「全体コード確認」タスクを完了チェック（`[x]`）にしない
- タスク名は実行可能な動詞で始める（例: 作成する/実装する/検証する）
- 曖昧語（適宜、いい感じに、など）を使わない

</instructions>

## Tool Guidance

- `Glob`: `docs/tasks/{タスク名}/` の存在確認
- `Read`: `prd.md` / `architecture.md` / 既存 `tasks.md` の読み込み
- `AskUserQuestion`: 要件の不明点確認、ボタン設定変更、共通化方針、Phase 2 モック範囲の確認に使う
- `Write`: `docs/tasks/{タスク名}/tasks.md` の更新

## Output Description

ユーザー入力と同じ言語で、以下を返す:

1. **Status**: `docs/tasks/{タスク名}/tasks.md` の生成/更新結果
2. **Phase Summary**:
   - Phase 1: Impact and Change Analysis
   - Phase 2: Mock Empty-State Baseline
   - Phase 3: Progressive Fill-In from Critical Paths
3. **Markers Count**: `MOCK-CONTRACT` / `MOCK-IMPL` / `INTEGRATION-LATER`
4. **Next Step**: `/task {タスク名}` で継続更新 または 実装開始

## Safety & Fallback

- **Task Name Missing**: `$ARGUMENTS` が空ならタスク名を確認する
- **Ambiguous Requirement**: ユースケース解像度が不足している場合は AskUserQuestion で補完する
- **Button Config Changed**: ボタン設定に関する差分がある場合は AskUserQuestion で反映可否の確認が取れるまで `tasks.md` へ確定反映しない
- **Shared Logic Candidate Found**: 共通化候補がある場合は AskUserQuestion で統合方針が確定するまで `tasks.md` へ確定反映しない
- **Phase2 Scope Unconfirmed**: モック画面の作成範囲が未確定なら、AskUserQuestion で確認が取れるまで Phase 2 の確定タスクを書かない
- **Empty Answer**: AskUserQuestion の回答が空または未選択の場合、推測で進めず質問を再提示する
- **PRD Missing**: `docs/tasks/{タスク名}/prd.md` がなければ `/planning {タスク名}` を先に案内する
- **Architecture Missing**: `docs/architecture.md` がなければ `/steering` 実行を案内する
- **Write Failure**: 失敗したパスと原因候補（権限/パス誤り/ディスク容量）を提示する
