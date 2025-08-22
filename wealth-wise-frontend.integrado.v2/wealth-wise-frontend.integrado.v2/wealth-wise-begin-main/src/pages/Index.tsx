
import { useState } from "react";
import { AuthForm } from "@/components/AuthForm";
import { Dashboard } from "@/components/Dashboard";
import { LoadingScreen } from "@/components/LoadingScreen";

const Index = () => {
  // Estados para controlar qual tela mostrar
  const [isLoading, setIsLoading] = useState(true);    // Tela de carregamento
  const [isLoggedIn, setIsLoggedIn] = useState(false); // Usuário logado ou não

  // Função chamada quando o carregamento termina
  const handleLoadingComplete = () => {
    setIsLoading(false);
  };

  // Função chamada quando o usuário faz login
  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  // Se ainda está carregando, mostra a tela de carregamento
  if (isLoading) {
    return <LoadingScreen onLoadingComplete={handleLoadingComplete} />;
  }

  // Se usuário está logado, mostra o dashboard
  if (isLoggedIn) {
    return <Dashboard />;
  }

  // Se não está carregando e não está logado, mostra o formulário de login
  return <AuthForm onLogin={handleLogin} />;
};

export default Index;
