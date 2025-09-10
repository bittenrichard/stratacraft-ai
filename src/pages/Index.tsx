import React, { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Dashboard from '@/components/Dashboard';
import AICreative from '@/components/AICreative';
import Campaigns from '@/components/Campaigns';
import Integrations from '@/components/Integrations';
import CreativeLibrary from '@/components/CreativeLibrary';
import CalendarView from '@/components/CalendarView';
import FunnelView from '@/components/FunnelView';
import LeadsView from '@/components/LeadsView';
import SettingsView from '@/components/SettingsView';
import TeamView from '@/components/TeamView';
import DiagnosisView from '@/components/DiagnosisView';
import AnalyticsView from '@/components/AnalyticsView'; // Importa a IA Analítica
import ReportsView from '@/components/ReportsView';   // Importa os Relatórios

const Index = () => {
  // Verifica se há uma tab para abrir do local storage
  const initialTab = () => {
    const savedTab = localStorage.getItem('openTab');
    if (savedTab) {
      localStorage.removeItem('openTab'); // Remove após ler
      return savedTab;
    }
    return 'dashboard';
  };

  const [activeTab, setActiveTab] = useState(initialTab);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'funnel': return <FunnelView />;
      case 'leads': return <LeadsView />;
      case 'ai-creative': return <AICreative />;
      case 'campaigns': return <Campaigns />;
      case 'integrations': return <Integrations />;
      case 'creative-library': return <CreativeLibrary />;
      case 'calendar': return <CalendarView />;
      case 'settings': return <SettingsView />;
      case 'team': return <TeamView />;
      case 'diagnosis': return <DiagnosisView />;
      case 'analytics': return <AnalyticsView />; // Adiciona o case
      case 'reports': return <ReportsView />;     // Adiciona o case
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="flex-1 overflow-auto">
        {renderContent()}
      </div>
    </div>
  );
};

export default Index;