// arborlife job-match proxy — Cloudflare Worker.
//
// Holds the Anthropic API key SERVER-SIDE (as a Worker secret) and calls the
// Messages API on the site's behalf. The static page calls THIS worker, never
// Anthropic directly, so the key is never exposed in the browser or the repo.
//
// Deploy: see matcher/README.md. The key is set with `wrangler secret put
// ANTHROPIC_API_KEY` — it is NEVER written into this file or wrangler.toml.

const ALLOWED_ORIGIN = "https://sagearbor.github.io"; // tighten to your site's origin
const MODEL = "claude-haiku-4-5"; // cost-effective; swap to "claude-sonnet-4-6" for higher quality
const MAX_INPUT_CHARS = 40000; // lenient cap (~10k words); still bounds runaway cost

const SAGE_PROFILE = `You are analyzing how well ONE candidate — Sage Arbor — matches a job posting.

CANDIDATE PROFILE
- PhD Biochemistry / Computational Biology (Washington University); B.S. Chemistry & Biology (Duke). 25+ years.
- Currently Lead, AI Strategy & Implementation at Duke Clinical Research Institute: LLM architectures (RAG, MoE, agents), red-teaming, LLM validation/evals, clinical compliance; owns a $32M AI portfolio for a 1,000+ person org.
- Programming: Python (expert), SQL, C++, Go, Solidity. Ships production tools with FastAPI (his default API layer, used in almost every AI solution he builds), Streamlit apps, REST APIs, Docker, and Azure; REDCap for clinical data capture; dashboards and data pipelines.
- Science: genomics, protein/molecular design, systems biology, clinical & EMR data analysis.
- Rare edge: deep biology x hands-on AI safety.
- Product design: designs and ships complete products end to end, including consumer-facing ones (MedBoard AI Tutor for medical students; a Chrome extension with a landing page and subscription flow), not only internal enterprise tools. Prolific builder, roughly 40 repos a year.
- Privacy and safety by design: HIPAA-grade handling of patient and PHI data, a PHI-safe mock-data generator, privacy-first Sybil-resistant proof-of-personhood, and designing data structures (including orthogonal or compartmentalized schemas) that keep sensitive user data private and safe. Hands-on AI safety: red-teaming, LLM-as-judge ensembles, and adversarial evaluation.
- Shipped open source: VERDICT (5-model ensemble LLM-as-judge with 2-of-5 veto + calibration); an evidence-based AI competency eval kit; adversarial "proof-of-done" verification; Azure agent-to-agent pipelines; clinical-trial dashboards and data-quality tooling; a civic-tech cluster (AI-UBI transition simulator, proof-of-personhood + anonymous payments/voting, a congressional vote-prediction prototype).
- Leadership: PMP; led 100+ staff across 8 global labs; former professor; S&T Policy Fellow, National Academies.

HONESTY RULES (do not overstate):
- "eoe" is a well-designed but UNVALIDATED ML-for-bio architecture (no trained model yet).
- "whipCongress" is a rule-based prototype, not an ML/LLM system.
- "personhood"/"openline" are early-stage (v0.1, not security-audited).
- Score each requirement from 0.0 to 1.0: near 1.0 only when clearly supported, mid-range when adjacent or transferable, near 0.0 when not evidenced. Use nuanced values across the range, not just 0, 0.5, or 1.
- If the role is outside Sage's background (for example visual art, trades, sales, or other unrelated fields), be blunt: set overall_fit to "weak", mark most aspects "gap", and state plainly that he is not a good fit. Never force a fit.

Return a fair, specific analysis grounded in concrete evidence, not generic praise. Write plainly and do not use em-dashes.`;

const SCHEMA = {
  type: "object",
  properties: {
    overall_fit: { type: "string", enum: ["strong", "moderate", "weak"] },
    summary: { type: "string" },
    aspects: {
      type: "array",
      items: {
        type: "object",
        properties: {
          label: { type: "string" },
          requirement: { type: "string" },
          score: { type: "number" },
          evidence: { type: "string" },
        },
        required: ["label", "requirement", "score", "evidence"],
        additionalProperties: false,
      },
    },
    top_gaps: { type: "array", items: { type: "string" } },
  },
  required: ["overall_fit", "summary", "aspects", "top_gaps"],
  additionalProperties: false,
};

