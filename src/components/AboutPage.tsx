import React from 'react';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Briefcase,
  Bot,
  BrainCircuit,
  FileCheck2,
  Lock,
  Layers,
  CheckCircle2,
  Zap,
  Clock,
  Compass,
  Target
} from 'lucide-react';
import { BrandLogo } from './BrandLogo.tsx';
import { FounderSection } from './FounderSection.tsx';

interface AboutPageProps {
  onGetStarted: () => void;
  onExplorePro: () => void;
  onNavigateHome: () => void;
}

export const AboutPage: React.FC<AboutPageProps> = ({
  onGetStarted,
  onExplorePro,
  onNavigateHome,
}) => {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col font-sans">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <BrandLogo size="md" onClick={onNavigateHome} />

          <div className="flex items-center space-x-3">
            <button
              onClick={onNavigateHome}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
            >
              Home
            </button>
            <button
              onClick={onExplorePro}
              className="px-3.5 py-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 transition"
            >
              Pricing & Pro
            </button>
            <button
              onClick={onGetStarted}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm shadow-blue-500/20 transition flex items-center space-x-1.5"
            >
              <span>Get Started Free</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-20 md:pt-24 md:pb-28">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-blue-100/50 via-indigo-50/20 to-transparent pointer-events-none -z-10 rounded-full blur-3xl opacity-70" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-6">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-semibold shadow-xs">
            <Sparkles className="h-3.5 w-3.5 text-blue-600" />
            <span>About ApplyWise AI</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            A Smarter Way to Navigate <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              Your Career Journey
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-600 leading-relaxed">
            ApplyWise AI is designed to bring job-search organization, career preparation, and practical AI assistance together in one experience.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={onGetStarted}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-md shadow-blue-500/20 transition flex items-center space-x-2"
            >
              <span>Explore ApplyWise AI</span>
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={onExplorePro}
              className="px-6 py-3 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold shadow-xs hover:shadow-sm transition"
            >
              Explore Pro Features
            </button>
          </div>
        </div>
      </section>

      {/* Our Story, Mission & Vision */}
      <section className="py-16 bg-white border-y border-slate-200/70">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-16">
          {/* Our Story */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            <div className="md:col-span-4">
              <span className="text-xs uppercase font-mono tracking-widest text-blue-600 font-semibold">Origin</span>
              <h2 className="text-2xl font-bold text-slate-900 mt-1">Our Story</h2>
            </div>
            <div className="md:col-span-8 space-y-4 text-xs sm:text-sm text-slate-600 leading-relaxed">
              <p>
                ApplyWise AI was created around the real-world friction of modern job searching: repetitive applications, scattered tracking spreadsheets, inconsistent resume adjustments, and the overwhelming effort involved in presenting oneself effectively across different opportunities.
              </p>
              <p>
                Rather than treating AI as a superficial gimmick or an engine for generating fictional claims, ApplyWise AI was founded on the belief that career technology should be grounded in truthfulness, structured organization, and disciplined assistance.
              </p>
              <p>
                Today, the platform is an evolving career ecosystem where candidates can discover verified vacancies across global aggregators, match their authentic experience, and prepare tailored documents with zero-hallucination verification.
              </p>
            </div>
          </div>

          <div className="border-t border-slate-100" />

          {/* Mission & Vision Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-8 rounded-3xl bg-blue-50/50 border border-blue-200/70 space-y-3 relative overflow-hidden">
              <div className="p-3 bg-blue-600 text-white rounded-2xl w-fit shadow-md shadow-blue-500/20">
                <Target className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Our Mission</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                "Our mission is to help job seekers manage their career journey with greater clarity, confidence, and efficiency by combining practical tools with responsible AI."
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-indigo-50/50 border border-indigo-200/70 space-y-3 relative overflow-hidden">
              <div className="p-3 bg-indigo-600 text-white rounded-2xl w-fit shadow-md shadow-indigo-500/20">
                <Compass className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Our Vision</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                "Our vision is to create a connected career platform where job discovery, application management, preparation, and personalized AI assistance work together."
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What We Are Building */}
      <section className="py-20 max-w-6xl mx-auto px-4 sm:px-6 space-y-12">
        <div className="text-center max-w-3xl mx-auto space-y-2">
          <span className="text-xs uppercase font-mono tracking-widest text-blue-600 font-semibold">Capabilities</span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">What We Are Building</h2>
          <p className="text-xs sm:text-sm text-slate-500">
            A comprehensive, truthful toolkit that empowers candidates at every step of their career search.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                <Briefcase className="h-5 w-5" />
              </div>
              <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Live Feature</span>
            </div>
            <h3 className="text-base font-bold text-slate-900">1. Career Organization</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Manage all job applications in one unified pipeline with truthful status transitions, submission timestamps, and complete audit history.
            </p>
          </div>

          {/* Card 2 */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                <Bot className="h-5 w-5" />
              </div>
              <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Live Feature</span>
            </div>
            <h3 className="text-base font-bold text-slate-900">2. AI Career Assistance</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Context-aware ApplyWise Copilot delivers intelligent advice, resume critiques, interview preparation, and recruiter message drafting.
            </p>
          </div>

          {/* Card 3 */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="p-2.5 bg-violet-50 text-violet-600 rounded-xl">
                <BrainCircuit className="h-5 w-5" />
              </div>
              <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Live Feature</span>
            </div>
            <h3 className="text-base font-bold text-slate-900">3. Application Intelligence</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Real-time weighted vacancy scoring across skills, experience, titles, qualifications, and visa eligibility with zero default points for missing data.
            </p>
          </div>

          {/* Card 4 */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
                <FileCheck2 className="h-5 w-5" />
              </div>
              <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Live Feature</span>
            </div>
            <h3 className="text-base font-bold text-slate-900">4. Career Preparation</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Generate genuine, downloadable ATS-formatted Word (.docx) resumes tailored to target vacancies without inventing unverified credentials.
            </p>
          </div>

          {/* Card 5 */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="p-2.5 bg-teal-50 text-teal-600 rounded-xl">
                <Layers className="h-5 w-5" />
              </div>
              <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">Pro Feature</span>
            </div>
            <h3 className="text-base font-bold text-slate-900">5. Personalized Experience</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Deep career preferences, salary compatibility alerts, cross-country filters, and high-volume AI intelligence aligned to candidate targets.
            </p>
          </div>

          {/* Card 6 - Roadmap */}
          <div className="p-6 rounded-2xl bg-slate-50/70 border border-slate-200/60 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="p-2.5 bg-slate-200 text-slate-700 rounded-xl">
                <Clock className="h-5 w-5" />
              </div>
              <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">Roadmap</span>
            </div>
            <h3 className="text-base font-bold text-slate-800">6. Continuous AI Evolution</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Upcoming automated interview simulations with voice input, direct ATS status polling integrations, and real-time compensation benchmarking.
            </p>
          </div>
        </div>
      </section>

      {/* Meet the Founder Section */}
      <FounderSection />

      {/* Our Principles */}
      <section className="py-20 bg-slate-900 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-2">
            <span className="text-xs uppercase font-mono tracking-widest text-blue-400 font-semibold">Values</span>
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">Our Core Principles</h2>
            <p className="text-xs sm:text-sm text-slate-400">
              The fundamental guidelines that drive our software design and AI architecture.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 text-left">
            <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/70 space-y-2">
              <div className="text-blue-400 font-mono text-sm font-bold">01</div>
              <h4 className="font-bold text-sm text-white">Useful Over Complicated</h4>
              <p className="text-xs text-slate-400 leading-relaxed">Practical tools built for immediate candidate outcomes rather than decorative bloat.</p>
            </div>
            <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/70 space-y-2">
              <div className="text-blue-400 font-mono text-sm font-bold">02</div>
              <h4 className="font-bold text-sm text-white">Responsible AI</h4>
              <p className="text-xs text-slate-400 leading-relaxed">Zero-hallucination policy that never invents fake metrics, degrees, or employers.</p>
            </div>
            <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/70 space-y-2">
              <div className="text-blue-400 font-mono text-sm font-bold">03</div>
              <h4 className="font-bold text-sm text-white">Privacy-Conscious</h4>
              <p className="text-xs text-slate-400 leading-relaxed">User data is strictly isolated with cryptographic session tokens and secure D1 storage.</p>
            </div>
            <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/70 space-y-2">
              <div className="text-blue-400 font-mono text-sm font-bold">04</div>
              <h4 className="font-bold text-sm text-white">Continuous Evolution</h4>
              <p className="text-xs text-slate-400 leading-relaxed">Iteratively refined based on real candidate feedback and transparent engineering.</p>
            </div>
            <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/70 space-y-2">
              <div className="text-blue-400 font-mono text-sm font-bold">05</div>
              <h4 className="font-bold text-sm text-white">Accessible Tools</h4>
              <p className="text-xs text-slate-400 leading-relaxed">Generous free tier making AI-driven career discovery open to all job seekers.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final Call to Action */}
      <section className="py-20 bg-gradient-to-b from-white to-blue-50/50 text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Your next career move deserves a smarter approach.
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">
            Join ApplyWise AI today to experience truthful resume intelligence, verified vacancy discovery, and AI career assistance.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={onGetStarted}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-md shadow-blue-500/20 transition flex items-center space-x-2"
            >
              <span>Get Started Free</span>
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={onExplorePro}
              className="px-6 py-3 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold shadow-xs hover:shadow-sm transition"
            >
              Explore Pro Plans
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto bg-slate-900 text-slate-400 py-10 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <BrandLogo variant="dark" size="sm" onClick={onNavigateHome} />
          <div className="flex items-center space-x-6">
            <button onClick={onNavigateHome} className="hover:text-white transition">Home</button>
            <button onClick={onExplorePro} className="hover:text-white transition">Pricing & Pro</button>
            <span>Free Public Service</span>
            <span>Zero Hallucination Guarantee</span>
          </div>
          <p className="text-slate-500 text-[11px]">
            © {new Date().getFullYear()} ApplyWise AI. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};
