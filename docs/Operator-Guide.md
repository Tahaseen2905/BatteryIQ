# BatteryIQ operator guide: click a machine, inject a fault, resolve it, restart the line

## 1. What happens when you click a machine

**Control room** (same idea as LineIQ):

1. Click a tile in **Line status**, or a machine in the 3D twin. The twin focuses on it and shows its card: state, key reading, shift OEE, current step.
2. Click the same tile again (or double-click) to **open the machine page** (`#/machine/HS-01`).

**Machine page** (laid out like LineIQ's)

- Header: state chip (Running / Attention / Stopped), alarm chip, **Ask about X**, **Gateway**, and **Inject / Clear Station Fault**.
- **3D view** of that machine, with toggles for **X-ray**, **Sensor tags** and **Power tags**, and an expand button.
- **Step timeline** under it: "Step 3 of 5, Press and fuse", with a progress bar. A stopped machine stays on the step where it stopped.
- **Machine strip**: "Machine 8 of 12", ← → buttons (or the arrow keys), **Tour all machines**, and a tile per machine with its health score.
- **Live card** on the right: every reading with its state, OEE (A · P · Q), cycles today, the open alarm with its fix and who has been told, **Acknowledge**, **Reset & Resume Line** (when stopped), and **Run diagnostic self-test**.
- Seven tabs: Process and health, Predictive maintenance, Condition trends (30 days), OEE and cycles (golden batch, stops), Alarms, Energy, Details.

LineIQ differences: LineIQ also lets you assign an alarm owner, add comments, and accept / reject / apply AI recommendations that are written back to the machine. BatteryIQ does not have these yet.

## 2. Two kinds of fault

| | Station fault | Gate (quality) fault |
|---|---|---|
| Where you raise it | Machine page → **Inject Station Fault** | **Events** menu (top right), or Quality gates → *Inject a fault at Qx* / **Defect checklist → Inject** |
| What it does | The machine goes to **Stopped**. **The whole line stops**; the battery count freezes and the header shows "Line stopped at IW-01". | Batteries start failing at that gate. The line **keeps running**; defective batteries are held. |
| How it ends | **Reset & Resume Line** | **Apply corrective action** |

## 3. Resolve a gate fault (reject / rework / alarm)

1. **Spot it.** A red banner says "Gate Q3 below target…", the gate card turns ALARM, and the Alarms count goes up. Click **Open gate Q3**.
2. **Read the alarm.** It names the main defect, the machine to check (**Open HS-01**), the likely cause, and the tool or lot behind it (for example "100% from HS-01 platen 2").
3. **Acknowledge.** This tells the system someone has it. An alarm nobody acknowledges goes to the shift in-charge after about 12 plant minutes and the plant head after about 30.
4. **Deal with the batteries** in **Review & hold bay**:
   - **Review queue** (camera not sure): **Release (false alarm)** sends it on to the next gate; **Confirm defect** makes it rework or reject.
   - **Rework bay**: fix by hand, then **Rework done**. It is re-inspected from the next gate. (The rework cell also clears these on its own after 12 batteries.)
   - **Reject hold bay**: choose Scrapped, Returned to supplier or Downgraded, then **Dispose**.
5. **Fix the cause.** Use **Apply corrective action** (the fix is in the alarm). This ends the fault and logs it in the Action log.
6. **Confirm recovery.** New batteries pass, the "Last 50" figure climbs, and the alarm **clears itself**. Open **Alarms → Show cleared** to see it.
7. **Trace** (optional): **Trace** tab → pick a rejected battery to see its lots, tools and Q1–Q4 pictures.

To clear everything at once: **Events → Clear all faults and station stops**.

## 4. Resolve a station stop and restart the line

1. Open the stopped machine (banner **Inspect IW-01**, or click it in Line status).
2. Read the alarm in the live card: cause, fix, who has been told.
3. Optional: **Run diagnostic self-test**.
4. Click **Acknowledge**, then **Reset & Resume Line** (or **Clear Station Fault** at the top). The machine returns to normal, the alarm clears and the batteries start moving again.

## 5. Pause and restart the demo

- **Pause / Play button** (next to Events): freezes or resumes the line without faults.
- **Events → Restart the demo from 16:42**: back to the start, with the Q3 seal problem running.

## 6. Quick demo script

1. Control room → click **Q3** (already in alarm) → read the alarm → **Acknowledge**.
2. **Review & hold bay**: release one, confirm one, dispose a reject.
3. **Trace**: show it points to HS-01 platen 2.
4. **Apply corrective action** → watch Q3 recover and the alarm clear.
5. **Events → Q2 Terminal weld defect** → repeat on a second gate.
6. Open **IW-01** → **Inject Station Fault** → line stops → **Reset & Resume Line**.
