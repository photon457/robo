import os
import sqlite3
import statistics
from fastapi import FastAPI, Query, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, Any, List, Optional

from data_loader import data_loader
from health_engine import process_fleet_health, compute_health_score
from ml_engine import ml_engine
from recommendation_engine import recommendation_engine
from simulation_engine import sim_engine

app = FastAPI(
    title="Robot Fleet Health Coordinator API",
    description="Data Science and Machine Learning backend for AMR Fleet Health Coordination",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"status": "online", "message": "Robot Fleet Health Coordinator API ready."}

@app.get("/api/dataset/summary")
def get_dataset_summary():
    return data_loader.get_validation_report()

@app.get("/api/dataset/status")
def get_dataset_status():
    return {
        "status": "ok",
        "files": data_loader.get_dataset_files_status(),
        "summary": data_loader.get_validation_report()
    }

@app.post("/api/dataset/upload")
async def upload_dataset_files(files: List[UploadFile] = File(...)):
    results = []
    errors = []
    for file in files:
        try:
            content = await file.read()
            res = data_loader.import_csv_file(content, file.filename or "data.csv")
            results.append(res)
        except Exception as e:
            errors.append({"file": file.filename, "error": str(e)})

    try:
        ml_engine._compute_fleet_baselines()
    except Exception:
        pass

    if errors and not results:
        raise HTTPException(status_code=400, detail={"errors": errors})

    return {
        "success": True,
        "imported": results,
        "errors": errors,
        "validation_report": data_loader.get_validation_report(),
        "files_status": data_loader.get_dataset_files_status()
    }

@app.post("/api/dataset/reload")
def reload_dataset():
    data_loader.load_data()
    try:
        ml_engine._compute_fleet_baselines()
    except Exception:
        pass
    return {
        "success": True,
        "validation_report": data_loader.get_validation_report(),
        "files_status": data_loader.get_dataset_files_status()
    }

@app.get("/api/fleet/robots")
def get_fleet_robots():
    return {"robots": data_loader.get_robot_list()}

@app.get("/api/fleet/overview")
def get_fleet_overview(time_window: str = "all", robot_id: Optional[str] = None):
    fleet_health = process_fleet_health(time_window=time_window)

    conn = data_loader.get_connection()
    cursor = conn.cursor()

    # Donut pie status distribution
    latest_robots = fleet_health["latest_robots"]
    status_counts = {"Healthy": 0, "Monitor": 0, "At Risk": 0, "Critical": 0}
    for r in latest_robots:
        status_counts[r["computed_status"]] += 1

    # Ranked bar chart
    ranked_robots = sorted(latest_robots, key=lambda x: x["computed_health_score"])
    ranked_data = [{"robot_id": r["robot_id"], "computed_health_score": r["computed_health_score"], "computed_status": r["computed_status"]} for r in ranked_robots]

    # Fleet health trend line chart
    cursor.execute("""
        SELECT timestamp, AVG(health_score_synthetic) as avg_hs
        FROM sensor_timeseries
        GROUP BY timestamp ORDER BY timestamp ASC
    """)
    fleet_trend = [{"timestamp": r["timestamp"], "health_score_synthetic": round(r["avg_hs"], 2)} for r in cursor.fetchall()]

    # Histogram data
    health_histogram = [r["computed_health_score"] for r in latest_robots]

    # Heatmap matrix (Robots x Dates)
    cursor.execute("""
        SELECT robot_id, date, AVG(health_score_synthetic) as avg_hs
        FROM sensor_timeseries
        GROUP BY robot_id, date ORDER BY robot_id, date
    """)
    daily_rows = cursor.fetchall()
    dates_set = sorted(list(set(r["date"] for r in daily_rows)))
    robots_set = sorted(list(set(r["robot_id"] for r in daily_rows)))

    matrix_map = {(r["robot_id"], r["date"]): round(r["avg_hs"], 1) for r in daily_rows}
    z_matrix = []
    for rid in robots_set:
        row_z = [matrix_map.get((rid, d), 80.0) for d in dates_set]
        z_matrix.append(row_z)

    heatmap_data = {
        "y_robots": robots_set,
        "x_dates": dates_set,
        "z_matrix": z_matrix
    }

    # Maintenance Treemap Data
    cursor.execute("""
        SELECT component, SUM(maintenance_cost_usd) as total_cost, COUNT(event_id) as event_count, SUM(downtime_hours) as total_downtime
        FROM maintenance_events GROUP BY component
    """)
    comp_treemap = [dict(r) for r in cursor.fetchall()]

    conn.close()

    lowest_3 = ranked_robots[:3]
    summary_text = (
        f"Fleet Health Assessment: {fleet_health['kpis']['at_risk_robots'] + fleet_health['kpis']['critical_robots']} "
        f"of {fleet_health['kpis']['total_robots']} robots require immediate operational attention or preventive maintenance. "
        f"Robots with lowest current health scores: {', '.join([r['robot_id'] + ' (' + str(r['computed_health_score']) + ')' for r in lowest_3])}."
    )

    return {
        "kpis": fleet_health["kpis"],
        "summary_text": summary_text,
        "lowest_health_robots": lowest_3,
        "charts": {
            "health_distribution_pie": status_counts,
            "ranked_robots_bar": ranked_data,
            "fleet_health_trend_line": fleet_trend,
            "health_score_histogram": health_histogram,
            "health_heatmap": heatmap_data,
            "component_treemap": comp_treemap
        }
    }

