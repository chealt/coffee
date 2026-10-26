---
id: "webshopItemProcessorErrors-de54d180"
status: "in-review"
alarm: "webshopItemProcessorErrors"
signature: "/aws/lambda/webshopItemProcessor | <time> <uuid> INFO Calling record webshop item details for <url>"
logGroup: "/aws/lambda/webshopItemProcessor"
firstSeen: "2026-10-26"
lastSeen: "2026-10-26"
occurrences: 1
---

# Task webshopItemProcessorErrors-de54d180

Detected by the weekly error scan on 2026-10-26. Triggering alarm: `webshopItemProcessorErrors`.

- **Occurrences:** 1
- **Log group:** `/aws/lambda/webshopItemProcessor`
- **Signature:** `/aws/lambda/webshopItemProcessor | <time> <uuid> INFO Calling record webshop item details for <url>`

## Sample errors

```
2026-10-26T03:42:47.532Z	76da7cb7-7812-40c0-8ccc-5b7f9616b3a3	INFO	Calling record webshop item details for https://manhattancoffeeroasters.com/product/coffees/exceptional/bombe/

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

False positive from the error-scanner, not a production failure. The Manhattan (roaster 305)
webshop categorizes coffees under `/product/coffees/exceptional/<name>/`, and keyword matching in
CloudWatch filter patterns is substring-based, so `?exception` in `ERROR_FILTER_PATTERN` matched
"exceptional" in the product URL of this benign `INFO` line — the very last log before a successful
`callRecordWebshopItemDetails`, with no `ERROR` entry in the cluster. The word-boundary `\b` guard
that previously prevented this (commit 0c06f5a2, task 0007) was lost when the Logs Insights query
was replaced with SDK `filter-log-events` in 34d7f603. Tasks 4366afc2 and 7f29cbc7 are the same
false positive from the same `bombe` invocation (76da7cb7) and can be closed alongside this one.

Reproduced by applying the filter's keywords to the sample line: only `exception` (inside
"exceptional") matches, nothing else — no real error content.

## Fix

`packages/error-scanner/src/lib/aws.js`: re-check every event returned by `filter-log-events`
with `\b(?:errors?|exceptions?|fail(?:ed|ing|ures?|s)?)\b|\bunhandled|timed out` (case-insensitive,
no trailing boundary on `unhandled` so `UnhandledPromiseRejection` still matches), mirroring the
previous `\b` pattern, and drop non-matching events before clustering. Verified the sample INFO
line no longer matches while real error shapes still do (`\tERROR\t` level lines, `Invoke Error`
payloads with `TypeError`, `Task timed out after ...`, `UnhandledPromiseRejection`). No test
harness exists in the error-scanner workspace, so checks were `yarn lint` and `yarn format`
(root + workspace, both clean) plus an inline node check of the pattern against the sample and
real error lines.
