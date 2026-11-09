---
id: "webshopItemProcessorErrors-5c09a48a"
status: "done"
alarm: "webshopItemProcessorErrors"
signature: "/aws/lambda/webshopItemProcessor | <time> <uuid> ERROR No product data found for <url>"
logGroup: "/aws/lambda/webshopItemProcessor"
firstSeen: "2026-10-31"
lastSeen: "2026-11-02"
occurrences: 24
---# Task webshopItemProcessorErrors-5c09a48a

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

## Root cause

april (roaster 47) moved its webshop off Shopify's Liquid storefront onto a headless
Next.js front end (`april-coffee-roasters-headless.vercel.app`, Shopify Storefront API).

The parser located the product JSON with
`document.querySelector('script[data-section-type="static-product"]')` — a Shopify
Liquid section tag. That element no longer exists on any product page, so every item
hit the `No product data found` branch and threw `Missing details`. The schema.org
`priceCurrency` lookup used for the currency was gone for the same reason; the page
now ships no `application/ld+json` at all.

Product data now lives in the React flight payload, as escaped JSON inside
`self.__next_f.push([1,"..."])` chunks.

## Fix

In `packages/webshop-item-processor/src/parsers.js`:

- Added a `getNextFlightProduct` helper that concatenates the `self.__next_f.push`
  chunks, unescapes them, and brace-matches the `{"product":{…}}` object out of the
  payload.
- Parser 47 now normalises that Storefront API product into the shape the rest of the
  parser already expected (`title`, `description` from `descriptionHtml`,
  `featured_image`, and `variants` with `available`/`title`/`price` in cents).
- Currency is taken from the variant's `price.currencyCode` (DKK), replacing the
  schema.org lookup.
- `image` no longer gets a `https:` prefix — Storefront API image URLs are absolute,
  whereas the old Liquid ones were protocol-relative.

The rest of parser 47 (description field parsing, origin, processing, varieties,
taste notes) is untouched.

## Verification

`ROASTER_ID=47 yarn workspace @centralbeans/webshop-item-processor test`

11 product pages parsed, 10 full results, 0 `No product data found` errors. The three
URLs from the samples all parse. `yarn lint` passes and `yarn format` reports no changes.

One unrelated failure remains: `/product/april-tasting-menu` throws `Missing weight`.
It is a tasting-menu bundle with no gram-weight variant, and it is a different error
signature from the one in this task, so it was left alone.
