import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SKILL_PATTERNS = [
  'javascript', 'typescript', 'python', 'java', 'react', 'node', 'sql', 'aws',
  'docker', 'kubernetes', 'figma', 'ui', 'ux', 'seo', 'marketing', 'excel',
  'communication', 'leadership', 'agile', 'scrum', 'git', 'html', 'css',
  'machine learning', 'data analysis', 'project management',
];

function extractSkills(text: string): string[] {
  const lower = text.toLowerCase();
  const found = SKILL_PATTERNS.filter((s) => lower.includes(s));
  return [...new Set(found.map((s) => s.charAt(0).toUpperCase() + s.slice(1)))];
}

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2)
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / new Set([...a, ...b]).size;
}

function analyzeLocally(resumeText: string, jobDescription: string) {
  const resumeSkills = extractSkills(resumeText);
  const jdSkills = extractSkills(jobDescription);
  const resumeSet = new Set(resumeSkills.map((s) => s.toLowerCase()));
  const jdSet = new Set(jdSkills.map((s) => s.toLowerCase()));
  const matched = jdSkills.filter((s) => resumeSet.has(s.toLowerCase()));
  const missing = jdSkills.filter((s) => !resumeSet.has(s.toLowerCase()));
  const skillScore = jdSet.size ? matched.length / jdSet.size : 0;
  const textSim = jaccard(tokenize(resumeText), tokenize(jobDescription));
  const atsScore = Math.round((skillScore * 0.65 + textSim * 0.35) * 100);
  const suggestions = missing.slice(0, 5).map(
    (s) => `Add or highlight experience with ${s} to better match this job description.`
  );
  if (!suggestions.length) {
    suggestions.push('Strong keyword overlap. Tailor your summary to mirror the role title.');
  }
  const improvedBullets = matched.slice(0, 3).map(
    (s) => `Delivered measurable outcomes using ${s} aligned with role requirements.`
  );
  return {
    ats_score: atsScore,
    text_similarity_score: Math.round(textSim * 100) / 100,
    skill_match_score: Math.round(skillScore * 100) / 100,
    matched_skills: matched,
    missing_skills: missing,
    resume_skills: resumeSkills,
    jd_skills: jdSkills,
    suggestions,
    improved_bullets: improvedBullets,
  };
}

async function enhanceWithOpenAI(
  resumeText: string,
  jobDescription: string,
  local: ReturnType<typeof analyzeLocally>
) {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) return local;

  try {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: Deno.env.get('OPENAI_MODEL') || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are an ATS resume analyzer. Return JSON only with keys: suggestions (string[]), improved_bullets (string[]), final_summary (string).',
          },
          {
            role: 'user',
            content: `Resume:\n${resumeText.slice(0, 4000)}\n\nJob:\n${jobDescription.slice(0, 4000)}\n\nMissing skills: ${local.missing_skills.join(', ')}`,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      }),
    });
    if (!resp.ok) return local;
    const json = await resp.json();
    const content = json?.choices?.[0]?.message?.content;
    if (!content) return local;
    const parsed = JSON.parse(content);
    return {
      ...local,
      suggestions: parsed.suggestions?.length ? parsed.suggestions : local.suggestions,
      improved_bullets: parsed.improved_bullets?.length ? parsed.improved_bullets : local.improved_bullets,
      final_summary: parsed.final_summary || '',
    };
  } catch {
    return local;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const resumeText = (body.resume_text || '').trim();
    const jobDescription = (body.job_description || '').trim();
    const jobTitle = body.job_title || null;
    const companyName = body.company_name || null;
    const resumeFilename = body.resume_filename || 'resume.pdf';

    if (!resumeText || resumeText.length < 50) {
      return new Response(JSON.stringify({ error: 'Resume text is too short or missing' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!jobDescription) {
      return new Response(JSON.stringify({ error: 'Job description is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const local = analyzeLocally(resumeText, jobDescription);
    const merged = await enhanceWithOpenAI(resumeText, jobDescription, local);

    const { data: saved, error: saveError } = await supabase
      .from('resume_analyses')
      .insert({
        user_id: userData.user.id,
        resume_filename: resumeFilename,
        job_title: jobTitle,
        company_name: companyName,
        job_description: jobDescription,
        ats_score: merged.ats_score,
        text_similarity_score: merged.text_similarity_score,
        skill_match_score: merged.skill_match_score,
        matched_skills: merged.matched_skills,
        missing_skills: merged.missing_skills,
        resume_skills: merged.resume_skills,
        jd_skills: merged.jd_skills,
        suggestions: merged.suggestions,
        improved_bullets: merged.improved_bullets,
      })
      .select('*')
      .single();

    if (saveError) {
      return new Response(JSON.stringify({ error: saveError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({
        id: saved.id,
        resume_filename: saved.resume_filename,
        job_title: saved.job_title,
        company_name: saved.company_name,
        ats_score: saved.ats_score,
        text_similarity_score: saved.text_similarity_score,
        skill_match_score: saved.skill_match_score,
        matched_skills: saved.matched_skills,
        missing_skills: saved.missing_skills,
        resume_skills: saved.resume_skills,
        jd_skills: saved.jd_skills,
        suggestions: saved.suggestions,
        improved_bullets: saved.improved_bullets,
        created_at: saved.created_at,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
