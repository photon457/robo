import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import type { PageId } from './components/Sidebar';
import { Header } from './components/Header';
import { ImportDatasetModal } from './components/ImportDatasetModal';
import { FleetOverviewPage } from './pages/FleetOverviewPage';
import { RobotExplorerPage } from './pages/RobotExplorerPage';
import { SensorAnalyticsPage } from './pages/SensorAnalyticsPage';
import { AIRiskPredictionsPage } from './pages/AIRiskPredictionsPage';
import { MaintenanceAnalyticsPage } from './pages/MaintenanceAnalyticsPage';
import { FleetCoordinatorPage } from './pages/FleetCoordinatorPage';
import { LiveSimulationPage } from './pages/LiveSimulationPage';
import { DataIntegrityPage } from './pages/DataIntegrityPage';
import type { SimulationState } from './types';

export const App: React.FC = () => {
  const [activePage, setActivePage] = useState<PageId>('overview');
  const [timeWindow, setTimeWindow] = useState<string>('all');
  const [selectedRobot, setSelectedRobot] = useState<string>('ALL');
  const [simState, setSimState] = useState<SimulationState | null>(null);
  const [pendingRecsCount, setPendingRecsCount] = useState<number>(0);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [robotList, setRobotList] = useState<string[]>([]);
  const [datasetMetrics, setDatasetMetrics] = useState<{ robots: number; samples: number }>({
    robots: 50,
    samples: 36000,
  });
  const [refreshKey, setRefreshKey] = useState<number>(0);

  const fetchRobots = useCallback(() => {
    fetch('/api/fleet/robots')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.robots) && data.robots.length > 0) {
          setRobotList(data.robots);
        }
      })
      .catch(() => {});
  }, []);

  const fetchDatasetMetrics = useCallback(() => {
    fetch('/api/dataset/summary')
      .then((r) => r.json())
      .then((data) => {
        if (data?.sensor_timeseries) {
          setDatasetMetrics({
            robots: data.sensor_timeseries.unique_robots || 50,
            samples: data.sensor_timeseries.rows || 36000,
          });
        }
      })
      .catch(() => {});
  }, []);

  const fetchRecommendationsCount = useCallback(() => {
    fetch('/api/recommendations')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const pending = data.filter((item: any) => item.priority === 'Critical' || item.priority === 'High').length;
          setPendingRecsCount(pending);
        }
      })
      .catch(() => {});
  }, []);

  const fetchSimState = useCallback(() => {
    fetch('/api/simulation/state')
      .then((r) => r.json())
      .then((data) => setSimState(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchRobots();
    fetchDatasetMetrics();
    fetchRecommendationsCount();
    fetchSimState();
  }, [fetchRobots, fetchDatasetMetrics, fetchRecommendationsCount, fetchSimState]);

  const handleDatasetUpdated = () => {
    fetchRobots();
    fetchDatasetMetrics();
    fetchRecommendationsCount();
    fetchSimState();
    setRefreshKey((prev) => prev + 1);
  };

  useEffect(() => {
    let timer: any = null;
    if (simState?.running) {
      const intervalMs = Math.max(200, 1000 / (simState.speed || 1));
      timer = setInterval(() => {
        fetch('/api/simulation/control', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'step' })
        })
          .then((r) => r.json())
          .then((data) => setSimState(data))
          .catch(() => {});
      }, intervalMs);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [simState?.running, simState?.speed]);

  const handleSimControl = (action: string, speed?: number) => {
    fetch('/api/simulation/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, speed })
    })
      .then((r) => r.json())
      .then((data) => setSimState(data));
  };

  const getPageTitle = (page: PageId) => {
    switch (page) {
      case 'overview': return { title: 'Fleet Overview', subtitle: 'Real-time AMR Fleet KPI Metrics & Health Distribution' };
      case 'explorer': return { title: 'Robot Health Explorer', subtitle: 'Deep Telemetry & Maintenance Inspector per Unit' };
      case 'sensor-analytics': return { title: 'Multivariate Sensor Analytics', subtitle: '3D Scatter, Parallel Coordinates, Box Plots & Correlation Matrices' };
      case 'ai-risk': return { title: 'Risk & Predictions', subtitle: 'Unsupervised Anomaly Detection & Predictive Risk Model' };
      case 'maintenance': return { title: 'Maintenance Analytics', subtitle: 'Cost Treemaps, Component Pareto Distributions & Repair History' };
      case 'coordinator': return { title: 'Fleet Coordinator', subtitle: 'Actionable Prioritized Recommendations & Automated Task Reassignment' };
      case 'simulation': return { title: 'Live Fleet Simulation', subtitle: 'Real-Time Operational Telemetry Stream & Dynamic Fleet Health Engine' };
      case 'data-audit': return { title: 'Data', subtitle: 'Dataset Schema Validation & Quality Assessment' };
    }
  };

  const { title, subtitle } = getPageTitle(activePage);

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        pendingRecsCount={pendingRecsCount}
        isSimRunning={simState?.running}
        onOpenImport={() => setIsImportModalOpen(true)}
        robotCount={datasetMetrics.robots}
        sampleCount={datasetMetrics.samples}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header
          title={title}
          subtitle={subtitle}
          timeWindow={timeWindow}
          setTimeWindow={setTimeWindow}
          selectedRobot={selectedRobot}
          setSelectedRobot={setSelectedRobot}
          robotList={robotList}
          isSimRunning={simState?.running}
          onOpenImport={() => setIsImportModalOpen(true)}
          onRefresh={() => {
            fetchRecommendationsCount();
            fetchSimState();
            fetchDatasetMetrics();
            fetchRobots();
            setRefreshKey((prev) => prev + 1);
          }}
        />

        <main className="flex-1 pb-12" key={refreshKey}>
          {activePage === 'overview' && (
            <FleetOverviewPage timeWindow={timeWindow} selectedRobot={selectedRobot} />
          )}
          {activePage === 'explorer' && (
            <RobotExplorerPage selectedRobot={selectedRobot} setSelectedRobot={setSelectedRobot} />
          )}
          {activePage === 'sensor-analytics' && (
            <SensorAnalyticsPage selectedRobot={selectedRobot} />
          )}
          {activePage === 'ai-risk' && (
            <AIRiskPredictionsPage selectedRobot={selectedRobot} />
          )}
          {activePage === 'maintenance' && (
            <MaintenanceAnalyticsPage />
          )}
          {activePage === 'coordinator' && (
            <FleetCoordinatorPage />
          )}
          {activePage === 'simulation' && (
            <LiveSimulationPage
              simState={simState}
              onControl={handleSimControl}
            />
          )}
          {activePage === 'data-audit' && (
            <DataIntegrityPage onOpenImport={() => setIsImportModalOpen(true)} onDatasetUpdated={handleDatasetUpdated} />
          )}
        </main>
      </div>

      {/* Global Import Dataset Modal */}
      <ImportDatasetModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onDatasetUpdated={handleDatasetUpdated}
      />
    </div>
  );
};

export default App;
