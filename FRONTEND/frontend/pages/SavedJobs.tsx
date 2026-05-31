import React, { useEffect, useState } from 'react';
import { PageId } from '../types';
import { fetchSavedJobs, JobRecommendation } from '../lib/api';
import { Bookmark, ExternalLink, MapPin } from 'lucide-react';

interface SavedJobsProps {
  onNavigate: (page: PageId) => void;
}

export default function SavedJobs({ onNavigate }: SavedJobsProps) {
  const [jobs, setJobs] = useState<JobRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSavedJobs()
      .then(setJobs)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8 pb-12">
      <div>
        <div className="w-12 h-[1px] bg-white mb-3" />
        <h2 className="font-serif text-3xl font-light text-white mb-2 flex items-center gap-3">
          <Bookmark size={24} className="text-white/60" />
          Saved Jobs
        </h2>
        <p className="text-sm text-[#A3A3A3]">Jobs you bookmarked for later application.</p>
      </div>

      {loading && <p className="text-sm text-white/40">Loading saved jobs...</p>}
      {error && (
        <div className="text-sm text-[#EF4444] border border-[#EF4444]/20 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {jobs.map((job) => (
          <div
            key={job.job_id}
            className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-6"
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
                <span className="inline-block text-[10px] uppercase tracking-wider px-2 py-1 rounded bg-green-500/10 text-green-400">
                  {Math.round(job.match_score)}% match
                </span>
                {job.missing_skills.length > 0 && (
                  <p className="text-xs text-amber-400/70">
                    Skills to develop: {job.missing_skills.slice(0, 4).join(', ')}
                  </p>
                )}
              </div>
              {job.apply_url && (
                <a
                  href={job.apply_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-white text-black text-[10px] uppercase tracking-wider font-bold rounded-lg hover:bg-neutral-200 flex-shrink-0"
                >
                  Apply <ExternalLink size={12} />
                </a>
              )}
            </div>
          </div>
        ))}
        {!loading && jobs.length === 0 && (
          <div className="text-center py-16 space-y-4">
            <p className="text-sm text-white/30">No saved jobs yet.</p>
            <button
              type="button"
              onClick={() => onNavigate('jobs')}
              className="text-xs text-white/60 hover:text-white underline"
            >
              Browse job recommendations →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
