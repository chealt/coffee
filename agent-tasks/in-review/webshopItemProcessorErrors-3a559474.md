---
id: "webshopItemProcessorErrors-3a559474"
status: "in-review"
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

## Root cause and fix

**Root cause (reproduced):** Both failing products are gift-set/bundle items sold as WooCommerce *simple* products with no `.variations_form` / `product_variations` data:

- A.M.O.C. (roaster 94): “A.M.O.C. × 陆家嘴上海 set” — a collab set, `product-type-simple`.
- Manhattan (roaster 305): “The Roses Coffee Advent Calendar” — a bundle, no variations form.

Both parsers assumed every product is a variable product and threw `detailsMissing` ("No variation data found") when the variations form was absent.

**Fix:** Skip gift sets via the product title, returning `{ isGiftSet: true }` (the handler already skips these gracefully), following the Prolog advent-calendar precedent (ee9f070e):

- Parser 94: when no variation data exists and the title contains the word "set", skip as gift set. Variable products named "…set" (e.g. `/054 Brazil Exceptional set`) still parse as before.
- Parser 305: skip products whose title contains "advent calendar".

**Tested:** `ROASTER_ID=94` and `ROASTER_ID=305 yarn workspace @centralbeans/webshop-item-processor test` — both erroring URLs now skip as gift sets, all other items parse unchanged, no failures. `yarn lint` and `yarn format` pass.

## Definition of done

- [x] Root cause identified and reproduced (add a short note to this file)
- [x] Minimal fix implemented
- [x] Relevant tests run and passing
- [x] `yarn lint` passes
- [x] This file moved to `agent-tasks/in-review/` with status "in-review" in the fix commit
