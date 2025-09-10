import React, { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Dashboard from '@/components/Dashboard';
import AICreative from '@/components/AICreative';

const Index = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'ai-creative':
        return <AICreative />;
      case 'campaigns':
      case 'analytics':
      case 'calendar':
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
                Esta seção será implementada após conectar o Supabase para funcionalidades backend
              </p>
              <div className="bg-gradient-card border border-border rounded-lg p-6 max-w-md mx-auto">
                <p className="text-sm text-muted-foreground">
                  Para ativar integrações com APIs (Meta Ads, Google Ads), IA e banco de dados, 
                  conecte seu projeto ao Supabase clicando no botão verde no canto superior direito.
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
      <div className="flex-1">
        {renderContent()}
      </div>
    </div>
  );
};

export default Index;
