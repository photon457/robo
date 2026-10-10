import React, { useEffect, useState } from 'react';
import Plot from 'react-plotly.js';
import { Activity } from 'lucide-react';
import { InteractiveChartCard } from '../components/InteractiveChartCard';

interface SensorAnalyticsPageProps {
  selectedRobot: string;
}

const SENSOR_LABELS: Record<string, string> = {
  motor_temperature_c: 'Motor Temperature (°C)',
  vibration_mm_s: 'Vibration Magnitude (mm/s)',
  motor_current_a: 'Motor Current (A)',
  battery_voltage_v: 'Battery Voltage (V)',
  battery_soc_pct: 'Battery State of Charge (%)',
};

const TREND_COLORS = ['#f43f5e', '#f59e0b', '#10b981', '#06b6d4', '#8b5cf6', '#ec4899'];

const axisTitle = (text: string) => ({ text, font: { size: 14, color: '#cbd5e1' } });

const ColorKey: React.FC<{ items: { color: string; label: string }[] }> = ({ items }) => (
  <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-300">
    <span className="text-slate-500 uppercase tracking-wider">Colour key:</span>
    {items.map((it) => (
      <span key={it.label} className="flex items-center space-x-1.5">
        <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: it.color }}></span>
        <span>{it.label}</span>
      </span>
    ))}
  </div>
);

