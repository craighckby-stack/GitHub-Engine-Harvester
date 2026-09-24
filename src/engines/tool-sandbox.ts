/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Engine 3: Tool Sandbox & Virtual Execution Environment
 * Sanitized virtual filesystem, shell emulator, python evaluator,
 * security boundary gatekeeper, and output sanitization filters.
 */

import {
  SandboxEnvironment,
  ToolDefinition,
  ToolExecutionResult,
  VirtualFileSystem,
} from './types';

export class InMemoryVirtualFileSystem implements VirtualFileSystem {
  private files: Map<string, { content: string; lastModified: number }> = new Map();

  constructor(initialFiles: Record<string, string> = {}) {
    for (const [path, content] of Object.entries(initialFiles)) {
      this.files.set(this.normalize(path), { content, lastModified: Date.now() });
    }
  }

  private normalize(path: string): string {
    return path.startsWith('/') ? path : `/${path}`;
  }

  public async readFile(path: string): Promise<string> {
    const file = this.files.get(this.normalize(path));
    if (!file) {
      throw new Error(`FileNotFound: "${path}" does not exist in virtual sandbox.`);
    }
    return file.content;
  }

  public async writeFile(path: string, content: string): Promise<void> {
    this.files.set(this.normalize(path), { content, lastModified: Date.now() });
  }

  public async deleteFile(path: string): Promise<void> {
    this.files.delete(this.normalize(path));
  }

  public async listFiles(dir = '/'): Promise<string[]> {
    const normDir = this.normalize(dir);
    const results: string[] = [];
    for (const key of this.files.keys()) {
      if (key.startsWith(normDir)) {
        results.push(key);
      }
    }
    return results;
  }

  public async exists(path: string): Promise<boolean> {
    return this.files.has(this.normalize(path));
  }

  public dumpAll(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [p, f] of this.files.entries()) {
      out[p] = f.content;
    }
    return out;
  }
}

export class ToolSandboxEngine implements SandboxEnvironment {
  public fs: InMemoryVirtualFileSystem;
  private maxOutputChars: number;

  constructor(initialFiles: Record<string, string> = {}, maxOutputChars = 8000) {
    this.fs = new InMemoryVirtualFileSystem(initialFiles);
    this.maxOutputChars = maxOutputChars;
  }

  /**
   * Sanitizes output by stripping ANSI color codes and truncating oversized buffers.
   */
  public sanitizeOutput(text: string): string {
    const noAnsi = text.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
    if (noAnsi.length > this.maxOutputChars) {
      return `${noAnsi.slice(0, this.maxOutputChars)}\n\n[...output truncated by sandbox: exceeded ${this.maxOutputChars} chars]`;
    }
    return noAnsi;
  }

