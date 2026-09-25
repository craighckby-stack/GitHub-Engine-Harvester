/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GitHub Push Dialog Component
 * Enables 1-click and customizable Git pushes of engine specifications and TypeScript runtime code directly to GitHub repositories.
 */

import React, { useState } from 'react';
import {
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  GitBranch,
  GitCommit,
  RefreshCw,
  FileCode,
  FileText,
  Key,
} from 'lucide-react';
import { GitHubClient, BundlePushResult } from './github-client';

interface GitHubPushDialogProps {
  isOpen: boolean;
  onClose: () => void;
  engineName: string;
  sourceRepo?: string;
  markdownContent: string;
  defaultTargetRepo: string;
  defaultBranch: string;
  githubToken: string;
  onPushSuccess?: (result: BundlePushResult) => void;
}

export const GitHubPushDialog: React.FC<GitHubPushDialogProps> = ({
  isOpen,
  onClose,
  engineName,
  sourceRepo,
  markdownContent,
  defaultTargetRepo,
  defaultBranch,
  githubToken,
  onPushSuccess,
}) => {
  const [targetRepo, setTargetRepo] = useState(defaultTargetRepo);
  const [branch, setBranch] = useState(defaultBranch || 'main');
  const [targetDir, setTargetDir] = useState('engines');
  const [writeMode, setWriteMode] = useState<'create_unique' | 'overwrite'>('create_unique');
  const [token, setToken] = useState(githubToken);
  const [isPushing, setIsPushing] = useState(false);
  const [pushResult, setPushResult] = useState<BundlePushResult | null>(null);
  const [pushError, setPushError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePush = async () => {
    if (!token) {
      setPushError('GitHub Personal Access Token is required to push');
      return;
    }
    if (!targetRepo) {
      setPushError('Target repository (owner/repo) is required');
      return;
    }

    try {
      setIsPushing(true);
      setPushError(null);
      setPushResult(null);

      const res = await GitHubClient.pushEngineBundle(
        token,
        targetRepo,
        engineName,
        markdownContent,
        sourceRepo,
        branch,
        targetDir,
        writeMode
      );

      setPushResult(res);
      if (onPushSuccess) {
        onPushSuccess(res);
      }
    } catch (err: any) {
      setPushError(err.message || 'Push failed');
    } finally {
      setIsPushing(false);
    }
  };

  const cleanSlug = engineName.toLowerCase().replace(/[^a-z0-9_-]/g, '-');

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <UploadCloud className="h-5 w-5 text-emerald-400" />
              <h3 className="text-lg font-bold text-white">Push Engine Files to GitHub</h3>
            </div>
            <p className="text-xs text-slate-400">
              Commit isolated engine specifications and clean-room runtime code directly to GitHub.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Engine details and files preview */}
        <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-white">{engineName}</span>
            <span className="text-[10px] font-mono text-indigo-400">Source: {sourceRepo || 'Autonomous'}</span>
          </div>
          <div className="text-[11px] text-slate-400 space-y-1 pt-1">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Files that will be created in <span className="font-mono text-emerald-300">{targetDir}/{cleanSlug}/</span>:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 font-mono text-[10px]">
              <span className="flex items-center space-x-1 text-slate-300">
                <FileText className="h-3 w-3 text-amber-400" />
                <span>specification.md</span>
              </span>
              <span className="flex items-center space-x-1 text-slate-300">
                <FileCode className="h-3 w-3 text-indigo-400" />
                <span>runtime.ts &amp; index.ts</span>
              </span>
              <span className="flex items-center space-x-1 text-slate-300">
                <FileCode className="h-3 w-3 text-emerald-400" />
                <span>01-*.ts, 02-*.ts (Individual engines)</span>
              </span>
              <span className="flex items-center space-x-1 text-slate-300">
                <FileText className="h-3 w-3 text-sky-400" />
                <span>{targetDir}/CATALOG.md</span>
              </span>
            </div>
          </div>
        </div>

        {/* Form fields */}
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Target GitHub Repository (owner/repo)</label>
            <input
              type="text"
              value={targetRepo}
              onChange={(e) => setTargetRepo(e.target.value)}
              placeholder="e.g. Craighckby/sanitized-ai-engines"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* File Creation Mode */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">File Creation Mode</label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <label
                className={`p-2 rounded-lg border cursor-pointer ${
                  writeMode === 'create_unique'
                    ? 'bg-emerald-950/40 border-emerald-700 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                <input
                  type="radio"
                  name="dialogWriteMode"
                  checked={writeMode === 'create_unique'}
                  onChange={() => setWriteMode('create_unique')}
                  className="mr-1.5 text-emerald-500"
                />
                <span className="font-semibold text-emerald-200">Create New Unique Files</span>
                <p className="text-[10px] text-slate-400 mt-0.5">Never overwrites existing files</p>
              </label>

              <label
                className={`p-2 rounded-lg border cursor-pointer ${
                  writeMode === 'overwrite'
                    ? 'bg-indigo-950/40 border-indigo-700 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                <input
                  type="radio"
                  name="dialogWriteMode"
                  checked={writeMode === 'overwrite'}
                  onChange={() => setWriteMode('overwrite')}
                  className="mr-1.5 text-indigo-500"
                />
                <span className="font-semibold text-white">Overwrite Existing</span>
                <p className="text-[10px] text-slate-400 mt-0.5">Updates in-place if matched</p>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1">
                <GitBranch className="h-3.5 w-3.5 text-slate-400" />
                <span>Target Branch</span>
              </label>
              <input
                type="text"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder="main"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Destination Directory</label>
              <input
                type="text"
                value={targetDir}
                onChange={(e) => setTargetDir(e.target.value)}
                placeholder="engines"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {!githubToken && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1">
                <Key className="h-3.5 w-3.5 text-amber-400" />
                <span>GitHub Personal Access Token</span>
              </label>
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}
        </div>

        {/* Error and Success states */}
        {pushError && (
          <div className="p-3 bg-red-950/40 border border-red-800 rounded-lg text-xs text-red-300 flex items-start space-x-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
            <span>{pushError}</span>
          </div>
        )}

        {pushResult && (
          <div className="p-4 bg-emerald-950/40 border border-emerald-800 rounded-xl space-y-2">
            <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-300">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>Successfully pushed {pushResult.totalPushed} files to GitHub!</span>
            </div>

            <div className="space-y-1 divide-y divide-emerald-900/50 pt-1">
              {pushResult.pushedFiles.map((file, i) => (
                <div key={i} className="flex items-center justify-between pt-1 text-[11px] font-mono">
                  <span className="text-slate-300">{file.path}</span>
                  <a
                    href={file.fileUrl || file.commitUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 hover:text-emerald-300 flex items-center space-x-1"
                  >
                    <span>{file.commitSha ? file.commitSha.slice(0, 7) : 'View'}</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3 pt-2">
          <button
            onClick={onClose}
            className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
          >
            Close
          </button>

          <button
            onClick={handlePush}
            disabled={isPushing || !targetRepo}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md transition-all cursor-pointer"
          >
            {isPushing ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>Pushing to GitHub...</span>
              </>
            ) : (
              <>
                <GitCommit className="h-3.5 w-3.5" />
                <span>Commit &amp; Push Now</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
