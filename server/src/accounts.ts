export enum AccountGroup {
  Asset = 'Asset',
  Equity = 'Equity',
  Expense = 'Expense',
  Income = 'Income',
  Liability = 'Liability',
}

// +1 = debit-normal (positive amount = increase), -1 = credit-normal
export const AccountGroupSign: Record<AccountGroup, 1 | -1> = {
  [AccountGroup.Asset]: 1,
  [AccountGroup.Expense]: 1,
  [AccountGroup.Liability]: -1,
  [AccountGroup.Equity]: -1,
  [AccountGroup.Income]: -1,
}
