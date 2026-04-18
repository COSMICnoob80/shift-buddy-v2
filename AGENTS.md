# Shift Buddy V2 — Clinical Co-Pilot Agent for Pakistani House Officers

Agentic clinical decision support app. NOT a reference tool — a stateful agent that tracks patients across an entire on-call shift, reasons about cases, and acts proactively.

## Core Commands

```bash
# Backend (from /api)
cd api && uvicorn app.main:app --reload --port 8000
python -m pytest tests/ --tb=short -q
python -m pytest tests/protocols/ -k "test_" --tb=short   # clinical protocol tests only
ruff check . --fix && ruff format .                        # lint + format
mypy app/ --strict                                         # type check

# Frontend (from /web)
cd web && pnpm dev                                         # Next.js dev server :3000
pnpm build && pnpm start                                   # production build
pnpm test --run --no-color                                 # Vitest
pnpm lint                                                  # ESLint strict
pnpm typecheck                                             # tsc --noEmit

# Mobile (from /mobile)
cd mobile && npx react-native run-android
npx react-native run-ios

# Full stack (from repo root)
docker compose up -d                                       # PostgreSQL + Redis + Ollama
docker compose down -v                                     # teardown with volume cleanup

# Agents (from /agents)
cd agents && python -m pytest tests/ -v                    # LangGraph graph tests
python scripts/test_model_router.py                        # verify OSS model routing (Gemma 4 / MedGemma / Whisper)
```

Always run `ruff check` (Python) and `pnpm lint` (TypeScript) before committing.

## Project Layout

```
shift-buddy-v2/
├── api/              → FastAPI backend (Python 3.12+, strict type hints)
│   ├── app/
│   │   ├── main.py           # FastAPI app entry, CORS, middleware
│   │   ├── routers/          # Route handlers: patients, protocols, auth, scan
│   │   ├── models/           # SQLAlchemy + Pydantic models
│   │   ├── services/         # Business logic layer (no route deps here)
│   │   └── core/             # Config, security, database session
│   └── tests/
├── web/              → Next.js 14+ frontend (TypeScript strict, App Router)
│   ├── src/app/              # App Router pages
│   ├── src/components/       # React components (one component per file)
│   └── src/lib/              # Utilities, API client, types
├── mobile/           → React Native (TypeScript strict)
├── agents/           → LangGraph orchestration (Python)
│   ├── graphs/               # LangGraph state machines
│   │   ├── patient_intake.py
│   │   ├── alert_engine.py
│   │   ├── admo_generator.py
│   │   └── handover_builder.py
│   ├── tools/                # Agent tool definitions
│   ├── models/               # Model router (OSS-only: Gemma 4 / MedGemma / Whisper)
│   └── tests/
├── mcp-servers/      → MCP server implementations (future)
├── docs/             → Architecture decisions, clinical references
├── docker-compose.yml
├── AGENTS.md         ← you are here
└── CLAUDE.md         → symlink to this file
```

Backend code lives **only** in `api/`. Frontend code lives **only** in `web/`. Agent logic lives **only** in `agents/`. Never cross these boundaries.

## Code Style

### Python (api/ and agents/)
- Python 3.12+, strict type hints on ALL functions (params + return)
- Pydantic v2 for all data models — never use raw dicts for structured data
- `ruff` for lint + format (configured in `pyproject.toml`), line length 100
- Async everywhere in FastAPI routes (`async def`, not `def`)
- Naming: `snake_case` for functions/variables, `PascalCase` for classes
- Imports: stdlib → third-party → local, separated by blank lines
- Docstrings: Google style, required on all public functions
- No `print()` — use `structlog` for all logging
- No bare `except:` — always catch specific exceptions

```python
# GOOD
async def get_patient(patient_id: int, db: AsyncSession = Depends(get_db)) -> PatientResponse:
    """Retrieve patient by ID with active medications."""
    patient = await db.get(Patient, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return PatientResponse.model_validate(patient)

# BAD — missing types, sync, bare dict, print
def get_patient(patient_id, db):
    print(f"getting patient {patient_id}")
    patient = db.query(Patient).get(patient_id)
    return {"name": patient.name}
```

