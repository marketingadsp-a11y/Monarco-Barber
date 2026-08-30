import React from 'react';
import { Home, Calendar, Scissors, Users, User, QrCode, ScanLine, Camera } from 'lucide-react';
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

  // Barber's active barber record for appointments count
  const activeBarber = barbers.find(
    (b) =>
      b.id === currentBarberId ||
      b.userId === userProfile?.id ||
      b.phone === userProfile?.phone ||
      b.displayName.toLowerCase() === userProfile?.name.toLowerCase()
  ) || barbers[0];

  // Appointment count calculation
  const upcomingCount = appointments.filter((a) => {
    if (isBarber && activeBarber) {
      return a.barberId === activeBarber.id && (a.status === 'confirmed' || a.status === 'pending');
    }
    return a.status === 'confirmed' || a.status === 'pending';
  }).length;

  if (isAdmin) {
    // Admin uses top navigation inside AdminDashboardView
    return null;
  }

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none flex justify-center px-2 sm:px-3"
      style={{
        paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 1rem)',
      }}
    >
      <nav className="pointer-events-auto relative flex items-center justify-around w-full max-w-lg bg-[#12151B]/95 backdrop-blur-2xl border border-white/15 rounded-full px-1.5 sm:px-2 py-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.8)] shadow-black/90 gap-0.5">
        {/* TAB 1: INICIO */}
        <button
          onClick={() => onTabChange('home')}
          className={`relative flex flex-col items-center justify-center py-1 px-2 sm:px-3 rounded-full transition-all focus:outline-none ${
            activeTab === 'home' ? 'text-[#D4AF37]' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {activeTab === 'home' && (
            <motion.div
              layoutId="activeTabPill"
              className="absolute inset-0 bg-white/10 rounded-full"
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            />
          )}
          <Home className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform ${activeTab === 'home' ? 'scale-110' : ''}`} />
          <span className={`text-[9px] sm:text-[10px] mt-0.5 font-medium transition-colors ${activeTab === 'home' ? 'text-white font-semibold' : 'text-slate-400'}`}>
            Inicio
          </span>
        </button>

        {/* TAB 2: MIS CITAS (FOR BARBER) OR BARBEROS (FOR CLIENT) */}
        {isBarber ? (
          <button
            onClick={() => onTabChange('appointments')}
            className={`relative flex flex-col items-center justify-center py-1 px-2 sm:px-3 rounded-full transition-all focus:outline-none ${
              activeTab === 'appointments' ? 'text-[#D4AF37]' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {activeTab === 'appointments' && (
              <motion.div
                layoutId="activeTabPill"
                className="absolute inset-0 bg-white/10 rounded-full"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <div className="relative">
              <Calendar className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform ${activeTab === 'appointments' ? 'scale-110' : ''}`} />
              {Boolean(upcomingCount > 0) && (
                <span className="absolute -top-1 -right-2 flex items-center justify-center min-w-3.5 h-3.5 px-0.5 rounded-full bg-[#D4AF37] text-slate-950 text-[8px] sm:text-[9px] font-bold">
                  {upcomingCount}
                </span>
              )}
            </div>
            <span className={`text-[9px] sm:text-[10px] mt-0.5 font-medium transition-colors ${activeTab === 'appointments' ? 'text-white font-semibold' : 'text-slate-400'}`}>
              Mis Citas
            </span>
          </button>
        ) : (
          <button
            onClick={() => onTabChange('barbers')}
            className={`relative flex flex-col items-center justify-center py-1 px-2 sm:px-3 rounded-full transition-all focus:outline-none ${
              activeTab === 'barbers' ? 'text-[#D4AF37]' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {activeTab === 'barbers' && (
              <motion.div
                layoutId="activeTabPill"
                className="absolute inset-0 bg-white/10 rounded-full"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <Users className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform ${activeTab === 'barbers' ? 'scale-110' : ''}`} />
            <span className={`text-[9px] sm:text-[10px] mt-0.5 font-medium transition-colors ${activeTab === 'barbers' ? 'text-white font-semibold' : 'text-slate-400'}`}>
              Barberos
            </span>
          </button>
        )}

        {/* CENTER ACTION TAB: LECTOR QR (FOR BARBER) OR MI QR (FOR CLIENT) */}
        {isBarber ? (
          <button
            type="button"
            onClick={onOpenQr}
            className="relative -top-3 group focus:outline-none px-1"
            aria-label="Lector de Códigos QR de Clientes"
            title="Escanear QR de cliente para visitas o puntos"
          >
            <div className="relative flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-b from-[#1A1E27] to-[#0A0C10] border-2 border-[#D4AF37] text-[#D4AF37] shadow-[0_4px_20px_rgba(212,175,55,0.4)] transition-transform active:scale-95 group-hover:scale-105">
              <ScanLine className="w-5 h-5 sm:w-5 sm:h-5 text-[#D4AF37] stroke-[2.4]" />
            </div>
            <span className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 text-[9px] sm:text-[10px] font-bold text-[#D4AF37] tracking-tight whitespace-nowrap">
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
              <div className="relative flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-b from-[#1A1E27] to-[#0A0C10] border-2 border-[#D4AF37] text-[#D4AF37] shadow-[0_4px_20px_rgba(212,175,55,0.35)] transition-transform active:scale-95 group-hover:scale-105">
                <QrCode className="w-5 h-5 sm:w-5 sm:h-5 text-[#D4AF37] stroke-[2.2]" />
              </div>
              <span className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 text-[9px] sm:text-[10px] font-bold text-[#D4AF37] tracking-tight whitespace-nowrap">
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
          <div className="relative flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-tr from-[#996515] via-[#D4AF37] to-[#F3E5AB] text-slate-950 shadow-lg shadow-[#D4AF37]/35 transition-transform active:scale-95 group-hover:scale-105">
            <Scissors className="w-4 h-4 sm:w-5 sm:h-5 text-slate-950 stroke-[2.2]" />
          </div>
          <span className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 text-[9px] sm:text-[10px] font-semibold text-[#D4AF37] tracking-tight whitespace-nowrap">
            Reservar
          </span>
        </button>

        {/* CLIENT TAB: MIS CITAS (ONLY FOR CLIENT) */}
        {!isBarber && (
          <button
            onClick={() => onTabChange('appointments')}
            className={`relative flex flex-col items-center justify-center py-1 px-2 sm:px-3 rounded-full transition-all focus:outline-none ${
              activeTab === 'appointments' ? 'text-[#D4AF37]' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {activeTab === 'appointments' && (
              <motion.div
                layoutId="activeTabPill"
                className="absolute inset-0 bg-white/10 rounded-full"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <div className="relative">
              <Calendar className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform ${activeTab === 'appointments' ? 'scale-110' : ''}`} />
              {Boolean(upcomingCount > 0) && (
                <span className="absolute -top-1 -right-2 flex items-center justify-center min-w-3.5 h-3.5 px-0.5 rounded-full bg-[#D4AF37] text-slate-950 text-[8px] sm:text-[9px] font-bold">
                  {upcomingCount}
                </span>
              )}
            </div>
            <span className={`text-[9px] sm:text-[10px] mt-0.5 font-medium transition-colors ${activeTab === 'appointments' ? 'text-white font-semibold' : 'text-slate-400'}`}>
              Mis Citas
            </span>
          </button>
        )}

        {/* TAB: PERFIL */}
        <button
          onClick={() => onTabChange('profile')}
          className={`relative flex flex-col items-center justify-center py-1 px-2 sm:px-3 rounded-full transition-all focus:outline-none ${
            activeTab === 'profile' ? 'text-[#D4AF37]' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {activeTab === 'profile' && (
            <motion.div
              layoutId="activeTabPill"
              className="absolute inset-0 bg-white/10 rounded-full"
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            />
          )}
          <User className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform ${activeTab === 'profile' ? 'scale-110' : ''}`} />
          <span className={`text-[9px] sm:text-[10px] mt-0.5 font-medium transition-colors ${activeTab === 'profile' ? 'text-white font-semibold' : 'text-slate-400'}`}>
            Perfil
          </span>
        </button>
      </nav>
    </div>
  );
};

