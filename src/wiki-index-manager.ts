/**
 * Wiki Index Manager - トピック別ショートカット管理システム
 * 複数のWikiページから情報を抽出し、構造化されたインデックスページにショートカットとして整理
 */

import { LarkWikiMCPAgent } from './agents/lark-wiki-mcp-agent';

// トピック定義
export interface Topic {
  id: string;
  name: string;
  keywords: string[];          // 検索キーワード
  includePatterns?: RegExp[];  // 含めるパターン
  excludePatterns?: RegExp[];  // 除外するパターン
  priority?: number;            // 優先度
}

// インデックスページ定義
export interface IndexPage {
  nodeToken: string;           // インデックスページのトークン
  spaceId: string;
  title: string;
  topics: Topic[];              // このインデックスが扱うトピック
  autoUpdate: boolean;          // 自動更新の有効/無効
}

// Wiki情報
export interface WikiInfo {
  spaceId: string;
  spaceName: string;
  searchEnabled: boolean;
}

// ショートカット情報
export interface ShortcutInfo {
  targetNodeToken: string;      // 元のドキュメントのトークン
  targetTitle: string;
  targetSpaceId: string;
  indexNodeToken: string;       // インデックスページのトークン
  topicId: string;
  createdAt: Date;
  matchedKeywords: string[];
}

export class WikiIndexManager {
  private agent: LarkWikiMCPAgent;
  private wikis: WikiInfo[] = [];
  private indexPages: Map<string, IndexPage> = new Map();
  private shortcuts: Map<string, ShortcutInfo[]> = new Map(); // nodeToken -> shortcuts
  private searchCache: Map<string, any[]> = new Map();

  constructor(agent: LarkWikiMCPAgent) {
    this.agent = agent;
  }

  /**
   * Wiki空間を登録
   */
  async registerWiki(spaceId: string, searchEnabled = true): Promise<void> {
    console.log(`📚 Registering Wiki space: ${spaceId}`);
    
    try {
      const spaceInfo = await this.agent.executeC1_WikiSpace('GET_SPACE_INFO', {
        space_id: spaceId
      });

      this.wikis.push({
        spaceId,
        spaceName: spaceInfo.name || spaceId,
        searchEnabled
      });

      console.log(`✅ Registered Wiki: ${spaceInfo.name}`);
    } catch (error) {
      console.error(`❌ Failed to register Wiki ${spaceId}:`, error);
      throw error;
    }
  }

  /**
   * インデックスページを登録
   */
  async registerIndexPage(config: IndexPage): Promise<void> {
    console.log(`📑 Registering index page: ${config.title}`);
    
    // インデックスページの存在確認
    const nodeInfo = await this.agent.executeC2_NodeManagement('GET_NODE_INFO', {
      node_token: config.nodeToken
    });

    if (!nodeInfo) {
      throw new Error(`Index page not found: ${config.nodeToken}`);
    }

    this.indexPages.set(config.nodeToken, config);
    console.log(`✅ Registered index page: ${config.title}`);
  }

  /**
   * 全Wikiから指定トピックの情報を収集
   */
  async collectTopicPages(topic: Topic): Promise<any[]> {
    console.log(`🔍 Collecting pages for topic: ${topic.name}`);
    const allPages: any[] = [];

    for (const wiki of this.wikis) {
      if (!wiki.searchEnabled) continue;

      console.log(`  Searching in Wiki: ${wiki.spaceName}`);
      
      for (const keyword of topic.keywords) {
        try {
          const searchResults = await this.searchWiki(wiki.spaceId, keyword);
          
          // フィルタリング
          const filteredResults = this.filterResults(searchResults, topic);
          allPages.push(...filteredResults);
          
          console.log(`    Found ${filteredResults.length} pages for keyword: ${keyword}`);
        } catch (error) {
          console.error(`    Error searching for ${keyword}:`, error);
        }
      }
    }

    // 重複を除去（同じnode_tokenを持つものを統合）
    const uniquePages = this.removeDuplicates(allPages);
    console.log(`✅ Total unique pages found: ${uniquePages.length}`);
    
    return uniquePages;
  }

  /**
   * Wikiを検索
   */
  private async searchWiki(spaceId: string, keyword: string): Promise<any[]> {
    const cacheKey = `${spaceId}-${keyword}`;
    
    // キャッシュチェック
    if (this.searchCache.has(cacheKey)) {
      return this.searchCache.get(cacheKey)!;
    }

    const results = await this.agent.executeC4_ContentOperations('SEARCH_WIKI', {
      space_id: spaceId,
      query: keyword
    });

    const items = results.items || [];
    this.searchCache.set(cacheKey, items);
    
    return items;
  }

  /**
   * 検索結果をフィルタリング
   */
  private filterResults(results: any[], topic: Topic): any[] {
    return results.filter(result => {
      const title = result.title || '';
      const content = result.content || '';
      const text = `${title} ${content}`.toLowerCase();

      // 除外パターンチェック
      if (topic.excludePatterns) {
        for (const pattern of topic.excludePatterns) {
          if (pattern.test(text)) {
            return false;
          }
        }
      }

      // 包含パターンチェック
      if (topic.includePatterns) {
        for (const pattern of topic.includePatterns) {
          if (pattern.test(text)) {
            return true;
          }
        }
        return false; // includeパターンが指定されている場合、マッチしなければ除外
      }

      return true; // パターンが指定されていない場合は含める
    });
  }

  /**
   * 重複を除去
   */
  private removeDuplicates(pages: any[]): any[] {
    const seen = new Map<string, any>();
    
    for (const page of pages) {
      const key = page.node_token || page.obj_token;
      if (key && !seen.has(key)) {
        seen.set(key, page);
      }
    }
    
    return Array.from(seen.values());
  }

