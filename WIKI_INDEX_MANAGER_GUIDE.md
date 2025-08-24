# Wiki Index Manager ユーザーガイド

## 概要

Wiki Index Managerは、Lark/Feishu Wikiの情報を自動的に収集・整理し、トピック別のインデックスページを作成するシステムです。複数のWiki空間を横断検索し、関連するドキュメントへのショートカットを自動的に作成します。

### 主な特徴

- 🔍 **複数Wiki横断検索**: 複数のWiki空間を同時に検索
- 🏷️ **トピック別整理**: キーワードとパターンマッチングで自動分類
- 🔗 **ショートカット作成**: 元のドキュメントを移動せずにリンクを作成
- 📑 **複数インデックス対応**: 同じドキュメントを複数のインデックスに登録可能
- 🤖 **自動更新**: 定期的にインデックスを更新

## インストール

```bash
# リポジトリのクローン
git clone https://github.com/your-username/lark-wiki-mcp-agents.git
cd lark-wiki-mcp-agents

# 依存関係のインストール
npm install

# ビルド
npm run build
```

## 環境設定

### 1. Lark API認証情報の設定

`.env`ファイルを作成し、Lark APIの認証情報を設定します：

```env
LARK_APP_ID=cli_xxxxxxxxxxxx
LARK_APP_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 2. Wiki設定ファイルの初期化

```bash
npm run wiki-index init
```

これにより`wiki-index-config.json`が作成されます。

## 設定ファイルの構成

### wiki-index-config.json

```json
{
  "wikis": [
    {
      "spaceId": "7520526284150013985",
      "name": "メインWiki",
      "searchEnabled": true
    }
  ],
  "indexes": [
    {
      "nodeToken": "project_index_token",
      "spaceId": "7520526284150013985",
      "title": "📊 プロジェクト管理インデックス",
      "topics": ["project-planning", "issues-risks"],
      "autoUpdate": true
    }
  ],
  "topics": {
    "project-planning": {
      "id": "project-planning",
      "name": "プロジェクト計画",
      "keywords": ["計画", "企画", "planning"],
      "priority": 1
    }
  }
}
```

### 設定項目の説明

#### wikis
検索対象となるWiki空間のリスト
- `spaceId`: Wiki空間のID
- `name`: 表示名（任意）
- `searchEnabled`: 検索を有効にするか

#### indexes
インデックスページの定義
- `nodeToken`: インデックスページのノードトークン
- `spaceId`: インデックスページが属するWiki空間
- `title`: インデックスページのタイトル
- `topics`: このインデックスに含めるトピックIDのリスト
- `autoUpdate`: 自動更新を有効にするか

#### topics
トピックの定義
- `id`: トピックの一意識別子
- `name`: トピックの表示名
- `keywords`: 検索キーワードのリスト
- `includePatterns`: 含めるパターン（正規表現、オプション）
- `excludePatterns`: 除外するパターン（正規表現、オプション）
- `priority`: 優先度（1が最高）

## CLIコマンド

### 基本コマンド

```bash
# ヘルプを表示
npm run wiki-index -- --help

# 設定を初期化
npm run wiki-index init

# 現在の設定を表示
npm run wiki-index list
```

### Wiki空間の管理

```bash
# Wiki空間を追加
npm run wiki-index add-wiki 7520526284150013985 --name "メインWiki"

# 複数のWiki空間を追加
npm run wiki-index add-wiki 7324483648537755682 --name "プロジェクトWiki"
```

### トピックの管理

```bash
# トピックを追加
npm run wiki-index add-topic "project-planning" "プロジェクト計画" \
  --keywords "計画,企画,planning,proposal"

npm run wiki-index add-topic "technical-docs" "技術文書" \
  --keywords "技術,API,システム,設計"

npm run wiki-index add-topic "meeting-notes" "会議記録" \
  --keywords "会議,ミーティング,議事録"
```

### インデックスページの管理

```bash
# インデックスページを追加
npm run wiki-index add-index "JqgNwZybNildpqkvLnGje92Hp0c" \
  --space 7520526284150013985 \
  --title "📊 プロジェクト管理インデックス" \
  --topics "project-planning,issues-risks"

npm run wiki-index add-index "tech_index_token" \
  --space 7520526284150013985 \
  --title "🔧 技術文書インデックス" \
  --topics "technical-docs,api-docs"
```

### インデックスの更新

```bash
# 全インデックスを更新
npm run wiki-index update

# 特定のインデックスのみ更新
npm run wiki-index update --index "JqgNwZybNildpqkvLnGje92Hp0c"
```

### 検索テスト

```bash
# キーワードで検索テスト
npm run wiki-index search "プロジェクト"

# 特定のWiki空間で検索
npm run wiki-index search "技術" --space 7520526284150013985
```

## 使用例

### 1. プロジェクト管理インデックスの作成

```bash
# Step 1: トピックを定義
npm run wiki-index add-topic "project-planning" "プロジェクト計画" \
  --keywords "計画,企画,planning,proposal,提案"

