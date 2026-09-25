/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DeepSeek Harness (DSH) Rebuilt Engine Specification
 * Sanitized, clean-room TypeScript types for the spatiotemporal agent runtime.
 */

// ---------------------------------------------------------------------------
// 1. Spatiotemporal Lifecycle & Plugin Types (Cordis-inspired Architecture)
// ---------------------------------------------------------------------------

export type ServiceIdentifier<T = unknown> = string & { __serviceType?: T };

export interface Disposable {
  dispose(): void | Promise<void>;
}

export type LifecycleHookName =
  | 'session:create'
  | 'session:fork'
  | 'session:dispose'
  | 'step:before'
  | 'step:after'
  | 'model:stream:chunk'
  | 'model:stream:thought'
  | 'tool:invoke:before'
  | 'tool:invoke:after'
  | 'tool:error'
  | 'harness:eval:start'
  | 'harness:eval:complete';

export type HookHandler<T = unknown> = (payload: T, ctx: SpatiotemporalContext) => void | Promise<void>;

export interface PluginManifest {
  name: string;
  version: string;
  description: string;
  author?: string;
  dependencies?: string[];
}

export interface Plugin<TConfig = unknown> {
  name: string;
  manifest?: PluginManifest;
  apply: (ctx: SpatiotemporalContext, config?: TConfig) => void | Promise<void>;
}

export interface SpatiotemporalContext {
  readonly id: string;
  readonly parent: SpatiotemporalContext | null;
  readonly scope: 'global' | 'session' | 'step';

  /** Register or inject a shared system service */
  provide<T>(id: string, service: T): void;
  inject<T>(id: string): T;
  has(id: string): boolean;

  /** Spatiotemporal event lifecycle hooks */
  on<T = unknown>(event: LifecycleHookName, handler: HookHandler<T>): Disposable;
  emit<T = unknown>(event: LifecycleHookName, payload: T): Promise<void>;

  /** Register a dynamic plugin */
  plugin<TConfig>(plugin: Plugin<TConfig>, config?: TConfig): Disposable;

  /** Fork a child isolated context with prototype inheritance */
  extend(scope: 'session' | 'step'): SpatiotemporalContext;

  /** Teardown and cleanup context-scoped resources */
  dispose(): Promise<void>;
}

// ---------------------------------------------------------------------------
// 2. Model Adapter & Stream Parsing Types
// ---------------------------------------------------------------------------

export type ModelProviderName = 'gemini' | 'deepseek' | 'openai' | 'anthropic';

export interface ModelMessagePart {
  type: 'text' | 'thought' | 'tool_call' | 'tool_result' | 'image';
  text?: string;
  toolCall?: {
    id: string;
    name: string;
    arguments: Record<string, unknown>;
  };
  toolResult?: {
    toolCallId: string;
    name: string;
    content: string;
    isError?: boolean;
  };
}

export interface ModelMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | ModelMessagePart[];
  thought?: string;
  timestamp?: number;
}

export interface StreamDelta {
  type: 'text_chunk' | 'thought_chunk' | 'tool_call_chunk' | 'finish';
  deltaText?: string;
  deltaThought?: string;
  toolCall?: {
    id: string;
    name?: string;
    deltaArgs?: string;
  };
  finishReason?: 'stop' | 'tool_calls' | 'length' | 'error';
}

export interface ModelAdapterOptions {
  model: string;
  temperature?: number;
  thinkingLevel?: 'HIGH' | 'LOW' | 'MINIMAL' | 'OFF';
  maxThinkingTokens?: number;
  systemPrompt?: string;
}

export interface ModelAdapter {
  provider: ModelProviderName;
  generateStream(
    messages: ModelMessage[],
    tools: ToolDefinition[],
    options: ModelAdapterOptions
  ): AsyncIterable<StreamDelta>;
}

// ---------------------------------------------------------------------------
// 3. Tool Sandbox & Execution Environment Types
// ---------------------------------------------------------------------------

