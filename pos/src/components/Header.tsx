import { useState, useEffect, useRef } from 'react';
import { t } from '../i18n';
import { Link, useLocation } from 'react-router-dom';
import {
  Command,
  User,
  ChevronDown,
  Monitor,
  LogOut,
  RefreshCw,
  DoorClosed,
  Printer,
} from 'lucide-react';
import { Button, Input } from './ui';
import { useRootStore } from '../store/root-store';
import { usePOSStore } from '../store/pos-store';
import type { RootState } from '../store/root-store';
import { logout } from '../lib/auth-api';
import {
  restoreQzPrinterMappings,
  snapshotQzPrinterMappings,
} from '../lib/qz-printer-mapping';
import { showToast } from './ui/toast';
import { useShift } from '../context/shift-context';
import PrinterMappingDialog from './PrinterMappingDialog';

const Header = () => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showPrinterMapping, setShowPrinterMapping] = useState(false);
  const { isShiftOpen, openCloseDialog } = useShift();
  const posProfile = usePOSStore((state) => state.posProfile);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const user = useRootStore((state: RootState) => state.user);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const location = useLocation();
  const { searchQuery, setSearchQuery } = usePOSStore();
  const { orderSearchQuery, setOrderSearchQuery } = useRootStore();
  const [orderSearchInput, setOrderSearchInput] = useState(orderSearchQuery);

  let searchPlaceholder = t('header.search_placeholder_default');
  let searchValue: string | undefined = undefined;
  let searchOnChange: ((e: React.ChangeEvent<HTMLInputElement>) => void) | undefined = undefined;
  if (location.pathname === '/orders') {
    searchPlaceholder = t('header.search_placeholder_orders');
    searchValue = orderSearchInput;
    searchOnChange = (e) => setOrderSearchInput(e.target.value);
  } else if (location.pathname === '/') {
    searchPlaceholder = t('header.search_placeholder_menu');
    searchValue = searchQuery;
    searchOnChange = (e) => setSearchQuery(e.target.value);
  }

  useEffect(() => {
    if (location.pathname !== '/orders') return;
    const handler = setTimeout(() => {
      setOrderSearchQuery(orderSearchInput);
    }, 300);
    return () => clearTimeout(handler);
  }, [orderSearchInput, setOrderSearchQuery, location.pathname]);

  useEffect(() => {
    if (location.pathname === '/orders') {
      setOrderSearchInput(orderSearchQuery);
    }
  }, [location.pathname, orderSearchQuery]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleUserMenuToggle = () => {
    setShowUserMenu(!showUserMenu);
  };

  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = '/login?redirect-to=%2Fpos';
    } catch {
      showToast.error(t('errors.failed_logout'));
    }
  };

  const handleClearCache = () => {
    const printerMappings = snapshotQzPrinterMappings();
    localStorage.clear();
    sessionStorage.clear();
    restoreQzPrinterMappings(printerMappings);
    window.location.reload();
  };

  return (
    <header className="pos-header shrink-0">
      <div className="flex items-center justify-between gap-2 h-16 px-3 sm:px-6 min-w-0">
        <div className="flex items-center shrink-0">
          <Link to="/" className="flex items-center gap-3 no-underline hover:opacity-90 transition-opacity">
            <span className="text-xl sm:text-2xl font-bold tracking-tight select-none" aria-label="Dine Pos">
              <span className="text-primary">Dine</span>
              <span className="text-foreground"> Pos</span>
            </span>
          </Link>
        </div>

        <div className="pos-search-bar px-3 sm:px-4 py-2 flex-1 flex items-center min-w-0 max-w-2xl mx-2 sm:mx-4 lg:mx-8">
          <Input
            ref={searchInputRef}
            placeholder={searchPlaceholder}
            className="h-fit p-0 w-full min-w-0 bg-transparent border-0 text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 text-sm sm:text-base"
            value={searchValue}
            onChange={searchOnChange}
          />
          <div className="hidden sm:flex items-center gap-2 text-muted-foreground shrink-0">
            <Command className="w-4 h-4" />
            <span>K</span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <div className="relative" ref={userMenuRef}>
            <Button
              onClick={handleUserMenuToggle}
              variant="ghost"
              className="flex items-center gap-1 sm:gap-2 text-muted-foreground hover:text-foreground px-1 sm:px-3"
            >
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="hidden md:inline text-sm font-medium text-foreground max-w-[8rem] truncate">
                {user?.full_name || 'User'}
              </span>
              <ChevronDown className="w-4 h-4 hidden sm:block" />
            </Button>

            {showUserMenu && (
              <div className="absolute end-0 mt-2 w-56 bg-card rounded-restro-sm shadow-lg border border-border z-50">
                <div className="p-4 border-b border-border">
                  <p className="text-sm font-medium text-foreground">
                    {user?.full_name || 'User'}
                  </p>
                  <p className="text-sm text-muted-foreground">{user?.name || ''}</p>
                </div>
                <div className="py-2">
                  {Number(posProfile?.qz_print) === 1 && (
                    <Button
                      variant="ghost"
                      className="flex justify-start items-center w-full px-4 py-2 text-sm text-foreground hover:bg-accent transition-colors"
                      onClick={() => {
                        setShowUserMenu(false);
                        setShowPrinterMapping(true);
                      }}
                    >
                      <Printer className="w-4 h-4 me-3" />
                      {t('header.printer_mapping')}
                    </Button>
                  )}
                  {isShiftOpen && (
                    <Button
                      variant="ghost"
                      className="flex justify-start items-center w-full px-4 py-2 text-sm text-foreground hover:bg-accent transition-colors"
                      onClick={() => {
                        setShowUserMenu(false);
                        openCloseDialog();
                      }}
                    >
                      <DoorClosed className="w-4 h-4 me-3" />
                      {t('shift.close_shift')}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    className="flex justify-start items-center w-full px-4 py-2 text-sm text-foreground hover:bg-accent transition-colors"
                    onClick={() => (window.location.href = '/app')}
                  >
                    <Monitor className="w-4 h-4 me-3" />
                    {t('header.switch_to_desk')}
                  </Button>
                  <Button
                    variant="ghost"
                    className="flex justify-start items-center w-full px-4 py-2 text-sm text-foreground hover:bg-accent transition-colors"
                    onClick={handleClearCache}
                  >
                    <RefreshCw className="w-4 h-4 me-3" />
                    {t('header.clear_cache')}
                  </Button>
                  <Button
                    variant="ghost"
                    className="flex justify-start items-center w-full px-4 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                    onClick={handleLogout}
                  >
                    <LogOut className="w-4 h-4 me-3" />
                    {t('header.logout')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {Number(posProfile?.qz_print) === 1 && posProfile.qz_host && (
        <PrinterMappingDialog
          open={showPrinterMapping}
          onClose={() => setShowPrinterMapping(false)}
          qzHost={posProfile.qz_host}
          posProfileName={posProfile.name}
          branch={posProfile.branch}
        />
      )}
    </header>
  );
};

export default Header;
