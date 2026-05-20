import { NavLink } from 'react-router-dom';
import { LayoutGrid, ClipboardList, Table } from 'lucide-react';
import { cn } from '../lib/utils';
import { t } from '../i18n';

const Footer = () => {
  const navItems = [
    { icon: LayoutGrid, label: t('footer.pos'), path: '/' },
    { icon: Table, label: t('footer.table'), path: '/table' },
    { icon: ClipboardList, label: t('footer.orders'), path: '/orders' },
  ];

  return (
    <div className="pos-footer-nav py-2 relative">
      <nav className="max-w-screen-xl mx-auto px-4">
        <div className="flex justify-center items-center gap-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn('pos-nav-item', isActive && 'pos-nav-item-active')
              }
            >
              <item.icon className="w-5 h-5" />
              <span className="text-xs mt-1">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default Footer;