export interface JSONSchemaProperty {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
  enum?: string[];
  items?: JSONSchemaProperty;
  properties?: Record<string, JSONSchemaProperty>;
  required?: string[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, JSONSchemaProperty>;
    required?: string[];
  };
  requiresPermission?: boolean;
  riskLevel?: 'safe' | 'moderate' | 'destructive';
}

export interface VirtualFile {
  path: string;
  content: string;
  lastModified: number;
}

export interface VirtualFileSystem {
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  deleteFile(path: string): Promise<void>;
  listFiles(dir?: string): Promise<string[]>;
  exists(path: string): Promise<boolean>;
}

export interface ToolExecutionResult {
  toolCallId: string;
  name: string;
  output: string;
  isError: boolean;
  durationMs: number;
  tokensConsumed?: number;
}

export interface SandboxEnvironment {
  fs: VirtualFileSystem;
  executeShell(cmd: string): Promise<{ stdout: string; stderr: string; exitCode: number }>;
  executePython(code: string): Promise<{ stdout: string; stderr: string; exitCode: number }>;
  evaluateMath(expr: string): Promise<number | string>;
}

// ---------------------------------------------------------------------------
// 4. Session State & Context Pruning Types
// ---------------------------------------------------------------------------

export interface SessionTreeNode {
  id: string;
  parentId: string | null;
  stepIndex: number;
  message: ModelMessage;
  stateSnapshot: {
    tokenCount: number;
    activeFiles: string[];
  };
  childrenIds: string[];
  createdAt: number;
}

export interface TokenBudgetConfig {
  maxContextTokens: number;
  reserveForGeneration: number;
  pruneThreshold: number; // e.g., 0.85 of max
  strategy: 'sliding_window' | 'summarize_old' | 'prune_tool_outputs' | 'hybrid';
}

// ---------------------------------------------------------------------------
// 5. Agent Loop Engine Types
// ---------------------------------------------------------------------------

export type AgentStatus =
  | 'idle'
  | 'planning'
  | 'thinking'
  | 'streaming_response'
  | 'executing_tools'
  | 'verifying'
  | 'completed'
  | 'halted_error'
  | 'max_steps_exceeded';

export interface AgentStepTrajectory {
  stepNumber: number;
  thought: string;
  modelOutput: string;
  toolCalls: Array<{
    id: string;
    name: string;
    args: Record<string, unknown>;
  }>;
  toolResults: ToolExecutionResult[];
  status: AgentStatus;
  durationMs: number;
  timestamp: number;
}

export interface AgentLoopConfig {
  maxSteps: number;
  timeoutMs: number;
  stopOnFirstFailure?: boolean;
  enableThinking: boolean;
  thinkingLevel?: 'HIGH' | 'LOW' | 'MINIMAL';
}

// ---------------------------------------------------------------------------
// 6. Evaluation Harness Engine Types
// ---------------------------------------------------------------------------

export interface BenchmarkTestCase {
  id: string;
  name: string;
  category: 'algorithmic_reasoning' | 'code_debugging' | 'tool_orchestration' | 'system_synthesis';
  difficulty: 'easy' | 'medium' | 'hard' | 'olympiad';
  instruction: string;
  initialFiles?: Record<string, string>;
  expectedAnswerSubstring?: string;
  validationScript?: (sandbox: SandboxEnvironment) => Promise<boolean>;
  targetStepsMax?: number;
}

export interface EvaluationMetric {
  taskCompleted: boolean;
  exactMatchScore: number; // 0.0 - 1.0
  stepsUsed: number;
  totalDurationMs: number;
  totalTokens: number;
  thoughtTokensEstimated: number;
  toolsInvokedCount: number;
  toolFailureRate: number;
  trajectoryEfficiency: number; // calculated ratio
}

export interface HarnessSuiteResult {
  suiteName: string;
  timestamp: number;
  totalTasks: number;
  passedTasks: number;
  passRate: number; // 0.0 - 100%
  averageDurationMs: number;
  averageSteps: number;
  results: Array<{
    task: BenchmarkTestCase;
    metric: EvaluationMetric;
    trajectory: AgentStepTrajectory[];
  }>;
}
