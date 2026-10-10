# Synthetic Robot Fleet Health Coordinator Dataset

All data in this package is synthetically generated for a student project/demo. It is not collected from real robots and must not be treated as validated engineering thresholds or a real-world failure predictor.

## Files

1. `sensor_timeseries.csv`
   - 50 robots × 720 hourly records = 36,000 rows.
   - Use for line charts, heat maps, histograms, 3D scatter plots, bubble charts, box plots, and parallel coordinates.
   - Main fields: robot_id, timestamp, battery_soc_pct, battery_voltage_v, motor_temperature_c, vibration_mm_s, motor_current_a, motor_speed_m_s, payload_kg, utilization_pct, task_active, charging.
   - `health_score_synthetic` and `anomaly_flag_synthetic` are generated demo labels/indicators.

2. `robot_summary.csv`
   - One row per robot.
   - Use for KPI cards, robot health bar charts, pie charts of health status, robot comparisons, and risk ranking.
   - Fields with `_synthetic` are illustrative generated values, not real calibrated metrics.

3. `maintenance_events.csv`
   - Synthetic maintenance history.
   - Use for treemaps/bar charts by component, downtime and cost analysis, and maintenance history views.

## Visualization mapping

- Pie chart: robot counts by `health_status_synthetic`.
- Bar chart: `avg_health_score_24h` by robot.
- Line chart: sensor values or health score over `timestamp` for selected robot(s).
- Heat map: robot_id × date/hour, colored by temperature, vibration, or health score.
- Histogram: distribution of `motor_temperature_c`, `vibration_mm_s`, or health score.
- Treemap: total maintenance cost or event count by component.
- 3D scatter: motor temperature (x), vibration (y), motor current (z), colored by health status.
- Box plot: vibration distribution grouped by robot or status.
- Parallel coordinates: battery voltage, temperature, vibration, current, speed, utilization.
- Bubble chart: temperature vs vibration, bubble size = motor current, color = robot health status.
- Radar chart: normalized sensor/operational metrics for selected robot vs fleet average.

## Important interpretation notes

- The generated fault profiles introduce patterns for demo purposes; they do not establish that a given sensor alone diagnoses a specific failure.
- `failure_probability_synthetic` is a simulated demo score, not a trained or calibrated machine-learning prediction.
- For an honest ML experiment, choose a clearly defined target, split by time or robot where appropriate, and avoid using derived target fields as input features.
- Sensor thresholds should eventually be replaced with manufacturer specifications or clearly documented assumptions.
