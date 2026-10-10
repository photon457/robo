import React, { useEffect, useState } from 'react';
import Plot from 'react-plotly.js';
import { InteractiveChartCard } from '../components/InteractiveChartCard';

const SENSOR_LABELS: Record<string, string> = {
  motor_temperature_c: 'Motor Temperature (°C)',
  vibration_mm_s: 'Vibration Magnitude (mm/s)',
  motor_current_a: 'Motor Current (A)',
  battery_soc_pct: 'Battery State of Charge (%)',
  battery_voltage_v: 'Battery Voltage (V)',
  utilization_pct: 'Utilization (%)',
};
import { 
  Bot, 
  Battery, 
  Thermometer, 
  Activity, 
  Zap, 
  Weight, 
  Wrench, 
  HelpCircle
} from 'lucide-react';

interface RobotExplorerPageProps {
  selectedRobot: string;
  setSelectedRobot: (r: string) => void;
}

export const RobotExplorerPage: React.FC<RobotExplorerPageProps> = ({
  selectedRobot,
  setSelectedRobot,
}) => {
  const robotId = selectedRobot === 'ALL' ? 'R001' : selectedRobot;
  const [compRobot, setCompRobot] = useState<string>('R002');
  const [selectedSensor, setSelectedSensor] = useState<string>('motor_temperature_c');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const robotList = Array.from({ length: 50 }, (_, i) => `R${(i + 1).toString().padStart(3, '0')}`);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/robots/${robotId}?comp_robot_id=${compRobot}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load data for robot ${robotId}`);
        return res.json();
      })
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [robotId, compRobot]);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[600px]">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-14 h-14 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
          <p className="text-base font-bold text-indigo-400">Loading Robot {robotId} Telemetry & History...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-300">
        <p className="font-bold text-lg">Error loading robot details:</p>
        <p className="text-sm">{error || 'No data'}</p>
      </div>
    );
  }

  const {
    latest_telemetry,
    health_info,
    summary_metrics,
    maintenance_history,
    timeseries,
    radar_comparison,
    box_plot_vibration,
    trend_analysis
  } = data;

  const plotlyLayoutDefaults = {
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: { color: '#cbd5e1', family: 'Inter, sans-serif', size: 15 },
    margin: { t: 35, r: 30, l: 55, b: 55 },
    autosize: true,
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'Healthy': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'Monitor': return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
      case 'At Risk': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'Critical': return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
      default: return 'bg-slate-700 text-slate-300';
    }
  };

  return (
    <div className="p-10 space-y-10 max-w-[1800px] mx-auto">
      {/* Top Selector & Summary Header */}
      <div className="industrial-card p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
        <div className="flex items-center space-x-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-black text-3xl shadow-lg shadow-indigo-500/30 shrink-0">
            {robotId}
          </div>
          <div>
            <div className="flex items-center space-x-3">
              <h2 className="text-3xl font-black text-white tracking-tight">Robot Explorer: {robotId}</h2>
              <span className={`px-3.5 py-1 rounded-full text-xs font-black border uppercase tracking-wider ${statusColor(health_info.status)}`}>
                {health_info.status}
              </span>
            </div>
            <p className="text-sm text-slate-400 font-medium mt-1">
              Last Telemetry Record: <span className="text-white font-bold">{latest_telemetry.timestamp}</span> | Total Service Hours: <span className="text-white font-bold">{summary_metrics.operating_hours_total || 'N/A'} hrs</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2.5 bg-slate-800/90 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm">
            <span className="text-slate-400 font-semibold">Select Robot:</span>
            <select
              value={robotId}
              onChange={(e) => setSelectedRobot(e.target.value)}
              className="bg-transparent text-white font-bold outline-none cursor-pointer text-sm"
            >
              {robotList.map((r) => (
                <option key={r} value={r} className="bg-slate-900">{r}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-2.5 bg-slate-800/90 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm">
            <span className="text-slate-400 font-semibold">Compare With:</span>
            <select
              value={compRobot}
              onChange={(e) => setCompRobot(e.target.value)}
              className="bg-transparent text-indigo-400 font-bold outline-none cursor-pointer text-sm"
            >
              <option value="FLEET_AVG" className="bg-slate-900">Fleet Average</option>
              {robotList.filter(r => r !== robotId).map((r) => (
                <option key={r} value={r} className="bg-slate-900">{r}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Telemetry Metrics Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6">
        <div className="industrial-card p-5">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase mb-1">
            <span>Health Score</span>
            <Bot size={18} className="text-indigo-400" />
          </div>
          <div className="text-3xl font-black text-white">{health_info.health_score} <span className="text-sm font-semibold text-slate-400">/ 100</span></div>
          <div className="text-xs text-indigo-400 mt-1 font-bold">Multi-Factor Index</div>
        </div>

        <div className="industrial-card p-5">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase mb-1">
            <span>Battery SoC</span>
            <Battery size={18} className="text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-white">{latest_telemetry.battery_soc_pct}%</div>
          <div className="text-xs font-medium text-slate-400 mt-1">{latest_telemetry.battery_voltage_v} V</div>
        </div>

        <div className="industrial-card p-5">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase mb-1">
            <span>Motor Temp</span>
            <Thermometer size={18} className="text-rose-400" />
          </div>
          <div className="text-3xl font-black text-white">{latest_telemetry.motor_temperature_c}°C</div>
          <div className="text-xs font-medium text-slate-400 mt-1">Normal: &lt;75°C</div>
        </div>

        <div className="industrial-card p-5">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase mb-1">
            <span>Vibration</span>
            <Activity size={18} className="text-amber-400" />
          </div>
          <div className="text-3xl font-black text-white">{latest_telemetry.vibration_mm_s} <span className="text-sm font-semibold text-slate-400">mm/s</span></div>
          <div className="text-xs font-medium text-slate-400 mt-1">Normal: &lt;3.5 mm/s</div>
        </div>

        <div className="industrial-card p-5">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase mb-1">
            <span>Motor Current</span>
            <Zap size={18} className="text-cyan-400" />
          </div>
          <div className="text-3xl font-black text-white">{latest_telemetry.motor_current_a} A</div>
          <div className="text-xs font-medium text-slate-400 mt-1">Speed: {latest_telemetry.motor_speed_m_s} m/s</div>
        </div>

        <div className="industrial-card p-5">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase mb-1">
            <span>Payload / Util</span>
            <Weight size={18} className="text-purple-400" />
          </div>
          <div className="text-3xl font-black text-white">{latest_telemetry.payload_kg} <span className="text-sm font-semibold text-slate-400">kg</span></div>
          <div className="text-xs font-medium text-slate-400 mt-1">Util: {latest_telemetry.utilization_pct}%</div>
        </div>
      </div>

      {/* Trend & Diagnostic Explanation Panel */}
      <div className="industrial-card p-8 border-l-4 border-l-indigo-500 shadow-xl">
        <h4 className="text-base font-black text-white mb-2 flex items-center space-x-2">
          <HelpCircle size={20} className="text-indigo-400" />
          <span>Diagnostic Interpretation & Baseline Delta</span>
        </h4>
        <div className="space-y-2 text-sm text-slate-200 font-medium">
          {trend_analysis.explanation_panel.map((exp: string, idx: number) => (
            <p key={idx} className="flex items-center space-x-2.5">
              <span className="w-2 h-2 rounded-full bg-indigo-400 inline-block shrink-0"></span>
              <span>{exp}</span>
            </p>
          ))}
          <p className="text-xs text-slate-400 italic pt-1">
            * Note: Operational telemetry deviations highlight variance relative to fleet historical baseline parameters.
          </p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Timeseries Plot with Sensor Selector */}
        <InteractiveChartCard
          title="Sensor Telemetry Over Time"
          subtitle={`Hourly ${SENSOR_LABELS[selectedSensor]} readings for ${robotId}`}
          headerRight={
            <select
              value={selectedSensor}
              onChange={(e) => setSelectedSensor(e.target.value)}
              className="bg-slate-800 text-indigo-300 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold outline-none cursor-pointer"
            >
              <option value="motor_temperature_c">Motor Temperature (°C)</option>
              <option value="vibration_mm_s">Vibration Magnitude (mm/s)</option>
              <option value="motor_current_a">Motor Current (A)</option>
              <option value="battery_soc_pct">Battery SoC (%)</option>
              <option value="battery_voltage_v">Battery Voltage (V)</option>
              <option value="utilization_pct">Utilization (%)</option>
            </select>
          }
        >
            <Plot
              data={[
                {
                  x: timeseries.map((t: any) => t.timestamp),
                  y: timeseries.map((t: any) => t[selectedSensor]),
                  type: 'scatter',
                  mode: 'lines',
                  line: { color: '#6366f1', width: 2.5 }
                }
              ]}
              layout={{
                ...plotlyLayoutDefaults,
                title: false,
                xaxis: { title: { text: 'Observation Timestamp (Date & Time)', font: { size: 14 } }, showgrid: false },
                yaxis: { title: { text: SENSOR_LABELS[selectedSensor] || selectedSensor, font: { size: 14 } } }
              }}
              useResizeHandler={true}
              style={{ width: '100%', height: '100%' }}
              config={{ responsive: true, displayModeBar: false }}
            />
        </InteractiveChartCard>

        {/* Health Score Trend Plot */}
        <InteractiveChartCard
          title="Health Score Trend"
          subtitle={`Composite health score trajectory for ${robotId}`}
        >
            <Plot
              data={[
                {
                  x: timeseries.map((t: any) => t.timestamp),
                  y: timeseries.map((t: any) => t.health_score_synthetic),
                  type: 'scatter',
                  mode: 'lines',
                  line: { color: '#10b981', width: 2.5 }
                }
              ]}
              layout={{
                ...plotlyLayoutDefaults,
                title: false,
                xaxis: { title: { text: 'Observation Timestamp (Date & Time)', font: { size: 14 } }, showgrid: false },
                yaxis: { title: { text: 'Composite Health Score (0 - 100)', font: { size: 14 } }, range: [0, 100] }
              }}
              useResizeHandler={true}
              style={{ width: '100%', height: '100%' }}
              config={{ responsive: true, displayModeBar: false }}
            />
        </InteractiveChartCard>

        {/* Box Plot Comparison (Robot vs Fleet) */}
        <InteractiveChartCard
          title={`Vibration Distribution: ${robotId} vs Fleet Baseline`}
          subtitle="Quartiles, median and outliers of vibration readings"
        >
            <Plot
              data={[
                {
                  y: box_plot_vibration.selected_robot,
                  type: 'box',
                  name: robotId,
                  marker: { color: '#f59e0b' }
                },
                {
                  y: box_plot_vibration.fleet,
                  type: 'box',
                  name: 'Entire Fleet (50 Robots)',
                  marker: { color: '#6366f1' }
                }
              ]}
              layout={{
                ...plotlyLayoutDefaults,
                title: false,
                xaxis: { title: { text: 'Comparison Group', font: { size: 14 } } },
                yaxis: { title: { text: 'Vibration Magnitude (mm/s)', font: { size: 14 } } }
              }}
              useResizeHandler={true}
              style={{ width: '100%', height: '100%' }}
              config={{ responsive: true, displayModeBar: false }}
            />
        </InteractiveChartCard>

        {/* Radar Chart Normalized Comparison */}
        <InteractiveChartCard
          title="Multivariate Radar Profile Comparison"
          subtitle={`Radial axis: scaled sensor value (0 - 100). Purple = ${robotId}, Cyan = ${compRobot}`}
        >
            <Plot
              data={[
                {
                  type: 'scatterpolar',
                  r: [
                    radar_comparison.selected_robot.battery_soc_pct,
                    radar_comparison.selected_robot.battery_voltage_v * 4,
                    radar_comparison.selected_robot.motor_temperature_c,
                    radar_comparison.selected_robot.vibration_mm_s * 10,
                    radar_comparison.selected_robot.motor_current_a * 3,
                    radar_comparison.selected_robot.utilization_pct
                  ],
                  theta: ['SoC (%)', 'Voltage (V*4)', 'Temp (°C)', 'Vibration (mm/s*10)', 'Current (A*3)', 'Utilization (%)'],
                  fill: 'toself',
                  name: robotId,
                  marker: { color: '#8b5cf6' }
                },
                {
                  type: 'scatterpolar',
                  r: [
                    radar_comparison.comparison_robot.battery_soc_pct,
                    radar_comparison.comparison_robot.battery_voltage_v * 4,
                    radar_comparison.comparison_robot.motor_temperature_c,
                    radar_comparison.comparison_robot.vibration_mm_s * 10,
                    radar_comparison.comparison_robot.motor_current_a * 3,
                    radar_comparison.comparison_robot.utilization_pct
                  ],
                  theta: ['SoC (%)', 'Voltage (V*4)', 'Temp (°C)', 'Vibration (mm/s*10)', 'Current (A*3)', 'Utilization (%)'],
                  fill: 'toself',
                  name: compRobot,
                  marker: { color: '#06b6d4' }
                }
              ]}
              layout={{
                ...plotlyLayoutDefaults,
                polar: {
                  bgcolor: 'rgba(0,0,0,0)',
                  radialaxis: { visible: true, range: [0, 100], color: '#64748b', title: { text: 'Scaled Value (0-100)' } },
                  angularaxis: { color: '#cbd5e1', font: { size: 12 } }
                },
                showlegend: true,
                legend: { title: { text: 'Robot' } }
              }}
              useResizeHandler={true}
              style={{ width: '100%', height: '100%' }}
              config={{ responsive: true, displayModeBar: false }}
            />
        </InteractiveChartCard>

      </div>

      {/* Maintenance History Table for Selected Robot */}
      <div className="industrial-card p-8">
        <h4 className="text-lg font-black text-white mb-4 flex items-center justify-between">
          <span className="flex items-center space-x-2.5">
            <Wrench size={22} className="text-indigo-400" />
            <span>Maintenance History Log ({robotId})</span>
          </span>
          <span className="text-xs text-slate-300 font-bold uppercase tracking-wider">
            Total Events: {maintenance_history.length} | Historical Downtime: {summary_metrics.historical_downtime_hours || 0} hrs
          </span>
        </h4>

        {maintenance_history.length === 0 ? (
          <p className="text-sm text-slate-400 italic">No historical maintenance events recorded for robot {robotId}.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-200">
              <thead className="bg-slate-800/90 text-slate-400 uppercase font-bold text-xs border-b border-slate-700">
                <tr>
                  <th className="p-3.5">Event ID</th>
                  <th className="p-3.5">Date</th>
                  <th className="p-3.5">Component</th>
                  <th className="p-3.5">Event Type</th>
                  <th className="p-3.5">Downtime (hrs)</th>
                  <th className="p-3.5">Cost ($ USD)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {maintenance_history.map((evt: any) => (
                  <tr key={evt.event_id} className="hover:bg-slate-800/60 transition-colors">
                    <td className="p-3.5 font-bold text-indigo-400">{evt.event_id}</td>
                    <td className="p-3.5 text-slate-300 font-medium">{evt.event_date.split('T')[0]}</td>
                    <td className="p-3.5">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-100 border border-slate-700 font-semibold text-xs">
                        {evt.component}
                      </span>
                    </td>
                    <td className="p-3.5 font-medium">{evt.event_type}</td>
                    <td className="p-3.5 font-extrabold text-amber-400">{evt.downtime_hours} hrs</td>
                    <td className="p-3.5 font-black text-emerald-400">${evt.maintenance_cost_usd}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
