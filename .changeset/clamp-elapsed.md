---
"sprungdesign": patch
---

Clamp the controller's elapsed time to ≥ 0 so a non-monotonic injected clock (e.g. a backward `now()` step under NTP skew or a custom clock) can't feed negative time into the solver and diverge.
