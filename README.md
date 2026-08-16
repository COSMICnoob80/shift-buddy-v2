# 🏥 Shift Buddy — Clinical Co-Pilot for Pakistani House Officers

> **Shift Buddy** — Because documentation shouldn't require two hands and WiFi.

A stateful clinical decision support agent built for Pakistani house officers who manage entire wards during 24–36 hour on-call shifts. Runs fully offline on an Android phone. Zero cloud dependency for clinical decisions.

**Shift Buddy does NOT replace your senior.** It ensures you never forget a critical lab value, miscalculate a drug dose, or lose a patient's trend.

---

## What Shift Buddy Does

- 📋 **Intelligent Patient Intake** — Photo-scan paper treatment charts and vital sign sheets; structured data extracted via OCR
- 🫀 **Vital Signs Monitoring** — Track HR, BP, SpO₂, GCS, temperature, urine output; detect AKI, sepsis, and respiratory decline automatically
- 💊 **Medication Management** — Dose calculator with weight-based pediatrics, route/frequency validation, allergy cross-checks
- ⚠️ **Clinical Alert Engine** — Real-time threshold breach detection using KDIGO, ATLS, AKU CPGs — pushes notifications, never sleeps
- 🧠 **CPG-Guided Recommendations** — Protocol engine hardwired with AKI staging, hyperkalemia management, DKA protocols, antibiotic guidelines
- 📝 **ADMO Note Generation** — Admission, Diagnosis, Management, Orders — auto-formatted from patient data
- 🤝 **Handover Builder** — Structured shift-to-shift handovers shareable via WhatsApp to your senior group
- 🌐 **Offline-First** — expo-sqlite stores everything locally. Works in wards with NO WiFi or mobile data. Syncs when connection returns
- 🎙️ **Voice Input** — Whisper small.en for hands-free vital entry between patients
- 🇵🇰 **Pakistan-Specific** — Military rank titles (Cpl/t, Hav, Lt Col), PMDC licensing, local formulary units, PSX-style acuity prioritization

## What Shift Buddy Does NOT Do

- ❌ Replace a consultant's judgment
- ❌ Make dosing decisions autonomously — all doses computed by deterministic protocols with cited sources
- ❌ Send PHI to any cloud LLM — inference runs entirely on-device
- ❌ Require internet to function — every clinical feature works offline
- ❌ Store patient names in logs — PHI redaction baked into the logging pipeline from day one

---

## Agent Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    HO Phone (Offline)                     │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐   │
│  │ Patient   │  │ Vital &  │  │ Protocol Engine      │   │
│  │ Intake    │→ │ Lab Entry│→ │ (AKI / HyperK / DKA) │   │
│  └──────────┘  └──────────┘  └──────────┬───────────┘   │
│                                          │               │
│  ┌──────────┐  ┌──────────┐  ┌──────────▼───────────┐   │
│  │ ADMO     │← │ Alert    │← │ Shift State           │   │
│  │ Generator│  │ Manager  │  │ (Redis-backed)        │   │
│  └──────────┘  └──────────┘  └──────────────────────┘   │
│                                                         │
│  Inference: MedGemma 4B (advisory) · Gemma 4 E2B (OCR)  │
│  Voice: Whisper small.en · Dosing: Deterministic ONLY    │
└─────────────────────────────────────────────────────────┘
           ↕ (sync when online)
