
import { useState } from "react";
import { Navigation } from "./Navigation";
import { DashboardView } from "./DashboardView";
import { AddExpenseView } from "../components/AddExpenseView";
import { AdvancedAnalyticsView } from "./AdvancedAnalyticsView";
import { SettingsView } from "./SettingsView";

export const Dashboard = () => {
  // Estado para controlar qual tela está sendo mostrada
  const [currentView, setCurrentView] = useState("dashboard");

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Barra de navegação no topo */}
      <Navigation currentView={currentView} setCurrentView={setCurrentView} />
      
      {/* Conteúdo principal da aplicação */}
      <main className="container mx-auto px-4 py-8">
        
        {/* Mostra a tela do PAINEL quando selecionado */}
        {currentView === "dashboard" && <DashboardView />}
        
        {/* Mostra a tela de ADICIONAR GASTO quando selecionado */}
        {currentView === "add-expense" && <AddExpenseView setCurrentView={setCurrentView} />}
        
        {/* Mostra a tela de ANÁLISES quando selecionado */}
        {currentView === "analytics" && <AdvancedAnalyticsView />}
        
        {/* Mostra a tela de CONFIGURAÇÕES quando selecionado */}
        {currentView === "settings" && <SettingsView />}
        
      </main>
    </div>
  );
};
