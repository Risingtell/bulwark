---
name: Feature request
about: Suggest a capability Bulwark does not have yet
title: ''
labels: enhancement
assignees: ''
---

**What problem does this solve**

Describe the situation where the current behaviour is not enough. Concrete
beats abstract: a real position, a real protocol, a real failure mode.

**What you would like it to do**

**Does this touch the money path?**

Anything that changes when or how much Bulwark repays needs more care than a
read only change. Please read `SECURITY.md` first, particularly the notes on
why the repay call is never retried and why ticks are locked per address.

- [ ] This is a read only or reporting change
- [ ] This changes when a repay is triggered
- [ ] This changes how the repay amount is computed
- [ ] This adds a new write path

**Alternatives you considered**

**Anything else**
