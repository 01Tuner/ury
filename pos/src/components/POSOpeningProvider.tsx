import type { ReactNode } from 'react';
import { ShiftProvider } from '../context/shift-context';

interface POSOpeningProviderProps {
  children: ReactNode;
}

const POSOpeningProvider = ({ children }: POSOpeningProviderProps) => (
  <ShiftProvider>{children}</ShiftProvider>
);

export default POSOpeningProvider;
