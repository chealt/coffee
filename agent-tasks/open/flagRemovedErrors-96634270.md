---
id: "flagRemovedErrors-96634270"
status: "open"
alarm: "flagRemovedErrors"
signature: "/aws/lambda/flagRemoved | <time> <uuid> INFO Checking coffee: <url>"
logGroup: "/aws/lambda/flagRemoved"
firstSeen: "2026-10-26"
lastSeen: "2026-10-26"
occurrences: 3
---

# Task flagRemovedErrors-96634270

Detected by the weekly error scan on 2026-10-26. Triggering alarm: `flagRemovedErrors`.

- **Occurrences:** 3
- **Log group:** `/aws/lambda/flagRemoved`
- **Signature:** `/aws/lambda/flagRemoved | <time> <uuid> INFO Checking coffee: <url>`

## Sample errors

```
2026-10-21T21:00:25.769Z	a4b05c54-9319-4db2-97b6-9462ca17700c	INFO	Checking coffee: https://manhattancoffeeroasters.com/product/coffees/exceptional/bombe/


---

2026-10-21T21:00:26.295Z	c14ef812-ac25-41e6-a393-5b5df8bbe2a3	INFO	Checking coffee: https://manhattancoffeeroasters.com/product/coffees/exceptional/el-paseo/


---

2026-10-21T21:01:25.924Z	3c5a38df-98d3-4bde-a8cf-2a7993b69a78	INFO	Checking coffee: https://manhattancoffeeroasters.com/product/coffees/exceptional/sweet-valley/

```

## CloudWatch

Alarm console: https://eu-central-1.console.aws.amazon.com/cloudwatch/home?region=eu-central-1#alarms:v2

## Definition of done

- [ ] Root cause identified and reproduced (add a short note to this file)
- [ ] Minimal fix implemented
- [ ] Relevant tests run and passing
- [ ] `yarn lint` passes
- [ ] This file moved to `agent-tasks/in-review/` with status "in-review" in the fix commit
