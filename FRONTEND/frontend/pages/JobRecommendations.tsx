import React, { useState } from 'react';
import { PageId } from '../types';
import {
  JobRecommendation,
  recommendJobs,
  saveJob,
  searchJobs,
} from '../lib/api';
import { Briefcase, ExternalLink, MapPin, Save, Search, Sparkles } from 'lucide-react';

interface JobRecommendationsProps {
  onNavigate: (page: PageId) => void;
}

export default function JobRecommendations({ onNavigate }: JobRecommendationsProps) {
  const [role, setRole] = useState('');
  const [location, setLocation] = useState('');
  const [query, setQuery] = useState('');
  const [jobs, setJobs] = useState<JobRecommendation[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  const handleRecommend = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await recommendJobs({ role_preference: role, location });
      setJobs(res.recommendations);
      setMessage(res.message);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to get recommendations');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await searchJobs({ query, location });
      setJobs(
        (res.jobs as Array<Record<string, unknown>>).map((j) => ({
          job_id: String(j.id ?? crypto.randomUUID()),
          title: (j.title as string) || 'Untitled',
          company: (j.company as string) || 'Unknown',
          location: (j.location as string) || null,
          source: (j.source as string) || 'unknown',
          match_score: 0,
          matched_skills: (j.skills as string[]) || [],
          missing_skills: [],
          recommendation_reason: 'Live search result',
          apply_url: (j.apply_url as string) || null,
        }))
      );
      setMessage('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (job: JobRecommendation) => {
    try {
      const saved = await saveJob(job);
      setSavedIds((prev) => new Set(prev).add(saved.job_id));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save job');
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div>
        <div className="w-12 h-[1px] bg-white mb-3" />
        <h2 className="font-serif text-3xl font-light text-white mb-2 flex items-center gap-3">
          <Briefcase size={24} className="text-white/60" />
          Job Recommendations
        </h2>
        <p className="text-sm text-[#A3A3A3]">
          Get AI-matched jobs from live APIs based on your resume skills and preferences.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-6 space-y-4">
          <h3 className="text-xs uppercase tracking-[0.2em] text-white/60 flex items-center gap-2">
            <Sparkles size={14} /> AI Recommendations
          </h3>
          <input
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="Preferred role (e.g. Software Engineer)"
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none"
          />
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Location (e.g. London, Remote)"
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleRecommend}
            disabled={loading}
            className="w-full bg-white text-black text-[10px] uppercase tracking-widest font-bold py-3 rounded-lg hover:bg-neutral-200 disabled:opacity-50"
          >
            {loading ? 'Searching...' : 'Get Recommendations'}
          </button>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-6 space-y-4">
          <h3 className="text-xs uppercase tracking-[0.2em] text-white/60 flex items-center gap-2">
            <Search size={14} /> Live Job Search
          </h3>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search keywords"
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none"
          />
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Location"
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleSearch}
            disabled={loading}
            className="w-full border border-white/20 text-white text-[10px] uppercase tracking-widest font-bold py-3 rounded-lg hover:bg-white/5 disabled:opacity-50"
          >
            {loading ? 'Searching...' : 'Search Jobs'}
          </button>
        </div>
      </div>

      {message && (
        <div className="text-sm text-amber-400/80 border border-amber-400/20 rounded-lg px-4 py-3">
          {message}
        </div>
      )}
      {error && (
        <div className="text-sm text-[#EF4444] border border-[#EF4444]/20 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {jobs.map((job) => (
          <div
            key={job.job_id}
            className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-6 hover:border-white/20 transition-colors"
          >
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="space-y-2">
                <h4 className="text-lg font-medium text-white">{job.title}</h4>
                <p className="text-sm text-[#A3A3A3]">{job.company}</p>
                {job.location && (
                  <p className="text-xs text-white/40 flex items-center gap-1">
                    <MapPin size={12} /> {job.location}
                  </p>
                )}
                {job.match_score > 0 && (
                  <span className="inline-block text-[10px] uppercase tracking-wider px-2 py-1 rounded bg-green-500/10 text-green-400 border border-green-500/20">
                    {Math.round(job.match_score)}% match
                  </span>
                )}
                <p className="text-xs text-white/50">{job.recommendation_reason}</p>
                {job.missing_skills.length > 0 && (
                  <p className="text-xs text-amber-400/70">
                    Missing skills: {job.missing_skills.slice(0, 5).join(', ')}
                  </p>
                )}
                <span className="text-[10px] uppercase tracking-wider text-white/30">
                  Source: {job.source}
                </span>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                {job.apply_url && (
                  <a
                    href={job.apply_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-white text-black text-[10px] uppercase tracking-wider font-bold rounded-lg hover:bg-neutral-200"
                  >
                    Apply <ExternalLink size={12} />
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => handleSave(job)}
                  disabled={savedIds.has(String(job.job_id))}
                  className="flex items-center gap-2 px-4 py-2 border border-white/20 text-white text-[10px] uppercase tracking-wider rounded-lg hover:bg-white/5 disabled:opacity-40"
                >
                  <Save size={12} />
                  {savedIds.has(String(job.job_id)) ? 'Saved' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        ))}
        {!loading && jobs.length === 0 && (
          <p className="text-center text-sm text-white/30 py-12">
            No jobs yet. Analyze a resume first, then click Get Recommendations.
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={() => onNavigate('saved-jobs')}
        className="text-xs text-white/40 hover:text-white underline"
      >
        View saved jobs →
      </button>
    </div>
  );
}
