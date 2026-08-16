# Shift Buddy V2 — Principles XV + XVI

## XV. Delivery-First Validation

Before any spec proceeds past §0, this table MUST be filled and cited by /sp.plan:

| Question | Answer (LOCKED) |
|---|---|
| Where used? | Android phone, hospital ward, one hand free, standing between patients |
| Network? | Mobile data ONLY (metered). No WiFi. MUST work FULLY OFFLINE. Cloud = enhancement only. |
| Data source? | Paper patient files → camera photo + manual entry. HMS inaccessible (military policy). |
| Output? | Screen + WhatsApp share to senior group for handovers/updates |
| User's hand? | Holding phone. Touch-first. No keyboard. |
| Primary LLM? | MedGemma 1.5 4B on-device (P2). Until then: deterministic protocols only. |
| Offline req? | HARD. App must NEVER spinner-wait for network to perform core clinical functions. |

VIOLATION: Any architecture requiring a running server, cloud API, or network connection for patient data entry, protocol lookup, alert generation, or vitals recording is a Principle XV violation. The FastAPI backend exists as an eval/sync server on the developer's laptop — it is NOT in the clinical path.

## XVI. Model Selection (Clinical)

1. **Deterministic engines (ALWAYS, all phases)** — drug dosing, is_critical thresholds, protocol tiers. LLM formats output, NEVER decides dose.
2. **MedGemma 1.5 4B on-device (P2+)** — clinical advisory, shadow mode suggestions. Flagged "advisory only" in UI. NEVER primary for dosing.
3. **Gemma 4 E2B on-device (P2+)** — OCR for handwritten charts, voice transcription during rounds.
4. **DeepSeek V4 Flash via OpenRouter (cloud backup)** — non-clinical tasks only (summarization, WhatsApp message formatting) when mobile data available. Clinical decisions NEVER route through cloud.

Development tooling (not shipped): HERMES + DeepSeek V4 Flash, Gemini 3 Free for planning.
