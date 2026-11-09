---
id: "webshopItemProcessorErrors-c03feb9c"
status: "open"
alarm: "webshopItemProcessorErrors"
signature: "/aws/lambda/webshopItemProcessor | <time> <uuid> ERROR No weight found for <url>"
logGroup: "/aws/lambda/webshopItemProcessor"
firstSeen: "2026-11-09"
lastSeen: "2026-11-09"
occurrences: 2
---

# Task webshopItemProcessorErrors-c03feb9c

Detected by the weekly error scan on 2026-11-09. Triggering alarm: `webshopItemProcessorErrors`.

- **Occurrences:** 2
- **Log group:** `/aws/lambda/webshopItemProcessor`
- **Signature:** `/aws/lambda/webshopItemProcessor | <time> <uuid> ERROR No weight found for <url>`

## Sample errors

```
2026-11-02T17:57:05.845Z	eeac9c25-4273-4e99-bfc2-401f95de7bcd	ERROR	No weight found for https://www.aprilcoffeeroasters.com/product/april-tasting-menu


---

2026-11-09T03:03:35.982Z	cc3564ee-171e-4c94-895d-59a72f5471a5	ERROR	No weight found for https://www.aprilcoffeeroasters.com/product/april-tasting-menu

```

## CloudWatch

Alarm console: https://eu-central-1.console.aws.amazon.com/cloudwatch/home?region=eu-central-1#alarms:v2

## Definition of done

- [ ] Root cause identified and reproduced (add a short note to this file)
- [ ] Minimal fix implemented
- [ ] Relevant tests run and passing
- [ ] `yarn lint` passes
- [ ] This file moved to `agent-tasks/in-review/` with status "in-review" in the fix commit
