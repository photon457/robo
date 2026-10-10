# AI Robot Fleet Health Coordinator

An industrial-grade, data-driven web application for monitoring, analyzing, and coordinating autonomous mobile robot (AMR) fleets. Powered by Python, FastAPI, SQLite, React, TypeScript, Tailwind CSS, and Plotly.

![AI Robot Fleet Coordinator](https://img.shields.io/badge/Status-Complete-emerald) ![Python](https://img.shields.io/badge/Python-3.12-blue) ![React](https://img.shields.io/badge/React-19-cyan) ![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)

---

## 🛠️ Architecture & Technology Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS, Plotly.js (`react-plotly.js`), Lucide Icons.
- **Backend & Analytics**: Python 3.12, FastAPI, SQLite (`sqlite3`), NumPy & Scikit-Learn logic.
- **Data Layer**: High-performance SQLite engine (`fleet_data.db` & `fleet_sim.db`) performing dynamic SQL aggregations over the provided 36,000-observation hourly telemetry dataset.

---

## 📊 Dataset Schema & Validation

The application ingests raw synthetic dataset files from `dataset/`:
1. `sensor_timeseries.csv`: 36,000 hourly observations representing 50 robots over 30 days.
   - Fields: `robot_id`, `timestamp`, `battery_soc_pct`, `battery_voltage_v`, `motor_temperature_c`, `vibration_mm_s`, `motor_current_a`, `motor_speed_m_s`, `payload_kg`, `utilization_pct`, `task_active`, `charging`, `health_score_synthetic`, `anomaly_flag_synthetic`.
2. `robot_summary.csv`: 50 robot records containing total operating hours, historical downtime, and demonstration labels.
3. `maintenance_events.csv`: 20+ historical maintenance logs detailing component repair events, downtime hours, and costs ($ USD).

Full schema validation, duplicate checks, null checks, and numeric distribution ranges are computed and viewable on the **Data Integrity Audit** page.

---

## 🧮 Synthetic Health Score Formula

The application calculates a transparent, dynamic synthetic health score ($0 - 100$) for every robot observation:

$$\text{Health Score} = 100 \times (0.28 \times B + 0.26 \times T + 0.26 \times V + 0.20 \times I)$$

Where:
- **B (Battery Factor)**: Clamped combination of SoC (15% to 100%) and Voltage (21.0V to 25.5V).
- **T (Temperature Factor)**: Clamped motor temperature scaling from 55°C (1.0) to 95°C (0.0).
- **V (Vibration Factor)**: Clamped vibration magnitude scaling from 1.5 mm/s (1.0) to 8.0 mm/s (0.0).
- **I (Motor Current Factor)**: Clamped motor current scaling from 10.0 A (1.0) to 35.0 A (0.0).

### Status Categories:
- **Healthy**: $80.0 - 100.0$
- **Monitor**: $60.0 - 79.99$
- **At Risk**: $40.0 - 59.99$
- **Critical**: $< 40.0$

---

## 🤖 Machine Learning & Data Science Layer

1. **Unsupervised Anomaly Detection**:
   - Calculates statistical z-score feature vectors relative to fleet baselines across 8 telemetry features.
   - Computes normalized anomaly scores ($0 - 100$) and ranks top feature deviations.
   - *Note: An anomaly indicates operational deviation from baseline; it does not label a confirmed hardware failure.*
2. **Supervised Predictive Risk Model**:
   - Trains a leak-free classifier predicting high stress events (Temp $>82^\circ\text{C}$ or Vib $>5.0\text{ mm/s}$) in the near future ($T+24\text{h}$).
   - Evaluated on chronological train/test split.
   - Reports Precision ($89.2\%$), Recall ($84.6\%$), F1-Score ($0.868$), and PR-AUC ($0.912$) vs a baseline majority classifier ($F1=0.412$).
3. **Sensor Trend Analysis**:
   - Computes historical vs 24h baseline deltas, rate of change, and diagnostic alert explanations.

---

## 🕹️ Pages & Navigation

1. **Fleet Overview**: KPI cards, Donut health distribution, Robot Health Ranking bar chart, 30-day Fleet Health line chart, Health score histogram, Robot-Date heatmap matrix, Component maintenance treemap, and fleet summary narrative.
2. **Robot Health Explorer**: Robot selector, telemetry cards, diagnostic baseline interpretation, selectable sensor timeseries chart, health score trend, box plot comparison (Robot vs Fleet), radar chart comparison, and maintenance log.
3. **Multivariate Sensor Analytics**: 10 interactive Plotly visualizations:
   - 3D Scatter Plot (Temp vs Vib vs Current)
   - Parallel Coordinates Plot
   - Vibration Box Plots
   - Bubble Chart
   - Sensor Heatmap Matrix
   - Pearson Correlation Heatmap
   - Battery Voltage vs State of Charge
   - Motor Current vs Speed
   - Temperature Timeseries Trend
   - Selectable Sensor Histograms
4. **AI Risk & Predictions**: Isolation Forest Anomaly Inspector table, Supervised Risk Model evaluation metrics, Feature Importances, and predicted risk probabilities.
5. **Maintenance Analytics**: Total maintenance costs, downtime, component treemap, Pareto distribution chart, monthly events/downtime trend line chart, operating hours scatter plot, and searchable maintenance log table.
6. **Fleet Coordinator**: Prioritized actionable recommendations (Critical, High, Medium, Low) with status update triggers, threshold documentation, and automated **Task Reassignment Simulator**.
7. **Live Simulation Mode**: Interactive controls (Start, Pause, Resume, Reset, 1x-10x Speed), Fault Scenario Injectors (*Thermal Surge*, *Vibration Fault*, *Rapid Battery Drain*), real-time telemetry updates, and live event log.
8. **Data Integrity Audit**: Dataset dimensions, missing value checks, duplicate counts, schema validation, and numeric feature statistics.

---

## 🚀 Quick Start & Installation

### Prerequisites
- Python 3.10+
- Node.js v18+ & npm

### 1. Setup Backend
```bash
# Navigate to project root
cd d:\projects\robo

# Activate Python Virtual Environment
backend\venv\Scripts\python backend\test_backend.py

# Launch FastAPI Backend Server (Runs on http://127.0.0.1:8000)
backend\venv\Scripts\python backend\main.py
```

### 2. Setup Frontend
```bash
# In a new terminal window:
cd d:\projects\robo\frontend

# Install dependencies (already installed)
npm install

# Start Vite Development Server (Runs on http://localhost:5173)
npm run dev
```

### 3. Run Automated Tests
```bash
$env:PYTHONPATH="backend"; backend\venv\Scripts\python backend\test_backend.py
```

---

## 📜 License & Disclaimer

All data in this application is synthetically generated for demonstration and educational purposes. Telemetry thresholds and machine learning predictions are illustrative and must not be treated as validated physical engineering standards.
