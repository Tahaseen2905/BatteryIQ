# BatteryIQ: Plant Digital Twin & Smart Battery Manufacturing Suite (Exide / JoulesToWatts)

BatteryIQ is an industrial IIoT monitoring, 3D digital twin, and predictive intelligence suite for vehicle and industrial battery manufacturing. Built to reflect both Exide's historical core business (Lead-Acid automotive, commercial vehicle, and inverter batteries) and modern Advanced Energy lines (Lithium-Ion cell/pack manufacturing), BatteryIQ features an instant **Dual Process Pack Switcher** so executives and plant engineers can monitor either chemistry on the plant floor.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> **Key Revisions from Feedback**:
> - **Dual Process Packs (Lead-Acid & Lithium-Ion)**: Rather than assuming only Lithium-Ion, BatteryIQ natively supports both:
>   1. **Lead-Acid Line (Exide Traditional & Heavy Duty)**: Grid Casting (`GC-01`), Oxide Milling (`OM-01`), Paste Mixing (`PM-01`), Plate Pasting (`PP-01`), Curing Chambers (`CC-01`), Cast-On-Strap (`CS-01`), Inter-Cell Welding (`IW-01`), Heat Sealing (`HS-01`), Acid Filling (`AF-01`), Formation Bath (`FB-01`), and High-Rate Finishing (`HR-01`).
>   2. **Lithium-Ion Line (EV & ESS)**: Slurry Mixing (`MX-01`), Slot Die Coating (`CT-01`), Calendering (`CL-01`), Slitting (`SL-01`), Vacuum Drying (`VD-01`), Casing Moulding (`MO-01`), Z-Stacking (`ST-01`), Terminal Welding (`WD-01`), Electrolyte Filling (`FL-01`), Formation/Aging (`FM-01`), OCV/IR Grading (`TG-01`), and Laser Pack (`LB-01`).
> - **Plant Factory Server Architecture**: Clarified the on-premise Factory Server (central MES, historian, SCADA bridge, and andon broadcast) coordinating with individual machine IIoT edge gateway panels.
> - **Interactive Process Pack Switcher**: Operators and demonstrators can toggle between "Exide Automotive Lead-Acid (12V SLI / Inverter)" and "Advanced Li-Ion EV Module" with 1 click in the top bar; the 3D twin, machine tags, chemistry parameters, and visual quality gates adapt instantly.

---

## 1. Overview & Core Concept

### What It Does
BatteryIQ connects every machine stage on the factory floor to an on-premise Plant Factory Server through edge IIoT gateways. It provides live 3D visualization of battery materials flowing down the line, tag chips with real-time sensor dynamics, four AI visual inspection quality gates (with real-time fault injection), predictive health analytics, and an operator copilot in English and Hindi.

### Target Personas & Value
- **Plant Operations & General Managers**: Full line OEE, shift output targets, downtime Pareto, and automated shift handover reports.
- **Quality & Process Engineers**: Multi-gate defect inspection (Q1–Q4), SPC X-bar/R control charts, Cpk tracking, and end-to-end lot tracing back to lead oxide/slurry mixing batches.
- **Maintenance & Plant Reliability**: 4-model predictive diagnostics (Weibull remaining life, vibration FFT analysis, anomaly detection, wear counters), Sunday shutdown scheduling, and critical spare parts tracker.
- **Line Supervisors & Operators**: Real-time 3D station views, step sequence timers, live alarms with escalation to shift in-charge, and AI copilot guidance.

---

## 2. User Experience & Visual Design

### Key Views & Navigation
1. **Control Room**:
   - 6 Headline KPIs: Line OEE, Batteries Against Plan, Open Alarms, First-Pass Yield, Active Machines, Spares Due.
   - Interactive 3D Live Factory Twin: Orbit/zoom, continuous material flow (plates/cells into assembled battery casings with red accent bands and dual terminal posts), tag chips with live sensor values, and an automated "Tour the Line" camera fly-through.
   - Live Machine Status Grid, Alarm Escalation Queue, Shift Production Timeline, and Downtime Pareto.
2. **Line Monitor**:
   - Every machine in sequential process order showing machine state, active step, cycle time vs. standard, shift OEE, live telemetry, and critical part wear.
   - Area filtering (Grid/Electrode, Assembly, Chemical/Formation, Pack-out, Utilities).
