/* 
   TELA DE CARREGAMENTO - LOADINGSCREEN.TSX
   Esta tela mostra o nome do projeto com animações enquanto carrega
   Depois de alguns segundos, ela some e mostra a tela de login
*/

import { useEffect, useState } from "react";

// Propriedades que este componente recebe
interface LoadingScreenProps {
  onLoadingComplete: () => void; // Função que chama quando termina de carregar
}

export const LoadingScreen = ({ onLoadingComplete }: LoadingScreenProps) => {
  // Estado para controlar se está carregando ou não
  const [isLoading, setIsLoading] = useState(true);
  // Estado para controlar a animação do texto letra por letra
  const [displayedText, setDisplayedText] = useState("");
  
  const welcomeText = "Olá, seja bem-vindo(a)";

  // useEffect executa quando o componente aparece na tela
  useEffect(() => {
    // Anima o texto letra por letra depois de 2 segundos
    const textTimer = setTimeout(() => {
      let index = 0;
      const textInterval = setInterval(() => {
        if (index < welcomeText.length) {
          setDisplayedText(welcomeText.slice(0, index + 1));
          index++;
        } else {
          clearInterval(textInterval);
        }
      }, 100); // 100ms por letra
      
      return () => clearInterval(textInterval);
    }, 2000);

    // Timer que espera 6 segundos e depois para o carregamento
    const timer = setTimeout(() => {
      setIsLoading(false);
      onLoadingComplete(); // Chama a função para ir para a próxima tela
    }, 6000); // 6000 milissegundos = 6 segundos

    // Limpa os timers quando o componente sai da tela
    return () => {
      clearTimeout(timer);
      clearTimeout(textTimer);
    };
  }, [onLoadingComplete]);

  // Se não está mais carregando, não mostra nada
  if (!isLoading) return null;

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      {/* Container principal da tela de carregamento - Layout Minimalista */}
      <div className="text-center space-y-12">
        
        {/* LOGO FINTY - Simples e elegante */}
        <div className="relative">
          <h1 className="text-7xl md:text-9xl font-light text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600 animate-pulse tracking-wide">
            FINTY
          </h1>
        </div>

        {/* TEXTO ANIMADO LETRA POR LETRA */}
        <div className="h-8">
          <p className="text-lg md:text-xl text-slate-300 font-light tracking-wide">
            {displayedText}
            <span className="animate-pulse">|</span>
          </p>
        </div>

        {/* INDICADOR DE CARREGAMENTO MINIMALISTA */}
        <div className="flex justify-center space-x-2 mt-16">
          <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
          <div className="w-2 h-2 bg-yellow-600 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
        </div>
      </div>
    </div>
  );
};