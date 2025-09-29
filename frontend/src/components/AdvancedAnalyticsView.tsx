/* 
   ANÁLISES AVANÇADAS - ADVANCEDANALYTICSVIEW.TSX
*/

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line } from "recharts";
import { Button } from "@/components/ui/button";
import { getSumByDay, getSumByMonth, getSumByYear } from "@/lib/api";

export const AdvancedAnalyticsView = () => {
  const [selectedPeriod, setSelectedPeriod] = useState("month"); // "day", "month", "year"

  const [dailyData, setDailyData] = useState<{ period: string; expenses: number }[]>([]);
  const [loadingDaily, setLoadingDaily] = useState(false);

  useEffect(() => {
  const id = Number(localStorage.getItem("id_usuario") || "1");
  setLoadingDaily(true);

  const DAYS = 7; // fixo: últimos 7 dias
  getSumByDay(id, DAYS, "despesa")
    .then(rows =>
      rows.map((r: any) => ({ period: String(r.label), expenses: Number(r.total) }))
    )
    .then(setDailyData)
    .catch(console.error)
    .finally(() => setLoadingDaily(false));
}, []);

  const [monthlyData, setMonthlyData] = useState<{ period: string; expenses: number }[]>([]);
  const [yearlyData, setYearlyData]   = useState<{ period: string; expenses: number }[]>([]);
  const [loadingMonthly, setLoadingMonthly] = useState(false);
  const [loadingYearly,  setLoadingYearly]  = useState(false);

  useEffect(() => {
    const id = Number(localStorage.getItem("id_usuario") || "1");

    setLoadingMonthly(true);
    getSumByMonth(id, 6)
      .then(rows => setMonthlyData(rows.map(r => ({ period: String(r.label), expenses: Number(r.total) }))))
      .catch(console.error)
      .finally(() => setLoadingMonthly(false));

    setLoadingYearly(true);
    getSumByYear(id, 3)
      .then(rows => setYearlyData(rows.map(r => ({ period: String(r.label), expenses: Number(r.total) }))))
      .catch(console.error)
      .finally(() => setLoadingYearly(false));
  }, []);

  const getCurrentData = () => {
    switch (selectedPeriod) {
      case "day":   return dailyData;
      case "month": return monthlyData;
      case "year":  return yearlyData;
      default:      return monthlyData;
    }
  };

  const getPeriodHeader = () => {
    if (selectedPeriod === "day") {
      return (
        <span className="flex items-center gap-2">
          <img src="/dia.png" alt="Dia" className="h-5 w-5 object-contain select-none" />
          Gastos por Dia (Última Semana)
        </span>
      );
    }
    if (selectedPeriod === "month") {
      return (
        <span className="flex items-center gap-2">
          <img src="/meses.png" alt="Mês" className="h-5 w-5 object-contain select-none" />
          Gastos por Mês (Últimos 6 Meses)
        </span>
      );
    }
    return (
      <span className="flex items-center gap-2">
        <img src="/ano.png" alt="Ano" className="h-5 w-5 object-contain select-none" />
        Gastos por Ano (Últimos 3 Anos)
      </span>
    );
  };

  const chartConfig = { expenses: { label: "Gastos", color: "#fbbf24" } };

const yPadMax = (max: number) => {
  if (!max || !isFinite(max)) return 1;   // quando tudo é 0
  const padded = max * 1.1;               // +10% de folga
  const mag = Math.pow(10, Math.floor(Math.log10(padded)));
  return Math.ceil(padded / mag) * mag;   // arredonda pra cima (bonito)
};

const formatBR = (v: any) =>
  Number(v).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  

  return (
    <div className="space-y-6">
      {/* TÍTULO PRINCIPAL */}
      <h2 className="text-3xl font-bold text-white">
        <span className="flex items-center gap-3">
          <img src="/analiseavancada.png" alt="Análises Avançadas" className="h-7 w-7 rounded-md object-contain select-none" />
          <span>Análises Avançadas</span>
        </span>
      </h2>
      
      {/* BOTÕES PERÍODO */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Selecione o Período</CardTitle>
          <CardDescription className="text-slate-400">
            Escolha como você quer visualizar seus gastos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 flex-wrap">
            <Button
              onClick={() => setSelectedPeriod("day")}
              variant={selectedPeriod === "day" ? "default" : "outline"}
              className={selectedPeriod === "day" 
                ? "bg-yellow-500 text-slate-900 hover:bg-yellow-600" 
                : "border-slate-600 text-white hover:bg-slate-700"}
            >
              <span className="flex items-center gap-2">
                <img src="/dia.png" alt="Dia" className="h-4 w-4 object-contain select-none" />
                Por Dia
              </span>
            </Button>

            <Button
              onClick={() => setSelectedPeriod("month")}
              variant={selectedPeriod === "month" ? "default" : "outline"}
              className={selectedPeriod === "month" 
                ? "bg-yellow-500 text-slate-900 hover:bg-yellow-600" 
                : "border-slate-600 text-white hover:bg-slate-700"}
            >
              <span className="flex items-center gap-2">
                <img src="/meses.png" alt="Mês" className="h-4 w-4 object-contain select-none" />
                Por Mês
              </span>
            </Button>

            <Button
              onClick={() => setSelectedPeriod("year")}
              variant={selectedPeriod === "year" ? "default" : "outline"}
              className={selectedPeriod === "year" 
                ? "bg-yellow-500 text-slate-900 hover:bg-yellow-600" 
                : "border-slate-600 text-white hover:bg-slate-700"}
            >
              <span className="flex items-center gap-2">
                <img src="/ano.png" alt="Ano" className="h-4 w-4 object-contain select-none" />
                Por Ano
              </span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* GRÁFICOS */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* LINHA + ÍCONE TENDÊNCIA */}
        <Card className="bg-slate-800 border-slate-700 h-full lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-white">
              <span className="flex items-center gap-2">
                <img src="/tendGastos.png" alt="Tendência de Gastos" className="h-5 w-5 object-contain select-none" />
                Tendência de Gastos
              </span>
            </CardTitle>
            <CardDescription className="text-slate-400">
              Veja como seus gastos evoluem no período selecionado
            </CardDescription>
          </CardHeader>
          <CardContent className="min-w-0">
            <ChartContainer
              config={chartConfig}
              className="w-full h-[260px] md:h-[320px] lg:h-[360px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={getCurrentData()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                  <XAxis dataKey="period" tick={{ fill: '#94a3b8' }} />
                  <YAxis 
                  tick={{ fill: '#94a3b8' }} 
                  tickFormatter={(v) => `R$${v}`} 
                  domain={[0, (dataMax: number) => Math.max(1, yPadMax(dataMax))]}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} formatter={(value) => [`R$${value}`]} />
                  <Line
                    type="monotone"
                    dataKey="expenses"
                    stroke="#fbbf24"
                    strokeWidth={3}
                    dot={{ fill: '#fbbf24', strokeWidth: 2, r: 4 }}
                    name="Gastos"
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

{/* RESUMO*/}
<Card className="bg-slate-800 border-slate-700">
  <CardHeader>
    <CardTitle className="text-white">📋 Resumo Estatístico</CardTitle>
    <CardDescription className="text-slate-400">
      Dados importantes sobre o período selecionado
    </CardDescription>
  </CardHeader>
  <CardContent>
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div className="text-center p-4 bg-slate-700 rounded-lg">
        <p className="text-sm text-slate-400">Total do Período</p>
        <p className="text-2xl font-bold text-yellow-500">
          R$ {formatBR(getCurrentData().reduce((sum, item) => sum + item.expenses, 0))}
        </p>
      </div>
      <div className="text-center p-4 bg-slate-700 rounded-lg">
        <p className="text-sm text-slate-400">Média de gastos por dia</p>
        <p className="text-2xl font-bold text-blue-500">
          R$ {formatBR(Math.round(
            getCurrentData().reduce((sum, item) => sum + item.expenses, 0) /
            (getCurrentData().length || 1)
          ))}
        </p>
      </div>
      <div className="text-center p-4 bg-slate-700 rounded-lg">
        <p className="text-sm text-slate-400">Maior Gasto</p>
        <p className="text-2xl font-bold text-red-500">
          R$ {formatBR(getCurrentData().length ? Math.max(...getCurrentData().map(item => item.expenses)) : 0)}
        </p>
      </div>
      <div className="text-center p-4 bg-slate-700 rounded-lg">
        <p className="text-sm text-slate-400">Menor Gasto</p>
        <p className="text-2xl font-bold text-green-500">
          R$ {formatBR(getCurrentData().length ? Math.min(...getCurrentData().map(item => item.expenses)) : 0)}
        </p>
      </div>
    </div>
  </CardContent>
</Card>

    </div>
  );
};
