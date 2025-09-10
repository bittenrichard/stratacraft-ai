import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  BarChart3, 
  Brain, 
  Calendar, 
  Target, 
  Settings, 
  Users, 
  FileText,
  TrendingUp,
  Zap
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Sidebar = ({ activeTab, setActiveTab }: SidebarProps) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'campaigns', label: 'Campanhas', icon: TrendingUp },
    { id: 'ai-creative', label: 'IA Criativa', icon: Brain },
    { id: 'analytics', label: 'IA Analítica', icon: Zap },
    { id: 'calendar', label: 'Calendário', icon: Calendar },
    { id: 'diagnosis', label: 'Diagnóstico', icon: Target },
    { id: 'reports', label: 'Relatórios', icon: FileText },
    { id: 'team', label: 'Equipe', icon: Users },
    { id: 'settings', label: 'Configurações', icon: Settings },
  ];

  return (
    <div className="w-64 bg-gradient-card border-r border-border h-screen p-4 shadow-card">
      {/* Logo */}
      <div className="mb-8">
        <h2 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          MarketingAI
        </h2>
        <p className="text-xs text-muted-foreground">Plataforma SaaS</p>
      </div>

      {/* Menu Items */}
      <nav className="space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <Button
              key={item.id}
              variant={activeTab === item.id ? "default" : "ghost"}
              className={`w-full justify-start transition-smooth ${
                activeTab === item.id 
                  ? "bg-gradient-primary text-primary-foreground shadow-glow" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
              onClick={() => setActiveTab(item.id)}
            >
              <Icon className="mr-3 h-4 w-4" />
              {item.label}
            </Button>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="absolute bottom-4 left-4 right-4">
        <div className="bg-muted/30 rounded-lg p-3 border border-border">
          <h4 className="text-sm font-medium text-foreground mb-1">Upgrade Pro</h4>
          <p className="text-xs text-muted-foreground mb-2">
            Desbloqueie recursos avançados de IA
          </p>
          <Button size="sm" className="w-full bg-gradient-primary text-xs">
            Upgrade
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;