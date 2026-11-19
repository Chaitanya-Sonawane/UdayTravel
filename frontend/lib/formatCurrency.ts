/**
 * Formats a numeric amount in Indian Rupees (INR) using 'en-IN' locale.
 * Shows decimals only if the amount is non-integer.
 *
 * Examples:
 *   formatCurrency(600)    -> "₹600"
 *   formatCurrency(1200)   -> "₹1,200"
 *   formatCurrency(1200.5) -> "₹1,200.50"
 */
export function formatCurrency(amount: number): string {
  const isInteger = Number.isInteger(amount)
  const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: isInteger ? 0 : 2,
    maximumFractionDigits: 2,
  })
  return formatter.format(amount)
}
