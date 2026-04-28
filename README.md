# FairAudit AI

**Catch AI bias before it harms real people.**

FairAudit AI is a web application that helps developers, data scientists, and product teams audit their AI systems for hidden discrimination — before deployment. It covers hiring pipelines, training datasets, individual AI decisions, and pre-deployment readiness checks, all powered by Google's Gemini AI.

---

## Features

FairAudit AI provides four independent audit modules:

### Module 1 — Resume / Hiring Bias Detector
Upload a resume (PDF or DOCX) and receive an anonymized version with all personally identifiable information removed (name, gender, age, location, etc.). The tool then scores the resume purely on skills and experience, so hiring decisions are based on merit rather than demographic proxies.

### Module 2 — Dataset Bias Scanner
Upload a CSV dataset and get a column-by-column analysis of which features contain biased patterns or act as proxies for protected attributes (e.g. zip code as a proxy for race). Use this before training a model to catch problems at the source.

### Module 3 — Decision Audit
Describe an AI system's decision (loan approval, hiring, medical triage, etc.) and the input data used. The auditor checks whether protected attributes such as gender, age, or race influenced the outcome unfairly, returns a risk level and fairness verdict, and generates what-if scenarios showing how the decision would change if those attributes were different.

### Pre-Deployment Checklist
Answer eight yes/no questions about your model — covering training data recency, demographic testing, and the domains affected — and receive an instant readiness verdict (READY / NEEDS REVIEW / NOT READY) with actionable fix steps tailored to your answers.

### Audit History
Every audit is automatically saved to your browser's local storage and displayed in a persistent history table, so you can track improvements over time without creating an account.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + TypeScript |
| Build tool | Vite 6 |
| Styling | Tailwind CSS 4 |
| AI backend | Google Gemini (via `@google/genai`) |
| Animations | Motion (Framer Motion) |
| Icons | Lucide React |
| Document parsing | Mammoth (DOCX → HTML) |

The app calls the Gemini API directly from the browser. It tries a waterfall of models (`gemma-4-31b` → `gemma-4-26b` → `gemma-3-27b` → `gemini-2.5-flash`) so it always falls back gracefully if one model is unavailable.

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18 or later
- A [Google AI Studio](https://aistudio.google.com/) account and Gemini API key

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/ompatel3158/FairAudit-AI.git
   cd FairAudit-AI
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment variables**

   Copy the example env file and add your key:

   ```bash
   cp .env.example .env.local
   ```

   Open `.env.local` and set:

   ```env
   GEMINI_API_KEY="your-gemini-api-key-here"
   ```

4. **Start the development server**

   ```bash
   npm run dev
   ```

   The app will be available at [http://localhost:3000](http://localhost:3000).

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the local dev server on port 3000 |
| `npm run build` | Build for production (output in `dist/`) |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Type-check with TypeScript (`tsc --noEmit`) |
| `npm run clean` | Remove the `dist/` directory |

---

## Project Structure

```
FairAudit-AI/
├── src/
│   ├── App.tsx                  # Root component, routing, audit history
│   ├── main.tsx                 # Entry point
│   ├── index.css                # Global styles
│   ├── components/
│   │   ├── LandingPage.tsx      # Home screen with module cards
│   │   ├── ResumeScreening.tsx  # Module 1 — hiring bias detector
│   │   ├── DatasetScanner.tsx   # Module 2 — dataset bias scanner
│   │   ├── DecisionAudit.tsx    # Module 3 — decision audit
│   │   └── Checklist.tsx        # Pre-deployment checklist
│   └── lib/
│       └── gemini.ts            # Gemini API client with model fallback
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## Use Cases

- **HR teams** — Screen resumes anonymously to reduce unconscious bias.
- **Data scientists** — Inspect training datasets before model training.
- **ML engineers** — Audit model decisions in loan, hiring, or healthcare contexts.
- **Compliance teams** — Run a pre-deployment checklist before going live with a model that affects people.

---

## Deployment

The project includes a `firebase.json` configuration for Firebase Hosting. To deploy:

```bash
npm run build
firebase deploy
```

Alternatively, deploy the `dist/` folder to any static hosting provider (Vercel, Netlify, Cloudflare Pages, etc.).

---

## License

This project is private. All rights reserved.
