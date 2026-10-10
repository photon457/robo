import React, { useEffect, useState } from 'react';
import Plot from 'react-plotly.js';
import { 
  Users, 
  CheckCircle, 
  AlertTriangle, 
  AlertOctagon, 
  Activity, 
  Clock, 
  BatteryCharging, 
  Zap, 
  ShieldAlert, 
  HeartPulse,
  Info
} from 'lucide-react';
import { KPICard } from '../components/KPICard';
import { InteractiveChartCard } from '../components/InteractiveChartCard';

interface FleetOverviewPageProps {
  timeWindow: string;
  selectedRobot: string;
}

export const FleetOverviewPage: React.FC<FleetOverviewPageProps> = ({
  timeWindow,
  selectedRobot,
}) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const query = new URLSearchParams();
    if (timeWindow) query.append('time_window', timeWindow);
    if (selectedRobot && selectedRobot !== 'ALL') query.append('robot_id', selectedRobot);

    fetch(`/api/fleet/overview?${query.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch fleet overview data');
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
  }, [timeWindow, selectedRobot]);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[600px]">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
          <p className="text-sm font-semibold text-indigo-400">Loading Fleet Telemetry Intelligence...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-300">
        <p className="font-bold text-lg">Error loading fleet metrics:</p>
        <p className="text-sm mt-1">{error || 'No fleet data available'}</p>
      </div>
    );
  }

  const { kpis, charts, summary_text } = data;

  const plotlyLayoutDefaults = {
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: { color: '#cbd5e1', family: 'Inter, sans-serif', size: 13 },
    margin: { t: 30, r: 25, l: 65, b: 65 },
    autosize: true,
  };

  return (
    <div className="p-10 space-y-10 max-w-[1800px] mx-auto">
      {/* Narrative Executive Summary */}
      <div className="p-8 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 shadow-xl flex items-start space-x-5">
        <div className="p-4 bg-indigo-500/20 text-indigo-400 rounded-2xl border border-indigo-500/30 shrink-0">
          <Info size={28} />
        </div>
        <div>
          <h3 className="text-xl font-black text-white tracking-tight">Executive Fleet Health Narrative Summary</h3>
          <p className="text-base text-slate-300 mt-2 leading-relaxed font-medium">{summary_text}</p>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
        <KPICard
          title="Total Fleet"
          value={kpis.total_robots}
          subtitle="Monitored AMRs"
          icon={Users}
          colorTheme="indigo"
          badgeText="100% Active"
        />
        <KPICard
          title="Healthy Robots"
          value={kpis.healthy_robots}
          subtitle="Health: 80 - 100"
          icon={CheckCircle}
          colorTheme="emerald"
          badgeText={`${Math.round((kpis.healthy_robots / kpis.total_robots) * 100)}%`}
        />
        <KPICard
          title="Monitor Required"
          value={kpis.monitor_robots}
          subtitle="Health: 60 - 79.9"
          icon={Activity}
          colorTheme="cyan"
        />
        <KPICard
          title="Robots at Risk"
          value={kpis.at_risk_robots}
          subtitle="Health: 40 - 59.9"
          icon={AlertTriangle}
          colorTheme="amber"
          badgeText="Action Needed"
        />
        <KPICard
          title="Critical Robots"
          value={kpis.critical_robots}
          subtitle="Health < 40"
          icon={AlertOctagon}
          colorTheme="rose"
          badgeText="Urgent"
        />
        <KPICard
          title="Avg Fleet Health"
          value={kpis.avg_fleet_health}
          unit="/100"
          subtitle="Composite Index"
          icon={HeartPulse}
          colorTheme="indigo"
        />
        <KPICard
          title="Recent Anomalies"
          value={kpis.robots_with_recent_anomalies}
          subtitle="Flagged in 24h"
          icon={Zap}
          colorTheme="amber"
        />
        <KPICard
          title="Pending Actions"
          value={kpis.pending_recommendations}
          subtitle="Rec. Engine"
          icon={ShieldAlert}
          colorTheme="rose"
        />
        <KPICard
          title="Total Downtime"
          value={kpis.total_recorded_downtime}
          unit="hrs"
          subtitle="Historical Cumulative"
          icon={Clock}
          colorTheme="slate"
        />
        <KPICard
          title="Avg Battery SoC"
          value={kpis.avg_battery_soc}
          unit="%"
          subtitle="State of Charge"
          icon={BatteryCharging}
          colorTheme="emerald"
        />
      </div>

      {/* 6 Interactive Plotly Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Chart 1: Donut Health Status Distribution */}
        <InteractiveChartCard
          title="Robot Health Status Distribution"
          subtitle="Categorical breakdown of AMR fleet operational condition"
          chartHeight="h-[450px]"
        >
          <Plot
            data={[
              {
                values: Object.values(charts.health_distribution_pie),
                labels: Object.keys(charts.health_distribution_pie),
                type: 'pie',
                hole: 0.5,
                marker: {
                  colors: ['#10b981', '#06b6d4', '#f59e0b', '#f43f5e']
                },
                textinfo: 'label+percent',
                insidetextfont: { size: 16, color: '#ffffff' },
                textfont: { size: 16 }
              }
            ]}
            layout={{
              ...plotlyLayoutDefaults,
              title: false,
              showlegend: true,
              legend: { orientation: 'h', y: -0.1, font: { size: 15 } }
            }}
            useResizeHandler={true}
            style={{ width: '100%', height: '100%' }}
            config={{ responsive: true, displayModeBar: false }}
          />
        </InteractiveChartCard>

        {/* Chart 2: Bar Chart Ranking Robots by Health Score */}
        <InteractiveChartCard
          title="Robot Health Score Ranking"
          subtitle="All AMR units sorted from lowest to highest health score"
          chartHeight="h-[450px]"
        >
          <Plot
            data={[
              {
                x: charts.ranked_robots_bar.map((r: any) => r.robot_id),
                y: charts.ranked_robots_bar.map((r: any) => r.computed_health_score),
                type: 'bar',
                marker: {
                  color: charts.ranked_robots_bar.map((r: any) => {
                    if (r.computed_health_score >= 80) return '#10b981';
                    if (r.computed_health_score >= 60) return '#06b6d4';
                    if (r.computed_health_score >= 40) return '#f59e0b';
                    return '#f43f5e';
                  })
                }
              }
            ]}
            layout={{
              ...plotlyLayoutDefaults,
              title: false,
              xaxis: { 
                title: { text: 'Robot Identifier (R001 - R050)', font: { size: 15 } }, 
                tickangle: -45, 
                tickfont: { size: 13 } 
              },
              yaxis: { 
                title: { text: 'Composite Health Score (0 - 100)', font: { size: 15 } }, 
                range: [0, 100], 
                tickfont: { size: 14 } 
              }
            }}
            useResizeHandler={true}
            style={{ width: '100%', height: '100%' }}
            config={{ responsive: true, displayModeBar: false }}
          />
        </InteractiveChartCard>

        {/* Chart 3: Fleet Health Line Chart over Time */}
        <InteractiveChartCard
          title="Fleet Health Trend Over Time"
          subtitle="30-day cumulative fleet health index trajectory"
          chartHeight="h-[450px]"
        >
          <Plot
            data={[
              {
                x: charts.fleet_health_trend_line.map((d: any) => d.timestamp),
                y: charts.fleet_health_trend_line.map((d: any) => d.health_score_synthetic),
                type: 'scatter',
                mode: 'lines',
                line: { color: '#6366f1', width: 2.5 }
              }
            ]}
            layout={{
              ...plotlyLayoutDefaults,
              title: false,
              xaxis: { 
                title: { text: 'Observation Timestamp (Date & Time)', font: { size: 15 } }, 
                showgrid: false, 
                tickfont: { size: 13 } 
              },
              yaxis: { 
                title: { text: 'Average Fleet Health Index (0 - 100)', font: { size: 15 } }, 
                range: [50, 100], 
                tickfont: { size: 14 } 
              }
            }}
            useResizeHandler={true}
            style={{ width: '100%', height: '100%' }}
            config={{ responsive: true, displayModeBar: false }}
          />
        </InteractiveChartCard>

        {/* Chart 4: Health Score Distribution Histogram */}
        <InteractiveChartCard
          title="Health Score Distribution"
          subtitle="Fleet frequency spread across composite score bins"
          chartHeight="h-[450px]"
        >
          <Plot
            data={[
              {
                x: charts.health_score_histogram,
                type: 'histogram',
                nbinsx: 20,
                marker: { color: '#8b5cf6', line: { color: '#1e1b4b', width: 1 } }
              }
            ]}
            layout={{
              ...plotlyLayoutDefaults,
              title: false,
              xaxis: { 
                title: { text: 'Health Score Range (Bins)', font: { size: 15 } }, 
                tickfont: { size: 14 } 
              },
              yaxis: { 
                title: { text: 'Number of Robots (Count)', font: { size: 15 } }, 
                tickfont: { size: 14 } 
              }
            }}
            useResizeHandler={true}
            style={{ width: '100%', height: '100%' }}
            config={{ responsive: true, displayModeBar: false }}
          />
        </InteractiveChartCard>

        {/* Chart 5: Robot Health Heat Map Matrix */}
        <InteractiveChartCard
          title="Fleet Health Heat Map (Robot vs Date)"
          subtitle="30-day matrix showing daily average health score per robot"
          chartHeight="h-[450px]"
        >
          <Plot
            data={[
              {
                z: charts.health_heatmap.z_matrix,
                x: charts.health_heatmap.x_dates,
                y: charts.health_heatmap.y_robots,
                type: 'heatmap',
                colorscale: 'Viridis'
              }
            ]}
            layout={{
              ...plotlyLayoutDefaults,
              title: false,
              xaxis: { 
                title: { text: 'Calendar Date (YYYY-MM-DD)', font: { size: 15 } }, 
                showgrid: false, 
                tickfont: { size: 13 } 
              },
              yaxis: { 
                title: { text: 'Robot Identifier (R001 - R050)', font: { size: 15 } }, 
                dtick: 5, 
                tickfont: { size: 13 } 
              }
            }}
            useResizeHandler={true}
            style={{ width: '100%', height: '100%' }}
            config={{ responsive: true, displayModeBar: false }}
          />
        </InteractiveChartCard>

        {/* Chart 6: Component Maintenance Costs Treemap */}
        <InteractiveChartCard
          title="Maintenance Cost by Component"
          subtitle="Hierarchical expenditure treemap breakdown"
          chartHeight="h-[450px]"
        >
          <Plot
            data={[
              {
                type: 'treemap',
                labels: charts.component_treemap.map((c: any) => c.component),
                parents: charts.component_treemap.map(() => ''),
                values: charts.component_treemap.map((c: any) => c.total_cost),
                textinfo: 'label+value+percent parent',
                textfont: { size: 17 },
                marker: {
                  colorscale: 'Blues'
                }
              }
            ]}
            layout={{
              ...plotlyLayoutDefaults,
              title: false
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
