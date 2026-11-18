import React from 'react';
import { Home, Calendar, Scissors, Users, User, QrCode, ScanLine } from 'lucide-react';
import { motion } from 'motion/react';
import { useBarbershop } from '../../contexts/BarbershopContext';
import { useAuth } from '../../contexts/AuthContext';

export type TabType = 'home' | 'book' | 'appointments' | 'barbers' | 'profile' | 'scanner';

interface BottomTabBarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  onOpenQr?: () => void;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({ activeTab, onTabChange, onOpenQr }) => {
  const { appointments, barbers } = useBarbershop();
  const { currentRole, isAuthenticated, userProfile, currentBarberId } = useAuth();

  const isBarber = currentRole === 'barber';
  const isAdmin = currentRole === 'admin';

  const activeBarber = barbers.find(
    (b) =>
      b.id === currentBarberId ||
      b.userId === userProfile?.id ||
      b.phone === userProfile?.phone ||
      b.displayName.toLowerCase() === userProfile?.name.toLowerCase()
  ) || barbers[0];

  const upcomingCount = appointments.filter((a) => {
    if (isBarber && activeBarber) {
      return a.barberId === activeBarber.id && (a.status === 'confirmed' || a.status === 'pending');
    }
    return a.status === 'confirmed' || a.status === 'pending';
  }).length;