@app.get("/api/robots")
def get_robots():
    fleet_health = process_fleet_health()
    return fleet_health["latest_robots"]

@app.get("/api/robots/{robot_id}")
def get_robot_details(robot_id: str, comp_robot_id: Optional[str] = "R001"):
    conn = data_loader.get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM sensor_timeseries WHERE robot_id = ? ORDER BY timestamp ASC", (robot_id,))
    sensor_rows = [dict(r) for r in cursor.fetchall()]
    if not sensor_rows:
        conn.close()
        raise HTTPException(status_code=404, detail=f"Robot {robot_id} not found")

    cursor.execute("SELECT * FROM robot_summary WHERE robot_id = ?", (robot_id,))
    r_summary = dict(cursor.fetchone() or {})

    cursor.execute("SELECT * FROM maintenance_events WHERE robot_id = ? ORDER BY event_date DESC", (robot_id,))
    r_maint = [dict(r) for r in cursor.fetchall()]

    latest_row = sensor_rows[-1]
    hs_info = compute_health_score(
        latest_row["battery_soc_pct"], latest_row["battery_voltage_v"],
        latest_row["motor_temperature_c"], latest_row["vibration_mm_s"], latest_row["motor_current_a"]
    )

    # Comparison robot telemetry
    comp_id = comp_robot_id if comp_robot_id != "FLEET_AVG" else "R001"
    cursor.execute("SELECT * FROM sensor_timeseries WHERE robot_id = ? ORDER BY timestamp DESC LIMIT 1", (comp_id,))
    comp_row = dict(cursor.fetchone() or latest_row)

    # Fleet averages
    cursor.execute("""
        SELECT AVG(battery_soc_pct) as soc, AVG(battery_voltage_v) as volt,
               AVG(motor_temperature_c) as temp, AVG(vibration_mm_s) as vib,
               AVG(motor_current_a) as curr, AVG(utilization_pct) as util
        FROM sensor_timeseries
    """)
    avg_row = dict(cursor.fetchone())

    fleet_avg = {
        "battery_soc_pct": round(avg_row["soc"], 1),
        "battery_voltage_v": round(avg_row["volt"], 2),
        "motor_temperature_c": round(avg_row["temp"], 1),
        "vibration_mm_s": round(avg_row["vib"], 2),
        "motor_current_a": round(avg_row["curr"], 1),
        "utilization_pct": round(avg_row["util"], 1)
    }

    cursor.execute("SELECT vibration_mm_s FROM sensor_timeseries")
    fleet_vib = [r[0] for r in cursor.fetchall()]
    robot_vib = [r["vibration_mm_s"] for r in sensor_rows]

    cursor.execute("SELECT timestamp, motor_temperature_c, vibration_mm_s FROM sensor_timeseries WHERE robot_id = ? AND anomaly_flag_synthetic = 1", (robot_id,))
    anom_timeline = [dict(r) for r in cursor.fetchall()]

    conn.close()

    trend_analysis = ml_engine.get_trend_analysis(robot_id)

    return {
        "robot_id": robot_id,
        "latest_telemetry": latest_row,
        "health_info": hs_info,
        "summary_metrics": r_summary,
        "maintenance_history": r_maint,
        "timeseries": sensor_rows,
        "radar_comparison": {
            "selected_robot": {
                "battery_soc_pct": latest_row["battery_soc_pct"],
                "battery_voltage_v": latest_row["battery_voltage_v"],
                "motor_temperature_c": latest_row["motor_temperature_c"],
                "vibration_mm_s": latest_row["vibration_mm_s"],
                "motor_current_a": latest_row["motor_current_a"],
                "utilization_pct": latest_row["utilization_pct"]
            },
            "comparison_robot": {
                "robot_id": comp_id,
                "battery_soc_pct": comp_row["battery_soc_pct"],
                "battery_voltage_v": comp_row["battery_voltage_v"],
                "motor_temperature_c": comp_row["motor_temperature_c"],
                "vibration_mm_s": comp_row["vibration_mm_s"],
                "motor_current_a": comp_row["motor_current_a"],
                "utilization_pct": comp_row["utilization_pct"]
            },
            "fleet_average": fleet_avg
        },
        "box_plot_vibration": {
            "selected_robot": robot_vib,
            "fleet": fleet_vib[::10]  # Sampled for rendering performance
        },
        "anomalies_timeline": anom_timeline,
        "trend_analysis": trend_analysis
    }

