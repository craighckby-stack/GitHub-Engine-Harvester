/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DeepSeek Harness Rebuilt Engines Facade
 * Sanitized, production-grade agent runtime engines.
 */

export * from './types';
export * from './lifecycle';
export * from './model-adapter';
export * from './tool-sandbox';
export * from './session-state';
export * from './agent-loop';
export * from './evaluation-harness';

import { AgentLoopEngine } from './agent-loop';
import { createLifecycleKernel, SpatiotemporalLifecycleContext } from './lifecycle';
import { UnifiedModelAdapter } from './model-adapter';
import { SessionStateEngine } from './session-state';
import { ToolSandboxEngine } from './tool-sandbox';
import { EvaluationHarnessEngine } from './evaluation-harness';
import { AgentLoopConfig, ModelProviderName } from './types';

export interface HarnessSystemInstance {
  kernel: SpatiotemporalLifecycleContext;
  modelAdapter: UnifiedModelAdapter;
  sandbox: ToolSandboxEngine;
  session: SessionStateEngine;
  agent: AgentLoopEngine;
  evaluator: EvaluationHarnessEngine;
}

/**
 * Instantiates a fully wired, sanitized Harness System runtime.
 */
export function createHarnessSystem(options: {
  provider?: ModelProviderName;
  initialFiles?: Record<string, string>;
  agentConfig?: Partial<AgentLoopConfig>;
} = {}): HarnessSystemInstance {
  const kernel = createLifecycleKernel() as SpatiotemporalLifecycleContext;
  const modelAdapter = new UnifiedModelAdapter(options.provider || 'deepseek');
  const sandbox = new ToolSandboxEngine(options.initialFiles || {});
  const session = new SessionStateEngine();
  const agent = new AgentLoopEngine(kernel, modelAdapter, sandbox, session, options.agentConfig || {});
  const evaluator = new EvaluationHarnessEngine();

  // Register services into the spatiotemporal lifecycle context
  kernel.provide('modelAdapter', modelAdapter);
  kernel.provide('sandbox', sandbox);
  kernel.provide('session', session);
  kernel.provide('agent', agent);
  kernel.provide('evaluator', evaluator);

  return {
    kernel,
    modelAdapter,
    sandbox,
    session,
    agent,
    evaluator,
  };
}
