import { 
  Grid3X3,
  UtensilsCrossed,
} from 'lucide-react';
import { usePOSStore } from '../store/pos-store';
import { cn } from '../lib/utils';
import { Button, Badge } from './ui';
import CommentDialog from './CommentDialog';
import { useState } from 'react';
import { t } from '../i18n';

interface SidebarProps {
  disabled?: boolean;
}

const Sidebar = ({ disabled }: SidebarProps) => {
  const { selectedCategory, setSelectedCategory, menuItems, categories, orderComment, setOrderComment } = usePOSStore();
  const [showCommentDialog, setShowCommentDialog] = useState(false);

  // Count items per category
  const getCategoryCount = (category: string) => {
    const count = menuItems.filter(item => item.course === category).length;
    return count;
  };

  const getAllItemsCount = () => {
    const count = menuItems.length;
    return count;
  };

  const handleCommentSave = (comment: string) => {
    setOrderComment(comment);
  };

  return (
    <div className={cn(
      "hidden lg:flex w-64 shrink-0 bg-card border-e border-border h-full flex-col",
      disabled && "opacity-50 pointer-events-none"
    )}>
      {/* Categories List */}
      <nav className="flex-1 min-h-0 p-6 overflow-y-auto overscroll-contain pos-scrollbar">
        <div className="bg-secondary border border-border rounded-lg p-4">
          {/* Section Title */}
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3 px-1">
            {t('pos_sidebar.categories')}
          </h2>
          
          {/* All Items */}
          <Button
            onClick={() => setSelectedCategory('')}
            variant="ghost"
            className={cn(
              'w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium transition-all duration-200 group relative mb-1',
              selectedCategory === ''
                ? 'pos-sidebar-item-active'
                : 'pos-sidebar-item'
            )}
            disabled={disabled}
          >
            {/* Active indicator bar */}
            {selectedCategory === '' && (
              <div className="absolute start-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-e-full" />
            )}
            
            <div className="flex items-center gap-3 ms-1">
              <Grid3X3 className="w-4 h-4 text-muted-foreground" />
              <span>{t('pos_sidebar.all_items')}</span>
            </div>
            
            <Badge variant="secondary" size="sm" className="min-w-[24px] text-center">
              {getAllItemsCount()}
            </Badge>
          </Button>

          {/* Divider */}
          <div className="h-px bg-border my-3 mx-1" />

          {/* Category Items */}
          <div className="space-y-1">
            {categories.map((category) => {
              const count = getCategoryCount(category.name);
              return (
                <Button
                  key={category.name}
                  onClick={() => setSelectedCategory(category.name)}
                  variant="ghost"
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium transition-all duration-200 group relative',
                    selectedCategory === category.name
                      ? 'pos-sidebar-item-active'
                      : 'pos-sidebar-item'
                  )}
                  disabled={disabled}
                >
                  {/* Active indicator bar */}
                  {selectedCategory === category.name && (
                    <div className="absolute start-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-e-full" />
                  )}
                  <div className="flex items-center gap-3 ms-1">
                    <UtensilsCrossed className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-start">{category.label}</span>
                  </div>
                  <Badge variant="secondary" size="sm" className="min-w-[24px] text-center">
                    {count}
                  </Badge>
                </Button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Comment Dialog is rendered from sidebar but triggered from order panel, to not mount it on every order panel render */}
      <CommentDialog
        isOpen={showCommentDialog}
        onClose={() => setShowCommentDialog(false)}
        onSave={handleCommentSave}
        initialComment={orderComment}
      />
    </div>
  );
};

export default Sidebar; 