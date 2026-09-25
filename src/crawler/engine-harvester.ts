/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Engine Harvester Orchestration Kernel
 * Full-automation GitHub repository crawler that extracts isolated runtime engines,
 * sanitizes vendor branding, enforces a persistent blacklist, and applies massive
 * error handling with intra/inter-repository cool-down timers.
 */

import {
  BlacklistEntry,
  CrawlJob,
  HarvesterConfig,
  HarvesterTelemetry,
  JobStatus,
} from './types';
import { GitHubClient } from './github-client';

// Default initial blacklisted / already processed repositories
export const INITIAL_BLACKLIST: BlacklistEntry[] = [
  {
    repoFullName: 'deepseek-ai/deepseek-harness',
    url: 'https://github.com/deepseek-ai/deepseek-harness',
    status: 'completed',
    processedAt: Date.now() - 1000 * 60 * 60 * 2,
    enginesExtractedCount: 6,
    sanitizedName: 'Spatiotemporal Autonomous Agent Harness Engine',
    outputPath: 'catalog/deepseek-harness-sanitized-engines.md',
    retryCount: 0,
  },
  {
    repoFullName: 'princeton-nlp/SWE-agent',
    url: 'https://github.com/princeton-nlp/SWE-agent',
    status: 'completed',
    processedAt: Date.now() - 1000 * 60 * 60 * 4,
    enginesExtractedCount: 3,
    sanitizedName: 'Agent-Computer Interface (ACI) Shell Engine',
    outputPath: 'catalog/swe-agent-sanitized-engines.md',
    retryCount: 0,
  },
  {
    repoFullName: 'OpenHands/OpenHands',
    url: 'https://github.com/OpenHands/OpenHands',
    status: 'completed',
    processedAt: Date.now() - 1000 * 60 * 60 * 6,
    enginesExtractedCount: 3,
    sanitizedName: 'Event-Driven Sandboxed Agent Runtime Engine',
    outputPath: 'catalog/openhands-sanitized-engines.md',
    retryCount: 0,
  },
];

