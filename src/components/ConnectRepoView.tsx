import React, { useState } from 'react';
import { 
  FolderGit2, 
  GitBranch, 
  ArrowRight, 
  Loader2, 
  AlertCircle,
  Lock,
  Github
} from 'lucide-react';

interface ConnectRepoViewProps {
  onScanRepo: (files: Record<string, string>, projectName: string, gitRepoUrl?: string) => Promise<void>;
}

export const ConnectRepoView: React.FC<ConnectRepoViewProps> = ({ onScanRepo }) => {
  const [repoUrl, setRepoUrl] = useState<string>('');
  const [branch, setBranch] = useState<string>('main');
  const [authToken, setAuthToken] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl.trim()) {
      setError('Please enter a valid GitHub repository name (owner/repo) or URL.');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      let cleanRepo = repoUrl.trim();
      if (cleanRepo.startsWith('https://github.com/')) {
        cleanRepo = cleanRepo.replace('https://github.com/', '').replace(/\.git$/, '');
      } else if (cleanRepo.startsWith('http://github.com/')) {
        cleanRepo = cleanRepo.replace('http://github.com/', '').replace(/\.git$/, '');
      }

      const res = await fetch('/api/github/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo: cleanRepo,
          branch: branch || 'main',
          token: authToken || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to fetch GitHub repository');
      }

      const filesMap = data.preloadedFiles || {};
      if (Object.keys(filesMap).length === 0) {
        throw new Error('No indexable code files found in repository.');
      }

      await onScanRepo(filesMap, cleanRepo, `https://github.com/${cleanRepo}`);
    } catch (err: any) {
      setError(err.message || 'Failed to connect to repository.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 space-y-6 font-sans text-[#E2E8F0] select-none">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-xl font-bold text-white tracking-tight">
          Connect GitHub Repository
        </h1>
        <p className="text-xs text-[#8B949E] max-w-md mx-auto">
          Fetch and index real repository files for root cause investigation.
        </p>
      </div>

      {/* Connect Form */}
      <div className="p-6 rounded-lg bg-[#0D1017] border border-[#1E2333] space-y-4">
        <form onSubmit={handleConnect} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#8B949E] mb-1.5">
              Repository (e.g. owner/repo or full GitHub URL)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#6E7681]">
                <Github className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="e.g. expressjs/express"
                className="w-full pl-9 pr-3 py-2 bg-[#161B26] border border-[#1E2333] rounded text-xs text-white placeholder-[#6E7681] focus:outline-none focus:border-[#F97316]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#8B949E] mb-1.5">
                Branch
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#6E7681]">
                  <GitBranch className="w-3.5 h-3.5" />
                </div>
                <input
                  type="text"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  placeholder="main"
                  className="w-full pl-9 pr-3 py-2 bg-[#161B26] border border-[#1E2333] rounded text-xs text-white placeholder-[#6E7681] focus:outline-none focus:border-[#F97316]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#8B949E] mb-1.5">
                Personal Access Token <span className="text-[#6E7681]">(Optional)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#6E7681]">
                  <Lock className="w-3.5 h-3.5" />
                </div>
                <input
                  type="password"
                  value={authToken}
                  onChange={(e) => setAuthToken(e.target.value)}
                  placeholder="ghp_••••••••••••••••"
                  className="w-full pl-9 pr-3 py-2 bg-[#161B26] border border-[#1E2333] rounded text-xs text-white placeholder-[#6E7681] focus:outline-none focus:border-[#F97316]"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded bg-red-950/40 border border-red-800/40 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 rounded bg-[#F97316] hover:bg-[#EA580C] text-black font-semibold text-xs transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Fetching Repository Tree...</span>
              </>
            ) : (
              <>
                <span>Index Repository</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