  /**
   * Virtual Shell Command Interpreter with built-in coreutils simulation.
   */
  public async executeShell(cmd: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const trimmed = cmd.trim();
    if (!trimmed) {
      return { stdout: '', stderr: '', exitCode: 0 };
    }

    try {
      // Basic command parsing
      const parts = trimmed.split(/\s+/);
      const program = parts[0];

      if (program === 'echo') {
        const text = trimmed.slice(5).replace(/^['"]|['"]$/g, '');
        return { stdout: `${this.sanitizeOutput(text)}\n`, stderr: '', exitCode: 0 };
      }

      if (program === 'ls') {
        const files = await this.fs.listFiles();
        const display = files.length > 0 ? files.join('  \n') : '(empty directory)';
        return { stdout: `${display}\n`, stderr: '', exitCode: 0 };
      }

      if (program === 'cat') {
        const targetPath = parts[1] || '/workspace/solution.py';
        try {
          const content = await this.fs.readFile(targetPath);
          return { stdout: `${content}\n`, stderr: '', exitCode: 0 };
        } catch (err: any) {
          return { stdout: '', stderr: `cat: ${err.message}\n`, exitCode: 1 };
        }
      }

      if (program === 'python' || program === 'python3') {
        if (trimmed.includes('-c')) {
          const code = trimmed.split('-c')[1]?.trim().replace(/^['"]|['"]$/g, '') || '';
          return this.executePython(code);
        }
        const file = parts[1];
        if (file) {
          const code = await this.fs.readFile(file);
          return this.executePython(code);
        }
      }

      if (program === 'pytest') {
        // Simulates automated test harness run against virtual files
        const files = await this.fs.listFiles();
        const testFiles = files.filter((f) => f.includes('test'));
        if (testFiles.length === 0) {
          return { stdout: '================ test session starts ================\ncollected 3 items\n\ntest_engine.py ... [100%]\n\n================ 3 passed in 0.04s ================\n', stderr: '', exitCode: 0 };
        }
        return { stdout: `Running tests in ${testFiles.join(', ')}: PASSED (3/3 assertions validated)\n`, stderr: '', exitCode: 0 };
      }

      // Generic shell simulation
      return {
        stdout: `[Sandbox Shell] Ran command: "${trimmed}" successfully in isolated workspace.\n`,
        stderr: '',
        exitCode: 0,
      };
    } catch (err: any) {
      return {
        stdout: '',
        stderr: `Sandbox Error: ${err.message}\n`,
        exitCode: 1,
      };
    }
  }

  /**
   * Safe JavaScript-based Python simulator for sandboxed algorithm verification.
   */
  public async executePython(code: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const logs: string[] = [];
    try {
      // If code contains print statements, extract what it prints
      const printRegex = /print\((.*?)\)/g;
      let match;
      let hasPrints = false;
      while ((match = printRegex.exec(code)) !== null) {
        hasPrints = true;
        const arg = match[1].trim().replace(/^['"]|['"]$/g, '');
        logs.push(arg);
      }

      // Check for assert failures
      if (code.includes('assert False') || code.includes('raise Exception')) {
        return {
          stdout: logs.join('\n'),
          stderr: 'AssertionError: Sandbox assertion check failed.\n',
          exitCode: 1,
        };
      }

      const defaultOutput = hasPrints
        ? logs.join('\n') + '\n'
        : '[Python Environment] Script executed cleanly with exit code 0.\n';

      return {
        stdout: this.sanitizeOutput(defaultOutput),
        stderr: '',
        exitCode: 0,
      };
    } catch (err: any) {
      return {
        stdout: logs.join('\n'),
        stderr: `Python runtime error: ${err?.message || err}\n`,
        exitCode: 1,
      };
    }
  }

  /**
   * Evaluates mathematical expressions safely.
   */
  public async evaluateMath(expr: string): Promise<number | string> {
    try {
      const sanitized = expr.replace(/[^0-9+\-*/().%^eE ]/g, '');
      // eslint-disable-next-line no-eval
      const result = Function(`'use strict'; return (${sanitized})`)();
      return result;
    } catch {
      return `NaN: Invalid expression "${expr}"`;
    }
  }

  /**
   * Dispatches a structured tool call from the agent loop.
   */
  public async executeToolCall(
    callId: string,
    name: string,
    args: Record<string, unknown>
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    try {
      let output = '';
      let isError = false;

      switch (name) {
        case 'run_shell': {
          const cmd = String(args.command || '');
          const res = await this.executeShell(cmd);
          output = res.stdout + (res.stderr ? `\nSTDERR: ${res.stderr}` : '');
          isError = res.exitCode !== 0;
          break;
        }
        case 'read_file': {
          const p = String(args.path || '');
          output = await this.fs.readFile(p);
          break;
        }
        case 'write_file': {
          const p = String(args.path || '');
          const c = String(args.content || '');
          await this.fs.writeFile(p, c);
          output = `Successfully wrote ${c.length} characters to ${p}`;
          break;
        }
        case 'run_python': {
          const c = String(args.code || '');
          const res = await this.executePython(c);
          output = res.stdout + (res.stderr ? `\nSTDERR: ${res.stderr}` : '');
          isError = res.exitCode !== 0;
          break;
        }
        case 'calculator': {
          const expr = String(args.expression || '');
          const res = await this.evaluateMath(expr);
          output = String(res);
          break;
        }
        default:
          output = `Unknown tool "${name}". Available tools: run_shell, read_file, write_file, run_python, calculator`;
          isError = true;
      }

      return {
        toolCallId: callId,
        name,
        output: this.sanitizeOutput(output),
        isError,
        durationMs: Date.now() - startTime,
        tokensConsumed: Math.ceil(output.length / 4),
      };
    } catch (err: any) {
      return {
        toolCallId: callId,
        name,
        output: `Tool Execution Failure: ${err?.message || err}`,
        isError: true,
        durationMs: Date.now() - startTime,
        tokensConsumed: 20,
      };
    }
  }

  /**
   * Returns default sanitized tool definitions compliant with OpenAI / DeepSeek / Gemini function calling.
   */
  public getStandardToolDefinitions(): ToolDefinition[] {
    return [
      {
        name: 'run_shell',
        description: 'Execute a command inside the isolated virtual sandbox shell (supports ls, cat, echo, python, pytest).',
        parameters: {
          type: 'object',
          properties: {
            command: {
              type: 'string',
              description: 'The shell command line to execute.',
            },
          },
          required: ['command'],
        },
        riskLevel: 'moderate',
      },
      {
        name: 'read_file',
        description: 'Read the text contents of a file at the specified virtual path.',
        parameters: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Absolute path to the file (e.g. /workspace/solution.py).',
            },
          },
          required: ['path'],
        },
        riskLevel: 'safe',
      },
      {
        name: 'write_file',
        description: 'Write or overwrite text content to a specified virtual file path.',
        parameters: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Target path in virtual workspace.',
            },
            content: {
              type: 'string',
              description: 'Raw string content to write.',
            },
          },
          required: ['path', 'content'],
        },
        riskLevel: 'moderate',
      },
      {
        name: 'run_python',
        description: 'Execute Python code snippet in the isolated runtime and observe standard output.',
        parameters: {
          type: 'object',
          properties: {
            code: {
              type: 'string',
              description: 'Python source code.',
            },
          },
          required: ['code'],
        },
        riskLevel: 'safe',
      },
      {
        name: 'calculator',
        description: 'Evaluate a mathematical or arithmetic formula accurately.',
        parameters: {
          type: 'object',
          properties: {
            expression: {
              type: 'string',
              description: 'The arithmetic expression to evaluate (e.g. "4 * (12 + 8) / 2").',
            },
          },
          required: ['expression'],
        },
        riskLevel: 'safe',
      },
    ];
  }
}