3. **Machine Deep Dive**:
   - 3D Machine View with procedural mechanical details (frames, rollers, chambers, stack lights, control cabinets).
   - X-ray inspection mode and live power tags.
   - Tabbed stations: Process & Health, Predictive AI, 30-Day Condition Trends, OEE & Golden Cycle benchmark, Active Alarms, and Energy consumption.
4. **AI Visual Quality Gates (Q1–Q4)**:
   - Portal visual inspection stations with camera hood, lighting array, reject chute, and status display:
     - **Q1 Casing / Container**: Moulding voids, cracks, short shots, contamination, dented container walls.
     - **Q2 Terminal & Post Assembly**: Weld spatter, bent/misaligned posts, weld penetration, burning.
     - **Q3 Cover & Seal / Heat Sealing**: Seal bead uniformity, hot-plate fusion leaks, adhesive voids (*starts in alarm state < 98%*).
     - **Q4 Final Appearance, QR & Label**: Model label verification, barcode/QR grading, date OCR.
   - Interactive "Inject Gate Fault" button to simulate real-world quality drift on Q2 or Q3.
   - Batch root-cause trace tool linking defective units to specific plate batches, alloy lots, or machine shifts.
5. **Predictive Maintenance**:
   - 4 AI diagnostic models per machine: Anomaly Detector, Weibull RUL Estimator, Failure Mode Classifier, Wear Accumulator.
   - FFT vibration spectrum with harmonic fault peak highlighting, financial cost comparison (planned shutdown vs. line starvation breakdown), and Sunday shutdown work order generator.
6. **Factory Edge Gateways & SCADA**:
   - IIoT gateway health for all machines: OPC UA, Modbus RTU/TCP, MQTT plant bus, 7-day edge ring buffer, and CPU load.
7. **Utilities & Acid/Dry-Room Environment**:
   - Environmental safeguards: Lead-Acid Acid Fume Scrubber & Acid Chiller; Li-Ion -45°C Dew Point Dry Room & NMP Solvent Recovery.
8. **Shift Handover Reports**:
   - Automated digital shift report with OEE loss attribution, scrap rates, and sign-off workflows.
9. **Operator GenAI Copilot**:
   - Bilingual (English & Hindi) conversational assistant answering questions about line status, stops, machine specs, and maintenance guidelines.

### Visual Styling & Theme
- **Color Discipline**: Deep Obsidian Factory Canvas (`#0B0F17`), Brushed Industrial Steel (`#141C2B`), Precision Emerald (`#10B981` Nominal), Warning Amber (`#F59E0B` Attention), Signal Crimson (`#EF4444` Critical/Alarm), Cyan/Teal (`#06B6D4` AI Quality Gates).
- **Typography**: `Plus Jakarta Sans` for clean titles, `JetBrains Mono` and `tabular-nums` for all telemetry, temperatures, cycle times, and electrical ratings.
- **Ergonomic 3D Viewport**: Zero clutter; collapsible bottom control dock with view presets (Iso, Top, Elevation, Dry/Curing Room, Quality Gates).

---

## 3. Key Product Decisions & Trade-Offs

