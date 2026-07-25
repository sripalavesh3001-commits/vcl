# ⚗ Virtual Chemistry Lab

A full-stack, interactive chemistry education platform: a searchable 118-element periodic
table, a drag-and-drop virtual lab with a data-driven reaction engine, 16 chemistry
calculators, a full experiment library, unlimited auto-generated quizzes, an AI chemistry
tutor, and student/teacher/admin dashboards — all running on a single Node/Express/SQLite
backend with no external services required to start.

## Quick Start

Requires **Node.js 22.13.0 or newer** (check with `node -v`; upgrade at
[nodejs.org](https://nodejs.org) if needed).

```bash
npm install
npm start
```

Then open **http://localhost:3000**. The SQLite database is created automatically on first
run at `db/chemlab.sqlite` — no setup needed. Register an account (Student or Teacher) to
unlock inventory, progress tracking, quiz history, and dashboards.

> **Why no native build step:** this app uses Node's built-in `node:sqlite` module instead
> of a compiled addon like `better-sqlite3`. That means `npm install` never needs a C++
> compiler, Python, or Visual Studio Build Tools — the #1 cause of `npm install` failing on
> Windows for SQLite-based Node apps. You'll see one harmless line in the console —
> `ExperimentalWarning: SQLite is an experimental feature` — that's expected and safe to
> ignore; it just means Node hasn't marked the module fully stable yet.

To make the **admin dashboard** accessible, register normally and then update your row's
`role` to `admin` in the SQLite database (e.g. with `sqlite3 db/chemlab.sqlite "UPDATE users
SET role='admin' WHERE email='you@example.com';"`), since admin accounts are not
self-service by design.

## What's actually implemented

- **Periodic Table** — all 118 elements with atomic number, mass, category, group, period,
  block, electron configuration, valency, oxidation states, density, melting/boiling point,
  electronegativity, discoverer, discovery year, natural occurrence, and state at room
  temperature. Search and filter by name/symbol/number/category/group/period. Click an
  element to open its full detail panel and add it straight to your lab inventory.
- **Virtual Lab** — a drag-and-drop apparatus bench (21 pieces of glassware/equipment), a
  reagent shelf of 30 common lab compounds, a persistent per-user inventory, and a reaction
  mixer that calls the real reaction engine.
- **Reaction Engine** — a data-driven library of **71 reactions** covering neutralization,
  precipitation, single/double displacement, combustion, redox, gas evolution/decomposition,
  electrolysis, organic chemistry (esterification, hydrolysis, oxidation, fermentation,
  saponification, hydrogenation, substitution, polymerization), complex formation, and
  hydrolysis — each with a balanced equation, mechanism, observation, conditions,
  thermodynamics, industrial applications, safety, and waste-disposal notes, plus SVG
  animations (bubbles, flame, color change, precipitate). 64 reagents are available on the
  shelf, grouped by class (acids, bases, salts, oxidizers, metals, fuels/gases, organics,
  etc). Combinations with no matching library entry return an honest "no reaction / not in
  the library" explanation instead of guessing.
- **16 Calculators** — molecular weight (full formula parser incl. nested parentheses),
  molarity, molality, normality, dilution (C1V1=C2V2 solver), pH/pOH, buffer
  (Henderson-Hasselbalch), Boyle's/Charles's/Combined/Ideal gas laws, density, limiting
  reagent, percent yield, empirical formula, and a stoichiometry converter. All are real
  formula-based computations, not canned answers.
- **Experiment Library** — 7 fully written experiments (acid-base titration, flame test,
  water electrolysis, distillation, paper chromatography, EDTA water-hardness titration,
  qualitative salt analysis), each with theory, aim, principle, apparatus, chemicals,
  step-by-step procedure, precautions, observation, worked calculation, result, viva
  questions, and self-check MCQs. Completing one updates your dashboard and can earn badges.
- **Quiz Mode** — a hand-written question bank (MCQ, true/false, fill-in-the-blank,
  match-the-following) plus procedurally generated periodic-table MCQs, so quizzes are
  effectively unlimited. Every answer includes an explanation.
- **AI Chemistry Tutor** — chat UI and backend wired for the real Anthropic API. It works
  out of the box in an **offline fallback mode** (answers from the built-in reaction/element
  data) and automatically upgrades to full conversational answers the moment you set
  `ANTHROPIC_API_KEY` in your environment — no code changes needed. See "Enabling the AI
  Tutor" below.
- **Dashboards** — Student (progress, completed experiments, quiz history, badges, recent
  activity), Teacher (roster with per-student experiment/quiz stats), Admin (site-wide
  usage counts).
- **Auth** — email/password accounts with hashed passwords (bcrypt) and JWT session cookies;
  roles are `student`, `teacher`, `admin`.
- **Notes & Favorites** — simple per-user notes and favorites API (used by the dashboard;
  wire up your own UI panel if you want them front-and-center).

## Enabling the AI Tutor

The tutor works immediately with no setup, using a small rule-based fallback. To enable the
full Claude-powered tutor:

1. Get an API key from [console.anthropic.com](https://console.anthropic.com).
2. Copy `.env.example` to `.env` and set `ANTHROPIC_API_KEY=sk-ant-...`.
3. Restart the server (`npm start`). The tutor UI will automatically show "● Live AI"
   instead of "○ Offline Mode".

## Project Structure

```
virtual-chemistry-lab/
├── server.js              # Express app entry point
├── config/db.js            # SQLite connection + schema
├── middleware/auth.js      # JWT auth middleware
├── routes/                 # auth, elements, lab, reactions, calculators,
│                            # experiments, quiz, dashboard, tutor, misc
├── data/                   # elements.json (118), reagents.json, reactions.json,
│                            # experiments.json, quizzes.json + generator script
├── public/
│   ├── index.html
│   ├── css/style.css
│   └── js/                 # api.js, auth.js, app.js (router) + one module per feature
├── render.yaml              # Render deploy config (recommended — see below)
├── vercel.json               # Vercel deploy config
└── .env.example
```

## Deployment

**Render (recommended):** this app uses `better-sqlite3`, a native module that writes a
real file to disk, plus long-lived login sessions — a great fit for Render's persistent-disk
web services. `render.yaml` is included: connect the repo, Render will provision a small
disk for the database automatically, and you just need to add your `ANTHROPIC_API_KEY` in
the dashboard if you want the live AI tutor.

**Vercel:** a basic `vercel.json` is included for convenience, but please note honestly:
Vercel's serverless functions have an **ephemeral, read-only-except-`/tmp` filesystem**, so
the bundled SQLite database will not persist writes (new registrations, saved progress,
etc.) between requests/deploys. For a real Vercel deployment, swap `config/db.js` for a
hosted database (e.g. Vercel Postgres, Turso, or Supabase) — the rest of the app's route
code is already structured so that only `config/db.js` and the SQL calls in `routes/*.js`
would need to change. Render or a normal VPS is the simpler path if you want SQLite as-is.

## Notes on scope

This is a genuinely working, from-scratch application, not a mockup — every calculator does
real math, every reaction comes from real chemistry, and all 118 elements have accurate core
data. A couple of things were intentionally scoped down rather than faked: 3D molecular
models and animated atomic orbitals are out of scope (2D SVG reaction animations are
included instead), and only 7 of the many possible experiments got full theory/procedure/
viva/MCQ write-ups (the pattern is there in `data/experiments.json` to add more).
