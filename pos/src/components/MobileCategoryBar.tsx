import { Grid3X3, UtensilsCrossed } from 'lucide-react';
import { usePOSStore } from '../store/pos-store';
import { cn } from '../lib/utils';
import { Badge } from './ui';
import { t } from '../i18n';

interface MobileCategoryBarProps {
  disabled?: boolean;
}

const MobileCategoryBar = ({ disabled }: MobileCategoryBarProps) => {
  const { selectedCategory, setSelectedCategory, menuItems, categories } = usePOSStore();

  const getCategoryCount = (category: string) =>
    menuItems.filter((item) => item.course === category).length;

  return (
    <div
      className={cn(
        'lg:hidden border-b border-border bg-card px-3 py-2',
        disabled && 'opacity-50 pointer-events-none'
      )}
    >
      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-2 px-1">
        {t('pos_sidebar.categories')}
      </p>
      <div className="flex gap-2 overflow-x-auto pos-scrollbar pb-1">
        <button
          type="button"
          onClick={() => setSelectedCategory('')}
          className={cn(
            'flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium border transition-colors',
            selectedCategory === ''
              ? 'bg-primary/15 border-primary text-primary'
              : 'bg-secondary border-border text-muted-foreground'
          )}
        >
          <Grid3X3 className="w-3.5 h-3.5" />
          {t('pos_sidebar.all_items')}
          <Badge variant="secondary" size="sm" className="min-w-[20px] text-center text-xs">
            {menuItems.length}
          </Badge>
        </button>
        {categories.map((category) => (
          <button
            key={category.name}
            type="button"
            onClick={() => setSelectedCategory(category.name)}
            className={cn(
              'flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium border transition-colors',
              selectedCategory === category.name
                ? 'bg-primary/15 border-primary text-primary'
                : 'bg-secondary border-border text-muted-foreground'
            )}
          >
            <UtensilsCrossed className="w-3.5 h-3.5" />
            <span>{category.label}</span>
            <Badge variant="secondary" size="sm" className="min-w-[20px] text-center text-xs">
              {getCategoryCount(category.name)}
            </Badge>
          </button>
        ))}
      </div>
    </div>
  );
};

export default MobileCategoryBar;