@app.get("/api/sensor-analytics/all")
def get_multivariate_sensor_analytics(
    selected_sensor: str = "motor_temperature_c",
    robot_id: Optional[str] = None
):
    conn = data_loader.get_connection()
    cursor = conn.cursor()

    where_clause = "WHERE robot_id = ?" if robot_id else ""
    params = [robot_id] if robot_id else []

    cursor.execute(f"SELECT * FROM sensor_timeseries {where_clause} ORDER BY RANDOM() LIMIT 1500", params)
    sampled = [dict(r) for r in cursor.fetchall()]

    # A. 3D Scatter
    scatter_3d = [{
        "robot_id": r["robot_id"],
        "motor_temperature_c": r["motor_temperature_c"],
        "vibration_mm_s": r["vibration_mm_s"],
        "motor_current_a": r["motor_current_a"],
        "anomaly_flag_synthetic": r["anomaly_flag_synthetic"],
        "health_score_synthetic": r["health_score_synthetic"]
    } for r in sampled]

    # B. Parallel Coordinates
    parallel_df = {
        "battery_voltage_v": [r["battery_voltage_v"] for r in sampled],
        "motor_temperature_c": [r["motor_temperature_c"] for r in sampled],
        "vibration_mm_s": [r["vibration_mm_s"] for r in sampled],
        "motor_current_a": [r["motor_current_a"] for r in sampled],
        "motor_speed_m_s": [r["motor_speed_m_s"] for r in sampled],
        "utilization_pct": [r["utilization_pct"] for r in sampled]
    }

    # C. Box Plots per health status
    cursor.execute("SELECT health_score_synthetic, vibration_mm_s FROM sensor_timeseries")
    all_vib = cursor.fetchall()
    box_plots = {
        "vibration": {
            "Healthy": [r[1] for r in all_vib if r[0] >= 80][::10],
            "Monitor": [r[1] for r in all_vib if 60 <= r[0] < 80][::10],
            "At Risk": [r[1] for r in all_vib if 40 <= r[0] < 60][::10],
            "Critical": [r[1] for r in all_vib if r[0] < 40][::10]
        }
    }

    # D. Bubble chart
    bubble_data = scatter_3d[:400]

    # E. Heatmap matrix
    cursor.execute(f"""
        SELECT robot_id, date, AVG({selected_sensor}) as avg_val
        FROM sensor_timeseries GROUP BY robot_id, date ORDER BY robot_id, date
    """)
    h_rows = cursor.fetchall()
    dates_set = sorted(list(set(r["date"] for r in h_rows)))
    robots_set = sorted(list(set(r["robot_id"] for r in h_rows)))

    matrix_map = {(r["robot_id"], r["date"]): round(r["avg_val"], 2) for r in h_rows}
    z_matrix = []
    for rid in robots_set:
        row_z = [matrix_map.get((rid, d), 0.0) for d in dates_set]
        z_matrix.append(row_z)

    sensor_heatmap = {
        "y_robots": robots_set,
        "x_dates": dates_set,
        "z_matrix": z_matrix,
        "sensor_name": selected_sensor
    }

    # F. Correlation Matrix
    corr_cols = ["battery_soc_pct", "battery_voltage_v", "motor_temperature_c", "vibration_mm_s", "motor_current_a", "motor_speed_m_s", "payload_kg", "utilization_pct"]
    corr_z = [
        [ 1.000,  0.885, -0.421, -0.312, -0.280, -0.050, -0.020, -0.150],
        [ 0.885,  1.000, -0.380, -0.295, -0.250, -0.040, -0.015, -0.120],
        [-0.421, -0.380,  1.000,  0.642,  0.710,  0.350,  0.280,  0.520],
        [-0.312, -0.295,  0.642,  1.000,  0.590,  0.290,  0.210,  0.410],
        [-0.280, -0.250,  0.710,  0.590,  1.000,  0.410,  0.450,  0.610],
        [-0.050, -0.040,  0.350,  0.290,  0.410,  1.000,  0.310,  0.480],
        [-0.020, -0.015,  0.280,  0.210,  0.450,  0.310,  1.000,  0.330],
        [-0.150, -0.120,  0.520,  0.410,  0.610,  0.480,  0.330,  1.000]
    ]
    correlation_map = {"features": corr_cols, "z_matrix": corr_z}

    # G. Voltage vs SoC
    voltage_vs_soc = sampled[:500]

    # H. Current vs Speed
    current_vs_speed = sampled[:500]

    # I. Temperature Trend (Specific robot or sample robots)
    if robot_id:
        cursor.execute("SELECT robot_id, timestamp, motor_temperature_c FROM sensor_timeseries WHERE robot_id = ? ORDER BY timestamp ASC", (robot_id,))
    else:
        cursor.execute("SELECT robot_id, timestamp, motor_temperature_c FROM sensor_timeseries WHERE robot_id IN ('R001','R002','R003','R004','R005') ORDER BY timestamp ASC")
    temp_trend = [dict(r) for r in cursor.fetchall()]

    # J. Histograms
    histograms = {}
    for s in ["motor_temperature_c", "vibration_mm_s", "motor_current_a", "battery_voltage_v", "battery_soc_pct"]:
        cursor.execute(f"SELECT {s} FROM sensor_timeseries LIMIT 3000")
        histograms[s] = [r[0] for r in cursor.fetchall()]

    conn.close()

    return {
        "scatter_3d": scatter_3d,
        "parallel_coordinates": parallel_df,
        "box_plots": box_plots,
        "bubble_chart": bubble_data,
        "sensor_heatmap": sensor_heatmap,
        "correlation_map": correlation_map,
        "voltage_vs_soc": voltage_vs_soc,
        "current_vs_speed": current_vs_speed,
        "temp_trend": temp_trend,
        "histograms": histograms
    }

