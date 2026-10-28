# Dashboard audit corrections and internal CEO reports — 28 October 2026

## Approved scope

Correct mortality date scopes, exact financial aggregation and reconciliation, return navigation, sale form labels and blog control accessibility. Repair the isolated account UI harness without changing account logic. The subsequent user addendum requires Properties and Content Manager to open reporting pages inside the CEO dashboard, reading the same saved operational records. Standalone manager apps remain available with their existing roles and workflows.

The user explicitly authorized testing, GitHub push and Vercel production update. Missing historical expenses must remain untouched. Keep the temporary CEO tester until the user finishes testing.

## Preservation and recovery

No migration, account change, historical recalculation or inventory rebuild is required. Original numeric values are read as decimal text; exact sums are rounded only at final display precision. The existing API numeric fields and funding formulas retain their meaning. Feed remains counted once, currencies stay separate, and unsupported measures remain unavailable.

Private backup: `production-before-corrections.dump`, 767258 bytes; SHA256 `4986a67e14955bd9bfdd26cbe4bbe69fc248acb997d7da15fe924f8075f6e17d`. An isolated PostgreSQL 17 restore matched the counts and full-row fingerprints of all 84 public/auth/storage tables, including 49 application tables and eight accounts. Managed-object restore warnings are retained privately. Latest production migration is `20261016225631`.

The release requires no write pause. Previous compatible production deployment for application rollback: `dpl_5oQhzqk4nzn6uZZs2UmLMH5YqoQu`, commit `c8c69427f42320eda5bedb251c93aeec31bbc1b5`. Roll back application traffic only; never restore an old database over legitimate new activity.

## Accounting evidence

An independent SQL numeric comparison against the restored snapshot agrees with the actual new calculation service for October 1–27, October 28, and all recorded history. October revenue is NGN 2,681,800.00; recorded period expenses are zero because no general/feed entries were provided for that period. Owner funds are NGN 2,974,500.00 and sales cash NGN 2,808,800.00. These balances do not establish a bank/receipt reconciliation or prove no spending occurred.

Legacy feed total `2716231.9999999` is retained at full stored scale. Tests cover exact decimal sums, sub-cent values, negative balances, final rounding, explicit bridge adjustments, unsafe numeric transport, multiple currencies, voids, legacy funding and more than 500 records. Mortality reversal resolution occurs before date filtering, so CEO and Farm Overview share the same dated result.

## Verification

Completed checks include exact-money and analytics assertions; farm calculations; CEO data/API25; farm API38; manager-account API62 and UI12; middleware100; Property API50/UI38; Content API24/UI51; operational shells87; CEO header87 and overview42; internal CEO reports24; farm UI29; feed UI26; report UI74; livestock catalogue16/API18/UI22; farm operations API44; feed API25/daily-feed API18. Actual forms and Back clicks retain unsaved date/value edits and pending offline submissions, with zero writes. Isolated SQL suites passed V2 67, livestock43, operations308 and feed/report47 checks.

ESLint and the production build pass, generating 120 static pages. Public-site suite and built/live release verification are recorded below when completed. Responsive tests use 390, 768 and 1440 pixel widths; desktop/browser results do not claim physical-phone installation testing.

## Independent review and decisions

Original review found two Important issues: Back navigation could discard unsaved input, and UltraTidy detail re-summed rounded category figures. Both were reproduced with failing tests and corrected; authoritative service totals and explicit unsaved-navigation confirmation now pass the corresponding tests.

The addendum review found two Important issues: duplicate content titles merged attribution, and an explicitly empty start date was replaced with the current month. Both were reproduced before fixes. Attribution retains currency/content-ID identity and disambiguates titles; empty From means all history while a missing From defaults to this month. No Critical or deferred Minor findings remain.

Execution rulings, in order:

1. The app worktree tool could not resolve the parent folder as a repository. Used an isolated manual Git worktree and reused existing dependencies. Risk is workspace confusion; verify the exact path and commit before release.
2. Git Bash is invoked by its installed path. Planning artifacts are retained under the user's preservation requirement. Risk is stale artifacts; the current ledger and release record identify this run.
3. Shared exact-decimal and mortality changes are committed together because they share callers. Risk is an unbuildable intermediate commit, avoided by combined verification.
4. A small dependency-free decimal helper preserves original scale and rounds final aggregates half away from zero. Unsafe transport fails explicitly. Risk is incorrect balances; covered by edge fixtures and independent SQL comparisons.
5. Daily Report's existing page title was corrected in the manager shell after its navigation test exposed a generic title. Risk is navigation confusion; covered by actual route/header tests.
6. Existing release authorization covers this approved scope, including the internal CEO reporting addendum. No migration or business write was added. Risk is unexpected release scope; the preserved plan and source diff define it.
7. Missing expenses, physical feed counts, bank statements and social authorization are genuine missing inputs and remain untouched. Risk is incomplete business reporting, explicitly identified in the UI and this record.
8. Addendum review excludes earlier reviewed repairs and release execution; their original review, regression and release evidence remain applicable. Risk is integration defects; affected suites and the production build are checked together.

## Release execution

Pending final public regression, source commit, staged production metadata, promotion, GitHub synchronization, live visual checks and post-release preservation comparison. Do not treat this section as a completed deployment until those results are recorded.

## Remaining inputs

Missing farm expenses/feed purchases, real opening feed bag counts and social-account authorization have not been invented. Property/Content ledgers remain empty until genuine entries are saved. DBA currency and full business profit/arrears require authoritative definitions or records. Mobile installation on physical phones remains unchecked.
