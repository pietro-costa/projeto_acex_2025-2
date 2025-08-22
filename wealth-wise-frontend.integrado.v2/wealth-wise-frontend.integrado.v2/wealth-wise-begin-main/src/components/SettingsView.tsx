/* 
   TELA DE CONFIGURAÇÕES - SETTINGSVIEW.TSX
   Aqui o usuário pode:
   - Atualizar seu salário
   - Trocar o nome
   - Trocar o tema (claro/escuro)
*/

import { useState } from "react";
import { getUsuario, patchUsuario, type Usuario } from "@/lib/api";
import { getUserId } from "@/lib/user";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export const SettingsView = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [monthlyIncome, setMonthlyIncome] = useState<number>(0);
  const [fixedExpenses, setFixedExpenses] = useState<number>(0);
  const id = getUserId();

  useEffect(() => {
    let active = true;
    setLoading(true);
    getUsuario(id).then(u => {
      if(!active) return;
      setUsuario(u);
      setMonthlyIncome(Number(u.renda_fixa || 0));
      setFixedExpenses(Number(u.gastos_fixos || 0));
    }).catch(e => setError(e.message || String(e)))
      .finally(()=>active && setLoading(false));
    return ()=>{ active=false };
  }, [id]);

  async function salvar() {
    try {
      await patchUsuario(id, { renda_fixa: monthlyIncome, gastos_fixos: fixedExpenses });
      const updated = await getUsuario(id);
      setUsuario(updated);
      alert('Configurações salvas!');
    } catch (e:any) {
      alert('Erro ao salvar: ' + (e?.message || 'erro desconhecido'));
    }
  }

  // Estados para guardar as informações do usuário
  const [userName, setUserName] = useState("João Silva"); // Nome atual
  const [userSalary, setUserSalary] = useState("3000"); // Salário atual
  const [isDarkTheme, setIsDarkTheme] = useState(true); // Tema escuro ou claro

  // Função que executa quando o usuário clica em "Salvar Alterações"
  const handleSaveChanges = () => {
    // Aqui você salvaria os dados no banco de dados
    // Por enquanto só mostra um alerta
    alert("Configurações salvas com sucesso!");
    console.log("Dados salvos:", {
      nome: userName,
      salario: userSalary,
      temaEscuro: isDarkTheme
    });
  };

  return (
    <div className="space-y-6">
      {/* TÍTULO DA PÁGINA */}
      <h2 className="text-3xl font-bold text-white">⚙️ Configurações</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* CARD 1: INFORMAÇÕES PESSOAIS */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">👤 Informações Pessoais</CardTitle>
            <CardDescription className="text-slate-400">
              Atualize seus dados pessoais
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            
            {/* Campo para alterar o nome */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-white">Nome Completo</Label>
              <Input
                id="name"
                value={userName}
                onChange={(e) => setUserName(e.target.value)} // Atualiza o nome quando digita
                placeholder="Digite seu nome"
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>

            {/* Campo para alterar o salário */}
            <div className="space-y-2">
              <Label htmlFor="salary" className="text-white">Salário Mensal (R$)</Label>
              <Input
                id="salary"
                type="number"
                value={userSalary}
                onChange={(e) => setUserSalary(e.target.value)} // Atualiza o salário quando digita
                placeholder="3000"
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>

          </CardContent>
        </Card>

        {/* CARD 2: PREFERÊNCIAS DO APLICATIVO */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">🎨 Preferências</CardTitle>
            <CardDescription className="text-slate-400">
              Personalize a aparência do aplicativo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            
            {/* Switch para trocar tema */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-white">Tema Escuro</Label>
                <p className="text-sm text-slate-400">
                  Use o tema escuro para uma experiência mais confortável
                </p>
              </div>
              <Switch
                checked={isDarkTheme}
                onCheckedChange={setIsDarkTheme} // Troca entre claro e escuro
              />
            </div>

            {/* Informação sobre o tema atual */}
            <div className="p-3 bg-slate-700 rounded-lg">
              <p className="text-sm text-white">
                🌙 Tema atual: <span className="font-bold">
                  {isDarkTheme ? "Escuro" : "Claro"}
                </span>
              </p>
            </div>

          </CardContent>
        </Card>

      </div>

      {/* CARD 3: ESTATÍSTICAS DA CONTA */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">📊 Estatísticas da Conta</CardTitle>
          <CardDescription className="text-slate-400">
            Informações sobre o uso do aplicativo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div className="text-center p-4 bg-slate-700 rounded-lg">
              <p className="text-sm text-slate-400">Conta criada há</p>
              <p className="text-2xl font-bold text-yellow-500">30 dias</p>
            </div>

            <div className="text-center p-4 bg-slate-700 rounded-lg">
              <p className="text-sm text-slate-400">Total de gastos registrados</p>
              <p className="text-2xl font-bold text-yellow-500">47</p>
            </div>

            <div className="text-center p-4 bg-slate-700 rounded-lg">
              <p className="text-sm text-slate-400">Economias este mês</p>
              <p className="text-2xl font-bold text-green-500">R$ 450</p>
            </div>

          </div>
        </CardContent>
      </Card>

      {/* BOTÃO PARA SALVAR TODAS AS ALTERAÇÕES */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSaveChanges}
          className="bg-yellow-500 hover:bg-yellow-600 text-slate-900 font-bold px-6 py-2"
        >
          💾 Salvar Alterações
        </Button>
      </div>

    </div>
  );
};