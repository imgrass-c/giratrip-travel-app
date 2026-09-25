import type { Expense, Member, DebtSettlement, MemberBalance, CurrencyCode } from '../types';

/**
 * Calculates net balance for every member in base currency
 */
export const calculateMemberBalances = (members: Member[], expenses: Expense[]): MemberBalance[] => {
  const balanceMap: Record<string, { totalPaid: number; totalShouldPay: number }> = {};

  // Initialize
  members.forEach(m => {
    balanceMap[m.id] = { totalPaid: 0, totalShouldPay: 0 };
  });

  // Aggregate
  expenses.forEach(exp => {
    const amount = exp.amountInBaseCurrency;
    
    // Credit payer
    if (balanceMap[exp.paidById]) {
      balanceMap[exp.paidById].totalPaid += amount;
    }

    // Debit split members
    const participants = exp.splitMemberIds && exp.splitMemberIds.length > 0 
      ? exp.splitMemberIds 
      : members.map(m => m.id);

    const share = amount / participants.length;
    participants.forEach(pid => {
      if (balanceMap[pid]) {
        balanceMap[pid].totalShouldPay += share;
      }
    });
  });

  return members.map(m => {
    const data = balanceMap[m.id] || { totalPaid: 0, totalShouldPay: 0 };
    return {
      memberId: m.id,
      memberName: m.name,
      totalPaid: Math.round(data.totalPaid),
      totalShouldPay: Math.round(data.totalShouldPay),
      netBalance: Math.round(data.totalPaid - data.totalShouldPay),
    };
  });
};

/**
 * Minimum Cash Flow Algorithm:
 * Resolves mesh debts into minimal direct one-to-one transfers
 */
export const calculateMinimumCashFlow = (
  members: Member[], 
  expenses: Expense[],
  baseCurrency: CurrencyCode = 'TWD'
): DebtSettlement[] => {
  const balances = calculateMemberBalances(members, expenses);
  const memberNameMap: Record<string, string> = {};
  members.forEach(m => { memberNameMap[m.id] = m.name; });

  // Separate debtors and creditors
  interface DebtorCreditor {
    id: string;
    amount: number;
  }

  const creditors: DebtorCreditor[] = [];
  const debtors: DebtorCreditor[] = [];

  balances.forEach(b => {
    if (b.netBalance > 1) {
      creditors.push({ id: b.memberId, amount: b.netBalance });
    } else if (b.netBalance < -1) {
      debtors.push({ id: b.memberId, amount: -b.netBalance });
    }
  });

  // Sort descending by amount
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const settlements: DebtSettlement[] = [];

  let i = 0; // creditor index
  let j = 0; // debtor index

  while (i < creditors.length && j < debtors.length) {
    const creditor = creditors[i];
    const debtor = debtors[j];

    const settledAmount = Math.min(creditor.amount, debtor.amount);
    if (settledAmount > 0) {
      settlements.push({
        fromMemberId: debtor.id,
        fromMemberName: memberNameMap[debtor.id] || '旅伴',
        toMemberId: creditor.id,
        toMemberName: memberNameMap[creditor.id] || '旅伴',
        amount: Math.round(settledAmount),
        currency: baseCurrency,
      });
    }

    creditor.amount -= settledAmount;
    debtor.amount -= settledAmount;

    if (creditor.amount <= 1) i++;
    if (debtor.amount <= 1) j++;
  }

  return settlements;
};

/**
 * Generates clean, zero-emoji, LINE-friendly text summary
 */
export const generateSettlementShareText = (
  tripTitle: string,
  members: Member[],
  expenses: Expense[],
  baseCurrency: CurrencyCode = 'TWD'
): string => {
  const balances = calculateMemberBalances(members, expenses);
  const settlements = calculateMinimumCashFlow(members, expenses, baseCurrency);
  const totalSpent = expenses.reduce((sum, e) => sum + e.amountInBaseCurrency, 0);

  const lines: string[] = [];
  lines.push(`[GiraTrip 記啦旅 | 旅程結算清單]`);
  lines.push(`專案名稱: ${tripTitle}`);
  lines.push(`結算幣別: ${baseCurrency}`);
  lines.push(`總開銷金額: ${totalSpent.toLocaleString()} ${baseCurrency}`);
  lines.push(`記帳總筆數: ${expenses.length} 筆`);
  lines.push(`---------------------------------`);
  lines.push(`[個人代墊與應付明細]`);

  balances.forEach(b => {
    const status = b.netBalance >= 0 
      ? `應收 +${b.netBalance.toLocaleString()}` 
      : `應付 ${b.netBalance.toLocaleString()}`;
    lines.push(`• ${b.memberName}: 代墊 ${b.totalPaid.toLocaleString()} / 應分攤 ${b.totalShouldPay.toLocaleString()} (${status})`);
  });

  lines.push(`---------------------------------`);
  lines.push(`[最佳化最少轉帳路徑 (${settlements.length} 筆結清)]`);

  if (settlements.length === 0) {
    lines.push(`所有帳目已完全平衡，無須轉帳。`);
  } else {
    settlements.forEach((s, idx) => {
      lines.push(`${idx + 1}. ${s.fromMemberName} ➔ 轉給 ${s.toMemberName} : ${s.amount.toLocaleString()} ${s.currency}`);
    });
  }

  lines.push(`---------------------------------`);
  lines.push(`長頸鹿全覽行程，花費輕鬆記啦！`);
  return lines.join('\n');
};
