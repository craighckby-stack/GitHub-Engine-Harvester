/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Real GitHub Raw Code Downloader & AST Structure Extractor
 * Fetches genuine source code files directly from raw.githubusercontent.com,
 * extracts actual class/method/module AST signatures, and provides raw source contexts.
 */

export interface GitHubFileNode {
  path: string;
  type: 'file' | 'dir';
  size?: number;
  url?: string;
}

export interface ExtractedCodeModule {
  filePath: string;
  rawContent: string;
  classNames: string[];
  functionNames: string[];
  imports: string[];
}

/**
 * Recursively fetches the Git tree metadata for a target repository.
 */
export async function fetchGitHubRepoTree(repoFullName: string, token?: string, branch = 'main'): Promise<GitHubFileNode[]> {
  const cleanRepo = repoFullName.replace(/^https?:\/\/github\.com\//i, '').replace(/\.git$/i, '').trim();
  const headers: Record<string, string> = {
    'User-Agent': 'AIStudio-Engine-Harvester',
    Accept: 'application/vnd.github.v3+json',
  };
  if (token) {
    headers.Authorization = `token ${token}`;
  }

  // First try default branch 'main', fallback to 'master'
  const branchesToTry = [branch, 'main', 'master'];

  for (const b of branchesToTry) {
    try {
      const url = `https://api.github.com/repos/${cleanRepo}/git/trees/${b}?recursive=1`;
      const res = await fetch(url, { headers });
      if (res.ok) {
        const data: any = await res.json();
        if (Array.isArray(data.tree)) {
          return data.tree.map((item: any) => ({
            path: item.path,
            type: item.type === 'tree' ? 'dir' : 'file',
            size: item.size,
          }));
        }
      }
    } catch (err) {
      console.warn(`[GitHub Raw Ingest] Failed to fetch tree for branch ${b}:`, err);
    }
  }

  return [];
}

/**
 * Fetches the raw content of a specific file from raw.githubusercontent.com.
 */
export async function fetchRawFileContent(repoFullName: string, filePath: string, branch = 'main'): Promise<string> {
  const cleanRepo = repoFullName.replace(/^https?:\/\/github\.com\//i, '').replace(/\.git$/i, '').trim();
  const rawUrl = `https://raw.githubusercontent.com/${cleanRepo}/${branch}/${filePath}`;

  try {
    const res = await fetch(rawUrl, {
      headers: { 'User-Agent': 'AIStudio-Engine-Harvester' },
    });
    if (res.ok) {
      return await res.text();
    }
  } catch (err) {
    console.warn(`[GitHub Raw Ingest] Error fetching raw file ${filePath}:`, err);
  }

  return '';
}

/**
 * AST Class and Function Signature Scanner.
 * Analyzes raw Python or TypeScript code using regex-based AST token scanning.
 */
export function scanCodeAst(rawContent: string, filePath: string): ExtractedCodeModule {
  const classNames: string[] = [];
  const functionNames: string[] = [];
  const imports: string[] = [];

  const lines = rawContent.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    // Match Python & TypeScript class definitions
    const classMatch = trimmed.match(/(?:class|interface|type)\s+([A-Za-z0-9_]+)/);
    if (classMatch && classMatch[1]) {
      classNames.push(classMatch[1]);
    }

    // Match Python & TypeScript function/method definitions
    const fnMatch = trimmed.match(/(?:def|function|async def|async function)\s+([A-Za-z0-9_]+)/);
    if (fnMatch && fnMatch[1] && !fnMatch[1].startsWith('__')) {
      functionNames.push(fnMatch[1]);
    }

    // Match import statements
    if (trimmed.startsWith('import ') || trimmed.startsWith('from ') || trimmed.startsWith('export * from')) {
      imports.push(trimmed);
    }
  }

  return {
    filePath,
    rawContent,
    classNames: Array.from(new Set(classNames)),
    functionNames: Array.from(new Set(functionNames)),
    imports: Array.from(new Set(imports)).slice(0, 15),
  };
}

/**
 * Downloads key source files from a target repository and builds a genuine AST context.
 */
export async function ingestLiveRepoSourceFiles(
  repoFullName: string,
  token?: string,
  maxFiles = 6
): Promise<{ modules: ExtractedCodeModule[]; summaryContext: string }> {
  const tree = await fetchGitHubRepoTree(repoFullName, token);

  // Filter for key source files (.py, .ts, .js)
  const codeFiles = tree.filter(
    (n) =>
      n.type === 'file' &&
      /\.(py|ts|js)$/i.test(n.path) &&
      !n.path.includes('test') &&
      !n.path.includes('example') &&
      !n.path.includes('docs')
  );

  // Prioritize runtime core files (agent, engine, graph, state, loop, router, client, tools)
  const prioritized = codeFiles.sort((a, b) => {
    const coreRegex = /(agent|engine|graph|state|loop|router|runner|runtime|kernel|core|client|tools)/i;
    const aPriority = coreRegex.test(a.path) ? 1 : 0;
    const bPriority = coreRegex.test(b.path) ? 1 : 0;
    return bPriority - aPriority;
  });

  const selected = prioritized.slice(0, maxFiles);
  const modules: ExtractedCodeModule[] = [];

  for (const f of selected) {
    const raw = await fetchRawFileContent(repoFullName, f.path);
    if (raw.trim()) {
      const ast = scanCodeAst(raw, f.path);
      modules.push(ast);
    }
  }

  // Construct summary context for LLM extraction
  let summaryContext = `=== GENUINE RAW SOURCE CODE INGESTED FROM GITHUB (${repoFullName}) ===\n\n`;
  for (const m of modules) {
    summaryContext += `--- FILE: ${m.filePath} ---\n`;
    summaryContext += `Classes: ${m.classNames.join(', ') || 'None'}\n`;
    summaryContext += `Functions: ${m.functionNames.join(', ') || 'None'}\n`;
    summaryContext += `Raw Source Snippet (First 1500 chars):\n${m.rawContent.slice(0, 1500)}\n\n`;
  }

  return { modules, summaryContext };
}
