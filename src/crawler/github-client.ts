/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Client-side GitHub Integration Service
 * Communicates with server-side proxy routes for repository counting and automatic git push.
 */

export interface GitHubGlobalStats {
  totalEstimatedGitHubRepos: number;
  aiAgentReposCount: number;
  autonomousHarnessCount: number;
  llmToolRuntimeCount: number;
  topAgentLanguages: { name: string; count: number }[];
  lastUpdated: number;
}

export interface GitHubUserProfile {
  login: string;
  name: string;
  avatarUrl: string;
  htmlUrl: string;
  publicRepos: number;
  totalPrivateRepos: number;
  ownedPrivateRepos: number;
  totalRepos: number;
  bio: string;
  scopes: string[];
}

export interface GitHubUserRepo {
  id: number;
  fullName: string;
  name: string;
  owner: string;
  private: boolean;
  defaultBranch: string;
  htmlUrl: string;
  description: string;
  stars: number;
  updatedAt: string;
}

export interface PushResult {
  success: boolean;
  repo: string;
  branch: string;
  path?: string;
  commitSha?: string;
  commitUrl?: string;
  fileUrl?: string;
  timestamp: number;
  error?: string;
}

export interface BundlePushResult {
  success: boolean;
  repo: string;
  branch: string;
  engineName: string;
  pushedFiles: {
    path: string;
    commitSha: string;
    commitUrl: string;
    fileUrl: string;
  }[];
  totalPushed: number;
  timestamp: number;
  error?: string;
}

export const GitHubClient = {
  /**
   * Fetch global GitHub repository metrics (total repositories, AI agent repositories count)
   */
  async getGlobalStats(): Promise<GitHubGlobalStats> {
    const res = await fetch('/api/github/global-stats');
    if (!res.ok) {
      throw new Error(`Failed to load GitHub global stats: ${res.statusText}`);
    }
    return res.json();
  },

  /**
   * Verify token and fetch user profile with exact repository counts
   */
  async verifyToken(token: string): Promise<GitHubUserProfile> {
    const res = await fetch('/api/github/verify-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: token.trim() }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Authentication with GitHub failed');
    }
    return data.user;
  },

  /**
   * List repositories belonging to the authenticated user
   */
  async listRepositories(token: string): Promise<GitHubUserRepo[]> {
    const res = await fetch('/api/github/list-repos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: token.trim() }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to list user repositories');
    }
    return data.repositories || [];
  },

  /**
   * Automatically create a new repository on GitHub (e.g. "sanitized-agent-engines")
   */
  async createRepository(
    token: string,
    name: string,
    description?: string,
    isPrivate = false
  ): Promise<{ fullName: string; htmlUrl: string; defaultBranch: string }> {
    const res = await fetch('/api/github/create-repo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: token.trim(),
        name: name.trim(),
        description: description || 'Automated Clean-Room Runtime Engines pushed by Engine Harvester',
        private: isPrivate,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to create repository');
    }
    return data.repo;
  },

  /**
   * Push a single file to a GitHub repository
   */
  async pushFile(
    token: string,
    repoFullName: string,
    path: string,
    content: string,
    commitMessage?: string,
    branch?: string
  ): Promise<PushResult> {
    const res = await fetch('/api/github/push-file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: token.trim(),
        repoFullName: repoFullName.trim(),
        path: path.trim(),
        content,
        commitMessage: commitMessage || `feat(engine): add ${path}`,
        branch,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'GitHub push failed');
    }
    return data;
  },

  /**
   * Push complete engine bundle (specification.md, runtime.ts, and README.md index)
   */
  async pushEngineBundle(
    token: string,
    repoFullName: string,
    engineName: string,
    markdownContent: string,
    sourceRepo?: string,
    branch?: string
  ): Promise<BundlePushResult> {
    const res = await fetch('/api/github/push-engine-bundle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: token.trim(),
        repoFullName: repoFullName.trim(),
        engineName,
        markdownContent,
        sourceRepo,
        branch,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to push engine bundle');
    }
    return data;
  },
};
