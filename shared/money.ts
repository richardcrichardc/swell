export function parseCents(value: string): number {
  return Math.round((parseFloat(value) || 0) * 100)
}

export function formatCents(cents: number): string {
  return (cents / 100).toFixed(2)
}
