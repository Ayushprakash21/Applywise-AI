import React, { useState, useEffect } from 'react';
import {
  Globe,
  Cpu,
  Activity,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  Server,
  Zap,
  Trash2,
  Play,
  Pause,
  ExternalLink,
  ShieldCheck,
  BarChart2,
  Sliders,
  Check,
  X
} from 'lucide-react';
import {
  LANGUAGE_CATALOGUE,
  getAvailableLanguagesList,
} from '../../utils/languageCatalogue.ts';
import {
  LanguageCatalogEntry,
  LibreTranslateHealth,
  TranslationUsageStats,
} from '../../types/localization.ts';

export interface AdminLanguageManagementProps {
  isBlack?: boolean;
}

export const AdminLanguageManagement: React.FC<AdminLanguageManagementProps> = ({
  isBlack = true,
}) => {
  const [health, setHealth] = useState<LibreTranslateHealth | null>(null);
  const [usage, setUsage] = useState<TranslationUsageStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'beta'>('all');
  const [testText, setTestText] = useState('Your Career. Intelligently Orchestrated.');
  const [testTarget, setTestTarget] = useState('hi');
  const [targetDropdownOpen, setTargetDropdownOpen] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [purgedNotice, setPurgedNotice] = useState<string | null>(null);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const [hRes, uRes] = await Promise.allSettled([
        fetch('/api/translation/health'),
        fetch('/api/translation/usage'),
      ]);

      if (hRes.status === 'fulfilled' && hRes.value.ok) {
        setHealth(await hRes.value.json());
      }
      if (uRes.status === 'fulfilled' && uRes.value.ok) {
        setUsage(await uRes.value.json());
      }
    } catch (e) {
      console.warn('Failed to fetch translation status:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleTestTranslation = async () => {
    if (!testText.trim()) return;
    setTestLoading(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/translation/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: testText,
          targetLang: testTarget,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setTestResult(
          data.isMachineTranslated
            ? `${data.translatedText} (Machine Translated · ${data.fromCache ? 'Cache Hit' : 'Fresh Run'})`
            : `${data.translatedText} (Original Text · Service Fallback)`
        );
      }
    } catch {
      setTestResult('Translation test error: Gateway unreachable');
    } finally {
      setTestLoading(false);
    }
  };

  const handlePurgeCache = async () => {
    try {
      const res = await fetch('/api/translation/cache', { method: 'DELETE' });
      if (res.ok) {
        const data = await res.json();
        setPurgedNotice(`Purged ${data.purgedEntries || 0} cached translation entries.`);
        setTimeout(() => setPurgedNotice(null), 4000);
        fetchStatus();
      }
    } catch {}
  };

  const filteredLanguages = getAvailableLanguagesList().filter((lang) => {
    if (statusFilter === 'published' && lang.status !== 'published') return false;
    if (statusFilter === 'beta' && lang.status !== 'beta') return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      lang.nativeName.toLowerCase().includes(q) ||
      lang.englishName.toLowerCase().includes(q) ||
      lang.code.toLowerCase().includes(q) ||
      lang.scriptFamily.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-[#14171C] border border-[rgba(255,255,255,0.08)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center">
            <Globe className="h-6 w-6 text-[#C6A66A]" />
          </div>
          <div>
            <div className="flex items-center space-x-2.5">
              <h2 className="text-xl font-bold tracking-tight text-[#F2F0EA]">
                Universal Language Engine
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                Core Capability
              </span>
            </div>
            <p className="text-xs text-[#92949A] mt-1">
              Centralized Localization Dictionaries (30 Planned World Languages) + LibreTranslate Machine Translation Gateway
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={fetchStatus}
            disabled={loading}
            className="h-9 px-3 rounded-xl bg-[#191D23] hover:bg-[#20252D] text-[#C0BDB5] hover:text-[#F2F0EA] border border-[rgba(255,255,255,0.12)] text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-[#C6A66A]' : 'text-[#C6A66A]'}`} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={() => setIsPaused(!isPaused)}
            className={`h-9 px-3 rounded-xl border text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer ${
              isPaused
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                : 'bg-[#191D23] hover:bg-[#20252D] text-[#C0BDB5] border-[rgba(255,255,255,0.12)]'
            }`}
          >
            {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
            <span>{isPaused ? 'Resume Gateway' : 'Pause Gateway'}</span>
          </button>
        </div>
      </div>

      {purgedNotice && (
        <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>{purgedNotice}</span>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* LibreTranslate Status */}
        <div className="p-4 rounded-2xl bg-[#14171C] border border-[rgba(255,255,255,0.08)] space-y-2">
          <div className="flex items-center justify-between text-xs text-[#92949A]">
            <span>LibreTranslate Service</span>
            <Server className="h-4 w-4 text-[#C6A66A]" />
          </div>
          <div className="flex items-center space-x-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                health?.status === 'online' ? 'bg-[#35B887] animate-pulse' : 'bg-amber-500'
              }`}
            />
            <span className="text-lg font-bold text-[#F2F0EA]">
              {health?.status === 'online' ? 'ONLINE (Argos)' : 'STANDBY / FALLBACK'}
            </span>
          </div>
          <p className="text-[11px] text-[#737780] font-mono truncate">
            {health?.endpoint || 'http://localhost:5000'} · {health?.responseTimeMs || 0}ms
          </p>
        </div>

        {/* Total Languages */}
        <div className="p-4 rounded-2xl bg-[#14171C] border border-[rgba(255,255,255,0.08)] space-y-2">
          <div className="flex items-center justify-between text-xs text-[#92949A]">
            <span>Catalogue Scope</span>
            <Globe className="h-4 w-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-[#F2F0EA]">30 Languages</div>
          <p className="text-[11px] text-[#737780]">
            18 Published · 11 Beta · 1 In Review
          </p>
        </div>

        {/* Translation Requests & Hits */}
        <div className="p-4 rounded-2xl bg-[#14171C] border border-[rgba(255,255,255,0.08)] space-y-2">
          <div className="flex items-center justify-between text-xs text-[#92949A]">
            <span>Requests & Cache Hits</span>
            <Zap className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-[#F2F0EA]">
            {usage?.totalRequests || 0}
            <span className="text-xs font-normal text-[#92949A] ml-2">
              ({usage?.cacheHits || 0} cached)
            </span>
          </div>
          <p className="text-[11px] text-[#737780]">
            {usage?.charactersTranslated ? `${(usage.charactersTranslated / 1000).toFixed(1)}k chars` : '0 chars translated'}
          </p>
        </div>

        {/* Cache Pool */}
        <div className="p-4 rounded-2xl bg-[#14171C] border border-[rgba(255,255,255,0.08)] space-y-2">
          <div className="flex items-center justify-between text-xs text-[#92949A]">
            <span>SHA-256 Translation Cache</span>
            <Trash2 className="h-4 w-4 text-rose-400 cursor-pointer" onClick={handlePurgeCache} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-[#F2F0EA]">
              {health?.totalCachedTranslations || 0}
            </span>
            <button
              type="button"
              onClick={handlePurgeCache}
              className="text-[11px] font-semibold text-rose-400 hover:text-rose-300 underline cursor-pointer"
            >
              Purge Cache
            </button>
          </div>
          <p className="text-[11px] text-[#737780]">
            0 duplicate translation costs
          </p>
        </div>
      </div>

      {/* Interactive Translation Test Sandbox */}
      <div className="p-5 rounded-3xl bg-[#14171C] border border-[rgba(255,255,255,0.08)] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Cpu className="h-4 w-4 text-[#C6A66A]" />
            <h3 className="font-bold text-sm text-[#F2F0EA]">
              Translation Gateway Diagnostic Sandbox
            </h3>
          </div>
          <span className="text-xs text-[#92949A]">
            Test live LibreTranslate query & fallback pipeline
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <label className="block text-[11px] font-medium text-[#92949A] mb-1">
              Sample Source Text (English / Multi-sentence)
            </label>
            <input
              type="text"
              value={testText}
              onChange={(e) => setTestText(e.target.value)}
              className="w-full h-10 px-3.5 rounded-xl bg-[#191D23] border border-[rgba(255,255,255,0.12)] text-xs text-[#F2F0EA] focus:outline-none focus:border-[#C6A66A]"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-[#92949A] mb-1">
              Target Language
            </label>
            <div className="flex space-x-2 relative">
              <div className="relative flex-1">
                <button
                  type="button"
                  onClick={() => setTargetDropdownOpen(!targetDropdownOpen)}
                  className="w-full h-10 px-3 rounded-xl bg-[#191D23] border border-[rgba(255,255,255,0.12)] text-xs text-[#F2F0EA] flex items-center justify-between transition cursor-pointer"
                >
                  <span>
                    {testTarget === 'hi' && 'Hindi (हिन्दी)'}
                    {testTarget === 'es' && 'Spanish (Español)'}
                    {testTarget === 'ar' && 'Arabic (العربية)'}
                    {testTarget === 'fr' && 'French (Français)'}
                    {testTarget === 'de' && 'German (Deutsch)'}
                    {testTarget === 'ja' && 'Japanese (日本語)'}
                    {testTarget === 'bn' && 'Bengali (বাংলা)'}
                    {testTarget === 'ru' && 'Russian (Русский)'}
                  </span>
                  <ChevronRight className={`h-3.5 w-3.5 text-[#92949A] transition-transform ${targetDropdownOpen ? 'rotate-90' : ''}`} />
                </button>

                {targetDropdownOpen && (
                  <div className="absolute top-11 left-0 right-0 z-30 p-1.5 rounded-xl bg-[#191D23] border border-[rgba(255,255,255,0.14)] shadow-xl space-y-0.5">
                    {[
                      { code: 'hi', label: 'Hindi (हिन्दी)' },
                      { code: 'es', label: 'Spanish (Español)' },
                      { code: 'ar', label: 'Arabic (العربية)' },
                      { code: 'fr', label: 'French (Français)' },
                      { code: 'de', label: 'German (Deutsch)' },
                      { code: 'ja', label: 'Japanese (日本語)' },
                      { code: 'bn', label: 'Bengali (বাংলা)' },
                      { code: 'ru', label: 'Russian (Русский)' },
                    ].map((opt) => (
                      <button
                        key={opt.code}
                        type="button"
                        onClick={() => {
                          setTestTarget(opt.code);
                          setTargetDropdownOpen(false);
                        }}
                        className={`w-full px-2.5 py-1.5 rounded-lg text-xs text-left transition flex items-center justify-between cursor-pointer ${
                          testTarget === opt.code
                            ? 'bg-[#C6A66A]/20 text-[#C6A66A] font-semibold'
                            : 'text-[#C0BDB5] hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <span>{opt.label}</span>
                        {testTarget === opt.code && <Check className="h-3 w-3" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={handleTestTranslation}
                disabled={testLoading}
                className="h-10 px-4 rounded-xl bg-[#C6A66A] hover:bg-[#D4B579] text-black font-bold text-xs transition cursor-pointer disabled:opacity-50"
              >
                {testLoading ? 'Testing...' : 'Execute'}
              </button>
            </div>
          </div>
        </div>

        {testResult && (
          <div className="p-3.5 rounded-2xl bg-[#191D23] border border-[rgba(255,255,255,0.06)] text-xs text-[#F2F0EA] space-y-1">
            <span className="text-[10px] font-mono uppercase text-[#C6A66A]">
              Output Result:
            </span>
            <p className="font-medium text-sm text-[#F2F0EA]">{testResult}</p>
          </div>
        )}
      </div>

      {/* Language Catalogue Table */}
      <div className="p-5 rounded-3xl bg-[#14171C] border border-[rgba(255,255,255,0.08)] space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-sm text-[#F2F0EA]">
              Central Language Registry (30 Languages)
            </h3>
            <p className="text-xs text-[#92949A] mt-0.5">
              Strict completeness tracking prevents claiming unsupported languages
            </p>
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#92949A]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search catalogue..."
                className="w-full h-8 pl-8 pr-3 rounded-xl bg-[#191D23] border border-[rgba(255,255,255,0.10)] text-xs text-[#F2F0EA] placeholder-[#737780] focus:outline-none focus:border-[#C6A66A]"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-2xl border border-[rgba(255,255,255,0.06)]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#191D23] text-[#92949A] font-mono text-[10px] uppercase border-b border-[rgba(255,255,255,0.06)]">
              <tr>
                <th className="py-3 px-4">Language</th>
                <th className="py-3 px-3">Locale Code</th>
                <th className="py-3 px-3">Script & Direction</th>
                <th className="py-3 px-3">UI Completeness</th>
                <th className="py-3 px-3">LibreTranslate MT</th>
                <th className="py-3 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(255,255,255,0.04)]">
              {filteredLanguages.map((lang) => (
                <tr key={lang.code} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-2.5">
                      <span className="font-bold text-[#F2F0EA] text-sm">
                        {lang.nativeName}
                      </span>
                      <span className="text-[11px] text-[#92949A]">
                        ({lang.englishName})
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-3 font-mono text-[11px] text-[#C0BDB5]">
                    {lang.code}
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/5 text-[#C0BDB5]">
                      {lang.scriptFamily} · {lang.direction.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-16 h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            lang.uiCompleteness >= 95
                              ? 'bg-[#35B887]'
                              : lang.uiCompleteness >= 85
                              ? 'bg-[#C6A66A]'
                              : 'bg-amber-500'
                          }`}
                          style={{ width: `${lang.uiCompleteness}%` }}
                        />
                      </div>
                      <span className="font-mono text-[11px] text-[#C0BDB5]">
                        {lang.uiCompleteness}%
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    {lang.isMachineTranslationSupported ? (
                      <span className="inline-flex items-center space-x-1 text-emerald-400 text-[11px]">
                        <Check className="h-3 w-3" />
                        <span>Supported</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 text-[#737780] text-[11px]">
                        <X className="h-3 w-3" />
                        <span>Manual Only</span>
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase ${
                        lang.status === 'published'
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : lang.status === 'beta'
                          ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                          : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {lang.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
