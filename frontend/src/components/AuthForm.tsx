import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/use-toast";
import { postUsuario, postLogin, resendVerificationByEmail } from "@/lib/api";
import { Checkbox } from "@/components/ui/checkbox";

interface AuthFormProps {
  onLogin: () => void;
}

export const AuthForm = ({ onLogin }: AuthFormProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [registrationStep, setRegistrationStep] = useState(1);
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [monthlyIncome, setMonthlyIncome] = useState("");
  const [fixedExpenses, setFixedExpenses] = useState("");
  const [savingsGoal, setSavingsGoal] = useState(""); // Meta de economia mensal
  const [showResend, setShowResend] = useState(false);
  const [resending, setResending] = useState(false);
  const [sending, setSending] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    const reset = url.searchParams.get("reset");
    const verified = url.searchParams.get("verified");

    if (reset === "ok") {
      // toast de sucesso ao redefinir senha
      toast({ title: "Senha redefinida com sucesso! Faça login." });
    }

    if (verified === "1" || verified === "true" || verified === "ok") {
      // toast de sucesso ao verificar e-mail
      toast({ title: "E-mail verificado com sucesso!" });
    }

    if (reset || verified) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const handleLogin = async (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault?.();
    
    if (loggingIn) return;
    setLoggingIn(true);

    try {
      const { token, user } = await postLogin({email: email.trim(), senha: password});
      localStorage.setItem("token", token);
      localStorage.setItem("id_usuario", String(user.id_usuario));
      onLogin?.();
    } catch (err: any) {
      if (err?.code === "EMAIL_NOT_VERIFIED") {
        setShowResend(true);
        toast({
          title: "E-mail não verificado",
          description: "Confirme o e-mail que enviamos. Se não recebeu, solicite um novo envio abaixo.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Falha ao entrar",
          description: "E-mail ou senha incorretos.",
          variant: "destructive",
        });
      }
    } finally {
      setLoggingIn(false);
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
        variant: "destructive",
      });
    } finally {
      setResending(false);
    }
  };

  const handleRegisterStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

    if (!name.trim()) {
      toast({ title: "Nome obrigatório", description: "Informe seu nome completo.", variant: "destructive" });
      return;
    }
    if (!emailOk) {
      toast({ title: "E-mail inválido", description: "Informe um e-mail válido.", variant: "destructive" });
      return;
    }
    if (!password || password.length < 6) {
      toast({ title: "Senha fraca", description: "A senha deve ter pelo menos 6 caracteres.", variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Senhas diferentes", description: "As senhas não coincidem.", variant: "destructive" });
      return;
    }

    setRegistrationStep(2);
  };

  const handleRegisterStep2 = async (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault?.();

    if (!acceptedTerms) {
      toast({
        title: "Você precisa aceitar os Termos de Uso e a Política de Privacidade para criar a conta.",
        variant: "destructive",
      });
      return;
    };

    if (sending) return;
    setSending(true);

    try {
      const body = {
        nome: name || "Usuário",
        email,
        renda_fixa: Number(monthlyIncome ?? 0),
        gastos_fixos: Number(fixedExpenses ?? 0),
        meta_economia: Number(String(savingsGoal ?? 0).replace(',', '.')),
        senha: password || "",
        confirm_senha: confirmPassword || ""
      };

      await postUsuario(body as any);

      setRegistrationStep(1);
      setActiveTab('login');
      setPassword('');
      setConfirmPassword('');

      toast({
        title: "Conta criada!",
        description: "Enviamos um e-mail de verificação. Confirme para fazer login.",
      });
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Falha ao cadastrar usuário",
        description: err?.message || "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleBackToStep1 = () => {
    setRegistrationStep(1);
  };

  const handleCreateAccountClick = () => {
    if (!acceptedTerms) {
      toast({
        title: "Você precisa aceitar os Termos de Uso e a Política de Privacidade.",
        variant: "destructive",
      });
      return;
    }
    handleRegisterStep2();
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg bg-slate-800 border-slate-700">
        <CardHeader className="text-center">
          <CardTitle className="flex justify-center py-1">
            <img src="fintyLogo-removebg-preview.png" alt="Logo" className="w-36 sm:w-44 md:w-52 h-auto select-none" />
            <span className="sr-only">Logo</span>
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

            {/* LOGIN */}
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
                    disabled={loggingIn}
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
                    disabled={loggingIn}
                  />
                </div>

                <Button type="submit" 
                  className="w-full bg-yellow-500 hover:bg-yellow-400 text-black disabled:opacity-70 disabled:cursor-not-allowed focus-visible:ring-yellow-500"
                  disabled={loggingIn}
                  aria-busy={loggingIn}
                >
                  {loggingIn ? "Entrando..." : "Entrar"} 
                </Button>
                <div className="mt-2 text-right">
                  <button
                    type="button"
                    className="text-sm underline text-slate-300 hover:text-white"
                    onClick={() => (window.location.href = '/reset')}
                  >
                    Esqueci minha senha
                  </button>
                </div>
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

            {/* REGISTRO */}
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

                    {/* <= AQUI ESTÁ O AJUSTE: no desktop (md+) ficam lado a lado */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                      <div className="space-y-2">
                        <Label htmlFor="confirm-password" className="text-white">Confirmar senha</Label>
                        <Input
                          id="confirm-password"
                          type="password"
                          placeholder="Repita a senha"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                        />
                      </div>
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

                    {/* Checkbox LGPD - Registro (etapa final) */}
                    <div className="flex items-start gap-2">
                      <input
                        id="agree-register"
                        type="checkbox"
                        className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-700 text-yellow-500 focus:ring-2 focus:ring-yellow-500 focus:ring-offset-0"
                        checked={acceptedTerms}
                        onChange={(e) => setAcceptedTerms(e.target.checked)}
                      />
                      <Label htmlFor="agree-register" className="text-slate-300 text-sm leading-relaxed">
                        Li e concordo com os{" "}
                        <a
                          href="https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline hover:opacity-90"
                        >
                          Termos de Uso
                        </a>{" "}
                        e a{" "}
                        <a
                          href="https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline hover:opacity-90"
                        >
                          Política de Privacidade
                        </a>.
                      </Label>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <Button
                        type="button"
                        className="bg-slate-700 hover:bg-slate-600 text-white"
                        onClick={() => handleBackToStep1()}
                      >
                        Voltar
                      </Button>
                      <Button
                        type="button"
                        onClick={handleCreateAccountClick}
                        disabled={sending}
                        aria-disabled={sending}
                        className={`bg-yellow-500 hover:bg-yellow-400 text-black px-6 py-2 rounded
                          ${(!acceptedTerms || sending) ? 'opacity-70 cursor-not-allowed' : ''}`}

                      >
                        {sending ? "Cadastrando..." : "Criar conta"}
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
