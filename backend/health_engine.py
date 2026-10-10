import math
import statistics
from typing import Dict, Any, List
from data_loader import data_loader

def clamp(val: float, min_val: float, max_val: float) -> float:
    return max(min_val, min(max_val, val))

def calculate_normalized_factors(soc: float, voltage: float, temp: float, vib: float, current: float) -> Dict[str, float]:
    b_soc = clamp((soc - 15.0) / 85.0, 0.0, 1.0)
    b_volt = clamp((voltage - 21.0) / 4.5, 0.0, 1.0)
    B = float(b_soc * b_volt)

    T = float(clamp((95.0 - temp) / 40.0, 0.0, 1.0))
    V = float(clamp((8.0 - vib) / 6.5, 0.0, 1.0))
    I = float(clamp((35.0 - current) / 25.0, 0.0, 1.0))

    return {"B": round(B, 4), "T": round(T, 4), "V": round(V, 4), "I": round(I, 4)}

def compute_health_score(soc: float, voltage: float, temp: float, vib: float, current: float) -> Dict[str, Any]:
    factors = calculate_normalized_factors(soc, voltage, temp, vib, current)
    score = 100.0 * (0.28 * factors["B"] + 0.26 * factors["T"] + 0.26 * factors["V"] + 0.20 * factors["I"])
    score = round(clamp(score, 0.0, 100.0), 2)

    if score >= 80.0:
        status = "Healthy"
    elif score >= 60.0:
        status = "Monitor"
    elif score >= 40.0:
        status = "At Risk"
    else:
        status = "Critical"

    return {
        "health_score": score,
        "status": status,
        "factors": factors
    }

def process_fleet_health(time_window: str = "all", robot_id: str = None) -> Dict[str, Any]:
    conn = data_loader.get_connection()
    cursor = conn.cursor()

    # Determine window cutoff
    if time_window == "24h":
        cursor.execute("SELECT MAX(timestamp) FROM sensor_timeseries")
        max_ts = cursor.fetchone()[0]
        query_where = "WHERE timestamp >= datetime(?, '-24 hours')"
        params = [max_ts]
    elif time_window == "7d":
        cursor.execute("SELECT MAX(timestamp) FROM sensor_timeseries")
        max_ts = cursor.fetchone()[0]
        query_where = "WHERE timestamp >= datetime(?, '-7 days')"
        params = [max_ts]
    else:
        query_where = ""
        params = []

    # Get latest reading for each robot
    sql = f"""
        SELECT s.*, rs.operating_hours_total, rs.historical_downtime_hours
        FROM sensor_timeseries s
        INNER JOIN (
            SELECT robot_id, MAX(timestamp) as max_ts
            FROM sensor_timeseries
            {query_where}
            GROUP BY robot_id
        ) latest ON s.robot_id = latest.robot_id AND s.timestamp = latest.max_ts
        LEFT JOIN robot_summary rs ON s.robot_id = rs.robot_id
    """
    cursor.execute(sql, params)
    latest_rows = cursor.fetchall()

    latest_robots = []
    status_counts = {"Healthy": 0, "Monitor": 0, "At Risk": 0, "Critical": 0}
    health_scores = []
    socs = []

    for row in latest_rows:
        dict_row = dict(row)
        hs_info = compute_health_score(
            dict_row["battery_soc_pct"], dict_row["battery_voltage_v"],
            dict_row["motor_temperature_c"], dict_row["vibration_mm_s"], dict_row["motor_current_a"]
        )
        dict_row["computed_health_score"] = hs_info["health_score"]
        dict_row["computed_status"] = hs_info["status"]
        latest_robots.append(dict_row)

        status_counts[hs_info["status"]] += 1
        health_scores.append(hs_info["health_score"])
        socs.append(dict_row["battery_soc_pct"])

    total_robots = len(latest_robots)
    avg_fleet_health = round(statistics.mean(health_scores), 2) if health_scores else 0.0
    avg_soc = round(statistics.mean(socs), 1) if socs else 0.0

    # Count recent anomalies in 24h
    cursor.execute("SELECT MAX(timestamp) FROM sensor_timeseries")
    max_ts = cursor.fetchone()[0]
    cursor.execute("""
        SELECT COUNT(DISTINCT robot_id) FROM sensor_timeseries
        WHERE anomaly_flag_synthetic = 1 AND timestamp >= datetime(?, '-24 hours')
    """, (max_ts,))
    recent_anomalies_count = cursor.fetchone()[0]

    # Total recorded downtime
    cursor.execute("SELECT SUM(downtime_hours) FROM maintenance_events")
    total_downtime = round(cursor.fetchone()[0] or 0.0, 1)

    pending_recs = status_counts["At Risk"] + status_counts["Critical"]

    conn.close()

    return {
        "kpis": {
            "total_robots": total_robots,
            "healthy_robots": status_counts["Healthy"],
            "monitor_robots": status_counts["Monitor"],
            "at_risk_robots": status_counts["At Risk"],
            "critical_robots": status_counts["Critical"],
            "avg_fleet_health": avg_fleet_health,
            "robots_with_recent_anomalies": recent_anomalies_count,
            "pending_recommendations": pending_recs,
            "total_recorded_downtime": total_downtime,
            "avg_battery_soc": avg_soc
        },
        "latest_robots": latest_robots,
        "time_window": time_window
    }
