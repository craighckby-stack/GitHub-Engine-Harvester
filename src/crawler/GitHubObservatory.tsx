/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GitHub Observatory & Automated Push Controller
 * Displays live global repository counts on GitHub, authenticated user repository counts,
 * and manages automatic/manual Git push pipelines for sanitized engine files.
 */

import React, { useState, useEffect } from 'react';
import {
  GitBranch,
  GitCommit,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Plus,
  RefreshCw,
  Key,
  ShieldCheck,
  ChevronDown,
  Globe,
  Database,
  Terminal,
  FolderGit2,
  Check,
  Lock,
} from 'lucide-react';

import {
  GitHubClient,
  GitHubGlobalStats,
  GitHubUserProfile,
  GitHubUserRepo,
} from './github-client';
import { GitHubPushLedgerItem } from './types';

interface GitHubObservatoryProps {
  autoPushEnabled: boolean;
  onToggleAutoPush: (enabled: boolean) => void;
  targetRepo: string;
  onUpdateTargetRepo: (repo: string) => void;
  targetBranch: string;
  onUpdateTargetBranch: (branch: string) => void;
  githubToken: string;
  onUpdateToken: (token: string) => void;
  recentPushes: GitHubPushLedgerItem[];
  totalPushedCount: number;
}

export const GitHubObservatory: React.FC<GitHubObservatoryProps> = ({
  autoPushEnabled,
  onToggleAutoPush,
  targetRepo,
  onUpdateTargetRepo,
  targetBranch,
  onUpdateTargetBranch,
  githubToken,
  onUpdateToken,
  recentPushes,
  totalPushedCount,
}) => {
  const [stats, setStats] = useState<GitHubGlobalStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<GitHubUserProfile | null>(null);
  const [userRepos, setUserRepos] = useState<GitHubUserRepo[]>([]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [inputToken, setInputToken] = useState(githubToken);
  const [isCreatingRepo, setIsCreatingRepo] = useState(false);
  const [newRepoName, setNewRepoName] = useState('sanitized-agent-engines');
  const [newRepoPrivate, setNewRepoPrivate] = useState(false);
  const [createRepoMessage, setCreateRepoMessage] = useState<string | null>(null);

  // Load Global GitHub Repository Counts
  useEffect(() => {
    let isMounted = true;
    const loadStats = async () => {
      try {
        setStatsLoading(true);
        const data = await GitHubClient.getGlobalStats();
        if (isMounted) {
          setStats(data);
        }
      } catch (e) {
        console.error('Failed to load GitHub global stats:', e);
      } finally {
        if (isMounted) setStatsLoading(false);
      }
    };
    loadStats();
    return () => {
      isMounted = false;
    };
  }, []);

  // Verify stored token on mount or update
  useEffect(() => {
    if (githubToken && githubToken.trim()) {
      verifyToken(githubToken);
    }
  }, [githubToken]);

  const verifyToken = async (tok: string) => {
    try {
      setIsVerifying(true);
      setAuthError(null);
      const profile = await GitHubClient.verifyToken(tok);
      setUserProfile(profile);

      // Also fetch user repos
      const repos = await GitHubClient.listRepositories(tok);
      setUserRepos(repos);

      // If no target repo set yet, auto-suggest first repo or default
      if (!targetRepo && repos.length > 0) {
        onUpdateTargetRepo(repos[0].fullName);
      }
    } catch (err: any) {
      setAuthError(err.message || 'Token verification failed');
      setUserProfile(null);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSaveToken = async () => {
    onUpdateToken(inputToken);
    await verifyToken(inputToken);
  };

  const handleCreateNewRepo = async () => {
    if (!githubToken || !newRepoName) return;
    try {
      setIsCreatingRepo(true);
      setCreateRepoMessage(null);
      const res = await GitHubClient.createRepository(
        githubToken,
        newRepoName,
        'Automated Clean-Room Runtime Engines pushed by Engine Harvester',
        newRepoPrivate
      );
      setCreateRepoMessage(`Created repository ${res.fullName}!`);
      onUpdateTargetRepo(res.fullName);

      // Refresh repos list
      const updatedRepos = await GitHubClient.listRepositories(githubToken);
      setUserRepos(updatedRepos);
    } catch (err: any) {
      setCreateRepoMessage(`Failed to create repository: ${err.message}`);
    } finally {
      setIsCreatingRepo(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Live GitHub Repository Ecosystem Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg relative overflow-hidden">
        <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Global Repository Counts */}
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <Globe className="h-4 w-4 text-emerald-400 animate-pulse" />
              <span className="text-xs font-semibold text-emerald-400 tracking-wider uppercase font-mono">
                Live GitHub Global Observatory
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-950/80 text-emerald-300 border border-emerald-800">
                Connected
              </span>
            </div>

            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <div className="flex items-baseline space-x-1.5">
                <span className="text-2xl font-black text-white font-mono tracking-tight">
                  {statsLoading ? '420,000,000+' : `${stats?.totalEstimatedGitHubRepos.toLocaleString()}+`}
                </span>
                <span className="text-xs text-slate-400 font-medium">Total Repositories on GitHub</span>
              </div>

              <div className="flex items-baseline space-x-1.5 pl-3 border-l border-slate-800">
                <span className="text-lg font-bold text-indigo-300 font-mono">
                  {statsLoading ? '168,450+' : `${stats?.aiAgentReposCount.toLocaleString()}+`}
                </span>
                <span className="text-xs text-slate-400">Agent &amp; Harness Repos</span>
              </div>

              <div className="flex items-baseline space-x-1.5 pl-3 border-l border-slate-800">
                <span className="text-lg font-bold text-amber-300 font-mono">
                  {statsLoading ? '42,100+' : `${stats?.autonomousHarnessCount.toLocaleString()}+`}
                </span>
                <span className="text-xs text-slate-400">Sandbox Runtimes</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400">
              Querying GitHub REST &amp; Search API to catalog agent architectures across the ecosystem.
            </p>
          </div>

          {/* User Account & Automated Push Status */}
          <div className="flex flex-wrap items-center gap-2">
            {userProfile ? (
              <div className="flex items-center space-x-3 bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-2">
                <img
                  src={userProfile.avatarUrl}
                  alt={userProfile.login}
                  className="w-8 h-8 rounded-full border border-slate-700"
                />
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-xs font-bold text-white font-mono">@{userProfile.login}</span>
                    <a
                      href={userProfile.htmlUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-400 hover:text-indigo-400"
                      title="Open GitHub Profile"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    <strong className="text-emerald-400">{userProfile.totalRepos}</strong> repos on GitHub (
                    {userProfile.publicRepos} public, {userProfile.totalPrivateRepos} private)
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-2 bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-400">
                <Lock className="h-3.5 w-3.5 text-amber-400" />
                <span>GitHub PAT Not Connected</span>
              </div>
            )}

            {/* Auto Push Toggle Button */}
            <div className="flex items-center space-x-2 bg-slate-950/90 border border-slate-800 rounded-lg px-3 py-2">
              <div className="space-y-0.5">
                <div className="flex items-center space-x-1.5">
                  <UploadCloud className={`h-3.5 w-3.5 ${autoPushEnabled ? 'text-emerald-400' : 'text-slate-500'}`} />
                  <span className="text-xs font-semibold text-white">Auto-Push</span>
                </div>
                <div className="text-[10px] text-slate-400 truncate max-w-[140px]" title={targetRepo || 'No repo set'}>
                  {targetRepo ? targetRepo : 'No repo selected'}
                </div>
              </div>

              <button
                onClick={() => onToggleAutoPush(!autoPushEnabled)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  autoPushEnabled ? 'bg-emerald-500' : 'bg-slate-700'
                }`}
                title="Toggle automatic push to GitHub on job completion"
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    autoPushEnabled ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Configure Push & Token Modal Button */}
            <button
              onClick={() => setShowConfigModal(true)}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-all cursor-pointer"
            >
              <FolderGit2 className="h-3.5 w-3.5" />
              <span>Configure GitHub Push</span>
            </button>
          </div>
        </div>

        {/* Live Automatic Push Progress Bar */}
        {autoPushEnabled && (
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center space-x-2 text-emerald-300">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <span>
                <strong>Automated Push Pipeline Active</strong>: Clean-room engine files (.md &amp; .ts) will commit to{' '}
                <code className="px-1 py-0.5 bg-slate-800 rounded font-mono text-emerald-200">{targetRepo || 'your-repo'}</code> on branch{' '}
                <code className="px-1 py-0.5 bg-slate-800 rounded font-mono text-emerald-200">{targetBranch}</code>.
              </span>
            </div>

            <div className="flex items-center space-x-2 text-slate-400 font-mono text-[11px]">
              <span>Pushed to GitHub:</span>
              <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                {totalPushedCount} Commits
              </span>
            </div>
          </div>
        )}
      </div>

      {/* GitHub Push Configuration Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <FolderGit2 className="h-5 w-5 text-indigo-400" />
                  <h3 className="text-lg font-bold text-white">GitHub Integration &amp; Automated Push Settings</h3>
                </div>
                <p className="text-xs text-slate-400">
                  Connect your GitHub Personal Access Token (PAT) with <code className="text-indigo-300">repo</code> scope
                  to show repository counts and automatically push sanitized engine files to GitHub.
                </p>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Token Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                  <Key className="h-3.5 w-3.5 text-amber-400" />
                  <span>GitHub Personal Access Token (PAT)</span>
                </label>
                <a
                  href="https://github.com/settings/tokens/new?scopes=repo,read:user&description=Engine+Harvester+Push"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
                >
                  <span>Generate New Token on GitHub</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="password"
                  value={inputToken}
                  onChange={(e) => setInputToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={handleSaveToken}
                  disabled={isVerifying || !inputToken}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold transition-all cursor-pointer flex items-center space-x-1"
                >
                  {isVerifying ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-3.5 w-3.5" />
                      <span>Verify Token</span>
                    </>
                  )}
                </button>
              </div>

              {authError && (
                <div className="p-3 bg-red-950/40 border border-red-800/80 rounded-lg text-xs text-red-300 flex items-start space-x-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
                  <span>{authError}</span>
                </div>
              )}

              {userProfile && (
                <div className="p-3 bg-emerald-950/40 border border-emerald-800/80 rounded-lg text-xs text-emerald-300 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <span>
                      Authenticated as <strong>@{userProfile.login}</strong> ({userProfile.totalRepos} total repositories on GitHub)
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-900/60 text-[10px] font-mono border border-emerald-700">
                    repo scope active
                  </span>
                </div>
              )}
            </div>

            {/* Target Repository Selection */}
            <div className="space-y-3 pt-3 border-t border-slate-800">
              <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                <Database className="h-3.5 w-3.5 text-indigo-400" />
                <span>Target Repository for Automated Git Pushes</span>
              </label>

              {userRepos.length > 0 ? (
                <div className="space-y-2">
                  <div className="text-[11px] text-slate-400">
                    Select an existing repository from your GitHub account:
                  </div>
                  <select
                    value={targetRepo}
                    onChange={(e) => onUpdateTargetRepo(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="">-- Choose target repository --</option>
                    {userRepos.map((r) => (
                      <option key={r.id} value={r.fullName}>
                        {r.fullName} ({r.private ? 'Private' : 'Public'} - default: {r.defaultBranch})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="text-[11px] text-slate-400">Enter target repository in format owner/repo:</div>
                  <input
                    type="text"
                    value={targetRepo}
                    onChange={(e) => onUpdateTargetRepo(e.target.value)}
                    placeholder="e.g. Craighckby/sanitized-ai-engines"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}

              {/* 1-Click Create New Repository on GitHub */}
              {userProfile && (
                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg space-y-2">
                  <div className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                    <Plus className="h-3.5 w-3.5 text-indigo-400" />
                    <span>Or 1-Click Create a New Repository on GitHub:</span>
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <input
                      type="text"
                      value={newRepoName}
                      onChange={(e) => setNewRepoName(e.target.value)}
                      placeholder="repo-name"
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-white placeholder-slate-500"
                    />
                    <label className="flex items-center space-x-1.5 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newRepoPrivate}
                        onChange={(e) => setNewRepoPrivate(e.target.checked)}
                        className="rounded border-slate-700 bg-slate-900 text-indigo-600"
                      />
                      <span>Private</span>
                    </label>
                    <button
                      onClick={handleCreateNewRepo}
                      disabled={isCreatingRepo || !newRepoName}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold transition-all cursor-pointer flex items-center justify-center space-x-1"
                    >
                      {isCreatingRepo ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                      <span>Create &amp; Select</span>
                    </button>
                  </div>
                  {createRepoMessage && (
                    <div className="text-[11px] font-mono text-indigo-300">{createRepoMessage}</div>
                  )}
                </div>
              )}

              {/* Target Branch */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-400 flex items-center space-x-1">
                    <GitBranch className="h-3 w-3 text-slate-400" />
                    <span>Target Branch</span>
                  </label>
                  <input
                    type="text"
                    value={targetBranch}
                    onChange={(e) => onUpdateTargetBranch(e.target.value)}
                    placeholder="main"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-white placeholder-slate-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-400">Push Destination Directory</label>
                  <input
                    type="text"
                    disabled
                    value="engines/{sanitized-name}/"
                    className="w-full bg-slate-950/60 border border-slate-800/80 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-500"
                  />
                </div>
              </div>
            </div>

            {/* Auto Push Activation Switch */}
            <div className="p-4 bg-indigo-950/20 border border-indigo-800/50 rounded-xl flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-xs font-bold text-white flex items-center space-x-2">
                  <span>Activate Automated Git Push</span>
                  {autoPushEnabled && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800">
                      ON
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400">
                  Every time a repository is harvested and sanitized, push specification.md, runtime.ts, and catalog
                  README directly to GitHub.
                </p>
              </div>

              <button
                onClick={() => onToggleAutoPush(!autoPushEnabled)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  autoPushEnabled ? 'bg-emerald-500' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    autoPushEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
