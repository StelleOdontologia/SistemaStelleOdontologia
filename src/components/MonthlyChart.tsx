import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { monthlyData } from "@/data/mockData";

const MonthlyChart = () => {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(value);

  return (
    <div className="glass-card rounded-lg p-5 animate-fade-in">
      <h3 className="font-display font-semibold text-lg mb-4">Receitas vs Despesas</h3>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={monthlyData} barGap={2}>
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: 'hsl(215, 15%, 55%)' }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: 'hsl(215, 15%, 55%)' }}
              tickFormatter={formatCurrency}
              width={50}
            />
            <Tooltip
              cursor={{ fill: 'hsl(220, 14%, 14%, 0.5)' }}
              contentStyle={{
                backgroundColor: 'hsl(220, 18%, 12%)',
                border: '1px solid hsl(220, 14%, 20%)',
                borderRadius: '8px',
                fontSize: '13px',
              }}
              formatter={(value: number, name: string) => [
                formatCurrency(value),
                name === 'receitas' ? 'Receitas' : 'Despesas'
              ]}
            />
            <Bar dataKey="receitas" fill="hsl(152, 60%, 48%)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="despesas" fill="hsl(0, 72%, 55%)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default MonthlyChart;