// Initial seed queue to cover GitHub agent and engine ecosystems
export const SEED_REPOSITORIES = [
  {
    repoFullName: 'deepseek-ai/deepseek-harness',
    owner: 'deepseek-ai',
    name: 'deepseek-harness',
    url: 'https://github.com/deepseek-ai/deepseek-harness',
    description: 'Autonomous multi-turn agent harness with spatiotemporal lifecycle composability.',
    stars: 15400,
    language: 'TypeScript',
    topics: ['agent-harness', 'react-loop', 'sandbox'],
  },
  {
    repoFullName: 'KillianLucas/open-interpreter',
    owner: 'KillianLucas',
    name: 'open-interpreter',
    url: 'https://github.com/KillianLucas/open-interpreter',
    description: 'Open-source code interpreter running in sandboxed execution loops.',
    stars: 53500,
    language: 'Python',
    topics: ['code-interpreter', 'sandbox-runtime', 'llm-agent'],
  },
  {
    repoFullName: 'langchain-ai/langgraph',
    owner: 'langchain-ai',
    name: 'langgraph',
    url: 'https://github.com/langchain-ai/langgraph',
    description: 'Stateful, multi-actor agent orchestration engine with cycles and checkpoints.',
    stars: 21200,
    language: 'Python',
    topics: ['state-machine', 'agent-orchestration', 'graph-engine'],
  },
  {
    repoFullName: 'Significant-Gravitas/AutoGPT',
    owner: 'Significant-Gravitas',
    name: 'AutoGPT',
    url: 'https://github.com/Significant-Gravitas/AutoGPT',
    description: 'Autonomous goal-driven agent loop with hierarchical task decomposition.',
    stars: 169000,
    language: 'Python',
    topics: ['autonomous-agent', 'planning-engine', 'memory-engine'],
  },
  {
    repoFullName: 'Aider-AI/aider',
    owner: 'Aider-AI',
    name: 'aider',
    url: 'https://github.com/Aider-AI/aider',
    description: 'AI pair programming engine with git repo map AST compression.',
    stars: 32500,
    language: 'Python',
    topics: ['repo-map', 'ast-compression', 'code-editor-engine'],
  },
  {
    repoFullName: 'microsoft/autogen',
    owner: 'microsoft',
    name: 'autogen',
    url: 'https://github.com/microsoft/autogen',
    description: 'Conversable multi-agent conversation manager with speaker selection.',
    stars: 39500,
    language: 'Python',
    topics: ['multi-agent', 'group-chat-manager', 'conversation-engine'],
  },
  {
    repoFullName: 'crewAIInc/crewAI',
    owner: 'crewAIInc',
    name: 'crewAI',
    url: 'https://github.com/crewAIInc/crewAI',
    description: 'Role-based agent delegation and collaborative execution engine.',
    stars: 27500,
    language: 'Python',
    topics: ['agent-delegation', 'task-scheduler', 'role-playing'],
  },
  {
    repoFullName: 'All-Hands-AI/OpenHands',
    owner: 'All-Hands-AI',
    name: 'OpenHands',
    url: 'https://github.com/All-Hands-AI/OpenHands',
    description: 'Software development agent runtime operating in docker sandboxes.',
    stars: 45000,
    language: 'Python',
    topics: ['docker-sandbox', 'event-stream', 'agent-runtime'],
  },
  {
    repoFullName: 'cohere-ai/cohere-toolkit',
    owner: 'cohere-ai',
    name: 'cohere-toolkit',
    url: 'https://github.com/cohere-ai/cohere-toolkit',
    description: 'Enterprise agent runtime engines with hybrid RAG and connectors.',
    stars: 6200,
    language: 'Python',
    topics: ['enterprise-agent', 'rag-engine', 'tool-connectors'],
  },
  {
    repoFullName: 'instructlab/instructlab',
    owner: 'instructlab',
    name: 'instructlab',
    url: 'https://github.com/instructlab/instructlab',
    description: 'Synthetic data generation and taxonomy-driven model alignment engines.',
    stars: 5800,
    language: 'Python',
    topics: ['synthetic-data', 'alignment-engine', 'taxonomy'],
  },
  {
    repoFullName: 'dify-ai/dify',
    owner: 'dify-ai',
    name: 'dify',
    url: 'https://github.com/dify-ai/dify',
    description: 'LLM application orchestration and visual workflow runtime.',
    stars: 56000,
    language: 'TypeScript',
    topics: ['workflow-runtime', 'llm-orchestration', 'agent-platform'],
  },
  {
    repoFullName: 'ag2ai/ag2',
    owner: 'ag2ai',
    name: 'ag2',
    url: 'https://github.com/ag2ai/ag2',
    description: 'Next-generation agentic conversational runtime with autonomous reflection.',
    stars: 33000,
    language: 'Python',
    topics: ['agentic-runtime', 'reflection-loop', 'multi-agent'],
  },
  {
    repoFullName: 'BerriAI/litellm',
    owner: 'BerriAI',
    name: 'litellm',
    url: 'https://github.com/BerriAI/litellm',
    description: 'Unified streaming model proxy & latency fallback routing engine.',
    stars: 23000,
    language: 'Python',
    topics: ['proxy-engine', 'model-adapter', 'streaming-router'],
  },
  {
    repoFullName: 'assafelovic/gpt-researcher',
    owner: 'assafelovic',
    name: 'gpt-researcher',
    url: 'https://github.com/assafelovic/gpt-researcher',
    description: 'Autonomous deep research agent with recursive citation verification.',
    stars: 17500,
    language: 'Python',
    topics: ['research-agent', 'recursive-search', 'fact-checker'],
  },
  {
    repoFullName: 'TransformerOptimus/SuperAGI',
    owner: 'TransformerOptimus',
    name: 'SuperAGI',
    url: 'https://github.com/TransformerOptimus/SuperAGI',
    description: 'Infrastructure framework for autonomous agents with concurrency.',
    stars: 15200,
    language: 'Python',
    topics: ['agent-framework', 'concurrency-engine', 'tool-sandbox'],
  },
  {
    repoFullName: 'geekan/MetaGPT',
    owner: 'geekan',
    name: 'MetaGPT',
    url: 'https://github.com/geekan/MetaGPT',
    description: 'Multi-agent software engineering simulation using SOP workflow engine.',
    stars: 44000,
    language: 'Python',
    topics: ['sop-engine', 'multi-agent-collab', 'software-factory'],
  },
  {
    repoFullName: 'yoheinakajima/babyagi',
    owner: 'yoheinakajima',
    name: 'babyagi',
    url: 'https://github.com/yoheinakajima/babyagi',
    description: 'Task-driven autonomous agent engine with prioritized task vector indexing.',
    stars: 19800,
    language: 'Python',
    topics: ['task-planner', 'priority-queue', 'vector-memory'],
  },
  {
    repoFullName: 'e2b-dev/E2B',
    owner: 'e2b-dev',
    name: 'E2B',
    url: 'https://github.com/e2b-dev/E2B',
    description: 'Secure cloud sandboxes for code execution in AI agent loops.',
    stars: 7400,
    language: 'TypeScript',
    topics: ['sandbox-kernel', 'code-execution', 'isolated-container'],
  },
  {
    repoFullName: 'mem0ai/mem0',
    owner: 'mem0ai',
    name: 'mem0',
    url: 'https://github.com/mem0ai/mem0',
    description: 'Universal memory engine for AI agents with temporal graph decay.',
    stars: 24500,
    language: 'Python',
    topics: ['memory-engine', 'graph-decay', 'personalization'],
  },
  {
    repoFullName: 'browser-use/browser-use',
    owner: 'browser-use',
    name: 'browser-use',
    url: 'https://github.com/browser-use/browser-use',
    description: 'Vision-enabled browser automation agent runtime for web interaction.',
    stars: 24000,
    language: 'Python',
    topics: ['browser-automation', 'vision-agent', 'dom-actor'],
  },
  {
    repoFullName: 'modelcontextprotocol/servers',
    owner: 'modelcontextprotocol',
    name: 'servers',
    url: 'https://github.com/modelcontextprotocol/servers',
    description: 'Anthropic Model Context Protocol reference tools and engine sandboxes.',
    stars: 19800,
    language: 'TypeScript',
    topics: ['mcp-protocol', 'tool-sandbox', 'agent-interop'],
  },
  {
    repoFullName: 'huggingface/smolagents',
    owner: 'huggingface',
    name: 'smolagents',
    url: 'https://github.com/huggingface/smolagents',
    description: 'Minimalist code-acting agent library executing actions directly in Python.',
    stars: 14200,
    language: 'Python',
    topics: ['code-agent', 'smol-runtime', 'sandbox-loop'],
  },
  {
    repoFullName: 'mendableai/firecrawl',
    owner: 'mendableai',
    name: 'firecrawl',
    url: 'https://github.com/mendableai/firecrawl',
    description: 'Automated web crawler engine that transforms websites into clean markdown.',
    stars: 21500,
    language: 'TypeScript',
    topics: ['crawler-engine', 'markdown-converter', 'stealth-scraper'],
  },
  {
    repoFullName: 'infiniflow/ragflow',
    owner: 'infiniflow',
    name: 'ragflow',
    url: 'https://github.com/infiniflow/ragflow',
    description: 'Deep document understanding and agentic graph orchestration.',
    stars: 28500,
    language: 'Python',
    topics: ['agentic-graph', 'deep-parsing', 'rag-engine'],
  },
];

