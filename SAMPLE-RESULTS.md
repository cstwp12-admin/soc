# Sample Set-Out Check Results

This worked example uses **fictional training values only**. It is not a survey record, approved tolerance, or construction instruction.

## Check setup

| Field | Example |
|---|---|
| Project / reference | DEMO / DEMO-2026-001 |
| Location / element | CH 70+150 RHS / Pile-cap setting-out |
| Check type | Horizontal + Level |
| Horizontal tolerance | 15 mm radial |
| Level tolerance | +8 mm upper / −6 mm lower |
| Tolerance source | Fictional example; use the approved project requirement |

## Point results

Coordinates are in metres. Differences and radial offsets are in millimetres.

| Point | Design E | Design N | Design RL | Measured E | Measured N | Measured RL | ΔE | ΔN | Radial | ΔZ | Result |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| CP-01 | 1000.000 | 2000.000 | 25.400 | 1000.004 | 1999.998 | 25.402 | +4.0 | −2.0 | 4.5 | +2.0 | PASS |
| CP-02 | 1005.000 | 2005.000 | 25.500 | 1005.012 | 2005.006 | 25.507 | +12.0 | +6.0 | 13.4 | +7.0 | PASS (marginal) |
| CP-03 | 1010.000 | 2010.000 | 25.600 | 1010.020 | 2010.004 | 25.613 | +20.0 | +4.0 | 20.4 | +13.0 | FAIL |

## Summary

- **2 of 3 checked points pass** (one marginal); **1 fails**.
- Maximum radial offset: **20.4 mm at CP-03**; RMS radial: **14.3 mm**.
- Mean horizontal shift: **ΔE +12.0 mm / ΔN +2.7 mm**.
- Maximum level difference: **+13.0 mm at CP-03**; mean ΔZ: **+7.3 mm**; RMS ΔZ: **8.6 mm**.
- CP-03 exceeds the horizontal radial limit by about **5.4 mm** and the upper level limit by **5 mm**.

The app's movement remarks are guidance derived from the entered values. Independently verify the point identity, source values, units, datums, tolerances and field observations before making decisions.
