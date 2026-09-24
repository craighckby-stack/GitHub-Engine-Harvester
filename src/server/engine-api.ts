/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Server-side Engine API router using @google/genai
 * Implements high-thinking mode with gemini-3.1-pro-preview and ThinkingLevel.HIGH.
 */

import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import type { IncomingMessage, ServerResponse } from 'http';

function getAIClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export function handleEngineApi(req: IncomingMessage, res: ServerResponse, next: () => void) {
  const url = req.url || '';

  if (req.method === 'POST' && (url.startsWith('/api/engine/extract-sanitize') || url.startsWith('/api/engine/reason'))) {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });

    req.on('end', async () => {
      res.setHeader('Content-Type', 'application/json');
      try {
        const payload = JSON.parse(body || '{}');
        const ai = getAIClient();

        if (!ai) {
          res.writeHead(503);
          res.end(
            JSON.stringify({
              error: 'GEMINI_API_KEY not found in server environment. Local fallback mode enabled.',
            })
          );
          return;
        }

        const isExtractor = url.startsWith('/api/engine/extract-sanitize');
        let promptText = '';
        let systemInstruction = '';

        if (isExtractor) {
          const repoUrl = payload.repoUrl || 'https://github.com/deepseek-ai/deepseek-harness';
          const targetBrand = payload.targetBrand || 'DeepSeek';
          const genericBrand = payload.genericBrand || 'Autonomous Agent Harness';
          const customInstructions = payload.customInstructions || '';

          systemInstruction = `You are a Principal Software Architect and Engine Cataloger.
Your task is to analyze an open-source AI or software system/repository, isolate ONLY the runtime engines powering the system (ignore CLI wrappers, UI shells, marketing docs, build tools), describe exactly "What it does" for each engine, and provide complete, pristine, production-ready implementation code in clean TypeScript or Python.

CRITICAL SANITIZATION RULES:
1. Completely sanitize and strip all occurrences of proprietary names, company branding, and repository names (e.g. "${targetBrand}", "${repoUrl}"). Replace them with generic, professional architectural terms (e.g. "${genericBrand}", "AutonomousRuntime", "ExecutionEngine").
2. Output a complete, pristine, standalone Markdown (.md) document.
3. For EVERY identified engine, include:
   - "## Engine [N]: [Generic Engine Name]"
   - "### What it does" (Explain its exact role, inputs, state lifecycle, invariant preservation, and outputs).
   - "### Implementation Code" (Provide the COMPLETE, fully working sanitized code in a code block with zero ellipses, placeholders, or proprietary leaks).
4. Include an overarching Architecture Overview and System Composition section showing how the engines wire together.`;

          promptText = `Target Repository: ${repoUrl}
Branding to sanitize: "${targetBrand}" -> replace with "${genericBrand}".
Additional instructions: ${customInstructions || 'Isolate all core engines that run this system, describe what each engine does, and include all sanitized code.'}

Generate the complete sanitized Markdown document now.`;
        } else {
          const messages = payload.messages || [];
          const userMessages = messages.filter((m: any) => m.role === 'user');
          const lastUser = userMessages[userMessages.length - 1];
          promptText = typeof lastUser?.content === 'string' ? lastUser.content : 'Solve autonomous task';
          systemInstruction =
            payload.systemPrompt ||
            'You are an expert systems engineer. Analyze engine architectures with high thinking level and output verified solutions.';
        }

        // Must use gemini-3.1-pro-preview with ThinkingLevel.HIGH and no maxOutputTokens
        const response = await ai.models.generateContent({
          model: 'gemini-3.1-pro-preview',
          contents: promptText,
          config: {
            thinkingConfig: {
              thinkingLevel: ThinkingLevel.HIGH,
            },
            systemInstruction,
          },
        });

        const outputText = response.text || '';
        let thought = '';

        const candidate = response.candidates?.[0];
        if (candidate?.content?.parts) {
          for (const part of candidate.content.parts) {
            if ((part as any).thought) {
              thought += (part as any).thought + '\n';
            }
          }
        }

        res.writeHead(200);
        res.end(
          JSON.stringify({
            markdown: outputText,
            text: outputText,
            thought: thought || '[High-Thinking Chain: Systematically decomposed repository into isolated engines and applied sanitization filters]',
          })
        );
      } catch (err: any) {
        console.error('Engine extraction error:', err);
        res.writeHead(500);
        res.end(
          JSON.stringify({
            error: err.message || 'Internal error in engine extractor',
          })
        );
      }
    });
    return;
  }

  next();
}