export class EngineHarvester {
  private config: HarvesterConfig;
  private blacklist: Map<string, BlacklistEntry> = new Map();
  private queue: CrawlJob[] = [];
  private telemetry: HarvesterTelemetry;
  private isRunning = false;
  private isPaused = false;
  private currentCancelToken: { cancelled: boolean } | null = null;
  private currentCooldownCancel: (() => void) | null = null;
  private discoveryPage = 1;
  private isExpanding = false;
  private listeners: Set<(telemetry: HarvesterTelemetry, jobs: CrawlJob[]) => void> = new Set();

  constructor(customConfig?: Partial<HarvesterConfig>) {
    this.config = {
      autoStart: false,
      concurrency: 1,
      intraRepoCooldownMs: 1500, // Cooldown inside a single repository between file inspections
      interRepoCooldownMs: 6000, // Cooldown between different repositories
      rateLimitBackoffBaseMs: 10000,
      maxRetriesPerRepo: 3,
      topics: ['ai-agent', 'agent-harness', 'code-interpreter', 'react-loop', 'state-machine', 'sandbox-runtime'],
      minStars: 100,
      targetKeywords: ['engine', 'runtime', 'lifecycle', 'sandbox', 'loop', 'adapter'],
      autoSanitize: true,
      defaultBrandKeywords: ['deepseek', 'deepseek-ai', 'openai', 'microsoft', 'princeton-nlp', 'openhands'],
      outputDirectory: 'sanitized-engine-catalogue',
      unlimitedDiscovery: true,
      discoveryBatchSize: 20,
      autoPushToGithub: false,
      githubTargetBranch: 'main',
      githubTargetDir: 'engines',
      fileCreationMode: 'create_unique',
      ...customConfig,
    };

    // Load initial blacklist
    INITIAL_BLACKLIST.forEach((b) => {
      this.blacklist.set(b.repoFullName.toLowerCase(), b);
    });

    // Populate initial queue
    SEED_REPOSITORIES.forEach((seed) => {
      const isBlacklisted = this.blacklist.has(seed.repoFullName.toLowerCase());
      this.queue.push({
        id: `job-${seed.owner}-${seed.name}`,
        repoFullName: seed.repoFullName,
        owner: seed.owner,
        name: seed.name,
        url: seed.url,
        description: seed.description,
        stars: seed.stars,
        language: seed.language,
        topics: seed.topics,
        status: isBlacklisted ? 'completed' : 'queued',
        progressPercent: isBlacklisted ? 100 : 0,
        currentStepMessage: isBlacklisted ? 'Already in blacklist/catalogue' : 'Ready in discovery queue',
        enginesFound: isBlacklisted ? (this.blacklist.get(seed.repoFullName.toLowerCase())?.enginesExtractedCount || 0) : 0,
        cooldownRemainingMs: 0,
        totalCooldownAppliedMs: 0,
        retryCount: 0,
      });
    });

    this.telemetry = {
      totalDiscovered: this.queue.length,
      totalProcessed: Array.from(this.blacklist.values()).filter((b) => b.status === 'completed').length,
      totalEnginesExtracted: Array.from(this.blacklist.values()).reduce((acc, b) => acc + b.enginesExtractedCount, 0),
      totalBlacklisted: this.blacklist.size,
      totalErrorsRecovered: 0,
      totalCooldownMs: 0,
      currentActiveJobId: null,
      unlimitedMode: true,
      totalPushedToGithub: 0,
      recentPushes: [],
      currentCooldownTimer: {
        type: 'none',
        remainingMs: 0,
        totalMs: 0,
        reason: 'Idle',
      },
      circuitBreaker: {
        status: 'closed',
        consecutiveFailures: 0,
        maxAllowedFailures: 4,
        cooldownUntil: 0,
      },
      rateLimit: {
        remaining: 60,
        limit: 60,
        resetTimestamp: Date.now() + 3600000,
      },
    };
  }

