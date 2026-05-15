export enum AccountType {
  Asset = 'Asset',
  Liability = 'Liability',
  Income = 'Income',
  Expense = 'Expense',
  Equity = 'Equity',
}

export const AccountTypeLabel: Record<AccountType, string> = {
  [AccountType.Asset]: 'Assets',
  [AccountType.Liability]: 'Liabilities',
  [AccountType.Income]: 'Income',
  [AccountType.Expense]: 'Expenses',
  [AccountType.Equity]: 'Equity',
}

// +1 = debit-normal (positive amount = increase), -1 = credit-normal
export const AccountTypeSign: Record<AccountType, 1 | -1> = {
  [AccountType.Asset]: 1,
  [AccountType.Liability]: -1,
  [AccountType.Income]: -1,
  [AccountType.Equity]: -1,
  [AccountType.Expense]: 1,
}
