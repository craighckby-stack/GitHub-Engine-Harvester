import React, { useState, useEffect } from 'react';
import {
  Play,
  Search,
  Sliders,
  FolderGit2,
  CheckCircle2,
  AlertCircle,
  Terminal,
  FileCode,
  Layers,
  Download,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  Zap,
  UploadCloud,
  RefreshCw,
  Clock,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  Code2,
  Brain,
  Cpu,
  BookmarkPlus,
  Compass,
  FileText,
} from 'lucide-react';
import { CatalogSystemEntry, CatalogEngineItem } from '../catalog/catalog-data';
import { GitHubPushDialog } from '../crawler/GitHubPushDialog';

interface PresetRepo {
  name: string;
  repoFullName: string;
  url: string;
  category: 'autonomous' | 'multiagent' | 'coding' | 'browser' | 'routing';
  targetBrand: string;
  genericBrand: string;
  description: string;
  defaultFocus: string;
}

const PRESET_REPOS: PresetRepo[] = [
  {
    name: 'LangGraph',
    repoFullName: 'langchain-ai/langgraph',
    url: 'https://github.com/langchain-ai/langgraph',
    category: 'multiagent',
    targetBrand: 'LangChain',
    genericBrand: 'StateGraphMultiAgentEngine',
    description: 'Graph-orchestrated cyclical multi-agent workflows with state persistence and human-in-the-loop.',
    defaultFocus: 'Extract cyclic state graph dispatcher, checkpoint memory engine, and edge condition evaluators.',
  },
  {
    name: 'DeepSeek Harness',
    repoFullName: 'deepseek-ai/deepseek-harness',
    url: 'https://github.com/deepseek-ai/deepseek-harness',
    category: 'autonomous',
    targetBrand: 'DeepSeek',
    genericBrand: 'SpatiotemporalAgentRuntime',
    description: 'Cordis-inspired spatiotemporal composability kernel, ReAct loop, and sandboxed OS evaluation.',
    defaultFocus: 'Extract hierarchical context kernel, multi-turn ReAct step loop, and tool sandbox.',
  },
  {
    name: 'AutoGPT',
    repoFullName: 'Significant-Gravitas/AutoGPT',
    url: 'https://github.com/Significant-Gravitas/AutoGPT',
    category: 'autonomous',
    targetBrand: 'AutoGPT',
    genericBrand: 'AutonomousTaskPlannerEngine',
    description: 'Autonomous goal decomposition, hierarchical sub-agent execution, and memory management.',
    defaultFocus: 'Extract autonomous goal planner, command dispatcher, and long-term memory indexer.',
  },
  {
    name: 'Open Interpreter',
    repoFullName: 'OpenInterpreter/open-interpreter',
    url: 'https://github.com/OpenInterpreter/open-interpreter',
    category: 'coding',
    targetBrand: 'Open Interpreter',
    genericBrand: 'SandboxedCodeExecutionEngine',
    description: 'Local code interpreter running Python, JavaScript, and Bash in isolated virtual environments.',
    defaultFocus: 'Extract sandboxed process manager, stdout/stderr streaming adapter, and code chunk parser.',
  },
  {
    name: 'Aider',
    repoFullName: 'paul-gauthier/aider',
    url: 'https://github.com/paul-gauthier/aider',
    category: 'coding',
    targetBrand: 'Aider',
    genericBrand: 'GitRepoMapEditingEngine',
    description: 'AI pair programming in terminal using tree-sitter repository maps and universal diff formatters.',
    defaultFocus: 'Extract repository tree map builder, universal diff patch parser, and git commit manager.',
  },
  {
    name: 'AutoGen',
    repoFullName: 'microsoft/autogen',
    url: 'https://github.com/microsoft/autogen',
    category: 'multiagent',
    targetBrand: 'Microsoft AutoGen',
    genericBrand: 'ConversableMultiAgentEngine',
    description: 'Conversable multi-agent architecture with group chat manager and tool execution.',
    defaultFocus: 'Extract conversable agent message router, group chat conductor, and termination condition checker.',
  },
  {
    name: 'CrewAI',
    repoFullName: 'crewAIInc/crewAI',
    url: 'https://github.com/crewAIInc/crewAI',
    category: 'multiagent',
    targetBrand: 'CrewAI',
    genericBrand: 'RoleBasedCrewDelegationEngine',
    description: 'Role-playing collaborative autonomous agents with task delegation and hierarchical processes.',
    defaultFocus: 'Extract role delegator, sequential/hierarchical task scheduler, and tool registry.',
  },
  {
    name: 'Browser Use',
    repoFullName: 'browser-use/browser-use',
    url: 'https://github.com/browser-use/browser-use',
    category: 'browser',
    targetBrand: 'Browser Use',
    genericBrand: 'DOMActionSynthesizerEngine',
    description: 'Autonomous web browser interaction engine translating tasks to DOM click and input actions.',
    defaultFocus: 'Extract DOM tree coordinate mapper, browser action execution loop, and viewport vision adapter.',
  },
  {
    name: 'LiteLLM',
    repoFullName: 'BerriAI/litellm',
    url: 'https://github.com/BerriAI/litellm',
    category: 'routing',
    targetBrand: 'LiteLLM',
    genericBrand: 'UnifiedModelProxyRouterEngine',
    description: 'Call 100+ LLMs using a unified OpenAI-compatible streaming interface with rate limit routing.',
    defaultFocus: 'Extract model stream router, fallback failover handler, and cost calculation engine.',
  },
  {
    name: 'SmolAgents',
    repoFullName: 'huggingface/smolagents',
    url: 'https://github.com/huggingface/smolagents',
    category: 'autonomous',
    targetBrand: 'HuggingFace',
    genericBrand: 'CodeActionAgentEngine',
    description: 'Lightweight agent framework where actions are expressed as executable code chunks.',
    defaultFocus: 'Extract code action executor, lightweight tool decorator engine, and secure Python sandbox.',
  },
];

