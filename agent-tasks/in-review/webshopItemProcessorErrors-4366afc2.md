---
id: "webshopItemProcessorErrors-4366afc2"
status: "in-review"
alarm: "webshopItemProcessorErrors"
signature: "/aws/lambda/webshopItemProcessor | <time> <uuid> INFO Processing <url>"
logGroup: "/aws/lambda/webshopItemProcessor"
firstSeen: "2026-10-26"
lastSeen: "2026-10-26"
occurrences: 1
---

# Task webshopItemProcessorErrors-4366afc2

Detected by the weekly error scan on 2026-10-26. Triggering alarm: `webshopItemProcessorErrors`.

- **Occurrences:** 1
- **Log group:** `/aws/lambda/webshopItemProcessor`
- **Signature:** `/aws/lambda/webshopItemProcessor | <time> <uuid> INFO Processing <url>`

## Sample errors

```
2026-10-26T03:42:46.994Z	76da7cb7-7812-40c0-8ccc-5b7f9616b3a3	INFO	Processing https://manhattancoffeeroasters.com/product/coffees/exceptional/bombe/

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

Error-scanner false positive, not a production failure. The Manhattan (roaster 305) webshop categorizes
coffees under `/product/coffees/exceptional/<name>/`, and the CloudWatch `FilterLogEvents` pattern in
`packages/error-scanner/src/lib/aws.js` uses `?`-prefixed (substring) terms, so `?exception` matched
"exceptional" inside the URL of this plain INFO line. The lambda itself was healthy: invocation
`76da7cb7` logged the INFO lines "Processing ...", "Parsing item page: ...", and "Calling record webshop
item details for ..." for the same bombe URL (the latter only appears after a fully successful parse),
and running `ROASTER_ID=305 yarn workspace @centralbeans/webshop-item-processor test` against the live
shop parses the bombe item successfully (all details extracted, 13 items processed, no error for this
URL). The same false-positive class was previously fixed for Logs Insights in #77/#81, but commit
34d7f603 (switch to SDK `filter-log-events`) reintroduced it via substring terms. Open tasks
`webshopItemProcessorErrors-7f29cbc7` and `-de54d180` are the same invocation's other INFO lines.

## Fix

`packages/error-scanner/src/lib/aws.js`: re-check every fetched log entry with a word-boundary regex
(`isErrorMessage`: `/(errors?\b|exceptions?\b|fail(?:ed|ing|ures?|s)?\b|unhandled|timed out)/i`) before
clustering, so "exceptional" no longer matches "exception" while real error lines (the `\tERROR\t`
level tag, `TypeError`, "failed", "timed out") still match. This is byte-identical to the fix already
open in PR `task/flagRemovedErrors-96634270` (same root-cause class, different log group), replicated
here so either PR can merge first without conflicts; whichever merges second is redundant. Added a
test pinning this task's exact sample lines and ran `yarn workspace @centralbeans/error-scanner test`
(4 passing), `yarn lint`, and `yarn format:check` — all green.
