import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChartContainer} from "@/components/ui/chart";
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
  Tooltip,
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
  getCategorias,
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

const fmtDia = (s: string) => {
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s : d.toLocaleDateString("pt-BR"); // 09/09/2025
};
const fmtMes = (s: string) => s.replace("-", "/"); // "2025-09" -> "2025/09"

export const DashboardView = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [categoriasDict, setCategoriasDict] = useState<Record<number, string>>({});

  const idUsuario = getUserId();
  const nowMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [u, t, cats] = await Promise.all([
        getUsuario(idUsuario),
        getTransacoes(idUsuario),
        getCategorias(),
      ]);
      setUsuario(u);
      setTransacoes(t);

      const dict: Record<number, string> = Object.fromEntries(
        (cats as any[]).map((c: any) => [c.id_categoria, c.nome_categoria])
      );
      setCategoriasDict(dict);

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

  // >>> ADIÇÃO: receitas do mês atual
  const receitasMes = useMemo(
    () =>
      receitas
        .filter((t) => t.data_transacao.startsWith(nowMonth))
        .reduce((a, b) => a + Number(b.valor), 0),
    [receitas, nowMonth]
  );

  // renda fixa e gastos fixos do cadastro
  const rendaFixa = Number(usuario?.renda_fixa ?? 0);
  const gastosFixos = Number(usuario?.gastos_fixos ?? 0);

  // >>> TROCA: Saldo do mês = (renda_fixa + receitasMes) − (gastos_fixos + despesasMes)
  const saldoMes = (rendaFixa + receitasMes) - (gastosFixos + despesasMes);

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
  const RANGE_MONTHS = 6; // mude se quiser outro intervalo

  const start = new Date();
  start.setMonth(start.getMonth() - (RANGE_MONTHS - 1));
  start.setDate(1); start.setHours(0,0,0,0);

  const end = new Date();
  end.setHours(23,59,59,999);

  const normDay = (s: string) => {
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? s.slice(0,10) : d.toISOString().slice(0,10);
  };
  const ym = (s: string) => normDay(s).slice(0,7);
  const inRange = (isoDay: string) => {
    const d = new Date(isoDay);
    return d >= start && d <= end;
  };

  // meses do período
  const months: string[] = [];
  for (const d = new Date(start); d <= end; d.setMonth(d.getMonth()+1)) {
    months.push(d.toISOString().slice(0,7));
  }

  // mapa de eventos (delta por dia)
  const ev = new Map<string, number>();
  const add = (day: string, delta: number) =>
    ev.set(day, (ev.get(day) || 0) + delta);

  // 1) transações reais dentro do período
  for (const t of transacoes) {
    const day = normDay(t.data_transacao);
    if (!inRange(day)) continue;
    const delta = t.tipo === "receita" ? Number(t.valor) : -Number(t.valor);
    add(day, delta);
  }

  // 2) eventos sintéticos mensais (no período)
  for (const m of months) {
    const firstDay = `${m}-01`;

    // renda fixa: só se não houver receita lançada no mês
    const temReceitaNoMes = transacoes.some(
      (t) => t.tipo === "receita" && ym(t.data_transacao) === m
    );
    if (!temReceitaNoMes && (usuario?.renda_fixa ?? 0) > 0) {
      add(firstDay, Number(usuario!.renda_fixa));
    }

    // gastos fixos: sempre subtrai, se houver valor
    if ((usuario?.gastos_fixos ?? 0) > 0) {
      add(firstDay, -Number(usuario!.gastos_fixos));
    }
  }

  // acumula a partir de 0
  const days = Array.from(ev.keys()).sort();
  let acc = 0;
  return days.map((day) => {
    acc += ev.get(day)!;
    return { day, saldo: Math.round((acc + Number.EPSILON) * 100) / 100 };
  });
}, [transacoes, usuario?.renda_fixa, usuario?.gastos_fixos]);

  // pizza por categoria (apenas DESPESAS DO MÊS ATUAL)
  const categoryData: PiePoint[] = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of despesas) {
      if (!t.data_transacao.startsWith(nowMonth)) continue;
      const nome = categoriasDict[t.id_categoria] ?? `Categoria #${t.id_categoria}`;
      map.set(nome, (map.get(nome) || 0) + Number(t.valor));
    }
    return Array.from(map.entries()).map(([category, amount]) => ({
      category,
      amount,
    }));
  }, [despesas, nowMonth]);

  // barras por mês (últimos 6) com base nas transações
const monthlyData: MonthlyPoint[] = useMemo(() => {
  // últimos 6 meses como YYYY-MM, mesmo sem transações
  const months: string[] = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));  // do mais antigo ao mais recente
    return d.toISOString().slice(0, 7);  // YYYY-MM
  });

  return months.map((k) => {
    const exp = transacoes
      .filter(t => t.tipo === "despesa" && t.data_transacao.startsWith(k))
      .reduce((a, t) => a + Number(t.valor), 0);

    const incFromTx = transacoes
      .filter(t => t.tipo === "receita" && t.data_transacao.startsWith(k))
      .reduce((a, t) => a + Number(t.valor), 0);

    // regra: se não houver receitas registradas no mês, usa renda fixa como renda do mês
    const inc = incFromTx > 0 ? incFromTx : Number(usuario?.renda_fixa ?? 0);

    return {
      month: k,
      expenses: Math.round((exp + Number.EPSILON) * 100) / 100,
      income:   Math.round((inc + Number.EPSILON) * 100) / 100,
    };
  });
}, [transacoes, usuario?.renda_fixa]);


  const chartConfig = {
    expenses: { label: "Gastos", color: "hsl(var(--chart-1))" },
    income: { label: "Renda", color: "hsl(var(--chart-2))" },
    saldo: { label: "Saldo", color: "hsl(var(--chart-3))" },
    amount: { label: "Valor", color: "hsl(var(--chart-4))" },
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
              {/* >>> TROCA: título do card */}
              Saldo do mês
            </CardTitle>
            <CardDescription className="text-slate-400">
              {/* >>> TROCA: descrição do card */}
              renda_fixa + receitas do mês − (gastos_fixos + despesas do mês)
            </CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-emerald-400">
            {/* >>> TROCA: valor exibido */}
            {fmtBRL(saldoMes)}
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
                  <Tooltip
                    formatter={(value: any, name) => [fmtBRL(Number(value)), String(name)]}
                  />
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
                  <XAxis dataKey="month" tick={{ fill: "#94a3b8" }} tickFormatter={fmtMes} />
                  <YAxis tick={{ fill: "#94a3b8" }} />
                  <Tooltip 
                  labelFormatter={(v) => `Mês: ${fmtMes(String(v))}`}
                  formatter={(value, name) => [fmtBRL(Number(value)), name]}
                  />
                  <Bar dataKey="income" name="Renda" fill="#10b981" radius={4} />
                  <Bar dataKey="expenses" name="Gastos" fill="#ef4444" radius={4}/>
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Saldo + últimas despesas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        <Card className="md:col-span-2 bg-slate-800 border border-slate-700 shadow-sm">
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
                        {fmtDia(t.data_transacao)} • {categoriasDict[t.id_categoria] ?? `Categoria #${t.id_categoria}`}
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
