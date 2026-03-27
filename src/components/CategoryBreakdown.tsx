import { mockCategories } from "@/data/mockData";

const CategoryBreakdown = () => {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const total = mockCategories.reduce((sum, c) => sum + c.amount, 0);

  return (
    <div className="glass-card rounded-lg p-5 animate-fade-in">
      <h3 className="font-display font-semibold text-lg mb-4">Gastos por Categoria</h3>

      {/* Bar visualization */}
      <div className="flex rounded-full h-3 overflow-hidden mb-5 bg-secondary">
        {mockCategories.map((cat) => (
          <div
            key={cat.name}
            className="h-full transition-all duration-500"
            style={{ width: `${cat.percentage}%`, backgroundColor: cat.color }}
          />
        ))}
      </div>

      <div className="space-y-3">
        {mockCategories.map((cat) => (
          <div key={cat.name} className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
              <span className="text-sm">{cat.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">{formatCurrency(cat.amount)}</span>
              <span className="text-xs text-muted-foreground w-8 text-right">{cat.percentage}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CategoryBreakdown;
