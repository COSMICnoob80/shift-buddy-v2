# CP4 Blockers — Must Resolve Before P0 Ship

## CP4-B1: Migration roundtrip test — RESOLVED ✅
Filed: CP2 review.
Resolved: CP4.
Resolution: Added postgres:16 service to the `api-test` CI job with
TEST_DATABASE_URL wired. test_alembic_roundtrip_live_postgres now runs
against real Postgres in every CI run. All 3 cases pass.
