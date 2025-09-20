import { Drawer, DrawerTrigger, DrawerContent, DrawerClose } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";

interface NavigationProps {
  currentView: string;
  setCurrentView: (view: string) => void;
}

/** Ícone pequeno para os botões da navbar */
const NavIcon = ({ src, alt }: { src: string; alt: string }) => (
  <img
    src={src}
    alt={alt}
    className="h-5 w-5 mr-2 object-contain select-none"
    draggable="false"
    loading="lazy"
    decoding="async"
  />
);

export const Navigation = ({ currentView, setCurrentView }: NavigationProps) => {
  return (
    <nav className="bg-slate-800 shadow-sm border-b border-slate-700">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-4">
            {/* Logo clica para Painel */}
            <button
              type="button"
              onClick={() => setCurrentView("dashboard")}
              className="flex items-center focus:outline-none"
              aria-label="Ir para o Painel"
            >
              <img
                src="logoabas2.png" /* use /logo.svg se tiver SVG */
                alt="Finty"
                className="h-10 sm:h-10 md:h-9 w-auto select-none"
                draggable="false"
              />
            </button>

            {/* Mobile (hamburger) */}
            <div className="md:hidden">
              <Drawer>
                <DrawerTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Abrir menu">
                    {/* ícone de menu */}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="3" y1="6" x2="21" y2="6" />
                      <line x1="3" y1="12" x2="21" y2="12" />
                      <line x1="3" y1="18" x2="21" y2="18" />
                    </svg>
                  </Button>
                </DrawerTrigger>

                <DrawerContent className="max-h-[80vh]">
                  <div className="p-4 space-y-2">
                    {/* PAINEL (com ícone) */}
                    <DrawerClose asChild>
                      <Button
                        variant={currentView === "dashboard" ? "default" : "ghost"}
                        onClick={() => setCurrentView("dashboard")}
                        className="w-full justify-start"
                      >
                        <NavIcon src="/painel.png" alt="Painel" />
                        Painel
                      </Button>
                    </DrawerClose>

                    {/* ADICIONAR TRANSAÇÃO (mantido) */}
                    <DrawerClose asChild>
                      <Button
                        variant={currentView === "add-expense" ? "default" : "ghost"}
                        onClick={() => setCurrentView("add-expense")}
                        className="w-full justify-start"
                      >
                        ➕ Adicionar Transação
                      </Button>
                    </DrawerClose>

                    {/* ANÁLISES (com ícone) */}
                    <DrawerClose asChild>
                      <Button
                        variant={currentView === "analytics" ? "default" : "ghost"}
                        onClick={() => setCurrentView("analytics")}
                        className="w-full justify-start"
                      >
                        <NavIcon src="/analise.png" alt="Análises" />
                        Análises
                      </Button>
                    </DrawerClose>

                    {/* CONFIGURAÇÕES (mantido) */}
                    <DrawerClose asChild>
                      <Button
                        variant={currentView === "settings" ? "default" : "ghost"}
                        onClick={() => setCurrentView("settings")}
                        className="w-full justify-start"
                      >
                        ⚙️ Configurações
                      </Button>
                    </DrawerClose>
                  </div>
                </DrawerContent>
              </Drawer>
            </div>

            {/* Desktop */}
            <div className="hidden md:flex space-x-1">
              {/* Botão PAINEL (com ícone) */}
              <Button
                variant={currentView === "dashboard" ? "default" : "ghost"}
                onClick={() => setCurrentView("dashboard")}
                className={`text-sm ${
                  currentView === "dashboard"
                    ? "bg-yellow-500 text-slate-900 hover:bg-yellow-600"
                    : "text-white hover:bg-slate-700"
                }`}
              >
                <NavIcon src="/painel.png" alt="Painel" />
                Painel
              </Button>

              {/* Botão ADICIONAR TRANSAÇÃO (mantido) */}
              <Button
                variant={currentView === "add-expense" ? "default" : "ghost"}
                onClick={() => setCurrentView("add-expense")}
                className={`text-sm ${
                  currentView === "add-expense"
                    ? "bg-yellow-500 text-slate-900 hover:bg-yellow-600"
                    : "text-white hover:bg-slate-700"
                }`}
              >
                ➕ Adicionar Transação
              </Button>

              {/* Botão ANÁLISES (com ícone) */}
              <Button
                variant={currentView === "analytics" ? "default" : "ghost"}
                onClick={() => setCurrentView("analytics")}
                className={`text-sm ${
                  currentView === "analytics"
                    ? "bg-yellow-500 text-slate-900 hover:bg-yellow-600"
                    : "text-white hover:bg-slate-700"
                }`}
              >
                <NavIcon src="/analise.png" alt="Análises" />
                Análises
              </Button>

              {/* Botão CONFIGURAÇÕES (mantido) */}
              <Button
                variant={currentView === "settings" ? "default" : "ghost"}
                onClick={() => setCurrentView("settings")}
                className={`text-sm ${
                  currentView === "settings"
                    ? "bg-yellow-500 text-slate-900 hover:bg-yellow-600"
                    : "text-white hover:bg-slate-700"
                }`}
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
