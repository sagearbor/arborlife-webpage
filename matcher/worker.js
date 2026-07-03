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
- PhD Biochemistry / Computational Biology (Washington University); B.S. Chemistry & Biology (Duke). 20+ years.
- Currently Lead, AI Strategy & Implementation at Duke Clinical Research Institute: LLM architectures (RAG, MoE, agents), red-teaming, LLM validation/evals, clinical compliance; owns a $32M AI portfolio for a 1,000+ person org.
- Programming: Python, SQL, C++, Go, Solidity; dashboards and data pipelines.
- Science: genomics, protein/molecular design, systems biology, clinical & EMR data analysis.
- Rare edge: deep biology x hands-on AI safety.
- Shipped open source: VERDICT (5-model ensemble LLM-as-judge with 2-of-5 veto + calibration); an evidence-based AI competency eval kit; adversarial "proof-of-done" verification; Azure agent-to-agent pipelines; clinical-trial dashboards and data-quality tooling; a civic-tech cluster (AI-UBI transition simulator, proof-of-personhood + anonymous payments/voting, a congressional vote-prediction prototype).
- Leadership: PMP; led 100+ staff across 8 global labs; former professor; S&T Policy Fellow, National Academies.

HONESTY RULES (do not overstate):
- "eoe" is a well-designed but UNVALIDATED ML-for-bio architecture (no trained model yet).
- "whipCongress" is a rule-based prototype, not an ML/LLM system.
- "personhood"/"openline" are early-stage (v0.1, not security-audited).
- Mark a requirement "met" only when clearly supported, "partial" when adjacent/transferable, "gap" when not evidenced.

Return a fair, specific analysis grounded in concrete evidence — not generic praise.`;

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
          requirement: { type: "string" },
          status: { type: "string", enum: ["met", "partial", "gap"] },
          evidence: { type: "string" },
        },
        required: ["requirement", "status", "evidence"],
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

    let jobText = (body.jobText || "").toString();
    const jobUrl = (body.jobUrl || "").toString();

    if (!jobText && jobUrl) {
      try {
        const r = await fetch(jobUrl, { headers: { "User-Agent": "arborlife-matcher" } });
        jobText = stripHtml(await r.text());
      } catch {
        return jsonResponse({ error: "Could not fetch that URL — paste the text instead." }, 400, origin);
      }
    }

    jobText = jobText.slice(0, MAX_INPUT_CHARS).trim();
    if (jobText.length < 40) {
      return jsonResponse({ error: "Please paste a job description (or a fetchable URL)." }, 400, origin);
    }

    const anthropicReq = {
      model: MODEL,
      max_tokens: 1600,
      system: SAGE_PROFILE,
      messages: [
        {
          role: "user",
          content: `Analyze how well Sage matches this posting. Be specific and honest.\n\nJOB POSTING:\n${jobText}`,
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
    return jsonResponse(result, 200, origin);
  },
};
