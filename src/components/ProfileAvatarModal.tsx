import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Camera, 
  Upload, 
  Smartphone, 
  Laptop, 
  Sparkles, 
  Image as ImageIcon, 
  Check, 
  Trash2, 
  Globe, 
  AlertCircle,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';

export interface AvatarPreset {
  id: string;
  label: string;
  category: string;
  url: string;
}

export const AVATAR_PRESETS: AvatarPreset[] = [
  {
    id: 'cyber-sentinel',
    label: 'Sentinel',
    category: 'Cyber Bot',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Sentinel&backgroundColor=161b26',
  },
  {
    id: 'neural-coder',
    label: 'Neural',
    category: 'Cyber Bot',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=NeuralCoder&backgroundColor=0f172a',
  },
  {
    id: 'matrix-hacker',
    label: 'Matrix',
    category: 'Cyber Bot',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=MatrixBug&backgroundColor=064e3b',
  },
  {
    id: 'quantum-core',
    label: 'Quantum',
    category: 'AI Engine',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Quantum&backgroundColor=311042',
  },
  {
    id: 'apex-debugger',
    label: 'Debugger',
    category: 'AI Engine',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=ApexDebug&backgroundColor=431407',
  },
  {
    id: 'cyber-pilot',
    label: 'Pilot',
    category: 'Cyber Bot',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=CyberPilot&backgroundColor=1e1e2e',
  },
  {
    id: 'crypto-guardian',
    label: 'Guardian',
    category: 'Security',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=GuardianShield&backgroundColor=1e293b',
  },
  {
    id: 'bio-synthetic',
    label: 'Synthetic',
    category: 'Cyber Bot',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=BioSynth&backgroundColor=022c22',
  },
  {
    id: 'vector-prism',
    label: 'Prism',
    category: 'AI Engine',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=PrismCore&backgroundColor=2e1065',
  },
  {
    id: 'turbo-dev',
    label: 'Turbo Dev',
    category: 'Developer',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=TurboDev&backgroundColor=3f2c00',
  },
  {
    id: 'echo-pulse',
    label: 'Echo',
    category: 'Security',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=EchoPulse&backgroundColor=172554',
  },
  {
    id: 'binary-phantom',
    label: 'Phantom',
    category: 'Developer',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=PhantomNode&backgroundColor=18181b',
  }
];

interface ProfileAvatarModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAvatarUrl: string;
  username: string;
  onSelectAvatar: (url: string) => void;
}

type ModalTab = 'device' | 'presets' | 'url';

