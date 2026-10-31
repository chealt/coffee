---
id: "webshopItemProcessorErrors-e7d1ebc1"
status: "in-review"
alarm: "webshopItemProcessorErrors"
signature: "/aws/lambda/webshopItemProcessor | <time> <uuid> ERROR No variations found for <url>"
logGroup: "/aws/lambda/webshopItemProcessor"
firstSeen: "2026-10-26"
lastSeen: "2026-10-26"
occurrences: 1
---

# Task webshopItemProcessorErrors-e7d1ebc1

Detected by the weekly error scan on 2026-10-26. Triggering alarm: `webshopItemProcessorErrors`.

- **Occurrences:** 1
- **Log group:** `/aws/lambda/webshopItemProcessor`
- **Signature:** `/aws/lambda/webshopItemProcessor | <time> <uuid> ERROR No variations found for <url>`

## Sample errors

```
2026-10-26T04:22:56.089Z	e8b9ef87-a771-450b-985d-be82d40298c4	ERROR	No variations found for https://nolensvolens.shop/product/smoke-bros-x-nolens-volens/

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

The product `https://nolensvolens.shop/product/smoke-bros-x-nolens-volens/` (roaster 258, Nolens Volens) is
password protected in WordPress (`post-password-required`, the item page renders a `post-password-form`). The
Nolens Volens item parser expects a WooCommerce `.variations_form`, which is absent on a password-protected
page, so it logged `No variations found` and threw `detailsMissing`. Reproduced against the live page, which
returns HTTP 200 with the title `Zabezpieczone: SMOKE BROS x NOLENS VOLENS`, one `post-password-form` and no
`variations_form`.

## Fix

- `packages/webshop-processor/src/parsers.js` (roaster 258): the listing parser now excludes products with
  the `post-password-required` class, so the item processor is never invoked for them.
- `packages/webshop-item-processor/src/parsers.js` (roaster 258): if the item page contains a
  `.post-password-form`, the parser logs an info message and returns `{ isOutOfStock: true }` instead of
  throwing.

The `ROASTER_ID=258` workspace test scripts could not be run here: both require
`packages/coffee-admin/.env`, which is not present in this environment. Verification was done by invoking
each roaster 258 parser directly against the live pages:

- Listing parser: 6 links before the fix (including `smoke-bros-x-nolens-volens`), 5 after, with
  `smoke-bros` excluded.
- Item parser: returns `{ isOutOfStock: true }` and logs `Skipping password protected item` instead of
  throwing `detailsMissing`.

`yarn lint` and `yarn format` both pass with no changes.
