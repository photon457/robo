import React, { useEffect, useState } from 'react';
import Plot from 'react-plotly.js';
import { Wrench, DollarSign, Clock, AlertTriangle, Search, Filter } from 'lucide-react';
import { KPICard } from '../components/KPICard';
import { InteractiveChartCard } from '../components/InteractiveChartCard';

export const MaintenanceAnalyticsPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [componentFilter, setComponentFilter] = useState('ALL');

  useEffect(() => {
    fetch('/api/maintenance/analytics')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch maintenance analytics');
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
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[600px]">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
          <p className="text-sm font-semibold text-indigo-400">Loading Maintenance History & Cost Analytics...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-300">
        <p className="font-bold">Error loading maintenance analytics:</p>
        <p className="text-sm">{error || 'No data'}</p>
      </div>
    );
  }

  const {
    kpis,
    component_summary,
    pareto_chart,
    monthly_trend,
    operating_hours_vs_events,
    maintenance_events_table
  } = data;

  const plotlyLayoutDefaults = {
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: { color: '#94a3b8', family: 'Inter, sans-serif', size: 12 },
    margin: { t: 30, r: 70, l: 70, b: 90 },
    autosize: true,
  };

  const filteredEvents = maintenance_events_table.filter((evt: any) => {
    const matchesSearch = evt.robot_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          evt.event_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          evt.component.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesComp = componentFilter === 'ALL' || evt.component === componentFilter;
    return matchesSearch && matchesComp;
  });

  return (
    <div className="p-6 space-y-8 max-w-[1600px] mx-auto">
      {/* Page Title */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 flex items-start space-x-4">
        <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-xl">
          <Wrench size={24} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Maintenance History & Downtime Analytics</h2>
          <p className="text-xs text-slate-300 mt-1 max-w-4xl">
            Analyze historical maintenance logs, component breakdown Pareto distributions, downtime duration, financial impact, and operating hour correlations.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KPICard
          title="Total Maintenance Cost"
          value={`$${kpis.total_maintenance_cost.toLocaleString()}`}
          subtitle="Cumulative Fleet USD"
          icon={DollarSign}
          colorTheme="emerald"
        />
        <KPICard
          title="Total Downtime"
          value={`${kpis.total_downtime_hours}`}
          unit="hrs"
          subtitle="Recorded Fleet Hours"
          icon={Clock}
          colorTheme="amber"
        />
        <KPICard
          title="Most Serviced Component"
          value={kpis.most_frequent_component}
          subtitle="Highest Event Frequency"
          icon={Wrench}
          colorTheme="indigo"
        />
        <KPICard
          title="Highest Cost Component"
          value={kpis.highest_cost_component}
          subtitle="Highest Financial Impact"
          icon={AlertTriangle}
          colorTheme="rose"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Chart 1: Component Treemap */}
        <InteractiveChartCard
          title="Maintenance Cost Treemap by Component"
          subtitle="Tile area = total maintenance cost (USD) per component"
          chartHeight="h-[400px]"
        >
            <Plot
              data={[
                {
                  type: 'treemap',
                  labels: component_summary.map((c: any) => c.component),
                  parents: component_summary.map(() => ''),
                  values: component_summary.map((c: any) => c.total_cost),
                  textinfo: 'label+value+percent parent',
                  marker: { colorscale: 'Blues' }
                }
              ]}
              layout={{ ...plotlyLayoutDefaults, title: false }}
              useResizeHandler={true}
              style={{ width: '100%', height: '100%' }}
              config={{ responsive: true, displayModeBar: false }}
            />
        </InteractiveChartCard>

        {/* Chart 2: Pareto Chart (Event Count + Cumulative %) */}
        <InteractiveChartCard
          title="Pareto Analysis: Maintenance Events & Cumulative %"
          subtitle="Bars = event count (left axis), red line = cumulative % (right axis)"
          chartHeight="h-[400px]"
        >
            <Plot
              data={[
                {
                  x: pareto_chart.map((p: any) => p.component),
                  y: pareto_chart.map((p: any) => p.event_count),
                  type: 'bar',
                  name: 'Event Count',
                  marker: { color: '#6366f1' }
                },
                {
                  x: pareto_chart.map((p: any) => p.component),
                  y: pareto_chart.map((p: any) => p.cumulative_pct),
                  type: 'scatter',
                  mode: 'lines+markers',
                  name: 'Cumulative %',
                  yaxis: 'y2',
                  line: { color: '#f43f5e', width: 2 }
                }
              ]}
              layout={{
                ...plotlyLayoutDefaults,
                title: false,
                xaxis: { title: { text: 'Robot Component' }, tickangle: -30 },
                yaxis: { title: { text: 'Number of Maintenance Events' } },
                yaxis2: { title: { text: 'Cumulative Share of Events (%)' }, overlaying: 'y', side: 'right', range: [0, 105] },
                showlegend: true,
                legend: { orientation: 'h', y: -0.3 }
              }}
              useResizeHandler={true}
              style={{ width: '100%', height: '100%' }}
              config={{ responsive: true, displayModeBar: false }}
            />
        </InteractiveChartCard>

        {/* Chart 3: Monthly Maintenance Events & Downtime Line Chart */}
        <InteractiveChartCard
          title="Monthly Maintenance Events & Downtime Trend"
          subtitle="Cyan = event count (left axis), amber = downtime hours (right axis)"
          chartHeight="h-[400px]"
        >
            <Plot
              data={[
                {
                  x: monthly_trend.map((m: any) => m.year_month),
                  y: monthly_trend.map((m: any) => m.event_count),
                  type: 'scatter',
                  mode: 'lines+markers',
                  name: 'Event Count',
                  line: { color: '#06b6d4', width: 2 }
                },
                {
                  x: monthly_trend.map((m: any) => m.year_month),
                  y: monthly_trend.map((m: any) => m.total_downtime),
                  type: 'scatter',
                  mode: 'lines+markers',
                  name: 'Downtime (hrs)',
                  yaxis: 'y2',
                  line: { color: '#f59e0b', width: 2 }
                }
              ]}
              layout={{
                ...plotlyLayoutDefaults,
                title: false,
                xaxis: { title: { text: 'Month (YYYY-MM)' } },
                yaxis: { title: { text: 'Maintenance Event Count' } },
                yaxis2: { title: { text: 'Total Downtime (hours)' }, overlaying: 'y', side: 'right' },
                showlegend: true
              }}
              useResizeHandler={true}
              style={{ width: '100%', height: '100%' }}
              config={{ responsive: true, displayModeBar: false }}
            />
        </InteractiveChartCard>

        {/* Chart 4: Operating Hours vs Maintenance Event Count */}
        <InteractiveChartCard
          title="Operating Hours vs Maintenance Event Count"
          subtitle="Each bubble = one robot; bubble size = historical downtime (hours)"
          chartHeight="h-[400px]"
        >
            <Plot
              data={[
                {
                  x: operating_hours_vs_events.map((o: any) => o.operating_hours_total),
                  y: operating_hours_vs_events.map((o: any) => o.maintenance_events_count),
                  mode: 'markers',
                  type: 'scatter',
                  marker: {
                    size: operating_hours_vs_events.map((o: any) => o.historical_downtime_hours / 2),
                    color: '#8b5cf6',
                    opacity: 0.8
                  },
                  text: operating_hours_vs_events.map((o: any) => `Robot: ${o.robot_id} | Downtime: ${o.historical_downtime_hours}h`)
                }
              ]}
              layout={{
                ...plotlyLayoutDefaults,
                title: false,
                xaxis: { title: { text: 'Total Operating Hours (hrs)' } },
                yaxis: { title: { text: 'Maintenance Event Count' } }
              }}
              useResizeHandler={true}
              style={{ width: '100%', height: '100%' }}
              config={{ responsive: true, displayModeBar: false }}
            />
        </InteractiveChartCard>

      </div>

      {/* Maintenance Events Searchable Table */}
      <div className="industrial-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h4 className="text-base font-bold text-white">Full Maintenance Event Logs</h4>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs">
              <Search size={14} className="text-slate-400 mr-2" />
              <input
                type="text"
                placeholder="Search robot, event, component..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent text-white outline-none w-44"
              />
            </div>

            <div className="flex items-center bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs">
              <Filter size={14} className="text-slate-400 mr-2" />
              <select
                value={componentFilter}
                onChange={(e) => setComponentFilter(e.target.value)}
                className="bg-transparent text-white outline-none cursor-pointer"
              >
                <option value="ALL" className="bg-slate-900">All Components</option>
                {component_summary.map((c: any) => (
                  <option key={c.component} value={c.component} className="bg-slate-900">{c.component}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[400px]">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/90 text-slate-400 uppercase font-semibold text-[11px] sticky top-0">
              <tr>
                <th className="p-3">Event ID</th>
                <th className="p-3">Robot ID</th>
                <th className="p-3">Date</th>
                <th className="p-3">Component</th>
                <th className="p-3">Type</th>
                <th className="p-3">Downtime (hrs)</th>
                <th className="p-3">Cost ($ USD)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredEvents.map((evt: any) => (
                <tr key={evt.event_id} className="hover:bg-slate-800/50">
                  <td className="p-3 font-bold text-indigo-400">{evt.event_id}</td>
                  <td className="p-3 font-semibold text-white">{evt.robot_id}</td>
                  <td className="p-3 text-slate-400">{evt.event_date.split('T')[0]}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-medium">
                      {evt.component}
                    </span>
                  </td>
                  <td className="p-3">{evt.event_type}</td>
                  <td className="p-3 font-semibold text-amber-400">{evt.downtime_hours} hrs</td>
                  <td className="p-3 font-bold text-emerald-400">${evt.maintenance_cost_usd}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
