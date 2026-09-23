# 🏥 Shift Buddy — Clinical Co-Pilot for Pakistani House Officers

> **Shift Buddy** — Because documentation shouldn't require two hands and WiFi.

A stateful clinical decision support agent built for Pakistani house officers who manage entire wards during 24–36 hour on-call shifts. Runs fully offline on an Android phone. Zero cloud dependency for clinical decisions.

**Shift Buddy does NOT replace your senior.** It ensures you never forget a critical lab value, miscalculate a drug dose, or lose a patient's trend.

---

## What Shift Buddy Does

- 🫀 **Vital Signs Monitoring** — Track HR, BP, SpO₂, GCS, temperature, RR; flag critical values against configurable thresholds
- 💊 **Medication Manager** — Per-patient medication list with route/frequency, drug formulary search, and renal-toxicity warnings
- ⚠️ **Clinical Alert Engine** — Threshold breach detection using KDIGO / AKU CPG thresholds; alerts persist until acknowledged
- 🧠 **CPG-Guided Recommendations** — 7 deterministic protocol engines: AKI staging, hyperkalemia, DKA, ACS, anaphylaxis, hypoglycaemia, respiratory
- 🤝 **Handover Builder** — Structured patient summary shared to your senior group via WhatsApp
- 🌐 **Offline-First** — expo-sqlite stores everything on-device. Works in wards with NO WiFi or mobile data
- 🇵🇰 **Pakistan-Specific** — Military rank titles (Cpl/t, Hav, Lt Col), PMDC licensing, local drug formulary, acuity prioritisation

## Planned (Not Yet Implemented)

- 📋 **Chart OCR** — photo-capture of paper treatment/vital charts with structured extraction. *Currently the camera stores a photo only; no text is extracted*
- 📝 **ADMO Note Generation** — auto-formatted Admission/Diagnosis/Management/Orders notes
- 🎙️ **Voice Input** — hands-free vital entry
- 🧩 **Scenario Correlation** — combined multi-parameter guidance (today each alert is evaluated independently)

## What Shift Buddy Does NOT Do

- ❌ Replace a consultant's judgment
- ❌ Make dosing decisions autonomously — all doses computed by deterministic protocols with cited sources
- ❌ Send PHI to any cloud LLM — inference runs entirely on-device
- ❌ Require internet to function — every clinical feature works offline
- ❌ Store patient names in logs — PHI redaction baked into the logging pipeline from day one

---

## Architecture (as implemented)

```
┌──────────────────────────────────────────────────────────┐
│                    HO Phone (OFFLINE)                     │
│                                                          │
│  ┌──────────┐   ┌──────────┐   ┌──────────────────────┐  │
│  │ Patient  │   │ Vitals & │   │ Critical Detection   │  │
│  │ Entry    │→  │ Labs     │→  │ (is_critical.ts)     │  │
│  └──────────┘   └──────────┘   └──────────┬───────────┘  │
│                                            │              │
│  ┌──────────┐   ┌──────────┐   ┌──────────▼───────────┐  │
│  │ WhatsApp │←  │ Alerts   │←  │ Protocol Engines     │  │
│  │ Handover │   │ (SQLite) │   │ (7 deterministic)    │  │
│  └──────────┘   └──────────┘   └──────────────────────┘  │
│                                                          │
│  Storage: expo-sqlite (file-backed, non-destructive)     │
│  Dosing:  DETERMINISTIC — no LLM decides a dose          │
└──────────────────────────────────────────────────────────┘
              ↕  (backend exists; sync not yet wired)

Older surface, still in repo:  FastAPI backend (api/) · Next.js board (web/)
```

## Target Architecture (roadmap — not yet built)

```
Backend + Agent Orchestration
  FastAPI · LangGraph graphs · PostgreSQL · ChromaDB (RAG)
  OSS models: Gemma 4 series · MedGemma 1.5 · Whisper

On-device inference
  MedGemma 1.5 4B (advisory, shadow-first) · Gemma 4 E2B (OCR)
  Whisper small.en (voice) — all advisory only
```

### Model Routing (target — none of this is shipped yet)

| Use Case | Model | Location |
|---|---|---|
| On-device advisory | MedGemma 1.5 4B | Android AICore (planned) |
| OCR / multimodal | Gemma 4 E2B | LiteRT-LM (planned) |
| Voice capture | Whisper small.en | On-device (planned) |
| Drug dosing | **DETERMINISTIC** | Local formulary — **shipped** |

*Design rule: no cloud LLM ever reaches a clinical path.*

---

## Tech Stack

| Component | Technology | Status |
|---|---|---|
| Mobile | React Native (Expo SDK 54) + expo-sqlite | ✅ Shipped |
| Web Board | Next.js 14 App Router + Tailwind CSS | ✅ Shipped (secondary) |
| Backend | FastAPI (Python 3.12+, strict types) | ✅ Shipped (sync not wired) |
| Agent Framework | LangGraph state machines | 📋 Planned |
| Database | expo-sqlite (offline-first) | ✅ Shipped |
| Database (server) | PostgreSQL | ✅ Modeled, not yet in the mobile path |
| Vector Store | ChromaDB (RAG for clinical guidelines) | 📋 Planned |
| AI Models | OSS-only: Gemma 4 series, MedGemma, Whisper | 📋 Planned |
| Infra | Docker Compose · GitHub Actions CI | ✅ Shipped |

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

## 📲 Download

| Version | APK | Status |
|---------|-----|--------|
| latest | [Download latest APK](https://github.com/COSMICnoob80/shift-buddy-v2/releases/latest) | First release pending |
| older versions | [All releases](https://github.com/COSMICnoob80/shift-buddy-v2/releases) | Archived by tag after publication |

> Install: enable **"Install from unknown sources"** on your Android device, then open the APK.
> APKs ship via GitHub Releases (not committed to git — the build artifact exceeds GitHub's 100 MB file limit).

---

## Project Status

| Component | Status |
|---|---|
| **Foundation (Phase 0)** | ✅ Complete — auth, JWT, CVE guards, PHI redaction, router allowlist |
| **Patient Data Layer (Phase 1a)** | ✅ Complete — ORM models, migrations, schemas, services, routers |
| **Protocol Engine (Phase 1b)** | ✅ Complete — AKI staging, hyperkalemia, DKA, alert thresholds |
| **PWA Patient Board (Phase 1c)** | ✅ Complete — superseded by the mobile app as primary surface |
| **Mobile Offline App** | 🔄 Working — patient CRUD, vitals keypad, labs batch entry, medication manager, 7 protocol engines, alert pipeline, WhatsApp handover. See `SHIFT-BUDDY-SPINE.md` for verified state |
| **Android APK Build** | 🔄 Release pipeline configured — APKs published to [Releases](../../releases) |
| **OCR chart extraction** | ⚠️ Not implemented — the current screen stores a photo only; no text is extracted |
| **Agent Graphs** | 📋 Not started — `agents/` is an empty scaffold |
| **Scenario correlation** | 📋 Planned — combined multi-parameter guidance (currently alerts are independent) |

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
