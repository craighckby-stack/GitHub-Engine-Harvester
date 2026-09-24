/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Engine 4: Session State & Tree-Structured Context Engine
 * Sanitized branching conversation tree, checkpoint rollbacks,
 * token accounting, and intelligent sliding-window pruning.
 */

import {
  ModelMessage,
  SessionTreeNode,
  TokenBudgetConfig,
} from './types';

export class SessionStateEngine {
  private nodes: Map<string, SessionTreeNode> = new Map();
  private rootId: string | null = null;
  private currentLeafId: string | null = null;
  private budgetConfig: TokenBudgetConfig;

  constructor(
    budgetConfig: Partial<TokenBudgetConfig> = {}
  ) {
    this.budgetConfig = {
      maxContextTokens: budgetConfig.maxContextTokens || 16384,
      reserveForGeneration: budgetConfig.reserveForGeneration || 4096,
      pruneThreshold: budgetConfig.pruneThreshold || 0.85,
      strategy: budgetConfig.strategy || 'hybrid',
    };
  }

  /**
   * Initializes a new conversation root.
   */
  public initRoot(systemPrompt: string): string {
    const rootNode: SessionTreeNode = {
      id: `node_root_${Date.now()}`,
      parentId: null,
      stepIndex: 0,
      message: {
        role: 'system',
        content: systemPrompt,
        timestamp: Date.now(),
      },
      stateSnapshot: {
        tokenCount: this.estimateTokens(systemPrompt),
        activeFiles: [],
      },
      childrenIds: [],
      createdAt: Date.now(),
    };

    this.nodes.set(rootNode.id, rootNode);
    this.rootId = rootNode.id;
    this.currentLeafId = rootNode.id;
    return rootNode.id;
  }

  /**
   * Appends a message to the active branch.
   */
  public appendMessage(
    message: ModelMessage,
    activeFiles: string[] = []
  ): SessionTreeNode {
    if (!this.currentLeafId) {
      this.initRoot('You are an autonomous harness agent.');
    }

    const parentNode = this.nodes.get(this.currentLeafId!)!;
    const msgTokens = this.estimateMessageTokens(message);

    const newNode: SessionTreeNode = {
      id: `node_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      parentId: parentNode.id,
      stepIndex: parentNode.stepIndex + 1,
      message,
      stateSnapshot: {
        tokenCount: msgTokens,
        activeFiles,
      },
      childrenIds: [],
      createdAt: Date.now(),
    };

    parentNode.childrenIds.push(newNode.id);
    this.nodes.set(newNode.id, newNode);
    this.currentLeafId = newNode.id;

    return newNode;
  }

  /**
   * Forks the active conversation from any historical node to explore speculative branches.
   */
  public fork(fromNodeId: string): string {
    if (!this.nodes.has(fromNodeId)) {
      throw new Error(`Node ${fromNodeId} not found in session tree.`);
    }
    this.currentLeafId = fromNodeId;
    return fromNodeId;
  }

  /**
   * Returns the linear trajectory of messages from root to the active leaf node.
   */
  public getLinearHistory(leafId = this.currentLeafId): ModelMessage[] {
    if (!leafId || !this.nodes.has(leafId)) return [];

    const history: ModelMessage[] = [];
    let curr: SessionTreeNode | null = this.nodes.get(leafId)!;

    while (curr) {
      history.unshift(curr.message);
      curr = curr.parentId ? this.nodes.get(curr.parentId) || null : null;
    }

    return history;
  }

  /**
   * Calculates total tokens in the current active linear context.
   */
  public getActiveContextTokens(): number {
    const history = this.getLinearHistory();
    return history.reduce((acc, m) => acc + this.estimateMessageTokens(m), 0);
  }

  /**
   * Evaluates if context exceeds threshold and applies pruning strategies.
   */
  public pruneContextIfNeeded(): { pruned: boolean; tokensBefore: number; tokensAfter: number; strategyUsed: string } {
    const tokensBefore = this.getActiveContextTokens();
    const threshold = this.budgetConfig.maxContextTokens * this.budgetConfig.pruneThreshold;

    if (tokensBefore <= threshold) {
      return { pruned: false, tokensBefore, tokensAfter: tokensBefore, strategyUsed: 'none' };
    }

    // Prune excessive tool outputs along the branch
    let currId = this.currentLeafId;
    let prunedCount = 0;

    while (currId) {
      const node = this.nodes.get(currId);
      if (!node) break;

      if (node.message.role === 'tool' && typeof node.message.content === 'string') {
        if (node.message.content.length > 500) {
          node.message.content = node.message.content.slice(0, 300) + '\n[...historical output pruned for context economy...]';
          prunedCount++;
        }
      }
      currId = node.parentId;
    }

    const tokensAfter = this.getActiveContextTokens();
    return {
      pruned: prunedCount > 0,
      tokensBefore,
      tokensAfter,
      strategyUsed: this.budgetConfig.strategy,
    };
  }

  /**
   * Approximate token counter (sanitized BPE heuristic: ~4 chars per token).
   */
  public estimateTokens(text: string): number {
    if (!text) return 0;
    return Math.ceil(text.length / 4);
  }

  private estimateMessageTokens(msg: ModelMessage): number {
    let count = 4; // overhead
    if (typeof msg.content === 'string') {
      count += this.estimateTokens(msg.content);
    } else if (Array.isArray(msg.content)) {
      for (const part of msg.content) {
        if (part.text) count += this.estimateTokens(part.text);
        if (part.toolCall) count += this.estimateTokens(JSON.stringify(part.toolCall));
        if (part.toolResult) count += this.estimateTokens(part.toolResult.content);
      }
    }
    if (msg.thought) {
      count += this.estimateTokens(msg.thought);
    }
    return count;
  }

  /**
   * Serializes current tree for persistence or snapshotting.
   */
  public exportSnapshot(): {
    rootId: string | null;
    currentLeafId: string | null;
    nodes: SessionTreeNode[];
  } {
    return {
      rootId: this.rootId,
      currentLeafId: this.currentLeafId,
      nodes: Array.from(this.nodes.values()),
    };
  }
}
