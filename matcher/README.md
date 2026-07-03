# Job-Match Matcher (Cloudflare Worker)

A tiny serverless proxy that powers the **"Does my background fit your role?"**
widget on the site. A visitor pastes a job description (or a link); the Worker
calls Claude with Sage's profile and returns a met / partial / gap analysis.

**Why a Worker?** The site is static (GitHub Pages), so there is no server to hide
an API key in. This Worker holds the key **server-side**, so the page can offer the
tool without ever exposing the key. **The key is never in this repo.**

## What you need
- A **Cloudflare account** (free tier is plenty, 100k requests/day).
- **Your own Anthropic API key** (from *your* console.anthropic.com account).
- Node.js installed locally (for the `wrangler` CLI).

## Deploy (about 5 minutes, one time)

Run these from inside the `matcher/` folder. **Deploy first**, then add the secret:
`wrangler secret put` attaches the key to the Worker, so the Worker has to exist
first. You do NOT need to create anything in the Cloudflare or Anthropic dashboards
beforehand; the Worker is created by `wrangler deploy`.

```bash
npm install -g wrangler          # Cloudflare's CLI
cd matcher
wrangler login                   # opens a browser to your Cloudflare account

wrangler deploy                  # creates the Worker, prints its URL, e.g.
#   https://arborlife-matcher.<your-subdomain>.workers.dev

# Now put YOUR Anthropic key into Cloudflare's encrypted secret store. You type it
# at the prompt; Cloudflare stores it encrypted; it is never written to any file:
wrangler secret put ANTHROPIC_API_KEY
#   paste your key at the prompt, press enter
```

The secret goes live immediately, no redeploy needed. If you happen to hit the
Worker URL between the two steps, it just returns "Server not configured" until the
key is set.

Prefer clicking? In the Cloudflare dashboard: **Workers & Pages, Create, Worker**,
paste `worker.js`, deploy, then **Settings, Variables and Secrets, Add, Secret**,
name it `ANTHROPIC_API_KEY`, paste your key, Save.

## Turn the widget on
Copy the Worker URL from `wrangler deploy` and paste it into the `MATCHER_ENDPOINT`
line in `index.html`:

```js
var MATCHER_ENDPOINT = "https://arborlife-matcher.<your-subdomain>.workers.dev";
```

The "Try it" section stays hidden until this is set, so the site is safe to ship
before you deploy.

## Cost & safety knobs (in `worker.js`)
- `MODEL`, defaults to `claude-haiku-4-5` (cheapest capable model, about a cent or
  two per analysis). Switch to `claude-sonnet-4-6` for higher quality.
- `ALLOWED_ORIGIN`, locks the Worker to your site's origin (CORS).
- `MAX_INPUT_CHARS`, caps input size so a giant paste can't run up a big bill.
- Set a **hard monthly spend cap** in your Anthropic console as a backstop, and
  optionally add a Cloudflare **Rate Limiting** rule on the Worker route so a public
  tool can't be hammered on your dime.
