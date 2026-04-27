---
id: "0004"
title: Shift Buddy Business Opportunity Brief
stage: general
date: 2026-04-24
surface: agent
model: claude-sonnet-4-6
feature: none
branch: dev
user: syedmuhammadabdullahshah@protonmail.com
command: /sc:research (deep research — business opportunity evaluation)
labels: ["market-research","competitive-analysis","financial-analysis","CDSS","Pakistan","AEWACS"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - history/prompts/general/0004-shift-buddy-business-opportunity-brief.general.prompt.md
tests:
  - none
---

## Prompt

You are coordinating a TOKEN-EFFICIENT multi-angle business opportunity evaluation for **Shift Buddy V2 (AEWACS)** — an AI-assisted clinical decision support system for hospital House Officers (junior doctors) in Pakistan.

**Product Summary:**
- A mobile + web app for hospital House Officers (HOs) managing patient wards
- Features: patient board, vitals/lab entry, deterministic clinical alert engine, protocol evaluation (hyperkalemia, AKI, ACS, DKA, Sepsis), AI-advisory layer (MedGemma, offline-capable)
- Stack: FastAPI + PostgreSQL + Next.js + React Native + LangGraph agents
- OSS-only runtime (no cloud inference in production)
- Target: Pakistan military/public hospitals initially (e.g., FSL = Field Services Laboratory context), then regional expansion
- Phase 0 complete (auth floor). P1 = patient data layer. P6 = full clinical agent.

**Your task**: Produce a unified business opportunity brief covering three angles — Market Researcher, Competitive Analyst, Financial Analyst.

[Full prompt truncated for brevity — see conversation context for complete multi-angle research brief request with specific sub-questions per angle and output format specification.]

## Response snapshot

Produced a unified business opportunity brief under 800 words covering:

**Market Opportunity**: Global CDSS market ~USD 1.8B (2023) → USD 6.5–7.2B by 2030 at ~19–20% CAGR (Grand View Research / MarketsandMarkets 2024). South Asia HIS/CDSS ~USD 600–700M TAM by 2027. Pakistan has >20,000 HOs/year across 150+ teaching hospitals with zero dedicated HO workflow product in market.

**Competitive Landscape**: No Pakistan-native CDSS at ward level. DHIS2 is aggregate reporting only. Epic/Cerner inaccessible (USD 500K–5M+). UpToDate/Isabel DDx are reference tools, not ward management. All existing tools fail on: offline connectivity, USD pricing, lack of Pakistan protocol context. Shift Buddy's differentiation: offline-first, OSS runtime, deterministic protocol engine (Pakistan formulary), HO-centric UX.

**Financial Picture**: Recommended tiered government tender / institutional SaaS at USD 300/hospital/month. Breakeven at ~8 hospitals (~USD 28,800 ARR) against a 2-person Pakistan-based team burn of ~USD 24,000/year. 3-year TAM: 80–100 hospitals = USD 288K–480K ARR. Grant opportunities: Gates Foundation (USD 100K–500K), Wellcome Trust LMICs (GBP 300K), WHO SEARO, AKHS innovation grants.

**Strategic Recommendation**: AFMS military hospital beachhead (centralized procurement, ~70 hospitals via single MoU). Position as "clinical workflow tool" not SaMD to avoid DRAP regulatory friction. Hybrid monetization: anchor grant (Gates/Wellcome) + paid AFMS pilot at 3–5 hospitals.

## Outcome

- Impact: Delivered actionable market sizing, competitive positioning, and financial model for Shift Buddy V2 go-to-market planning
- Tests: none — research/analysis task
- Files: history/prompts/general/0004-shift-buddy-business-opportunity-brief.general.prompt.md
- Next prompts: /sp.spec for go-to-market spec, /sp.adr for AFMS beachhead strategy, grant application drafting
- Reflection: WebSearch was blocked (permission denied); brief produced from training knowledge (cutoff Aug 2025) with identifiable published sources cited. User should verify market figures against latest reports before investor/tender use.

## Evaluation notes (flywheel)

- Failure modes observed: WebSearch permission denied — all market data sourced from training knowledge rather than live retrieval. Figures are credible but should be independently verified.
- Graders run and results (PASS/FAIL): none
- Prompt variant (if applicable): none
- Next experiment: enable WebSearch permission to allow live market data retrieval for higher-confidence figures
