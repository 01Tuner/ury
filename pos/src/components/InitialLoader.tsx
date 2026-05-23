import React from 'react';
import { RestaurantLoader } from './ui/restaurant-loader';
import { t } from '../i18n';

const InitialLoader: React.FC = () => {
  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center z-[100]">
      <div className="text-center">
        <RestaurantLoader size="lg" className="mx-auto" />
        <p className="mt-4 text-lg font-medium text-foreground">{t('common.loading_ury_pos')}</p>
        <p className="mt-2 text-sm text-muted-foreground">{t('common.please_wait_setup')}</p>
      </div>
    </div>
  );
};

export default InitialLoader; 