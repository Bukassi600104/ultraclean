# Content operations and social access

Implemented on the expansion branch; no production accounts, tokens or configuration were changed.

## Manual operations

`/content` has a separate login, protected workspace and working Content, Performance, Leads, Sales, Connections and History pages. Only active content managers and administrators can use these APIs. Records support bounded validated creation and audited correction with an expected revision, reason and retry UUID. No hard deletion is exposed; publications can be archived and leads closed. Sales remain in their original ISO currency. Saved manual snapshots explicitly retain manual provenance; unavailable measurements remain NULL. Account/date and content/date uniqueness is enforced in the database. Publication scheduling records an operational plan and does not auto-publish.

All financial/performance summaries for the CEO are computed from complete saved rows by the CEO aggregation service. The lists paginate separately. Followers are dated account snapshots and are never added across repeated dates or individual posts. Links permit HTTP(S) only. Foreign links and platform consistency are validated by the database. The immutable content audit includes original values, corrections, authenticated actors and timestamps.

## Instagram priority

Official Instagram Login authorization, callback, encrypted server token persistence, CEO-triggered follower synchronization, reauthorization and local disconnect are implemented. OAuth uses a signed, actor-bound ten-minute state in a Secure HttpOnly SameSite cookie. Tokens are encrypted with randomized AES-256-GCM and stored only through service-only guarded routines. Token ciphertext is excluded from audit/receipts/API responses. Reauthorization invalidates old tokens; metadata-only lookup permits replacing them safely. If token persistence fails after creating a connection, the integration is marked error so it cannot expose a working connection falsely. Local disconnect stops all token reads; it does not claim to revoke the authorization in Meta's account settings.

Needed server-only configuration:

```
CONTENT_TOKEN_ENCRYPTION_KEY= # base64 encoding of 32 random bytes; preserve securely for decryption
INSTAGRAM_APP_ID=
INSTAGRAM_APP_SECRET=
INSTAGRAM_REDIRECT_URI= # exact HTTPS callback registered with Meta
INSTAGRAM_API_VERSION= # supported Graph API version, e.g. vNN.0; explicitly selected at release
```

The CEO must authorize a professional Instagram business/creator account. The developer application needs the approved basic and insights permissions and correct redirect. No passwords or paid aggregator/API are used. Configuration is deliberately absent in the current production environment. No real OAuth grant or provider sync has been attempted. Provider access, permissions and the selected version require staging verification with Bimbo's authorized account before release. The import currently supports official follower count; reach, impressions and engagements remain measured manual entries. A manual account snapshot is never silently overwritten by sync.

Official reference: [Meta's Instagram collection](https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api), [Instagram Login](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login), [Business Login](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/business-login), [Instagram Insights](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/insights). Meta documentation requests returned HTTP 429 during this audit; the Meta-owned collection was accessible. Consequently real account behavior remains an external authorization gate, not a claimed completed production integration.

## Facebook and TikTok

Both have complete manual publication, performance, lead and sales workflows plus prepared official OAuth, reauthorization, encrypted server token persistence, CEO-only follower synchronization and local disconnect adapters. Missing configuration leaves explicit manual-ready states. No live developer applications or account grants were created or authorized by this task.

Facebook uses standard Graph OAuth with `pages_show_list,pages_read_engagement`, exchanges the short user token for a long user token, and reads authorized Pages. `FACEBOOK_PAGE_ID` must identify the exact authorized Page; the adapter never chooses the first returned Page or substitutes another account. Page pagination is restricted to the official HTTPS Graph host. Page tokens remain encrypted and conservatively expire with the exchanged user authorization. Only the Page's official follower count is imported.

Facebook server configuration:

```
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=
FACEBOOK_REDIRECT_URI= # exact registered HTTPS callback, no query or fragment
FACEBOOK_API_VERSION= # explicitly supported version at release
FACEBOOK_PAGE_ID= # exact Page Bimbo intends to authorize
```

TikTok uses official web Login Kit and `user.info.basic,user.info.stats`. Its API's successful `error.code = ok` envelope is recognized correctly. The returned access token, refresh token, account ID and refresh expiry are encrypted together; no refresh secret is returned to the browser or audit. While access remains valid, a CEO sync refreshes credentials within 30 minutes of expiry and persists any rotated refresh token before continuing. Already-expired or invalidated credentials cannot be read through the database guard and require reauthorization. Account IDs must match during consent, refresh and metric fetch. Only official follower count is imported; other unavailable metrics remain NULL/manual.

TikTok server configuration:

```
TIKTOK_CLIENT_KEY=
TIKTOK_CLIENT_SECRET=
TIKTOK_REDIRECT_URI= # exact registered HTTPS callback, no query or fragment
```

All platforms share the server-only 32-byte encryption key, actor/platform-bound signed OAuth state and ten-minute Secure HttpOnly cookies with platform-specific paths. A manual snapshot for the same account/date is never silently replaced. Repeated official snapshots update the same unique account/date row with audit and revision checks. Local disconnect stops token access; users may remove the provider's grant in its account settings. Developer review, permissions, an eligible account/Page and Bimbo's actual consent remain external release gates. The adapters are prepared and tested against synthetic provider responses, not claimed connected in production. No paid API, pay-as-you-go service or aggregator is used.

Primary references: [Meta-owned Facebook collection](https://www.postman.com/meta/facebook/documentation/r56bjfd/facebook-api), [TikTok web Login Kit](https://developers.tiktok.com/docs/en/login-kit-web), [TikTok user access token management](https://developers.tiktok.com/docs/en/oauth-user-access-token-management), [TikTok user information and scope-specific statistics](https://developers.tiktok.com/docs/en/tiktok-api-v2-get-user-info).

## Verification

- Actual API handler suite: role isolation, trusted actors, forged-field rejection, real dates, safe links, manual-only source, positive amounts, revision zero, conflicts and honest query errors.
- Actual crypto/OAuth handler suite: randomized encryption, authenticated tamper rejection, signed actor-bound state, CEO-only authorization/sync/disconnect, missing configuration, secure cookie and forged callback rejection.
- Database preservation/permissions, linked records, account snapshot uniqueness, token metadata and token validity are covered by the isolated expansion database tests.
- No production social API calls or account changes. Live provider consent and supported metrics are explicitly awaiting external authorization.

Additional completed isolated evidence: 21 successful/failing provider transport checks (callback, encrypted persistence, metadata reauthorization, sync and manual snapshot protection); 43 actual styled React/browser checks across six screens at 390, 768 and 1440 pixels, including create/edit/revision/history and empty/error states. No horizontal overflow or browser exceptions. Screenshots saved outside the repository in the temporary content UI artifacts directory.



Saved submissions are persisted before transport under an authenticated-actor/domain-specific local key. Unknown responses lock the exact payload, reason and retry UUID; inputs, Add/Edit and Cancel cannot replace it. Reload restores the pending submission and retries the identical request. Authentication failures retain pending status until access is restored. Device storage failure refuses an unpersisted write and clearly states that the entry was not sent. Actual browser tests simulate a committed sale whose response is lost, reload and retry, and assert one sale and the same UUID.

Additional Facebook/TikTok verification: 59 actual handler checks for roles, signed platform state, exact Page selection, encrypted tokens, reauthorization, follower snapshots, manual protection, API failures, partial authorization failure, near-expiry TikTok refresh, rotated refresh-token persistence, refresh expiry and missing scopes. Synthetic provider and database transports only.