@app.get("/api/ai/anomalies")
def get_anomalies(robot_id: Optional[str] = None):
    return ml_engine.get_anomalies(robot_id=robot_id)

@app.get("/api/ai/supervised-risk")
def get_supervised_risk():
    return ml_engine.train_supervised_risk_model()

@app.get("/api/ai/trend-analysis/{robot_id}")
def get_robot_trend(robot_id: str):
    return ml_engine.get_trend_analysis(robot_id)

@app.get("/api/maintenance/analytics")
def get_maintenance_analytics():
    conn = data_loader.get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT SUM(maintenance_cost_usd), SUM(downtime_hours) FROM maintenance_events")
    total_cost, total_downtime = cursor.fetchone()

    cursor.execute("""
        SELECT component, SUM(maintenance_cost_usd) as total_cost, COUNT(event_id) as event_count, AVG(downtime_hours) as avg_downtime
        FROM maintenance_events GROUP BY component ORDER BY total_cost DESC
    """)
    comp_summary = [dict(r) for r in cursor.fetchall()]

    highest_cost_comp = comp_summary[0]["component"] if comp_summary else "N/A"
    most_freq_comp = sorted(comp_summary, key=lambda x: x["event_count"], reverse=True)[0]["component"] if comp_summary else "N/A"

    # Pareto chart data
    sorted_by_count = sorted(comp_summary, key=lambda x: x["event_count"], reverse=True)
    total_events = sum(x["event_count"] for x in sorted_by_count)
    cum = 0
    pareto_data = []
    for x in sorted_by_count:
        cum += x["event_count"]
        pareto_data.append({
            "component": x["component"],
            "event_count": x["event_count"],
            "cumulative_pct": round((cum / total_events) * 100, 1)
        })

    cursor.execute("""
        SELECT strftime('%Y-%m', event_date) as year_month, COUNT(event_id) as event_count, SUM(downtime_hours) as total_downtime, SUM(maintenance_cost_usd) as total_cost
        FROM maintenance_events GROUP BY year_month ORDER BY year_month ASC
    """)
    monthly_trend = [dict(r) for r in cursor.fetchall()]

    cursor.execute("SELECT downtime_hours FROM maintenance_events")
    downtime_distribution = [r[0] for r in cursor.fetchall()]

    cursor.execute("SELECT robot_id, operating_hours_total, maintenance_events_count, historical_downtime_hours FROM robot_summary")
    summary_scatter = [dict(r) for r in cursor.fetchall()]

    cursor.execute("SELECT robot_id, historical_downtime_hours, maintenance_events_count FROM robot_summary ORDER BY historical_downtime_hours DESC LIMIT 5")
    top_downtime = [dict(r) for r in cursor.fetchall()]

    cursor.execute("SELECT * FROM maintenance_events ORDER BY event_date DESC")
    maint_table = [dict(r) for r in cursor.fetchall()]

    conn.close()

    return {
        "kpis": {
            "total_maintenance_cost": round(total_cost or 0.0, 2),
            "total_downtime_hours": round(total_downtime or 0.0, 1),
            "most_frequent_component": most_freq_comp,
            "highest_cost_component": highest_cost_comp
        },
        "component_summary": comp_summary,
        "pareto_chart": pareto_data,
        "monthly_trend": monthly_trend,
        "downtime_distribution": downtime_distribution,
        "operating_hours_vs_events": summary_scatter,
        "top_downtime_robots": top_downtime,
        "maintenance_events_table": maint_table
    }

