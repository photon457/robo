import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  UploadCloud, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Check,
  ChevronDown,
  ChevronUp,
  Info
} from 'lucide-react';

interface FileStatus {
  filename: string;
  label: string;
  description: string;
  exists: boolean;
  size_bytes: number;
  size_kb: number;
  last_modified: string | null;
  row_count: number;
  columns: string[];
}

interface ImportDatasetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDatasetUpdated: () => void;
}

export const ImportDatasetModal: React.FC<ImportDatasetModalProps> = ({
  isOpen,
  onClose,
  onDatasetUpdated,
}) => {
  const [fileStatuses, setFileStatuses] = useState<Record<string, FileStatus> | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<{
    sensor_timeseries?: File;
    robot_summary?: File;
    maintenance_events?: File;
  }>({});
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showSchemaGuide, setShowSchemaGuide] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const sensorInputRef = useRef<HTMLInputElement>(null);
  const summaryInputRef = useRef<HTMLInputElement>(null);
  const maintInputRef = useRef<HTMLInputElement>(null);

  const fetchStatus = () => {
    fetch('/api/dataset/status')
      .then((r) => r.json())
      .then((data) => {
        if (data.files) {
          setFileStatuses(data.files);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
      setUploadSuccess(null);
      setUploadError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Auto classify dropped or picked files
  const classifyAndSetFiles = (files: FileList | File[]) => {
    const newSelected = { ...selectedFiles };
    Array.from(files).forEach((file) => {
      const name = file.name.toLowerCase();
      if (name.includes('sensor') || name.includes('timeseries') || name.includes('telemetry')) {
        newSelected.sensor_timeseries = file;
      } else if (name.includes('summary') || (name.includes('robot') && !name.includes('sensor'))) {
        newSelected.robot_summary = file;
      } else if (name.includes('maint') || name.includes('event') || name.includes('repair')) {
        newSelected.maintenance_events = file;
      } else if (name.endsWith('.csv')) {
        // default slot if empty
        if (!newSelected.sensor_timeseries) newSelected.sensor_timeseries = file;
        else if (!newSelected.robot_summary) newSelected.robot_summary = file;
        else if (!newSelected.maintenance_events) newSelected.maintenance_events = file;
      }
    });
    setSelectedFiles(newSelected);
    setUploadError(null);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      classifyAndSetFiles(e.dataTransfer.files);
    }
  };

  const handleGlobalFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      classifyAndSetFiles(e.target.files);
    }
  };

  const handleUploadSubmit = async () => {
    const filesToUpload = Object.values(selectedFiles).filter(Boolean) as File[];
    if (filesToUpload.length === 0) {
      setUploadError('Please select at least one CSV file to import.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    const formData = new FormData();
    filesToUpload.forEach((f) => {
      formData.append('files', f);
    });

    try {
      const res = await fetch('/api/dataset/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail?.errors?.[0]?.error || data.detail || 'Upload failed');
      }

      setUploadSuccess(`Successfully imported ${data.imported?.length || filesToUpload.length} file(s)! Dataset database rebuilt and ML baselines updated.`);
      setSelectedFiles({});
      fetchStatus();
      onDatasetUpdated();
    } catch (err: any) {
      setUploadError(err.message || 'An error occurred during dataset import.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleReloadExisting = async () => {
    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(null);
    try {
      const res = await fetch('/api/dataset/reload', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to reload dataset.');
      setUploadSuccess('Successfully reloaded and validated existing dataset files from disk.');
      fetchStatus();
      onDatasetUpdated();
    } catch (err: any) {
      setUploadError(err.message || 'Reload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  const hasAnySelected = Object.keys(selectedFiles).length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl shadow-indigo-950/50 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-8 py-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30">
              <UploadCloud size={26} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-white tracking-tight">Import Fleet Dataset</h3>
              <p className="text-sm font-medium text-slate-400">
                Upload or replace the 3 core CSV dataset files for full fleet data processing
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={22} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-8 overflow-y-auto space-y-6 flex-1 text-slate-200">
          {/* Notifications */}
          {uploadSuccess && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-start space-x-3 text-sm font-semibold">
              <CheckCircle2 size={20} className="shrink-0 mt-0.5 text-emerald-400" />
              <div className="flex-1">{uploadSuccess}</div>
            </div>
          )}

          {uploadError && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start space-x-3 text-sm font-semibold">
              <AlertCircle size={20} className="shrink-0 mt-0.5 text-rose-400" />
              <div className="flex-1">{uploadError}</div>
            </div>
          )}

          {/* Drag & Drop Global Zone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`
              border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200
              ${dragActive 
                ? 'border-indigo-500 bg-indigo-500/10' 
                : 'border-slate-700 hover:border-indigo-500/50 hover:bg-slate-800/40 bg-slate-800/20'}
            `}
          >
            <input 
              ref={fileInputRef}
              type="file" 
              multiple 
              accept=".csv" 
              className="hidden" 
              onChange={handleGlobalFileInput}
            />
            <div className="flex flex-col items-center justify-center space-y-2">
              <div className="p-3 bg-slate-800 text-indigo-400 rounded-full border border-slate-700">
                <FileSpreadsheet size={28} />
              </div>
              <p className="text-base font-bold text-white">
                Drag & drop CSV files here, or <span className="text-indigo-400 underline underline-offset-2">browse files</span>
              </p>
              <p className="text-xs text-slate-400">
                Supports multiple selection: select <span className="text-slate-300 font-mono">sensor_timeseries.csv</span>, <span className="text-slate-300 font-mono">robot_summary.csv</span>, and <span className="text-slate-300 font-mono">maintenance_events.csv</span>
              </p>
            </div>
          </div>

          {/* Three CSV Slots Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Slot 1: sensor_timeseries.csv */}
            <div className={`p-5 rounded-xl border flex flex-col justify-between transition-all ${
              selectedFiles.sensor_timeseries 
                ? 'bg-indigo-950/30 border-indigo-500/60 shadow-lg shadow-indigo-500/10' 
                : 'bg-slate-800/40 border-slate-700/80'
            }`}>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Primary Telemetry
                  </span>
                  {selectedFiles.sensor_timeseries ? (
                    <span className="flex items-center text-xs text-emerald-400 font-bold">
                      <Check size={14} className="mr-1" /> Ready
                    </span>
                  ) : fileStatuses?.sensor_timeseries?.exists ? (
                    <span className="text-xs text-slate-400 font-semibold">Active</span>
                  ) : (
                    <span className="text-xs text-amber-400 font-semibold">Missing</span>
                  )}
                </div>
                <h4 className="font-black text-white text-base tracking-tight mb-1 font-mono">sensor_timeseries.csv</h4>
                <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                  Hourly sensor streams: SoC, voltage, temperature, vibration, current, utilization.
                </p>

                {/* Current Status on Disk */}
                {fileStatuses?.sensor_timeseries?.exists && (
                  <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 text-[11px] text-slate-300 space-y-1 mb-4 font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Rows:</span>
                      <span className="text-white font-bold">{fileStatuses.sensor_timeseries.row_count.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Size:</span>
                      <span className="text-white font-bold">{fileStatuses.sensor_timeseries.size_kb} KB</span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <input 
                  ref={sensorInputRef}
                  type="file" 
                  accept=".csv" 
                  className="hidden" 
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      setSelectedFiles(prev => ({ ...prev, sensor_timeseries: e.target.files![0] }));
                    }
                  }}
                />
                {selectedFiles.sensor_timeseries ? (
                  <div className="space-y-2">
                    <div className="text-xs text-indigo-300 font-mono truncate bg-indigo-900/40 p-2 rounded border border-indigo-500/30">
                      📄 {selectedFiles.sensor_timeseries.name}
                    </div>
                    <button 
                      onClick={() => setSelectedFiles(prev => {
                        const copy = { ...prev };
                        delete copy.sensor_timeseries;
                        return copy;
                      })}
                      className="w-full text-xs text-rose-400 hover:text-rose-300 font-semibold cursor-pointer text-center"
                    >
                      Remove selection
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => sensorInputRef.current?.click()}
                    className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition cursor-pointer"
                  >
                    Select File
                  </button>
                )}
              </div>
            </div>

            {/* Slot 2: robot_summary.csv */}
            <div className={`p-5 rounded-xl border flex flex-col justify-between transition-all ${
              selectedFiles.robot_summary 
                ? 'bg-indigo-950/30 border-indigo-500/60 shadow-lg shadow-indigo-500/10' 
                : 'bg-slate-800/40 border-slate-700/80'
            }`}>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    Fleet Metadata
                  </span>
                  {selectedFiles.robot_summary ? (
                    <span className="flex items-center text-xs text-emerald-400 font-bold">
                      <Check size={14} className="mr-1" /> Ready
                    </span>
                  ) : fileStatuses?.robot_summary?.exists ? (
                    <span className="text-xs text-slate-400 font-semibold">Active</span>
                  ) : (
                    <span className="text-xs text-amber-400 font-semibold">Auto-gen</span>
                  )}
                </div>
                <h4 className="font-black text-white text-base tracking-tight mb-1 font-mono">robot_summary.csv</h4>
                <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                  Robot operating hours, maintenance count, historical downtime, risk benchmarks.
                </p>

                {/* Current Status on Disk */}
                {fileStatuses?.robot_summary?.exists && (
                  <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 text-[11px] text-slate-300 space-y-1 mb-4 font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Rows:</span>
                      <span className="text-white font-bold">{fileStatuses.robot_summary.row_count.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Size:</span>
                      <span className="text-white font-bold">{fileStatuses.robot_summary.size_kb} KB</span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <input 
                  ref={summaryInputRef}
                  type="file" 
                  accept=".csv" 
                  className="hidden" 
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      setSelectedFiles(prev => ({ ...prev, robot_summary: e.target.files![0] }));
                    }
                  }}
                />
                {selectedFiles.robot_summary ? (
                  <div className="space-y-2">
                    <div className="text-xs text-indigo-300 font-mono truncate bg-indigo-900/40 p-2 rounded border border-indigo-500/30">
                      📄 {selectedFiles.robot_summary.name}
                    </div>
                    <button 
                      onClick={() => setSelectedFiles(prev => {
                        const copy = { ...prev };
                        delete copy.robot_summary;
                        return copy;
                      })}
                      className="w-full text-xs text-rose-400 hover:text-rose-300 font-semibold cursor-pointer text-center"
                    >
                      Remove selection
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => summaryInputRef.current?.click()}
                    className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition cursor-pointer"
                  >
                    Select File
                  </button>
                )}
              </div>
            </div>

            {/* Slot 3: maintenance_events.csv */}
            <div className={`p-5 rounded-xl border flex flex-col justify-between transition-all ${
              selectedFiles.maintenance_events 
                ? 'bg-indigo-950/30 border-indigo-500/60 shadow-lg shadow-indigo-500/10' 
                : 'bg-slate-800/40 border-slate-700/80'
            }`}>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Repair History
                  </span>
                  {selectedFiles.maintenance_events ? (
                    <span className="flex items-center text-xs text-emerald-400 font-bold">
                      <Check size={14} className="mr-1" /> Ready
                    </span>
                  ) : fileStatuses?.maintenance_events?.exists ? (
                    <span className="text-xs text-slate-400 font-semibold">Active</span>
                  ) : (
                    <span className="text-xs text-amber-400 font-semibold">Optional</span>
                  )}
                </div>
                <h4 className="font-black text-white text-base tracking-tight mb-1 font-mono">maintenance_events.csv</h4>
                <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                  Log of repair actions: component, event type, downtime hours, maintenance costs.
                </p>

                {/* Current Status on Disk */}
                {fileStatuses?.maintenance_events?.exists && (
                  <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 text-[11px] text-slate-300 space-y-1 mb-4 font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Rows:</span>
                      <span className="text-white font-bold">{fileStatuses.maintenance_events.row_count.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Size:</span>
                      <span className="text-white font-bold">{fileStatuses.maintenance_events.size_kb} KB</span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <input 
                  ref={maintInputRef}
                  type="file" 
                  accept=".csv" 
                  className="hidden" 
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      setSelectedFiles(prev => ({ ...prev, maintenance_events: e.target.files![0] }));
                    }
                  }}
                />
                {selectedFiles.maintenance_events ? (
                  <div className="space-y-2">
                    <div className="text-xs text-indigo-300 font-mono truncate bg-indigo-900/40 p-2 rounded border border-indigo-500/30">
                      📄 {selectedFiles.maintenance_events.name}
                    </div>
                    <button 
                      onClick={() => setSelectedFiles(prev => {
                        const copy = { ...prev };
                        delete copy.maintenance_events;
                        return copy;
                      })}
                      className="w-full text-xs text-rose-400 hover:text-rose-300 font-semibold cursor-pointer text-center"
                    >
                      Remove selection
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => maintInputRef.current?.click()}
                    className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition cursor-pointer"
                  >
                    Select File
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Collapsible Schema Requirements Guide */}
          <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/60">
            <button 
              onClick={() => setShowSchemaGuide(!showSchemaGuide)}
              className="w-full px-5 py-3 flex items-center justify-between text-xs font-bold text-slate-300 hover:text-white bg-slate-800/40 cursor-pointer"
            >
              <div className="flex items-center space-x-2">
                <Info size={16} className="text-indigo-400" />
                <span>CSV Schema Specification & Supported Column Names</span>
              </div>
              {showSchemaGuide ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {showSchemaGuide && (
              <div className="p-5 text-xs text-slate-300 space-y-4 bg-slate-950/40 font-mono border-t border-slate-800">
                <div>
                  <span className="font-bold text-indigo-400">1. sensor_timeseries.csv</span>:
                  <p className="text-slate-400 text-[11px] mt-1 font-sans">
                    Required: <code className="text-slate-200">robot_id, timestamp, battery_soc_pct, battery_voltage_v, motor_temperature_c, vibration_mm_s, motor_current_a, motor_speed_m_s, payload_kg, utilization_pct, task_active, charging</code>
                  </p>
                </div>
                <div>
                  <span className="font-bold text-purple-400">2. robot_summary.csv</span>:
                  <p className="text-slate-400 text-[11px] mt-1 font-sans">
                    Required: <code className="text-slate-200">robot_id, operating_hours_total, maintenance_events_count, historical_downtime_hours, avg_health_score_24h</code> (auto-generated if omitted).
                  </p>
                </div>
                <div>
                  <span className="font-bold text-emerald-400">3. maintenance_events.csv</span>:
                  <p className="text-slate-400 text-[11px] mt-1 font-sans">
                    Required: <code className="text-slate-200">event_id, robot_id, event_date, component, event_type, downtime_hours, maintenance_cost_usd</code> (optional).
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-8 py-5 border-t border-slate-800 bg-slate-900/95 flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            onClick={handleReloadExisting}
            disabled={isUploading}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-sm font-bold border border-slate-700 transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={16} className={isUploading ? 'animate-spin' : ''} />
            <span>Reload Existing Files</span>
          </button>

          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 text-sm font-bold transition cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={handleUploadSubmit}
              disabled={isUploading || !hasAnySelected}
              className={`
                flex-1 sm:flex-none flex items-center justify-center space-x-2 px-6 py-2.5 rounded-xl text-sm font-extrabold text-white transition-all shadow-lg cursor-pointer
                ${hasAnySelected 
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 shadow-indigo-600/30' 
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'}
                ${isUploading ? 'opacity-70 cursor-wait' : ''}
              `}
            >
              {isUploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Processing Dataset...</span>
                </>
              ) : (
                <>
                  <UploadCloud size={18} />
                  <span>Import & Process Dataset</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
