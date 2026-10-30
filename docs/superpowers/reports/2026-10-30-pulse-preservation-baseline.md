# Primefield Pulse implementation: preservation baseline

Production project: `gsxqrjywtugeuexrjcln`. Implementation branch: `codex/primefield-pulse`.

No production migration or application release has been performed in this implementation.

## Backup and isolated restoration

A private PostgreSQL custom-format dump and table fingerprints were captured from the same exported, read-only repeatable-read snapshot on 30 October 2026. The dump is outside the repository, alongside private baseline and restore evidence.

* 104 original public/Auth/Storage tables; 1,144,331-byte dump.
* SHA256: `86c58a23fb01a54c2bf34d1360dc61f27be5f07859219a854e901cd0a37c7b87`.
* Isolated PostgreSQL 17 restoration matched every original row fingerprint and all 101 restored access policies.
* The named-batches migration rehearsal matched the original column values of all 104 tables, including Auth identities and password hashes.
* No old migration was replayed. Production migration versions differ from local filenames; match deployed migration names before preparing the release sequence.

The first restore selection omitted `operations_private`; it was rejected as incomplete and retained for diagnostics. A fresh local database restored that schema. The corrected restore reported seven managed-service exclusions: realtime publication membership, GraphQL schema privileges and pg_stat_statements functions/views. These do not substitute for testing the managed production services. Storage metadata is included; this dump is not a backup of media object bytes.

## Current development evidence

The existing 62 explicitly isolated release suites passed during the initial implementation pass. Targeted new tests prove distinct batch identities, bounded allocations, zero-total transfers, idempotent retries, assignment-only handovers, cross-manager isolation, assignment revocation history and unchanged aggregate inventory. Batch API tests cover authenticated attribution, permissions and strict input validation.

Implementation remains in progress. This is not final release certification. Later migrations, UI workflows, concurrency tests, fresh full-suite checks, physical-device verification and explicit production release approval remain required.

## Daily records checkpoint

The first three forward migrations were rehearsed together against a fresh isolated PostgreSQL 17 restoration. All original column values in the 104 baseline tables, including Auth accounts and password hashes, remained identical. The only intentional row added to an existing metadata table is the private farm-evidence bucket; no original Storage bucket was changed.

Daily records preserve missing measurements separately from entered zero, link previously recorded feed/mortality without duplicate stock effects, and append corrections. Tests reject duplicate active destination records and standalone mortality corrections that would leave a linked daily report stale. A fresh-context review reproduced these issues before the fixes and verified coordinated corrections, destination moves and stock restoration afterward.

Actual browser checks cover persisted scoped drafts, mandatory new mortality evidence, uploaded-photo viewing, slow-submission input locking, retained closed-day entries and centred forms at 375, 390, 768 and 1440 pixels. Two real PostgreSQL connections verify serialized retries and closing/write races. Regression groups cover existing accounts, handover, custody, financial reports, exports, Property/Content, classifications, navigation and installation behavior. A timing-sensitive handover keyboard check passed on isolated rerun; an old mortality fixture was updated to supply the now-required photograph.

This is development evidence, not release certification. Production build/release gates and physical-phone camera, keyboard and cross-tab checks remain pending with the later phases. No production migration, push or deployment was performed.
