/**
 * トピック別インデックス管理の実例
 * プロジェクト管理のユースケース
 */

import { createLarkWikiMCPAgent } from '../src/agents/lark-wiki-mcp-agent';
import WikiIndexManager, { Topic, IndexPage } from '../src/wiki-index-manager';
import * as dotenv from 'dotenv';

dotenv.config();

// 設定
const config = {
  appId: process.env.LARK_APP_ID || 'cli_a8d2fdb1f1f8d02d',
  appSecret: process.env.LARK_APP_SECRET || '',
  spaceId: '7520526284150013985',  // Required for agent initialization
  rootNodeToken: 'JqgNwZybNildpqkvLnGje92Hp0c',  // Required for agent initialization
  
  // メインのインデックスを配置するWiki空間
  mainSpaceId: '7520526284150013985',
  mainRootToken: 'JqgNwZybNildpqkvLnGje92Hp0c',
  
  // 検索対象のWiki空間（複数可）
  searchSpaces: [
    '7520526284150013985',  // ホームページ
    // '7324483648537755682',  // 他のWiki空間があれば追加
  ]
};

// トピック定義
const topics: Topic[] = [
  {
    id: 'project-planning',
    name: 'プロジェクト計画',
    keywords: ['計画', '企画', 'planning', 'proposal', '提案'],
    includePatterns: [
      /計画書/i,
      /プロジェクト.*企画/i,
      /^.*proposal.*$/i
    ],
    excludePatterns: [
      /廃止/i,
      /obsolete/i,
      /archived/i
    ],
    priority: 1
  },
  {
    id: 'technical-docs',
    name: '技術文書',
    keywords: ['技術', 'API', 'システム', 'architecture', '設計'],
    includePatterns: [
      /API.*仕様/i,
      /システム.*設計/i,
      /technical.*specification/i
    ],
    priority: 2
  },
  {
    id: 'meeting-notes',
    name: '会議記録',
    keywords: ['会議', 'ミーティング', 'meeting', '議事録'],
    includePatterns: [
      /議事録/i,
      /meeting.*notes/i,
      /打ち合わせ/i
    ],
    excludePatterns: [
      /下書き/i,
      /draft/i
    ],
    priority: 3
  },
  {
    id: 'progress-reports',
    name: '進捗報告',
    keywords: ['進捗', '報告', 'progress', 'status', 'report'],
    includePatterns: [
      /進捗.*報告/i,
      /status.*report/i,
      /週報/i,
      /月報/i
    ],
    priority: 2
  },
  {
    id: 'issues-risks',
    name: '課題・リスク',
    keywords: ['課題', 'リスク', 'issue', 'risk', 'problem', '問題'],
    includePatterns: [
      /課題.*管理/i,
      /リスク.*一覧/i,
      /issue.*tracking/i
    ],
    priority: 1
  }
];

