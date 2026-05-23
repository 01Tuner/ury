import { FC } from 'react';
import { cn } from '../lib/utils';
import { CurrencyAmount } from './CurrencyAmount';

interface MenuCardProps {
  id: string;
  name: string;
  price: number;
  item_image: string | null;
  course?: string;
  item: string;
  onClick?: () => void;
  disabled?: boolean;
}

const MenuCard: FC<MenuCardProps> = ({ 
  id, 
  name, 
  price, 
  item_image, 
  course, 
  item, 
  onClick,
  disabled 
}) => {
  return (
    <div
      className={cn(
        "bg-card border border-border rounded-lg overflow-hidden hover:bg-accent transition-colors cursor-pointer h-56 flex flex-col",
        disabled && "opacity-50 cursor-not-allowed pointer-events-none"
      )}
      onClick={disabled ? undefined : onClick}
    >
      {/* Image section - fixed height */}
      <div className="h-24">
        {item_image ? (
          <img
            src={item_image}
            alt={name}
            className="w-full h-full object-cover filter saturate-75 brightness-95"
            style={{ filter: 'saturate(0.7) brightness(0.95)' }}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const parent = target.parentElement;
              if (parent) {
                const placeholder = document.createElement('div');
                placeholder.className = 'w-full h-full bg-secondary flex items-center justify-center text-2xl text-muted-foreground font-medium';
                placeholder.textContent = name.slice(0, 2).toUpperCase();
                parent.insertBefore(placeholder, target);
              }
            }}
          />
        ) : (
          <div className="w-full h-full bg-secondary flex items-center justify-center text-2xl text-muted-foreground font-medium">
            {name.slice(0, 2).toUpperCase()}
          </div>
        )}
      </div>

      {/* Content section - flex grow with fixed padding */}
      <div className="flex-1 p-3 flex flex-col">
        {/* Name section - fixed height for 2 lines */}
        <div className="">
          <h3 className="font-medium text-foreground text-sm leading-5 line-clamp-2" title={name}>
            {name}
          </h3>
        </div>

        {/* Course section - fixed height for 1 line */}
        <div className="h-5 mt-1">
          <p className="text-xs text-muted-foreground truncate" title={course}>
            {course || ' '}
          </p>
        </div>

        {/* Price section - pushed to bottom */}
        <div className="mt-auto pt-2">
          <CurrencyAmount amount={price} className="text-sm font-semibold text-foreground" />
        </div>
      </div>
    </div>
  );
};

export default MenuCard; 