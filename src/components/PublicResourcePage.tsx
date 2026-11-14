// src/components/PublicResourcePage.tsx
// Public, canonical, indexable educational resource viewer for ApplyVise

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Clock,
  CheckCircle2,
  ArrowLeft,
  Share2,
  Sparkles,
  ArrowRight,
  BookOpen,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { api } from '../services/api.ts';
import { MarketingContentItem } from '../types/growthEngine.ts';
import { BrandLogo } from './BrandLogo.tsx';

interface PublicResourcePageProps {
  slug?: string;
  onNavigateHome: () => void;
  onNavigateRoute: (route: string) => void;
}

export const PublicResourcePage: React.FC<PublicResourcePageProps> = ({
  slug,
  onNavigateHome,
  onNavigateRoute,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [article, setArticle] = useState<MarketingContentItem | null>(null);
  const [allArticles, setAllArticles] = useState<MarketingContentItem[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        if (slug) {
          const res = await api.getPublicResourceBySlug(slug);
          if (res.success && res.article) {
            setArticle(res.article);
            // Dynamic page title & canonical
            document.title = res.article.seoTitle || `${res.article.title} | ApplyVise AI`;
          } else {
            setError('Article not found or unpublished.');
          }
        } else {
          // Fetch catalog
          const res = await api.getPublicResources();
          if (res.success && res.articles) {
            setAllArticles(res.articles);
            document.title = 'Career & ATS Intelligence Resource Hub | ApplyVise AI';
          }
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load resource');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-950 text-stone-200 flex flex-col items-center justify-center p-6">
        <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-stone-400">Loading career intelligence guide...</p>
      </div>
    );
  }

  // Individual Article View
  if (slug && article) {
    return (
      <div className="min-h-screen bg-stone-950 text-stone-200 selection:bg-amber-500 selection:text-black">
        {/* Navigation Bar */}
        <header className="sticky top-0 z-50 bg-stone-950/90 backdrop-blur-md border-b border-stone-850 px-6 py-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <button
              type="button"
              onClick={onNavigateHome}
              className="flex items-center gap-2 text-white hover:opacity-90 transition"
            >
              <BrandLogo size="sm" />
              <span className="font-extrabold tracking-tight text-lg">ApplyVise <span className="text-amber-400 font-normal text-xs uppercase tracking-widest ml-1">AI</span></span>
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onNavigateRoute('/resources')}
                className="text-xs text-stone-400 hover:text-white transition flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> All Guides
              </button>
              <button
                type="button"
                onClick={() => onNavigateRoute('/signup')}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-black transition"
              >
                Sign Up Free
              </button>
            </div>
          </div>
        </header>

        {/* Main Article Container */}
        <main className="max-w-3xl mx-auto px-6 py-12">
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-1.5 text-xs text-stone-500 mb-6 font-mono">
            <button type="button" onClick={onNavigateHome} className="hover:text-stone-300">Home</button>
            <ChevronRight className="w-3 h-3" />
            <button type="button" onClick={() => onNavigateRoute('/resources')} className="hover:text-stone-300">Resources</button>
            <ChevronRight className="w-3 h-3" />
            <span className="text-stone-300 truncate max-w-xs">{article.title}</span>
          </nav>

          {/* Header Metadata */}
          <div className="space-y-4 mb-8">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
                {article.contentType.replace('_', ' ')}
              </span>
              <span className="text-xs text-stone-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> {article.readTimeMinutes} min read
              </span>
              <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Verified Grounded
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              {article.title}
            </h1>

            <p className="text-base text-stone-400 leading-relaxed">
              {article.metaDescription}
            </p>

            <div className="flex items-center justify-between pt-4 border-t border-stone-850 text-xs text-stone-500">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-xs">
                  AV
                </div>
                <span>ApplyVise Career Intelligence Team</span>
              </div>
              <span>Updated {new Date(article.publishedAt || article.updatedAt).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Table of Contents if available */}
          {article.outline && article.outline.length > 0 && (
            <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 mb-8 text-xs">
              <h4 className="font-bold text-stone-200 uppercase tracking-wider mb-2.5 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-amber-400" /> In This Guide
              </h4>
              <ul className="space-y-1.5 text-stone-400">
                {article.outline.map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-amber-400 font-bold font-mono">{i + 1}.</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Body Content */}
          <article className="prose prose-invert prose-stone max-w-none text-stone-300 leading-relaxed text-sm space-y-6">
            <div className="whitespace-pre-wrap font-sans text-sm leading-relaxed space-y-4">
              {article.bodyMarkdown}
            </div>
          </article>

          {/* Call to Action Box */}
          <div className="mt-12 bg-gradient-to-r from-stone-900 to-stone-950 border border-amber-500/40 rounded-2xl p-6 sm:p-8 relative overflow-hidden">
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase bg-amber-500/10 text-amber-400 mb-2">
                  <Sparkles className="w-3.5 h-3.5" /> Next Career Move
                </span>
                <h3 className="text-xl font-extrabold text-white">
                  Stop Guessing What Recruiters Want
                </h3>
                <p className="text-xs sm:text-sm text-stone-400 mt-1 max-w-md">
                  ApplyVise AI analyzes your authentic career trajectory, binds resume bullets to verified facts, and unlocks Supervised Autopilot.
                </p>
              </div>

              <button
                type="button"
                onClick={() => onNavigateRoute(article.callToAction?.url || '/signup')}
                className="px-6 py-3 rounded-xl text-sm font-bold bg-amber-500 hover:bg-amber-400 text-black flex items-center gap-2 transition shadow-lg shrink-0 self-start sm:self-auto"
              >
                <span>{article.callToAction?.text || 'Get Started Free'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Catalog View (/resources)
  return (
    <div className="min-h-screen bg-stone-950 text-stone-200">
      <header className="sticky top-0 z-50 bg-stone-950/90 backdrop-blur-md border-b border-stone-850 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <button
            type="button"
            onClick={onNavigateHome}
            className="flex items-center gap-2 text-white hover:opacity-90 transition"
          >
            <BrandLogo size="sm" />
            <span className="font-extrabold tracking-tight text-lg">ApplyVise <span className="text-amber-400 font-normal text-xs uppercase tracking-widest ml-1">AI</span></span>
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigateRoute('/pricing')}
              className="text-xs text-stone-400 hover:text-white transition"
            >
              Pricing
            </button>
            <button
              type="button"
              onClick={() => onNavigateRoute('/signup')}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-black transition"
            >
              Sign Up Free
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-3">
            <BookOpen className="w-3.5 h-3.5" /> Career & ATS Intelligence Hub
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Authoritative Guides for Modern Job Seekers
          </h1>
          <p className="text-sm text-stone-400 mt-2">
            Deterministic career advice, ATS technical breakdowns, and verified behavioral interview strategies produced by the ApplyVise autonomous growth engine.
          </p>
        </div>

        {allArticles.length === 0 ? (
          <div className="text-center py-12 text-stone-500 text-sm">
            Zero published articles found in the hub. Check back shortly.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {allArticles.map((art) => (
              <div
                key={art.id}
                onClick={() => onNavigateRoute(`/resources/${art.slug}`)}
                className="bg-stone-900 border border-stone-800 hover:border-amber-500/40 p-6 rounded-2xl flex flex-col justify-between cursor-pointer transition group shadow-lg"
              >
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-stone-800 text-amber-400">
                      {art.contentType.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-stone-500 font-mono">
                      {art.readTimeMinutes} min read
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white group-hover:text-amber-400 transition leading-snug">
                    {art.title}
                  </h3>
                  <p className="text-xs text-stone-400 mt-2 line-clamp-3 leading-relaxed">
                    {art.metaDescription}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-stone-850 flex items-center justify-between text-xs font-semibold text-amber-400">
                  <span>Read Full Guide</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