  /**
   * ショートカットを作成
   */
  async createShortcut(
    indexNodeToken: string,
    targetNodeToken: string,
    targetSpaceId: string
  ): Promise<any> {
    console.log(`🔗 Creating shortcut: ${targetNodeToken} -> ${indexNodeToken}`);
    
    try {
      const result = await this.agent.executeC2_NodeManagement('CREATE_NODE', {
        parent_node_token: indexNodeToken,
        node_type: 'shortcut',
        origin_node_token: targetNodeToken,
        origin_space_id: targetSpaceId
      });

      console.log(`✅ Shortcut created: ${result.node_token}`);
      return result;
    } catch (error) {
      console.error(`❌ Failed to create shortcut:`, error);
      throw error;
    }
  }

  /**
   * インデックスページを更新（トピックに基づいてショートカットを追加）
   */
  async updateIndexPage(indexNodeToken: string): Promise<void> {
    const indexPage = this.indexPages.get(indexNodeToken);
    if (!indexPage) {
      throw new Error(`Index page not found: ${indexNodeToken}`);
    }

    console.log(`📝 Updating index page: ${indexPage.title}`);
    
    // 既存の子ノードを取得
    const existingNodes = await this.getExistingShortcuts(indexNodeToken);
    const existingTokens = new Set(existingNodes.map(n => n.origin_node_token));

    for (const topic of indexPage.topics) {
      console.log(`\n  Processing topic: ${topic.name}`);
      
      // トピックに該当するページを収集
      const pages = await this.collectTopicPages(topic);
      
      // 新規ショートカットの作成
      let created = 0;
      let skipped = 0;
      
      for (const page of pages) {
        const targetToken = page.node_token || page.obj_token;
        
        if (existingTokens.has(targetToken)) {
          skipped++;
          continue; // 既に存在する
        }

        try {
          await this.createShortcut(
            indexNodeToken,
            targetToken,
            page.space_id || indexPage.spaceId
          );
          
          // ショートカット情報を記録
          const shortcutInfo: ShortcutInfo = {
            targetNodeToken: targetToken,
            targetTitle: page.title,
            targetSpaceId: page.space_id || indexPage.spaceId,
            indexNodeToken,
            topicId: topic.id,
            createdAt: new Date(),
            matchedKeywords: topic.keywords
          };
          
          if (!this.shortcuts.has(targetToken)) {
            this.shortcuts.set(targetToken, []);
          }
          this.shortcuts.get(targetToken)!.push(shortcutInfo);
          
          created++;
          
          // レート制限対策
          await this.delay(500);
        } catch (error) {
          console.error(`    Failed to create shortcut for ${page.title}:`, error);
        }
      }
      
      console.log(`  ✅ Topic ${topic.name}: Created ${created} shortcuts, Skipped ${skipped} existing`);
    }
    
    console.log(`\n✅ Index page update completed: ${indexPage.title}`);
  }

  /**
   * 既存のショートカットを取得
   */
  private async getExistingShortcuts(parentNodeToken: string): Promise<any[]> {
    const result = await this.agent.executeC2_NodeManagement('LIST_NODES', {
      parent_node_token: parentNodeToken,
      page_size: 500 // 大きめに設定
    });
    
    return (result.items || []).filter((item: any) => item.node_type === 'shortcut');
  }

  /**
   * 複数のインデックスページにショートカットを追加
   */
  async addToMultipleIndexes(
    targetNodeToken: string,
    targetSpaceId: string,
    indexNodeTokens: string[]
  ): Promise<void> {
    console.log(`🔗 Adding ${targetNodeToken} to ${indexNodeTokens.length} indexes`);
    
    for (const indexToken of indexNodeTokens) {
      try {
        await this.createShortcut(indexToken, targetNodeToken, targetSpaceId);
        await this.delay(500); // レート制限対策
      } catch (error) {
        console.error(`Failed to add to index ${indexToken}:`, error);
      }
    }
  }

  /**
   * 全インデックスページを自動更新
   */
  async updateAllIndexPages(): Promise<void> {
    console.log('🔄 Starting automatic update of all index pages...\n');
    
    for (const [token, indexPage] of this.indexPages) {
      if (!indexPage.autoUpdate) {
        console.log(`⏭️  Skipping ${indexPage.title} (auto-update disabled)`);
        continue;
      }
      
      try {
        await this.updateIndexPage(token);
        await this.delay(2000); // インデックス間の待機
      } catch (error) {
        console.error(`Failed to update index ${indexPage.title}:`, error);
      }
    }
    
    console.log('\n✅ All index pages updated');
  }

  /**
   * ショートカットの統計情報を取得
   */
  getStatistics(): any {
    const stats = {
      totalWikis: this.wikis.length,
      totalIndexPages: this.indexPages.size,
      totalShortcuts: 0,
      shortcutsByTopic: new Map<string, number>(),
      duplicatePages: [] as string[]
    };

    for (const [nodeToken, shortcuts] of this.shortcuts) {
      stats.totalShortcuts += shortcuts.length;
      
      if (shortcuts.length > 1) {
        stats.duplicatePages.push(nodeToken);
      }
      
      for (const shortcut of shortcuts) {
        const count = stats.shortcutsByTopic.get(shortcut.topicId) || 0;
        stats.shortcutsByTopic.set(shortcut.topicId, count + 1);
      }
    }

    return stats;
  }

  /**
   * キャッシュをクリア
   */
  clearCache(): void {
    this.searchCache.clear();
    console.log('🧹 Search cache cleared');
  }

  /**
   * 遅延関数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// エクスポート
export default WikiIndexManager;