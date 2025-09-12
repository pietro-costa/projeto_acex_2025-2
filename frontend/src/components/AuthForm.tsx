import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/use-toast";
import { postUsuario, postLogin, resendVerificationByEmail } from "@/lib/api";

interface AuthFormProps {
  onLogin: () => void;
}

export const AuthForm = ({ onLogin }: AuthFormProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [registrationStep, setRegistrationStep] = useState(1);
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [monthlyIncome, setMonthlyIncome] = useState("");
  const [fixedExpenses, setFixedExpenses] = useState("");
  const [savingsGoal, setSavingsGoal] = useState(""); // Meta de economia mensal
  const [showResend, setShowResend] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("verified") === "1") {
      toast({
        title: "E-mail verificado!",
        description: "Agora você já pode realizar o login.",
      });
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { token, user } = await postLogin(email.trim(), password);
      localStorage.setItem("token", token);
      localStorage.setItem("id_usuario", String(user.id_usuario));
      onLogin();
    } catch (err: any) {
      if (err?.code === "EMAIL_NOT_VERIFIED" || err?.message === "EMAIL_NOT_VERIFIED") {
        setShowResend(true);
        toast({
          title: "E-mail não verificado",
          description: "Confirme o e-mail que enviamos. Se não recebeu, você pode solicitar um novo envio abaixo.",
        });
        return;
      }
      if (err?.message === "AUTH_EXPIRED") {
        alert("Falha ao entrar: Sessão expirada. Faça login novamente.");
      return;
    }
    alert("Falha ao entrar: " + (err?.message || "E-mail ou senha incorretos"));
  }
};

  const handleResend = async () => {
    try {
      setResending(true);
      await resendVerificationByEmail(email.trim());
      toast({
        title: "Verificação reenviada",
        description: "Se existir uma conta com este e-mail, um novo link foi enviado.",
      });
    } catch (e: any) {
      toast({
        title: "Não foi possível reenviar",
        description: e?.message || "Tente novamente em instantes.",
      });
    } finally {
      setResending(false);
    }
  };

  const handleRegisterStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    if (!name.trim()) { alert('Informe seu nome.'); return; }
    if (!emailOk) { alert('Informe um e-mail válido.'); return; }
    if (!password || password.length < 6) { alert('A senha deve ter pelo menos 6 caracteres.'); return; }
    setRegistrationStep(2);
  };

  const handleRegisterStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const body = {
        nome: name || "Usuário",
        email,
        renda_fixa: Number(monthlyIncome || 0),
        gastos_fixos: Number(fixedExpenses || 0),
        meta_economia: Number(String(savingsGoal || 0).replace(',','.')),
        senha: password || ""
      };
      const res = await postUsuario(body as any);
      // Sucesso: volta para o login sem autenticar automaticamente
      setRegistrationStep(1);
      setActiveTab('login');
      setPassword('');
      toast({ title: 'Conta criada!', description: 'Enviamos um e-mail de verificação. Confirme para fazer login.' });
      
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
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'login' | 'register')} className="space-y-4">
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

              {showResend && (
                <div className="mt-3 text-center">
                  <p className="text-sm text-slate-400 mb-2">
                    Não recebeu o e-mail de verificação?
                  </p>
                  <Button
                    type="button"
                      onClick={handleResend}
                      disabled={resending || !email.trim()}
                      className="bg-yellow-500 hover:bg-yellow-600 text-slate-900 font-semibold"
                  >
                    {resending ? "Enviando..." : "Reenviar verificação"}
                  </Button>
                </div>
              )}
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
                        placeholder="Crie uma senha"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                      />
                    </div>
                    <Button type="submit" className="w-full bg-yellow-500 hover:bg-yellow-600 text-slate-900 font-semibold">
                      Continuar
                    </Button>
                  </form>
                </div>
              ) : (
                <div>
                  <div className="mb-4 text-center">
                    <p className="text-sm text-slate-400">Etapa 2 de 2 - Dados Financeiros</p>
                  </div>
                  <form onSubmit={handleRegisterStep2} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="monthly-income" className="text-white">Renda Mensal</Label>
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
                        placeholder="Quanto deseja economizar por mês? (R$)"
                        value={savingsGoal}
                        onChange={(e) => setSavingsGoal(e.target.value)}
                        className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button type="button" onClick={handleBackToStep1} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white">
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
