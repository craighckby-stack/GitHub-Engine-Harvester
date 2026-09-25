/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Engine Harvester Types & Configuration Specification
 * Defines schemas for automated GitHub crawling, persistent blacklisting,
 * intra/inter-repository cooldown timers, and massive error handling.
 */

export type JobStatus =
  | 'queued'
  | 'crawling'
  | 'analyzing_files'
  | 'cooldown_intra_repo'
  | 'sanitizing_engines'
  | 'cooldown_inter_repo'
  | 'completed'
  | 'blacklisted'
  | 'error_recovering'
  | 'failed_terminal';

export interface BlacklistEntry {
  repoFullName: string; // e.g., "deepseek-ai/deepseek-harness"
  url: string;
  status: 'completed' | 'blacklisted' | 'skipped_incompatible' | 'failed_terminal';
  reason?: string;
  processedAt: number;
  enginesExtractedCount: number;
  sanitizedName?: string;
  outputPath?: string;
  retryCount: number;
  errorLog?: string;
}

export interface CrawlJob {
  id: string;
  repoFullName: string;
  owner: string;
  name: string;
  url: string;
  description: string;
  stars: number;
  language: string;
  topics: string[];
  status: JobStatus;
  progressPercent: number;
  currentStepMessage: string;
  enginesFound: number;
  sanitizedTitle?: string;
  cooldownRemainingMs: number;
  totalCooldownAppliedMs: number;
  retryCount: number;
  lastError?: string;
  markdownOutput?: string;
  githubPushResult?: {
    success: boolean;
    repo: string;
    branch: string;
    commitSha?: string;
    commitUrl?: string;
    filesCount?: number;
    error?: string;
    timestamp: number;
  };
}

export interface HarvesterConfig {
  autoStart: boolean;
  concurrency: number;
  intraRepoCooldownMs: number; // Cooldown between inspecting files inside ONE repository
  interRepoCooldownMs: number; // Cooldown between finishing one repo and starting the next
  rateLimitBackoffBaseMs: number; // Exponential backoff base for 403/429
  maxRetriesPerRepo: number;
  topics: string[];
  minStars: number;
  targetKeywords: string[];
  autoSanitize: boolean;
  defaultBrandKeywords: string[];
  outputDirectory: string;
  // Unlimited Dynamic Discovery Configurations
  unlimitedDiscovery: boolean; // default true: continuously queries and enqueues infinite repositories
  discoveryBatchSize: number; // default 20
  forceReRunBlacklist?: boolean; // When true, re-runs all blacklisted repositories with real live API
  // Automated GitHub Repository Push Configurations
  autoPushToGithub: boolean;
  githubToken?: string;
  githubTargetRepo?: string; // e.g. "my-org/sanitized-ai-engines"
  githubTargetBranch?: string; // default "main"
  githubTargetDir?: string; // default "engines/"
  fileCreationMode?: 'create_unique' | 'overwrite'; // default 'create_unique' (never overwrite existing files)
}

export interface GitHubPushLedgerItem {
  id: string;
  engineName: string;
  sourceRepo: string;
  targetRepo: string;
  branch: string;
  commitSha: string;
  commitUrl: string;
  filesPushedCount: number;
  timestamp: number;
  status: 'success' | 'failed';
  errorMessage?: string;
  filesList?: string[];
}

export interface HarvesterTelemetry {
  totalDiscovered: number;
  totalProcessed: number;
  totalEnginesExtracted: number;
  totalBlacklisted: number;
  totalErrorsRecovered: number;
  totalCooldownMs: number;
  currentActiveJobId: string | null;
  unlimitedMode?: boolean;
  // GitHub Automated Push metrics
  totalPushedToGithub: number;
  lastPushedCommit?: {
    repo: string;
    branch: string;
    commitSha: string;
    commitUrl: string;
    timestamp: number;
  };
  recentPushes: GitHubPushLedgerItem[];
  currentCooldownTimer: {
    type: 'intra_repo' | 'inter_repo' | 'rate_limit_backoff' | 'none';
    remainingMs: number;
    totalMs: number;
    reason: string;
  };
  circuitBreaker: {
    status: 'closed' | 'open' | 'half_open';
    consecutiveFailures: number;
    maxAllowedFailures: number;
    cooldownUntil: number;
  };
  rateLimit: {
    remaining: number;
    limit: number;
    resetTimestamp: number;
  };
}
