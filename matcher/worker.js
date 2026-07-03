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

const SAGE_PROFILE = `You are analyzing how well ONE candidate, Sage Arbor, matches a job posting.

HONESTY RULES (do not overstate):
- "eoe" is a well-designed but UNVALIDATED ML-for-bio architecture (no trained model yet).
- "whipCongress" is a rule-based prototype, not an ML/LLM system.
- "personhood" and "openline" are early-stage (v0.1, not security-audited).
- Score each requirement from 0.0 to 1.0: near 1.0 only when clearly supported, mid-range when adjacent or transferable, near 0.0 when not evidenced. Use nuanced values across the range, not just 0, 0.5, or 1.
- If the role is outside Sage's background (for example visual art, trades, sales, or other unrelated fields), be blunt: set overall_fit to "weak", mark most aspects "gap", and state plainly that he is not a good fit. Never force a fit.

KEY STRENGTHS (evidenced in his CV and shipped portfolio; weigh transferable ones fairly):
- Prolific product builder: ships complete products end to end, including consumer-facing ones (an adaptive medical board-exam tutor; a Chrome extension with a landing page and subscription flow), not only internal enterprise tools; roughly 40 repos a year.
- Privacy and safety by design: HIPAA-grade handling of patient and PHI data, a PHI-safe mock-data generator, privacy-first Sybil-resistant proof-of-personhood, and compartmentalized data structures that keep sensitive data private; plus hands-on AI safety (red-teaming, LLM-as-judge ensembles, adversarial evaluation).
- Default engineering stack: Python and FastAPI (used in almost every AI solution he ships), Streamlit, REST APIs, Docker, Azure, REDCap.

Judge fit against Sage's full CV below. If a requirement is not evidenced, treat it as a gap.

CANDIDATE CV
# Sage Arbor  -  Master CV (Comprehensive)

**Contact**
- Location: Charlotte, NC 28277
- Phone: 317-728-1662
- Email: sagearbor@gmail.com

## Profile Summary

AI strategy and health-policy leader with 25+ years spanning computational
biology, data science, and healthcare transformation. Currently leading AI
implementation at Duke Clinical Research Institute  -  LLM architectures,
red-teaming, and clinical compliance. PhD biochemist who bridges deep technical
work with policy and organizational strategy.

*(Alternate framings to pull from, per role:)*
- **Bio × AI safety:** PhD computational biologist now doing hands-on LLM
  red-teaming and validation  -  a rare intersection of wet-lab-adjacent science
  and applied AI safety.
- **Data science:** 25+ years turning messy biological, clinical, and
  operational data into decisions, models, and shipped tooling.
- **Leadership:** Ran 100+ staff across 8 global labs; owns a $32M AI roadmap.

## Education

- **Ph.D. in Biochemistry / Computational Biology**  -  Washington University (2001-2008)
- **B.S. in Chemistry & Biology**  -  Duke University (1996-2000)

## Core Competencies

- **AI / ML:** LLM architectures (RAG, MoE, agents), red-teaming, LLM
  validation & evals, bias detection, QA frameworks, AI product management
- **Programming / Data:** Python, C++, SQL (multiple databases), NoSQL, UNIX,
  dashboards, data pipelines
- **Computational biology:** pathway mapping, systems-biology modeling,
  molecular dynamics, computational drug/molecule design, genomics data
- **Domain:** electronic medical records, clinical-trial analysis, EMR
  data-mining, health outcomes, health policy
- **Management:** PMP, Agile/Scrum, Six Sigma, buy-vs-build, change management,
  multi-site / multi-stakeholder program leadership

## Professional Experience

**Duke University  -  Lead, AI Strategy & Implementation** (04/2021-Present)
- Owns the AI roadmap for a 1,000+ person organization
- Runs "buy vs. build" analyses for enterprise AI solutions
- Implements security protocols aligned with HIPAA and regulatory requirements
- Directs workforce transformation and change management
- 2024-2025 portfolio projected at $32M annual financial impact
- Delivered/managed: LLM validation engines ($5M), pharma chatbot systems
  ($400K), legal redlining automation ($20M), data-quality analysis tools,
  research-funding matching systems
- Speaks publicly on LLM accuracy, bias detection, and clinical applications

**Marian University  -  Assistant Professor of Biochemistry** (01/2013-04/2021)
- Research: health-outcomes databases, EMR data-mining, public policy
- Taught biochemistry; developed courses; chaired/served faculty committees
- Grant writing and lab management

**DuPont & Pioneer  -  Manager & Senior Research Associate** (04/2010-12/2012)
- Led 100+ professionals across 8 global laboratories
- Ran the computational-biology group building SQL databases and dashboards
- Oversaw genomic data management and hardware-infrastructure projects

**Eurofins Scientific  -  Technical Manager & Scientist** (02/2009-04/2010)
- Supervised chemistry and microbiology teams
- Built roadmaps for quality, throughput, and ISO certification

**Pfizer  -  Computational Biologist III** (06/2008-12/2008)
- Systems-biology models for clinical-trial analysis
- Pathway mapping and genome-chip (microarray) analysis
- Cross-functional collaboration across R&D

**National Academies of Sciences  -  Science & Technology Policy Fellow** (01/2008-06/2008)
- Contributed to reports on digital-data publishing and storage guidelines
- Researched U.S. competitiveness in STEM

**Washington University  -  Biochemistry Graduate Researcher** (09/2001-05/2008)
- Designed and synthesized rigidified cyclic peptides
- Computational modeling and molecular-dynamics simulations

**Additional positions:** Veritas Labs (Scientist), Stanford (Lab Technician),
NIST (Assistant Scientist), Duke University (Assistant Chemist)

## Awards & Recognition

- Northwestern Health Sciences University Faculty Conference presenter (2025)
- Duke / Duke-NUS AI Symposium speaker (2024)
- Multiple invited talks on LLM accuracy, bias detection, clinical applications
- Association of Biochemistry Educators Scholar Award (2021)
- PMP Certification (2021)
- ASBMB Advocacy Fellow

## Select Publications

- Comparative analysis of LLMs in medical-education assessment
- Global wellness framework and quality-of-life interventions
- FAIR principles for ontologies and semantic resources
- Novel therapeutics for neurodegenerative diseases
- Computational chemistry and molecular-design contributions

## Selected Projects & Open-Source Work

**AI safety & evaluation**
- **VERDICT** ('llm-as-judge-basedOnRegDocs')  -  LLM-as-judge with a 5-model
  ensemble and 2-of-5 veto logic, calibration/validation sets, and analytics;
  built to counter single-model agreeableness bias in compliance review.
- **AIQ** ('ai-skill-eval-kit')  -  evidence-based competency-evaluation framework:
  rubric + time-decay + evidence multipliers, JSON schema, aggregator, live site.
- **Proof-of-Done** ('skillsCC')  -  adversarial verification gate that runs an
  independent "refute" LLM-judge plus mutation testing to resist fake "done."

**Civic tech / betterment of society**
- **OpenLine + Personhood**  -  anonymous, Sybil-resistant infrastructure for
  instant payments, voting, and universal basic income (Solidity + Go; W3C
  Verifiable Credentials). Personhood is a pluggable proof-of-personhood engine
  whose policy layer keeps "anchor" and "supplementary" signals in separate
  non-fungible buckets, so no volume of cheap signals can substitute for a
  genuine uniqueness anchor. *Early development (v0.1; not security-audited).*
- **AI-UBI Well-Being Transition Simulator**  -  interactive React/TypeScript model
  stepping month-by-month through an AI economic transition across ~80
  corporations and 128 countries, with a corporation-funded UBI mechanism and
  prisoner's-dilemma game-theory dynamics; users can upload custom well-being
  equations validated by six causal "anchor tests" and ranked on a leaderboard.
- **Quorum**  -  multi-agent coordination platform for real-world problem-solving
  (presented, Duke Tech Expo 2026).
- **WhipCongress**  -  predicts likely U.S. House/Senate votes for a proposed bill
  and suggests modifications to reach passage.

**Clinical & scientific ML**
- **EoE Endoscopy Scorer** ('eoe')  -  ML-for-bio architecture for scoring
  eosinophilic-esophagitis severity: a DINOv2/ConvNeXt vision backbone feeding
  five CORN ordinal-regression heads (one per EREFS feature) with Grad-CAM
  explainability. *Research in progress  -  not yet trained/validated.*
- **CT Dashboard** ('dcriCTdash')  -  clinical-trial dashboard with automated
  anomaly detection, SQL back end, and Sankey/3-D visualizations.
- **Data-Analyzer** ('data-analyzer')  -  data-quality service (type/range/missing/
  duplicate checks) exposed via REST + MCP + agent-to-agent interfaces.

## Skill-Building Projects (planned  -  see 'projects/')

Targeted portfolio pieces that close specific posting gaps; several build directly
on the shipped work above. Tracked in 'projects/' and the coverage dashboard.

## Additional Interests

Ethics and philosophy; climate change and renewable-energy policy; woodworking
and visual arts; wrestling and martial arts.

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
