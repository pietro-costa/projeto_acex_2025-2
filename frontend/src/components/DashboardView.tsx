import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import {
  getTransacoes,
  getUsuario,
  type Transacao,
  type Usuario,
} from "@/lib/api";
import { getUserId } from "@/lib/user";
import { onDataUpdated } from "@/lib/events";

type MonthlyPoint = { month: string; expenses: number; income: number };
type PiePoint = { category: string; amount: number };
type LinePoint = { day: string; saldo: number };

const fmtBRL = (n: number) =>
  n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  });

export const DashboardView = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);

  const idUsuario = getUserId();
  const nowMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

  // ---- fetch centralizado + re-fetch em evento "dados atualizados" ----
  const fetchAll = async () => {
    setLoading(true);
    try {
      const [u, t] = await Promise.all([
        getUsuario(idUsuario),
        getTransacoes(idUsuario),
      ]);
      setUsuario(u);
      setTransacoes(t);
      setError(null);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idUsuario]);

  useEffect(() => {
    return onDataUpdated(() => fetchAll());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idUsuario]);

  // ---- derivados ----
  const receitas = useMemo(
    () => transacoes.filter((t) => t.tipo === "receita"),
    [transacoes]
  );
  const despesas = useMemo(
    () => transacoes.filter((t) => t.tipo === "despesa"),
    [transacoes]
  );

  // despesas do mês atual
  const despesasMes = useMemo(
    () =>
      despesas
        .filter((t) => t.data_transacao.startsWith(nowMonth))
        .reduce((a, b) => a + Number(b.valor), 0),
    [despesas, nowMonth]
  );

  // renda fixa e gastos fixos do cadastro
  const rendaFixa = Number(usuario?.renda_fixa ?? 0);
  const gastosFixos = Number(usuario?.gastos_fixos ?? 0);

  // *** Receita líquida do mês *** (o que você pediu para o "Receitas")
  const receitaLiquidaMes = Math.max(
    rendaFixa - (gastosFixos + despesasMes),
    0
  );

  // totais absolutos (todas as datas) — ainda usados em gráficos de evolução/saldo
  const totalReceitas = useMemo(
    () => receitas.reduce((acc, t) => acc + Number(t.valor), 0),
    [receitas]
  );
  const totalDespesas = useMemo(
    () => despesas.reduce((acc, t) => acc + Number(t.valor), 0),
    [despesas]
  );

  // saldo diário acumulado (todas as datas)
  const saldoSeries: LinePoint[] = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of transacoes) {
      const k = t.data_transacao; // YYYY-MM-DD
      const delta = t.tipo === "receita" ? Number(t.valor) : -Number(t.valor);
      map.set(k, (map.get(k) || 0) + delta);
    }
    const sorted = Array.from(map.entries()).sort((a, b) =>
      a[0].localeCompare(b[0])
    );
    let acc = 0;
    return sorted.map(([day, delta]) => {
      acc += delta;
      return {
        day,
        saldo: Math.round((acc + Number.EPSILON) * 100) / 100,
      };
    });
  }, [transacoes]);

  // pizza por categoria (apenas DESPESAS DO MÊS ATUAL)
  const categoryData: PiePoint[] = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of despesas) {
      if (!t.data_transacao.startsWith(nowMonth)) continue;
      const key = String(t.id_categoria);
      map.set(key, (map.get(key) || 0) + Number(t.valor));
    }
    return Array.from(map.entries()).map(([category, amount]) => ({
      category,
      amount,
    }));
  }, [despesas, nowMonth]);

  // barras por mês (últimos 6) com base nas transações
  const monthlyData: MonthlyPoint[] = useMemo(() => {
    const byMonth = new Map<string, { expenses: number; income: number }>();
    for (const t of transacoes) {
      const k = t.data_transacao.slice(0, 7);
      if (!byMonth.has(k)) byMonth.set(k, { expenses: 0, income: 0 });
      const o = byMonth.get(k)!;
      if (t.tipo === "despesa") o.expenses += Number(t.valor);
      else o.income += Number(t.valor);
    }
    const months = Array.from(byMonth.keys()).sort().slice(-6);
    return months.map((k) => ({
      month: k,
      expenses: Math.round((byMonth.get(k)!.expenses + Number.EPSILON) * 100) / 100,
      income: Math.round((byMonth.get(k)!.income + Number.EPSILON) * 100) / 100,
    }));
  }, [transacoes]);

  const chartConfig = {
    expenses: { label: "Gastos" },
    income: { label: "Renda" },
    saldo: { label: "Saldo" },
    amount: { label: "Valor" },
  };

  if (loading) return <div className="p-6 text-slate-200">Carregando dados...</div>;
  if (error) return <div className="p-6 text-red-400">Erro: {error}</div>;

  // sugestão simples contextual
  const suggestion = (() => {
    if (despesasMes > rendaFixa * 0.6) {
      return {
        text:
          "Seus gastos deste mês já superam 60% da renda. Avalie reduzir despesas variáveis.",
        icon: <AlertTriangle className="w-5 h-5 text-yellow-500" />,
      };
    }
    return {
      text: "Boa! Você está com saldo positivo — considere reservar uma parte como poupança.",
      icon: <CheckCircle className="w-5 h-5 text-emerald-500" />,
    };
  })();

  const pieColors = ["#fbbf24", "#f59e0b", "#d97706", "#b45309", "#92400e", "#78350f"];

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
              Receitas (líquida do mês)
            </CardTitle>
            <CardDescription className="text-slate-400">
              renda_fixa − (gastos_fixos + despesas do mês)
            </CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-emerald-400">
            {fmtBRL(receitaLiquidaMes)}
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-rose-500" />
              Despesas (mês)
            </CardTitle>
            <CardDescription className="text-slate-400">
              Somente as despesas deste mês ({nowMonth})
            </CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-rose-400">
            {fmtBRL(despesasMes)}
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Renda & Fixos</CardTitle>
            <CardDescription className="text-slate-400">
              Valores do seu cadastro
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-slate-300">Renda fixa: {fmtBRL(rendaFixa)}</div>
            <div className="text-slate-300">Gastos fixos: {fmtBRL(gastosFixos)}</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Totais (histórico)</CardTitle>
            <CardDescription className="text-slate-400">
              Todas as datas (para contexto)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-slate-300">Receitas: {fmtBRL(totalReceitas)}</div>
            <div className="text-slate-300">Despesas: {fmtBRL(totalDespesas)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Dica */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            {suggestion.icon}
            Dica personalizada
          </CardTitle>
          <CardDescription className="text-slate-300">
            {suggestion.text}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Gráficos principais */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pizza mês atual */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Gastos por Categoria (mês)</CardTitle>
            <CardDescription className="text-slate-400">
              Distribuição das despesas em {nowMonth}
            </CardDescription>
          </CardHeader>
          <CardContent className="min-w-0">
            <ChartContainer config={chartConfig} className="w-full aspect-[4/3] md:aspect-video">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    data={categoryData}
                    dataKey="amount"
                    nameKey="category"
                    label={({ category, amount }) => `${category}: ${fmtBRL(amount)}`}
                  >
                    {categoryData.map((_, i) => (
                      <Cell key={`cell-${i}`} fill={pieColors[i % pieColors.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Barras últimos 6 meses */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Evolução Mensal</CardTitle>
            <CardDescription className="text-slate-400">
              Renda vs Gastos (últimos 6 meses)
            </CardDescription>
          </CardHeader>
          <CardContent className="min-w-0"> 
            <ChartContainer config={chartConfig} className="w-full aspect-[4/3] md:aspect-video">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                  <XAxis dataKey="month" tick={{ fill: "#94a3b8" }} />
                  <YAxis tick={{ fill: "#94a3b8" }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="income" name="Renda" />
                  <Bar dataKey="expenses" name="Gastos" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Saldo + últimas despesas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Saldo Acumulado</CardTitle>
            <CardDescription className="text-slate-400">Evolução diária</CardDescription>
          </CardHeader>
          <CardContent className="min-w-0">
            <ChartContainer config={chartConfig} className="w-full aspect-[4/3] md:aspect-video">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={saldoSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                  <XAxis dataKey="day" tick={{ fill: "#94a3b8" }} />
                  <YAxis tick={{ fill: "#94a3b8" }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="saldo" name="Saldo" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Últimas Despesas</CardTitle>
            <CardDescription className="text-slate-400">
              Seus lançamentos mais recentes (mês e históricos)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {despesas.length === 0 && (
                <div className="text-slate-400">Sem despesas registradas.</div>
              )}
              {[...despesas]
                .sort((a, b) => b.data_transacao.localeCompare(a.data_transacao))
                .slice(0, 6)
                .map((t) => (
                  <div
                    key={t.id_transacao}
                    className="flex items-center justify-between rounded-lg bg-slate-900/60 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-slate-100">
                        {t.descricao || "Despesa"}
                      </div>
                      <div className="text-xs text-slate-400">
                        {t.data_transacao} • Categoria #{t.id_categoria}
                      </div>
                    </div>
                    <div className="font-semibold text-rose-300">
                      {fmtBRL(Number(t.valor))}
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardView;
