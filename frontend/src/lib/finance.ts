export function isSameMonthISO(dateISO: string, monthKey: string) {
  return String(dateISO).slice(0, 7) === monthKey;
}

export function sumValorMes(transacoes: Array<{ valor: number; data_transacao: string }>, monthKey: string) {
  return (transacoes || [])
    .filter(t => isSameMonthISO(t.data_transacao, monthKey))
    .reduce((acc, t) => acc + Number(t.valor || 0), 0);
}

// saldo do mês = (renda_fixa + receitasMes) - (gastos_fixos + despesasMes)
export function calcSaldoMes(user: any, receitasMes: number, despesasMes: number) {
  const rendaFixa = Number(user?.renda_fixa ?? 0);
  const gastosFixos = Number(user?.gastos_fixos ?? 0);
  return (rendaFixa + receitasMes) - (gastosFixos + despesasMes);
}

export function formatBRL(n: number) {
  try {
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  } catch {
    return `R$ ${Number(n).toFixed(2)}`;
  }
}