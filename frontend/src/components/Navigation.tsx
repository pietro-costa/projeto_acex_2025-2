import { Drawer, DrawerTrigger, DrawerContent, DrawerClose } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";

interface NavigationProps {
  currentView: string;
  setCurrentView: (view: string) => void;
}

export const Navigation = ({ currentView, setCurrentView }: NavigationProps) => {
  return (
    <nav className="bg-slate-800 shadow-sm border-b border-slate-700">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-4">
            <button
  type="button"
  onClick={() => setCurrentView("dashboard")}
  className="flex items-center focus:outline-none"
  aria-label="Ir para o Painel"
>
  <img
    src="fintyLogo-removebg-preview.png"          /* use /logo.svg se tiver SVG */
    alt="Finty"
    className="h-12 sm:h-13 md:h-14 w-auto select-none"
    draggable="false"
  />
</button>
              {/* Mobile (hamburger) */}
<div className="md:hidden">
  <Drawer>
    <DrawerTrigger asChild>
      <Button variant="ghost" size="icon" aria-label="Abrir menu">
        {/* ícone de menu */}
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"
             viewBox="0 0 24 24" fill="none" stroke="currentColor"
             strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </Button>
    </DrawerTrigger>

  <DrawerContent className="max-h-[80vh]">
  <div className="p-4 space-y-2">
    <DrawerClose asChild>
      <Button
        variant={currentView === "dashboard" ? "default" : "ghost"}
        onClick={() => setCurrentView("dashboard")}
        className="w-full justify-start"
      >📊 Painel</Button>
    </DrawerClose>

    <DrawerClose asChild>
      <Button
        variant={currentView === "add-expense" ? "default" : "ghost"}
        onClick={() => setCurrentView("add-expense")}
        className="w-full justify-start"
      >➕ Adicionar Transação</Button>
    </DrawerClose>

    <DrawerClose asChild>
      <Button
        variant={currentView === "analytics" ? "default" : "ghost"}
        onClick={() => setCurrentView("analytics")}
        className="w-full justify-start"
      >📈 Análises</Button>
    </DrawerClose>

    <DrawerClose asChild>
      <Button
        variant={currentView === "settings" ? "default" : "ghost"}
        onClick={() => setCurrentView("settings")}
        className="w-full justify-start"
      >⚙️ Configurações</Button>
    </DrawerClose>
  </div>
</DrawerContent>
  </Drawer>
</div>

            <div className="hidden md:flex space-x-1">
              {/* Botão PAINEL */}
              <Button
                variant={currentView === "dashboard" ? "default" : "ghost"}
                onClick={() => setCurrentView("dashboard")}
                className={`text-sm ${currentView === "dashboard" ? "bg-yellow-500 text-slate-900 hover:bg-yellow-600" : "text-white hover:bg-slate-700"}`}
              >
                📊 Painel
              </Button>
              
              {/* Botão ADICIONAR TRANSAÇÃO */}
              <Button
                variant={currentView === "add-expense" ? "default" : "ghost"}
                onClick={() => setCurrentView("add-expense")}
                className={`text-sm ${currentView === "add-expense" ? "bg-yellow-500 text-slate-900 hover:bg-yellow-600" : "text-white hover:bg-slate-700"}`}
              >
                ➕ Adicionar Transação
              </Button>
              
              {/* Botão ANÁLISES */}
              <Button
                variant={currentView === "analytics" ? "default" : "ghost"}
                onClick={() => setCurrentView("analytics")}
                className={`text-sm ${currentView === "analytics" ? "bg-yellow-500 text-slate-900 hover:bg-yellow-600" : "text-white hover:bg-slate-700"}`}
              >
                📈 Análises
              </Button>
              
              {/* Botão CONFIGURAÇÕES - NOVO! */}
              <Button
                variant={currentView === "settings" ? "default" : "ghost"}
                onClick={() => setCurrentView("settings")}
                className={`text-sm ${currentView === "settings" ? "bg-yellow-500 text-slate-900 hover:bg-yellow-600" : "text-white hover:bg-slate-700"}`}
              >
                ⚙️ Configurações
              </Button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};
