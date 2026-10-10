import React, { useEffect, useState } from 'react';
import { 
  ShieldAlert, 
  ArrowRight, 
  RotateCw, 
  Info
} from 'lucide-react';
import type { Recommendation, TaskReassignment } from '../types';

export const FleetCoordinatorPage: React.FC = () => {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [reassignmentData, setReassignmentData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');

  const fetchCoordinatorData = () => {
    setLoading(true);
    Promise.all([
      fetch('/api/recommendations').then((r) => r.json()),
      fetch('/api/recommendations/task-reassignment').then((r) => r.json())
    ])
      .then(([recs, reassign]) => {
        setRecommendations(recs);
        setReassignmentData(reassign);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchCoordinatorData();
  }, []);

  const handleUpdateStatus = (robotId: string, newStatus: "Acknowledged" | "Executed") => {
    fetch('/api/recommendations/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ robot_id: robotId, status: newStatus })
    })
      .then((res) => res.json())
      .then(() => fetchCoordinatorData());
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[600px]">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
          <p className="text-sm font-semibold text-indigo-400">Evaluating Fleet Recommendations & Task Reassignment Heuristics...</p>
        </div>
      </div>
    );
  }

  if (error || !recommendations) {
    return (
      <div className="p-8 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-300">
        <p className="font-bold">Error loading coordinator data:</p>
        <p className="text-sm">{error || 'No recommendations'}</p>
      </div>
    );
  }

  const filteredRecs = recommendations.filter((r) => priorityFilter === 'ALL' || r.priority === priorityFilter);

  const priorityBadge = (priority: string) => {
    switch (priority) {
      case 'Critical': return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      case 'High': return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'Medium': return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
      default: return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    }
  };

  return (
    <div className="p-6 space-y-8 max-w-[1600px] mx-auto">
      {/* Page Header */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-950/50 via-slate-900 to-purple-950/50 border border-indigo-500/30 flex items-start space-x-4">
        <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-xl">
          <ShieldAlert size={24} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Fleet Coordinator & Task Reassignment Engine</h2>
          <p className="text-xs text-slate-300 mt-1 max-w-4xl">
            Prioritized actionable fleet management recommendations based on health scores, multi-sensor thresholds, and unsupervised anomaly scores. Includes automated task reassignment simulation to optimize fleet continuity.
          </p>
        </div>
      </div>

      {/* Threshold Documentation Panel */}
      <div className="industrial-card p-5 border-l-4 border-l-amber-500">
        <h4 className="text-sm font-bold text-white mb-2 flex items-center space-x-2">
          <Info size={16} className="text-amber-400" />
          <span>Configurable Decision Thresholds</span>
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs text-slate-300">
          <div>
            <span className="font-semibold text-rose-400">Critical Priority:</span> Temp &ge; 85°C OR Vib &ge; 6.0 mm/s OR Health &lt; 40
          </div>
          <div>
            <span className="font-semibold text-amber-400">High Priority:</span> Temp &ge; 78°C OR Vib &ge; 4.5 mm/s OR Anomaly &gt; 70
          </div>
          <div>
            <span className="font-semibold text-cyan-400">Medium Priority:</span> Temp &ge; 70°C OR Vib &ge; 3.0 mm/s OR Health 60-79
          </div>
          <div>
            <span className="font-semibold text-emerald-400">Low Priority:</span> Telemetry within nominal operating bounds
          </div>
        </div>
      </div>

      {/* SECTION 1: Actionable Recommendations List */}
      <div className="industrial-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <h3 className="text-lg font-bold text-white">Actionable Fleet Recommendations</h3>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              {recommendations.length} Robots Evaluated
            </span>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-400 font-medium">Priority Filter:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-slate-800 text-white border border-slate-700 rounded-lg px-2.5 py-1 font-semibold outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900">All Priorities</option>
              <option value="Critical" className="bg-slate-900">Critical</option>
              <option value="High" className="bg-slate-900">High</option>
              <option value="Medium" className="bg-slate-900">Medium</option>
              <option value="Low" className="bg-slate-900">Low</option>
            </select>
          </div>
        </div>

        {/* Recommendations Table */}
        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/90 text-slate-400 uppercase font-semibold text-[11px] sticky top-0">
              <tr>
                <th className="p-3">Priority</th>
                <th className="p-3">Robot ID</th>
                <th className="p-3">Recommended Action</th>
                <th className="p-3">Trigger Reason</th>
                <th className="p-3">Supporting Telemetry</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredRecs.map((rec) => (
                <tr key={rec.robot_id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${priorityBadge(rec.priority)}`}>
                      {rec.priority}
                    </span>
                  </td>
                  <td className="p-3 font-bold text-white">{rec.robot_id}</td>
                  <td className="p-3 font-semibold text-indigo-300">{rec.recommended_action}</td>
                  <td className="p-3 text-slate-300">{rec.reason}</td>
                  <td className="p-3 font-mono text-[11px] text-slate-400">
                    Health: {rec.supporting_telemetry.health_score} | T:{rec.supporting_telemetry.motor_temperature_c}°C | V:{rec.supporting_telemetry.vibration_mm_s}mm/s
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      rec.status === 'Executed' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                      rec.status === 'Acknowledged' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' :
                      'bg-slate-800 text-slate-400'
                    }`}>
                      {rec.status}
                    </span>
                  </td>
                  <td className="p-3 text-right space-x-1.5">
                    {rec.status === 'Pending' && (
                      <button
                        onClick={() => handleUpdateStatus(rec.robot_id, 'Acknowledged')}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-semibold"
                      >
                        Acknowledge
                      </button>
                    )}
                    {rec.status !== 'Executed' && (
                      <button
                        onClick={() => handleUpdateStatus(rec.robot_id, 'Executed')}
                        className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold shadow-sm"
                      >
                        Execute
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 2: Task Reassignment Simulation */}
      {reassignmentData && (
        <div className="industrial-card p-6 space-y-4 border-l-4 border-l-emerald-500">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <RotateCw className="text-emerald-400 animate-spin-slow" size={20} />
                <span>Task Reassignment Simulator</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Automatically reallocates active tasks from unhealthy or maintenance-flagged robots to optimal standby units.
              </p>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold">
              Prevented Downtime: {reassignmentData.estimated_fleet_downtime_prevented_hours} hours
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/90 text-slate-400 uppercase font-semibold text-[11px]">
                <tr>
                  <th className="p-3">Task ID</th>
                  <th className="p-3">Task Name</th>
                  <th className="p-3">Original Robot</th>
                  <th className="p-3">Proposed Robot</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Reassignment Reason</th>
                  <th className="p-3">Workload Impact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {reassignmentData.reassignments.map((item: TaskReassignment, i: number) => (
                  <tr key={i} className="hover:bg-slate-800/50">
                    <td className="p-3 font-bold text-indigo-400">{item.task_id}</td>
                    <td className="p-3 font-semibold text-white">{item.task_name}</td>
                    <td className="p-3 text-slate-300 font-mono">{item.original_robot_id}</td>
                    <td className="p-3 font-mono font-bold text-emerald-400 flex items-center space-x-1.5">
                      <span>{item.original_robot_id}</span>
                      <ArrowRight size={12} className="text-slate-400" />
                      <span>{item.proposed_robot_id}</span>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        item.status_change === 'Reassigned' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                        item.status_change === 'Retained' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                        'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}>
                        {item.status_change}
                      </span>
                    </td>
                    <td className="p-3 text-slate-300">{item.reason}</td>
                    <td className="p-3 text-emerald-300 font-semibold">{item.workload_impact}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
