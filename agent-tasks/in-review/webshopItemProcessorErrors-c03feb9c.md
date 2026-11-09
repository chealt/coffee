---
id: "webshopItemProcessorErrors-c03feb9c"
status: "in-review"
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

- [x] Root cause identified and reproduced (add a short note to this file)
- [x] Minimal fix implemented
- [x] Relevant tests run and passing
- [x] `yarn lint` passes
- [x] This file moved to `agent-tasks/in-review/` with status "in-review" in the fix commit

## Root cause

`https://www.aprilcoffeeroasters.com/product/april-tasting-menu` is an in-café tasting
experience, not a bag of coffee. Its single available variant is titled `Default Title`
(1099.00 DKK), so `parseVariantWeight` in parser `47`
(`packages/webshop-item-processor/src/parsers.js`) returned `undefined` and the parser threw
`errors.weightMissing`, logging `No weight found for <url>` on every run.

Reproduced by fetching the live page and running `ROASTER_ID=47 yarn workspace
@centralbeans/webshop-item-processor test`, which logged the error for this URL.

## Fix

Parser `47` now filters the available variants down to those with a parseable weight. When
none has one the item is not a coffee bag, so it returns `{ isGiftSet: true }` and
`index.js` skips it with a success response instead of erroring.

After the fix the same test run logs `Skipping item without a weighted variant` /
`Skipping gift set` for that URL and reports no errors; all other april products still parse
with weight and price.
