---
id: "webshopItemProcessorErrors-5c09a48a"
status: "open"
alarm: "webshopItemProcessorErrors"
signature: "/aws/lambda/webshopItemProcessor | <time> <uuid> ERROR No product data found for <url>"
logGroup: "/aws/lambda/webshopItemProcessor"
firstSeen: "2026-10-31"
lastSeen: "2026-10-31"
occurrences: 12
---

# Task webshopItemProcessorErrors-5c09a48a

Detected by the weekly error scan on 2026-10-31. Triggering alarm: `webshopItemProcessorErrors`.

- **Occurrences:** 12
- **Log group:** `/aws/lambda/webshopItemProcessor`
- **Signature:** `/aws/lambda/webshopItemProcessor | <time> <uuid> ERROR No product data found for <url>`

## Sample errors

```
2026-10-31T05:33:52.523Z	e1d21f28-06f0-451c-afda-3eb948032d10	ERROR	No product data found for https://www.aprilcoffeeroasters.com/product/kamavindi-kenya-washed-mixed-varietals-aa-1


---

2026-10-31T05:33:53.236Z	3cfd3f67-c96f-496e-b40d-3cccef3618dc	ERROR	No product data found for https://www.aprilcoffeeroasters.com/product/el-morito-guatemala-washed-pacamara


---

2026-10-31T05:33:53.311Z	8dddb157-6558-4577-bd4a-7635886c9a3a	ERROR	No product data found for https://www.aprilcoffeeroasters.com/product/tadesse-ethiopia-washed-krume-74159

```

## CloudWatch

Alarm console: https://eu-central-1.console.aws.amazon.com/cloudwatch/home?region=eu-central-1#alarms:v2

## Definition of done

- [ ] Root cause identified and reproduced (add a short note to this file)
- [ ] Minimal fix implemented
- [ ] Relevant tests run and passing
- [ ] `yarn lint` passes
- [ ] This file moved to `agent-tasks/in-review/` with status "in-review" in the fix commit
