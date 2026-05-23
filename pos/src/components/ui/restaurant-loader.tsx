import { cn } from '../../lib/utils';
import restaurantLoaderGif from '../../assets/restaurant-loader.gif';

const sizeClasses = {
  sm: 'h-5 w-5',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
} as const;

export type RestaurantLoaderSize = keyof typeof sizeClasses;

type RestaurantLoaderProps = {
  size?: RestaurantLoaderSize;
  className?: string;
};

/** Restaurant-themed loading animation (cloche + steam). */
export function RestaurantLoader({ size = 'md', className }: RestaurantLoaderProps) {
  return (
    <img
      src={restaurantLoaderGif}
      alt=""
      role="status"
      aria-hidden
      className={cn('object-contain shrink-0', sizeClasses[size], className)}
    />
  );
}
