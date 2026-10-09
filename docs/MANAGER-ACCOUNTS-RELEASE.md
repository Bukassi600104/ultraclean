# Manager account controls — October 9, 2026

Scope: the existing CEO account-management page and API now cover `manager` (Primefield), `property_manager` and `content_manager`. Creation includes an app selector; omitting the role retains the old farm-account API behavior. Administrative and unsupported roles cannot be created here. Existing account roles and credentials are not reassigned during deployment.

The sidebar labels the existing `/dashboard/managers` route Manage Accounts. Settings links to that same page, replacing its duplicate farm-only form and one-manager display restriction. Existing app login routes and operational workflows remain unchanged.

Suspension persists `profiles.suspended` before banning sign-in through Supabase Auth. Reactivation removes the Auth ban before enabling application access. Provider/database failures are reported, leaving access blocked where possible and supporting retries. These two services are not a single transaction: partial failures explicitly require a retry, rather than returning success.

Remove access retains the Auth identity and profile to preserve historical foreign keys and attribution. It suspends the profile, bans sign-in and records a server-owned permanent-removal flag, actor and timestamp in Auth app metadata. Removed accounts cannot be reset/reactivated through these endpoints. Temporary restrictions use Suspend. The account email remains reserved; a new account needs a different email. No business records are deleted. Newly created accounts that fail initial profile setup are cleaned up before they are handed to staff.

No database migration, dependency change, new business permission tier or new real staff account is part of this release. Account lifecycle tests use isolated Auth/database responses; browser checks use synthetic staff records. Existing live account fingerprints are compared around release. Live verification does not create, suspend or remove Bimbo's or a manager's account.

Validation: 62 isolated account API checks, 38 actual server-auth guard checks, 88 actual middleware checks, 12 actual React/browser account-page checks, clean lint and a successful full production build (116 pages). Browser checks cover all three account roles, suspension/reactivation, retained removal, load failures and 390/768/1440 layouts; screenshots were reviewed. Account routes remain admin-only. The live GitHub/Vercel release is explicitly authorized by the user; the resulting deployment and production checks are reported in the completion response.
