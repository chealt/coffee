---
id: "webshopItemProcessorErrors-de54d180"
status: "open"
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

- [ ] Root cause identified and reproduced (add a short note to this file)
- [ ] Minimal fix implemented
- [ ] Relevant tests run and passing
- [ ] `yarn lint` passes
- [ ] This file moved to `agent-tasks/in-review/` with status "in-review" in the fix commit
