import { useEffect, useMemo, useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChartContainer } from "@/components/ui/chart";
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
  Pencil,
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
import FaleConosco from "@/components/FaleConosco";

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
  return Number.isNaN(d.getTime()) ? s : d.toLocaleDateString("pt-BR");
};
const fmtMes = (s: string) => s.replace("-", "/");

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
  const isTablet = vw >= 768 && vw < 1024;

  useEffect(() => {
    const compute = () =>
      typeof window !== "undefined" &&
      (window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 768);

    const onResize = () => {
      setIsMobile(compute());
      if (typeof window !== "undefined") setVw(window.innerWidth);
    };

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
      typeof i === "number"
        ? i
        : typeof payload === "number"
        ? payload
        : typeof payload?.index === "number"
        ? payload.index
        : null;
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

let lastYLeft  = Number.NaN;
let lastYRight = Number.NaN;

const renderSmartLabel = (props: any) => {
  const RAD = Math.PI / 180;
  const { cx, cy, midAngle, outerRadius, name, category, value, amount, index } = props;

  if (index === 0) { lastYLeft = Number.NaN; lastYRight = Number.NaN; }

  const veryNarrow = chartW <= 360;
  const narrow     = chartW < 340;

  // tipografia base
  const basePx    = veryNarrow ? 9 : narrow ? 10 : isDesktop ? 18 : 12;
  const charW     = basePx * 0.62;
  const maxLines  = isDesktop ? 3 : 2;
  const maxLabelW = isDesktop ? 320 : 150; // largura útil do bloco (nome)

  // normalizador
  const normalize = (s: string) =>
    String(s).normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

  // quebras forçadas por device
  const FORCE_WRAP_MOBILE: Record<string, string[]> = {
    "roupas e acessorios": ["Roupas e", "Acessórios"],
    "alimentacao": ["Alimenta-", "ção"], // só mobile/tablet usa hífen aqui
  };
  const FORCE_WRAP_DESKTOP: Record<string, string[]> = {
    "roupas e acessorios": ["Roupas e", "Acessórios"], // desktop mantém 2 linhas
    // "alimentacao" fora => fica inteiro no desktop
  };

  // wrap por palavras com fallback para palavras longas (hífen)
  const wrap = (text: string) => {
    const key = normalize(text);
    const forced = (isDesktop ? FORCE_WRAP_DESKTOP : FORCE_WRAP_MOBILE)[key];
    if (forced) return forced.slice(0, maxLines);

    const words = String(text).split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let cur = "";
    const maxChars = Math.max(6, Math.floor(maxLabelW / (basePx * 0.62)));

    const pushCur = () => { if (cur) { lines.push(cur); cur = ""; } };

    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      if (w.length > maxChars) {
        // quebra com hífen apenas quando necessário
        pushCur();
        let rest = w;
        while (rest.length > maxChars && lines.length < maxLines - 1) {
          lines.push(rest.slice(0, maxChars - 1) + "-");
          rest = rest.slice(maxChars - 1);
        }
        if (rest) {
          if (lines.length < maxLines) cur = rest;
          else lines[lines.length - 1] = (lines[lines.length - 1] || "") + rest;
        }
      } else {
        const next = cur ? `${cur} ${w}` : w;
        if (next.length <= maxChars) cur = next;
        else { pushCur(); cur = w; }
      }
      if (lines.length >= maxLines) break;
    }
    pushCur();
    return lines.slice(0, maxLines);
  };

  const fullText  = String(name ?? category ?? "");
  const nameLines = wrap(fullText);

  const moneyText = fmtBRL(Number(value ?? amount ?? 0));
  const color     = pieColors[index % pieColors.length];

  // geometria da linha
  const or = outerRadius ?? 0;
  const normDeg  = ((midAngle % 360) + 360) % 360;
  const downward = normDeg > 235 && normDeg < 305; // apontando para baixo

  let arm =
    isDesktop ? Math.max(36, Math.round(or * 0.26)) :
    isTablet  ? Math.max(40, Math.round(or * 0.30)) :
                Math.max(38, Math.round(or * 0.30));
  if (downward && !isDesktop && !isTablet) arm = Math.max(28, Math.round(or * 0.24)); // mobile p/ baixo: encurta

  const ang = -RAD * midAngle;
  const sx  = cx + Math.cos(ang) * or;
  const sy  = cy + Math.sin(ang) * or;

  // alvo inicial
  let x = cx + Math.cos(ang) * (or + arm);
  let y = cy + Math.sin(ang) * (or + arm);

  // bordas do card
  const padX = veryNarrow ? 22 : 12; // folga maior no mobile estreito
  const padY = 10;
  const edgeLeft   = padX;
  const edgeRight  = chartW ? chartW - padX : Infinity;
  const edgeTop    = padY;
  const edgeBottom = chartH ? chartH - padY : Infinity;

  // clamp inicial horizontal
  if (chartW) x = Math.max(edgeLeft, Math.min(x, edgeRight));
  let onRight = x > cx;
  let anchor: "start" | "end" = onRight ? "start" : "end";

  // anticolisão vertical por lado
  const MIN_GAP = veryNarrow ? 20 : narrow ? 18 : 16;
  y += (index % 2 === 0 ? -8 : 8);
  if (onRight) {
    if (!Number.isFinite(lastYRight)) lastYRight = y;
    else if (Math.abs(y - lastYRight) < MIN_GAP) y = lastYRight + (y >= lastYRight ? 1 : -1) * MIN_GAP;
    lastYRight = y;
  } else {
    if (!Number.isFinite(lastYLeft)) lastYLeft = y;
    else if (Math.abs(y - lastYLeft) < MIN_GAP) y = lastYLeft + (y >= lastYLeft ? 1 : -1) * MIN_GAP;
    lastYLeft = y;
  }

  // limites verticais (nome + valor)
  const blockHalf = basePx * ((nameLines.length + 1) * 0.65);
  if (chartH) {
    const extraBottom = downward ? basePx * 0.6 : 0;
    const topSafe     = edgeTop + blockHalf;
    const bottomSafe  = edgeBottom - (blockHalf + extraBottom);
    y = Math.max(topSafe, Math.min(y, bottomSafe));
  }

  // posição do texto + clamp lateral com largura do NOME **e do VALOR**
  const labelPad   = 8; // respiro entre linha e texto
  const longestName = nameLines.reduce((m, s) => Math.max(m, s.length), 0);
  const nameW   = Math.min(longestName * charW, maxLabelW);
  const moneyW  = moneyText.length * charW * 1.05; // fator de segurança
  const estW    = Math.max(nameW, moneyW);         // largura do bloco inteiro

  let tx = anchor === "start" ? x + labelPad : x - labelPad;

  if (chartW) {
    if (anchor === "start" && tx + estW > edgeRight - 2) {
      tx = edgeRight - 2 - estW; // puxa bloco pra dentro
      x  = tx - labelPad;        // ajusta a ponta da linha
    } else if (anchor === "end" && tx - estW < edgeLeft + 2) {
      tx = edgeLeft + 2 + estW;
      x  = tx + labelPad;
    }
  }

  // valor com fonte adaptativa apenas no mobile/tablet (se necessário)
  let moneyPx = basePx;
  if (!isDesktop) {
    const avail = anchor === "start" ? (edgeRight - 2 - tx) : (tx - (edgeLeft + 2));
    const needed = moneyW;
    if (needed > avail) {
      const scale = Math.max(0.85, Math.min(1, avail / (needed + 1))); // mínimo 85%
      moneyPx = Math.round(basePx * scale);
    }
  }

  const labelClass =
    veryNarrow ? "text-[9px]" :
    narrow     ? "text-[10px]" :
    isDesktop  ? "text-[18px]" : "text-[12px]";

  const firstDyEm = -((nameLines.length - 1) * 0.6);

  return (
    <g pointerEvents="none">
      {/* linha reta da fatia até o texto */}
      <path
        d={`M ${sx},${sy} L ${x},${y}`}
        fill="none"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        opacity={0.95}
      />
      {/* bloco do label */}
      <text
        x={tx}
        y={y}
        textAnchor={anchor}
        dominantBaseline="central"
        className={labelClass}
        fill={color}
      >
        {nameLines.map((line, i) => (
          <tspan key={i} x={tx} dy={i === 0 ? `${firstDyEm}em` : "1.2em"}>
            {line}
          </tspan>
        ))}
        <tspan x={tx} dy="1.2em" style={{ fontSize: `${moneyPx}px` }}>
          {moneyText}
        </tspan>
      </text>
    </g>
  );
};




  const idUsuario = getUserId();
  const nowMonth = new Date().toISOString().slice(0, 7);

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

  // receitas do mês atual
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

  // Saldo do mês
  const saldoMes = rendaFixa + receitasMes - (gastosFixos + despesasMes);

  // totais absolutos
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
    const RANGE_MONTHS = 6;

    const start = new Date();
    start.setMonth(start.getMonth() - (RANGE_MONTHS - 1));
    start.setDate(1);
    start.setHours(0, 0, 0, 0);

    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const normDay = (s: string) => {
      const d = new Date(s);
      return Number.isNaN(d.getTime()) ? s.slice(0, 10) : d.toISOString().slice(0, 10);
    };
    const ym = (s: string) => normDay(s).slice(0, 7);
    const inRange = (isoDay: string) => {
      const d = new Date(isoDay);
      return d >= start && d <= end;
    };

    const months: string[] = [];
    for (const d = new Date(start); d <= end; d.setMonth(d.getMonth() + 1)) {
      months.push(d.toISOString().slice(0, 7));
    }

    const ev = new Map<string, number>();
    const add = (day: string, delta: number) =>
      ev.set(day, (ev.get(day) || 0) + delta);

    for (const t of transacoes) {
      const day = normDay(t.data_transacao);
      if (!inRange(day)) continue;
      const delta = t.tipo === "receita" ? Number(t.valor) : -Number(t.valor);
      add(day, delta);
    }

    for (const m of months) {
      const firstDay = `${m}-01`;
      const temReceitaNoMes = transacoes.some(
        (t) => t.tipo === "receita" && ym(t.data_transacao) === m
      );
      if (!temReceitaNoMes && (usuario?.renda_fixa ?? 0) > 0) {
        add(firstDay, Number(usuario!.renda_fixa));
      }
      if ((usuario?.gastos_fixos ?? 0) > 0) {
        add(firstDay, -Number(usuario!.gastos_fixos));
      }
    }

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

  // === paleta âmbar/caramelo expandida p/ até 9 categorias (sem repetir) ===
  const pieColors = useMemo(
    () =>
      ["#fcd34d", "#fbbf24", "#f59e0b", "#d97706", "#b45309", "#92400e", "#78350f", "#a16207", "#713f12"]
        .slice(0, Math.max(0, categoryData.length)),
    [categoryData.length]
  );

  // barras por mês (últimos 6) com base nas transações
  const monthlyData: MonthlyPoint[] = useMemo(() => {
    const months: string[] = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      return d.toISOString().slice(0, 7);
    });

    return months.map((k) => {
      const exp = transacoes
        .filter((t) => t.tipo === "despesa" && t.data_transacao.startsWith(k))
        .reduce((a, t) => a + Number(t.valor), 0);

      const incFromTx = transacoes
        .filter((t) => t.tipo === "receita" && t.data_transacao.startsWith(k))
        .reduce((a, t) => a + Number(t.valor), 0);

      const inc = incFromTx > 0 ? incFromTx : Number(usuario?.renda_fixa ?? 0);

      return {
        month: k,
        expenses: Math.round((exp + Number.EPSILON) * 100) / 100,
        income: Math.round((inc + Number.EPSILON) * 100) / 100,
      };
    });
  }, [transacoes, usuario?.renda_fixa]);

  const chartConfig = {
    expenses: { label: "Gastos", color: "hsl(var(--chart-1))" },
    income: { label: "Renda", color: "hsl(var(--chart-2))" },
    saldo: { label: "Saldo", color: "hsl(var(--chart-3))" },
    amount: { label: "Valor", color: "hsl(var(--chart-4))" },
  };

  if (loading) return <div className="p-6 text-slate-2 00">Carregando dados...</div>;
  if (error) return <div className="p-6 text-red-400">Erro: {error}</div>;

  const suggestion = (() => {
    if (despesasMes > rendaFixa * 0.6) {
      return {
        text: "Seus gastos deste mês já superam 60% da renda. Avalie reduzir despesas variáveis.",
        icon: <AlertTriangle className="w-5 h-5 text-yellow-500" />,
      };
    }
    return {
      text: "Boa! Você está com saldo positivo — considere reservar uma parte como poupança.",
      icon: <CheckCircle className="w-5 h-5 text-emerald-500" />,
    };
  })();

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
              Saldo do mês
            </CardTitle>
            <CardDescription className="text-slate-400">
              O que sobrou este mês: receitas − despesas
            </CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-emerald-400">
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
            {/* mantém seu aspect e resize logic */}
            <ChartContainer ref={containerRef} config={chartConfig} className="w-full aspect-[4/3] lg:aspect-[4/3] min-h-[520px] sm:min-h-[560px] lg:min-h-[600px]">
              <PieChart margin={{ top: 8, right: 12, bottom: 8, left: 12 }}>
                <Pie
                  cx="50%"
                  cy="50%"
                  outerRadius={(() => {
  const shortSide = Math.max(1, Math.min(chartW || 0, chartH || chartW || 0));
  const base = isDesktop ? shortSide * 0.52 : isTablet ? shortSide * 0.42 : shortSide * 0.40;
  const maxR = isDesktop ? 240 : isTablet ? 140 : 110;   // ↑ maior só no desktop
  const minR = isDesktop ? 96  : 64;
  return Math.max(minR, Math.min(Math.floor(base), maxR));
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
                      fill={pieColors[i]} 
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
          <CardContent className="min-w-0" onClick={() => setActiveMonthIdx(null)}>
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
                            { name: "Renda", value: monthlyData[activeMonthIdx].income, color: "#10b981" },
                            { name: "Gastos", value: monthlyData[activeMonthIdx].expenses, color: "#ef4444" },
                          ]
                        : undefined
                    }
                    labelFormatter={(v) => `Mês: ${fmtMes(String(v))}`}
                    formatter={(value, name) => [fmtBRL(Number(value)), name]}
                    wrapperStyle={{ pointerEvents: "none" }}
                    cursor={{ fill: "transparent" }}
                  />

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
                        onClick={() => setActiveMonthIdx((prev) => (prev === i ? null : i))}
                        onTouchStart={() => setActiveMonthIdx((prev) => (prev === i ? null : i))}
                      />
                    ))}
                  </Bar>

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
                        onClick={() => setActiveMonthIdx((prev) => (prev === i ? null : i))}
                        onTouchStart={() => setActiveMonthIdx((prev) => (prev === i ? null : i))}
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
                        {fmtDia(t.data_transacao)} •{" "}
                        {categoriasDict[t.id_categoria] ?? `Categoria #${t.id_categoria}`}
                      </div>
                    </div>
                   <div className="flex items-center gap-2">
  <div className="font-semibold text-rose-300">
    {fmtBRL(Number(t.valor))}
  </div>

  <button
    type="button"
    className="p-1 rounded-md hover:bg-slate-800/60 focus:outline-none focus:ring-2 focus:ring-amber-400/40"
    onClick={() =>
      alert(`Editar valor de ${t.descricao || "Despesa"} (ID ${t.id_transacao})`)
    }
    title="Editar valor"
    aria-label="Editar valor"
  >
    <Pencil className="w-4 h-4 text-slate-300" />
  </button>
</div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* ==== RODAPÉ DA ABA PAINEL ==== */}
        <div className="md:col-span-2 w-full flex justify-center">
          <FaleConosco
            companyName="FINTY"
            year={2025}
            cnpj="00.000.000/0000-00"
            contactTitle="Fale Conosco"
            contactName="Finty Análise"
            email="finty.adm@gmail.com"
            className="mt-8"
          />
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