export const SensorAnalyticsPage: React.FC<SensorAnalyticsPageProps> = ({ selectedRobot }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [heatmapSensor, setHeatmapSensor] = useState<string>('motor_temperature_c');
  const [histogramSensor, setHistogramSensor] = useState<string>('motor_temperature_c');

  useEffect(() => {
    setLoading(true);
    setError(null);
    const query = new URLSearchParams();
    query.append('selected_sensor', heatmapSensor);
    if (selectedRobot && selectedRobot !== 'ALL') query.append('robot_id', selectedRobot);

    fetch(`/api/sensor-analytics/all?${query.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load sensor analytics');
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
  }, [selectedRobot, heatmapSensor]);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[600px]">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
          <p className="text-sm font-semibold text-indigo-400">Computing Multivariate Telemetry Visualizations...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-300">
        <p className="font-bold">Error loading sensor analytics:</p>
        <p className="text-sm">{error || 'No data returned'}</p>
      </div>
    );
  }

  const {
    scatter_3d,
    parallel_coordinates,
    box_plots,
    bubble_chart,
    sensor_heatmap,
    correlation_map,
    voltage_vs_soc,
    current_vs_speed,
    temp_trend,
    histograms
  } = data;

  const isSingleRobot = selectedRobot && selectedRobot !== 'ALL';

  const plotlyLayoutDefaults = {
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: { color: '#94a3b8', family: 'Inter, sans-serif', size: 13 },
    margin: { t: 30, r: 25, l: 70, b: 70 },
    autosize: true,
    legend: { orientation: 'h' as const, y: 1.12, x: 0, font: { size: 12 } },
  };

  // Split helpers so that each colour is a named legend entry
  const normal3d = scatter_3d.filter((d: any) => !d.anomaly_flag_synthetic);
  const anom3d = scatter_3d.filter((d: any) => d.anomaly_flag_synthetic);
  const normalBubble = bubble_chart.filter((d: any) => !d.anomaly_flag_synthetic);
  const anomBubble = bubble_chart.filter((d: any) => d.anomaly_flag_synthetic);
  const charging = voltage_vs_soc.filter((v: any) => v.charging);
  const discharging = voltage_vs_soc.filter((v: any) => !v.charging);
  const taskActive = current_vs_speed.filter((c: any) => c.task_active);
  const taskIdle = current_vs_speed.filter((c: any) => !c.task_active);

  const trendRobots: string[] = Array.from(new Set(temp_trend.map((t: any) => t.robot_id as string)));

  const boxColors: Record<string, string> = {
    Healthy: '#10b981',
    Monitor: '#06b6d4',
    'At Risk': '#f59e0b',
    Critical: '#f43f5e',
  };

  return (
    <div className="p-10 space-y-10 max-w-[1800px] mx-auto">
      {/* Top Title Banner */}
      <div className="p-8 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 flex items-start space-x-5">
        <div className="p-4 bg-indigo-500/20 text-indigo-400 rounded-2xl border border-indigo-500/30">
          <Activity size={28} />
        </div>
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Multivariate Sensor Analytics</h2>
          <p className="text-sm text-slate-300 mt-1 max-w-4xl">
            Investigate multi-sensor correlations, parameter clusters, vibration and temperature anomalies, voltage state curves, and parallel parameter profiles
            {isSingleRobot ? <> for robot <span className="text-indigo-300 font-bold">{selectedRobot}</span>.</> : ' across the entire fleet.'}
          </p>
          <p className="text-xs text-slate-500 mt-2">Tip: hover over any graph for 3 seconds (or click the expand icon) to open it in an enlarged view.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* A: 3D Scatter Plot */}
        <InteractiveChartCard
          title="A. 3D Scatter Plot (Temp vs Vib vs Current)"
          subtitle="Combined extreme states where temperature, vibration and current rise together"
          description={
            <ColorKey items={[
              { color: '#22d3ee', label: 'Normal reading' },
              { color: '#f43f5e', label: 'Anomalous reading (flagged)' },
            ]} />
          }
        >
          <Plot
            data={[
              {
                x: normal3d.map((d: any) => d.motor_temperature_c),
                y: normal3d.map((d: any) => d.vibration_mm_s),
                z: normal3d.map((d: any) => d.motor_current_a),
                mode: 'markers',
                type: 'scatter3d',
                name: 'Normal reading',
                marker: { size: 3.5, color: '#22d3ee', opacity: 0.6 },
                text: normal3d.map((d: any) => `Robot: ${d.robot_id}`),
                hovertemplate: '%{text}<br>Temp: %{x}°C<br>Vib: %{y} mm/s<br>Current: %{z} A<extra>Normal</extra>'
              },
              {
                x: anom3d.map((d: any) => d.motor_temperature_c),
                y: anom3d.map((d: any) => d.vibration_mm_s),
                z: anom3d.map((d: any) => d.motor_current_a),
                mode: 'markers',
                type: 'scatter3d',
                name: 'Anomalous reading',
                marker: { size: 5, color: '#f43f5e', opacity: 0.95, symbol: 'diamond' },
                text: anom3d.map((d: any) => `Robot: ${d.robot_id}`),
                hovertemplate: '%{text}<br>Temp: %{x}°C<br>Vib: %{y} mm/s<br>Current: %{z} A<extra>Anomaly</extra>'
              }
            ]}
            layout={{
              ...plotlyLayoutDefaults,
              margin: { t: 10, r: 10, l: 10, b: 10 },
              showlegend: true,
              legend: { orientation: 'h', y: 1.02, x: 0, font: { size: 12 }, title: { text: 'Point colour: ' } },
              scene: {
                xaxis: { title: { text: 'X: Motor Temperature (°C)' }, color: '#94a3b8' },
                yaxis: { title: { text: 'Y: Vibration (mm/s)' }, color: '#94a3b8' },
                zaxis: { title: { text: 'Z: Motor Current (A)' }, color: '#94a3b8' },
                aspectratio: { x: 1, y: 1, z: 1 }
              }
            }}
            useResizeHandler={true}
            style={{ width: '100%', height: '100%' }}
            config={{ responsive: true, displayModeBar: false }}
          />
        </InteractiveChartCard>

        {/* B: Parallel Coordinates */}
        <InteractiveChartCard
          title="B. Parallel Coordinates Plot"
          subtitle="Each line is one reading traced across six sensor axes"
          description="Line colour = motor temperature (°C): blue/cool lines are low temperature, red/hot lines are high temperature. Each vertical axis is labelled with its sensor and unit."
        >
          <Plot
            data={[
              {
                type: 'parcoords',
                line: {
                  color: parallel_coordinates.motor_temperature_c,
                  colorscale: 'Jet',
                  showscale: true,
                  colorbar: { title: { text: 'Motor Temp (°C)' }, tickfont: { color: '#94a3b8' } }
                },
                labelfont: { size: 13, color: '#e2e8f0' },
                tickfont: { size: 11, color: '#94a3b8' },
                dimensions: [
                  { range: [18, 26], label: 'Voltage (V)', values: parallel_coordinates.battery_voltage_v },
                  { range: [20, 100], label: 'Temp (°C)', values: parallel_coordinates.motor_temperature_c },
                  { range: [0.5, 9.0], label: 'Vibration (mm/s)', values: parallel_coordinates.vibration_mm_s },
                  { range: [0, 40], label: 'Current (A)', values: parallel_coordinates.motor_current_a },
                  { range: [0, 4.0], label: 'Speed (m/s)', values: parallel_coordinates.motor_speed_m_s },
                  { range: [0, 100], label: 'Utilization (%)', values: parallel_coordinates.utilization_pct }
                ]
              } as any
            ]}
            layout={{ ...plotlyLayoutDefaults, margin: { t: 50, r: 80, l: 60, b: 30 }, title: false }}
            useResizeHandler={true}
            style={{ width: '100%', height: '100%' }}
            config={{ responsive: true, displayModeBar: false }}
          />
        </InteractiveChartCard>

        {/* C: Box Plots */}
        <InteractiveChartCard
          title="C. Vibration Box Plots Across Health Status"
          subtitle="Variance spread, quartiles, median and outliers per health class"
          description={
            <ColorKey items={Object.entries(boxColors).map(([label, color]) => ({ label, color }))} />
          }
        >
          <Plot
            data={Object.keys(box_plots.vibration).map((cat) => ({
              y: box_plots.vibration[cat],
              type: 'box',
              name: cat,
              boxpoints: 'outliers',
              marker: { color: boxColors[cat] || '#6366f1' }
            }))}
            layout={{
              ...plotlyLayoutDefaults,
              title: false,
              showlegend: false,
              xaxis: { title: axisTitle('Robot Health Status Category') },
              yaxis: { title: axisTitle('Vibration Magnitude (mm/s)') }
            }}
            useResizeHandler={true}
            style={{ width: '100%', height: '100%' }}
            config={{ responsive: true, displayModeBar: false }}
          />
        </InteractiveChartCard>

        {/* D: Bubble Chart */}
        <InteractiveChartCard
          title="D. Multi-Sensor Bubble Chart"
          subtitle="Bubble size = motor current (A)"
          description={
            <ColorKey items={[
              { color: '#06b6d4', label: 'Normal reading' },
              { color: '#f43f5e', label: 'Anomalous reading' },
            ]} />
          }
        >
          <Plot
            data={[
              {
                x: normalBubble.map((b: any) => b.motor_temperature_c),
                y: normalBubble.map((b: any) => b.vibration_mm_s),
                mode: 'markers',
                type: 'scatter',
                name: 'Normal reading',
                marker: { size: normalBubble.map((b: any) => Math.max(4, b.motor_current_a)), color: '#06b6d4', opacity: 0.55 },
                text: normalBubble.map((b: any) => `Robot: ${b.robot_id} | Current: ${b.motor_current_a}A`)
              },
              {
                x: anomBubble.map((b: any) => b.motor_temperature_c),
                y: anomBubble.map((b: any) => b.vibration_mm_s),
                mode: 'markers',
                type: 'scatter',
                name: 'Anomalous reading',
                marker: { size: anomBubble.map((b: any) => Math.max(4, b.motor_current_a)), color: '#f43f5e', opacity: 0.85 },
                text: anomBubble.map((b: any) => `Robot: ${b.robot_id} | Current: ${b.motor_current_a}A`)
              }
            ]}
            layout={{
              ...plotlyLayoutDefaults,
              title: false,
              showlegend: true,
              xaxis: { title: axisTitle('Motor Temperature (°C)') },
              yaxis: { title: axisTitle('Vibration Magnitude (mm/s)') }
            }}
            useResizeHandler={true}
            style={{ width: '100%', height: '100%' }}
            config={{ responsive: true, displayModeBar: false }}
          />
        </InteractiveChartCard>

        {/* E: Sensor Heatmap */}
        <InteractiveChartCard
          title="E. Sensor Heat Map Matrix"
          subtitle="Daily average sensor value per robot"
          headerRight={
            <select
              value={heatmapSensor}
              onChange={(e) => setHeatmapSensor(e.target.value)}
              className="bg-slate-800 text-indigo-300 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-semibold outline-none"
            >
              <option value="motor_temperature_c">Motor Temperature (°C)</option>
              <option value="vibration_mm_s">Vibration (mm/s)</option>
              <option value="motor_current_a">Motor Current (A)</option>
              <option value="battery_voltage_v">Battery Voltage (V)</option>
            </select>
          }
          description={`Cell colour = daily average ${SENSOR_LABELS[heatmapSensor]}: dark = low, bright yellow/white = high (see colour bar).`}
        >
          <Plot
            data={[
              {
                z: sensor_heatmap.z_matrix,
                x: sensor_heatmap.x_dates,
                y: sensor_heatmap.y_robots,
                type: 'heatmap',
                colorscale: 'Hot',
                colorbar: { title: { text: SENSOR_LABELS[heatmapSensor] }, tickfont: { color: '#94a3b8' } }
              }
            ]}
            layout={{
              ...plotlyLayoutDefaults,
              title: false,
              xaxis: { title: axisTitle('Calendar Date (YYYY-MM-DD)'), showgrid: false },
              yaxis: { title: axisTitle('Robot Identifier'), dtick: 5 }
            }}
            useResizeHandler={true}
            style={{ width: '100%', height: '100%' }}
            config={{ responsive: true, displayModeBar: false }}
          />
        </InteractiveChartCard>

        {/* F: Correlation Matrix */}
        <InteractiveChartCard
          title="F. Feature Correlation Matrix"
          subtitle="Pearson coefficients between telemetry parameters"
          description={<>Red = positive correlation (+1), blue = negative correlation (−1), white ≈ no correlation. <span className="text-amber-400 font-semibold">Correlation does not prove causation.</span></>}
        >
          <Plot
            data={[
              {
                z: correlation_map.z_matrix,
                x: correlation_map.features,
                y: correlation_map.features,
                type: 'heatmap',
                colorscale: 'RdBu',
                reversescale: true,
                zmin: -1,
                zmax: 1,
                colorbar: { title: { text: 'Pearson r' }, tickfont: { color: '#94a3b8' } }
              }
            ]}
            layout={{
              ...plotlyLayoutDefaults,
              margin: { t: 20, r: 20, l: 150, b: 130 },
              title: false,
              xaxis: { title: axisTitle('Sensor Feature'), tickangle: -30 },
              yaxis: { title: axisTitle('Sensor Feature') }
            }}
            useResizeHandler={true}
            style={{ width: '100%', height: '100%' }}
            config={{ responsive: true, displayModeBar: false }}
          />
        </InteractiveChartCard>

        {/* G: Voltage vs SoC */}
        <InteractiveChartCard
          title="G. Battery Voltage vs State of Charge (SoC)"
          subtitle="Abnormal voltage drop at comparable charge levels indicates cell degradation"
          description={
            <ColorKey items={[
              { color: '#10b981', label: 'Charging' },
              { color: '#f59e0b', label: 'Discharging / in operation' },
            ]} />
          }
        >
          <Plot
            data={[
              {
                x: discharging.map((v: any) => v.battery_soc_pct),
                y: discharging.map((v: any) => v.battery_voltage_v),
                mode: 'markers',
                type: 'scatter',
                name: 'Discharging',
                marker: { color: '#f59e0b', size: 5, opacity: 0.7 },
                text: discharging.map((v: any) => `Robot: ${v.robot_id}`)
              },
              {
                x: charging.map((v: any) => v.battery_soc_pct),
                y: charging.map((v: any) => v.battery_voltage_v),
                mode: 'markers',
                type: 'scatter',
                name: 'Charging',
                marker: { color: '#10b981', size: 6, opacity: 0.85 },
                text: charging.map((v: any) => `Robot: ${v.robot_id}`)
              }
            ]}
            layout={{
              ...plotlyLayoutDefaults,
              title: false,
              showlegend: true,
              xaxis: { title: axisTitle('Battery State of Charge (%)') },
              yaxis: { title: axisTitle('Battery Voltage (V)') }
            }}
            useResizeHandler={true}
            style={{ width: '100%', height: '100%' }}
            config={{ responsive: true, displayModeBar: false }}
          />
        </InteractiveChartCard>

        {/* H: Current vs Speed */}
        <InteractiveChartCard
          title="H. Motor Current vs Motor Speed"
          subtitle="Bubble size = payload (kg)"
          description={
            <ColorKey items={[
              { color: '#a855f7', label: 'Task active' },
              { color: '#64748b', label: 'Idle (no task)' },
            ]} />
          }
        >
          <Plot
            data={[
              {
                x: taskIdle.map((c: any) => c.motor_speed_m_s),
                y: taskIdle.map((c: any) => c.motor_current_a),
                mode: 'markers',
                type: 'scatter',
                name: 'Idle',
                marker: { size: taskIdle.map((c: any) => Math.max(4, c.payload_kg / 2)), color: '#64748b', opacity: 0.6 },
                text: taskIdle.map((c: any) => `Robot: ${c.robot_id} | Payload: ${c.payload_kg}kg`)
              },
              {
                x: taskActive.map((c: any) => c.motor_speed_m_s),
                y: taskActive.map((c: any) => c.motor_current_a),
                mode: 'markers',
                type: 'scatter',
                name: 'Task active',
                marker: { size: taskActive.map((c: any) => Math.max(4, c.payload_kg / 2)), color: '#a855f7', opacity: 0.75 },
                text: taskActive.map((c: any) => `Robot: ${c.robot_id} | Payload: ${c.payload_kg}kg`)
              }
            ]}
            layout={{
              ...plotlyLayoutDefaults,
              title: false,
              showlegend: true,
              xaxis: { title: axisTitle('Motor Speed (m/s)') },
              yaxis: { title: axisTitle('Motor Current Draw (A)') }
            }}
            useResizeHandler={true}
            style={{ width: '100%', height: '100%' }}
            config={{ responsive: true, displayModeBar: false }}
          />
        </InteractiveChartCard>

        {/* I: Temperature Trend */}
        <InteractiveChartCard
          title="I. Motor Temperature Timeseries Trend"
          subtitle={isSingleRobot ? `Thermal peaks & cooling for robot ${selectedRobot}` : `Thermal peaks & cooling for sample robots (${trendRobots.join(', ')})`}
          description={
            <ColorKey items={trendRobots.map((rid, i) => ({ label: rid, color: TREND_COLORS[i % TREND_COLORS.length] }))} />
          }
        >
          <Plot
            data={trendRobots.map((rid, i) => {
              const sub = temp_trend.filter((t: any) => t.robot_id === rid);
              return {
                x: sub.map((t: any) => t.timestamp),
                y: sub.map((t: any) => t.motor_temperature_c),
                type: 'scatter',
                mode: 'lines',
                name: rid,
                line: { color: TREND_COLORS[i % TREND_COLORS.length], width: isSingleRobot ? 2.5 : 1.5 }
              };
            })}
            layout={{
              ...plotlyLayoutDefaults,
              title: false,
              showlegend: true,
              xaxis: { title: axisTitle('Observation Timestamp (Date & Time)'), showgrid: false },
              yaxis: { title: axisTitle('Motor Temperature (°C)') }
            }}
            useResizeHandler={true}
            style={{ width: '100%', height: '100%' }}
            config={{ responsive: true, displayModeBar: false }}
          />
        </InteractiveChartCard>

        {/* J: Histogram */}
        <InteractiveChartCard
          title="J. Telemetry Distribution Histogram"
          subtitle="Statistical spread, skewness and long-tail observations"
          headerRight={
            <select
              value={histogramSensor}
              onChange={(e) => setHistogramSensor(e.target.value)}
              className="bg-slate-800 text-indigo-300 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-semibold outline-none"
            >
              <option value="motor_temperature_c">Motor Temperature (°C)</option>
              <option value="vibration_mm_s">Vibration (mm/s)</option>
              <option value="motor_current_a">Motor Current (A)</option>
              <option value="battery_voltage_v">Battery Voltage (V)</option>
              <option value="battery_soc_pct">Battery SoC (%)</option>
            </select>
          }
        >
          <Plot
            data={[
              {
                x: histograms[histogramSensor],
                type: 'histogram',
                nbinsx: 30,
                marker: { color: '#06b6d4', line: { color: '#083344', width: 1 } }
              }
            ]}
            layout={{
              ...plotlyLayoutDefaults,
              title: false,
              xaxis: { title: axisTitle(SENSOR_LABELS[histogramSensor] || histogramSensor) },
              yaxis: { title: axisTitle('Observation Count (Frequency)') }
            }}
            useResizeHandler={true}
            style={{ width: '100%', height: '100%' }}
            config={{ responsive: true, displayModeBar: false }}
          />
        </InteractiveChartCard>

      </div>
    </div>
  );
};
