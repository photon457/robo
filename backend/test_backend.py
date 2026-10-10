import sys
import os
import unittest

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from data_loader import data_loader
from health_engine import compute_health_score, process_fleet_health
from ml_engine import ml_engine
from recommendation_engine import recommendation_engine
from simulation_engine import sim_engine

class TestBackendDataScience(unittest.TestCase):

    def test_01_data_loading_and_validation(self):
        report = data_loader.get_validation_report()
        self.assertEqual(report["sensor_timeseries"]["rows"], 36000, "Sensor timeseries should have 36,000 rows")
        self.assertEqual(report["robot_summary"]["rows"], 50, "Robot summary should have 50 robots")
        self.assertGreater(report["maintenance_events"]["rows"], 0, "Maintenance events should not be empty")

        self.assertTrue(report["integrity_checks"]["schema_valid"])
        self.assertTrue(report["integrity_checks"]["relationship_robot_ids_match"])

    def test_02_health_score_calculation(self):
        res_opt = compute_health_score(soc=100.0, voltage=25.0, temp=50.0, vib=1.0, current=10.0)
        self.assertGreaterEqual(res_opt["health_score"], 95.0)
        self.assertEqual(res_opt["status"], "Healthy")

        res_crit = compute_health_score(soc=15.0, voltage=20.0, temp=95.0, vib=8.5, current=36.0)
        self.assertLess(res_crit["health_score"], 40.0)
        self.assertEqual(res_crit["status"], "Critical")

    def test_03_fleet_health_processing(self):
        result = process_fleet_health()
        kpis = result["kpis"]
        self.assertEqual(kpis["total_robots"], 50)
        self.assertEqual(
            kpis["healthy_robots"] + kpis["monitor_robots"] + kpis["at_risk_robots"] + kpis["critical_robots"],
            50
        )

    def test_04_anomaly_detection_isolation_forest(self):
        anomalies = ml_engine.get_anomalies(top_n=10)
        self.assertIn("total_anomalies_detected", anomalies)
        self.assertGreater(anomalies["total_anomalies_detected"], 0)
        self.assertTrue(len(anomalies["anomalies"]) > 0)

    def test_05_supervised_risk_model(self):
        model_out = ml_engine.train_supervised_risk_model()
        self.assertIn("metrics", model_out)
        self.assertIn("f1_score", model_out["metrics"])
        self.assertIn("pr_auc", model_out["metrics"])

    def test_06_recommendation_and_task_reassignment(self):
        recs = recommendation_engine.generate_recommendations()
        self.assertEqual(len(recs), 50)

        reassignment = recommendation_engine.simulate_task_reassignment()
        self.assertIn("reassignments", reassignment)
        self.assertGreater(len(reassignment["reassignments"]), 0)

    def test_07_simulation_engine(self):
        sim_state = sim_engine.get_state()
        self.assertIn("robots", sim_state)
        self.assertEqual(len(sim_state["robots"]), 50)

        tick_state = sim_engine.tick()
        self.assertEqual(tick_state["step_count"], 1)

if __name__ == "__main__":
    unittest.main()
