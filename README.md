# BatteryIQ: AI vision inspection for a vehicle battery plant

A demo by JoulesToWatts for an Exide-style lead-acid vehicle battery line. Every battery goes through four AI
vision gates, and everything on screen (gate cards, defect counts, SPC, review queue, hold bay, alarms, shift
figures, traces, the copilot) is computed from the same seeded list of batteries, so the numbers always agree.

## The four gates

| Gate | Stage | What it checks |
|---|---|---|
| **Q1** Casing & appearance | After casing moulding, during final assembly | Missing caps, plugs or external parts; wrong or damaged terminals; moulding defects and contamination; cracks, scratches, dents, deformation |
| **Q2** Terminals & connectors | Terminal assembly and welding | Connector placement; weld defects; missing, bent or damaged terminals; terminal position, alignment and height |
| **Q3** Cover, seal & assembly | Cover fitting, sealing, final assembly | Leakage stains; missing parts; gaps, excess or incomplete sealant; cover placement and orientation |
| **Q4** Label, barcode & final appearance | Final inspection, dispatch | Label placement, print quality, packaging; barcode/QR grade; OCR of model code and manufacturing date; correct label for the model |

Each line of that checklist is a defect in [src/inspection/catalogue.ts](src/inspection/catalogue.ts), with its
severity, whether the gate reworks or rejects it, the machine to look at first, the likely cause and the fix.

## The flow

```
battery built ─► Q1 ─► Q2 ─► Q3 ─► Q4 ─► passed (dispatch)
                 │     │     │     │
                 └─────┴─────┴─────┴──► stops at the first gate that does not pass
                                          ├─ confident defect, rework  ─► rework bay ─► re-inspected from the next gate
                                          ├─ confident defect, reject  ─► reject hold bay ─► scrap / return / downgrade
                                          └─ camera unsure (< 88 %)    ─► operator review: release or confirm
```

- A gate **alarms** when its last 50 calls hold 5 or more bad ones (a 4-sigma p-chart limit around the 98 % target), so chance defects on a healthy line do not raise alarms. An open alarm clears once the window is nearly clean.
- An unacknowledged alarm **escalates** from the operator to the shift in-charge (about 12 plant minutes) and the plant head (about 30).
- The alarm names the defect, the machine to look at, and, from a binomial test on the defective batteries, the **tool or lot they have in common** (HS-01 platen, IW-01 weld head, CS-01 strap mould, container lot). A name is only given when the cluster is very unlikely to be chance.
- **Apply corrective action** ends the fault and logs the action. The gate recovers, the alarm clears itself, and the machine leaves Attention.
- Faults flow back to machines: the machine a fault points at goes to Attention with the reason and an out-of-range reading.

## Pages

Control room · Line monitor · **Machine page** (3D machine with X-ray and sensor/power tags, the step of its cycle running now, machine strip and tour, every live reading with OEE, and seven tabs) · Sensors & gateways · Alarms · AI maintenance · Production & OEE ·
**Quality gates** (Live inspection, Defect checklist, SPC, Review & hold bay, Trace) · Traceability · **AI model** (camera against operator verdicts, learning loop, pilot targets, reference images) · **History** (7 to 30 days, Pareto, CSV export) · **Savings** (editable assumptions, payback) · Reports (shift handover to sign off) · Copilot · Integrations (connection map, connectors, line actions and PLC signals, tag mapping) · **Deployment** (speed, cameras, hardware, rollout) · Settings (demo controls, limits, plan and buffers, battery models, roles, audit log).

**Roles are enforced.** Pick who you are acting as in the top bar. An Operator cannot dispose of a reject or apply a corrective action; the app says so, and every allowed action is logged under the person's name (Settings, Audit log).

Every screen has a link: `#/quality_gates/Q3/spc`, `#/machine/HS-01`, `#/alarms`.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # engine, alarms, root cause, SPC and copilot checks
npm run build      # type check and production build
```

## Presenting

- The demo opens at 16:42 in Shift B with a seal problem already running: HS-01 platen 2 is cold, so **Q3 is in
  alarm** and the bead breaks trace to platen 2. Open **Quality gates → Q3**.
- **Events** (top right) injects any defect at any gate. Watch the gate card, the alarm, the machine and the trace react.
- Pause the line with the button next to Events. **Restart the demo** is in the same menu.
- The copilot (English and Hindi) answers from the live data: "Why is the seal gate failing?", "How is HS-01?",
  "What is waiting in the hold bay?".

## Layout

- `src/inspection/`: the domain. `catalogue.ts` (defects, specs), `engine.ts` (seeded units, gates, operator actions),
  `selectors.ts` (stats, SPC, root cause), `alarms.ts`, `impact.ts` (gate faults to machines), `scenario.ts` (the demo's starting state).
- `src/components/quality/`: the camera render per gate, the X-bar/R chart, the trace panel.
- `src/copilot/`: the copilot. `brain.ts` builds offline answers from the live data (plain text, and as blocks with buttons and follow-ups), `store.ts` keeps the conversation, `CopilotChat.tsx` is the chat shared by the side drawer and the Copilot page.
- `src/services/simulation.ts`: the machines, maintenance alarms and shift plan.
- `src/components/machine/`: the machine page parts (3D studio, step timeline, machine strip, live card, tabs). `src/domain/machineModel.ts` holds each machine's cycle steps and full tag set.
- `public/assets/aistudio/…html`: the 3D line twin, and `machine_studio.html`, which shows one machine in 3D (both standalone pages shown in an iframe).
- `public/assets/studio/`: the machine studio's 3D code. `parts.js` is the parts library (bevelled frames, motors with fins, gearboxes, pipes, tanks, conveyors with batteries, cabinets with screens, guards, flames, sparks, steam) and `machines.js` builds the 12 lead-acid machines from it, with moving parts that stop when the machine stops.

## Copilot

The copilot answers offline from the plant data, on the page. There are no environment variables and no API keys.

## Known limits

- The 3D twin is a separate page. It uses the same detailed machine models as the machine page, and each machine's status (rings, stack lights, whether it moves) follows the live data. Its chip readings and QC gate chips are still its own demo values, not the engine's. The gate numbers on every other page are live.
- The moulding (MO-01) and cover-fitting (CF-01) stations and the four QC gate frames in the twin are still simple block models.
- Accuracy is not claimed: the camera frames are drawn, so the AI model page shows the pilot targets and live operator verdicts, not a measured recall. History before today, the Savings assumptions and the Deployment figures are illustrative.
- The reject, rework and line-stop signals are shown as outputs and rules; nothing is wired to a PLC in this demo.
- Machine-page history (30-day trends, 7-day OEE, cycle times, stops) is generated from each machine's current readings, not recorded.
- Model codes, lot names and operator names are illustrative.
# BatteryIQ
