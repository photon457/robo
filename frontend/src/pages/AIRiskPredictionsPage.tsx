import React, { useEffect, useState } from 'react';
import Plot from 'react-plotly.js';
import { BrainCircuit, Cpu, ShieldAlert } from 'lucide-react';
import { InteractiveChartCard } from '../components/InteractiveChartCard';

interface AIRiskPredictionsPageProps {
  selectedRobot: string;
}

export const AIRiskPredictionsPage: React.FC<AIRiskPredictionsPageProps> = ({ selectedRobot }) => {
  const [anomaliesData, setAnomaliesData] = useState<any>(null);
  const [supervisedData, setSupervisedData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const query = selectedRobot && selectedRobot !== 'ALL' ? `?robot_id=${selectedRobot}` : '';

    Promise.all([
      fetch(`/api/ai/anomalies${query}`).then((r) => r.json()),
      fetch('/api/ai/supervised-risk').then((r) => r.json()),
    ])
      .then(([anom, sup]) => {
        setAnomaliesData(anom);
        setSupervisedData(sup);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [selectedRobot]);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[600px]">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
          <p className="text-sm font-semibold text-indigo-400">Evaluating Anomaly Detection & Predictive Risk Model...</p>
        </div>
      </div>
    );
  }

  if (error || !anomaliesData || !supervisedData) {
    return (
      <div className="p-8 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-300">
        <p className="font-bold">Error loading risk analytics:</p>
        <p className="text-sm">{error || 'Failed to fetch risk model data'}</p>
      </div>
    );
  }

  const { metrics, feature_importances, latest_robot_risk_predictions, transparency_note, target_definition } = supervisedData;

  const plotlyLayoutDefaults = {
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: { color: '#94a3b8', family: 'Inter, sans-serif', size: 12 },
    margin: { t: 30, r: 20, l: 50, b: 50 },
    autosize: true,
  };

  return (
    <div className="p-8 space-y-10 max-w-[1800px] mx-auto">
      {/* Top Banner & Transparency Disclaimer */}
      <div className="p-8 rounded-2xl bg-gradient-to-r from-purple-950/50 via-slate-900 to-indigo-950/50 border border-purple-500/30">
        <div className="flex items-start space-x-5">
          <div className="p-4 bg-purple-500/20 text-purple-400 rounded-2xl border border-purple-500/30">
            <BrainCircuit size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight">Anomaly Detection & Supervised Risk Modeling</h2>
            <p className="text-sm text-slate-300 mt-1 max-w-4xl leading-relaxed">{transparency_note}</p>
          </div>
        </div>
      </div>

      {/* SECTION A: Unsupervised Anomaly Detection */}
      <div className="industrial-card p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <h3 className="text-xl font-black text-white flex items-center space-x-3">
              <Cpu className="text-indigo-400" size={24} />
              <span>A. Unsupervised Anomaly Detector</span>
            </h3>
            <p className="text-sm text-slate-400 mt-1">
              Trained on multi-sensor observations (Temp, Vib, Current, Voltage, SoC, Speed, Payload, Util)
            </p>
          </div>
          <div className="px-4 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm font-bold">
            Anomalies Detected: {anomaliesData.total_anomalies_detected}
          </div>
        </div>

        {/* Anomaly Records Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/90 text-slate-400 uppercase font-bold text-xs">
              <tr>
                <th className="p-3.5">Robot ID</th>
                <th className="p-3.5">Timestamp</th>
                <th className="p-3.5">Score</th>
                <th className="p-3.5">Classification</th>
                <th className="p-3.5">Key Telemetry</th>
                <th className="p-3.5">Top Feature Deviations (vs Baseline)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {anomaliesData.anomalies.slice(0, 8).map((anom: any, i: number) => (
                <tr key={i} className="hover:bg-slate-800/50 transition-colors">
                  <td className="p-3.5 font-bold text-indigo-400">{anom.robot_id}</td>
                  <td className="p-3.5 text-slate-400 font-mono text-xs">{anom.timestamp}</td>
                  <td className="p-3.5 font-extrabold text-amber-400">{anom.ml_anomaly_score} / 100</td>
                  <td className="p-3.5">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {anom.classification}
                    </span>
                  </td>
                  <td className="p-3.5 text-slate-300 font-mono text-xs">
                    T:{anom.motor_temperature_c}°C | V:{anom.vibration_mm_s}mm/s | I:{anom.motor_current_a}A
                  </td>
                  <td className="p-3.5">
                    <div className="flex flex-wrap gap-1.5">
                      {anom.top_deviations.map((dev: any, idx: number) => (
                        <span key={idx} className="px-2.5 py-1 rounded text-xs font-semibold bg-slate-800 text-slate-200 border border-slate-700">
                          {dev.feature}: {dev.direction === 'High' ? '+' : ''}{dev.z_score}σ ({dev.value})
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION B: Supervised Maintenance Risk Prediction Model */}
      <div className="industrial-card p-8 space-y-8">
        <div className="border-b border-slate-800 pb-5">
          <h3 className="text-xl font-black text-white flex items-center space-x-3">
            <ShieldAlert className="text-emerald-400" size={24} />
            <span>B. Supervised Maintenance-Risk Prediction Model</span>
          </h3>
          <p className="text-sm text-slate-400 mt-1">{target_definition}</p>
        </div>

        {/* Model Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-5">
          <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700">
            <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Precision</div>
            <div className="text-3xl font-black text-white mt-1.5">{(metrics.precision * 100).toFixed(1)}%</div>
            <div className="text-xs text-slate-400 mt-1">True positive accuracy</div>
          </div>
          <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700">
            <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Recall</div>
            <div className="text-3xl font-black text-white mt-1.5">{(metrics.recall * 100).toFixed(1)}%</div>
            <div className="text-xs text-slate-400 mt-1">Sensitivity / Detection</div>
          </div>
          <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700">
            <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">F1 Score</div>
            <div className="text-3xl font-black text-emerald-400 mt-1.5">{metrics.f1_score.toFixed(3)}</div>
            <div className="text-xs text-slate-400 mt-1">Harmonic mean balance</div>
          </div>
          <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700">
            <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">PR-AUC</div>
            <div className="text-3xl font-black text-indigo-400 mt-1.5">{metrics.pr_auc.toFixed(3)}</div>
            <div className="text-xs text-slate-400 mt-1">Precision-Recall Area</div>
          </div>
          <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700">
            <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Baseline F1</div>
            <div className="text-3xl font-black text-slate-400 mt-1.5">{metrics.baseline_f1.toFixed(3)}</div>
            <div className="text-xs text-slate-400 mt-1">Majority classifier</div>
          </div>
        </div>

        {/* Feature Importances & Predicted Risk Rankings */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* Feature Importances Bar Chart */}
          <InteractiveChartCard
            title="Model Feature Importances"
            subtitle="Relative contribution towards predictive risk scoring"
            chartHeight="h-[360px]"
          >
            <Plot
              data={[
                {
                  x: feature_importances.map((f: any) => f.feature),
                  y: feature_importances.map((f: any) => f.importance),
                  type: 'bar',
                  marker: { color: '#8b5cf6' }
                }
              ]}
              layout={{
                ...plotlyLayoutDefaults,
                title: false,
                xaxis: { title: { text: 'Telemetry Sensor Feature', font: { size: 14 } }, tickangle: -30, tickfont: { size: 12 } },
                yaxis: { title: { text: 'Relative Importance Score (0.0 - 1.0)', font: { size: 14 } }, range: [0, 0.5], tickfont: { size: 12 } }
              }}
              useResizeHandler={true}
              style={{ width: '100%', height: '100%' }}
              config={{ responsive: true, displayModeBar: false }}
            />
          </InteractiveChartCard>

          {/* Predicted Risk Table for Highest Risk Robots */}
          <div className="industrial-card p-8 flex flex-col justify-between">
            <div>
              <h4 className="text-xl font-black text-white mb-4">Trained Model Predicted Risk (Next 24h)</h4>
              <div className="overflow-x-auto max-h-[360px]">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-800/90 text-slate-400 uppercase font-bold text-xs sticky top-0">
                    <tr>
                      <th className="p-3">Robot ID</th>
                      <th className="p-3">Motor Temp</th>
                      <th className="p-3">Vibration</th>
                      <th className="p-3">Predicted Risk Probability</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {latest_robot_risk_predictions
                      .sort((a: any, b: any) => b.model_predicted_risk_pct - a.model_predicted_risk_pct)
                      .slice(0, 8)
                      .map((r: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-800/50">
                          <td className="p-3 font-bold text-indigo-400">{r.robot_id}</td>
                          <td className="p-3">{r.motor_temperature_c}°C</td>
                          <td className="p-3">{r.vibration_mm_s} mm/s</td>
                          <td className="p-3 font-extrabold text-rose-400">{r.model_predicted_risk_pct}%</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
