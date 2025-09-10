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
import TeamView from '@/components/TeamView'; // 1. Importamos a tela de Equipe

const Index = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

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
      case 'team': return <TeamView />; // 2. Adicionamos o "case" para a equipe
      case 'analytics':
      case 'diagnosis':
      case 'reports':
        return (
          <div className="min-h-screen bg-gradient-subtle p-6 flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-4">
                {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
              </h1>
              <p className="text-muted-foreground mb-6">Esta seção será implementada em breve.</p>
            </div>
          </div>
        );
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