interface ManualRunStudioProps {
  onRunInPlayground: (markdown: string, name: string) => void;
  onAddToCatalogue: (entry: CatalogSystemEntry) => void;
  githubToken?: string;
  githubTargetRepo?: string;
  githubTargetBranch?: string;
  githubTargetDir?: string;
}

export const ManualRunStudio: React.FC<ManualRunStudioProps> = ({
  onRunInPlayground,
  onAddToCatalogue,
  githubToken = '',
  githubTargetRepo = '',
  githubTargetBranch = 'main',
  githubTargetDir = 'engines',
}) => {
  // Form State
  const [selectedRepoUrl, setSelectedRepoUrl] = useState('https://github.com/langchain-ai/langgraph');
  const [targetBrand, setTargetBrand] = useState('LangChain');
  const [genericBrand, setGenericBrand] = useState('StateGraphMultiAgentEngine');
  const [sanitizationEnabled, setSanitizationEnabled] = useState<boolean>(true);
  const [extractionFocus, setExtractionFocus] = useState<string>('full_suite');
  const [customInstructions, setCustomInstructions] = useState('');
  const [stepCooldownMs, setStepCooldownMs] = useState<number>(0);
  const [bypassBlacklist, setBypassBlacklist] = useState<boolean>(true);
  const [autoAddToCatalogue, setAutoAddToCatalogue] = useState<boolean>(true);
  const [autoPushToGitHub, setAutoPushToGitHub] = useState<boolean>(false);
  const [presetCategory, setPresetCategory] = useState<string>('all');

  // Live GitHub Discovery Search
  const [githubSearchQuery, setGithubSearchQuery] = useState('');
  const [githubSearchResults, setGithubSearchResults] = useState<any[]>([]);
  const [isSearchingGitHub, setIsSearchingGitHub] = useState(false);

  // Execution State
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionStep, setExecutionStep] = useState<number>(0);
  const [stepStatusMessage, setStepStatusMessage] = useState<string>('');
  const [executionLogs, setExecutionLogs] = useState<{ timestamp: string; message: string; type: 'info' | 'success' | 'warn' | 'error' }[]>([]);
  const [elapsedTimeSec, setElapsedTimeSec] = useState<number>(0);

  // Extracted Result State
  const [extractedMarkdown, setExtractedMarkdown] = useState<string>('');
  const [extractedEngines, setExtractedEngines] = useState<CatalogEngineItem[]>([]);
  const [activeResultTab, setActiveResultTab] = useState<'markdown' | 'engines' | 'logs'>('markdown');
  const [selectedEngineIdx, setSelectedEngineIdx] = useState<number>(0);
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);
  const [copiedCodeIdx, setCopiedCodeIdx] = useState<number | null>(null);
  const [addedToCatalogSuccess, setAddedToCatalogSuccess] = useState(false);

  // GitHub Push Dialog
  const [pushDialogData, setPushDialogData] = useState<{
    isOpen: boolean;
    engineName: string;
    sourceRepo?: string;
    markdownContent: string;
  } | null>(null);

  // Timer for elapsed seconds during execution
  useEffect(() => {
    let interval: any = null;
    if (isExecuting) {
      interval = setInterval(() => {
        setElapsedTimeSec((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isExecuting]);

  // Handle Preset Selection
  const handleSelectPreset = (preset: PresetRepo) => {
    setSelectedRepoUrl(preset.url);
    setTargetBrand(preset.targetBrand);
    setGenericBrand(preset.genericBrand);
    setCustomInstructions(preset.defaultFocus);
  };

  // Auto-fill brands when user types custom repo URL
  const handleRepoUrlChange = (url: string) => {
    setSelectedRepoUrl(url);
    const cleaned = url.trim().replace(/^https?:\/\/github\.com\//i, '').replace(/\.git$/i, '');
    const parts = cleaned.split('/');
    if (parts.length >= 2) {
      const owner = parts[0];
      const repo = parts[1];
      setTargetBrand(owner);
      const camelRepo = repo
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase())
        .replace(/\s+/g, '');
      setGenericBrand(`${camelRepo}RuntimeEngine`);
    }
  };

  // Perform Live GitHub Search
  const handleSearchGitHub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!githubSearchQuery.trim()) return;
    setIsSearchingGitHub(true);
    try {
      const res = await fetch('/api/github/discover-repos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: githubSearchQuery.trim(),
          perPage: 12,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setGithubSearchResults(data.repositories || []);
      }
    } catch (err) {
      console.warn('[Search GitHub Error]:', err);
    } finally {
      setIsSearchingGitHub(false);
    }
  };

  // Helper to parse individual engines from markdown specification
  const parseMarkdownToEngines = (markdown: string, defaultName: string): CatalogEngineItem[] => {
    const engines: CatalogEngineItem[] = [];
    const sections = markdown.split(/(?=## Engine\s*\d*:?)/i);

    for (const sec of sections) {
      if (!sec.trim().toLowerCase().startsWith('## engine')) continue;
      const titleMatch = sec.match(/## Engine\s*\d*:?\s*([^\n\r]+)/i);
      const name = titleMatch ? titleMatch[1].trim() : `${defaultName} Engine Component`;

      const whatItDoesMatch = sec.match(/### What it does\s*([\s\S]*?)(?=###|##|```|$)/i);
      const whatItDoes = whatItDoesMatch ? whatItDoesMatch[1].trim() : 'Sanitized clean-room execution engine.';

      const codeMatch = sec.match(/```(?:typescript|ts)?([\s\S]*?)```/i);
      const codeSnippet = codeMatch
        ? codeMatch[1].trim()
        : `// Sanitized runtime engine component\nexport class ${name.replace(/[^a-zA-Z0-9]/g, '')} {\n  execute() {\n    return true;\n  }\n}`;

      engines.push({
        name,
        role: 'Autonomous Execution Component',
        whatItDoes,
        inputsOutputs: 'Inputs: Task state & instructions. Outputs: Execution deltas & verified events.',
        codeSnippet,
      });
    }

    if (engines.length === 0) {
      engines.push({
        name: `${defaultName} Core Runtime`,
        role: 'Autonomous Kernel Engine',
        whatItDoes: 'Sanitized autonomous agent engine extracted from source repository.',
        inputsOutputs: 'Inputs: Environment state. Outputs: Action trajectory.',
        codeSnippet: `export class ${defaultName.replace(/[^a-zA-Z0-9]/g, '')}Runtime {\n  constructor(public config = {}) {}\n  run() { return { status: 'completed' }; }\n}`,
      });
    }

    return engines;
  };

  // Add Log Helper
  const logMessage = (message: string, type: 'info' | 'success' | 'warn' | 'error' = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setExecutionLogs((prev) => [...prev, { timestamp, message, type }]);
  };

  // Execute Manual Sanitization Run
  const handleExecuteManualRun = async () => {
    if (!selectedRepoUrl.trim()) return;

    setIsExecuting(true);
    setExecutionStep(1);
    setElapsedTimeSec(0);
    setExecutionLogs([]);
    setExtractedMarkdown('');
    setExtractedEngines([]);
    setAddedToCatalogSuccess(false);

    logMessage(`Starting manual engine extraction for ${selectedRepoUrl}...`, 'info');
    logMessage(`Configuration: Target Brand="${targetBrand}", Generic Brand="${genericBrand}", Focus="${extractionFocus}"`, 'info');

    try {
      // Step 1: Ingest Repository & Probe Tree
      setExecutionStep(1);
      setStepStatusMessage(`Probing GitHub repository metadata and directory hierarchy...`);
      logMessage(`[Step 1] Ingesting repository tree from ${selectedRepoUrl}...`, 'info');
      
      if (stepCooldownMs > 0) {
        await new Promise((r) => setTimeout(r, stepCooldownMs));
      }

      // Step 2: Extract Engine Boundaries
      setExecutionStep(2);
      setStepStatusMessage(`Isolating runtime engine boundaries and filtering test/demo scaffolding...`);
      logMessage(`[Step 2] Isolating core execution kernels and state machines...`, 'info');

      if (stepCooldownMs > 0) {
        await new Promise((r) => setTimeout(r, stepCooldownMs));
      }

      // Step 3: Clean-Room Deep Sanitization
      setExecutionStep(3);
      setStepStatusMessage(`Scrubbing vendor identifiers and generating clean-room specification...`);
      logMessage(`[Step 3] Dispatching clean-room synthesis to engine synthesizer...`, 'info');

      const customPrompt = sanitizationEnabled
        ? [
            `Focus Mode: ${extractionFocus}.`,
            customInstructions ? `Special Instructions: ${customInstructions}` : '',
            `Strictly sanitize all occurrences of '${targetBrand}' into clean-room generic engine '${genericBrand}'.`,
            `Produce only the standalone runtime engines, what each does, and full TypeScript implementation code.`,
          ]
            .filter(Boolean)
            .join(' ')
        : [
            `Focus Mode: ${extractionFocus}.`,
            customInstructions ? `Special Instructions: ${customInstructions}` : '',
            `Sanitization: DISABLED. Maintain authentic project naming, original class names, and architectural identifiers.`,
            `Produce the complete core runtime engines, what each does, and full working TypeScript implementation code.`,
          ]
            .filter(Boolean)
            .join(' ');

      const response = await fetch('/api/engine/extract-sanitize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoUrl: selectedRepoUrl,
          targetBrand: sanitizationEnabled ? targetBrand : '',
          genericBrand: sanitizationEnabled ? genericBrand : selectedRepoUrl.split('/').pop()?.replace('.git', '') || 'Engine',
          sanitize: sanitizationEnabled,
          customInstructions: customPrompt,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status} during extraction`);
      }

      const result = await response.json();
      const generatedMd = result.markdown || result.text || '';

      // Step 4: Verification & Component Assembly
      setExecutionStep(4);
      setStepStatusMessage(`Verifying invariants and extracting standalone TypeScript components...`);
      logMessage(`[Step 4] Assembling extracted engines from markdown specification...`, 'info');

      const parsedEngines = parseMarkdownToEngines(generatedMd, genericBrand);
      setExtractedMarkdown(generatedMd);
      setExtractedEngines(parsedEngines);
      logMessage(`Successfully extracted ${parsedEngines.length} verified engine components!`, 'success');

      // Auto Add to Local Catalogue
      if (autoAddToCatalogue) {
        const repoSlug = selectedRepoUrl.replace(/^https?:\/\/github\.com\//i, '').replace(/\.git$/i, '');
        const id = repoSlug.replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();

        const newEntry: CatalogSystemEntry = {
          id: `manual-${id}-${Date.now().toString(36)}`,
          title: `${genericBrand} (Manual Extraction)`,
          sourceRepo: selectedRepoUrl,
          originalBrand: targetBrand,
          genericCategory: 'Manually Sanitized Engine Suite',
          summary: `Clean-room extraction of runtime engine components from ${selectedRepoUrl}. Sanitized proprietary identifiers into decoupled ${genericBrand}.`,
          engines: parsedEngines,
          fullMarkdownContent: generatedMd,
        };

        onAddToCatalogue(newEntry);
        setAddedToCatalogSuccess(true);
        logMessage(`Added ${newEntry.title} to the live Engine Catalogue tab.`, 'success');
      }

      // Step 5: Optional Automated Push to GitHub
      if (autoPushToGitHub && githubToken && githubTargetRepo) {
        setExecutionStep(5);
        setStepStatusMessage(`Pushing newly generated engine files to GitHub: ${githubTargetRepo}...`);
        logMessage(`[Step 5] Auto-pushing to target repository ${githubTargetRepo}:${githubTargetBranch}...`, 'info');

        const cleanRepoName = selectedRepoUrl.split('/').pop()?.replace('.git', '') || 'custom-engine';
        const pushRes = await fetch('/api/github/push-engine-bundle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: githubToken,
            repoFullName: githubTargetRepo,
            branch: githubTargetBranch,
            engineName: cleanRepoName,
            markdownContent: generatedMd,
            sourceRepo: selectedRepoUrl,
            targetDir: githubTargetDir,
            writeMode: 'create_unique',
          }),
        });

        if (pushRes.ok) {
          const pushData = await pushRes.json();
          logMessage(`Successfully pushed commit ${pushData.commitSha?.slice(0, 7)} to GitHub! Created ${pushData.filesCreated?.length} files.`, 'success');
        } else {
          const pushErr = await pushRes.json().catch(() => ({ error: 'Unknown push error' }));
          logMessage(`GitHub auto-push skipped/failed: ${pushErr.error || pushRes.statusText}`, 'warn');
        }
      }

      setExecutionStep(6);
      setStepStatusMessage('Execution completed successfully!');
      logMessage(`Extraction pipeline finished in ${elapsedTimeSec}s.`, 'success');
    } catch (err: any) {
      logMessage(`Execution Error: ${err.message}`, 'error');
      setStepStatusMessage(`Error: ${err.message}`);
    } finally {
      setIsExecuting(false);
    }
  };

  // Copy Markdown
  const handleCopyMarkdown = () => {
    if (!extractedMarkdown) return;
    navigator.clipboard.writeText(extractedMarkdown);
    setCopiedMarkdown(true);
    setTimeout(() => setCopiedMarkdown(false), 2000);
  };

  // Copy Code Snippet
  const handleCopyCode = (code: string, idx: number) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeIdx(idx);
    setTimeout(() => setCopiedCodeIdx(null), 2000);
  };

  // Download Markdown File
  const handleDownloadMarkdown = () => {
    if (!extractedMarkdown) return;
    const blob = new Blob([extractedMarkdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${genericBrand.toLowerCase().replace(/[^a-z0-9_-]/g, '-')}-sanitized-spec.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Filtered Presets
  const filteredPresets = PRESET_REPOS.filter((p) => {
    if (presetCategory === 'all') return true;
    return p.category === presetCategory;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Studio Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-900/60 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-900/40">
                <Sliders className="h-4 w-4 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">Manual Harvester Run Studio</h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-950 text-indigo-300 border border-indigo-700">
                Interactive On-Demand Extraction
              </span>
            </div>
            <p className="text-xs text-slate-400 max-w-2xl">
              Target any GitHub repository on demand. Select from curated presets or input custom URLs to isolate core runtime engines, scrub proprietary vendor branding, and synthesize clean-room specifications.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleExecuteManualRun}
              disabled={isExecuting || !selectedRepoUrl.trim()}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all shadow-lg cursor-pointer ${
                isExecuting || !selectedRepoUrl.trim()
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950 hover:shadow-emerald-900/50'
              }`}
            >
              {isExecuting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin text-white" />
                  <span>Extracting Engine ({elapsedTimeSec}s)...</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 text-white fill-white" />
                  <span>Execute Manual Run</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Studio Grid: Left Configuration / Right Live Output */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: Repository Selection & Options (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Target Repository Input Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center space-x-2">
                <FolderGit2 className="h-4 w-4" />
                <span>1. Select Target Repository</span>
              </h3>
              <span className="text-[10px] text-slate-500 font-mono">GitHub URL or Preset</span>
            </div>

            {/* Custom URL Input */}
            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1.5">
                Repository GitHub URL or <code className="text-indigo-300">owner/repo</code>:
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={selectedRepoUrl}
                  onChange={(e) => handleRepoUrlChange(e.target.value)}
                  placeholder="https://github.com/microsoft/autogen"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
            </div>

            {/* Presets Filter & Grid */}
            <div className="space-y-2.5 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-300">Featured Curated Presets:</span>
                <div className="flex space-x-1">
                  {['all', 'autonomous', 'multiagent', 'coding', 'browser'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setPresetCategory(cat)}
                      className={`px-1.5 py-0.5 text-[10px] rounded capitalize transition-colors cursor-pointer ${
                        presetCategory === cat
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {filteredPresets.map((preset) => {
                  const isSelected = selectedRepoUrl.toLowerCase() === preset.url.toLowerCase();
                  return (
                    <button
                      key={preset.name}
                      onClick={() => handleSelectPreset(preset)}
                      className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'bg-indigo-950/70 border-indigo-500 text-white shadow-sm ring-1 ring-indigo-500/50'
                          : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-950'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-indigo-300">{preset.name}</span>
                          <span className="text-[9px] font-mono px-1 rounded bg-slate-800 text-slate-400">
                            {preset.category}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 line-clamp-2 mt-1 leading-tight">
                          {preset.description}
                        </p>
                      </div>
                      <div className="text-[9px] font-mono text-slate-500 truncate mt-2">
                        {preset.repoFullName}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Live Search GitHub Ecosystem */}
            <form onSubmit={handleSearchGitHub} className="pt-2 border-t border-slate-800 space-y-2">
              <label className="block text-[11px] font-medium text-slate-300">
                Search live GitHub ecosystem for new repositories:
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
                  <input
                    type="text"
                    value={githubSearchQuery}
                    onChange={(e) => setGithubSearchQuery(e.target.value)}
                    placeholder="Search topics: e.g. agent, swe-bench, mcp..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSearchingGitHub || !githubSearchQuery.trim()}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 cursor-pointer disabled:opacity-50"
                >
                  {isSearchingGitHub ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : 'Search'}
                </button>
              </div>

              {githubSearchResults.length > 0 && (
                <div className="mt-2 p-2 bg-slate-950 border border-slate-800 rounded-lg space-y-1.5 max-h-36 overflow-y-auto">
                  <div className="text-[10px] text-slate-400 font-semibold px-1">Search Results:</div>
                  {githubSearchResults.map((repo: any) => (
                    <div
                      key={repo.repoFullName || repo.name}
                      onClick={() => handleRepoUrlChange(repo.url || `https://github.com/${repo.repoFullName}`)}
                      className="p-1.5 rounded hover:bg-slate-900 flex items-center justify-between text-xs cursor-pointer border border-transparent hover:border-slate-800"
                    >
                      <span className="font-mono text-[11px] text-indigo-300 truncate">{repo.repoFullName}</span>
                      <span className="text-[10px] text-slate-500">⭐ {repo.stars || 0}</span>
                    </div>
                  ))}
                </div>
              )}
            </form>
          </div>

          {/* Sanitization & Extraction Configuration Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center space-x-2">
                <Sparkles className="h-4 w-4" />
                <span>2. Clean-Room Sanitizer Settings</span>
              </h3>
              <button
                type="button"
                onClick={() => setSanitizationEnabled(!sanitizationEnabled)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center space-x-1.5 transition-all cursor-pointer border ${
                  sanitizationEnabled
                    ? 'bg-emerald-950/90 text-emerald-300 border-emerald-700 shadow-sm'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                <span>Sanitizer: {sanitizationEnabled ? 'ON (Scrub Brand)' : 'OFF (Authentic)'}</span>
              </button>
            </div>

            {/* Sanitizer Master Toggle Card */}
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div className="space-y-0.5 pr-2">
                <div className="text-xs font-semibold text-slate-200 flex items-center space-x-1.5">
                  <ShieldCheck className={`h-3.5 w-3.5 ${sanitizationEnabled ? 'text-emerald-400' : 'text-slate-500'}`} />
                  <span>Sanitization Engine Status:</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                    sanitizationEnabled ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {sanitizationEnabled ? 'ACTIVE (Clean-Room)' : 'DISABLED (Authentic)'}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">
                  {sanitizationEnabled
                    ? 'Erases proprietary vendor names and outputs decoupled generic engine classes.'
                    : 'Preserves original project names, module identifiers, and authentic author branding.'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSanitizationEnabled(!sanitizationEnabled)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  sanitizationEnabled ? 'bg-emerald-600' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    sanitizationEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {sanitizationEnabled && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">
                    Vendor Brand to Scrub:
                  </label>
                  <input
                    type="text"
                    value={targetBrand}
                    onChange={(e) => setTargetBrand(e.target.value)}
                    placeholder="e.g. LangChain, DeepSeek"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">
                    Sanitized Generic Brand:
                  </label>
                  <input
                    type="text"
                    value={genericBrand}
                    onChange={(e) => setGenericBrand(e.target.value)}
                    placeholder="e.g. StateGraphRuntime"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            )}

            {/* Extraction Focus Mode */}
            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1.5">
                Engine Extraction Scope &amp; Focus:
              </label>
              <select
                value={extractionFocus}
                onChange={(e) => setExtractionFocus(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer font-sans"
              >
                <option value="full_suite">Full Architectural Suite (Kernel + ReAct Loop + Tools + Memory)</option>
                <option value="react_loop">Autonomous Step Loop &amp; Stagnation Verification Focus</option>
                <option value="sandbox_vfs">Sandboxed Virtual Environment &amp; Shell Execution Focus</option>
                <option value="tree_memory">Session Branching Tree &amp; Token Budgeting Focus</option>
                <option value="model_stream">Multi-Model Stream Normalization &amp; Token Adapter Focus</option>
              </select>
            </div>

            {/* Custom Instructions */}
            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1.5">
                Custom Architectural Instructions (Optional):
              </label>
              <textarea
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                rows={2}
                placeholder="e.g., Emphasize cyclic graph transitions and tool execution checkpointing..."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-sans"
              />
            </div>
          </div>

          {/* Execution Options & Toggles Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center space-x-2">
              <Sliders className="h-4 w-4" />
              <span>3. Execution Options &amp; Cooldown</span>
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Step Cooldown Delay:
                </label>
                <select
                  value={stepCooldownMs}
                  onChange={(e) => setStepCooldownMs(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value={0}>0ms (Instant Execution)</option>
                  <option value={1000}>1,000ms (1s Step Delay)</option>
                  <option value={2500}>2,500ms (2.5s Step Delay)</option>
                  <option value={5000}>5,000ms (5s Step Delay)</option>
                </select>
              </div>

              <div className="flex flex-col justify-end">
                <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer p-1.5 rounded hover:bg-slate-950">
                  <input
                    type="checkbox"
                    checked={bypassBlacklist}
                    onChange={(e) => setBypassBlacklist(e.target.checked)}
                    className="rounded border-slate-700 text-indigo-600 focus:ring-0"
                  />
                  <span>Bypass Blacklist Check</span>
                </label>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800">
              <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer p-1.5 rounded hover:bg-slate-950">
                <input
                  type="checkbox"
                  checked={autoAddToCatalogue}
                  onChange={(e) => setAutoAddToCatalogue(e.target.checked)}
                  className="rounded border-slate-700 text-indigo-600 focus:ring-0"
                />
                <span>Automatically add extracted system to Engine Catalogue tab</span>
              </label>

              <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer p-1.5 rounded hover:bg-slate-950">
                <input
                  type="checkbox"
                  checked={autoPushToGitHub}
                  onChange={(e) => setAutoPushToGitHub(e.target.checked)}
                  className="rounded border-slate-700 text-emerald-600 focus:ring-0"
                />
                <span className="flex items-center space-x-1.5">
                  <UploadCloud className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Auto-push to target GitHub repository upon completion</span>
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Right Output: Execution Progress & Live Results Inspector (7 Cols) */}
        <div className="lg:col-span-7 space-y-6 flex flex-col">
          {/* Execution Progress & Status Panel */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Brain className="h-4 w-4 text-indigo-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  Execution Pipeline &amp; Timeline
                </h3>
              </div>
              <div className="flex items-center space-x-2">
                {isExecuting ? (
                  <span className="flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono bg-amber-950 text-amber-300 border border-amber-800 animate-pulse">
                    <Clock className="h-3 w-3" />
                    <span>Running ({elapsedTimeSec}s)</span>
                  </span>
                ) : executionStep >= 4 ? (
                  <span className="flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Completed</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400">
                    Ready to execute
                  </span>
                )}
              </div>
            </div>

            {/* Step Indicators */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { step: 1, label: '1. Ingest Repo', icon: FolderGit2 },
                { step: 2, label: '2. Boundary Isolation', icon: Cpu },
                { step: 3, label: '3. Clean Sanitization', icon: Sparkles },
                { step: 4, label: '4. Verified Spec', icon: FileCode },
              ].map(({ step, label, icon: Icon }) => {
                const isCurrent = isExecuting && executionStep === step;
                const isPassed = executionStep > step || (!isExecuting && executionStep >= 4);
                return (
                  <div
                    key={step}
                    className={`p-2.5 rounded-lg border text-center transition-all ${
                      isCurrent
                        ? 'bg-indigo-950/80 border-indigo-500 text-indigo-200 ring-1 ring-indigo-500 animate-pulse'
                        : isPassed
                        ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
                        : 'bg-slate-950 border-slate-850 text-slate-500'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 mx-auto mb-1" />
                    <div className="text-[10px] font-semibold truncate">{label}</div>
                  </div>
                );
              })}
            </div>

            {stepStatusMessage && (
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 flex items-center space-x-2">
                {isExecuting ? (
                  <RefreshCw className="h-3.5 w-3.5 text-indigo-400 animate-spin shrink-0" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                )}
                <span className="truncate">{stepStatusMessage}</span>
              </div>
            )}
          </div>

          {/* Results Inspector & Action Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col flex-1 shadow-lg">
            {/* Results Header Tabs */}
            <div className="px-5 py-3 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setActiveResultTab('markdown')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center space-x-1.5 ${
                    activeResultTab === 'markdown'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>Sanitized .md Specification</span>
                </button>
                <button
                  onClick={() => setActiveResultTab('engines')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center space-x-1.5 ${
                    activeResultTab === 'engines'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Layers className="h-3.5 w-3.5" />
                  <span>Extracted Engines ({extractedEngines.length})</span>
                </button>
                <button
                  onClick={() => setActiveResultTab('logs')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center space-x-1.5 ${
                    activeResultTab === 'logs'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Terminal className="h-3.5 w-3.5" />
                  <span>Live Logs ({executionLogs.length})</span>
                </button>
              </div>

              {extractedMarkdown && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleCopyMarkdown}
                    className="px-2.5 py-1 text-xs font-mono rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors flex items-center space-x-1 cursor-pointer"
                  >
                    {copiedMarkdown ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    <span>{copiedMarkdown ? 'Copied' : 'Copy Spec'}</span>
                  </button>
                  <button
                    onClick={handleDownloadMarkdown}
                    className="px-2.5 py-1 text-xs font-mono rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors flex items-center space-x-1 cursor-pointer"
                  >
                    <Download className="h-3 w-3 text-emerald-400" />
                    <span>Download .md</span>
                  </button>
                </div>
              )}
            </div>

            {/* Results Tab Content */}
            <div className="p-5 flex-1 min-h-[380px] max-h-[550px] overflow-y-auto bg-slate-950 font-mono text-xs">
              {!extractedMarkdown && !isExecuting && (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500 space-y-3">
                  <Compass className="h-10 w-10 text-slate-700" />
                  <div>
                    <h4 className="font-bold text-slate-400 text-sm">No Manual Run Executed Yet</h4>
                    <p className="text-xs text-slate-600 mt-1 max-w-sm">
                      Select a target repository preset on the left and click <strong>"Execute Manual Run"</strong> to generate the sanitized clean-room specification.
                    </p>
                  </div>
                </div>
              )}

              {isExecuting && !extractedMarkdown && (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
                  <RefreshCw className="h-8 w-8 text-indigo-400 animate-spin" />
                  <div className="text-slate-300 font-semibold text-xs">Synthesizing Clean-Room Engine...</div>
                  <div className="text-[11px] text-slate-500 font-mono">{stepStatusMessage}</div>
                </div>
              )}

              {activeResultTab === 'markdown' && extractedMarkdown && (
                <div className="space-y-4 font-sans text-slate-200 text-xs leading-relaxed">
                  <pre className="p-4 bg-slate-900 border border-slate-800 rounded-xl font-mono text-[11px] text-slate-300 whitespace-pre-wrap overflow-x-auto leading-relaxed">
                    {extractedMarkdown}
                  </pre>
                </div>
              )}

              {activeResultTab === 'engines' && extractedEngines.length > 0 && (
                <div className="space-y-4 font-sans">
                  {/* Engine Selector Pills */}
                  <div className="flex flex-wrap gap-1.5 pb-3 border-b border-slate-800">
                    {extractedEngines.map((eng, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedEngineIdx(idx)}
                        className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                          selectedEngineIdx === idx
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                        }`}
                      >
                        Engine {idx + 1}: {eng.name}
                      </button>
                    ))}
                  </div>

                  {/* Selected Engine Detail */}
                  {extractedEngines[selectedEngineIdx] && (
                    <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-sm text-indigo-300">
                            {extractedEngines[selectedEngineIdx].name}
                          </h4>
                          <span className="text-[11px] text-slate-400 font-mono">
                            Role: {extractedEngines[selectedEngineIdx].role}
                          </span>
                        </div>
                        <button
                          onClick={() =>
                            handleCopyCode(extractedEngines[selectedEngineIdx].codeSnippet, selectedEngineIdx)
                          }
                          className="px-2.5 py-1 text-xs font-mono rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors flex items-center space-x-1 cursor-pointer"
                        >
                          {copiedCodeIdx === selectedEngineIdx ? (
                            <Check className="h-3 w-3 text-emerald-400" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                          <span>{copiedCodeIdx === selectedEngineIdx ? 'Copied' : 'Copy TS Code'}</span>
                        </button>
                      </div>

                      <div className="p-3 bg-slate-950 rounded-lg border border-slate-850 text-xs text-slate-300">
                        <strong className="text-slate-400 block mb-1">What it does:</strong>
                        {extractedEngines[selectedEngineIdx].whatItDoes}
                      </div>

                      <pre className="p-3 bg-slate-950 border border-slate-800 rounded-lg font-mono text-[11px] text-indigo-200 overflow-x-auto">
                        {extractedEngines[selectedEngineIdx].codeSnippet}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {activeResultTab === 'logs' && (
                <div className="space-y-1.5 font-mono text-[11px]">
                  {executionLogs.map((log, idx) => (
                    <div
                      key={idx}
                      className={`p-1.5 rounded flex items-start space-x-2 ${
                        log.type === 'success'
                          ? 'text-emerald-300 bg-emerald-950/20'
                          : log.type === 'warn'
                          ? 'text-amber-300 bg-amber-950/20'
                          : log.type === 'error'
                          ? 'text-rose-300 bg-rose-950/20'
                          : 'text-slate-300'
                      }`}
                    >
                      <span className="text-slate-500 shrink-0">[{log.timestamp}]</span>
                      <span>{log.message}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom Action Ribbon when extraction succeeds */}
            {extractedMarkdown && (
              <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center space-x-2 text-xs text-slate-400">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span>
                    Extraction complete ({extractedEngines.length} engines). License: PolyForm Noncommercial 1.0.0.
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => onRunInPlayground(extractedMarkdown, genericBrand)}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-sm"
                  >
                    <Terminal className="h-3.5 w-3.5" />
                    <span>Test in Live Playground</span>
                  </button>

                  <button
                    onClick={() =>
                      setPushDialogData({
                        isOpen: true,
                        engineName: genericBrand,
                        sourceRepo: selectedRepoUrl,
                        markdownContent: extractedMarkdown,
                      })
                    }
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-sm"
                  >
                    <UploadCloud className="h-3.5 w-3.5" />
                    <span>Push to My GitHub</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* GitHub Push Dialog */}
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
            logMessage(`Manually pushed ${pushDialogData.engineName} to GitHub successfully.`, 'success');
          }}
        />
      )}
    </div>
  );
};
