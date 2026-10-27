---
id: "webshopItemProcessorErrors-7f29cbc7"
status: "done"
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

- [ ] Root cause identified and reproduced (add a short note to this file)
- [ ] Minimal fix implemented
- [ ] Relevant tests run and passing
- [ ] `yarn lint` passes
- [ ] This file moved to `agent-tasks/in-review/` with status "in-review" in the fix commit

> Closed by the error-scan review: the fix for this signature is already on main (#97). The duplicate PR was closed without merging.
