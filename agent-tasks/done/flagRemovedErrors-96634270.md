---
id: "flagRemovedErrors-96634270"
status: "done"
alarm: "flagRemovedErrors"
signature: "/aws/lambda/flagRemoved | <time> <uuid> INFO Checking coffee: <url>"
logGroup: "/aws/lambda/flagRemoved"
firstSeen: "2026-10-26"
lastSeen: "2026-10-26"
occurrences: 3
---
# Task flagRemovedErrors-96634270

Detected by the weekly error scan on 2026-10-26. Triggering alarm: `flagRemovedErrors`.

- **Occurrences:** 3
- **Log group:** `/aws/lambda/flagRemoved`
- **Signature:** `/aws/lambda/flagRemoved | <time> <uuid> INFO Checking coffee: <url>`

## Sample errors

```
2026-10-21T21:00:25.769Z	a4b05c54-9319-4db2-97b6-9462ca17700c	INFO	Checking coffee: https://manhattancoffeeroasters.com/product/coffees/exceptional/bombe/


---

2026-10-21T21:00:26.295Z	c14ef812-ac25-41e6-a393-5b5df8bbe2a3	INFO	Checking coffee: https://manhattancoffeeroasters.com/product/coffees/exceptional/el-paseo/


---

2026-10-21T21:01:25.924Z	3c5a38df-98d3-4bde-a8cf-2a7993b69a78	INFO	Checking coffee: https://manhattancoffeeroasters.com/product/coffees/exceptional/sweet-valley/

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

False positive from the error-scanner, not a production failure of `flagRemoved`. The three samples are
the ordinary INFO lines the lambda logs for every coffee it checks — Manhattan (roaster 305) files its
coffees under `/product/coffees/exceptional/<name>/`, and CloudWatch simple-term filter patterns match
substrings, so "exceptional" in those URLs matches the `?exception` term of `ERROR_FILTER_PATTERN` in
`packages/error-scanner/src/lib/aws.js`. `queryLogErrors` therefore returned these INFO lines during the
alarm breach window and they were clustered into this task. This is a regression of task 0007 / PR #81,
which added word boundaries to the old Logs Insights regex; 34d7f603 ("fetch breach window logs with sdk
filter-log-events") replaced that regex query with `FilterLogEventsCommand` term matching, which cannot
express word boundaries. The lambda itself is healthy: all three URLs are live product pages of active
coffees in `coffees.json` (ids 7615, 7617, 15841, all currently returning HTTP 200), and every
sample line is level INFO.

Reproduced locally by applying the term list of `ERROR_FILTER_PATTERN` to the sample messages: all three
match via `exception` (and nothing else). Whatever invocation actually tripped the `flagRemovedErrors`
alarm left no keyword-matching log line in the queried window — with the fix such breaches produce no
task instead of a misleading INFO-line task.

## Fix

`packages/error-scanner/src/lib/aws.js`: keep the broad server-side term pattern for recall, then
re-check each fetched event message locally with the word-boundary regex
`(errors?\b|exceptions?\b|fail(?:ed|ing|ures?|s)?\b|unhandled|timed out)/i` — the same boundaries PR #81
used for Logs Insights. "exceptional" no longer satisfies `exceptions?\b`, while the `\tERROR\t` level
tag, `TypeError`/`FetchError` stack lines, "failed"/"failures", "timed out" and unhandled rejections
still match. Added `packages/error-scanner/test.js` (`yarn workspace @centralbeans/error-scanner test`)
covering the three sample INFO lines (rejected) and real error lines (accepted); `yarn lint` and
`yarn format` pass.
