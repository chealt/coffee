---
id: "webshopItemProcessorErrors-59182de9"
status: "in-review"
alarm: "webshopItemProcessorErrors"
signature: "/aws/lambda/webshopItemProcessor | <time> <uuid> ERROR Could not parse CSS stylesheet"
logGroup: "/aws/lambda/webshopItemProcessor"
firstSeen: "2026-11-16"
lastSeen: "2026-11-16"
occurrences: 19
---

# Task webshopItemProcessorErrors-59182de9

Detected by the weekly error scan on 2026-11-16. Triggering alarm: `webshopItemProcessorErrors`.

- **Occurrences:** 19
- **Log group:** `/aws/lambda/webshopItemProcessor`
- **Signature:** `/aws/lambda/webshopItemProcessor | <time> <uuid> ERROR Could not parse CSS stylesheet`

## Sample errors

```
2026-11-16T06:31:20.301Z	e66e7499-4136-49ca-b0ac-2713a0f3a3a3	ERROR	Could not parse CSS stylesheet


---

2026-11-16T06:31:20.323Z	e66e7499-4136-49ca-b0ac-2713a0f3a3a3	ERROR	Could not parse CSS stylesheet


---

2026-11-16T06:31:20.393Z	baa4a732-a02e-4100-ada2-be826c661c38	ERROR	Could not parse CSS stylesheet

```

## CloudWatch

Alarm console: https://eu-central-1.console.aws.amazon.com/cloudwatch/home?region=eu-central-1#alarms:v2

## Definition of done

- [ ] Root cause identified and reproduced (add a short note to this file)
- [ ] Minimal fix implemented
- [ ] Relevant tests run and passing
- [ ] `yarn lint` passes
- [ ] This file moved to `agent-tasks/in-review/` with status "in-review" in the fix commit

## Root cause

`getDocument` and `getWindow` in `packages/webshop-item-processor/src/parsers.js` created
`JSDOM` instances without a virtual console, so jsdom's default console forwarded every
`jsdomError` to `console.error`. Product pages ship modern CSS (nesting, `@layer`,
`@container`) that jsdom's CSS parser rejects, producing one
`ERROR Could not parse CSS stylesheet` line per stylesheet per parsed page. These are
harmless for parsing but counted towards the `webshopItemProcessorErrors` alarm.

## Fix

Added a shared `createVirtualConsole()` that drops `Could not parse CSS stylesheet`
jsdomErrors and forwards anything else to the logger, and used it for `getDocument`,
`getWindow` and the Onyx (318) parser, which already had a local workaround for the
same noise.

Verified with `ROASTER_ID=297 yarn workspace @centralbeans/webshop-item-processor test`:
items still parse and the output contains no CSS parse errors.
