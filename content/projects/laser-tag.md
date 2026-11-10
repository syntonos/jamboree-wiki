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
updated: 2026-11-10
next_milestone: Compare IR receiver options and test one transmitter/receiver pair.
help_needed: IR sensing, firmware, and enclosure design.
---

## Standard issue
Infrared tag system with hit detection and scoring. The “Standard issue” concept uses a trumpet with the PCB inside and an IR receiver strapped to the player's arm. Enclosure dimensions, optics, and the final circuit remain undecided.

## Next steps
- Agree on range, scoring rules, and the first prototype test.
- Prototype with the XIAO ESP32-C3 and compare receiver options; decide whether a three-pin sensor is required.
- Choose an IR transmitter and test its driver, optics, and receiver response.
- Log received signals before adding game logic.
- Check the WS2812B strip's 5 V power and data-level requirements before connecting it to the controller.

## Bill of materials
[Shared bill of materials](https://docs.google.com/spreadsheets/d/1V3B1yuoh8lKiNzFN5HOxmlRPhACA-VsLT4hC5OJaBHg/edit?usp=sharing)

Candidate parts from the project research; quantities per unit and compatibility still need testing. Prices below are research quotes, not current purchasing totals.

| Part | Candidate | Notes |
| --- | --- | --- |
| Controller | [Seeed Studio XIAO ESP32-C3, three-pack](https://www.seeedstudio.com/Seeed-Studio-XIAO-ESP32C3-3PCS-p-5920.html) | Prototype controller candidate. |
| LED feedback | [WS2812B ECO strip](https://www.amazon.com/dp/B097BWJGYK) | 16.4 ft, 60 LEDs/m, DC 5 V. |
| Input switches | [Keyboard switches, 200-pack](https://www.amazon.com/dp/B0HCNVN67G) | Switch choice and mounting to be tested. |
| IR receiver | [VS1838B](https://www.makerfabs.com/infrared-receiver-vs1838b.html) | Research quote: $0.05 each. [Datasheet](https://www.sivago.com.cn/upload/pdf/2022/VS1838B.pdf). |
| IR transmitter | TBD | Emitter, driver, and optics still to be selected. |
| Alternative IR parts | [Gikfun infrared emitter/receiver, 10 pairs](https://www.amazon.com/dp/B06XYNDRGF) | Research quote: $5.99 per 10 pairs. Bare parts need supporting resistors and capacitors; a possible teaching option. |
| Connectors | [JST plugs](https://www.amazon.com/dp/B088NQBF3V) | Connector type and wiring to be checked against the final circuit. |
| Power and enclosure | TBD | Supply capacity, enclosure dimensions, and mounting remain open. |

## Research
- [Lens arrangements for laser tag](https://engineering.stackexchange.com/questions/51849/lens-arrangement-for-laser-tag)
- [OpenLaserTag optical emitter tube](https://openlasertag.org/language/en/optical-emmiter-tube/)
- [Driving 5 V WS2812 LEDs from a 3.3 V data line](https://hackaday.com/2017/01/20/cheating-at-5v-ws2812-control-to-use-a-3-3v-data-line/)

## Resources
- [Download the editable BOM (CSV)](/assets/resources/laser-tag/bom.csv)
- [Download the concept diagram (SVG)](/assets/resources/laser-tag/concept.svg)
- [Download the design brief (Markdown)](/assets/resources/laser-tag/design-brief.md)

These local downloads are starter planning files; the shared sheet above contains the linked parts research.

## Related guides
- [PCB design](#/guides/electrical/pcb-design)
- [Firmware](#/guides/electrical/firmware)
- [Software testing](#/guides/cs/software-testing)
