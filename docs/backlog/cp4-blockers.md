# CP4 Blockers — Must Resolve Before P0 Ship

## CP4-B1: Migration roundtrip test currently skipped
Filed: CP2 review.
Reason: TEST_DATABASE_URL not set in CI → migration has
never run against real Postgres. ORM tests don't catch
SQL dialect issues.
Fix: wire TEST_DATABASE_URL in CI + local docker-compose
test profile. Un-skip test_migration_roundtrip.py. All
3 cases must pass before P0 tags v0.1.0.
Owner: CP4.
