import React from 'react';
import { Spinner } from './ui/spinner';
import { t } from '../i18n';

const InitialLoader: React.FC = () => {
  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center z-[100]">
      <div className="text-center">
        <div className="pos-spinner w-12 h-12 mx-auto" />
        <p className="mt-4 text-lg font-medium text-foreground">{t('common.loading_ury_pos')}</p>
        <p className="mt-2 text-sm text-muted-foreground">{t('common.please_wait_setup')}</p>
      </div>
    </div>
  );
};

export default InitialLoader; 