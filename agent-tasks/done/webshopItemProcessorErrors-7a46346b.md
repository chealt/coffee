---
id: "webshopItemProcessorErrors-7a46346b"
status: "done"
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

- [x] Root cause identified and reproduced (add a short note to this file)
- [x] Minimal fix implemented
- [x] Relevant tests run and passing
- [x] `yarn lint` passes
- [x] This file moved to `agent-tasks/in-review/` with status "in-review" in the fix commit

## Root cause

Coffee Collective (roaster 11) changed their product page markup: the add-to-cart button
(`[name=add]`) now reads `Add to cart 153 DKK` instead of `Buy 153 DKK`. The parser stripped
the literal `Buy` prefix and split on spaces, so `priceText` became `Add` → `NaN` →
`No price found` for every product (17 occurrences). Reproduced locally by fetching
`/products/vista-hermosa-espresso-250g` and running parser 11 against the HTML.

Two related breakages were unmasked once the price parsed again:

- The weight extraction expected `250 G` as the last line of `.product__description` and
  fell back to the variant `<option>` value; single-variant products (no options select,
  e.g. `reshad-espresso-250g`) crashed with `Cannot read properties of null (reading 'value')`.
- The new `advent-calendar-2026` gift-set product has no `Origin` details row and crashed
  the origin lookup with a TypeError.

## Fix

In `packages/webshop-item-processor/src/parsers.js` (parser 11):

- Extract price and currency from the button text with a `([\d.,]+)\s*([A-Za-z]{3})` match
  instead of removing a literal `Buy` prefix; comma decimals are normalized.
- Extract weight via a `\d+\s*g` match on the description text with an optional-chained
  fallback to the variant option value.

In `packages/webshop-processor/src/parsers.js` (parser 11):

- Filter `advent-calendar` out of the product link list, alongside the existing `pack` and
  `blend` filters, so gift sets never reach the item processor.

## Testing

- `ROASTER_ID=11 yarn workspace @centralbeans/webshop-processor test`: 19 product URLs, the
  advent calendar excluded.
- `ROASTER_ID=11 yarn workspace @centralbeans/webshop-item-processor test`: all 19 product
  URLs parse, no `No price found` errors.
- `yarn lint` and `yarn format` pass.
