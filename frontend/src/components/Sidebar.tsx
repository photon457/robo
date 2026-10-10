import React from 'react';
import { 
  LayoutDashboard, 
  Bot, 
  Activity, 
  BrainCircuit, 
  Wrench, 
  ShieldAlert, 
  PlayCircle, 
  Database,
  Menu,
  X,
  UploadCloud
} from 'lucide-react';

export type PageId = 
  | 'overview' 
  | 'explorer' 
  | 'sensor-analytics' 
  | 'ai-risk' 
  | 'maintenance' 
  | 'coordinator' 
  | 'simulation' 
  | 'data-audit';

interface SidebarProps {
  activePage: PageId;
  setActivePage: (page: PageId) => void;
  pendingRecsCount?: number;
  isSimRunning?: boolean;
  onOpenImport?: () => void;
  robotCount?: number;
  sampleCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activePage,
  setActivePage,
  pendingRecsCount = 0,
  isSimRunning = false,
  onOpenImport,
  robotCount = 50,
  sampleCount = 36000,
}) => {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const navItems = [
    { id: 'overview' as PageId, label: 'Fleet Overview', icon: LayoutDashboard },
    { id: 'explorer' as PageId, label: 'Robot Health Explorer', icon: Bot },
    { id: 'sensor-analytics' as PageId, label: 'Multivariate Sensor Analytics', icon: Activity },
    { id: 'ai-risk' as PageId, label: 'Risk & Predictions', icon: BrainCircuit },
    { id: 'maintenance' as PageId, label: 'Maintenance Analytics', icon: Wrench },
    { 
      id: 'coordinator' as PageId, 
      label: 'Fleet Coordinator', 
      icon: ShieldAlert,
      badge: pendingRecsCount > 0 ? pendingRecsCount : undefined 
    },
    { 
      id: 'simulation' as PageId, 
      label: 'Live Simulation', 
      icon: PlayCircle,
      isSim: isSimRunning
    },
    { id: 'data-audit' as PageId, label: 'Data', icon: Database },
  ];

  const handleSelect = (id: PageId) => {
    setActivePage(id);
    setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="lg:hidden flex items-center justify-between p-5 bg-slate-900 border-b border-slate-800 text-white">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center font-black text-2xl">
            R
          </div>
          <span className="font-extrabold text-2xl tracking-tight text-indigo-400">AMR Fleet Coordinator</span>
        </div>
        <button 
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
        >
          {mobileOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {/* Sidebar Overlay for Mobile */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-72 bg-slate-900 border-r border-slate-800/90 text-slate-300 flex flex-col justify-between transition-transform duration-300 ease-in-out shrink-0
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div>
          {/* Header Branding */}
          <div className="px-5 py-6 border-b border-slate-800/80 flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center font-black text-2xl text-white shadow-lg shadow-indigo-500/30">
              R
            </div>
            <div>
              <h1 className="font-black text-xl text-white tracking-tight leading-tight">Robot Fleet</h1>
              <p className="text-sm text-indigo-400 font-bold uppercase tracking-wider mt-0.5">Health Coordinator</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item.id)}
                  className={`
                    w-full flex items-center justify-between px-4 py-3 rounded-xl text-[0.9rem] font-semibold transition-all duration-200 group cursor-pointer
                    ${isActive 
                      ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-xl shadow-indigo-600/25 ring-1 ring-indigo-400/30' 
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80'}
                  `}
                >
                  <div className="flex items-center space-x-3">
                    <Icon size={20} className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-400 transition-colors'} />
                    <span className="tracking-tight">{item.label}</span>
                  </div>

                  {item.badge !== undefined && (
                    <span className="px-2.5 py-0.5 text-xs font-black rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      {item.badge}
                    </span>
                  )}

                  {item.isSim && (
                    <span className="flex h-3.5 w-3.5 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer info & Import action */}
        <div className="px-5 py-4 border-t border-slate-800/80 bg-slate-950/60 text-sm text-slate-400 space-y-2">
          <div className="flex justify-between items-center font-bold">
            <span className="text-slate-300">Active Fleet Dataset</span>
            <span className="text-emerald-400 font-extrabold px-2.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">{robotCount} Robots</span>
          </div>
          <p className="text-sm text-slate-500">{sampleCount ? `${sampleCount.toLocaleString()} hourly telemetry samples` : 'Active fleet streams'}</p>

          {onOpenImport && (
            <button
              onClick={onOpenImport}
              className="w-full mt-2 py-2 px-3 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-bold flex items-center justify-center space-x-2 transition cursor-pointer"
            >
              <UploadCloud size={16} />
              <span>Import Dataset CSVs</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
