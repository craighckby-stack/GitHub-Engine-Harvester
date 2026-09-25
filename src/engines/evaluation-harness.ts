/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Engine 6: Evaluation Harness & Benchmark Scoring Engine
 * Sanitized evaluation test runner, trajectory analysis, pass@1 scoring,
 * and automated benchmark suites for testing agent engines.
 */

import { AgentLoopEngine } from './agent-loop';
import { createLifecycleKernel } from './lifecycle';
import { UnifiedModelAdapter } from './model-adapter';
import { SessionStateEngine } from './session-state';
import { ToolSandboxEngine } from './tool-sandbox';
import {
  BenchmarkTestCase,
  EvaluationMetric,
  HarnessSuiteResult,
  ModelProviderName,
} from './types';

export class EvaluationHarnessEngine {
  private predefinedTasks: BenchmarkTestCase[] = [
    {
      id: 'task_algo_binsearch',
      name: 'Algorithm Optimization: Binary Search with Overflow Guard',
      category: 'algorithmic_reasoning',
      difficulty: 'easy',
      instruction:
        'Write a Python module in /workspace/solution.py implementing `def solve(nums: list[int], target: int) -> int:`. It must run in O(log n) time, handle empty lists, and avoid arithmetic overflow. Test the code with pytest or python.',
      initialFiles: {
        '/workspace/solution.py': '# Incomplete skeleton\ndef solve(nums, target):\n    pass\n',
        '/workspace/test_spec.py': 'def test_empty():\n    from solution import solve\n    assert solve([], 5) == -1\n',
      },
      expectedAnswerSubstring: 'solve',
      targetStepsMax: 3,
    },
    {
      id: 'task_debug_syntax',
      name: 'Codebase Repair: Broken Tokenizer & Off-by-One',
      category: 'code_debugging',
      difficulty: 'medium',
      instruction:
        'Inspect the virtual repository at /workspace, identify the off-by-one error causing tokenizer crashes on trailing delimiters, and verify that the fix passes tests.',
      initialFiles: {
        '/workspace/tokenizer.py': 'def tokenize(s: str) -> list[str]:\n    # Bug: crashes if string ends with space\n    parts = s.split(" ")\n    return [p for p in parts if len(p) > 0]\n',
      },
      targetStepsMax: 4,
    },
    {
      id: 'task_tool_chain',
      name: 'Tool Orchestration: Multi-File Synthesis & Checksum',
      category: 'tool_orchestration',
      difficulty: 'medium',
      instruction:
        'Use run_shell to inspect files in /workspace, extract numerical metrics, compute the average using calculator, and store the verified result in /workspace/summary.txt.',
      initialFiles: {
        '/workspace/data_1.csv': 'id,score\n1,85\n2,92\n3,78\n',
        '/workspace/data_2.csv': 'id,score\n4,95\n5,88\n',
      },
      targetStepsMax: 4,
    },
    {
      id: 'task_olympiad_math',
      name: 'Reasoning Synthesis: Diophantine Equation Constraints',
      category: 'system_synthesis',
      difficulty: 'hard',
      instruction:
        'Derive the integer solutions (x, y) for 3x^2 + 5y^2 = 345. Use python to verify all candidate pairs and report the count of positive integer pairs.',
      initialFiles: {},
      targetStepsMax: 5,
    },
  ];

  public getAvailableTasks(): BenchmarkTestCase[] {
    return [...this.predefinedTasks];
  }

