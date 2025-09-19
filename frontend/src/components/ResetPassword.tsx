import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { forgotPassword, resetPassword } from "@/lib/api";

function getParam(name: string) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}

export default function ResetPassword() {
  const [mode, setMode] = useState<"request" | "confirm">("request");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [senha, setSenha] = useState("");
  const [confirm, setConfirm] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const t = getParam("token");
    const status = getParam("status");
    if (t) {
      setToken(t);
      setMode("confirm");
    } else if (status === "invalid") {
      toast({ title: "Link inválido ou expirado", variant: "destructive" });
    }
  }, []);

  async function handleRequest() {
  if (!email) {
    toast({ title: "Informe seu e-mail" });
    return;
  }
  setSending(true);
  try {
    await forgotPassword(email.trim());
    toast({
      title:
        "Verifique seu email, se o mesmo estiver cadastrado, enviaremos instruções de redefinição (verifique a caixa de Spam)."
    });
  } catch (e: any) {
    console.error(e);
    toast({
      title: "Não foi possível enviar agora. Tente novamente.",
      variant: "destructive",
    });
  } finally {
    setSending(false);
  }
}

  async function handleConfirm() {
    if (!token) {
      toast({ title: "Token não encontrado", variant: "destructive" });
      return;
    }
    try {
      await resetPassword(token, senha, confirm);
      window.location.href = "/?reset=ok";
    } catch (e: any) {
      toast({ title: e.message || "Erro ao redefinir senha", variant: "destructive" });
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">
            {mode === "request" ? "Esqueci minha senha" : "Definir nova senha"}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {mode === "request" ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                />
              </div>

              <Button
                className="w-full bg-slate-700 hover:bg-slate-600 text-white"
                onClick={handleRequest}
                disabled={sending}
              >
                {sending ? "Enviando..." : "Enviar instruções"}
              </Button>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="senha" className="text-white">Nova senha</Label>
                <Input
                  id="senha"
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm" className="text-white">Confirmar senha</Label>
                <Input
                  id="confirm"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                />
              </div>

              <Button
                className="w-full bg-slate-700 hover:bg-slate-600 text-white"
                onClick={handleConfirm}
              >
                Salvar nova senha
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}