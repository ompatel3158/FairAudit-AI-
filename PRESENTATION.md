# App Name: FairAudit AI
**Theme:** Unbiased AI Decision  
**Tech Stack:** Gemini API, Firebase, HTML/JS  

---

## SLIDE 2 — Team Details
* **Team Name:** [YOUR TEAM NAME]
* **Leader Name:** [YOUR NAME]
* **Problem Statement:** "Computer programs make life-changing decisions about jobs, loans, and medical care. If trained on flawed historical data, they repeat and amplify discriminatory mistakes."

---

## SLIDE 3 — Brief About Solution
* **Overview:** 3-module bias detection platform to audit datasets, AI models, and individual decisions for hidden discrimination before they go live.
* **Core Functionality:** Measures bias on a 0-100 risk scale, flags problem areas, and provides specific fix recommendations.
* **Technology:** Built with Gemini API for powerful analysis and Firebase for scalable hosting.

---

## SLIDE 4 — Opportunities
* **How it's different:** No data science expertise required. Perfect for non-technical users to paste data and get instant, plain English audit reports.
* **How it solves the problem:** Catches bias before deployment using a proactive pre-deployment checklist, plus reactive auditing of live decisions.
* **Unique Selling Proposition (USP):** The only tool combining dataset audits, model inspections, and individual decision auditing in one platform with a downloadable professional report card.

---

## SLIDE 5 — Features
* **Resume/Hiring Bias Detector:** Anonymizes and scores up to 5 resumes in batch against JD skills, yielding a ranked leaderboard.
* **Dataset Bias Scanner:** Upload any CSV to detect biased columns/correlations (0-100 risk score and visual bar charts).
* **AI Decision Audit:** Audit loan/medical/job decisions with model checking and "What-If" outcome analysis.
* **Pre-Deployment Checklist:** 8 yes/no questions to determine an AI system's "go-live" readiness.
* **Bias Report Card & Simple/Expert Mode:** Downloadable professional reports and plain English toggles.
* **Audit History:** Tracks and saves all past session audits locally.

---

## SLIDE 6 — Process Flow
* **Module 1 (Hiring):** Resume uploaded → Personal info stripped → Skills extracted → Scored against JD → Bias-free result leaderboard.
* **Module 2 (Dataset):** CSV uploaded → Columns analyzed → Protected attributes flagged → Correlations detected → Risk score + recommendations.
* **Module 3 (Decision):** Decision input → Model background checked → What-if scenarios run → Fairness verdict + plain English explanation.

---

## SLIDE 7 — Wireframes
* **Homepage:** Clean dashboard displaying 3 main module cards and a pre-deployment readiness banner.
* **Module 2 Result Screen:** Features a prominent bias bar chart and a color-coded 0-100 risk score.
* **Module 3 Audit Report:** Displays a bold HIGH RISK (or FAIR/BIASED) flag with a plain English explanation breakdown.

---

## SLIDE 8 — Architecture
* **User Browser** → **Firebase Hosting**
* **HTML/JS Frontend** → **Gemini API (gemini-2.0-flash)**
* **JSON Response** → **Rendered Report Card**
* **Optional:** **localStorage** (for session Audit History)

---

## SLIDE 9 — Technologies
* **Google Gemini API (gemini-2.0-flash):** Core AI analysis engine ensuring deep context understanding.
* **Firebase Hosting:** Fast deployment and reliable web hosting.
* **HTML5 / CSS3 / JavaScript (React/Tailwind):** Responsive and interactive frontend.
* **localStorage:** Session-based audit history without complex backend needs.
* **JSON Schema & Low Temperature:** Ensures structured, deterministic, and consistent AI output.

---

## SLIDE 10 — Cost
* **Firebase Hosting:** Free tier
* **Gemini API:** Free tier (60 requests/minute)
* **Total Estimated Cost for Prototype:** $0

---

## SLIDE 11 — MVP Snapshots
* **Screenshot 1:** Homepage with 3 module cards.
* **Screenshot 2:** Module 1 — two resumes both scoring 95 (bias eliminated).
* **Screenshot 3:** Module 2 — CSV bias scan with flagged columns and bar chart.
* **Screenshot 4:** Module 3 — loan decision audit showing POTENTIALLY BIASED status.
* **Screenshot 5:** Pre-deployment checklist result showing NOT READY.
* **Screenshot 6:** System-generated downloaded bias report card.

---

## SLIDE 12 — Future Development
* **Real ML Model Integration:** Connect to actual deployed models via API for deeper live inspection.
* **Multi-Language Support:** Audit datasets in regional languages.
* **Historical Bias Tracking:** Plot bias scores over time for continuous improvement.
* **Browser Extension:** Audit AI decisions natively directly inside the browser.
* **Enterprise Dashboard:** Team accounts with shared audit history and compliance reports.

---

## SLIDE 13 — Links
* **GitHub:** [YOUR GITHUB LINK]
* **Demo Video:** [YOUR YOUTUBE LINK]
* **MVP Link:** [YOUR FIREBASE LINK]
* **Working Prototype:** [YOUR FIREBASE LINK]
