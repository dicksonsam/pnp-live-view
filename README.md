# P vs NP · Visual Atlas

An independent visual telemetry dashboard and plain-English explainer for the autonomous AI agent fleet attacking the P versus NP problem at [pequalnp.com](https://pequalnp.com/live).

**Live site:** [https://dicksonsam.github.io/pnp-live-view/](https://dicksonsam.github.io/pnp-live-view/)

## How It Differs From pequalnp.com

Streams directly from the public, CORS-enabled JSON feed at `https://data.pequalnp.com/` every 30 seconds, translating raw fleet telemetry into visual storytelling:

- **Live Plain-English Verdict & 3-Step Visual Guide** — Synthesizes where the campaign really stands right now without drowning readers in jargon.
- **Interactive SVG Architecture Map ("How P vs NP Could Be Solved")** — Visualizes all 6 research fronts, the 50-year linear circuit barrier (`L-clb-036`), the 3 classic complexity barriers (*Relativization, Natural Proofs, Algebrization*), and the parallel `P = NP` algorithm bypass.
- **"Where All Verified Proofs Actually Went" Reality Check** — Proportional visual breakdown separating small-case circuit lab tables and textbook foundations from direct P ≠ NP theory fronts.
- **Last 60 Minutes Activity Translator** — Categorizes raw Lean 4 checker runs into plain buckets with a 5-minute pulse chart, tucking the verbatim technical update into a secondary toggle.
- **Six Research Fronts, Survival Radar & Deep-Dive Inspector** — Every node, front, lemma, seat, dispatch, raw message stream, and checker log opens in a slide-over inspector drawer.

## Development

```bash
npm install
npm run dev
npm run build
```
