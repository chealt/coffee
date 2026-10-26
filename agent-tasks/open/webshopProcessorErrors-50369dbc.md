---
id: "webshopProcessorErrors-50369dbc"
status: "open"
alarm: "webshopProcessorErrors"
signature: "/aws/lambda/webshopProcessor | <time> <uuid> ERROR Invoke Error {<string>:<string>,<string>:<string>,<string>:[<string>,<string>,<string>,<string>,<string>,<string>,<string>,<string>,<string>,<string>,<string>]} | <num> (file://src/parsers.js:<num>:<num>)\",<string>,<string>,<string>,<string>,<string>,<string>,<string>,<string>,<stri"
logGroup: "/aws/lambda/webshopProcessor"
firstSeen: "2026-10-26"
lastSeen: "2026-10-26"
occurrences: 1
---

# Task webshopProcessorErrors-50369dbc

Detected by the weekly error scan on 2026-10-26. Triggering alarm: `webshopProcessorErrors`.

- **Occurrences:** 1
- **Log group:** `/aws/lambda/webshopProcessor`
- **Signature:** `/aws/lambda/webshopProcessor | <time> <uuid> ERROR Invoke Error {<string>:<string>,<string>:<string>,<string>:[<string>,<string>,<string>,<string>,<string>,<string>,<string>,<string>,<string>,<string>,<string>]} | <num> (file://src/parsers.js:<num>:<num>)",<string>,<string>,<string>,<string>,<string>,<string>,<string>,<string>,<stri`

## Sample errors

```
2026-10-26T03:03:26.947Z	5bd138fd-76e6-43e8-ad6a-9de9dab3f68d	ERROR	Invoke Error 	{"errorType":"TypeError","errorMessage":"Cannot read properties of null (reading 'href')","stack":["TypeError: Cannot read properties of null (reading 'href')","    at 47 (file:///var/task/src/parsers.js:183:55)","    at handler (file:///var/task/src/index.js:38:30)","    at file:///var/task/node_modules/@sentry/aws-serverless/build/npm/run-lambda-handler.mjs:365:35","    at file:///var/task/node_modules/@sentry/core/build/esm/tracing/trace.js:73:60","    at file:///var/task/node_modules/@sentry/core/build/esm/tracing/trace.js:388:13","    at handleCallbackErrors (file:///var/task/node_modules/@sentry/core/build/esm/utils/handleCallbackErrors.js:9:26)","    at file:///var/task/node_modules/@sentry/core/build/esm/tracing/trace.js:387:11","    at file:///var/task/node_modules/@sentry/core/build/esm/tracing/trace.js:383:14","    at file:///var/task/node_modules/@sentry/core/build/esm/tracing/trace.js:122:12","    at file:///var/task/node_modules/@sentry/server-utils/build/esm/async-context.js:21:14"]}

```

## CloudWatch

Alarm console: https://eu-central-1.console.aws.amazon.com/cloudwatch/home?region=eu-central-1#alarms:v2

## Definition of done

- [ ] Root cause identified and reproduced (add a short note to this file)
- [ ] Minimal fix implemented
- [ ] Relevant tests run and passing
- [ ] `yarn lint` passes
- [ ] This file moved to `agent-tasks/in-review/` with status "in-review" in the fix commit
