import React, { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Dashboard from '@/components/Dashboard';
import AICreative from '@/components/AICreative';
import Campaigns from '@/components/Campaigns';
import Integrations from '@/components/Integrations';
import CreativeLibrary from '@/components/CreativeLibrary';
import CalendarView from '@/components/CalendarView';
import FunnelView from '@/components/FunnelView';
import LeadsView from '@/components/LeadsView'; // 1. Importamos o componente de Leads

const Index = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'funnel':
        return <FunnelView />;
      case 'leads': // 2. Adicionamos o "case" para leads
        return <LeadsView />; // 3. Renderizamos nosso novo componente
      case 'ai-creative':
        return <AICreative />;
      case 'campaigns':
        return <Campaigns />;
      case 'integrations':
        return <Integrations />;
      case 'creative-library':
        return <CreativeLibrary />;
      case 'calendar':
        return <CalendarView />;
      case 'analytics':
      case 'diagnosis':
      case 'reports':
      case 'team':
      case 'settings':
        return (
          <div className="min-h-screen bg-gradient-subtle p-6 flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-4">
                {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
              </h1>
              <p className="text-muted-foreground mb-6">
                Esta seção será implementada em breve.
              </p>
              <div className="bg-gradient-card border border-border rounded-lg p-6 max-w-md mx-auto">
                <p className="text-sm text-muted-foreground">
                  Funcionalidades avançadas como esta serão o próximo passo na evolução da plataforma.
                </p>
              </div>
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