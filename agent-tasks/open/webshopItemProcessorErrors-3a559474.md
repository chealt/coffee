---
id: "webshopItemProcessorErrors-3a559474"
status: "open"
alarm: "webshopItemProcessorErrors"
signature: "/aws/lambda/webshopItemProcessor | <time> <uuid> ERROR No variation data found for <url>"
logGroup: "/aws/lambda/webshopItemProcessor"
firstSeen: "2026-10-26"
lastSeen: "2026-10-26"
occurrences: 2
---

# Task webshopItemProcessorErrors-3a559474

Detected by the weekly error scan on 2026-10-26. Triggering alarm: `webshopItemProcessorErrors`.

- **Occurrences:** 2
- **Log group:** `/aws/lambda/webshopItemProcessor`
- **Signature:** `/aws/lambda/webshopItemProcessor | <time> <uuid> ERROR No variation data found for <url>`

## Sample errors

```
2026-10-26T02:51:44.630Z	225a146f-888c-4a1a-b42e-922b8bc616ff	ERROR	No variation data found for https://amatterofconcrete.com/product/a-m-o-c-x-%e9%99%86%e5%ae%b6%e5%98%b4%e4%b8%8a%e6%b5%b7-set/


---

2026-10-26T03:42:46.145Z	b878f730-6f54-4e6b-9449-874966e16029	ERROR	No variation data found for https://manhattancoffeeroasters.com/product/bundles/the-roses-coffee-advent-calendar/

```

## CloudWatch

Alarm console: https://eu-central-1.console.aws.amazon.com/cloudwatch/home?region=eu-central-1#alarms:v2

## Definition of done

- [ ] Root cause identified and reproduced (add a short note to this file)
- [ ] Minimal fix implemented
- [ ] Relevant tests run and passing
- [ ] `yarn lint` passes
- [ ] This file moved to `agent-tasks/in-review/` with status "in-review" in the fix commit