function corsHeaders(origin) {
  const allow = origin === ALLOWED_ORIGIN ? origin : ALLOWED_ORIGIN;
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Max-Age": "86400",
  };
}

function jsonResponse(obj, status, origin) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json", ...corsHeaders(origin) },
  });
}

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(origin) });
    }
    if (request.method !== "POST") {
      return jsonResponse({ error: "POST only" }, 405, origin);
    }
    if (!env.ANTHROPIC_API_KEY) {
      return jsonResponse({ error: "Server not configured (missing API key)." }, 500, origin);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON body." }, 400, origin);
    }

    let jobText = (body.jobText || "").toString().trim();
    let jobUrl = (body.jobUrl || "").toString().trim();

    // If the text field is really just a link, treat it as a URL.
    if (!jobUrl && /^https?:\/\/\S+$/i.test(jobText)) { jobUrl = jobText; jobText = ""; }

    let fromUrl = false;
    if (!jobText && jobUrl) {
      fromUrl = true;
      try {
        const r = await fetch(jobUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
          },
          redirect: "follow",
        });
        if (!r.ok) {
          return jsonResponse({ error: "Could not read that link (HTTP " + r.status + "). Many job sites (Duke, LinkedIn, Workday) need a login or block automated readers. Please copy the job description and paste it into the box instead." }, 200, origin);
        }
        jobText = stripHtml(await r.text());
      } catch {
        return jsonResponse({ error: "Could not fetch that URL. Please copy the job description and paste it into the box instead." }, 200, origin);
      }
    }

    jobText = jobText.slice(0, MAX_INPUT_CHARS).trim();
    if (jobText.length < 10) {
      return jsonResponse({ error: "Type a role, a job description, or paste a link." }, 400, origin);
    }
    if (fromUrl) {
      const low = jobText.toLowerCase();
      const wall = /(sign in|log in|create (an )?account|join linkedin|enable javascript|access denied|are you a robot|captcha|verify you are human|page (not found|isn't available))/.test(low);
      if (jobText.length < 400 || (wall && jobText.length < 2500)) {
        return jsonResponse({ error: "That link opened a login or verification page, not a job posting. Please copy the job description text and paste it into the box instead." }, 200, origin);
      }
    }

    const anthropicReq = {
      model: MODEL,
      max_tokens: 3500,
      system: SAGE_PROFILE,
      messages: [
        {
          role: "user",
          content: `The text below is a role, a job title, or a job description. If it is short, first infer that role's typical requirements, then judge how well Sage fits. Be specific and honest. For each aspect include a "label": a 1 to 2 word tag for the requirement (used as a chart bar label). Also include a "score" from 0.0 to 1.0 for how well Sage meets it (0.0 to 0.33 = gap, 0.34 to 0.66 = partial, 0.67 to 1.0 = met); use the full range for nuance. Keep the summary to 3 to 5 sentences and each aspect's evidence to one short sentence. Focus on the 8 most important requirements as aspects and do not exceed 10.\n\nROLE OR POSTING:\n${jobText}`,
        },
      ],
      output_config: { format: { type: "json_schema", schema: SCHEMA } },
    };

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(anthropicReq),
    });

    if (!resp.ok) {
      const detail = (await resp.text()).slice(0, 300);
      return jsonResponse({ error: "Analysis failed upstream.", detail }, 502, origin);
    }

    const data = await resp.json();
    const textBlock = (data.content || []).find((b) => b.type === "text");
    if (!textBlock) {
      return jsonResponse({ error: "No analysis returned." }, 502, origin);
    }
    let result;
    try {
      result = JSON.parse(textBlock.text); // output_config.format guarantees valid JSON
    } catch {
      return jsonResponse({ error: "Could not parse the analysis." }, 502, origin);
    }
    const deDash = (s) => (typeof s === "string" ? s.replace(/\s*[—–]\s*/g, " - ") : s);
    if (result && typeof result === "object") {
      result.summary = deDash(result.summary);
      if (Array.isArray(result.aspects)) result.aspects.forEach((a) => { a.label = deDash(a.label); a.requirement = deDash(a.requirement); a.evidence = deDash(a.evidence); });
      if (Array.isArray(result.top_gaps)) result.top_gaps = result.top_gaps.map(deDash);
    }
    return jsonResponse(result, 200, origin);
  },
};
