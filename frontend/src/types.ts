export interface FleetKPIs {
  total_robots: number;
  healthy_robots: number;
  monitor_robots: number;
  at_risk_robots: number;
  critical_robots: number;
  avg_fleet_health: number;
  robots_with_recent_anomalies: number;
  pending_recommendations: number;
  total_recorded_downtime: number;
  avg_battery_soc: number;
}

export interface RobotTelemetry {
  robot_id: string;
  timestamp: string;
  battery_soc_pct: number;
  battery_voltage_v: number;
  motor_temperature_c: number;
  vibration_mm_s: number;
  motor_current_a: number;
  motor_speed_m_s: number;
  payload_kg: number;
  utilization_pct: number;
  task_active: number;
  charging: number;
  computed_health_score: number;
  computed_status: "Healthy" | "Monitor" | "At Risk" | "Critical";
  health_score_synthetic?: number;
  anomaly_flag_synthetic?: number;
}

export interface MaintenanceEvent {
  event_id: string;
  robot_id: string;
  event_date: string;
  component: string;
  event_type: string;
  downtime_hours: number;
  maintenance_cost_usd: number;
}

export interface Recommendation {
  robot_id: string;
  priority: "Critical" | "High" | "Medium" | "Low";
  reason: string;
  supporting_telemetry: {
    health_score: number;
    battery_soc_pct: number;
    motor_temperature_c: number;
    vibration_mm_s: number;
    motor_current_a: number;
    ml_anomaly_score: number;
  };
  recommended_action: string;
  timestamp: string;
  status: "Pending" | "Acknowledged" | "Executed";
}

export interface TaskReassignment {
  task_id: string;
  task_name: string;
  original_robot_id: string;
  proposed_robot_id: string;
  status_change: "Retained" | "Reassigned" | "Queued / Unassigned";
  reason: string;
  workload_impact: string;
}

export interface SimulationState {
  running: boolean;
  speed: number;
  step_count: number;
  scenario_active: string | null;
  scenario_target_robot: string | null;
  kpis: {
    total_robots: number;
    healthy: number;
    monitor: number;
    at_risk: number;
    critical: number;
    avg_health: number;
    avg_soc: number;
  };
  robots: RobotTelemetry[];
  event_log: Array<{
    timestamp: string;
    event_type: string;
    robot_id: string;
    message: string;
  }>;
}
