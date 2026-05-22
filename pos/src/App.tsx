import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Footer from './components/Footer';
import Header from './components/Header';
import Orders from './pages/Orders';
import POS from './pages/POS';
import Table from './pages/Table';
import AuthGuard from './components/AuthGuard';
import POSOpeningProvider from './components/POSOpeningProvider';
import { ToastProvider } from './components/ui/toast';
import { usePOSStore } from './store/pos-store';
import { useEffect } from 'react';
import { getActiveLanguage } from './i18n';

function App() {
  const {
    initializeApp
  } = usePOSStore();
  
  useEffect(() => {
    initializeApp();
  }, [initializeApp]);

  useEffect(() => {
    const lang = getActiveLanguage();
    const isRtl = ['ar', 'he', 'fa', 'ur', 'ku'].includes(lang);
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
    document.documentElement.lang = lang || 'en';
  }, []);
  return (
    <>
      <ToastProvider />
      <AuthGuard>
        <Router basename="/pos">
          <POSOpeningProvider>
            <div className="flex flex-col h-screen pos-shell font-inter">
              <Header />
              <div className="flex-1 min-h-0 overflow-hidden bg-background">
                <Routes>
                  <Route path="/" element={<POS/>} />
                  <Route path="/orders" element={<Orders />} />
                  <Route path="/table" element={<Table />} />
                </Routes>
              </div>
              <Footer />
            </div>
          </POSOpeningProvider>
        </Router>
      </AuthGuard>
    </>
  );
}

export default App;
