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

**Fix:** Filter the gift sets out in the webshop parser (`packages/webshop-processor/src/parsers.js`), so these
URLs never reach the item processor (review feedback on #98 — the item parser should not have to recognise them):

- Parser 94: select only `.product-type-variable` loop products. The collab set is the only
  `product-type-simple` entry in the listing; every coffee (including the variable `/054-set/`) is a variable
  product, so it keeps being picked up.
- Parser 305: skip `/bundles/` URLs. All coffees live under `/product/coffees/`.

**Tested:** `ROASTER_ID=94` and `ROASTER_ID=305` for both `@centralbeans/webshop-processor` and
`@centralbeans/webshop-item-processor` — both erroring URLs are no longer listed, all other items parse
unchanged, no errors. `yarn lint` and `yarn format` pass.

## Definition of done

- [x] Root cause identified and reproduced (add a short note to this file)
- [x] Minimal fix implemented
- [x] Relevant tests run and passing
- [x] `yarn lint` passes
- [x] This file moved to `agent-tasks/in-review/` with status "in-review" in the fix commit