  /**
   * Evaluates a single benchmark test case against an isolated instance of the agent engine.
   */
  public async runTestCase(
    task: BenchmarkTestCase,
    modelProvider: ModelProviderName = 'gemini',
    onProgress?: (info: { step: number; thoughtChunk: string; textChunk: string }) => void
  ): Promise<{ metric: EvaluationMetric; trajectory: any[]; finalOutput: string }> {
    const startTime = Date.now();
    const kernel = createLifecycleKernel();
    const sandbox = new ToolSandboxEngine(task.initialFiles || {});
    const session = new SessionStateEngine();
    const modelAdapter = new UnifiedModelAdapter(modelProvider);

    const agent = new AgentLoopEngine(kernel, modelAdapter, sandbox, session, {
      maxSteps: task.targetStepsMax ? task.targetStepsMax + 3 : 8,
      enableThinking: true,
      thinkingLevel: 'HIGH',
    });

    let thoughtTokensEstimated = 0;
    let textTokensEstimated = 0;

    const runResult = await agent.executeTask(task.instruction, {
      onThoughtChunk: (chunk) => {
        thoughtTokensEstimated += Math.ceil(chunk.length / 4);
        onProgress?.({ step: agent.getTrajectory().length, thoughtChunk: chunk, textChunk: '' });
      },
      onTextChunk: (chunk) => {
        textTokensEstimated += Math.ceil(chunk.length / 4);
        onProgress?.({ step: agent.getTrajectory().length, thoughtChunk: '', textChunk: chunk });
      },
    });

    const trajectory = runResult.trajectory;
    const totalDurationMs = Date.now() - startTime;
    const stepsUsed = trajectory.length;

    // Metrics computation
    let toolsInvokedCount = 0;
    let toolErrors = 0;
    for (const step of trajectory) {
      toolsInvokedCount += step.toolCalls.length;
      for (const res of step.toolResults) {
        if (res.isError) toolErrors++;
      }
    }

    const toolFailureRate = toolsInvokedCount > 0 ? toolErrors / toolsInvokedCount : 0;

    // Validation
    let completed = runResult.status === 'completed';
    let exactMatchScore = completed ? 1.0 : 0.0;

    if (task.expectedAnswerSubstring) {
      const containsSub = runResult.finalOutput.toLowerCase().includes(task.expectedAnswerSubstring.toLowerCase());
      if (!containsSub) exactMatchScore *= 0.5;
    }

    const targetSteps = task.targetStepsMax || 4;
    const trajectoryEfficiency = Math.min(1.0, Math.max(0.1, targetSteps / Math.max(1, stepsUsed)));

    const metric: EvaluationMetric = {
      taskCompleted: completed,
      exactMatchScore,
      stepsUsed,
      totalDurationMs,
      totalTokens: thoughtTokensEstimated + textTokensEstimated,
      thoughtTokensEstimated,
      toolsInvokedCount,
      toolFailureRate,
      trajectoryEfficiency: Math.round(trajectoryEfficiency * 100) / 100,
    };

    return {
      metric,
      trajectory,
      finalOutput: runResult.finalOutput,
    };
  }

  /**
   * Executes a full benchmark suite across multiple tasks.
   */
  public async runFullSuite(
    suiteName = 'DeepSeek Harness Core Suite',
    tasks: BenchmarkTestCase[] = this.predefinedTasks,
    modelProvider: ModelProviderName = 'gemini',
    onTaskComplete?: (taskId: string, metric: EvaluationMetric) => void
  ): Promise<HarnessSuiteResult> {
    const results: Array<{ task: BenchmarkTestCase; metric: EvaluationMetric; trajectory: any[] }> = [];
    let totalPassed = 0;
    let cumulativeDuration = 0;
    let cumulativeSteps = 0;

    for (const task of tasks) {
      const { metric, trajectory } = await this.runTestCase(task, modelProvider);
      results.push({ task, metric, trajectory });

      if (metric.taskCompleted && metric.exactMatchScore >= 0.5) {
        totalPassed++;
      }
      cumulativeDuration += metric.totalDurationMs;
      cumulativeSteps += metric.stepsUsed;

      onTaskComplete?.(task.id, metric);
    }

    return {
      suiteName,
      timestamp: Date.now(),
      totalTasks: tasks.length,
      passedTasks: totalPassed,
      passRate: Math.round((totalPassed / tasks.length) * 1000) / 10,
      averageDurationMs: Math.round(cumulativeDuration / tasks.length),
      averageSteps: Math.round((cumulativeSteps / tasks.length) * 10) / 10,
      results,
    };
  }
}