┌─────────────────────────────────────────────────────────┐
│              Backend + Agent Orchestration                │
│                                                         │
│  FastAPI · LangGraph Graphs · PostgreSQL · ChromaDB(RAG) │
│  OSS Models: Gemma 4 26B · MedGemma 1.5 · Whisper       │
└─────────────────────────────────────────────────────────┘
```

### Model Routing

| Use Case | Model | Location |
|---|---|---|
| Primary reasoning | Gemma 4 26B A4B | Ollama (local server) |
| On-device advisory | MedGemma 1.5 4B | Android AICore (P2+) |
| OCR / multimodal | Gemma 4 E2B | LiteRT-LM (on-device) |
| Voice capture | Whisper small.en | On-device |
| Drug dosing | **DETERMINISTIC** | Local formulary + RxNorm |

*No cloud LLMs reach clinical paths. Ever.*

---

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile | React Native (Expo SDK 54) + expo-sqlite |
| Web Board | Next.js 14 App Router + Tailwind CSS |
| Backend | FastAPI (Python 3.12+, strict types) |
| Agent Framework | LangGraph state machines |
| Database | PostgreSQL (sync) · expo-sqlite (offline) |
| Vector Store | ChromaDB (RAG for clinical guidelines) |
| AI Models | OSS-only: Gemma 4 series, MedGemma, Whisper |
| Infra | Docker Compose · GitHub Actions CI |

---

## Getting Started

```bash
# Start PostgreSQL + Redis + Ollama
docker compose up -d

# Backend (from /api)
cd api && uvicorn app.main:app --reload --port 8000

# Frontend (from /web)
cd web && pnpm dev         # → http://localhost:3000

# Run tests
cd api && python -m pytest tests/ --tb=short -q
cd agents && python -m pytest tests/ -v

# Format + lint
ruff check . --fix && ruff format .    # Python
pnpm lint                               # TypeScript
```

Full architecture, clinical safety rules, and domain vocabulary in [AGENTS.md](AGENTS.md).

---

## Project Status

| Component | Status |
|---|---|
| **Foundation (Phase 0)** | ✅ Complete — auth, JWT, CVE guards, PHI redaction, router allowlist |
| **Patient Data Layer (Phase 1a)** | ✅ Complete — ORM models, migrations, schemas, services, routers |
| **Protocol Engine (Phase 1b)** | ✅ Complete — AKI staging, hyperkalemia, DKA, alert thresholds |
| **PWA Patient Board (Phase 1c)** | ✅ Complete — ward board, patient cards, vitals/labs tabs, alerts |
| **Mobile Offline App** | ✅ Complete — vitals keypad, labs batch entry, medication manager, protocol vault |
| **Agent Graphs** | 🔄 In-progress — patient intake, alert coordination, handover builder |
| **Android APK Build** | Pending — eas-cli pipeline configured, awaiting showcase |

---

## Safety Guarantees

- 🔒 **PHI Redaction** — `structlog.RedactingProcessor` strips all PII/PHI from logs (enforced from commit #1)
- 🚫 **No Hallucinated Doses** — Drug dosing uses deterministic protocol rules, never LLM-generated values
- 📖 **Every Recommendation Sourced** — RAG retrieval requires confidence threshold; below-threshold results say "Verify with senior"
- 🛡️ **Router Allowlist** — New routes fail CI if not explicitly whitelisted (Principle III)
- 🔑 **OSS Runtime** — All inference models are open-source; no proprietary/cloud endpoints in shipped code
- ⚡ **Offline Hard Guarantee** — No spinner-wait for network on any clinical action (Principle XV)

---

## Domain Glossary

| Term | Meaning |
|---|---|
| **HO** | House Officer (intern/resident equivalent) |
| **ADMO** | Admission, Diagnosis, Management, Orders — structured clinical note |
| **On-call** | 24–36 hour ward shift managing patients + new admissions |
| **Treatment chart** | Handwritten medication orders in patient folder |
| **Vital chart** | Handwritten vital signs graph in patient folder |
| **FSL** | Fazal Shahid Level 1 (teaching hospital ward) |
| **PMDC** | Pakistan Medical and Dental Council |
| **CPG** | Clinical Practice Guideline (AKU Manual 2025) |

---

## Disclaimer

Shift Buddy V2 is a **clinical decision support tool**, NOT a replacement for clinical judgment. All protocol recommendations must be verified against current institutional guidelines and supervising physician approval. Drug dosing calculations follow deterministic rules sourced from established formularies — always double-check before administration. Patient data is stored locally and never transmitted to external services without explicit consent. This software carries no warranty. Use at your own risk. Your patient, your responsibility.

---

**Built by Shah G** — A Pakistani House Officer who spent too many nights memorizing drug doses from treatment charts instead of sleeping, and decided to build something smarter.
