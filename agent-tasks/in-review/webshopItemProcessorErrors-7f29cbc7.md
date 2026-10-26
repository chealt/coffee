---
id: "webshopItemProcessorErrors-7f29cbc7"
status: "in-review"
alarm: "webshopItemProcessorErrors"
signature: "/aws/lambda/webshopItemProcessor | <time> <uuid> INFO Parsing item page: <url>"
logGroup: "/aws/lambda/webshopItemProcessor"
firstSeen: "2026-10-26"
lastSeen: "2026-10-26"
occurrences: 1
---

# Task webshopItemProcessorErrors-7f29cbc7

Detected by the weekly error scan on 2026-10-26. Triggering alarm: `webshopItemProcessorErrors`.

- **Occurrences:** 1
- **Log group:** `/aws/lambda/webshopItemProcessor`
- **Signature:** `/aws/lambda/webshopItemProcessor | <time> <uuid> INFO Parsing item page: <url>`

## Sample errors

```
2026-10-26T03:42:46.994Z	76da7cb7-7812-40c0-8ccc-5b7f9616b3a3	INFO	Parsing item page: https://manhattancoffeeroasters.com/product/coffees/exceptional/bombe/

```

## CloudWatch

Alarm console: https://eu-central-1.console.aws.amazon.com/cloudwatch/home?region=eu-central-1#alarms:v2

## Definition of done

- [x] Root cause identified and reproduced (add a short note to this file)
- [x] Minimal fix implemented
- [x] Relevant tests run and passing
- [x] `yarn lint` passes
- [x] This file moved to `agent-tasks/in-review/` with status "in-review" in the fix commit

## Root cause

Error-scanner false positive, not a production failure — same class as task
`webshopItemProcessorErrors-4366afc2` (same Manhattan invocation `76da7cb7`). The Manhattan
(roaster 305) webshop categorizes coffees under `/product/coffees/exceptional/<name>/`, and the
CloudWatch `FilterLogEvents` pattern in `packages/error-scanner/src/lib/aws.js` uses `?`-prefixed
(substring) terms, so `?exception` matched "exceptional" inside the URL of the parser's plain INFO
line "Parsing item page: ...". The lambda itself was healthy: reproduced with
`ROASTER_ID=305 yarn workspace @centralbeans/webshop-item-processor test` against the live shop —
the bombe item parses fully (price 18.5 EUR / 300 g, country, region, processing method, taste notes,
image) with no error for this URL; the only failure in the run is the advent-calendar bundle, which is
owned by task `webshopItemProcessorErrors-3a559474` (already fixed on its branch).

## Fix

Replicated the word-boundary re-check from PR #97 / task `webshopItemProcessorErrors-4366afc2`
byte-identically (not yet in `main`): `queryLogErrors` now filters every fetched entry through
`isErrorMessage` (`/(errors?\b|exceptions?\b|fail(?:ed|ing|ures?|s)?\b|unhandled|timed out)/i`), so
"exceptional" no longer matches `?exception` while real error lines still pass. Added a test pinning
this task's exact sample line and ran `yarn workspace @centralbeans/error-scanner test` (5 passing),
`yarn lint`, and `yarn format:check` — all green. Whichever of the identical PRs merges first makes the
others redundant; merges are conflict-free.
