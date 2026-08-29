import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  Check, 
  Loader2, 
  ArrowRight,
  AlertCircle,
  Smartphone,
  Globe,
  FileCode
} from 'lucide-react';
import { decompressZipFile } from '../utils/bugScanner';

interface NewInvestigationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitFiles: (files: Record<string, string>, projectName: string) => Promise<void>;
  isLoading: boolean;
}

export const NewInvestigationModal: React.FC<NewInvestigationModalProps> = ({
  isOpen,
  onClose,
  onSubmitFiles,
  isLoading,
}) => {
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [isDecompressing, setIsDecompressing] = useState<boolean>(false);
  const [decompressedFiles, setDecompressedFiles] = useState<Record<string, string>>({});
  const [projectName, setProjectName] = useState<string>('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setUploadError(null);
    setIsDecompressing(true);

    try {
      const firstFile = fileList[0];
      const lowerName = firstFile.name.toLowerCase();
      
      if (
        lowerName.endsWith('.zip') || 
        lowerName.endsWith('.apk') || 
        lowerName.endsWith('.jar') || 
        lowerName.endsWith('.tar') || 
        lowerName.endsWith('.gz') ||
        lowerName.endsWith('.app')
      ) {
        setFileName(firstFile.name);
        const name = firstFile.name.replace(/\.[^/.]+$/, '');
        setProjectName(name);

        const extracted = await decompressZipFile(firstFile);
        if (Object.keys(extracted).length === 0) {
          throw new Error('No readable source files found inside the archive.');
        }
        setDecompressedFiles(extracted);
      } else {
        const filesMap: Record<string, string> = {};
        for (let i = 0; i < fileList.length; i++) {
          const f = fileList[i];
          const path = f.webkitRelativePath || f.name;
          if (!path.includes('node_modules/') && !path.includes('.git/')) {
            try {
              const text = await f.text();
              filesMap[path] = text;
            } catch (err) {
              // skip binary
            }
          }
        }

        if (Object.keys(filesMap).length === 0) {
          throw new Error('Could not extract readable files from selection.');
        }

        setFileName(fileList.length === 1 ? fileList[0].name : `${fileList.length} files selected`);
        setProjectName(fileList.length === 1 ? fileList[0].name : 'Uploaded Project');
        setDecompressedFiles(filesMap);
      }
    } catch (err: any) {
      setUploadError(err.message || 'Failed to read files. Please upload an APK, ZIP, or source files.');
    } finally {
      setIsDecompressing(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await handleFiles(e.dataTransfer.files);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Object.keys(decompressedFiles).length === 0) {
      setUploadError('Please select or upload files first.');
      return;
    }
    await onSubmitFiles(decompressedFiles, projectName || 'My App');
  };

  const fileCount = Object.keys(decompressedFiles).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-2xl bg-[#0F1420] border border-white/15 p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div>
            <h2 className="text-lg font-bold text-white">Upload & Investigate App</h2>
            <p className="text-xs text-slate-400">Scan Android APK, Web apps, ZIP archives, or code files</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-slate-300 font-bold uppercase mb-1.5">
              Project Name
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="e.g. MyMobileApp or ShopService"
              className="w-full px-3.5 py-2.5 bg-black/60 border border-white/15 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#F97316]"
            />
          </div>

          {/* Hidden file inputs */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".apk,.zip,.tar,.gz,.jar,.app,.js,.ts,.jsx,.tsx,.py,.java,.kt,.html,.css,.json,.xml,.c,.cpp,.go,.rb,.php,.sql,*"
            multiple
            onChange={(e) => handleFiles(e.target.files)}
            className="hidden"
          />
          <input
            ref={folderInputRef}
            type="file"
            // @ts-ignore
            webkitdirectory="true"
            directory="true"
            multiple
            onChange={(e) => handleFiles(e.target.files)}
            className="hidden"
          />

          {/* Dropzone */}
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
              dragActive
                ? 'border-[#F97316] bg-[#F97316]/10'
                : 'border-white/15 hover:border-white/25 bg-black/40'
            }`}
          >
            {isDecompressing ? (
              <div className="flex flex-col items-center justify-center py-4">
                <Loader2 className="w-7 h-7 text-[#F97316] animate-spin mb-2" />
                <p className="text-xs font-semibold text-white">Extracting files...</p>
              </div>
            ) : fileCount > 0 ? (
              <div className="flex flex-col items-center justify-center py-2">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-2">
                  <Check className="w-5 h-5 stroke-[3]" />
                </div>
                <p className="text-xs font-bold text-white">{fileName}</p>
                <p className="text-[11px] text-emerald-400 font-mono mt-0.5">
                  {fileCount} files extracted & ready
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-3 text-xs text-slate-400 hover:text-white underline cursor-pointer"
                >
                  Change file
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-4">
                <div className="w-10 h-10 rounded-full bg-[#F97316]/15 text-[#F97316] flex items-center justify-center mb-2">
                  <Upload className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-white mb-1">
                  Drag and drop APK, ZIP, or source files
                </p>
                <p className="text-[11px] text-slate-400 mb-4">
                  Supports Android APK, Web apps, ZIP archives, or single code files
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 rounded-lg bg-[#F97316] text-black text-xs font-bold transition-colors cursor-pointer"
                  >
                    Select File / APK / ZIP
                  </button>
                  <button
                    type="button"
                    onClick={() => folderInputRef.current?.click()}
                    className="px-4 py-2 rounded-lg bg-white/10 text-white text-xs font-medium border border-white/10 transition-colors cursor-pointer"
                  >
                    Select Folder
                  </button>
                </div>
              </div>
            )}
          </div>

          {uploadError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold border border-white/10 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={fileCount === 0 || isLoading || isDecompressing}
              className="px-5 py-2.5 rounded-lg bg-[#F97316] hover:bg-[#FB923C] disabled:opacity-50 text-black font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Scanning...</span>
                </>
              ) : (
                <>
                  <span>Start Investigation</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