export const ProfileAvatarModal: React.FC<ProfileAvatarModalProps> = ({
  isOpen,
  onClose,
  currentAvatarUrl,
  username,
  onSelectAvatar,
}) => {
  const [activeTab, setActiveTab] = useState<ModalTab>('device');
  const [previewUrl, setPreviewUrl] = useState<string>(currentAvatarUrl || '');
  const [customUrlInput, setCustomUrlInput] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Process File from Device (Computer / Mobile)
  const processImageFile = (file: File) => {
    setErrorMsg(null);
    setSuccessNotice(null);

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Unsupported format. Please select a valid image (PNG, JPG, WebP, SVG, or GIF).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Image size exceeds 5MB limit. Please choose a smaller photo.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      if (typeof e.target?.result === 'string') {
        setPreviewUrl(e.target.result);
        setSuccessNotice(`Loaded "${file.name}" (${(file.size / 1024).toFixed(1)} KB)`);
      }
    };
    reader.onerror = () => {
      setErrorMsg('Failed to process image file. Please try another file.');
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleApplyUrl = () => {
    setErrorMsg(null);
    const trimmed = customUrlInput.trim();
    if (!trimmed) {
      setErrorMsg('Please enter a valid image URL.');
      return;
    }
    if (!/^https?:\/\/.+/i.test(trimmed)) {
      setErrorMsg('Image URL must start with http:// or https://');
      return;
    }
    setPreviewUrl(trimmed);
    setSuccessNotice('Custom image URL applied to preview.');
  };

  const handleSaveAndApply = () => {
    onSelectAvatar(previewUrl);
    onClose();
  };

  const categories = ['All', ...Array.from(new Set(AVATAR_PRESETS.map((p) => p.category)))];

  const filteredPresets = selectedCategory === 'All' 
    ? AVATAR_PRESETS 
    : AVATAR_PRESETS.filter((p) => p.category === selectedCategory);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in font-sans">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-2xl rounded-2xl bg-[#0B0F17] border border-[#1E2333] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#1E2333] flex items-center justify-between bg-[#0E1420]/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#F97316]/15 border border-[#F97316]/30 flex items-center justify-center text-[#F97316]">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white tracking-tight">
                Profile Avatar Studio
              </h2>
              <p className="text-xs text-[#8B949E]">
                Select from presets, upload from your computer or phone camera
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8B949E] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Preview Bar */}
        <div className="p-4 bg-[#080B11] border-b border-[#1E2333] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="relative">
              <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-[#F97316] bg-[#161B26] flex items-center justify-center shadow-lg">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Preview"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#F97316] font-bold text-lg">
                    {username ? username.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
              </div>
              <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-[9px] font-mono text-emerald-400 font-bold">
                PREVIEW
              </span>
            </div>

            <div>
              <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                <span>{username || 'Developer'}</span>
                <span className="text-[10px] text-[#6E7681] font-mono">• Active Workspace Identity</span>
              </div>
              <p className="text-[11px] text-[#8B949E] mt-0.5">
                {previewUrl ? 'Custom avatar image loaded' : 'Default initials avatar'}
              </p>
            </div>
          </div>

          {previewUrl && (
            <button
              type="button"
              onClick={() => setPreviewUrl('')}
              className="px-2.5 py-1.5 rounded-lg bg-[#141C2B] hover:bg-rose-950/40 border border-slate-700 hover:border-rose-500/40 text-[#8B949E] hover:text-rose-300 transition-colors text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Avatar</span>
            </button>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#1E2333] bg-[#0E1420] text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('device')}
            className={`flex-1 py-2.5 px-4 flex items-center justify-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'device'
                ? 'border-[#F97316] text-[#F97316] font-semibold bg-[#141C2B]'
                : 'border-transparent text-[#8B949E] hover:text-[#E2E8F0]'
            }`}
          >
            <Laptop className="w-4 h-4" />
            <span>Device Image &amp; Camera</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('presets')}
            className={`flex-1 py-2.5 px-4 flex items-center justify-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'presets'
                ? 'border-[#F97316] text-[#F97316] font-semibold bg-[#141C2B]'
                : 'border-transparent text-[#8B949E] hover:text-[#E2E8F0]'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Preset Gallery ({AVATAR_PRESETS.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('url')}
            className={`flex-1 py-2.5 px-4 flex items-center justify-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'url'
                ? 'border-[#F97316] text-[#F97316] font-semibold bg-[#141C2B]'
                : 'border-transparent text-[#8B949E] hover:text-[#E2E8F0]'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>Image Web URL</span>
          </button>
        </div>

        {/* Notification alerts */}
        {errorMsg && (
          <div className="mx-4 mt-3 p-2.5 rounded-lg bg-rose-950/50 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successNotice && (
          <div className="mx-4 mt-3 p-2.5 rounded-lg bg-emerald-950/50 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successNotice}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: DEVICE UPLOAD & MOBILE CAMERA */}
          {activeTab === 'device' && (
            <div className="space-y-4">
              {/* Drag & Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`p-6 rounded-2xl border-2 border-dashed text-center transition-all flex flex-col items-center justify-center gap-3 cursor-pointer ${
                  isDragging
                    ? 'border-[#F97316] bg-[#F97316]/10 shadow-[0_0_20px_rgba(249,115,22,0.2)]'
                    : 'border-[#2B3245] bg-[#0E1420] hover:border-[#F97316]/60 hover:bg-[#141C2B]'
                }`}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="w-12 h-12 rounded-2xl bg-[#1E2333] border border-slate-700 flex items-center justify-center text-[#F97316] shadow-sm">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-white">
                    Click to browse or drag &amp; drop an image
                  </h3>
                  <p className="text-xs text-[#8B949E]">
                    Direct access from your Computer, Mac, iPhone, Android, or Tablet
                  </p>
                  <p className="text-[11px] text-[#6E7681]">
                    Supports PNG, JPEG, WebP, SVG, and GIF (up to 5MB)
                  </p>
                </div>
              </div>

              {/* Action Buttons for Device & Mobile Camera */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Standard File Picker */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3 rounded-xl bg-[#141C2B] hover:bg-[#1C2638] border border-slate-700 hover:border-slate-500 text-white flex items-center gap-3 transition-colors cursor-pointer text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#F97316]/15 border border-[#F97316]/30 flex items-center justify-center text-[#F97316] shrink-0">
                    <Laptop className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold block text-white">Choose File from Device</span>
                    <span className="text-[10px] text-[#8B949E] block">Open photo gallery or folder</span>
                  </div>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png, image/jpeg, image/webp, image/svg+xml, image/gif"
                  onChange={handleFileInputChange}
                  className="hidden"
                />

                {/* Mobile Camera / Direct Capture */}
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="p-3 rounded-xl bg-[#141C2B] hover:bg-[#1C2638] border border-slate-700 hover:border-slate-500 text-white flex items-center gap-3 transition-colors cursor-pointer text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                    <Camera className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold block text-white">Camera Photo / Mobile</span>
                    <span className="text-[10px] text-[#8B949E] block">Take a picture directly</span>
                  </div>
                </button>
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="user"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
              </div>
            </div>
          )}

          {/* TAB 2: PRESET GALLERY */}
          {activeTab === 'presets' && (
            <div className="space-y-4">
              {/* Category Pills */}
              <div className="flex flex-wrap items-center gap-1.5 pb-1">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-[#F97316] text-black font-bold shadow-xs'
                        : 'bg-[#141C2B] text-[#8B949E] hover:text-white border border-slate-800'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Presets Grid */}
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {filteredPresets.map((preset) => {
                  const isSelected = previewUrl === preset.url;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setPreviewUrl(preset.url);
                        setErrorMsg(null);
                        setSuccessNotice(`Selected preset "${preset.label}"`);
                      }}
                      className={`group p-2 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer relative ${
                        isSelected
                          ? 'bg-[#F97316]/15 border-[#F97316] ring-2 ring-[#F97316]/50 shadow-[0_0_15px_rgba(249,115,22,0.25)]'
                          : 'bg-[#141C2B] border-slate-800 hover:border-slate-600 hover:bg-[#1A2436]'
                      }`}
                    >
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-[#0A0E17] flex items-center justify-center p-0.5">
                        <img
                          src={preset.url}
                          alt={preset.label}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover rounded-full"
                        />
                      </div>
                      <span className="text-[11px] font-medium text-[#C9D1D9] group-hover:text-white truncate w-full text-center">
                        {preset.label}
                      </span>
                      {isSelected && (
                        <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#F97316] text-black flex items-center justify-center text-[10px] font-bold">
                          ✓
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: CUSTOM WEB URL */}
          {activeTab === 'url' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#0E1420] border border-[#1E2333] space-y-3">
                <label className="text-xs font-semibold text-white block">
                  Paste Avatar Image Link / Hosted Asset
                </label>
                <p className="text-xs text-[#8B949E]">
                  Provide a direct HTTPS URL to any public avatar, GitHub profile picture, or Gravatar asset.
                </p>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={customUrlInput}
                    onChange={(e) => setCustomUrlInput(e.target.value)}
                    placeholder="https://images.unsplash.com/... or https://github.com/..."
                    className="flex-1 px-3.5 py-2 rounded-lg bg-[#141C2B] border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-[#F97316]"
                  />
                  <button
                    type="button"
                    onClick={handleApplyUrl}
                    className="px-4 py-2 rounded-lg bg-[#F97316] hover:bg-[#EA580C] text-black font-semibold text-xs cursor-pointer transition-colors"
                  >
                    Apply URL
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#1E2333] bg-[#0E1420] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[#141C2B] hover:bg-[#1E293B] border border-slate-700 text-[#8B949E] hover:text-white text-xs font-medium cursor-pointer transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSaveAndApply}
            className="px-5 py-2.5 rounded-lg bg-[#F97316] hover:bg-[#EA580C] text-black font-bold text-xs cursor-pointer flex items-center gap-2 shadow-md transition-transform active:scale-98"
          >
            <Check className="w-4 h-4" />
            <span>Apply Selected Avatar</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