async function main() {
  console.log('🚀 トピック別インデックス管理システム\n');
  console.log('================================\n');
  
  // エージェントの初期化
  const agent = createLarkWikiMCPAgent(config);
  await agent.initialize();
  console.log('✅ エージェント初期化完了\n');
  
  // インデックスマネージャーの作成
  const indexManager = new WikiIndexManager(agent);
  
  try {
    // ステップ1: Wiki空間の登録
    console.log('📚 ステップ1: Wiki空間の登録\n');
    for (const spaceId of config.searchSpaces) {
      await indexManager.registerWiki(spaceId);
    }
    
    // ステップ2: インデックスページの作成または取得
    console.log('\n📑 ステップ2: インデックスページの準備\n');
    
    // プロジェクト管理インデックス
    const projectIndexToken = await createOrGetIndexPage(agent, {
      parentToken: config.mainRootToken,
      title: '📊 プロジェクト管理インデックス',
      spaceId: config.mainSpaceId
    });
    
    // 技術文書インデックス
    const techIndexToken = await createOrGetIndexPage(agent, {
      parentToken: config.mainRootToken,
      title: '🔧 技術文書インデックス',
      spaceId: config.mainSpaceId
    });
    
    // 会議・報告インデックス
    const meetingIndexToken = await createOrGetIndexPage(agent, {
      parentToken: config.mainRootToken,
      title: '📝 会議・報告インデックス',
      spaceId: config.mainSpaceId
    });
    
    // ステップ3: インデックスページの登録
    console.log('\n📋 ステップ3: インデックスページの登録\n');
    
    // プロジェクト管理インデックス（計画、課題・リスク）
    await indexManager.registerIndexPage({
      nodeToken: projectIndexToken,
      spaceId: config.mainSpaceId,
      title: 'プロジェクト管理インデックス',
      topics: topics.filter(t => 
        ['project-planning', 'issues-risks'].includes(t.id)
      ),
      autoUpdate: true
    });
    
    // 技術文書インデックス
    await indexManager.registerIndexPage({
      nodeToken: techIndexToken,
      spaceId: config.mainSpaceId,
      title: '技術文書インデックス',
      topics: topics.filter(t => t.id === 'technical-docs'),
      autoUpdate: true
    });
    
    // 会議・報告インデックス
    await indexManager.registerIndexPage({
      nodeToken: meetingIndexToken,
      spaceId: config.mainSpaceId,
      title: '会議・報告インデックス',
      topics: topics.filter(t => 
        ['meeting-notes', 'progress-reports'].includes(t.id)
      ),
      autoUpdate: true
    });
    
    // ステップ4: インデックスの更新
    console.log('\n🔄 ステップ4: インデックスページの自動更新\n');
    await indexManager.updateAllIndexPages();
    
    // ステップ5: 統計情報の表示
    console.log('\n📊 ステップ5: 統計情報\n');
    const stats = indexManager.getStatistics();
    
    console.log('================================');
    console.log('📈 インデックス作成結果:');
    console.log(`  Wiki空間数: ${stats.totalWikis}`);
    console.log(`  インデックスページ数: ${stats.totalIndexPages}`);
    console.log(`  作成されたショートカット総数: ${stats.totalShortcuts}`);
    console.log('\n  トピック別ショートカット数:');
    
    for (const [topicId, count] of stats.shortcutsByTopic) {
      const topic = topics.find(t => t.id === topicId);
      console.log(`    ${topic?.name || topicId}: ${count}件`);
    }
    
    if (stats.duplicatePages.length > 0) {
      console.log(`\n  複数インデックスに登録されたページ: ${stats.duplicatePages.length}件`);
    }
    
    console.log('================================\n');
    
    // ステップ6: 特定ドキュメントを複数インデックスに追加する例
    console.log('💡 追加機能デモ: 重要文書を複数インデックスに追加\n');
    
    // 重要な文書があれば、複数のインデックスに追加
    // await indexManager.addToMultipleIndexes(
    //   'important_doc_token',
    //   config.mainSpaceId,
    //   [projectIndexToken, techIndexToken]
    // );
    
    console.log('✅ 全ての処理が完了しました！\n');
    console.log('📌 作成されたインデックスページ:');
    console.log(`  1. プロジェクト管理インデックス`);
    console.log(`  2. 技術文書インデックス`);
    console.log(`  3. 会議・報告インデックス`);
    console.log('\nこれらのページにアクセスして、整理されたショートカットを確認してください。');
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
  } finally {
    await agent.close();
  }
}

/**
 * インデックスページを作成または取得
 */
async function createOrGetIndexPage(
  agent: any,
  options: { parentToken: string; title: string; spaceId: string }
): Promise<string> {
  try {
    // 既存の子ノードをチェック
    const nodes = await agent.executeC2_NodeManagement('LIST_NODES', {
      parent_node_token: options.parentToken,
      page_size: 100
    });
    
    // 同名のページが存在するか確認
    const existing = (nodes.items || []).find(
      (node: any) => node.title === options.title
    );
    
    if (existing) {
      console.log(`  ✅ 既存のインデックスページを使用: ${options.title}`);
      return existing.node_token;
    }
    
    // 新規作成
    console.log(`  📝 新規インデックスページを作成: ${options.title}`);
    const newNode = await agent.executeC2_NodeManagement('CREATE_NODE', {
      parent_node_token: options.parentToken,
      title: options.title,
      obj_type: 'docx',
      node_type: 'origin'
    });
    
    return newNode.node_token;
  } catch (error) {
    console.error(`インデックスページの作成/取得に失敗: ${options.title}`, error);
    throw error;
  }
}

// メイン処理を実行
if (require.main === module) {
  main().catch(console.error);
}