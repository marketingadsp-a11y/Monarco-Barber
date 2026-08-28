import React from 'react';
import { Home, Calendar, Scissors, Users, User, PlusCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { useBarbershop } from '../../contexts/BarbershopContext';
import { useAuth } from '../../contexts/AuthContext';

export type TabType = 'home' | 'book' | 'appointments' | 'barbers' | 'profile';

interface BottomTabBarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({ activeTab, onTabChange }) => {
  const { appointments } = useBarbershop();
  const { currentRole } = useAuth();

  // If in admin or barber mode, bottom bar adapts or shows dashboard shortcut
  const upcomingCount = appointments.filter(
    (a) => a.status === 'confirmed' || a.status === 'pending'
  ).length;

  const tabs: Array<{ id: TabType; label: string; icon: React.FC<{ className?: string }>; badge?: number; isAction?: boolean }> = [
    { id: 'home', label: 'Inicio', icon: Home },
    { id: 'barbers', label: 'Barberos', icon: Users },
    { id: 'book', label: 'Reservar', icon: PlusCircle, isAction: true },
    { id: 'appointments', label: 'Mis Citas', icon: Calendar, badge: upcomingCount },
    { id: 'profile', label: 'Perfil', icon: User },
  ];

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none flex justify-center px-3"
      style={{
        paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 1rem)',
      }}
    >
      <nav className="pointer-events-auto relative flex items-center justify-around w-full max-w-md bg-[#12151B]/95 backdrop-blur-2xl border border-white/15 rounded-full px-2 py-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.7)] shadow-black/80">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          if (tab.isAction) {
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className="relative -top-3 group focus:outline-none"
                aria-label={tab.label}
              >
                <div className="relative flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-tr from-[#996515] via-[#D4AF37] to-[#F3E5AB] text-slate-950 shadow-lg shadow-[#D4AF37]/30 transition-transform active:scale-95 group-hover:scale-105">
                  <Scissors className="w-5 h-5 text-slate-950 stroke-[2.2]" />
                  <span className="sr-only">{tab.label}</span>
                </div>
                <span className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-[#D4AF37] tracking-tight">
                  Reservar
                </span>
              </button>
            );
          }

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`relative flex flex-col items-center justify-center py-1 px-3 rounded-full transition-all focus:outline-none ${
                isActive ? 'text-[#D4AF37]' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTabPill"
                  className="absolute inset-0 bg-white/10 rounded-full"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}

              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                {Boolean(tab.badge && tab.badge > 0) && (
                  <span className="absolute -top-1 -right-2 flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-[#D4AF37] text-slate-950 text-[9px] font-bold">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] mt-0.5 font-medium transition-colors ${isActive ? 'text-white font-semibold' : 'text-slate-400'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
