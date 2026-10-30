# Pulse reporting and delivery preparation

Local implementation only. No production records, accounts, deployments or sender settings changed.

The CEO control snapshot uses one stable database read for complete scoped financial sources, receipt allocations, purchase lines, physical-count decisions and current operational decisions. Historical finance filters do not hide current alerts. Assigned-customer debt is customer debt, not a manager's inherited liability. Original exact source JSON remains in Excel exports; the existing two-account historical export eligibility is unchanged.

Summary delivery is opt-in. With no saved configuration, no message is sent. Bimbo supplies a real recipient, timezone, delivery time and reason. The server verifies the configured sender before enabling and before sending. Configuration versions and delivery outcomes remain recorded. Pending deliveries hold their original summary on retries; changing the timezone does not produce a second report for the same farm day, recipient and channel. Provider acceptance is displayed separately from confirmed delivery. An uncertain request is held for provider review instead of automatically sending again.

## Private environment setup after release approval

- Email uses the existing Resend dependency: `RESEND_API_KEY`, `FARM_SUMMARY_FROM` (plain sender address), and `FARM_SUMMARY_RESEND_DOMAIN_ID` (verified domain matching that address).
- WhatsApp uses `FARM_WHATSAPP_TOKEN`, `FARM_WHATSAPP_PHONE_ID`, `FARM_WHATSAPP_TEMPLATE_ID` and `FARM_WHATSAPP_API_VERSION`. Supply a genuine approved text-only template containing one body parameter. No example token, phone number, contact or version is installed by this change.
- An authenticated scheduler calls `/api/cron/farm-summary` with `Authorization: Bearer <FARM_SUMMARY_CRON_SECRET>`. Configure a suitable interval, such as five minutes, only after Bimbo approves delivery and the hosting plan supports it. The existing marketing cron is untouched. Delivery occurs on the first scheduler tick after the selected local time. No scheduler has been activated during implementation.
- The prior completed Africa/Lagos farm day is reported. Owner delivery timezone follows IANA daylight-saving rules. The unique delivery identity remains the farm date rather than the timezone or configuration version.

The email provider receives a stable idempotency key. Definite rejections can retry after 15 minutes, at most five attempts within 23 hours. Interrupted/uncertain delivery is not retried automatically. WhatsApp sends a compact summary with the same figures; it does not truncate a full financial report to fit a template. Copy, Excel and browser PDF remain available without a sender connection. Complete Excel downloads above 4 MiB fail explicitly rather than returning partial records.

Provider payload reference: [Meta template messages](https://whatsapp.github.io/WhatsApp-Nodejs-SDK/api-reference/messages/template/). Resend contracts were checked against the installed SDK's declarations. Tests use isolated provider doubles; actual delivery requires the real sender setup and is not claimed as verified.

## Checks

`test-farm-control`, `test-farm-control-api`, and `test-farm-control-ui` cover scoped snapshots, authorization, validated preferences, actual four-width UI, retained delivery retries, once-per-day across timezone changes, expired exchange rates and provider uncertainty. Full-branch regression and final restore comparisons remain the release gate.
