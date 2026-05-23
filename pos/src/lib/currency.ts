import { storage } from './storage';

function getSymbol(): string {
  return storage.getItem('currencySymbol') || '';
}

function isHtml(value: string): boolean {
  return /<[a-z][\s\S]*>/i.test(value);
}

/** Plain text for labels, i18n, etc. */
export function formatCurrency(amount: number): string {
  const symbol = getSymbol();
  const displaySymbol = isHtml(symbol) ? symbol.replace(/<[^>]*>/g, '').trim() : symbol;
  return displaySymbol ? `${displaySymbol} ${amount}` : String(amount);
}

export { getSymbol, isHtml };