### TypeScript (web/ and mobile/)
- TypeScript strict mode (`"strict": true` in tsconfig.json)
- React functional components only — no class components
- `pnpm` as package manager — never `npm` or `yarn`
- Naming: `camelCase` for variables/functions, `PascalCase` for components/types
- No `any` — use `unknown` and narrow with type guards
- No `console.log` in committed code — use a logger utility
- Prefer `interface` over `type` for object shapes
- One React component per file, filename matches component name
- All API calls through a typed client in `src/lib/api.ts`

```tsx
// GOOD
interface PatientCardProps {
  patient: Patient;
  onSelect: (id: number) => void;
}

export function PatientCard({ patient, onSelect }: PatientCardProps) {
  return (
    <button onClick={() => onSelect(patient.id)}>
      {patient.name} — Bed {patient.bed}
    </button>
  );
}

// BAD — any, inline style object, class component
export class PatientCard extends React.Component<any> { ... }
```

### UI Rules
- Inter font family (all weights) — no exceptions
- Dark theme primary, light theme secondary
- Tailwind CSS for styling — no CSS modules, no styled-components
- Mobile-first responsive design

### Git
- Branch: `main` → `dev` → `feature/*`, `fix/*`, `chore/*`
- Conventional commits: `feat(scanner):`, `fix(alerts):`, `docs:`, `test:`
- Never commit directly to `main` — always PR from `dev`
- Squash merge feature branches

## Clinical Safety — NEVER Do These

- **NEVER hallucinate drug doses** — always source from RAG knowledge base or deterministic protocol rules
- **NEVER log patient names, MRNs, or identifiers** — de-identify in all logs
- **NEVER send patient data to cloud AI without stripping identifiers first**
- **NEVER skip tests for clinical protocol code** — every protocol needs unit tests covering edge cases
- **NEVER use AI-generated medical text without citation** — link to guideline or formulary
- **NEVER store API keys, tokens, or secrets in code** — use `.env` files (gitignored) or Docker secrets
- **NEVER modify `docker-compose.yml` database volumes without team notification**
- **NEVER bypass the model router** — all AI calls go through `agents/models/router.py` for cost tracking and privacy enforcement

## Architecture Patterns

### Model Routing (agents/models/router.py)

OSS-only runtime. No proprietary/cloud inference is reachable from shipped paths.
See constitution Principle V (OSS-Only Runtime).

```python
# Primary reasoning → Gemma 4 26B A4B (Ollama, local server)
# Mobile on-device  → Gemma 4 E2B (AICore / LiteRT-LM)
# Laptop fallback   → Gemma 4 E4B
# OCR / multimodal  → Gemma 4 E4B
# Voice capture     → Whisper small.en
# Clinical advisory → MedGemma 1.5 4B (NEVER primary for dosing)
# Drug dosing       → DETERMINISTIC (local formulary, RxNorm OSS).
#                     LLM formats output, never decides dose.
```

### LangGraph State Machines (agents/graphs/)
Each graph is a stateful workflow. Patient state persists across the entire shift. Graphs communicate through a shared `ShiftState` object stored in Redis.

### API Design (api/routers/)
RESTful + WebSocket. REST for CRUD operations, WebSocket for real-time alerts and patient board updates. All responses use Pydantic response models — never return raw dicts.

### RAG (agents/tools/rag.py)
ChromaDB for clinical guidelines vector store. Every AI-generated clinical recommendation must include a `source` field pointing to the retrieved document chunk. If RAG retrieval confidence is below threshold, the agent must say "I'm not confident — verify with senior."

## Comment Guidelines for Clinical Logic

```python
# Every medical decision tree MUST have inline comments explaining
# the clinical reasoning, not just what the code does.

# GOOD
if creatinine >= 1.5 and baseline_creatinine and creatinine >= baseline_creatinine * 1.5:
    # AKI Stage 1 (KDIGO criteria): ≥1.5x baseline within 7 days
    # Source: KDIGO Clinical Practice Guideline for AKI, 2012
    return AKIStage.STAGE_1

# BAD — no clinical reasoning documented
if creatinine >= 1.5:
    return "aki"
```

## Domain Vocabulary

- **HO** = House Officer (intern/resident equivalent)
- **ADMO** = Admission, Diagnosis, Management, Orders — structured clinical note
- **On-call** = 24-36 hour shift, HO manages ward patients + new admissions
- **Treatment chart** = Handwritten medication orders sheet in patient folder
- **Vital chart** = Handwritten vital signs graph in patient folder
- **FSL** = Full name of the teaching hospital ward/unit
- **PMDC** = Pakistan Medical and Dental Council (licensing authority)