  if (isAdmin) {
    return null;
  }

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none flex justify-center px-2 sm:px-3"
      style={{
        paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 1rem)',
      }}
    >
      <nav className="pointer-events-auto relative flex items-center justify-around w-full max-w-lg bg-white/95 backdrop-blur-2xl border border-[#E6E1D6] rounded-full px-1.5 sm:px-2 py-1.5 shadow-[0_12px_36px_rgba(22,21,20,0.12)] gap-0.5">
        {/* TAB 1: INICIO */}
        <button
          onClick={() => onTabChange('home')}
          className={`relative flex flex-col items-center justify-center py-1 px-2 sm:px-3 rounded-full transition-colors focus:outline-none ${
            activeTab === 'home' ? 'text-[#9A6B3B]' : 'text-[#5C5852] hover:text-[#161514]'
          }`}
        >
          {activeTab === 'home' && (
            <motion.div
              layoutId="activeTabPill"
              className="absolute inset-0 bg-[#F2EFE9] rounded-full"
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            />
          )}
          <Home className={`relative z-10 w-4 h-4 sm:w-5 sm:h-5 transition-transform ${activeTab === 'home' ? 'scale-105' : ''}`} />
          <span className={`relative z-10 text-[9px] sm:text-[10px] mt-0.5 font-medium transition-colors whitespace-nowrap ${activeTab === 'home' ? 'text-[#161514] font-semibold' : 'text-[#5C5852]'}`}>
            Inicio
          </span>
        </button>

        {/* TAB 2: MIS CITAS (BARBER) OR BARBEROS (CLIENT) */}
        {isBarber ? (
          <button
            onClick={() => onTabChange('appointments')}
            className={`relative flex flex-col items-center justify-center py-1 px-2 sm:px-3 rounded-full transition-colors focus:outline-none ${
              activeTab === 'appointments' ? 'text-[#9A6B3B]' : 'text-[#5C5852] hover:text-[#161514]'
            }`}
          >
            {activeTab === 'appointments' && (
              <motion.div
                layoutId="activeTabPill"
                className="absolute inset-0 bg-[#F2EFE9] rounded-full"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <div className="relative z-10">
              <Calendar className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform ${activeTab === 'appointments' ? 'scale-105' : ''}`} />
              {Boolean(upcomingCount > 0) && (
                <span className="absolute -top-1 -right-2 flex items-center justify-center min-w-3.5 h-3.5 px-0.5 rounded-full bg-[#161514] text-[#FAF9F6] text-[8px] sm:text-[9px] font-bold tabular-nums">
                  {upcomingCount}
                </span>
              )}
            </div>
            <span className={`relative z-10 text-[9px] sm:text-[10px] mt-0.5 font-medium transition-colors whitespace-nowrap ${activeTab === 'appointments' ? 'text-[#161514] font-semibold' : 'text-[#5C5852]'}`}>
              Mis Citas
            </span>
          </button>
        ) : (
          <button
            onClick={() => onTabChange('barbers')}
            className={`relative flex flex-col items-center justify-center py-1 px-2 sm:px-3 rounded-full transition-colors focus:outline-none ${
              activeTab === 'barbers' ? 'text-[#9A6B3B]' : 'text-[#5C5852] hover:text-[#161514]'
            }`}
          >
            {activeTab === 'barbers' && (
              <motion.div
                layoutId="activeTabPill"
                className="absolute inset-0 bg-[#F2EFE9] rounded-full"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <Users className={`relative z-10 w-4 h-4 sm:w-5 sm:h-5 transition-transform ${activeTab === 'barbers' ? 'scale-105' : ''}`} />
            <span className={`relative z-10 text-[9px] sm:text-[10px] mt-0.5 font-medium transition-colors whitespace-nowrap ${activeTab === 'barbers' ? 'text-[#161514] font-semibold' : 'text-[#5C5852]'}`}>
              Barberos
            </span>
          </button>
        )}

        {/* CENTER ACTION TAB: LECTOR QR OR MI QR */}
        {isBarber ? (
          <button
            type="button"
            onClick={onOpenQr}
            className="relative -top-3 group focus:outline-none px-1"
            aria-label="Lector de Códigos QR de Clientes"
            title="Escanear QR de cliente para visitas o puntos"
          >
            <div className="relative flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white border-2 border-[#9A6B3B] text-[#9A6B3B] shadow-[0_6px_20px_rgba(154,107,59,0.22)] transition-transform active:scale-95 group-hover:scale-105">
              <ScanLine className="w-5 h-5 text-[#9A6B3B] stroke-[2.2]" />
            </div>
            <span className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 text-[9px] sm:text-[10px] font-bold text-[#9A6B3B] tracking-tight whitespace-nowrap">
              Lector QR
            </span>
          </button>
        ) : (
          isAuthenticated && userProfile && (
            <button
              type="button"
              onClick={onOpenQr}
              className="relative -top-3 group focus:outline-none px-1"
              aria-label="Mi Código QR y Pase VIP"
              title="Mostrar mi código QR y No. de Cliente"
            >
              <div className="relative flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white border-2 border-[#9A6B3B] text-[#9A6B3B] shadow-[0_6px_20px_rgba(154,107,59,0.22)] transition-transform active:scale-95 group-hover:scale-105">
                <QrCode className="w-5 h-5 text-[#9A6B3B] stroke-[2.2]" />
              </div>
              <span className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 text-[9px] sm:text-[10px] font-bold text-[#9A6B3B] tracking-tight whitespace-nowrap">
                Mi QR
              </span>
            </button>
          )
        )}

        {/* ACTION TAB: RESERVAR */}
        <button
          onClick={() => onTabChange('book')}
          className="relative -top-3 group focus:outline-none px-1"
          aria-label={isBarber ? 'Agendar Cita en mi silla' : 'Reservar Cita'}
          title={isBarber ? 'Agendar a un cliente para mi silla' : 'Reservar cita'}
        >
          <div className="relative flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#161514] border-2 border-[#9A6B3B]/70 text-[#FAF9F6] shadow-[0_8px_22px_rgba(22,21,20,0.28)] transition-transform active:scale-95 group-hover:scale-105">
            <Scissors className="w-4 h-4 sm:w-5 sm:h-5 text-[#FAF9F6] stroke-[2.2]" />
          </div>
          <span className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 text-[9px] sm:text-[10px] font-bold text-[#161514] tracking-tight whitespace-nowrap">
            Reservar
          </span>
        </button>

        {/* CLIENT TAB: MIS CITAS */}
        {!isBarber && (
          <button
            onClick={() => onTabChange('appointments')}
            className={`relative flex flex-col items-center justify-center py-1 px-2 sm:px-3 rounded-full transition-colors focus:outline-none ${
              activeTab === 'appointments' ? 'text-[#9A6B3B]' : 'text-[#5C5852] hover:text-[#161514]'
            }`}
          >
            {activeTab === 'appointments' && (
              <motion.div
                layoutId="activeTabPill"
                className="absolute inset-0 bg-[#F2EFE9] rounded-full"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <div className="relative z-10">
              <Calendar className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform ${activeTab === 'appointments' ? 'scale-105' : ''}`} />
              {Boolean(upcomingCount > 0) && (
                <span className="absolute -top-1 -right-2 flex items-center justify-center min-w-3.5 h-3.5 px-0.5 rounded-full bg-[#9A6B3B] text-[#FAF9F6] text-[8px] sm:text-[9px] font-bold tabular-nums">
                  {upcomingCount}
                </span>
              )}
            </div>
            <span className={`relative z-10 text-[9px] sm:text-[10px] mt-0.5 font-medium transition-colors whitespace-nowrap ${activeTab === 'appointments' ? 'text-[#161514] font-semibold' : 'text-[#5C5852]'}`}>
              Mis Citas
            </span>
          </button>
        )}

        {/* TAB: PERFIL */}
        <button
          onClick={() => onTabChange('profile')}
          className={`relative flex flex-col items-center justify-center py-1 px-2 sm:px-3 rounded-full transition-colors focus:outline-none ${
            activeTab === 'profile' ? 'text-[#9A6B3B]' : 'text-[#5C5852] hover:text-[#161514]'
          }`}
        >
          {activeTab === 'profile' && (
            <motion.div
              layoutId="activeTabPill"
              className="absolute inset-0 bg-[#F2EFE9] rounded-full"
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            />
          )}
          <User className={`relative z-10 w-4 h-4 sm:w-5 sm:h-5 transition-transform ${activeTab === 'profile' ? 'scale-105' : ''}`} />
          <span className={`relative z-10 text-[9px] sm:text-[10px] mt-0.5 font-medium transition-colors whitespace-nowrap ${activeTab === 'profile' ? 'text-[#161514] font-semibold' : 'text-[#5C5852]'}`}>
            Perfil
          </span>
        </button>
      </nav>
    </div>
  );
};