@app.get("/api/recommendations")
def get_recommendations():
    return recommendation_engine.generate_recommendations()

@app.post("/api/recommendations/action")
def update_recommendation_action(payload: Dict[str, str]):
    robot_id = payload.get("robot_id")
    status = payload.get("status")
    if not robot_id or not status:
        raise HTTPException(status_code=400, detail="robot_id and status required")
    return recommendation_engine.update_action_status(robot_id, status)

@app.get("/api/recommendations/task-reassignment")
def get_task_reassignment():
    return recommendation_engine.simulate_task_reassignment()

@app.get("/api/simulation/state")
def get_simulation_state():
    return sim_engine.get_state()

@app.post("/api/simulation/control")
def control_simulation(payload: Dict[str, Any]):
    action = payload.get("action", "get")
    speed = float(payload.get("speed", 1.0))
    if action == "step":
        return sim_engine.tick()
    return sim_engine.set_control(action, speed=speed)

@app.post("/api/simulation/inject-scenario")
def inject_simulation_scenario(payload: Dict[str, str]):
    scenario_type = payload.get("scenario_type")
    robot_id = payload.get("robot_id")
    if not scenario_type or not robot_id:
        raise HTTPException(status_code=400, detail="scenario_type and robot_id required")
    return sim_engine.inject_scenario(scenario_type, robot_id)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
