import type { Profile, Expense, Debt } from '../types';

/**
 * Calculates net balances for all group members and derives simplified debts.
 * 
 * Net Balance = Total Paid - Total Share
 * Creditors have Net Balance > 0
 * Debtors have Net Balance < 0
 */
export function calculateBalances(
  members: Profile[],
  expenses: Expense[]
): {
  netBalances: Record<string, number>;
  debts: Debt[];
} {
  const netBalances: Record<string, number> = {};
  
  // Initialize all members with zero balance
  members.forEach((m) => {
    netBalances[m.id] = 0;
  });

  // Calculate net balance for each member based on payments and splits
  expenses.forEach((expense) => {
    const payerId = expense.paid_by;
    const amount = Number(expense.amount);

    // Add paid amount to payer
    if (netBalances[payerId] !== undefined) {
      netBalances[payerId] += amount;
    }

    // Subtract splits from members
    if (expense.splits && expense.splits.length > 0) {
      expense.splits.forEach((split) => {
        const debtorId = split.profile_id;
        const splitAmount = Number(split.amount);
        if (netBalances[debtorId] !== undefined) {
          netBalances[debtorId] -= splitAmount;
        }
      });
    } else {
      // If there are no splits recorded, split equally among all group members by default
      const equalShare = amount / members.length;
      members.forEach((m) => {
        netBalances[m.id] -= equalShare;
      });
    }
  });

  // Round balances to 2 decimal places to prevent floating-point anomalies
  Object.keys(netBalances).forEach((key) => {
    netBalances[key] = Math.round(netBalances[key] * 100) / 100;
  });

  // Separate members into debtors and creditors
  interface Participant {
    id: string;
    name: string;
    balance: number;
  }

  let debtors: Participant[] = [];
  let creditors: Participant[] = [];

  members.forEach((member) => {
    const bal = netBalances[member.id] || 0;
    const name = member.name;
    if (bal < -0.01) {
      debtors.push({ id: member.id, name, balance: bal });
    } else if (bal > 0.01) {
      creditors.push({ id: member.id, name, balance: bal });
    }
  });

  const debts: Debt[] = [];

  // Greedy settlement simplification loop
  while (debtors.length > 0 && creditors.length > 0) {
    // Sort debtors so that the one who owes the most (most negative) is first
    debtors.sort((a, b) => a.balance - b.balance);
    // Sort creditors so that the one who is owed the most (most positive) is first
    creditors.sort((a, b) => b.balance - a.balance);

    const debtor = debtors[0];
    const creditor = creditors[0];

    const oweAmount = Math.abs(debtor.balance);
    const creditAmount = creditor.balance;

    const settledAmount = Math.round(Math.min(oweAmount, creditAmount) * 100) / 100;

    if (settledAmount > 0) {
      debts.push({
        fromProfileId: debtor.id,
        fromName: debtor.name,
        toProfileId: creditor.id,
        toName: creditor.name,
        amount: settledAmount,
      });
    }

    // Update their balances
    debtor.balance += settledAmount;
    creditor.balance -= settledAmount;

    // Filter out participants whose balances are fully settled (near 0)
    debtors = debtors.filter((d) => d.balance < -0.01);
    creditors = creditors.filter((c) => c.balance > 0.01);
  }

  return {
    netBalances,
    debts,
  };
}

/**
 * Format currency representation helper
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(value);
}
