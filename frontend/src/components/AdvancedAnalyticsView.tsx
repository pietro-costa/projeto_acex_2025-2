/* 
   ANÁLISES AVANÇADAS - ADVANCEDANALYTICSVIEW.TSX
   Aqui temos gráficos que mostram gastos por:
   - Dia
   - Mês  
   - Ano
   O usuário pode escolher qual período quer ver
*/

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line } from "recharts";
import { Button } from "@/components/ui/button";

export const AdvancedAnalyticsView = () => {
  // Estado para controlar qual período está selecionado
  const [selectedPeriod, setSelectedPeriod] = useState("month"); // "day", "month", "year"

  // DADOS SIMULADOS PARA DIFERENTES PERÍODOS

  // Dados por dia (últimos 7 dias)
  const dailyData = [
    { period: "Seg", expenses: 45, label: "Segunda-feira" },
    { period: "Ter", expenses: 78, label: "Terça-feira" },
    { period: "Qua", expenses: 32, label: "Quarta-feira" },
    { period: "Qui", expenses: 95, label: "Quinta-feira" },
    { period: "Sex", expenses: 120, label: "Sexta-feira" },
    { period: "Sáb", expenses: 89, label: "Sábado" },
    { period: "Dom", expenses: 67, label: "Domingo" },
  ];

  // Dados por mês (últimos 6 meses)
  const monthlyData = [
    { period: "Jul", expenses: 1250, label: "Julho" },
    { period: "Ago", expenses: 1100, label: "Agosto" },
    { period: "Set", expenses: 1350, label: "Setembro" },
    { period: "Out", expenses: 1200, label: "Outubro" },
    { period: "Nov", expenses: 1400, label: "Novembro" },
    { period: "Dez", expenses: 1300, label: "Dezembro" },
  ];

  // Dados por ano (últimos 3 anos)
  const yearlyData = [
    { period: "2022", expenses: 14500, label: "2022" },
    { period: "2023", expenses: 15800, label: "2023" },
    { period: "2024", expenses: 16200, label: "2024" },
  ];

  // Função para decidir quais dados mostrar baseado no período selecionado
  const getCurrentData = () => {
    switch (selectedPeriod) {
      case "day":
        return dailyData;
      case "month":
        return monthlyData;
      case "year":
        return yearlyData;
      default:
        return monthlyData;
    }
  };

  // Função para pegar o título baseado no período
  const getPeriodTitle = () => {
    switch (selectedPeriod) {
      case "day":
        return "📅 Gastos por Dia (Última Semana)";
      case "month":
        return "📊 Gastos por Mês (Últimos 6 Meses)";
      case "year":
        return "📈 Gastos por Ano (Últimos 3 Anos)";
      default:
        return "📊 Análise de Gastos";
    }
  };

  // Configuração das cores para os gráficos
  const chartConfig = {
    expenses: { label: "Gastos", color: "#fbbf24" },
  };

  return (
    <div className="space-y-6">
      {/* TÍTULO PRINCIPAL */}
      <h2 className="text-3xl font-bold text-white">📊 Análises Avançadas</h2>
      
      {/* BOTÕES PARA ESCOLHER O PERÍODO */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">🎯 Selecione o Período</CardTitle>
          <CardDescription className="text-slate-400">
            Escolha como você quer visualizar seus gastos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 flex-wrap">
            
            {/* Botão para ver por DIA */}
            <Button
              onClick={() => setSelectedPeriod("day")}
              variant={selectedPeriod === "day" ? "default" : "outline"}
              className={selectedPeriod === "day" 
                ? "bg-yellow-500 text-slate-900 hover:bg-yellow-600" 
                : "border-slate-600 text-white hover:bg-slate-700"
              }
            >
              📅 Por Dia
            </Button>

            {/* Botão para ver por MÊS */}
            <Button
              onClick={() => setSelectedPeriod("month")}
              variant={selectedPeriod === "month" ? "default" : "outline"}
              className={selectedPeriod === "month" 
                ? "bg-yellow-500 text-slate-900 hover:bg-yellow-600" 
                : "border-slate-600 text-white hover:bg-slate-700"
              }
            >
              📊 Por Mês
            </Button>

            {/* Botão para ver por ANO */}
            <Button
              onClick={() => setSelectedPeriod("year")}
              variant={selectedPeriod === "year" ? "default" : "outline"}
              className={selectedPeriod === "year" 
                ? "bg-yellow-500 text-slate-900 hover:bg-yellow-600" 
                : "border-slate-600 text-white hover:bg-slate-700"
              }
            >
              📈 Por Ano
            </Button>

          </div>
        </CardContent>
      </Card>

      {/* GRÁFICO PRINCIPAL */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">{getPeriodTitle()}</CardTitle>
          <CardDescription className="text-slate-400">
            Visualize seus padrões de gastos ao longo do tempo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={getCurrentData()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis 
                  dataKey="period" 
                  tick={{ fill: '#94a3b8' }}
                />
                <YAxis 
                  tick={{ fill: '#94a3b8' }}
                  tickFormatter={(value) => `R$${value}`}
                />
                <ChartTooltip 
                  content={<ChartTooltipContent />}
                  formatter={(value, name) => [`R$${value}`, "Gastos"]}
                />
                <Bar 
                  dataKey="expenses" 
                  fill="#fbbf24" 
                  name="Gastos"
                  radius={[4, 4, 0, 0]} // Bordas arredondadas
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* GRÁFICO DE LINHA PARA MOSTRAR TENDÊNCIA */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">📈 Tendência de Gastos</CardTitle>
          <CardDescription className="text-slate-400">
            Veja como seus gastos evoluem no período selecionado
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={getCurrentData()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis 
                  dataKey="period" 
                  tick={{ fill: '#94a3b8' }}
                />
                <YAxis 
                  tick={{ fill: '#94a3b8' }}
                  tickFormatter={(value) => `R$${value}`}
                />
                <ChartTooltip 
                  content={<ChartTooltipContent />}
                  formatter={(value, name) => [`R$${value}`, "Gastos"]}
                />
                <Line 
                  type="monotone" 
                  dataKey="expenses" 
                  stroke="#fbbf24" 
                  strokeWidth={3}
                  dot={{ fill: '#fbbf24', strokeWidth: 2, r: 6 }}
                  name="Gastos"
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* RESUMO ESTATÍSTICO */}
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
                R${getCurrentData().reduce((sum, item) => sum + item.expenses, 0)}
              </p>
            </div>

            <div className="text-center p-4 bg-slate-700 rounded-lg">
              <p className="text-sm text-slate-400">Média</p>
              <p className="text-2xl font-bold text-blue-500">
                R${Math.round(getCurrentData().reduce((sum, item) => sum + item.expenses, 0) / getCurrentData().length)}
              </p>
            </div>

            <div className="text-center p-4 bg-slate-700 rounded-lg">
              <p className="text-sm text-slate-400">Maior Gasto</p>
              <p className="text-2xl font-bold text-red-500">
                R${Math.max(...getCurrentData().map(item => item.expenses))}
              </p>
            </div>

            <div className="text-center p-4 bg-slate-700 rounded-lg">
              <p className="text-sm text-slate-400">Menor Gasto</p>
              <p className="text-2xl font-bold text-green-500">
                R${Math.min(...getCurrentData().map(item => item.expenses))}
              </p>
            </div>

          </div>
        </CardContent>
      </Card>

    </div>
  );
};