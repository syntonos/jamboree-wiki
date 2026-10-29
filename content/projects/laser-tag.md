---
title: Laser tag
description: Infrared tag system with hit detection and scoring.
type: project
status: current
featured: true
order: 01
art: laser
image:
discipline: Electrical, Computer science
tags: Firmware programming, PCB design, Infrared communication, Circuit debugging
lead:
contact:
updated: 2026-10-29
next_milestone: Define the tag protocol and test one transmitter/receiver pair.
help_needed: IR sensing, firmware, and enclosure design.
---

## Scope
Infrared tag system with hit detection and scoring. Scope, parts, and dimensions are still to be agreed.

## Next steps
- Agree on range, scoring rules, and the first prototype test.
- Select a controller and compare candidate IR receivers.
- Log received signals before adding game logic.

## Bill of materials
Starter planning list. Quantities and specifications are TBD; these are not verified purchasing recommendations.

| Item | Quantity | Specification | Status |
| --- | --- | --- | --- |
| Controller board | TBD | I/O and timing requirements TBD | Not selected |
| IR emitter and driver | TBD | Wavelength, drive current, and duty cycle TBD | Not selected |
| IR receiver | TBD | Protocol and ambient-light performance TBD | Not selected |
| Feedback device | TBD | Indicator, buzzer, or display TBD | Not selected |
| Power source and enclosure | TBD | Voltage, capacity, and mounting TBD | Not selected |

## Resources
- [Download the editable BOM (CSV)](/assets/resources/laser-tag/bom.csv)
- [Download the concept diagram (SVG)](/assets/resources/laser-tag/concept.svg)
- [Download the design brief (Markdown)](/assets/resources/laser-tag/design-brief.md)

The concept diagram shows candidate system blocks only. Final CAD, PCB, and schematic files can be added here when they exist.

## Related guides
- [PCB design](#/guides/electrical/pcb-design)
- [Firmware](#/guides/electrical/firmware)
- [Software testing](#/guides/cs/software-testing)
- [Requirements and constraints](#/guides/design-practices/requirements-and-constraints)

## Build log
No build updates recorded yet.
