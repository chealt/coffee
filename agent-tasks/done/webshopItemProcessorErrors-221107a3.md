---
id: "webshopItemProcessorErrors-221107a3"
status: "done"
alarm: "webshopItemProcessorErrors"
signature: "/aws/lambda/webshopItemProcessor | <time> <uuid> ERROR Invoke Error {<string>:<string>,<string>:<string>,<string>:[<string>,<string>,<string>,<string>,<string>,<string>,<string>,<string>,<string>,<string>,<string>]} | <num> (file://src/parsers.js:<num>:<num>)\",<string>,<string>,<string>,<string>,<string>,<string>,<string>,<string>,<stri"
logGroup: "/aws/lambda/webshopItemProcessor"
firstSeen: "2026-10-26"
lastSeen: "2026-10-26"
occurrences: 32
---
# Task webshopItemProcessorErrors-221107a3

Detected by the weekly error scan on 2026-10-26. Triggering alarm: `webshopItemProcessorErrors`.

- **Occurrences:** 32
- **Log group:** `/aws/lambda/webshopItemProcessor`
- **Signature:** `/aws/lambda/webshopItemProcessor | <time> <uuid> ERROR Invoke Error {<string>:<string>,<string>:<string>,<string>:[<string>,<string>,<string>,<string>,<string>,<string>,<string>,<string>,<string>,<string>,<string>]} | <num> (file://src/parsers.js:<num>:<num>)",<string>,<string>,<string>,<string>,<string>,<string>,<string>,<string>,<stri`

## Sample errors

```
2026-10-26T00:11:48.642Z	63060025-736b-4cae-a628-c50cd869bda2	ERROR	Invoke Error 	{"errorType":"TypeError","errorMessage":"Cannot read properties of null (reading 'textContent')","stack":["TypeError: Cannot read properties of null (reading 'textContent')","    at 7 (file:///var/task/src/parsers.js:445:73)","    at handler (file:///var/task/src/index.js:40:25)","    at file:///var/task/node_modules/@sentry/aws-serverless/build/npm/run-lambda-handler.mjs:365:35","    at file:///var/task/node_modules/@sentry/core/build/esm/tracing/trace.js:73:60","    at file:///var/task/node_modules/@sentry/core/build/esm/tracing/trace.js:388:13","    at handleCallbackErrors (file:///var/task/node_modules/@sentry/core/build/esm/utils/handleCallbackErrors.js:9:26)","    at file:///var/task/node_modules/@sentry/core/build/esm/tracing/trace.js:387:11","    at file:///var/task/node_modules/@sentry/core/build/esm/tracing/trace.js:383:14","    at file:///var/task/node_modules/@sentry/core/build/esm/tracing/trace.js:122:12","    at file:///var/task/node_modules/@sentry/server-utils/build/esm/async-context.js:21:14"]}


---

2026-10-26T00:11:49.040Z	cc679d58-476d-4d15-b2fb-66236ab4b7ca	ERROR	Invoke Error 	{"errorType":"TypeError","errorMessage":"Cannot read properties of null (reading 'textContent')","stack":["TypeError: Cannot read properties of null (reading 'textContent')","    at 7 (file:///var/task/src/parsers.js:445:73)","    at handler (file:///var/task/src/index.js:40:25)","    at file:///var/task/node_modules/@sentry/aws-serverless/build/npm/run-lambda-handler.mjs:365:35","    at file:///var/task/node_modules/@sentry/core/build/esm/tracing/trace.js:73:60","    at file:///var/task/node_modules/@sentry/core/build/esm/tracing/trace.js:388:13","    at handleCallbackErrors (file:///var/task/node_modules/@sentry/core/build/esm/utils/handleCallbackErrors.js:9:26)","    at file:///var/task/node_modules/@sentry/core/build/esm/tracing/trace.js:387:11","    at file:///var/task/node_modules/@sentry/core/build/esm/tracing/trace.js:383:14","    at file:///var/task/node_modules/@sentry/core/build/esm/tracing/trace.js:122:12","    at file:///var/task/node_modules/@sentry/server-utils/build/esm/async-context.js:21:14"]}


---

2026-10-26T00:11:50.091Z	b0a9bf5c-6709-4d48-889e-b5feba363c46	ERROR	Invoke Error 	{"errorType":"TypeError","errorMessage":"Cannot read properties of null (reading 'textContent')","stack":["TypeError: Cannot read properties of null (reading 'textContent')","    at 7 (file:///var/task/src/parsers.js:445:73)","    at handler (file:///var/task/src/index.js:40:25)","    at file:///var/task/node_modules/@sentry/aws-serverless/build/npm/run-lambda-handler.mjs:365:35","    at file:///var/task/node_modules/@sentry/core/build/esm/tracing/trace.js:73:60","    at file:///var/task/node_modules/@sentry/core/build/esm/tracing/trace.js:388:13","    at handleCallbackErrors (file:///var/task/node_modules/@sentry/core/build/esm/utils/handleCallbackErrors.js:9:26)","    at file:///var/task/node_modules/@sentry/core/build/esm/tracing/trace.js:387:11","    at file:///var/task/node_modules/@sentry/core/build/esm/tracing/trace.js:383:14","    at file:///var/task/node_modules/@sentry/core/build/esm/tracing/trace.js:122:12","    at file:///var/task/node_modules/@sentry/server-utils/build/esm/async-context.js:21:14"]}

```

## CloudWatch

Alarm console: https://eu-central-1.console.aws.amazon.com/cloudwatch/home?region=eu-central-1#alarms:v2

## Definition of done

- [x] Root cause identified and reproduced (add a short note to this file)
- [x] Minimal fix implemented
- [x] Relevant tests run and passing
- [x] `yarn lint` passes
- [x] This file moved to `agent-tasks/in-review/` with status "in-review" in the fix commit

## Root cause and fix

**Root cause:** The El Cafetero (roaster 7) product pages no longer render the weight variant
as `<select name="group[8]">` with an `option[selected]`. The theme now renders radio tiles
(`input[name="group[8]"][checked]` with the weight text in `.elc-wp__label` inside the parent
`label.elc-wp__tile`), so `document.querySelector('select[name="group[8]"] option[selected]')`
returned `null` and `.textContent` threw `TypeError: Cannot read properties of null (reading
'textContent')` at `src/parsers.js:445` for every item, crashing the invocation (32 occurrences).

Reproduced by saving the live HTML via `save-html.js` (ROASTER_ID=7): all 9 product pages
return `null` for the old selector.

**Fix (minimal):** In the roaster 7 parser, read the weight from the checked radio tile first
(`input[name="group[8]"]:checked` → closest `label` → `.elc-wp__label`), falling back to the
legacy `select option[selected]` markup, and use optional chaining so a missing element now
yields the intended handled `weightMissing` error instead of a crash (same pattern as the
Miga parser weight fallback).

**Tested:** `ROASTER_ID=7 node test.js` against the live site (all items processed, no errors);
verified against all saved pages in `test-html/7/` (9/9 success with weight parsed) plus a
synthetic legacy-markup check; `yarn lint` and `yarn format:check` pass.
