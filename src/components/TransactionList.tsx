import { mockTransactions } from "@/data/mockData";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

const TransactionList = () => {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  const sorted = [...mockTransactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="glass-card rounded-lg p-5 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-lg">Transações Recentes</h3>
        <button className="text-xs text-primary hover:underline">Ver todas</button>
      </div>
      <div className="space-y-1">
        {sorted.slice(0, 7).map((tx) => (
          <div key={tx.id} className="flex items-center gap-3 py-2.5 px-2 rounded-md hover:bg-secondary/50 transition-colors">
            <div className={`p-1.5 rounded-md ${tx.type === 'income' ? 'bg-income/10' : 'bg-expense/10'}`}>
              {tx.type === 'income' ? (
                <ArrowUpRight className="h-4 w-4 text-income" />
              ) : (
                <ArrowDownRight className="h-4 w-4 text-expense" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{tx.description}</p>
              <p className="text-xs text-muted-foreground">{tx.category} · {tx.user}</p>
            </div>
            <div className="text-right">
              <p className={`text-sm font-semibold ${tx.type === 'income' ? 'text-income' : 'text-expense'}`}>
                {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
              </p>
              <p className="text-xs text-muted-foreground">{formatDate(tx.date)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TransactionList;
