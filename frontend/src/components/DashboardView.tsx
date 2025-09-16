import { useEffect, useMemo, useRef, useState } from "react";
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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [chartW, setChartW] = useState(0);
  const [chartH, setChartH] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [vw, setVw] = useState(0);
  const isDesktop = vw >= 1024; 
  const isTablet  = vw >= 768 && vw < 1024;

useEffect(() => {
  const compute = () =>
    typeof window !== "undefined" &&
    (window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 768);

  const onResize = () => {
    setIsMobile(compute());
    if (typeof window !== "undefined") setVw(window.innerWidth); 
  };

  // inicial
  setIsMobile(compute());
  if (typeof window !== "undefined") setVw(window.innerWidth);

  window.addEventListener("resize", onResize);
  return () => window.removeEventListener("resize", onResize);
}, []);
  const [activeMonthIdx, setActiveMonthIdx] = useState<number | null>(null);
  const activateBar = (payload: any, i?: number) => {
    const idx =
      typeof i === "number"
      ? i
      : typeof payload === "number"
      ? payload
      : typeof payload?.index === "number"
      ? payload.index
      : null;
  if (idx !== null) setActiveMonthIdx(idx);
};
  const deactivateBar = () => setActiveMonthIdx(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const activate = (payload: any, i?: number) => {
    const idx =
      typeof i === "number" ? i :
      typeof payload === "number" ? payload :
      typeof payload?.index === "number" ? payload.index : null;
    if (idx !== null) setActiveIndex(idx);
  };
  const deactivate = () => setActiveIndex(null);

useEffect(() => {
  if (!containerRef.current) return;
  const ro = new ResizeObserver((entries) => {
    const r = entries[0]?.contentRect;
    if (r?.width) setChartW(r.width);
    if (r?.height) setChartH(r.height);
  });
  ro.observe(containerRef.current);
  return () => ro.disconnect();
}, []);

 // mantém os trackers acima desta função:
let lastYLeft  = Number.NaN;
let lastYRight = Number.NaN;

const renderSmartLabel = (props: any) => {
  const RAD = Math.PI / 180;
  const {
    cx, cy, midAngle, outerRadius, name, category, value, amount, index,
  } = props;

  // reinicia os rastreadores no 1º setor
  if (index === 0) {
    lastYLeft = Number.NaN;
    lastYRight = Number.NaN;
  }

  // --- helpers de responsividade ---
  const veryNarrow = chartW <= 360;       // Galaxy S8/S9 etc.
  const narrow     = chartW < 340;

  // encurta o texto em telas estreitas (tooltip mantém o nome completo)
  const fullText = String(name ?? category ?? "");
  const shortText =
    veryNarrow && fullText.length > 12
      ? fullText.slice(0, 11) + "…"
      : narrow && fullText.length > 14
      ? fullText.slice(0, 13) + "…"
      : fullText;

  const moneyText = fmtBRL(Number(value ?? amount ?? 0));
  const color = pieColors[index % pieColors.length];

  const or = outerRadius ?? 0;
  const elbow1 = 14;
  const elbow2 = veryNarrow ? 20 : (chartW < 360 ? 22 : 22); // braço ligeiramente menor no super-estreito
  const r = or + elbow1 + elbow2;

  const baseX = cx + Math.cos(-RAD * midAngle) * r;
  const baseY = cy + Math.sin(-RAD * midAngle) * r;

  const padX = veryNarrow ? 12 : 10;
  const padY = 10;
  const edgeLeft   = padX;
  const edgeRight  = chartW ? chartW - padX : Infinity;
  const edgeTop    = padY;
  const edgeBottom = chartH ? chartH - padY : Infinity;

  // posição inicial + clamp horizontal
  let x = chartW ? Math.max(edgeLeft, Math.min(baseX, edgeRight)) : baseX;
  let y = baseY;

  // lado + âncora
  let onRight = x > cx;
  let anchor: "start" | "end" = onRight ? "start" : "end";

  // se encostar na borda, ancora para dentro
  const flipThresh = veryNarrow ? 40 : 28;
  if (chartW && x > edgeRight - 8) { x = edgeRight - 2; anchor = "end"; onRight = true; }
  if (chartW && x < edgeLeft  + 8) { x = edgeLeft  + 2; anchor = "start"; onRight = false; }

  // pontos da linha
  const sx = cx + Math.cos(-RAD * midAngle) * or;
  const sy = cy + Math.sin(-RAD * midAngle) * or;
  const mx = cx + Math.cos(-RAD * midAngle) * (or + elbow1);
  const my = cy + Math.sin(-RAD * midAngle) * (or + elbow1);
  const hx = cx + Math.cos(-RAD * midAngle) * (or + elbow1 + elbow2);
  const hy = cy + Math.sin(-RAD * midAngle) * (or + elbow1 + elbow2);

  // afasta da quina + re-clamp horizontal
  x += anchor === "start" ? 6 : -6;
  x  = chartW ? Math.max(edgeLeft, Math.min(x, edgeRight)) : x;

  // anti-colisão por lado
  const MIN_GAP = veryNarrow ? 12 : (narrow ? 14 : 16);
  y += (index % 2 === 0 ? -6 : 6);
  if (onRight) {
    if (!Number.isFinite(lastYRight)) lastYRight = y;
    else if (Math.abs(y - lastYRight) < MIN_GAP)
      y = lastYRight + (y >= lastYRight ? 1 : -1) * MIN_GAP;
    lastYRight = y;
  } else {
    if (!Number.isFinite(lastYLeft)) lastYLeft = y;
    else if (Math.abs(y - lastYLeft) < MIN_GAP)
      y = lastYLeft + (y >= lastYLeft ? 1 : -1) * MIN_GAP;
    lastYLeft = y;
  }

  // clamp vertical (considera bloco de 2 linhas)
  const fontPx = veryNarrow ? 9 : (narrow ? 10 : 12);
  const charW  = fontPx * 0.62;
  const estW   = Math.min(shortText.length * charW, 140);
  const blockHalf = fontPx; // aprox. duas linhas
  if (chartH) {
    const topSafe = edgeTop + blockHalf;
    const bottomSafe = edgeBottom - blockHalf;
    y = Math.max(topSafe, Math.min(y, bottomSafe));
  }
if (chartW) {
  if (anchor === "start" && x + estW > edgeRight - 2) {
    // vira para dentro
    anchor = "end";
    x = Math.max(edgeLeft + 2, edgeRight - 2);        // referencia no limite
  } else if (anchor === "end" && x - estW < edgeLeft + 2) {
    anchor = "start";
    x = Math.min(edgeRight - 2, edgeLeft + 2);
  }
}
  const labelClass =
    veryNarrow ? "text-[9px]"
    : narrow    ? "text-[10px]"
                : "text-xs";

  return (
    <g pointerEvents="none">
      <path
        d={`M ${sx},${sy} L ${mx},${my} L ${hx},${hy} L ${x},${y}`}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.95}
      />
      <text
        x={x}
        y={y}
        textAnchor={anchor}
        dominantBaseline="central"
        className={labelClass}
        fill={color}
      >
        <tspan x={x} dy="-0.6em">{shortText}</tspan>
        <tspan x={x} dy="1.2em">{moneyText}</tspan>
      </text>
    </g>
  );
};

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
              O que sobrou este mês: receitas − despesas
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
            <ChartContainer ref={containerRef} config={chartConfig} className="w-full aspect-[4/3] lg:aspect-video">
                <PieChart margin={{ top: 8, right: 12, bottom: 8, left: 12 }}>
                  <Pie
                    cx="50%"
                    cy="50%"
                    outerRadius={(() => {
                     const base = Math.floor(chartW / (isDesktop ? 5 : isTablet ? 3.6 : 5));
                     const maxR = isDesktop ? 84 : isTablet ? 128 : 84; 
                     return Math.max(56, Math.min(maxR, base));
                      })()}
                    data={categoryData}
                    dataKey="amount"
                    nameKey="category"
                    label={renderSmartLabel}
                    labelLine={false}
                    activeIndex={activeIndex ?? undefined}
                    isAnimationActive={false}
                    onMouseEnter={activate}
                    onMouseLeave={deactivate}
                    onClick={activate}
                    onTouchStart={activate}
                    onTouchEnd={deactivate}
                    onPointerDown={activate}
                    onPointerLeave={deactivate}
                  >
                    {categoryData.map((_, i) => (
                      <Cell 
                      key={i} 
                      fill={pieColors[i % pieColors.length]} 
                      onMouseEnter={() => setActiveIndex(i)} 
                      onMouseLeave={deactivate}
                      onClick={() => setActiveIndex(i)}
                      onTouchStart={() => setActiveIndex(i)}
                      onTouchEnd={deactivate}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: any, n) => [fmtBRL(Number(v)), String(n)]}
                    cursor={{ fill: "transparent" }}
                    wrapperStyle={{ pointerEvents: "none" }}
                  />
                </PieChart>
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
         <CardContent className="min-w-0" onClick={() => setActiveMonthIdx(null)} >
        <div onClick={(e) => e.stopPropagation()}>
        <ChartContainer config={chartConfig} className="w-full aspect-[4/3] md:aspect-video">
          <BarChart
            data={monthlyData}
            margin={{ top: 8, right: 12, bottom: isMobile ? 16 : 8, left: 12 }}
            barCategoryGap={isMobile ? "45%" : "25%"}
            barGap={isMobile ? 16 : 14}
         >
      <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
      <XAxis
        dataKey="month"
        tick={{ fill: "#94a3b8" }}
        tickFormatter={fmtMes}
        angle={isMobile ? -30 : 0}
        dx={isMobile ? -6 : 0}
        dy={isMobile ? 10 : 0}
        height={isMobile ? 40 : undefined}
        interval={0}
      />
      <YAxis tick={{ fill: "#94a3b8" }} />
      <Tooltip
        active={activeMonthIdx !== null}
        label={activeMonthIdx !== null ? monthlyData[activeMonthIdx].month : undefined}
        payload={
          activeMonthIdx !== null
          ? [
              { name: "Renda",  value: monthlyData[activeMonthIdx].income,   color: "#10b981" },
              { name: "Gastos", value: monthlyData[activeMonthIdx].expenses, color: "#ef4444" },
            ]
             : undefined
            }
        labelFormatter={(v) => `Mês: ${fmtMes(String(v))}`}
        formatter={(value, name) => [fmtBRL(Number(value)), name]}
        wrapperStyle={{ pointerEvents: "none" }}
        cursor={{ fill: "transparent" }}
      />

      {/* Renda */}
      <Bar
        dataKey="income"
        name="Renda"
        fill="#10b981"
        radius={4}
        isAnimationActive={false}
        barSize={isMobile ? 18 : 28}
        onMouseLeave={!isMobile ? deactivateBar : undefined}
      >
        {monthlyData.map((_, i) => (
          <Cell
            key={`inc-${i}`}
            opacity={activeMonthIdx === null || activeMonthIdx === i ? 1 : 0.35}
            onMouseEnter={!isMobile ? () => setActiveMonthIdx(i) : undefined}
            onClick={() => setActiveMonthIdx(prev => (prev === i ? null : i))}
            onTouchStart={() => setActiveMonthIdx(prev => (prev === i ? null : i))}
          />
        ))}
      </Bar>

      {/* Gastos */}
      <Bar
        dataKey="expenses"
        name="Gastos"
        fill="#ef4444"
        radius={4}
        isAnimationActive={false}
        barSize={isMobile ? 18 : 28}
        onMouseLeave={!isMobile ? deactivateBar : undefined}
      >
        {monthlyData.map((_, i) => (
          <Cell
            key={`exp-${i}`}
            opacity={activeMonthIdx === null || activeMonthIdx === i ? 1 : 0.35}
            onMouseEnter={!isMobile ? () => setActiveMonthIdx(i) : undefined}
            onClick={() => setActiveMonthIdx(prev => (prev === i ? null : i))}
            onTouchStart={() => setActiveMonthIdx(prev => (prev === i ? null : i))}
          />
        ))}
      </Bar>
    </BarChart>
  </ChartContainer>
  </div>
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
