import { getSymbol, isHtml } from '../lib/currency';
import { cn } from '../lib/utils';

interface CurrencyAmountProps {
  amount: number;
  className?: string;
  prefix?: string;
}

export function CurrencyAmount({ amount, className, prefix }: CurrencyAmountProps) {
  const symbol = getSymbol();

  return (
    <span className={cn('inline-flex items-center gap-1 tabular-nums', className)}>
      {prefix}
      {symbol &&
        (isHtml(symbol) ? (
          <span className="inline-flex items-center" dangerouslySetInnerHTML={{ __html: symbol }} />
        ) : (
          <span>{symbol}</span>
        ))}
      <span>{amount}</span>
    </span>
  );
}
