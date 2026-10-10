import sqlite3
import os
import random
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from data_loader import data_loader
from health_engine import compute_health_score

DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "fleet_sim.db"))

class SimulationEngine:
    def __init__(self):
        self.running = False
        self.speed = 1.0
        self.step_count = 0
        self.scenario_active = None
        self.scenario_target_robot = None
        self.scenario_ticks_left = 0
        self.event_log: List[Dict[str, Any]] = []
        self._init_db()
        self.reset_to_base_csv()

    def _init_db(self):
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS sim_telemetry (
                robot_id TEXT PRIMARY KEY,
                timestamp TEXT,
                battery_soc_pct REAL,
                battery_voltage_v REAL,
                motor_temperature_c REAL,
                vibration_mm_s REAL,
                motor_current_a REAL,
                motor_speed_m_s REAL,
                payload_kg REAL,
                utilization_pct REAL,
                task_active INTEGER,
                charging INTEGER,
                computed_health_score REAL,
                computed_status TEXT
            )
        """)
        conn.commit()
        conn.close()

    def reset_to_base_csv(self):
        self.running = False
        self.step_count = 0
        self.scenario_active = None
        self.scenario_target_robot = None
        self.scenario_ticks_left = 0
        self.event_log = []

        conn_data = data_loader.get_connection()
        cursor_data = conn_data.cursor()
        cursor_data.execute("""
            SELECT s.* FROM sensor_timeseries s
            INNER JOIN (
                SELECT robot_id, MAX(timestamp) as max_ts
                FROM sensor_timeseries GROUP BY robot_id
            ) latest ON s.robot_id = latest.robot_id AND s.timestamp = latest.max_ts
        """)
        latest_rows = [dict(r) for r in cursor_data.fetchall()]
        conn_data.close()

        conn_sim = sqlite3.connect(DB_PATH)
        cursor_sim = conn_sim.cursor()
        cursor_sim.execute("DELETE FROM sim_telemetry")

        records = []
        for r in latest_rows:
            hs_info = compute_health_score(
                r["battery_soc_pct"], r["battery_voltage_v"],
                r["motor_temperature_c"], r["vibration_mm_s"], r["motor_current_a"]
            )
            records.append((
                r["robot_id"], str(r["timestamp"]),
                r["battery_soc_pct"], r["battery_voltage_v"],
                r["motor_temperature_c"], r["vibration_mm_s"],
                r["motor_current_a"], r["motor_speed_m_s"],
                r["payload_kg"], r["utilization_pct"],
                r["task_active"], r["charging"],
                hs_info["health_score"], hs_info["status"]
            ))

        cursor_sim.executemany("INSERT INTO sim_telemetry VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)", records)
        conn_sim.commit()
        conn_sim.close()

        self.add_log_entry("RESET", "SYSTEM", "Simulation reset to baseline dataset state.")

    def add_log_entry(self, event_type: str, robot_id: str, message: str):
        entry = {
            "timestamp": datetime.now().strftime("%H:%M:%S"),
            "event_type": event_type,
            "robot_id": robot_id,
            "message": message
        }
        self.event_log.insert(0, entry)
        if len(self.event_log) > 100:
            self.event_log.pop()

    def set_control(self, action: str, speed: float = 1.0) -> Dict[str, Any]:
        if action == "start":
            self.running = True
            self.add_log_entry("CONTROL", "SYSTEM", f"Simulation started at speed {speed}x")
        elif action == "pause":
            self.running = False
            self.add_log_entry("CONTROL", "SYSTEM", "Simulation paused")
        elif action == "resume":
            self.running = True
            self.add_log_entry("CONTROL", "SYSTEM", "Simulation resumed")
        elif action == "reset":
            self.reset_to_base_csv()
        self.speed = speed
        return self.get_state()

    def inject_scenario(self, scenario_type: str, robot_id: str) -> Dict[str, Any]:
        self.scenario_active = scenario_type
        self.scenario_target_robot = robot_id
        self.scenario_ticks_left = 10
        self.add_log_entry("SCENARIO_INJECTED", robot_id, f"Injected fault scenario: '{scenario_type}' targeting {robot_id} for 10 ticks.")
        return {"success": True, "scenario": scenario_type, "robot_id": robot_id}

    def tick(self) -> Dict[str, Any]:
        self.step_count += 1
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM sim_telemetry")
        rows = [dict(r) for r in cursor.fetchall()]

        updated_records = []
        for r in rows:
            rid = r["robot_id"]
            curr_ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            soc = r["battery_soc_pct"]
            volt = r["battery_voltage_v"]
            temp = r["motor_temperature_c"]
            vib = r["vibration_mm_s"]
            current = r["motor_current_a"]
            speed = r["motor_speed_m_s"]
            payload = r["payload_kg"]
            util = r["utilization_pct"]
            charging = r["charging"]
            task_active = r["task_active"]

            # Fault Scenario Handling
            if self.scenario_active and rid == self.scenario_target_robot and self.scenario_ticks_left > 0:
                if self.scenario_active == "Thermal Surge":
                    temp = min(96.0, temp + 4.5)
                    current = min(36.0, current + 2.0)
                elif self.scenario_active == "Vibration Fault":
                    vib = min(8.5, vib + 1.2)
                    temp = min(88.0, temp + 1.5)
                elif self.scenario_active == "Rapid Battery Drain":
                    soc = max(5.0, soc - 8.0)
                    volt = max(20.5, volt - 0.4)

            # Physics Update
            if charging == 1:
                soc = min(100.0, soc + 2.5)
                volt = min(25.4, 21.0 + (soc / 100.0) * 4.4)
                temp = max(35.0, temp - 0.8)
                current = max(2.0, current - 0.5)
                vib = max(0.5, vib - 0.1)
                if soc >= 98.0:
                    charging = 0
                    task_active = 1
                    self.add_log_entry("STATUS_CHANGE", rid, f"Robot {rid} battery fully charged ({soc:.1f}%). Resuming active task.")
            else:
                soc = max(5.0, soc - random.uniform(0.2, 0.6))
                volt = max(20.5, 21.0 + (soc / 100.0) * 4.4)
                if soc <= 18.0:
                    charging = 1
                    task_active = 0
                    self.add_log_entry("LOW_BATTERY", rid, f"Robot {rid} battery low ({soc:.1f}%). Routing to charging station.")

                temp = max(35.0, min(98.0, temp + random.uniform(-0.4, 0.4)))
                vib = max(0.4, min(9.0, vib + random.uniform(-0.15, 0.15)))
                current = max(5.0, min(38.0, current + random.uniform(-0.3, 0.3)))

            hs_info = compute_health_score(soc, volt, temp, vib, current)

            updated_records.append((
                rid, curr_ts, round(soc, 2), round(volt, 2),
                round(temp, 2), round(vib, 2), round(current, 2),
                round(speed, 2), round(payload, 2), round(util, 2),
                task_active, charging, hs_info["health_score"], hs_info["status"]
            ))

        if self.scenario_active:
            self.scenario_ticks_left -= 1
            if self.scenario_ticks_left <= 0:
                self.add_log_entry("SCENARIO_ENDED", self.scenario_target_robot, f"Scenario '{self.scenario_active}' completed.")
                self.scenario_active = None
                self.scenario_target_robot = None

        cursor.execute("DELETE FROM sim_telemetry")
        cursor.executemany("INSERT INTO sim_telemetry VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)", updated_records)
        conn.commit()
        conn.close()

        return self.get_state()

    def get_state(self) -> Dict[str, Any]:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM sim_telemetry")
        rows = [dict(r) for r in cursor.fetchall()]
        conn.close()

        healthy = sum(1 for r in rows if r["computed_status"] == "Healthy")
        monitor = sum(1 for r in rows if r["computed_status"] == "Monitor")
        at_risk = sum(1 for r in rows if r["computed_status"] == "At Risk")
        critical = sum(1 for r in rows if r["computed_status"] == "Critical")

        avg_health = round(sum(r["computed_health_score"] for r in rows) / len(rows), 2) if rows else 0.0
        avg_soc = round(sum(r["battery_soc_pct"] for r in rows) / len(rows), 1) if rows else 0.0

        return {
            "running": self.running,
            "speed": self.speed,
            "step_count": self.step_count,
            "scenario_active": self.scenario_active,
            "scenario_target_robot": self.scenario_target_robot,
            "kpis": {
                "total_robots": len(rows),
                "healthy": healthy,
                "monitor": monitor,
                "at_risk": at_risk,
                "critical": critical,
                "avg_health": avg_health,
                "avg_soc": avg_soc
            },
            "robots": rows,
            "event_log": self.event_log[:30]
        }

sim_engine = SimulationEngine()
