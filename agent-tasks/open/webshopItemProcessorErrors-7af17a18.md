---
id: "webshopItemProcessorErrors-7af17a18"
status: "open"
alarm: "webshopItemProcessorErrors"
signature: "/aws/lambda/webshopItemProcessor | <time> <uuid> ERROR Invoke Error {<string>:<string>,<string>:<string>,<string>:[<string>,<string>,<string>,<string>,<string>,<string>,<string>,<string>,<string>]} | <num> (file://src/parsers.js:<num>:<num>)\",<string>,<string>,<string>,<string>,<string>,<string>,<string>]}"
logGroup: "/aws/lambda/webshopItemProcessor"
firstSeen: "2026-11-09"
lastSeen: "2026-11-09"
occurrences: 1
---

# Task webshopItemProcessorErrors-7af17a18

Detected by the weekly error scan on 2026-11-09. Triggering alarm: `webshopItemProcessorErrors`.

- **Occurrences:** 1
- **Log group:** `/aws/lambda/webshopItemProcessor`
- **Signature:** `/aws/lambda/webshopItemProcessor | <time> <uuid> ERROR Invoke Error {<string>:<string>,<string>:<string>,<string>:[<string>,<string>,<string>,<string>,<string>,<string>,<string>,<string>,<string>]} | <num> (file://src/parsers.js:<num>:<num>)",<string>,<string>,<string>,<string>,<string>,<string>,<string>]}`

> Open PR check: PR #108 does not fix this: The PR only builds the event-driven failure-reporting infrastructure (SQS queue, trigger-github-action grouping/dispatch, errorFix workflow input) and never touches packages/webshop-item-processor/src/parsers.js, so the actual "Missing origin country" bug in parser 82 is untouched..

## Sample errors

```
2026-11-09T01:01:07.914Z	4313b4aa-a754-4aa3-ae46-17659b31f8b1	ERROR	Invoke Error 	{"errorType":"Error","errorMessage":"Missing origin country","stack":["Error: Missing origin country","    at 82 (file:///var/task/src/parsers.js:2255:13)","    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)","    at async handler (file:///var/task/src/index.js:40:19)","    at async processResult (file:///var/task/node_modules/@sentry/aws-serverless/build/npm/run-lambda-handler.mjs:250:14)","    at async BufferedInvokeProcessor.processInvoke (file:///var/runtime/index.mjs:1150:22)","    at async _Runtime.processSingleConcurrent (file:///var/runtime/index.mjs:1237:7)","    at async _Runtime.start (file:///var/runtime/index.mjs:1224:7)","    at async ignition (file:///var/runtime/index.mjs:1725:5)"]}

```

## CloudWatch

Alarm console: https://eu-central-1.console.aws.amazon.com/cloudwatch/home?region=eu-central-1#alarms:v2

## Definition of done

- [ ] Root cause identified and reproduced (add a short note to this file)
- [ ] Minimal fix implemented
- [ ] Relevant tests run and passing
- [ ] `yarn lint` passes
- [ ] This file moved to `agent-tasks/in-review/` with status "in-review" in the fix commit
