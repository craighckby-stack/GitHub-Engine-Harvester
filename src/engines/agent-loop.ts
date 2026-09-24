/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Engine 5: Autonomous ReAct Agent Loop & Step Dispatcher
 * Coordinates the spatiotemporal lifecycle, model adapter streaming,
 * sandboxed tool invocation, and trajectory recording.
 */

import { UnifiedModelAdapter } from './model-adapter';
import { SessionStateEngine } from './session-state';
import { ToolSandboxEngine } from './tool-sandbox';
import {
  AgentLoopConfig,
  AgentStatus,
  AgentStepTrajectory,
  ModelMessage,
  SpatiotemporalContext,
  ToolDefinition,
  ToolExecutionResult,
} from './types';

export interface AgentRunCallbacks {
  onStatusChange?: (status: AgentStatus) => void;
  onThoughtChunk?: (chunk: string) => void;
  onTextChunk?: (chunk: string) => void;
  onStepComplete?: (step: AgentStepTrajectory) => void;
}

export class AgentLoopEngine {
  private ctx: SpatiotemporalContext;
  private modelAdapter: UnifiedModelAdapter;
  private sandbox: ToolSandboxEngine;
  private session: SessionStateEngine;
  private config: AgentLoopConfig;
  private trajectory: AgentStepTrajectory[] = [];
  private currentStatus: AgentStatus = 'idle';

  constructor(
    ctx: SpatiotemporalContext,
    modelAdapter: UnifiedModelAdapter,
    sandbox: ToolSandboxEngine,
    session: SessionStateEngine,
    config: Partial<AgentLoopConfig> = {}
  ) {
    this.ctx = ctx;
    this.modelAdapter = modelAdapter;
    this.sandbox = sandbox;
    this.session = session;
    this.config = {
      maxSteps: config.maxSteps || 8,
      timeoutMs: config.timeoutMs || 60000,
      stopOnFirstFailure: config.stopOnFirstFailure || false,
      enableThinking: config.enableThinking !== undefined ? config.enableThinking : true,
      thinkingLevel: config.thinkingLevel || 'HIGH',
    };
  }

  public getStatus(): AgentStatus {
    return this.currentStatus;
  }

  public getTrajectory(): AgentStepTrajectory[] {
    return [...this.trajectory];
  }

  /**
   * Executes the autonomous multi-turn ReAct loop until task goal is achieved or limits reached.
   */
  public async executeTask(
    userPrompt: string,
    callbacks: AgentRunCallbacks = {}
  ): Promise<{ status: AgentStatus; trajectory: AgentStepTrajectory[]; finalOutput: string }> {
    this.trajectory = [];
    this.updateStatus('planning', callbacks);

    // Initialize root session context if not already set
    this.session.initRoot(
      'You are an autonomous engineering agent running in the DeepSeek Harness runtime environment. Use sandboxed tools systematically to achieve the goal.'
    );

    // Record user prompt
    this.session.appendMessage({
      role: 'user',
      content: userPrompt,
      timestamp: Date.now(),
    });

    const tools: ToolDefinition[] = this.sandbox.getStandardToolDefinitions();
    let stepNumber = 0;
    let finalOutput = '';

    while (stepNumber < this.config.maxSteps) {
      stepNumber++;
      const stepStartTime = Date.now();

      // Step scope context creation
      const stepCtx = this.ctx.extend('step');
      await this.ctx.emit('step:before', { stepNumber, prompt: userPrompt });

      this.updateStatus('thinking', callbacks);

      const history = this.session.getLinearHistory();
      let accumulatedThought = '';
      let accumulatedText = '';
      const pendingToolCalls: Array<{ id: string; name: string; args: Record<string, unknown> }> = [];

      try {
        const stream = this.modelAdapter.generateStream(history, tools, {
          model: 'deepseek-reasoner',
          thinkingLevel: this.config.thinkingLevel,
        });

        for await (const delta of stream) {
          if (delta.type === 'thought_chunk' && delta.deltaThought) {
            accumulatedThought += delta.deltaThought;
            callbacks.onThoughtChunk?.(delta.deltaThought);
            await this.ctx.emit('model:stream:thought', delta.deltaThought);
          } else if (delta.type === 'text_chunk' && delta.deltaText) {
            if (this.currentStatus !== 'streaming_response') {
              this.updateStatus('streaming_response', callbacks);
            }
            accumulatedText += delta.deltaText;
            callbacks.onTextChunk?.(delta.deltaText);
            await this.ctx.emit('model:stream:chunk', delta.deltaText);
          } else if (delta.type === 'tool_call_chunk' && delta.toolCall) {
            let parsedArgs: Record<string, unknown> = {};
            try {
              parsedArgs = delta.toolCall.deltaArgs ? JSON.parse(delta.toolCall.deltaArgs) : {};
            } catch {
              parsedArgs = { raw: delta.toolCall.deltaArgs };
            }
            pendingToolCalls.push({
              id: delta.toolCall.id,
              name: delta.toolCall.name || 'run_shell',
              args: parsedArgs,
            });
          }
        }
      } catch (err: any) {
        this.updateStatus('halted_error', callbacks);
        return {
          status: 'halted_error',
          trajectory: this.trajectory,
          finalOutput: `Engine failure during generation stream: ${err?.message || err}`,
        };
      }

      // Record Assistant message into session state
      const assistantMsg: ModelMessage = {
        role: 'assistant',
        content: accumulatedText,
        thought: accumulatedThought,
        timestamp: Date.now(),
      };
      this.session.appendMessage(assistantMsg);

      // Execute tool calls if any
      const toolResults: ToolExecutionResult[] = [];
      if (pendingToolCalls.length > 0) {
        this.updateStatus('executing_tools', callbacks);

        for (const tc of pendingToolCalls) {
          await this.ctx.emit('tool:invoke:before', tc);

          const result = await this.sandbox.executeToolCall(tc.id, tc.name, tc.args);
          toolResults.push(result);

          await this.ctx.emit('tool:invoke:after', result);

          // Append tool result message to conversation state
          this.session.appendMessage({
            role: 'tool',
            content: result.output,
            timestamp: Date.now(),
          });
        }

        // Apply context pruning if tokens exceed budget
        this.session.pruneContextIfNeeded();
      }

      const stepTrajectory: AgentStepTrajectory = {
        stepNumber,
        thought: accumulatedThought,
        modelOutput: accumulatedText,
        toolCalls: pendingToolCalls,
        toolResults,
        status: pendingToolCalls.length > 0 ? 'executing_tools' : 'completed',
        durationMs: Date.now() - stepStartTime,
        timestamp: Date.now(),
      };

      this.trajectory.push(stepTrajectory);
      callbacks.onStepComplete?.(stepTrajectory);
      await this.ctx.emit('step:after', stepTrajectory);
      await stepCtx.dispose();

      // If no tools were called, the agent has emitted its final response
      if (pendingToolCalls.length === 0) {
        finalOutput = accumulatedText;
        this.updateStatus('completed', callbacks);
        return {
          status: 'completed',
          trajectory: this.trajectory,
          finalOutput,
        };
      }
    }

    this.updateStatus('max_steps_exceeded', callbacks);
    return {
      status: 'max_steps_exceeded',
      trajectory: this.trajectory,
      finalOutput: finalOutput || 'Task halted: Maximum step budget reached without terminal condition.',
    };
  }

  private updateStatus(status: AgentStatus, callbacks: AgentRunCallbacks) {
    this.currentStatus = status;
    callbacks.onStatusChange?.(status);
  }
}