- **Dual Process Pack Engine**:
  - *Decision*: Provide full simulation models for both Lead-Acid (automotive 12V flooded/AGM, Exide's primary heritage) and Lithium-Ion (EV prismatic/pouch cell packs).
  - *Why*: Directly solves the client query regarding Exide's core product portfolio while demonstrating modern EV transition capabilities.
- **Central Plant Factory Server Simulation Model**:
  - *Decision*: A unified deterministic simulation clock coordinates all 16 machine cycles, material transfer conveyors, buffer stocks, quality gate inspections, and plant SCADA tags.
  - *Why*: Guarantees that every number matches across the 3D twin, Line Monitor, Machine Detail, and Shift Reports without data divergence.
- **Hybrid Bilingual Copilot**:
  - *Decision*: Seamless fallback between the live Gemini API and an on-premise expert industrial knowledge base in English and Hindi.
  - *Why*: Allows flawless demo operation whether internet connectivity and API keys are present or completely offline.

---

## 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           BatteryIQ Plant Portal                            │
├─────────────────────────────────────────────────────────────────────────────┤
│  Top Bar: BatteryIQ Brand · Process Pack [Lead-Acid | Li-Ion] · Demo Flight │
├──────────────────────────────────────┬──────────────────────────────────────┤
│           Main Content View          │      On-Premise Plant Server         │
│ ┌──────────────────────────────────┐ │ ┌──────────────────────────────────┐ │
│ │ Active Screen:                   │ │ │ Central Plant Simulation Clock:  │ │
│ │ - Control Room (3D Twin + HUD)   │ │ │ - 16 Machine Station Cycles      │ │
│ │ - Line Monitor (Process Flow)    │ │ │ - Material Transfer & Conveyors  │ │
│ │ - Machine Detail (X-Ray / Trend) │ │ │ - 4 AI Quality Gates (Q1–Q4)     │ │
│ │ - Quality Gates & SPC Charts     │ │ │ - In-Buffer & Out-Buffer Queues  │ │
│ │ - Predictive RUL & FFT Spectrum  │ │ │ - Alarms & Escalation Engine     │ │
│ │ - Plant Gateways & Telemetry     │ │ │ - Shift Handover & OEE Aggregator│ │
│ │ - Shift Reports & Audit          │ │ └──────────────────────────────────┘ │
│ └──────────────────────────────────┘ │                  │                   │
│                                      │                  ▼                   │
│ ┌──────────────────────────────────┐ │ ┌──────────────────────────────────┐ │
│ │ Operator Copilot (EN / HI)       │◄┼─┤ Hybrid Copilot Service           │ │
│ │ (Live Telemetry & Diagnostics)   │ │ │ (Gemini API + Offline Rules)     │ │
│ └──────────────────────────────────┘ │ └──────────────────────────────────┘ │
└──────────────────────────────────────┴──────────────────────────────────────┘
```

### Supported Process Lines
1. **Lead-Acid Automotive Battery Line (Exide Classic)**:
   - `GC-01`: Rotary Grid Casting (Lead-antimony/calcium alloy pot, mould temperature)
   - `OM-01`: Barton Pot Lead Oxide Mill (Particle size, airflow, oxidation rate)
   - `PM-01`: Positive/Negative Paste Mixer (Paste density, acid addition, mix temp)
   - `PP-01`: Belt Pasting & Plate Parting (Paste weight, plate thickness)
   - `CC-01`: Hydro-Set Curing & Drying Chamber (Steam humidity, drying curve)
   - `CS-01`: Cast-On-Strap Plate Group Lug Welder (Strap mold temp, weld time)
   - `IW-01`: Through-Partition Inter-Cell Welder (Shear strength, weld current)
   - `HS-01`: Container Polypropylene Heat Sealing (Platen temp, melt depth)
   - `AF-01`: Acid Vacuum Filling & Level Check (Specific gravity, acid volume)
   - `FB-01`: Water-Cooled Container Formation Bath (Amperage curve, bath temp)
   - `HR-01`: High-Rate Discharge & Terminal Burner (Cold crank test, burn seal)
   - `LB-01`: Labelling, Shrink Packaging & Stacking
2. **Lithium-Ion EV Battery Line**:
   - `MX-01`: Slurry Mixing, `CT-01`: Slot Die Coating, `CL-01`: Calendering, `SL-01`: Slitting, `VD-01`: Vacuum Dry
   - `MO-01`: Casing Moulding, `ST-01`: Z-Stacking, `WD-01`: Tab Welding, `FL-01`: Electrolyte Fill, `FM-01`: Formation, `TG-01`: Grading, `CS-01`: Pack Sealing, `LB-01`: Pack Label
3. **Shared Utilities**:
   - Scrubbers / Dry Room, Chillers, Compressed Air, Electrical Substation.

---

## Verification & Build Steps
1. Install `three` and `@types/three`.
2. Implement the central simulation engine supporting both chemistry packs.
3. Build the procedural 3D digital twin with smooth camera controls, live conveyor flow, tag chips, and visual quality gates.
4. Build all operational views: Control Room, Line Monitor, Machine Detail, Quality Gates, Predictive Maintenance, Gateways, Reports, and Copilot.
5. Verify build with `compile_applet` and test all interactive features.
