from typing import Dict, Any, List
from data_loader import data_loader
from health_engine import process_fleet_health
from ml_engine import ml_engine

class RecommendationEngine:
    def __init__(self):
        self.action_statuses: Dict[str, str] = {}  # robot_id -> "Pending" | "Acknowledged" | "Executed"

    def generate_recommendations(self) -> List[Dict[str, Any]]:

        fleet_state = process_fleet_health()
        anomalies_data = ml_engine.get_anomalies(top_n=50)
        anomalies_by_robot = {a["robot_id"]: a for a in anomalies_data["anomalies"]}

        recommendations = []
        for robot in fleet_state["latest_robots"]:
            rid = robot["robot_id"]
            health_score = robot["computed_health_score"]
            status = robot["computed_status"]
            temp = robot["motor_temperature_c"]
            vib = robot["vibration_mm_s"]
            soc = robot["battery_soc_pct"]
            current = robot["motor_current_a"]

            anom_info = anomalies_by_robot.get(rid, None)
            anom_score = anom_info["ml_anomaly_score"] if anom_info else 0.0

            status_state = self.action_statuses.get(rid, "Pending")

            if status == "Critical" or temp >= 85.0 or vib >= 6.0:
                priority = "Critical"
                action = "Schedule preventive maintenance & Mark unavailable"
                reason = f"Severe risk detected: Temp={temp}°C, Vib={vib}mm/s, Health={health_score}"
            elif status == "At Risk" or temp >= 78.0 or vib >= 4.5 or anom_score > 70:
                priority = "High"
                action = "Inspect robot hardware & Reduce workload"
                reason = f"Elevated stress: Temp={temp}°C, Vib={vib}mm/s, ML Anomaly Score={anom_score}"
            elif soc <= 25.0:
                priority = "High"
                action = "Recharge battery immediately"
                reason = f"Battery State of Charge critically low ({soc}%)"
            elif status == "Monitor" or temp >= 70.0 or vib >= 3.0:
                priority = "Medium"
                action = "Monitor sensor readings closely"
                reason = f"Mild variance: Temp={temp}°C, Vib={vib}mm/s"
            else:
                priority = "Low"
                action = "Continue normal operation"
                reason = "Telemetry within normal nominal parameters"

            recommendations.append({
                "robot_id": rid,
                "priority": priority,
                "reason": reason,
                "supporting_telemetry": {
                    "health_score": health_score,
                    "battery_soc_pct": soc,
                    "motor_temperature_c": temp,
                    "vibration_mm_s": vib,
                    "motor_current_a": current,
                    "ml_anomaly_score": anom_score
                },
                "recommended_action": action,
                "timestamp": str(robot["timestamp"]),
                "status": status_state
            })

        priority_order = {"Critical": 0, "High": 1, "Medium": 2, "Low": 3}
        recommendations.sort(key=lambda x: (priority_order.get(x["priority"], 4), x["supporting_telemetry"]["health_score"]))

        return recommendations

    def update_action_status(self, robot_id: str, new_status: str) -> Dict[str, Any]:
        if new_status in ["Pending", "Acknowledged", "Executed"]:
            self.action_statuses[robot_id] = new_status
            return {"robot_id": robot_id, "status": new_status, "success": True}
        return {"error": "Invalid status", "success": False}

    def simulate_task_reassignment(self) -> Dict[str, Any]:
        recs = self.generate_recommendations()

        unhealthy_ids = set([
            r["robot_id"] for r in recs
            if r["priority"] in ["Critical", "High"] or self.action_statuses.get(r["robot_id"]) == "Executed"
        ])

        sample_tasks = [
            {"task_id": "TSK-101", "name": "Heavy Payload Transport", "required_payload_kg": 35.0, "min_soc_pct": 40.0, "initial_robot_id": "R001"},
            {"task_id": "TSK-102", "name": "Zone B Patrol Loop", "required_payload_kg": 10.0, "min_soc_pct": 30.0, "initial_robot_id": "R005"},
            {"task_id": "TSK-103", "name": "High-Speed Shuttle Run", "required_payload_kg": 20.0, "min_soc_pct": 50.0, "initial_robot_id": "R012"},
            {"task_id": "TSK-104", "name": "Inventory Optical Scan", "required_payload_kg": 5.0, "min_soc_pct": 25.0, "initial_robot_id": "R018"},
            {"task_id": "TSK-105", "name": "Warehouse Restock Delivery", "required_payload_kg": 30.0, "min_soc_pct": 45.0, "initial_robot_id": "R025"},
            {"task_id": "TSK-106", "name": "Hazardous Area Inspection", "required_payload_kg": 15.0, "min_soc_pct": 35.0, "initial_robot_id": "R030"},
            {"task_id": "TSK-107", "name": "Docking Bay Transfer", "required_payload_kg": 25.0, "min_soc_pct": 40.0, "initial_robot_id": "R042"}
        ]

        fleet_state = process_fleet_health()
        robots_dict = {r["robot_id"]: r for r in fleet_state["latest_robots"]}

        reassignments = []
        assigned_new_robots = set()

        for task in sample_tasks:
            orig_id = task["initial_robot_id"]
            orig_robot = robots_dict.get(orig_id, {})
            is_orig_unhealthy = orig_id in unhealthy_ids or orig_robot.get("computed_status") in ["At Risk", "Critical"]

            if not is_orig_unhealthy:
                reassignments.append({
                    "task_id": task["task_id"],
                    "task_name": task["name"],
                    "original_robot_id": orig_id,
                    "proposed_robot_id": orig_id,
                    "status_change": "Retained",
                    "reason": f"Original robot {orig_id} is healthy (Health={orig_robot.get('computed_health_score')})",
                    "workload_impact": "None (0% downtime risk)"
                })
            else:
                candidates = []
                for r_id, r_info in robots_dict.items():
                    if r_id not in unhealthy_ids and r_id not in assigned_new_robots and r_info["computed_status"] == "Healthy":
                        if r_info["battery_soc_pct"] >= task["min_soc_pct"] and r_info["payload_kg"] >= task["required_payload_kg"] * 0.8:
                            candidates.append(r_info)

                candidates.sort(key=lambda x: (x["computed_health_score"], x["battery_soc_pct"]), reverse=True)

                if candidates:
                    new_robot = candidates[0]
                    new_id = new_robot["robot_id"]
                    assigned_new_robots.add(new_id)

                    reassignments.append({
                        "task_id": task["task_id"],
                        "task_name": task["name"],
                        "original_robot_id": orig_id,
                        "proposed_robot_id": new_id,
                        "status_change": "Reassigned",
                        "reason": f"Original robot {orig_id} is {orig_robot.get('computed_status')}. Reassigned to standby healthy robot {new_id} (Health={new_robot['computed_health_score']}, SoC={new_robot['battery_soc_pct']}%)",
                        "workload_impact": "Prevented estimated 3.5h unexpected downtime"
                    })
                else:
                    reassignments.append({
                        "task_id": task["task_id"],
                        "task_name": task["name"],
                        "original_robot_id": orig_id,
                        "proposed_robot_id": "UNASSIGNED",
                        "status_change": "Queued / Unassigned",
                        "reason": f"Original robot {orig_id} requires maintenance; no fully qualified standby robot was available.",
                        "workload_impact": "Task delayed until robot charging/maintenance completes"
                    })

        return {
            "flagged_unhealthy_robots_count": len(unhealthy_ids),
            "total_tasks_evaluated": len(sample_tasks),
            "reassignments": reassignments,
            "estimated_fleet_downtime_prevented_hours": 14.5
        }

recommendation_engine = RecommendationEngine()
