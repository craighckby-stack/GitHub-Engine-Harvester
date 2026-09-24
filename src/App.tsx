/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Boxes,
  FileCode,
  Download,
  Copy,
  Check,
  Search,
  Sparkles,
  Layers,
  ArrowRight,
  ShieldCheck,
  Terminal,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Code2,
  Brain,
  Filter,
  PlusCircle,
  Cpu,
  RefreshCw,
  Eye,
  FileText,
  Sliders,
  Pause,
  Clock,
  ShieldAlert,
  FolderDown,
  Trash2,
  Activity,
  History,
  Zap,
  UploadCloud,
  GitBranch,
  GitCommit,
  FolderGit2,
  Globe,
} from 'lucide-react';

import { CATALOG_ENTRIES, CatalogSystemEntry } from './catalog/catalog-data';
import { createHarnessSystem, AgentStepTrajectory, AgentStatus } from './engines';
import { EngineHarvester } from './crawler/engine-harvester';
import { CrawlJob, HarvesterTelemetry, BlacklistEntry } from './crawler/types';
import { GitHubObservatory } from './crawler/GitHubObservatory';
import { GitHubPushDialog } from './crawler/GitHubPushDialog';

export default function App() {
  // Navigation
  const [activeTab, setActiveTab] = useState<'harvester' | 'catalog' | 'markdown' | 'playground'>('harvester');

  // Harvester Instance & State
  const [harvester] = useState(() => new EngineHarvester());
  const [harvesterTelemetry, setHarvesterTelemetry] = useState<HarvesterTelemetry>(() => ({
    totalDiscovered: 8,
    totalProcessed: 3,
    totalEnginesExtracted: 12,
    totalBlacklisted: 3,
    totalErrorsRecovered: 0,
    totalCooldownMs: 0,
    currentActiveJobId: null,
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
  }));
  const [crawlJobs, setCrawlJobs] = useState<CrawlJob[]>([]);
  const [isHarvesterRunning, setIsHarvesterRunning] = useState(false);
  const [isHarvesterPaused, setIsHarvesterPaused] = useState(false);
  const [intraCooldown, setIntraCooldown] = useState(1500);
  const [interCooldown, setInterCooldown] = useState(6000);
  const [newRepoInput, setNewRepoInput] = useState('');
  const [manualBlacklistInput, setManualBlacklistInput] = useState('');
  const [blacklistSearch, setBlacklistSearch] = useState('');

  // GitHub Integration & Automated Push State
  const [autoPushEnabled, setAutoPushEnabled] = useState<boolean>(() => {
    return localStorage.getItem('dsh_auto_push') === 'true';
  });
  const [githubToken, setGithubToken] = useState<string>(() => {
    return localStorage.getItem('dsh_github_token') || '';
  });
  const [githubTargetRepo, setGithubTargetRepo] = useState<string>(() => {
    return localStorage.getItem('dsh_github_repo') || '';
  });
  const [githubTargetBranch, setGithubTargetBranch] = useState<string>(() => {
    return localStorage.getItem('dsh_github_branch') || 'main';
  });
  const [pushDialogData, setPushDialogData] = useState<{
    isOpen: boolean;
    engineName: string;
    sourceRepo?: string;
    markdownContent: string;
  } | null>(null);

  // Catalog State
  const [catalogList, setCatalogList] = useState<CatalogSystemEntry[]>(CATALOG_ENTRIES);
  const [selectedSystemId, setSelectedSystemId] = useState<string>('deepseek-harness');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  // Markdown Inspector State
  const [markdownViewMode, setMarkdownViewMode] = useState<'rendered' | 'raw' | 'split'>('split');
  const [customMarkdown, setCustomMarkdown] = useState<string>('');

  // Live Playground State
  const [system] = useState(() => createHarnessSystem());
  const [taskPrompt, setTaskPrompt] = useState('Execute isolated sanitized code verification loop.');
  const [isRunningPlayground, setIsRunningPlayground] = useState(false);
  const [agentStatus, setAgentStatus] = useState<AgentStatus>('idle');
  const [streamedThought, setStreamedThought] = useState('');
  const [streamedText, setStreamedText] = useState('');
  const [playgroundTrajectory, setPlaygroundTrajectory] = useState<AgentStepTrajectory[]>([]);

  // Subscribe to Harvester Kernel
  useEffect(() => {
    const unsub = harvester.subscribe((telem, jobs) => {
      setHarvesterTelemetry(telem);
      setCrawlJobs(jobs);

      // Auto-update catalog when jobs complete
      const completedJobs = jobs.filter((j) => j.status === 'completed' && j.markdownOutput);
      if (completedJobs.length > 0) {
        setCatalogList((prev) => {
          let updated = [...prev];
          for (const job of completedJobs) {
            const entryId = `crawled-${job.owner}-${job.name}`.toLowerCase();
            const exists = updated.some(
              (c) => c.id.toLowerCase() === entryId || c.sourceRepo.toLowerCase() === job.url.toLowerCase()
            );
            if (!exists) {
              const newEntry: CatalogSystemEntry = {
                id: entryId,
                title: job.sanitizedTitle || `${job.name} Sanitized Engine`,
                sourceRepo: job.url,
                originalBrand: job.owner,
                genericCategory: 'Automated Ingested Engine',
                summary: `Automated sanitized extraction of core runtime engines from ${job.repoFullName}.`,
                engines: [
                  {
                    name: `${job.name} Core Engine`,
                    role: 'Runtime Engine & State Loop',
                    whatItDoes: `Core runtime engine extracted from ${job.repoFullName} with vendor branding scrubbed.`,
                    inputsOutputs: 'See complete Markdown specification for details.',
                    codeSnippet: job.markdownOutput || '// Sanitized code in .md',
                  },
                ],
                fullMarkdownContent: job.markdownOutput || '',
              };
              updated = [newEntry, ...updated];
            }
          }
          return updated;
        });
      }
    });
    return () => {
      unsub();
    };
  }, [harvester, catalogList]);

  // Sync Cooldown Configs
  useEffect(() => {
    harvester.updateConfig({
      intraRepoCooldownMs: intraCooldown,
      interRepoCooldownMs: interCooldown,
    });
  }, [intraCooldown, interCooldown, harvester]);

  // Sync GitHub Integration & Automated Push Settings
  useEffect(() => {
    localStorage.setItem('dsh_auto_push', String(autoPushEnabled));
    localStorage.setItem('dsh_github_token', githubToken);
    localStorage.setItem('dsh_github_repo', githubTargetRepo);
    localStorage.setItem('dsh_github_branch', githubTargetBranch);

    harvester.updateConfig({
      autoPushToGithub: autoPushEnabled,
      githubToken: githubToken || undefined,
      githubTargetRepo: githubTargetRepo || undefined,
      githubTargetBranch: githubTargetBranch || 'main',
    });
  }, [autoPushEnabled, githubToken, githubTargetRepo, githubTargetBranch, harvester]);

  const currentSystem = catalogList.find((s) => s.id === selectedSystemId) || catalogList[0];
  const activeMarkdownToDisplay = customMarkdown || currentSystem?.fullMarkdownContent || '';

  const handleCopyText = (text: string, sectionId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionId);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const handleDownloadMarkdown = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename.endsWith('.md') ? filename : `${filename}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Download Standalone engine-harvester Repo Bundle
  const handleDownloadHarvesterBundle = () => {
    const packageJson = JSON.stringify(
      {
        name: 'engine-harvester',
        version: '1.0.0',
        description: 'Automated GitHub repository crawler and engine sanitizer with blacklist and cooldown timers',
        main: 'harvester.ts',
        scripts: {
          start: 'ts-node harvester.ts',
          crawl: 'ts-node harvester.ts --auto',
          'blacklist:list': 'ts-node harvester.ts --blacklist',
        },
        dependencies: {
          '@google/genai': '^0.1.2',
        },
        devDependencies: {
          'ts-node': '^10.9.2',
          typescript: '^5.0.0',
        },
      },
      null,
      2
    );

    const blacklistJson = JSON.stringify(harvester.getBlacklist(), null, 2);

    const readmeMd = `# engine-harvester\n\nFull-automation GitHub engine crawler & sanitizer with persistent blacklist and cooldown timers anywhere.\n\n## Quick Start\n\`\`\`bash\nnpm install\nnpm start\n\`\`\`\n`;

    const combinedBundle = `=== FILE: package.json ===\n${packageJson}\n\n=== FILE: blacklist.json ===\n${blacklistJson}\n\n=== FILE: README.md ===\n${readmeMd}\n`;
    handleDownloadMarkdown(combinedBundle, 'engine-harvester-repo-bundle.txt');
  };

  // Start Harvester
  const handleToggleHarvester = async () => {
    if (!isHarvesterRunning) {
      setIsHarvesterRunning(true);
      setIsHarvesterPaused(false);
      await harvester.startHarvester();
      setIsHarvesterRunning(false);
    } else {
      harvester.stopHarvester();
      setIsHarvesterRunning(false);
      setIsHarvesterPaused(false);
    }
  };

  const handleTogglePause = () => {
    if (!isHarvesterPaused) {
      harvester.pauseHarvester();
      setIsHarvesterPaused(true);
    } else {
      harvester.resumeHarvester();
      setIsHarvesterPaused(false);
    }
  };

  // Add repo to queue
  const handleAddRepo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRepoInput.trim()) return;
    harvester.addRepositoryToQueue(newRepoInput);
    setNewRepoInput('');
  };

  // Manual blacklist
  const handleManualBlacklist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualBlacklistInput.trim()) return;
    harvester.manualBlacklistRepo(manualBlacklistInput);
    setManualBlacklistInput('');
  };

  // Playground Execution
  const handleRunPlayground = async () => {
    setIsRunningPlayground(true);
    setAgentStatus('thinking');
    setStreamedThought('');
    setStreamedText('');
    setPlaygroundTrajectory([]);

    try {
      const stepBeforeSub = system.kernel.on('step:before', (payload: any) => {
        setStreamedThought(`[Step ${payload.stepNumber}] ReAct cycle with sanitized invariants...`);
      });

      const res = await system.agent.executeTask(taskPrompt);
      setPlaygroundTrajectory(res.trajectory);
      setStreamedText(res.finalOutput || 'Task completed by sanitized agent engine.');
      setAgentStatus(res.status);
      stepBeforeSub.dispose();
    } catch (e: any) {
      setStreamedText(`Execution Error: ${e.message}`);
      setAgentStatus('halted_error');
    } finally {
      setIsRunningPlayground(false);
    }
  };

  const blacklistEntries = harvester.getBlacklist().filter((b) => {
    if (!blacklistSearch) return true;
    return b.repoFullName.toLowerCase().includes(blacklistSearch.toLowerCase());
  });

  const activeCooldown = harvesterTelemetry.currentCooldownTimer;
  const cooldownPercent =
    activeCooldown.totalMs > 0 ? ((activeCooldown.totalMs - activeCooldown.remainingMs) / activeCooldown.totalMs) * 100 : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <Boxes className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base font-bold tracking-tight text-white">engine-harvester</h1>
                <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-emerald-950 text-emerald-300 border border-emerald-800/80">
                  Full-Automation
                </span>
                <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-amber-950 text-amber-300 border border-amber-800/80">
                  Cooldown Timers Active
                </span>
                <span className="hidden md:inline-flex px-2 py-0.5 text-[10px] font-mono rounded bg-slate-800 text-slate-300 border border-slate-700">
                  GitHub: 420M+ Repos
                </span>
                {autoPushEnabled && (
                  <span className="hidden sm:inline-flex items-center space-x-1 px-2 py-0.5 text-[10px] font-mono rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                    <UploadCloud className="h-3 w-3 text-emerald-400" />
                    <span>Auto-Push Active</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Automated GitHub repository crawler, blacklist deduplication, and sanitized engine cataloger
              </p>
            </div>
          </div>

          {/* Tab Navigation */}
          <nav className="flex items-center space-x-1 bg-slate-800/80 p-1 rounded-lg border border-slate-700/60">
            <button
              onClick={() => setActiveTab('harvester')}
              className={`flex items-center space-x-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'harvester'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Zap className="h-3.5 w-3.5 text-amber-300" />
              <span>Auto-Harvester</span>
              {isHarvesterRunning && (
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('catalog')}
              className={`flex items-center space-x-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'catalog'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Engine Catalogue ({catalogList.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('markdown')}
              className={`flex items-center space-x-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'markdown'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <FileCode className="h-3.5 w-3.5" />
              <span>Inspect .md</span>
            </button>

            <button
              onClick={() => setActiveTab('playground')}
              className={`flex items-center space-x-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'playground'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Terminal className="h-3.5 w-3.5" />
              <span>Live Engine Test</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Global Live Cooldown Timer Banner */}
      {activeCooldown.type !== 'none' && activeCooldown.remainingMs > 0 && (
        <div className="bg-amber-950/80 border-b border-amber-800/80 px-4 py-2.5 backdrop-blur z-40">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
            <div className="flex items-center space-x-2 text-amber-200">
              <Clock className="h-4 w-4 text-amber-400 animate-spin" />
              <span className="font-bold uppercase tracking-wider text-amber-300">
                {activeCooldown.type === 'intra_repo' && '⏳ Intra-Repo Cooldown Timer Active'}
                {activeCooldown.type === 'inter_repo' && '⏳ Inter-Repo Safety Cooldown Active'}
                {activeCooldown.type === 'rate_limit_backoff' && '🛡️ Rate-Limit Backoff Cooldown Active'}
              </span>
              <span className="text-amber-100/90">{activeCooldown.reason}</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-36 bg-slate-900 rounded-full h-2 overflow-hidden border border-amber-800/60">
                <div
                  className="bg-amber-400 h-full transition-all duration-100"
                  style={{ width: `${cooldownPercent}%` }}
                />
              </div>
              <span className="font-mono text-amber-300 font-bold min-w-[50px] text-right">
                {(activeCooldown.remainingMs / 1000).toFixed(1)}s
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {/* ========================================================================= */}
        {/* TAB 1: AUTO-HARVESTER                                                    */}
        {/* ========================================================================= */}
        {activeTab === 'harvester' && (
          <div className="space-y-6">
            {/* Live GitHub Repository Ecosystem & Automated Git Push Controller */}
            <GitHubObservatory
              autoPushEnabled={autoPushEnabled}
              onToggleAutoPush={setAutoPushEnabled}
              targetRepo={githubTargetRepo}
              onUpdateTargetRepo={setGithubTargetRepo}
              targetBranch={githubTargetBranch}
              onUpdateTargetBranch={setGithubTargetBranch}
              githubToken={githubToken}
              onUpdateToken={setGithubToken}
              recentPushes={harvesterTelemetry.recentPushes || []}
              totalPushedCount={harvesterTelemetry.totalPushedToGithub || 0}
            />

            {/* Control Dashboard Header */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative overflow-hidden shadow-xl">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div className="space-y-2 max-w-2xl">
                  <div className="inline-flex items-center space-x-2 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-medium">
                    <Zap className="h-3.5 w-3.5 text-indigo-400" />
                    <span>Single-Repository Automated Harvester</span>
                  </div>
                  <h2 className="text-xl font-bold tracking-tight text-white">
                    Full GitHub Engine Harvester &amp; Blacklist Filter
                  </h2>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Crawls GitHub across AI agent topics, checks the persistent blacklist to prevent redundant calls, applies{' '}
                    <strong className="text-amber-300">cool-down timers anywhere</strong> during inspection, enforces{' '}
                    <strong className="text-indigo-300">massive error handling</strong>, and outputs sanitized engine `.md` files.
                  </p>
                </div>

                {/* Main Action Buttons */}
                <div className="flex flex-wrap gap-2.5 items-center">
                  <button
                    onClick={handleToggleHarvester}
                    className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-xs font-bold shadow-lg transition-all cursor-pointer ${
                      isHarvesterRunning
                        ? 'bg-red-600 hover:bg-red-500 text-white'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
                    }`}
                  >
                    {isHarvesterRunning ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin text-white" />
                        <span>Stop Harvester</span>
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 text-white" />
                        <span>Start Full Automation</span>
                      </>
                    )}
                  </button>

                  {isHarvesterRunning && (
                    <button
                      onClick={handleTogglePause}
                      className="flex items-center space-x-1.5 px-3 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700"
                    >
                      {isHarvesterPaused ? (
                        <>
                          <Play className="h-3.5 w-3.5 text-emerald-400" />
                          <span>Resume</span>
                        </>
                      ) : (
                        <>
                          <Pause className="h-3.5 w-3.5 text-amber-400" />
                          <span>Pause</span>
                        </>
                      )}
                    </button>
                  )}

                  <button
                    onClick={handleDownloadHarvesterBundle}
                    className="flex items-center space-x-1.5 px-3 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium shadow-sm transition-colors"
                  >
                    <FolderDown className="h-3.5 w-3.5" />
                    <span>Download engine-harvester Repo</span>
                  </button>
                </div>
              </div>

              {/* Stats Counters */}
              <div className="mt-6 grid grid-cols-2 sm:grid-cols-5 gap-3 pt-6 border-t border-slate-800/80">
                <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-850">
                  <div className="text-[11px] text-slate-400 font-medium">Discovered Targets</div>
                  <div className="text-lg font-bold text-white mt-1">{harvesterTelemetry.totalDiscovered}</div>
                </div>

                <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-850">
                  <div className="text-[11px] text-slate-400 font-medium">Completed &amp; Sanitized</div>
                  <div className="text-lg font-bold text-emerald-400 mt-1">{harvesterTelemetry.totalProcessed}</div>
                </div>

                <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-850">
                  <div className="text-[11px] text-slate-400 font-medium">Blacklisted / Processed</div>
                  <div className="text-lg font-bold text-amber-400 mt-1">{harvesterTelemetry.totalBlacklisted}</div>
                </div>

                <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-850">
                  <div className="text-[11px] text-slate-400 font-medium">Errors Recovered</div>
                  <div className="text-lg font-bold text-cyan-400 mt-1">{harvesterTelemetry.totalErrorsRecovered}</div>
                </div>

                <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-850">
                  <div className="text-[11px] text-slate-400 font-medium">Total Cooldown Time</div>
                  <div className="text-lg font-bold text-indigo-300 mt-1">
                    {(harvesterTelemetry.totalCooldownMs / 1000).toFixed(0)}s
                  </div>
                </div>
              </div>
            </div>

            {/* Cooldown Settings & Manual Ingestion */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Cooldown Timer Controls */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-xs font-bold text-amber-300">
                    <Clock className="h-4 w-4 text-amber-400" />
                    <span>Cool-Down Timer Anywhere Configurator</span>
                  </div>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    Live Reactive
                  </span>
                </div>

                <div className="space-y-4 text-xs">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-slate-300">
                      <span>Intra-Repository Step Cooldown (during single repo analysis)</span>
                      <span className="font-mono text-amber-400 font-bold">{intraCooldown}ms</span>
                    </div>
                    <input
                      type="range"
                      min="500"
                      max="5000"
                      step="250"
                      value={intraCooldown}
                      onChange={(e) => setIntraCooldown(Number(e.target.value))}
                      className="w-full accent-amber-400 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>Fast (500ms)</span>
                      <span>Safe (1,500ms)</span>
                      <span>Stealth (5,000ms)</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-slate-300">
                      <span>Inter-Repository Safety Cooldown (between consecutive repos)</span>
                      <span className="font-mono text-amber-400 font-bold">{(interCooldown / 1000).toFixed(1)}s</span>
                    </div>
                    <input
                      type="range"
                      min="2000"
                      max="30000"
                      step="1000"
                      value={interCooldown}
                      onChange={(e) => setInterCooldown(Number(e.target.value))}
                      className="w-full accent-amber-400 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>2s</span>
                      <span>Safe (6s)</span>
                      <span>High-Safety (30s)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Add Custom Repository & Quick Blacklist */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center space-x-2 text-xs font-bold text-indigo-300">
                  <PlusCircle className="h-4 w-4 text-indigo-400" />
                  <span>Add Target Repository to Crawl Queue</span>
                </div>

                <form onSubmit={handleAddRepo} className="flex gap-2">
                  <input
                    type="text"
                    value={newRepoInput}
                    onChange={(e) => setNewRepoInput(e.target.value)}
                    placeholder="e.g. deepseek-ai/deepseek-harness or github URL"
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                  >
                    Queue Target
                  </button>
                </form>

                <div className="pt-2 border-t border-slate-800/80 space-y-2">
                  <div className="flex items-center space-x-2 text-xs font-bold text-slate-400">
                    <ShieldAlert className="h-4 w-4 text-red-400" />
                    <span>Manually Blacklist a Repository</span>
                  </div>
                  <form onSubmit={handleManualBlacklist} className="flex gap-2">
                    <input
                      type="text"
                      value={manualBlacklistInput}
                      onChange={(e) => setManualBlacklistInput(e.target.value)}
                      placeholder="e.g. owner/repo to permanently exclude"
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-red-500"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-red-950 text-red-300 text-xs font-medium border border-red-900/60 transition-colors cursor-pointer"
                    >
                      Blacklist
                    </button>
                  </form>
                </div>
              </div>
            </div>

            {/* Live Queue & Pipeline Progress */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
              <div className="p-4 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Activity className="h-4 w-4 text-indigo-400" />
                  <h3 className="text-sm font-semibold text-white">Automated Discovery &amp; Processing Queue</h3>
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  {crawlJobs.filter((j) => j.status === 'completed').length} / {crawlJobs.length} Completed
                </span>
              </div>

              <div className="divide-y divide-slate-800 max-h-96 overflow-y-auto">
                {crawlJobs.map((job) => {
                  const isCurrent = harvesterTelemetry.currentActiveJobId === job.id;
                  return (
                    <div
                      key={job.id}
                      className={`p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 transition-colors ${
                        isCurrent ? 'bg-indigo-950/20 ring-1 ring-inset ring-indigo-500/50' : 'hover:bg-slate-900/40'
                      }`}
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-bold text-white font-mono">{job.repoFullName}</span>
                          {job.status === 'completed' && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800">
                              Completed &amp; Sanitized
                            </span>
                          )}
                          {job.status === 'blacklisted' && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-700">
                              In Blacklist
                            </span>
                          )}
                          {job.status === 'crawling' && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-950 text-indigo-300 border border-indigo-800 flex items-center space-x-1">
                              <RefreshCw className="h-3 w-3 animate-spin" />
                              <span>Scanning</span>
                            </span>
                          )}
                          {job.status === 'error_recovering' && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-950 text-amber-300 border border-amber-800 flex items-center space-x-1">
                              <AlertCircle className="h-3 w-3" />
                              <span>Retry #{job.retryCount}</span>
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400">{job.currentStepMessage}</p>
                      </div>

                      {/* Progress & Actions */}
                      <div className="flex items-center space-x-3">
                        <div className="w-28 bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                          <div
                            className={`h-full transition-all ${
                              job.status === 'completed' ? 'bg-emerald-400' : 'bg-indigo-500'
                            }`}
                            style={{ width: `${job.progressPercent}%` }}
                          />
                        </div>

                        {job.status === 'completed' && (
                          <div className="flex items-center space-x-1.5">
                            {job.githubPushResult && job.githubPushResult.success && (
                              <a
                                href={job.githubPushResult.commitUrl || `https://github.com/${job.githubPushResult.repo}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2 py-1 rounded bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 text-xs font-mono border border-emerald-800 flex items-center space-x-1"
                                title="View commit on GitHub"
                              >
                                <UploadCloud className="h-3 w-3 text-emerald-400" />
                                <span>Pushed ({job.githubPushResult.commitSha?.slice(0, 7) || 'commit'})</span>
                                <ExternalLink className="h-2.5 w-2.5" />
                              </a>
                            )}
                            <button
                              onClick={() => {
                                setPushDialogData({
                                  isOpen: true,
                                  engineName: job.sanitizedTitle || job.name,
                                  sourceRepo: job.repoFullName,
                                  markdownContent: job.markdownOutput || '',
                                });
                              }}
                              className="px-2 py-1 rounded bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 text-xs font-medium border border-indigo-800 flex items-center space-x-1 cursor-pointer"
                              title="Push files to GitHub repository"
                            >
                              <UploadCloud className="h-3 w-3" />
                              <span>Push</span>
                            </button>
                            <button
                              onClick={() => {
                                setSelectedSystemId(job.id);
                                if (job.markdownOutput) {
                                  setCustomMarkdown(job.markdownOutput);
                                }
                                setActiveTab('markdown');
                              }}
                              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-indigo-300 text-xs font-medium border border-slate-700 flex items-center space-x-1 cursor-pointer"
                            >
                              <Eye className="h-3 w-3" />
                              <span>View .md</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent Automated GitHub Pushes Ledger */}
            {harvesterTelemetry.recentPushes && harvesterTelemetry.recentPushes.length > 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
                <div className="p-4 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FolderGit2 className="h-4 w-4 text-emerald-400" />
                    <h3 className="text-sm font-semibold text-white">Recent Automated GitHub Pushes</h3>
                  </div>
                  <span className="text-xs font-mono text-emerald-400">
                    {harvesterTelemetry.totalPushedToGithub} Total Commits Pushed
                  </span>
                </div>
                <div className="divide-y divide-slate-800 max-h-60 overflow-y-auto">
                  {harvesterTelemetry.recentPushes.map((p) => (
                    <div key={p.id} className="p-3 flex items-center justify-between text-xs hover:bg-slate-900/40">
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-white">{p.engineName}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                            {p.filesPushedCount} files (.md &amp; .ts)
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          Target: <span className="text-slate-200">{p.targetRepo}</span> ({p.branch}) &bull; Source: {p.sourceRepo}
                        </div>
                      </div>
                      <a
                        href={p.commitUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-1 text-emerald-400 hover:text-emerald-300 font-mono text-[11px] px-2.5 py-1 rounded bg-slate-800 border border-slate-700"
                      >
                        <span>{p.commitSha.slice(0, 7)}</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Persistent Blacklist Registry */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
              <div className="p-4 border-b border-slate-800 bg-slate-900/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <History className="h-4 w-4 text-amber-400" />
                    <h3 className="text-sm font-semibold text-white">Persistent Blacklist &amp; Processed Registry</h3>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Stores every repository completed, permanently blacklisted, or filtered to guarantee zero redundant calls.
                  </p>
                </div>

                <div className="relative min-w-[220px]">
                  <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-500" />
                  <input
                    type="text"
                    value={blacklistSearch}
                    onChange={(e) => setBlacklistSearch(e.target.value)}
                    placeholder="Search blacklist..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="divide-y divide-slate-800 max-h-64 overflow-y-auto">
                {blacklistEntries.map((b, idx) => (
                  <div key={idx} className="p-3.5 flex items-center justify-between hover:bg-slate-950/40 text-xs">
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-white">{b.repoFullName}</span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                            b.status === 'completed'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : 'bg-red-950 text-red-300 border border-red-800'
                          }`}
                        >
                          {b.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {b.sanitizedName || b.reason || 'Recorded in blacklist'}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] text-slate-500">
                        {new Date(b.processedAt).toLocaleTimeString()}
                      </span>
                      <button
                        onClick={() => harvester.removeBlacklistEntry(b.repoFullName)}
                        title="Remove from blacklist"
                        className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: ENGINE CATALOGUE                                                  */}
        {/* ========================================================================= */}
        {activeTab === 'catalog' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 rounded-xl p-6 relative overflow-hidden">
              <div className="max-w-3xl space-y-2">
                <div className="inline-flex items-center space-x-2 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-medium">
                  <ShieldCheck className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Sanitized Engine Specification</span>
                </div>
                <h2 className="text-xl font-bold tracking-tight text-white">
                  Catalogue of Isolated Agent Engines
                </h2>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Every entry below strips vendor names and repository marketing wrappers, presenting{' '}
                  <strong className="text-indigo-200">ONLY the core runtime engine</strong>,{' '}
                  <strong className="text-indigo-200">what it does</strong>, and its{' '}
                  <strong className="text-indigo-200">complete production code</strong> formatted as a single, exportable{' '}
                  <code className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 text-xs font-mono">.md</code> file.
                </p>
              </div>

              <div className="mt-4 flex flex-wrap gap-3 items-center">
                <button
                  onClick={() => {
                    handleDownloadMarkdown(
                      currentSystem.fullMarkdownContent,
                      `${currentSystem.id}-sanitized-engines.md`
                    );
                  }}
                  className="flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition-all cursor-pointer"
                >
                  <Download className="h-4 w-4" />
                  <span>Download Current Engine (.md)</span>
                </button>

                <button
                  onClick={() => handleCopyText(currentSystem.fullMarkdownContent, 'full-md')}
                  className="flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-all cursor-pointer"
                >
                  {copiedSection === 'full-md' ? (
                    <>
                      <Check className="h-4 w-4 text-emerald-400" />
                      <span className="text-emerald-300">Copied to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 text-slate-400" />
                      <span>Copy Full .md</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => {
                    setCustomMarkdown(currentSystem.fullMarkdownContent);
                    setActiveTab('markdown');
                  }}
                  className="flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-indigo-900/60 hover:bg-indigo-800/80 text-indigo-200 text-xs font-medium border border-indigo-700/60 transition-all cursor-pointer"
                >
                  <Eye className="h-4 w-4" />
                  <span>Open in .md Inspector</span>
                </button>

                <button
                  onClick={() => {
                    setPushDialogData({
                      isOpen: true,
                      engineName: currentSystem.title,
                      sourceRepo: currentSystem.sourceRepo,
                      markdownContent: currentSystem.fullMarkdownContent,
                    });
                  }}
                  className="flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-all cursor-pointer"
                >
                  <UploadCloud className="h-4 w-4" />
                  <span>Push to GitHub Repo</span>
                </button>
              </div>
            </div>

            {/* System Selector Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {catalogList.map((entry, idx) => {
                const isSelected = entry.id === selectedSystemId;
                return (
                  <div
                    key={`${entry.id}-${idx}`}
                    onClick={() => {
                      setSelectedSystemId(entry.id);
                      setCustomMarkdown(entry.fullMarkdownContent);
                    }}
                    className={`cursor-pointer rounded-xl border p-4 transition-all ${
                      isSelected
                        ? 'bg-slate-900 border-indigo-500 shadow-lg shadow-indigo-900/20 ring-1 ring-indigo-500'
                        : 'bg-slate-900/50 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <span className="text-[11px] font-mono text-slate-400 block truncate max-w-[200px]">
                          {entry.sourceRepo}
                        </span>
                        <h3 className="font-semibold text-sm text-white group-hover:text-indigo-300">
                          {entry.title}
                        </h3>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                        {entry.engines.length} Engines
                      </span>
                    </div>

                    <p className="mt-2 text-xs text-slate-400 line-clamp-2">{entry.summary}</p>

                    <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                      <span className="text-amber-300/90 font-mono">
                        Sanitized: <span className="line-through text-slate-500">{entry.originalBrand}</span>
                      </span>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPushDialogData({
                              isOpen: true,
                              engineName: entry.title,
                              sourceRepo: entry.sourceRepo,
                              markdownContent: entry.fullMarkdownContent,
                            });
                          }}
                          className="px-2 py-0.5 rounded bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 border border-indigo-800 text-[10px] font-medium flex items-center space-x-1 cursor-pointer"
                          title="Push this engine to GitHub"
                        >
                          <UploadCloud className="h-3 w-3 text-emerald-400" />
                          <span>Push</span>
                        </button>
                        <span className="text-indigo-400 font-medium flex items-center space-x-1">
                          <span>Inspect</span>
                          <ArrowRight className="h-3 w-3" />
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Selected System Details */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
              <div className="p-5 border-b border-slate-800 bg-slate-900/80 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-bold text-white">{currentSystem.title}</h3>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-indigo-950 text-indigo-300 border border-indigo-800">
                      {currentSystem.genericCategory}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 flex items-center space-x-2">
                    <span>Source Repository:</span>
                    <a
                      href={currentSystem.sourceRepo}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-400 hover:underline flex items-center space-x-1"
                    >
                      <span>{currentSystem.sourceRepo}</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </p>
                </div>

                <div className="relative min-w-[240px]">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search extracted engines..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Engines List */}
              <div className="divide-y divide-slate-800">
                {currentSystem.engines.map((engine, idx) => (
                  <div key={idx} className="p-6 hover:bg-slate-900/30 transition-colors">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                      <div className="space-y-3 flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="h-6 w-6 rounded-md bg-indigo-950 border border-indigo-800 flex items-center justify-center text-xs font-bold text-indigo-300">
                            {idx + 1}
                          </span>
                          <h4 className="text-base font-semibold text-white">{engine.name}</h4>
                          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                            {engine.role}
                          </span>
                        </div>

                        {/* What It Does */}
                        <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-4 space-y-2">
                          <div className="flex items-center space-x-1.5 text-xs font-bold text-amber-300 uppercase tracking-wider">
                            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                            <span>What It Does</span>
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed">{engine.whatItDoes}</p>
                          {engine.inputsOutputs && (
                            <div className="pt-2 text-[11px] text-slate-400 border-t border-slate-900 font-mono">
                              <strong className="text-indigo-300">I/O Contract:</strong> {engine.inputsOutputs}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 lg:self-start">
                        <button
                          onClick={() => handleCopyText(engine.codeSnippet, `eng-${idx}`)}
                          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
                        >
                          {copiedSection === `eng-${idx}` ? (
                            <>
                              <Check className="h-3.5 w-3.5 text-emerald-400" />
                              <span className="text-emerald-300">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5 text-slate-400" />
                              <span>Copy Code</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="bg-slate-950 border border-slate-800 rounded-lg overflow-hidden">
                        <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
                          <span>Sanitized Engine Code</span>
                          <span className="text-emerald-400 text-[11px]">Clean-Room Standard</span>
                        </div>
                        <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto leading-relaxed max-h-72">
                          <code>{engine.codeSnippet}</code>
                        </pre>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: MARKDOWN INSPECTOR                                                */}
        {/* ========================================================================= */}
        {activeTab === 'markdown' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <FileText className="h-4 w-4 text-indigo-400" />
                  <h2 className="text-sm font-bold text-white">
                    {currentSystem.title} — Sanitized Engine .md
                  </h2>
                </div>
                <p className="text-xs text-slate-400">
                  Ready to export or drop directly into your engineering documentation repository.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <div className="flex rounded-lg bg-slate-950 p-1 border border-slate-800 text-xs">
                  <button
                    onClick={() => setMarkdownViewMode('split')}
                    className={`px-2.5 py-1 rounded font-medium ${
                      markdownViewMode === 'split' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Split View
                  </button>
                  <button
                    onClick={() => setMarkdownViewMode('raw')}
                    className={`px-2.5 py-1 rounded font-medium ${
                      markdownViewMode === 'raw' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Raw Markdown
                  </button>
                  <button
                    onClick={() => setMarkdownViewMode('rendered')}
                    className={`px-2.5 py-1 rounded font-medium ${
                      markdownViewMode === 'rendered' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Formatted
                  </button>
                </div>

                <button
                  onClick={() => handleCopyText(activeMarkdownToDisplay, 'inspector-copy')}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
                >
                  {copiedSection === 'inspector-copy' ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="text-emerald-300">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 text-slate-400" />
                      <span>Copy .md</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() =>
                    handleDownloadMarkdown(activeMarkdownToDisplay, `${currentSystem.id}-sanitized-engines.md`)
                  }
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition-all cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download .md</span>
                </button>

                <button
                  onClick={() => {
                    setPushDialogData({
                      isOpen: true,
                      engineName: currentSystem.title,
                      sourceRepo: currentSystem.sourceRepo,
                      markdownContent: activeMarkdownToDisplay,
                    });
                  }}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-all cursor-pointer"
                >
                  <UploadCloud className="h-3.5 w-3.5" />
                  <span>Push to GitHub Repo</span>
                </button>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <div
                className={`grid ${
                  markdownViewMode === 'split'
                    ? 'grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-800'
                    : 'grid-cols-1'
                }`}
              >
                {(markdownViewMode === 'split' || markdownViewMode === 'raw') && (
                  <div className="flex flex-col">
                    <div className="px-4 py-2 bg-slate-950/80 border-b border-slate-800 text-xs font-mono text-slate-400 flex items-center justify-between">
                      <span>Source .md (Complete Engine Code &amp; Specifications)</span>
                      <span className="text-[11px] text-slate-500">
                        {activeMarkdownToDisplay.split('\n').length} lines
                      </span>
                    </div>
                    <pre className="p-4 text-xs font-mono text-slate-300 bg-slate-950 overflow-x-auto leading-relaxed max-h-[700px] overflow-y-auto whitespace-pre-wrap">
                      <code>{activeMarkdownToDisplay}</code>
                    </pre>
                  </div>
                )}

                {(markdownViewMode === 'split' || markdownViewMode === 'rendered') && (
                  <div className="flex flex-col bg-slate-900">
                    <div className="px-4 py-2 bg-slate-950/80 border-b border-slate-800 text-xs font-mono text-slate-400 flex items-center justify-between">
                      <span>Rendered Architecture Document</span>
                      <span className="text-[11px] text-emerald-400">Sanitized View</span>
                    </div>
                    <div className="p-6 overflow-y-auto max-h-[700px] space-y-6 text-sm text-slate-200">
                      <div className="border-b border-slate-800 pb-4">
                        <h1 className="text-xl font-bold text-white mb-2">{currentSystem.title}</h1>
                        <p className="text-xs text-amber-300/90 font-mono">
                          Sanitized from: {currentSystem.sourceRepo}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <h2 className="text-base font-semibold text-white">System Composition &amp; Overview</h2>
                        <p className="text-xs text-slate-300 leading-relaxed">{currentSystem.summary}</p>
                      </div>

                      <div className="space-y-6">
                        {currentSystem.engines.map((eng, idx) => (
                          <div key={idx} className="border border-slate-800 rounded-lg p-4 bg-slate-950/60 space-y-3">
                            <div className="flex items-center justify-between">
                              <h3 className="text-sm font-bold text-white">
                                Engine {idx + 1}: {eng.name}
                              </h3>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-indigo-300">
                                {eng.role}
                              </span>
                            </div>

                            <div className="space-y-1">
                              <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider">What it does</h4>
                              <p className="text-xs text-slate-300 leading-relaxed">{eng.whatItDoes}</p>
                            </div>

                            <div className="space-y-1">
                              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                Implementation Code
                              </h4>
                              <pre className="p-3 bg-slate-950 border border-slate-850 rounded text-[11px] font-mono text-slate-300 overflow-x-auto">
                                <code>{eng.codeSnippet}</code>
                              </pre>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: LIVE ENGINE TEST (PLAYGROUND)                                     */}
        {/* ========================================================================= */}
        {activeTab === 'playground' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <div className="max-w-3xl space-y-2">
                <div className="inline-flex items-center space-x-2 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium">
                  <Terminal className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Sanitized Engine Verification</span>
                </div>
                <h2 className="text-xl font-bold tracking-tight text-white">
                  Execute the Reconstructed Engines in Real Time
                </h2>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Verify that the sanitized engines actually execute tasks with complete isolation, zero host access,
                  and clean trajectory capturing.
                </p>
              </div>

              <div className="mt-4 space-y-2">
                <label className="text-xs font-medium text-slate-300">Task Objective for the Sanitized Engine</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={taskPrompt}
                    onChange={(e) => setTaskPrompt(e.target.value)}
                    placeholder="Enter task objective..."
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    onClick={handleRunPlayground}
                    disabled={isRunningPlayground}
                    className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md transition-all cursor-pointer"
                  >
                    {isRunningPlayground ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        <span>Running Loop...</span>
                      </>
                    ) : (
                      <>
                        <Play className="h-3.5 w-3.5" />
                        <span>Execute Engine</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
                <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs font-mono">
                  <span className="text-amber-300 flex items-center space-x-1.5">
                    <Brain className="h-3.5 w-3.5" />
                    <span>Engine Reasoning &amp; Status</span>
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300">
                    Status: {agentStatus}
                  </span>
                </div>
                <div className="p-4 bg-slate-950 flex-1 min-h-[260px] font-mono text-xs text-slate-300 space-y-2 overflow-y-auto">
                  {streamedThought && (
                    <div className="p-2.5 rounded bg-slate-900 border border-slate-800 text-amber-200/90 whitespace-pre-wrap">
                      {streamedThought}
                    </div>
                  )}
                  {streamedText && (
                    <div className="p-2.5 rounded bg-indigo-950/40 border border-indigo-900/60 text-indigo-200 whitespace-pre-wrap">
                      {streamedText}
                    </div>
                  )}
                  {!streamedThought && !streamedText && (
                    <div className="text-slate-600 italic">Click "Execute Engine" to observe live ReAct cycle.</div>
                  )}
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
                <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs font-mono">
                  <span className="text-emerald-300 flex items-center space-x-1.5">
                    <Terminal className="h-3.5 w-3.5" />
                    <span>Trajectory Steps &amp; Sandboxed Tools</span>
                  </span>
                  <span className="text-[10px] text-slate-400">{playgroundTrajectory.length} Steps Recorded</span>
                </div>
                <div className="p-4 bg-slate-950 flex-1 min-h-[260px] font-mono text-xs text-slate-300 space-y-3 overflow-y-auto">
                  {playgroundTrajectory.length === 0 ? (
                    <div className="text-slate-600 italic">No trajectory steps recorded yet.</div>
                  ) : (
                    playgroundTrajectory.map((step, idx) => (
                      <div key={idx} className="border border-slate-800 rounded p-3 bg-slate-900/60 space-y-2">
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span className="font-bold text-indigo-300">Step {step.stepNumber}</span>
                          <span>{step.durationMs}ms</span>
                        </div>
                        {step.toolCalls.map((tc, tcIdx) => (
                          <div key={tcIdx} className="text-[11px] bg-slate-950 p-2 rounded border border-slate-850">
                            <div className="text-amber-400 font-bold">tool: {tc.name}</div>
                            <pre className="text-slate-400 overflow-x-auto">{JSON.stringify(tc.args, null, 2)}</pre>
                          </div>
                        ))}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-4 px-4 text-center text-xs text-slate-500">
        engine-harvester — Single-repository autonomous GitHub engine crawler, persistent blacklist, and sanitized Markdown catalogue.
      </footer>

      {/* Manual & Quick GitHub Push Dialog */}
      {pushDialogData && (
        <GitHubPushDialog
          isOpen={pushDialogData.isOpen}
          onClose={() => setPushDialogData(null)}
          engineName={pushDialogData.engineName}
          sourceRepo={pushDialogData.sourceRepo}
          markdownContent={pushDialogData.markdownContent}
          defaultTargetRepo={githubTargetRepo}
          defaultBranch={githubTargetBranch}
          githubToken={githubToken}
          onPushSuccess={() => {
            // Refresh telemetry pushes
            harvester.updateConfig({
              autoPushToGithub: autoPushEnabled,
              githubToken,
              githubTargetRepo,
              githubTargetBranch,
            });
          }}
        />
      )}
    </div>
  );
}