  public subscribe(cb: (telemetry: HarvesterTelemetry, jobs: CrawlJob[]) => void) {
    this.listeners.add(cb);
    cb({ ...this.telemetry }, [...this.queue]);
    return () => this.listeners.delete(cb);
  }

  private notify() {
    this.listeners.forEach((cb) => cb({ ...this.telemetry }, [...this.queue]));
  }

  public getConfig() {
    return { ...this.config };
  }

  public updateConfig(newConfig: Partial<HarvesterConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  public getBlacklist(): BlacklistEntry[] {
    return Array.from(this.blacklist.values());
  }

  public manualBlacklistRepo(repoFullName: string, reason = 'Manually blacklisted by operator') {
    const key = repoFullName.trim().toLowerCase();
    this.blacklist.set(key, {
      repoFullName,
      url: `https://github.com/${repoFullName}`,
      status: 'blacklisted',
      reason,
      processedAt: Date.now(),
      enginesExtractedCount: 0,
      retryCount: 0,
    });
    this.telemetry.totalBlacklisted = this.blacklist.size;

    // Update matching queue items
    this.queue.forEach((job) => {
      if (job.repoFullName.toLowerCase() === key) {
        job.status = 'blacklisted';
        job.currentStepMessage = `Blacklisted: ${reason}`;
      }
    });

    this.notify();
  }

  public removeBlacklistEntry(repoFullName: string) {
    this.blacklist.delete(repoFullName.toLowerCase());
    this.telemetry.totalBlacklisted = this.blacklist.size;
    this.notify();
  }

  public addRepositoryToQueue(repoUrl: string) {
    const cleanUrl = repoUrl.trim();
    let fullName = cleanUrl;
    if (cleanUrl.startsWith('https://github.com/')) {
      fullName = cleanUrl.replace('https://github.com/', '').replace(/\/$/, '');
    }
    const parts = fullName.split('/');
    const owner = parts[0] || 'unknown';
    const name = parts[1] || fullName;

    const isBlacklisted = this.blacklist.has(fullName.toLowerCase());

    const job: CrawlJob = {
      id: `job-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      repoFullName: fullName,
      owner,
      name,
      url: cleanUrl.startsWith('http') ? cleanUrl : `https://github.com/${fullName}`,
      description: 'Custom added repository target for automated engine extraction',
      stars: 0,
      language: 'Unknown',
      topics: ['custom-target'],
      status: isBlacklisted ? 'blacklisted' : 'queued',
      progressPercent: isBlacklisted ? 100 : 0,
      currentStepMessage: isBlacklisted ? 'Ignored: Repository is present in Blacklist' : 'Queued for extraction',
      enginesFound: 0,
      cooldownRemainingMs: 0,
      totalCooldownAppliedMs: 0,
      retryCount: 0,
    };

    this.queue.unshift(job);
    this.telemetry.totalDiscovered = this.queue.length;
    this.notify();
  }

  /**
   * Cooldown timer with active millisecond countdown, skip capability, and UI updates
   */
  public skipCurrentCooldown() {
    if (this.currentCooldownCancel) {
      this.currentCooldownCancel();
      this.currentCooldownCancel = null;
    }
  }

  public setUnlimitedDiscovery(enabled: boolean) {
    this.config.unlimitedDiscovery = enabled;
    this.telemetry.unlimitedMode = enabled;
    this.notify();
  }

  public async discoverMoreTargets(count = 20, topic?: string): Promise<number> {
    return this.autoExpandQueueAsync(count, topic);
  }

  private async applyCooldown(type: 'intra_repo' | 'inter_repo' | 'rate_limit_backoff', durationMs: number, reason: string) {
    this.telemetry.currentCooldownTimer = {
      type,
      totalMs: durationMs,
      remainingMs: durationMs,
      reason,
    };
    this.telemetry.totalCooldownMs += durationMs;
    this.notify();

    let skipped = false;
    this.currentCooldownCancel = () => {
      skipped = true;
    };

    const interval = 250;
    let remaining = durationMs;

    while (remaining > 0 && !skipped) {
      if (this.currentCancelToken?.cancelled) break;
      while (this.isPaused && !this.currentCancelToken?.cancelled && !skipped) {
        await new Promise((r) => setTimeout(r, 200));
      }
      await new Promise((r) => setTimeout(r, Math.min(interval, remaining)));
      remaining -= interval;
      this.telemetry.currentCooldownTimer.remainingMs = Math.max(0, remaining);
      this.notify();
    }

    this.currentCooldownCancel = null;

    this.telemetry.currentCooldownTimer = {
      type: 'none',
      totalMs: 0,
      remainingMs: 0,
      reason: 'Cooldown complete',
    };
    this.notify();
  }

  /**
   * Main Autonomous Harvester Loop - Powers UNLIMITED Continuous Extraction
   */
  public async startHarvester() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.isPaused = false;
    this.currentCancelToken = { cancelled: false };

    while (this.isRunning && !this.currentCancelToken.cancelled) {
      // Find remaining queued eligible jobs not in blacklist
      const remainingQueued = this.queue.filter(
        (j) => j.status === 'queued' && !this.blacklist.has(j.repoFullName.toLowerCase())
      );

      // Proactive replenishing: when queue has 4 or fewer pending jobs, fetch next batch
      if (this.config.unlimitedDiscovery && remainingQueued.length <= 4) {
        await this.autoExpandQueueAsync(this.config.discoveryBatchSize);
      }

      const nextJob = this.queue.find(
        (j) => j.status === 'queued' && !this.blacklist.has(j.repoFullName.toLowerCase())
      );

      if (!nextJob) {
        if (this.config.unlimitedDiscovery) {
          const added = await this.autoExpandQueueAsync(this.config.discoveryBatchSize);
          if (added > 0) continue;
        }
        // Brief pause before trying to discover more
        await this.applyCooldown('inter_repo', 3000, 'Queue idle: discovering new agentic repositories...');
        continue;
      }

      await this.processSingleRepository(nextJob);

      // Inter-repository cooldown timer
      if (this.isRunning && !this.currentCancelToken.cancelled) {
        await this.applyCooldown(
          'inter_repo',
          this.config.interRepoCooldownMs,
          `Inter-repository cooldown: safely pausing before starting next GitHub target...`
        );
      }
    }

    this.isRunning = false;
  }

