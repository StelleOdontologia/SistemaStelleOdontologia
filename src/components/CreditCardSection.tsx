import { mockCreditCards } from "@/data/mockData";

const CreditCardSection = () => {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  return (
    <div className="glass-card rounded-lg p-5 animate-fade-in">
      <h3 className="font-display font-semibold text-lg mb-4">Cartões de Crédito</h3>
      <div className="space-y-3">
        {mockCreditCards.map((card) => {
          const usagePercent = (card.currentBill / card.limit) * 100;
          return (
            <div key={card.id} className="p-4 rounded-lg bg-secondary/50 border border-border/30">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-medium text-sm">{card.name}</p>
                  <p className="text-xs text-muted-foreground">•••• {card.lastDigits}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-warning">{formatCurrency(card.currentBill)}</p>
                  <p className="text-xs text-muted-foreground">Vence {formatDate(card.dueDate)}</p>
                </div>
              </div>
              <div className="w-full bg-secondary rounded-full h-1.5">
                <div
                  className="h-1.5 rounded-full transition-all duration-500"
                  style={{
                    width: `${usagePercent}%`,
                    backgroundColor: usagePercent > 80 ? 'hsl(var(--expense))' : usagePercent > 50 ? 'hsl(var(--warning))' : 'hsl(var(--primary))',
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                {usagePercent.toFixed(0)}% do limite de {formatCurrency(card.limit)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CreditCardSection;
