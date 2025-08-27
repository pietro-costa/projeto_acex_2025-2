
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";

export const AnalyticsView = () => {
  const monthlyData = [
    { month: "Jan", expenses: 1250, income: 3000 },
    { month: "Fev", expenses: 1100, income: 3000 },
    { month: "Mar", expenses: 1350, income: 3200 },
    { month: "Abr", expenses: 1200, income: 3100 },
    { month: "Mai", expenses: 1400, income: 3300 },
  ];

  const categoryData = [
    { category: "Alimentação", amount: 450, percentage: 35, color: "#fbbf24" },
    { category: "Transporte", amount: 300, percentage: 23, color: "#f59e0b" },
    { category: "Entretenimento", amount: 200, percentage: 16, color: "#d97706" },
    { category: "Utilidades", amount: 180, percentage: 14, color: "#b45309" },
    { category: "Outros", amount: 150, percentage: 12, color: "#92400e" },
  ];

  const trendData = [
    { month: "Jan", food: 420, transport: 280, entertainment: 180 },
    { month: "Fev", food: 380, transport: 300, entertainment: 160 },
    { month: "Mar", food: 450, transport: 320, entertainment: 200 },
    { month: "Abr", food: 410, transport: 290, entertainment: 170 },
    { month: "Mai", food: 480, transport: 310, entertainment: 220 },
  ];

  const chartConfig = {
    expenses: { label: "Gastos", color: "#fbbf24" },
    income: { label: "Renda", color: "#10b981" },
    food: { label: "Alimentação", color: "#fbbf24" },
    transport: { label: "Transporte", color: "#f59e0b" },
    entertainment: { label: "Entretenimento", color: "#d97706" },
  };

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-white">Análises</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Renda vs Gastos</CardTitle>
            <CardDescription className="text-slate-400">Comparação mensal dos últimos 5 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                  <XAxis dataKey="month" tick={{ fill: '#94a3b8' }} />
                  <YAxis tick={{ fill: '#94a3b8' }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="income" fill="#10b981" name="Renda" />
                  <Bar dataKey="expenses" fill="#fbbf24" name="Gastos" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Gastos por Categoria</CardTitle>
            <CardDescription className="text-slate-400">Detalhamento deste mês</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="amount"
                    label={({ category, percentage }) => `${category} (${percentage}%)`}
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Tendências de Gastos por Categoria</CardTitle>
          <CardDescription className="text-slate-400">Acompanhe como seus hábitos de gasto mudam ao longo do tempo</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis dataKey="month" tick={{ fill: '#94a3b8' }} />
                <YAxis tick={{ fill: '#94a3b8' }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="food" stroke="#fbbf24" strokeWidth={2} name="Alimentação" />
                <Line type="monotone" dataKey="transport" stroke="#f59e0b" strokeWidth={2} name="Transporte" />
                <Line type="monotone" dataKey="entertainment" stroke="#d97706" strokeWidth={2} name="Entretenimento" />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Resumo Financeiro</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-slate-700 rounded-lg">
              <p className="text-sm text-slate-400">Média Mensal</p>
              <p className="text-2xl font-bold text-yellow-500">R$1.260</p>
            </div>
            <div className="text-center p-4 bg-slate-700 rounded-lg">
              <p className="text-sm text-slate-400">Maior Categoria</p>
              <p className="text-2xl font-bold text-yellow-500">Alimentação</p>
            </div>
            <div className="text-center p-4 bg-slate-700 rounded-lg">
              <p className="text-sm text-slate-400">Total Este Ano</p>
              <p className="text-2xl font-bold text-yellow-500">R$6.300</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Detalhamento por Categoria</CardTitle>
            <CardDescription className="text-slate-400">Análise detalhada dos gastos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {categoryData.map((data) => (
                <div key={data.category} className="space-y-2">
                  <div className="flex justify-between">
                    <span className="font-medium text-white">{data.category}</span>
                    <span className="font-bold text-yellow-500">R${data.amount}</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full" 
                      style={{ width: `${data.percentage}%`, backgroundColor: data.color }}
                    ></div>
                  </div>
                  <div className="text-sm text-slate-400">{data.percentage}% do total</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Progresso Mensal</CardTitle>
            <CardDescription className="text-slate-400">Acompanhe seu progresso financeiro</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {monthlyData.map((data) => (
                <div key={data.month} className="flex items-center justify-between">
                  <span className="font-medium text-white">{data.month}</span>
                  <div className="flex items-center space-x-3">
                    <div className="w-32 bg-slate-700 rounded-full h-2">
                      <div 
                        className="bg-yellow-500 h-2 rounded-full" 
                        style={{ width: `${(data.expenses / data.income) * 100}%` }}
                      ></div>
                    </div>
                    <span className="font-bold text-white">R${data.expenses}</span>
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
