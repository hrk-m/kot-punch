---
description: Create atomic, logically grouped git commits from current changes
allowed-tools: Bash, Read
argument-hint: (no-args)
---

# Atomic Git Commit

<background_information>

- **Mission**: Transform current uncommitted changes into atomic, reviewable git commits
- **Success Criteria**:
  - Changes are grouped by concern and feature boundaries
  - Each commit is independently reversible and logically complete
  - Commit messages follow Conventional Commits format, and the subject/body are written in Japanese
  - Commits are created without a confirmation prompt

</background_information>

<instructions>
## Core Task
Analyze the working tree, propose an atomic commit plan, and execute commits without user confirmation.

## Execution Steps
### 1. Context Gathering
Run the following commands sequentially:

1. `git status` - Identify changed, added, deleted files
2. `git diff` - Review detailed changes
3. `git log --oneline -5` - Understand recent commit style

Parse outputs to build a clear mental model of the changes and their intent.

### 2. Logical Grouping Analysis
Categorize changes into distinct logical groups based on:

- **Concern Separation**: UI, business logic, database schema, configuration, tests, documentation
- **Feature Boundaries**: Different features or bug fixes must be separate
- **Dependency Order**: Dependent changes stay together and are committed in order
- **Atomicity**: Each commit is a complete, deployable unit
- **Rollbackability**: Favor smaller units so each commit can be reverted safely on its own

For rollback-friendly granularity, apply these rules:

- One commit = one intent (single behavior change or single non-functional concern)
- Split refactor-only edits from behavior changes
- Split large changes by vertical slice (e.g., API, UI, tests) when independent
- Prefer more commits when uncertain; avoid "big bang" commits
- Target size guideline: about 3-8 files or up to ~200 changed lines per commit
- If a commit exceeds the guideline, split it before committing

### 3. Commit Message Generation
For each group, generate a Conventional Commits message with an optional comment body.
Use `type` and `scope` as stable identifiers, and write the subject/body in Japanese:

```
<type>(<scope>): <subject>

<body>
```

**Type (required):**
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code restructuring without behavior change
- `style`: Formatting, whitespace (no code change)
- `test`: Adding or modifying tests
- `docs`: Documentation only
- `chore`: Build process, tooling, dependencies
- `perf`: Performance improvement

**Scope (required):** Specific area affected (e.g., `ui`, `auth`, `db`, `api`, `user-profile`)

**Subject (required):**
- Write in Japanese
- Use concise, direct phrasing
- No period at the end
- Aim for about 50 characters or fewer
- Clear and specific
- Include the reason whenever possible
- Recommended pattern: `<reason>のため、<change>`
  - Example: `fix(api): 遅い下流応答でもタイムアウトしないようにする`

**Body comment (recommended):**
- Use bullet points with `-` for multiple changes
- Write in Japanese
- Explain WHAT changed and WHY (not HOW)
- Reference issue numbers if applicable
- Separate from subject with a blank line
- Keep it concise (1-5 lines) and readable in `git log`

Body comment template:

```
- 理由: <なぜこの変更が必要か>
- 変更: <何を変更したか>
- 影響: <影響範囲・リスク・互換性>
```

### 4. Execution Proposal
Present the commit plan in this exact format:

```
## 提案されたコミット戦略

以下の論理グループに分割して、X個のアトミックコミットを作成します:

### コミット 1: <type>(<scope>): <subject>
- 対象ファイル: [list files]
- 変更内容: [brief description]
```
メッセージ全文:
```
<full commit message>
```

[Repeat for each commit]

---

**重要**: 各コミットは独立してロールバック可能な単位です。
**重要**: 各コミットには必要に応じて本文コメント（理由）を付けます。

この戦略でコミットを実行します。
```

### 5. Execution (No Confirmation)
1. Stage files for each commit using `git add <files>`
2. Execute commits with subject + optional body comment
   - Subject only:
     - `git commit -m "<type>(<scope>): <subject>"`
   - With comment body:
     - `git commit -m "<type>(<scope>): <subject>" -m "<body comment>"`
   - Multi-line body is allowed; preserve readability
   - Subject/body comment must be written in Japanese
3. Report success with commit hashes

## Important Constraints
- NEVER mix unrelated concerns in a single commit
- NEVER combine refactoring with feature additions
- NEVER mix tests with implementation unless tests cover that implementation
- NEVER group UI and database changes unless intrinsically coupled
- When in doubt, create more commits rather than fewer

</instructions>

## Tool Guidance
- Use **Bash** for `git status`, `git diff`, `git log`, `git add`, and `git commit`
- Use **Read** only when inspecting file contents for grouping context

## Output Description
All analysis and proposals must be in Japanese, and commit messages must also be written in Japanese.
Keep the Conventional Commits structure, but write the human-readable subject/body in Japanese.

Always provide:
1. Rationale for each grouping decision
2. Complete commit messages in code blocks
3. File lists for each proposed commit
4. Body comment text when included
5. No confirmation request before execution

**Format Requirements**:
- Use Markdown headings (##, ###)
- Keep output concise and easy to scan
- Avoid large code dumps

## Safety & Fallback
- **No changes detected**: Inform user and exit gracefully
- **Only whitespace changes**: Suggest `style` commit or ask if intentional
- **Merge conflicts present**: Stop and request resolution
- **Large binary files**: Warn about repo bloat and suggest alternatives
- **Sensitive data detected**: STOP and alert user immediately; never commit secrets