npm run wiki-index add-topic "issues-risks" "課題・リスク" \
  --keywords "課題,リスク,issue,risk,problem"

# Step 2: インデックスページをWikiに作成（手動）
# Lark Wikiで新しいページを作成し、そのnode_tokenを取得

# Step 3: インデックスを登録
npm run wiki-index add-index "your_index_node_token" \
  --title "プロジェクト管理インデックス" \
  --topics "project-planning,issues-risks"

# Step 4: インデックスを更新（ショートカット作成）
npm run wiki-index update
```

### 2. プログラムからの使用

```typescript
import { createLarkWikiMCPAgent } from './agents/lark-wiki-mcp-agent';
import WikiIndexManager from './wiki-index-manager';

async function main() {
  // エージェントの初期化
  const agent = createLarkWikiMCPAgent({
    appId: process.env.LARK_APP_ID!,
    appSecret: process.env.LARK_APP_SECRET!,
    spaceId: '7520526284150013985',
    rootNodeToken: 'JqgNwZybNildpqkvLnGje92Hp0c'
  });
  
  await agent.initialize();
  
  // インデックスマネージャーの作成
  const manager = new WikiIndexManager(agent);
  
  // Wiki空間の登録
  await manager.registerWiki('7520526284150013985');
  
  // インデックスページの登録
  await manager.registerIndexPage({
    nodeToken: 'index_page_token',
    spaceId: '7520526284150013985',
    title: 'インデックスページ',
    topics: [
      {
        id: 'test',
        name: 'テスト',
        keywords: ['test', 'テスト']
      }
    ],
    autoUpdate: true
  });
  
  // インデックスの更新
  await manager.updateIndexPage('index_page_token');
  
  // 統計情報の取得
  const stats = manager.getStatistics();
  console.log(`作成されたショートカット: ${stats.totalShortcuts}`);
  
  await agent.close();
}
```

## トラブルシューティング

### 権限エラー (131006)

```
permission denied: wiki space permission denied
```

**解決方法**:
1. Lark Open Platformでアプリの権限を確認
2. 必要な権限を追加:
   - `wiki:wiki` - Wiki操作
   - `wiki:wiki:readonly` - Wiki読み取り
   - `drive:drive` - ドライブ操作
3. テナント管理者の承認を受ける

### タイムアウトエラー

MCPサーバーへの接続がタイムアウトする場合：

1. MCPサーバーが正しくインストールされているか確認
2. 環境変数が正しく設定されているか確認
3. ネットワーク接続を確認

### ショートカットが作成されない

1. インデックスページのnode_tokenが正しいか確認
2. 対象Wiki空間への書き込み権限があるか確認
3. キーワードが実際のドキュメントとマッチしているか確認

## 高度な使用方法

### カスタムフィルタリング

トピック定義でパターンマッチングを使用：

```javascript
{
  "technical-docs": {
    "id": "technical-docs",
    "name": "技術文書",
    "keywords": ["技術", "API"],
    "includePatterns": [
      "API.*仕様",
      "システム.*設計"
    ],
    "excludePatterns": [
      "廃止",
      "obsolete",
      "archived"
    ]
  }
}
```

### バッチ処理

複数のインデックスを一括更新：

```bash
# 設定ファイルに基づいて全てのインデックスを更新
npm run wiki-index update

# crontabで定期実行
0 */6 * * * cd /path/to/project && npm run wiki-index update
```

### 複数インデックスへの登録

同じドキュメントを複数のインデックスに登録：

```typescript
await manager.addToMultipleIndexes(
  'document_node_token',
  'space_id',
  ['index1_token', 'index2_token']
);
```

## API リファレンス

### WikiIndexManager

主要なメソッド：

- `registerWiki(spaceId, searchEnabled)`: Wiki空間を登録
- `registerIndexPage(config)`: インデックスページを登録
- `collectTopicPages(topic)`: トピックに関連するページを収集
- `createShortcut(indexToken, targetToken, spaceId)`: ショートカットを作成
- `updateIndexPage(indexToken)`: インデックスページを更新
- `updateAllIndexPages()`: 全インデックスページを更新
- `getStatistics()`: 統計情報を取得

## ベストプラクティス

1. **段階的な実装**: まず小規模なトピックから始める
2. **キーワードの調整**: 実際の検索結果を見ながらキーワードを調整
3. **定期更新**: cronジョブで定期的にインデックスを更新
4. **権限管理**: インデックスページの権限を適切に設定
5. **バックアップ**: 設定ファイルを定期的にバックアップ

## サポート

問題が発生した場合は、以下を確認してください：

1. `.env`ファイルの設定
2. `wiki-index-config.json`の設定
3. Lark APIの権限設定
4. ネットワーク接続

それでも解決しない場合は、GitHubでissueを作成してください。