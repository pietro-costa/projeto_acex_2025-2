/* 
   TELA DE CONFIGURAÇÕES - SETTINGSVIEW.TSX
   Aqui o usuário pode:
   - Atualizar seu salário
   - Trocar o nome
   - Trocar o tema (claro/escuro)
*/

import { useState, useEffect } from "react";
import { getUsuario, patchUsuario, getAccountStats, type Usuario } from "@/lib/api";
import { getUserId } from "@/lib/user";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { on } from "events";

export const SettingsView = () => {
  const id = getUserId();

  // estado de tela
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // dados do usuário
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [monthlyIncome, setMonthlyIncome] = useState<number>(0);
  const [fixedExpenses, setFixedExpenses] = useState<number>(0);
  const [payday, setPayday] = useState<number | ''>('');
  const [savingsGoal, setSavingsGoal] = useState<number | ''>('');

  // estatísticas
  const [diasConta, setDiasConta] = useState(0);
  const [totalGastos, setTotalGastos] = useState(0);
  const [economiaMes, setEconomiaMes] = useState<number>(0);



  function formatBRL(v: number | string) {
    const n = Number(v ?? 0);
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
  }

  // carrega usuário + estatísticas
  useEffect(() => {
    let active = true;
    setLoading(true);

    Promise.all([getUsuario(id), getAccountStats(id)])
      .then(([u, stats]) => {
        if (!active) return;
        setUsuario(u);
        setUserName(u.nome ?? "");
        setMonthlyIncome(Number(u.renda_fixa || 0));
        setFixedExpenses(Number(u.gastos_fixos || 0));
        setPayday(typeof u.dia_pagamento === "number" ? u.dia_pagamento : "");
        setSavingsGoal(
          typeof u.meta_economia === "number"
            ? u.meta_economia
            : Number(u.meta_economia || 0)
        );

        setDiasConta(stats?.dias_conta ?? 0);
        setTotalGastos(stats?.total_gastos ?? 0);
        setEconomiaMes(Number(stats?.economia_mes ?? 0));
      })
      .catch((e) => active && setError(e?.message || String(e)))
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [id]);

  // salva alterações no banco e atualiza a tela
  async function salvar(e?: React.FormEvent) {
    e?.preventDefault();
    try {
      setSaving(true);

      if (payday !== '' && (Number(payday) < 1 || Number(payday) > 30)) {
        toast({ title: "Dia de pagamento inválido (use 1–30).", variant: "destructive" });
        return;
      }

      await patchUsuario(id, {
        nome: userName.trim(),
        renda_fixa: Number(monthlyIncome) || 0,
        gastos_fixos: Number(fixedExpenses) || 0,
      });

      const resp = await patchUsuario(id, {
        nome: userName.trim(),
        renda_fixa: Number(monthlyIncome) || 0,
        gastos_fixos: Number(fixedExpenses) || 0,
        ...(payday !== '' ? { dia_pagamento: Number(payday) } : {}),
        ...(savingsGoal !== '' ? { meta_economia: Number(savingsGoal) } : {}),
      });

      if (resp?.user) {
        const u = resp.user;
        setUsuario(u);
        setUserName(u.nome ?? "");
        setMonthlyIncome(Number(u.renda_fixa || 0));
        setFixedExpenses(Number(u.gastos_fixos || 0));
        setPayday(typeof u.dia_pagamento === 'number' ? u.dia_pagamento : "");
        setSavingsGoal(
          typeof u.meta_economia === 'number'
            ? u.meta_economia
            : Number(u.meta_economia || 0)
        );
      }

      const [updated, stats] = await Promise.all([getUsuario(id), getAccountStats(id)]);

      setUsuario(updated);
      setUserName(updated.nome ?? "");
      setMonthlyIncome(Number(updated.renda_fixa || 0));
      setFixedExpenses(Number(updated.gastos_fixos || 0));
      setPayday(typeof updated.dia_pagamento === 'number' ? updated.dia_pagamento : '');
      setSavingsGoal(
        typeof updated.meta_economia === 'number'
          ? updated.meta_economia
          : Number(updated.meta_economia || 0)
      );

      setDiasConta(stats?.dias_conta ?? 0);
      setTotalGastos(stats?.total_gastos ?? 0);
      setEconomiaMes(Number(stats?.economia_mes ?? 0));

      toast({
        title: "Configurações salvas com sucesso"
      });
    } catch (e: any) {
      toast({
        title: "Erro ao salvar",
        description: e?.message || "Erro desconhecido.",
        variant: "destructive",
      })
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* TÍTULO DA PÁGINA */}
      <h2 className="text-3xl font-bold text-white">⚙️ Configurações</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* CARD 1: INFORMAÇÕES PESSOAIS */}
        <Card className="bg-slate-800 border-slate-700 lg:col-span-2">
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
              <Label htmlFor="salary" className="text-white">Renda Mensal (R$)</Label>
              <Input
                id="salary"
                type="number"
                value={monthlyIncome}
                onChange={(e) => setMonthlyIncome(Number(e.target.value) || 0)} // Atualiza o salário quando digita
                placeholder="3000"
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>

            {/* Campo para alterar os gastos fixos */}
            <div className="space-y-2">
              <Label htmlFor="fixed" className="text-white">Gastos Fixos (R$)</Label>
              <Input
                id="fixed"
                type="number"
                value={fixedExpenses}
                onChange={(e) => setFixedExpenses(Number(e.target.value) || 0)}
                placeholder="0"
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>

            {/* Campo para alterar o dia do pagamento */}
            <div className="space-y-2">
              <Label htmlFor="dia_pagamento" className="text-white">Dia do pagamento (1-30)</Label>
              <Input
                id="dia_pagamento"
                type="number"
                min={1}
                max={30}
                value={payday}
                onChange={(e) => setPayday(e.target.value ? Number(e.target.value) : '')}
                placeholder="Ex: 5"
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>

            {/* Campo para alterar a meta de economia */}
            <div className="space-y-2">
              <Label htmlFor="meta_economia" className="text-white">Meta de economia (R$)</Label>
              <Input
                id="meta_economia"
                type="number"
                step="0.01"
                value={savingsGoal}
                onChange={(e) => setSavingsGoal(e.target.value ? Number(e.target.value) : '')}
                placeholder="Ex: 200,00"
                className="bg-slate-700 border-slate-600 text-white"
              />
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
              <p className="text-2xl font-bold text-yellow-500">{diasConta} dias</p>
            </div>

            <div className="text-center p-4 bg-slate-700 rounded-lg">
              <p className="text-sm text-slate-400">Total de gastos registrados</p>
              <p className="text-2xl font-bold text-yellow-500">{totalGastos}</p>
            </div>

            <div className="text-center p-4 bg-slate-700 rounded-lg">
              <p className="text-sm text-slate-400">Economias este mês</p>
              <p className="text-2xl font-bold text-green-500">{formatBRL(economiaMes)}</p>
            </div>

          </div>
        </CardContent>
      </Card>

      {/* BOTÃO PARA SALVAR TODAS AS ALTERAÇÕES */}
      <div className="flex justify-end">
        <Button
          onClick={salvar}
          className="bg-yellow-500 hover:bg-yellow-600 text-slate-900 font-bold px-6 py-2"
        >
          💾 Salvar Alterações
        </Button>
      </div>

    </div>
  );
};