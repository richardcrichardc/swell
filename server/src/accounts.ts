export enum AccountType {
  Asset = 'Asset',
  Equity = 'Equity',
  Expense = 'Expense',
  Income = 'Income',
  Liability = 'Liability',
}

// +1 = debit-normal (positive amount = increase), -1 = credit-normal
export const AccountTypeSign: Record<AccountType, 1 | -1> = {
  [AccountType.Asset]: 1,
  [AccountType.Expense]: 1,
  [AccountType.Liability]: -1,
  [AccountType.Equity]: -1,
  [AccountType.Income]: -1,
}