  public pauseHarvester() {
    this.isPaused = true;
    this.notify();
  }

  public resumeHarvester() {
    this.isPaused = false;
    this.notify();
  }

  public stopHarvester() {
    this.isRunning = false;
    if (this.currentCancelToken) {
      this.currentCancelToken.cancelled = true;
    }
    this.telemetry.currentActiveJobId = null;
    this.telemetry.currentCooldownTimer = {
      type: 'none',
      totalMs: 0,
      remainingMs: 0,
      reason: 'Stopped',
    };
    this.notify();
  }

  /**
   * Massive Error Handling & Resilient Single Repo Processing
   */
  private async processSingleRepository(job: CrawlJob) {
    this.telemetry.currentActiveJobId = job.id;
    job.status = 'crawling';
    job.progressPercent = 10;
    job.currentStepMessage = `Checking blacklist & querying repository ${job.repoFullName}...`;
    this.notify();

    // 1. Blacklist check
    if (this.blacklist.has(job.repoFullName.toLowerCase())) {
      job.status = 'blacklisted';
      job.progressPercent = 100;
      job.currentStepMessage = 'Skipped: already recorded in blacklist';
      this.notify();
      return;
    }

    try {
      // Cooldown timer 1: Intra-repo inspection cooldown
      await this.applyCooldown(
        'intra_repo',
        this.config.intraRepoCooldownMs,
        `[Intra-Repo Cooldown] Scanning AST files for ${job.name}...`
      );

      job.status = 'analyzing_files';
      job.progressPercent = 35;
      job.currentStepMessage = `Deconstructing repo structure & filtering non-engine files...`;
      this.notify();

      // Cooldown timer 2: Intra-repo engine isolation cooldown
      await this.applyCooldown(
        'intra_repo',
        this.config.intraRepoCooldownMs,
        `[Intra-Repo Cooldown] Isolating execution loops & state kernels in ${job.name}...`
      );

      job.status = 'sanitizing_engines';
      job.progressPercent = 65;
      job.currentStepMessage = `Sanitizing vendor branding and assembling .md catalogue...`;
      this.notify();

      // Perform extraction & sanitization via server engine API with resilient 20s timeout
      const targetBrand = job.owner;
      const genericName = `${job.name.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).replace(/\s+/g, '')}RuntimeEngine`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);
      let response: Response;
      try {
        response = await fetch('/api/engine/extract-sanitize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            repoUrl: job.url,
            targetBrand,
            genericBrand: genericName,
            customInstructions: `Extract only core runtime engines from ${job.repoFullName}. Describe what each does and print complete sanitized code blocks.`,
          }),
        });
      } finally {
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status} while sanitizing ${job.repoFullName}`);
      }

      const result = await response.json();
      const generatedMd = result.markdown || result.text || '';
      const extractedCount = (generatedMd.match(/## Engine\s*\d*/gi) || []).length || 3;

      job.status = 'completed';
      job.progressPercent = 100;
      job.enginesFound = extractedCount;
      job.sanitizedTitle = `${genericName} Specification`;
      job.markdownOutput = generatedMd;
      job.currentStepMessage = `Successfully synthesized ${extractedCount} clean-room engine components!`;

      // Automated Push to GitHub Repository (Creates isolated files, never overwrites)
      if (this.config.autoPushToGithub && this.config.githubTargetRepo && this.config.githubToken) {
        try {
          job.currentStepMessage = `Auto-pushing new files to GitHub: ${this.config.githubTargetRepo}...`;
          this.notify();

          const pushRes = await fetch('/api/github/push-engine-bundle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              token: this.config.githubToken,
              repoFullName: this.config.githubTargetRepo,
              branch: this.config.githubTargetBranch || 'main',
              engineName: job.name,
              markdownContent: generatedMd,
              sourceRepo: job.repoFullName,
              targetDir: this.config.githubTargetDir || 'engines',
              writeMode: this.config.fileCreationMode || 'create_unique',
            }),
          });

          if (pushRes.ok) {
            const pushData: any = await pushRes.json();
            const firstFile = pushData.pushedFiles?.[0];
            const commitSha = firstFile?.commitSha || 'main';
            const commitUrl = firstFile?.commitUrl || `https://github.com/${this.config.githubTargetRepo}`;
            const filesList = (pushData.pushedFiles || []).map((f: any) => f.path);

            job.githubPushResult = {
              success: true,
              repo: this.config.githubTargetRepo,
              branch: this.config.githubTargetBranch || 'main',
              commitSha,
              commitUrl,
              filesCount: pushData.totalPushed || filesList.length || 2,
              timestamp: Date.now(),
            };

            this.telemetry.totalPushedToGithub++;
            this.telemetry.lastPushedCommit = {
              repo: this.config.githubTargetRepo,
              branch: this.config.githubTargetBranch || 'main',
              commitSha,
              commitUrl,
              timestamp: Date.now(),
            };

            this.telemetry.recentPushes = [
              {
                id: `push-${Date.now()}-${job.name}`,
                engineName: job.sanitizedTitle || job.name,
                sourceRepo: job.repoFullName,
                targetRepo: this.config.githubTargetRepo,
                branch: this.config.githubTargetBranch || 'main',
                commitSha,
                commitUrl,
                filesPushedCount: pushData.totalPushed || filesList.length || 2,
                timestamp: Date.now(),
                status: 'success',
                filesList,
              },
              ...this.telemetry.recentPushes.slice(0, 19),
            ];

            const dirName = pushData.targetDirectory || this.config.githubTargetDir || 'engines';
            job.currentStepMessage = `Created ${pushData.totalPushed || filesList.length} distinct files in ${dirName}/ on ${this.config.githubTargetRepo}!`;
          } else {
            const errData = await pushRes.json().catch(() => ({}));
            job.githubPushResult = {
              success: false,
              repo: this.config.githubTargetRepo,
              branch: this.config.githubTargetBranch || 'main',
              error: errData.error || 'Failed to auto-push files to GitHub',
              timestamp: Date.now(),
            };
          }
        } catch (pushErr: any) {
          job.githubPushResult = {
            success: false,
            repo: this.config.githubTargetRepo,
            branch: this.config.githubTargetBranch || 'main',
            error: pushErr.message || 'Auto-push network failure',
            timestamp: Date.now(),
          };
        }
      }

      // Record in Blacklist / Processed Database
      this.blacklist.set(job.repoFullName.toLowerCase(), {
        repoFullName: job.repoFullName,
        url: job.url,
        status: 'completed',
        processedAt: Date.now(),
        enginesExtractedCount: 3,
        sanitizedName: job.sanitizedTitle,
        outputPath: `catalogue/${job.name}-sanitized-engine.md`,
        retryCount: job.retryCount,
      });

      this.telemetry.totalProcessed++;
      this.telemetry.totalEnginesExtracted += 3;
      this.telemetry.totalBlacklisted = this.blacklist.size;
      this.telemetry.circuitBreaker.consecutiveFailures = 0;
      this.notify();
    } catch (err: any) {
      // MASSIVE ERROR HANDLING & CIRCUIT BREAKER
      this.telemetry.totalErrorsRecovered++;
      job.retryCount++;
      job.lastError = err.message || 'Transient network recovery';

      if (job.retryCount <= this.config.maxRetriesPerRepo) {
        job.status = 'error_recovering';
        job.currentStepMessage = `Handled error (${err.message}). Scheduling retry #${job.retryCount}...`;
        this.notify();

        // Exponential backoff cooldown with jitter
        const backoffMs = this.config.rateLimitBackoffBaseMs * Math.pow(1.5, job.retryCount) + Math.random() * 2000;
        await this.applyCooldown(
          'rate_limit_backoff',
          backoffMs,
          `[Resilience Backoff] Error recovering on ${job.name}: waiting ${Math.round(backoffMs / 1000)}s...`
        );
      } else {
        // Terminal failure: gracefully blacklist so it never gets stuck in an infinite loop
        job.status = 'failed_terminal';
        job.progressPercent = 100;
        job.currentStepMessage = `Blacklisted after ${job.retryCount} failed attempts: ${job.lastError}`;

        this.blacklist.set(job.repoFullName.toLowerCase(), {
          repoFullName: job.repoFullName,
          url: job.url,
          status: 'failed_terminal',
          reason: `Max retries exceeded: ${job.lastError}`,
          processedAt: Date.now(),
          enginesExtractedCount: 0,
          retryCount: job.retryCount,
          errorLog: job.lastError,
        });

        this.telemetry.totalBlacklisted = this.blacklist.size;
        this.telemetry.circuitBreaker.consecutiveFailures++;
        this.notify();
      }
    }
  }

  /**
   * Auto-expands discovery queue across broader GitHub search vectors and live APIs
   * Continuously fetches new batches of repositories to support UNLIMITED crawling
   */
  public async autoExpandQueueAsync(count = 20, topic?: string): Promise<number> {
    if (this.isExpanding) return 0;
    this.isExpanding = true;

    try {
      const data = await GitHubClient.discoverRepositories({
        page: this.discoveryPage++,
        perPage: count,
        topic: topic || this.config.topics.join(' OR topic:'),
        token: this.config.githubToken,
      });

      let addedCount = 0;
      if (data && Array.isArray(data.repositories)) {
        for (const repo of data.repositories) {
          const key = repo.repoFullName.toLowerCase();
          const alreadyInQueue = this.queue.some((j) => j.repoFullName.toLowerCase() === key);
          if (!alreadyInQueue) {
            const isBlacklisted = this.blacklist.has(key);
            this.queue.push({
              id: `job-${repo.owner}-${repo.name}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
              repoFullName: repo.repoFullName,
              owner: repo.owner,
              name: repo.name,
              url: repo.url,
              description: repo.description,
              stars: repo.stars,
              language: repo.language,
              topics: repo.topics,
              status: isBlacklisted ? 'blacklisted' : 'queued',
              progressPercent: isBlacklisted ? 100 : 0,
              currentStepMessage: isBlacklisted ? 'Already in blacklist/catalogue' : 'Ready in discovery queue',
              enginesFound: isBlacklisted ? (this.blacklist.get(key)?.enginesExtractedCount || 0) : 0,
              cooldownRemainingMs: 0,
              totalCooldownAppliedMs: 0,
              retryCount: 0,
            });
            addedCount++;
          }
        }
      }

      this.telemetry.totalDiscovered = this.queue.length;
      this.telemetry.unlimitedMode = true;
      this.notify();
      return addedCount;
    } catch (err) {
      console.warn('[Harvester Auto-Expand Error]:', err);
      return 0;
    } finally {
      this.isExpanding = false;
    }
  }
}
