
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { postUsuario } from "@/lib/api";

interface AuthFormProps {
  onLogin: () => void;
}

export const AuthForm = ({ onLogin }: AuthFormProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [registrationStep, setRegistrationStep] = useState(1);
  const [monthlyIncome, setMonthlyIncome] = useState("");
  const [fixedExpenses, setFixedExpenses] = useState("");
  const [savingsGoal, setSavingsGoal] = useState(""); // Meta de economia mensal

  const handleLogin = (e: React.FormEvent) => {
    try { if(!localStorage.getItem('id_usuario')) localStorage.setItem('id_usuario','1'); } catch {}
    e.preventDefault();
    onLogin();
  };

  const handleRegisterStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    setRegistrationStep(2);
  };

  const handleRegisterStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const body = {
        nome: name || "Usuário",
        email,
        cpf: (Math.random().toString().slice(2,13)).padEnd(11,'0'),
        renda_fixa: Number(monthlyIncome || 0),
        gastos_fixos: Number(fixedExpenses || 0),
        senha: password || ""
      };
      const res = await postUsuario(body as any);
      const id = (res as any).id_usuario || (res as any).id;
      localStorage.setItem('id_usuario', String(id));
      onLogin();
    } catch (err:any) {
      console.error(err);
      alert('Falha ao cadastrar usuário: ' + (err?.message || 'erro desconhecido'));
    }
  };

  const handleBackToStep1 = () => {
    setRegistrationStep(1);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg bg-slate-800 border-slate-700">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-white">
            📊 Finty
          </CardTitle>
          <CardDescription className="text-slate-300">
            Comece sua jornada para uma melhor saúde financeira
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2 bg-slate-700">
              <TabsTrigger value="login" className="text-white data-[state=active]:bg-yellow-500 data-[state=active]:text-slate-900">Entrar</TabsTrigger>
              <TabsTrigger value="register" className="text-white data-[state=active]:bg-yellow-500 data-[state=active]:text-slate-900">Registrar</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-white">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Digite seu e-mail"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-white">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Digite sua senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                  />
                </div>
                <Button type="submit" className="w-full bg-slate-700 hover:bg-slate-600 text-white">
                  Entrar
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="register">
              {registrationStep === 1 ? (
                <div>
                  <div className="mb-4 text-center">
                    <p className="text-sm text-slate-400">Etapa 1 de 2 - Informações Pessoais</p>
                  </div>
                  <form onSubmit={handleRegisterStep1} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-white">Nome Completo</Label>
                      <Input
                        id="name"
                        type="text"
                        placeholder="Digite seu nome completo"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-email" className="text-white">E-mail</Label>
                      <Input
                        id="reg-email"
                        type="email"
                        placeholder="Digite seu e-mail"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-password" className="text-white">Senha</Label>
                      <Input
                        id="reg-password"
                        type="password"
                        placeholder="Crie uma senha"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                      />
                    </div>
                    <Button type="submit" className="w-full bg-yellow-500 hover:bg-yellow-600 text-slate-900 font-semibold">
                      Próxima Etapa
                    </Button>
                  </form>
                </div>
              ) : (
                <div>
                  <div className="mb-4 text-center">
                    <p className="text-sm text-slate-400">Etapa 2 de 2 - Informações Financeiras</p>
                  </div>
                  <form onSubmit={handleRegisterStep2} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="monthly-income" className="text-white">Renda Fixa Mensal</Label>
                      <Input
                        id="monthly-income"
                        type="number"
                        step="0.01"
                        placeholder="Digite sua renda mensal (R$)"
                        value={monthlyIncome}
                        onChange={(e) => setMonthlyIncome(e.target.value)}
                        required
                        className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fixed-expenses" className="text-white">Gastos Fixos Mensais</Label>
                      <Input
                        id="fixed-expenses"
                        type="number"
                        step="0.01"
                        placeholder="Digite seus gastos fixos (R$)"
                        value={fixedExpenses}
                        onChange={(e) => setFixedExpenses(e.target.value)}
                        required
                        className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                      />
                      <p className="text-xs text-slate-400">
                        Ex: aluguel, condomínio, financiamentos, planos, etc.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="savings-goal" className="text-white">Meta de Economia Mensal</Label>
                      <Input
                        id="savings-goal"
                        type="number"
                        step="0.01"
                        placeholder="Quanto pretende guardar por mês? (R$)"
                        value={savingsGoal}
                        onChange={(e) => setSavingsGoal(e.target.value)}
                        required
                        className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                      />
                      <p className="text-xs text-slate-400">
                        Defina sua meta de economia mensal para acompanharmos seu progresso
                      </p>
                    </div>
                    <div className="flex space-x-3">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={handleBackToStep1}
                        className="flex-1 border-slate-600 text-white hover:bg-slate-700"
                      >
                        Voltar
                      </Button>
                      <Button type="submit" className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-slate-900 font-semibold">
                        Criar Conta
                      </Button>
                    </div>
                  </form>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
