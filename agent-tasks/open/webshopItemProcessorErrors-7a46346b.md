---
id: "webshopItemProcessorErrors-7a46346b"
status: "open"
alarm: "webshopItemProcessorErrors"
signature: "/aws/lambda/webshopItemProcessor | <time> <uuid> ERROR No price found for <url>"
logGroup: "/aws/lambda/webshopItemProcessor"
firstSeen: "2026-10-26"
lastSeen: "2026-10-26"
occurrences: 17
---

# Task webshopItemProcessorErrors-7a46346b

Detected by the weekly error scan on 2026-10-26. Triggering alarm: `webshopItemProcessorErrors`.

- **Occurrences:** 17
- **Log group:** `/aws/lambda/webshopItemProcessor`
- **Signature:** `/aws/lambda/webshopItemProcessor | <time> <uuid> ERROR No price found for <url>`

## Sample errors

```
2026-10-26T03:30:51.517Z	f88cb939-e44d-42e8-96bf-3f02dfdcdb91	ERROR	No price found for https://coffeecollective.dk/products/vista-hermosa-espresso-250g


---

2026-10-26T03:30:51.759Z	4debfbe1-5a2e-4177-bc84-48f538c7a0a8	ERROR	No price found for https://coffeecollective.dk/products/kieni-espresso-250g


---

2026-10-26T03:30:51.830Z	dc7e96ed-8a02-445f-abf8-97b78b1c1252	ERROR	No price found for https://coffeecollective.dk/products/reshad-espresso-250g

```

## CloudWatch

Alarm console: https://eu-central-1.console.aws.amazon.com/cloudwatch/home?region=eu-central-1#alarms:v2

## Definition of done

- [ ] Root cause identified and reproduced (add a short note to this file)
- [ ] Minimal fix implemented
- [ ] Relevant tests run and passing
- [ ] `yarn lint` passes
- [ ] This file moved to `agent-tasks/in-review/` with status "in-review" in the fix commit
