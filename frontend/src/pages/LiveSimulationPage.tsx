import React, { useState } from 'react';
import { Play, Pause, RotateCcw, Activity } from 'lucide-react';
import type { SimulationState } from '../types';

interface LiveSimulationPageProps {
  simState: SimulationState | null;
  onControl: (action: string, speed?: number) => void;
}

export const LiveSimulationPage: React.FC<LiveSimulationPageProps> = ({
  simState,
  onControl,
}) => {
  const [speed, setSpeed] = useState<number>(1);

  if (!simState) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[600px]">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
          <p className="text-sm font-semibold text-indigo-400">Connecting to Real-time Fleet Simulation Service...</p>
        </div>
      </div>
    );
  }

  const { running, step_count, scenario_active, kpis, robots, event_log } = simState;

  return (
    <div className="p-6 space-y-8 max-w-[1600px] mx-auto">
      {/* Simulation Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-indigo-950/40 border border-emerald-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl">
            <Activity size={24} className={running ? 'animate-pulse' : ''} />
          </div>
          <div>
            <div className="flex items-center space-x-3">
              <h2 className="text-xl font-bold text-white tracking-tight">Live Fleet Simulation Control Room</h2>
              <span className={`px-3 py-0.5 rounded-full text-xs font-bold ${
                running ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}>
                {running ? 'SIMULATION RUNNING' : 'PAUSED'}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Ticks Completed: <span className="text-white font-bold">{step_count}</span> | Active Scenario: <span className="text-amber-400 font-bold">{scenario_active || 'None'}</span>
            </p>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          {!running ? (
            <button
              onClick={() => onControl('start', speed)}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center space-x-2 shadow-lg shadow-emerald-600/30"
            >
              <Play size={16} />
              <span>Start / Resume</span>
            </button>
          ) : (
            <button
              onClick={() => onControl('pause')}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center space-x-2 shadow-lg shadow-amber-600/30"
            >
              <Pause size={16} />
              <span>Pause</span>
            </button>
          )}

          <button
            onClick={() => onControl('step')}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold"
          >
            Step +1 Tick
          </button>

          <button
            onClick={() => onControl('reset')}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-rose-900/60 text-slate-300 hover:text-rose-200 border border-slate-700 text-xs font-semibold flex items-center space-x-1.5"
          >
            <RotateCcw size={14} />
            <span>Reset Baseline</span>
          </button>

          <div className="flex items-center bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-300">
            <span className="text-slate-400 mr-2 font-medium">Speed:</span>
            <select
              value={speed}
              onChange={(e) => {
                const s = parseFloat(e.target.value);
                setSpeed(s);
                if (running) onControl('start', s);
              }}
              className="bg-transparent text-white font-bold outline-none cursor-pointer"
            >
              <option value="1" className="bg-slate-900">1x Normal</option>
              <option value="2" className="bg-slate-900">2x Speed</option>
              <option value="5" className="bg-slate-900">5x Fast</option>
              <option value="10" className="bg-slate-900">10x Ultra</option>
            </select>
          </div>
        </div>
      </div>

      {/* Real-time KPI Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-4">
        <div className="industrial-card p-4 text-center">
          <div className="text-xs text-slate-400 font-semibold">Total Fleet</div>
          <div className="text-2xl font-black text-white mt-1">{kpis.total_robots}</div>
        </div>
        <div className="industrial-card p-4 text-center">
          <div className="text-xs text-emerald-400 font-semibold">Healthy</div>
          <div className="text-2xl font-black text-emerald-400 mt-1">{kpis.healthy}</div>
        </div>
        <div className="industrial-card p-4 text-center">
          <div className="text-xs text-cyan-400 font-semibold">Monitor</div>
          <div className="text-2xl font-black text-cyan-400 mt-1">{kpis.monitor}</div>
        </div>
        <div className="industrial-card p-4 text-center">
          <div className="text-xs text-amber-400 font-semibold">At Risk</div>
          <div className="text-2xl font-black text-amber-400 mt-1">{kpis.at_risk}</div>
        </div>
        <div className="industrial-card p-4 text-center">
          <div className="text-xs text-rose-400 font-semibold">Critical</div>
          <div className="text-2xl font-black text-rose-400 mt-1">{kpis.critical}</div>
        </div>
        <div className="industrial-card p-4 text-center">
          <div className="text-xs text-indigo-400 font-semibold">Avg Fleet Health</div>
          <div className="text-2xl font-black text-indigo-400 mt-1">{kpis.avg_health}</div>
        </div>
      </div>

      {/* Grid: Real-time Telemetry Grid & Event Log */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Live Robot Telemetry Grid (2 Cols) */}
        <div className="industrial-card p-6 lg:col-span-2 space-y-4">
          <h4 className="text-base font-bold text-white">Live Robot Telemetry Grid</h4>
          <div className="overflow-x-auto max-h-[420px]">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/90 text-slate-400 uppercase font-semibold text-[11px] sticky top-0">
                <tr>
                  <th className="p-2.5">Robot ID</th>
                  <th className="p-2.5">Status</th>
                  <th className="p-2.5">Health</th>
                  <th className="p-2.5">SoC (%)</th>
                  <th className="p-2.5">Temp (°C)</th>
                  <th className="p-2.5">Vib (mm/s)</th>
                  <th className="p-2.5">Current (A)</th>
                  <th className="p-2.5">State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {robots.map((r) => (
                  <tr key={r.robot_id} className="hover:bg-slate-800/50">
                    <td className="p-2.5 font-bold text-white">{r.robot_id}</td>
                    <td className="p-2.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        r.computed_status === 'Healthy' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                        r.computed_status === 'Monitor' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' :
                        r.computed_status === 'At Risk' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                        'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}>
                        {r.computed_status}
                      </span>
                    </td>
                    <td className="p-2.5 font-extrabold text-indigo-300">{r.computed_health_score}</td>
                    <td className="p-2.5 font-semibold text-emerald-400">{r.battery_soc_pct}%</td>
                    <td className="p-2.5 font-semibold text-rose-400">{r.motor_temperature_c}°C</td>
                    <td className="p-2.5 text-amber-400">{r.vibration_mm_s}</td>
                    <td className="p-2.5 text-cyan-400">{r.motor_current_a} A</td>
                    <td className="p-2.5">
                      {r.charging ? (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 font-bold">Charging</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400">Active</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Simulation Event Stream (1 Col) */}
        <div className="industrial-card p-6 space-y-4">
          <h4 className="text-base font-bold text-white flex items-center justify-between">
            <span>Simulation Event Stream</span>
            <span className="text-xs text-slate-400 font-normal">{event_log.length} events</span>
          </h4>

          <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
            {event_log.map((evt, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/70 text-xs space-y-1">
                <div className="flex items-center justify-between text-slate-400 text-[11px]">
                  <span className="font-mono text-indigo-400 font-bold">{evt.timestamp}</span>
                  <span className="font-semibold text-amber-300">{evt.event_type}</span>
                </div>
                <p className="text-slate-200">{evt.message}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
