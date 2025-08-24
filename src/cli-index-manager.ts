#!/usr/bin/env node

/**
 * Wiki Index Manager CLI
 * コマンドラインからWikiインデックスを管理
 */

import { program } from 'commander';
import { createLarkWikiMCPAgent } from './agents/lark-wiki-mcp-agent';
import WikiIndexManager, { Topic } from './wiki-index-manager';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

// 設定ファイルのパス
const CONFIG_FILE = path.join(process.cwd(), 'wiki-index-config.json');

// 設定の型定義
interface IndexConfig {
  wikis: Array<{
    spaceId: string;
    name?: string;
    searchEnabled?: boolean;
  }>;
  indexes: Array<{
    nodeToken: string;
    spaceId: string;
    title: string;
    topics: string[];
    autoUpdate?: boolean;
  }>;
  topics: Record<string, Topic>;
  app?: {
    appId?: string;
    appSecret?: string;
  };
}

// 設定ファイルの読み込み
function loadConfig(): IndexConfig | null {
  if (fs.existsSync(CONFIG_FILE)) {
    const content = fs.readFileSync(CONFIG_FILE, 'utf-8');
    return JSON.parse(content);
  }
  return null;
}

// 設定ファイルの保存
function saveConfig(config: IndexConfig): void {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

// デフォルト設定の作成
function createDefaultConfig(): IndexConfig {
  return {
    wikis: [
      {
        spaceId: '7520526284150013985',
        name: 'ホームページ',
        searchEnabled: true
      }
    ],
    indexes: [],
    topics: {
      'general': {
        id: 'general',
        name: '一般',
        keywords: ['document', 'ドキュメント']
      }
    },
    app: {
      appId: process.env.LARK_APP_ID,
      appSecret: process.env.LARK_APP_SECRET
    }
  };
}

// CLIコマンドの設定
program
  .name('wiki-index')
  .description('Lark Wiki Index Manager - トピック別ショートカット管理')
  .version('1.0.0');

// 初期化コマンド
program
  .command('init')
  .description('設定ファイルを初期化')
  .action(() => {
    if (fs.existsSync(CONFIG_FILE)) {
      console.log('⚠️  設定ファイルが既に存在します: wiki-index-config.json');
      return;
    }
    
    const config = createDefaultConfig();
    saveConfig(config);
    console.log('✅ 設定ファイルを作成しました: wiki-index-config.json');
    console.log('📝 ファイルを編集してWiki空間、インデックスページ、トピックを設定してください。');
  });

// Wiki追加コマンド
program
  .command('add-wiki <spaceId>')
  .description('検索対象のWiki空間を追加')
  .option('-n, --name <name>', 'Wiki空間の名前')
  .action((spaceId, options) => {
    const config = loadConfig() || createDefaultConfig();
    
    // 既存チェック
    if (config.wikis.some(w => w.spaceId === spaceId)) {
      console.log('⚠️  このWiki空間は既に登録されています。');
      return;
    }
    
    config.wikis.push({
      spaceId,
      name: options.name || spaceId,
      searchEnabled: true
    });
    
    saveConfig(config);
    console.log(`✅ Wiki空間を追加しました: ${spaceId}`);
  });

// トピック追加コマンド
program
  .command('add-topic <id> <name>')
  .description('検索トピックを追加')
  .option('-k, --keywords <keywords>', 'カンマ区切りのキーワード', '')
  .action((id, name, options) => {
    const config = loadConfig() || createDefaultConfig();
    
    if (config.topics[id]) {
      console.log('⚠️  このトピックIDは既に存在します。');
      return;
    }
    
    const keywords = options.keywords 
      ? options.keywords.split(',').map((k: string) => k.trim())
      : [];
    
    config.topics[id] = {
      id,
      name,
      keywords
    };
    
    saveConfig(config);
    console.log(`✅ トピックを追加しました: ${name} (${keywords.length}個のキーワード)`);
  });

// インデックス追加コマンド
program
  .command('add-index <nodeToken>')
  .description('インデックスページを追加')
  .option('-s, --space <spaceId>', 'Wiki空間ID')
  .option('-t, --title <title>', 'インデックスページのタイトル')
  .option('--topics <topics>', 'カンマ区切りのトピックID')
  .action((nodeToken, options) => {
    const config = loadConfig() || createDefaultConfig();
    
    if (config.indexes.some(i => i.nodeToken === nodeToken)) {
      console.log('⚠️  このインデックスページは既に登録されています。');
      return;
    }
    
    const topicIds = options.topics 
      ? options.topics.split(',').map((t: string) => t.trim())
      : ['general'];
    
    config.indexes.push({
      nodeToken,
      spaceId: options.space || config.wikis[0]?.spaceId || '',
      title: options.title || 'インデックスページ',
      topics: topicIds,
      autoUpdate: true
    });
    
    saveConfig(config);
    console.log(`✅ インデックスページを追加しました: ${options.title || nodeToken}`);
  });

// リスト表示コマンド
program
  .command('list')
  .description('設定内容を表示')
  .action(() => {
    const config = loadConfig();
    
    if (!config) {
      console.log('❌ 設定ファイルが見つかりません。"wiki-index init"で初期化してください。');
      return;
    }
    
    console.log('\n📚 Wiki空間:');
    config.wikis.forEach(wiki => {
      console.log(`  - ${wiki.name || wiki.spaceId} (${wiki.spaceId})`);
    });
    
    console.log('\n🏷️  トピック:');
    Object.values(config.topics).forEach(topic => {
      console.log(`  - ${topic.name} (${topic.id}): ${topic.keywords.join(', ')}`);
    });
    
    console.log('\n📑 インデックスページ:');
    config.indexes.forEach(index => {
      console.log(`  - ${index.title} (${index.nodeToken})`);
      console.log(`    トピック: ${index.topics.join(', ')}`);
    });
  });

// 更新実行コマンド
program
  .command('update')
  .description('全インデックスページを更新')
  .option('--index <nodeToken>', '特定のインデックスのみ更新')
  .action(async (options) => {
    const config = loadConfig();
    
    if (!config) {
      console.log('❌ 設定ファイルが見つかりません。');
      return;
    }
    
    console.log('🚀 インデックス更新を開始します...\n');
    
    // エージェントの初期化
    const agent = createLarkWikiMCPAgent({
      appId: config.app?.appId || process.env.LARK_APP_ID || '',
      appSecret: config.app?.appSecret || process.env.LARK_APP_SECRET || '',
      spaceId: config.wikis[0]?.spaceId || '',
      rootNodeToken: ''
    });
    
    try {
      await agent.initialize();
      const manager = new WikiIndexManager(agent);
      
      // Wiki空間の登録
      for (const wiki of config.wikis) {
        await manager.registerWiki(wiki.spaceId, wiki.searchEnabled);
      }
      
      // インデックスページの登録
      const indexesToUpdate = options.index 
        ? config.indexes.filter(i => i.nodeToken === options.index)
        : config.indexes;
      
      for (const index of indexesToUpdate) {
        const topics = index.topics.map(tid => config.topics[tid]).filter(Boolean);
        
        await manager.registerIndexPage({
          nodeToken: index.nodeToken,
          spaceId: index.spaceId,
          title: index.title,
          topics,
          autoUpdate: index.autoUpdate !== false
        });
      }
      
      // 更新実行
      if (options.index) {
        await manager.updateIndexPage(options.index);
      } else {
        await manager.updateAllIndexPages();
      }
      
      // 統計表示
      const stats = manager.getStatistics();
      console.log('\n✅ 更新完了');
      console.log(`  ショートカット作成数: ${stats.totalShortcuts}`);
      
    } catch (error) {
      console.error('❌ エラー:', error);
    } finally {
      await agent.close();
    }
  });

// 検索テストコマンド
program
  .command('search <keyword>')
  .description('キーワードで検索テスト')
  .option('-s, --space <spaceId>', 'Wiki空間を指定')
  .action(async (keyword, options) => {
    const config = loadConfig();
    
    if (!config) {
      console.log('❌ 設定ファイルが見つかりません。');
      return;
    }
    
    const spaceId = options.space || config.wikis[0]?.spaceId;
    
    if (!spaceId) {
      console.log('❌ Wiki空間が設定されていません。');
      return;
    }
    
    console.log(`🔍 "${keyword}" を検索中...\n`);
    
    const agent = createLarkWikiMCPAgent({
      appId: config.app?.appId || process.env.LARK_APP_ID || '',
      appSecret: config.app?.appSecret || process.env.LARK_APP_SECRET || '',
      spaceId,
      rootNodeToken: ''
    });
    
    try {
      await agent.initialize();
      
      const results = await agent.executeC4_ContentOperations('SEARCH_WIKI', {
        space_id: spaceId,
        query: keyword
      });
      
      const items = results.items || [];
      console.log(`📝 ${items.length}件の結果が見つかりました:\n`);
      
      items.forEach((item: any, index: number) => {
        console.log(`${index + 1}. ${item.title}`);
        console.log(`   Token: ${item.node_token || item.obj_token}`);
        console.log(`   Type: ${item.obj_type}`);
        console.log();
      });
      
    } catch (error) {
      console.error('❌ エラー:', error);
    } finally {
      await agent.close();
    }
  });

// CLIの実行
program.parse(process.argv);

// コマンドが指定されていない場合はヘルプを表示
if (process.argv.length === 2) {
  program.outputHelp();
}