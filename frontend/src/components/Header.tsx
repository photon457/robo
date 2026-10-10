import React from 'react';
import { Clock, Filter, Activity, RefreshCw, UploadCloud } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  timeWindow: string;
  setTimeWindow: (w: string) => void;
  selectedRobot: string;
  setSelectedRobot: (r: string) => void;
  robotList?: string[];
  onRefresh?: () => void;
  onOpenImport?: () => void;
  isSimRunning?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  timeWindow,
  setTimeWindow,
  selectedRobot,
  setSelectedRobot,
  robotList = Array.from({ length: 50 }, (_, i) => `R${(i + 1).toString().padStart(3, '0')}`),
  onRefresh,
  onOpenImport,
  isSimRunning = false,
}) => {
  return (
    <header className="bg-slate-900/90 backdrop-blur-lg border-b border-slate-800/90 px-8 py-6 flex flex-col md:flex-row md:items-center md:justify-between gap-5 sticky top-0 z-30 shadow-lg">
      <div>
        <div className="flex items-center space-x-4">
          <h2 className="text-3xl font-black text-white tracking-tight">{title}</h2>
          {isSimRunning && (
            <span className="px-4 py-1.5 text-sm font-extrabold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center space-x-2 animate-pulse">
              <Activity size={16} />
              <span>LIVE SIMULATION TICKING</span>
            </span>
          )}
        </div>
        {subtitle && <p className="text-base font-medium text-slate-400 mt-1.5">{subtitle}</p>}
      </div>

      <div className="flex flex-wrap items-center gap-4">
        {/* Time Window Filter */}
        <div className="flex items-center bg-slate-800/90 border border-slate-700/80 rounded-xl px-4 py-2.5 text-base text-slate-200">
          <Clock size={18} className="text-indigo-400 mr-3" />
          <span className="text-slate-400 mr-2 font-semibold">Window:</span>
          <select 
            value={timeWindow} 
            onChange={(e) => setTimeWindow(e.target.value)}
            className="bg-transparent text-white font-bold outline-none cursor-pointer text-base"
          >
            <option value="all" className="bg-slate-900">All (30 Days)</option>
            <option value="24h" className="bg-slate-900">Last 24 Hours</option>
            <option value="7d" className="bg-slate-900">Last 7 Days</option>
            <option value="30d" className="bg-slate-900">Last 30 Days</option>
          </select>
        </div>

        {/* Robot Filter */}
        <div className="flex items-center bg-slate-800/90 border border-slate-700/80 rounded-xl px-4 py-2.5 text-base text-slate-200">
          <Filter size={18} className="text-indigo-400 mr-3" />
          <span className="text-slate-400 mr-2 font-semibold">Robot:</span>
          <select 
            value={selectedRobot} 
            onChange={(e) => setSelectedRobot(e.target.value)}
            className="bg-transparent text-white font-bold outline-none cursor-pointer text-base"
          >
            <option value="ALL" className="bg-slate-900">All Fleet (50 Robots)</option>
            {robotList.map((r) => (
              <option key={r} value={r} className="bg-slate-900">
                {r}
              </option>
            ))}
          </select>
        </div>

        {/* Import Dataset Button */}
        {onOpenImport && (
          <button 
            onClick={onOpenImport}
            className="flex items-center space-x-2.5 px-4 py-2.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 hover:text-white border border-indigo-500/40 transition-colors font-bold text-base cursor-pointer shadow-sm"
            title="Import Fleet Dataset CSVs"
          >
            <UploadCloud size={20} className="text-indigo-400" />
            <span>Import Dataset</span>
          </button>
        )}

        {/* Refresh Button */}
        {onRefresh && (
          <button 
            onClick={onRefresh}
            className="p-3 rounded-xl bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw size={20} />
          </button>
        )}
      </div>
    </header>
  );
};
