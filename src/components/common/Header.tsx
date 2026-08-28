import React from 'react';
import { Crown, User, MessageCircle, Shield, Scissors, LogOut, QrCode } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useBarbershop } from '../../contexts/BarbershopContext';

interface HeaderProps {
  onOpenProfile?: () => void;
  onOpenQr?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenProfile, onOpenQr }) => {
  const { currentRole, userProfile, isAuthenticated, logout } = useAuth();
  const { barbers, businessSettings, showToast } = useBarbershop();

  const handleLogout = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await logout();
    showToast('info', 'Sesión cerrada', 'Has cerrado sesión correctamente.');
  };

  return (
    <header 
      className="sticky top-0 z-40 w-full bg-[#0D0F12]/90 backdrop-blur-xl border-b border-white/10 px-3 sm:px-4 pb-3 transition-all"
      style={{
        paddingTop: 'max(env(safe-area-inset-top, 0px), 0.75rem)',
      }}
    >
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-2.5 sm:gap-3 cursor-pointer min-w-0 flex-1 sm:flex-initial" onClick={onOpenProfile}>
          {businessSettings.logoUrl ? (
            <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl overflow-hidden bg-[#12151B] border border-[#D4AF37]/40 shadow-lg shadow-[#D4AF37]/15 p-0.5 shrink-0">
              <img
                src={businessSettings.logoUrl}
                alt={businessSettings.name || 'Monarca Barber'}
                className="w-full h-full object-contain rounded-[10px]"
                referrerPolicy="no-referrer"
              />
            </div>
          ) : (
            <div className="relative flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#996515] p-[1px] shadow-lg shadow-[#D4AF37]/15 shrink-0">
              <div className="w-full h-full bg-[#12151B] rounded-[11px] flex items-center justify-center">
                <Crown className="w-5 h-5 text-[#D4AF37]" />
              </div>
            </div>
          )}

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-serif font-black tracking-wider text-sm sm:text-base text-white truncate">
                {businessSettings.name || 'MONARCA'}
              </span>
              <span className="text-[9px] sm:text-[10px] font-semibold tracking-widest uppercase bg-[#D4AF37]/20 text-[#D4AF37] px-1 sm:px-1.5 py-0.5 rounded border border-[#D4AF37]/30 shrink-0">
                BARBER
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate max-w-[140px] xs:max-w-[200px] sm:max-w-xs">
              {businessSettings.address.split(',')[0]}
            </p>
          </div>
        </div>

        {/* Right Actions: Role Badge (if Admin/Barber), WhatsApp Direct, User Avatar & Logout */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Active Role Badge (Only for Staff) */}
          {currentRole === 'admin' && (
            <span className="hidden md:flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-bold">
              <Shield className="w-3 h-3" />
              <span>Panel Admin</span>
            </span>
          )}

          {currentRole === 'barber' && (
            <span className="hidden md:flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/30 text-[#D4AF37] text-[11px] font-bold">
              <Scissors className="w-3 h-3" />
              <span>Panel Barbero</span>
            </span>
          )}

          {/* WhatsApp Direct */}
          {businessSettings.whatsapp && (
            <a
              href={`https://wa.me/${businessSettings.whatsapp.replace(/\+/g, '')}?text=Hola%20Monarca%20Barber,%20quisiera%20información.`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 sm:p-2 rounded-full bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all active:scale-95 shadow-sm shrink-0"
              title="Contacto directo por WhatsApp"
            >
              <MessageCircle className="w-4 h-4" />
            </a>
          )}

          {/* Quick QR Pass Button (when logged in) */}
          {isAuthenticated && userProfile && onOpenQr && (
            <button
              onClick={onOpenQr}
              className="flex items-center gap-1.5 p-1.5 sm:px-2.5 sm:py-1.5 rounded-full bg-[#14171E] hover:bg-[#1A1E27] border border-[#D4AF37]/60 text-[#D4AF37] text-xs font-bold transition-all active:scale-95 shadow-[0_0_12px_rgba(212,175,55,0.2)] shrink-0"
              title="Mostrar mi código QR y No. de Cliente"
            >
              <QrCode className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#D4AF37]" />
              <span className="hidden sm:inline font-mono tracking-wider">{userProfile.clientNumber ? `#${userProfile.clientNumber}` : 'Mi QR'}</span>
            </button>
          )}

          {/* User Avatar / Profile Access */}
          <button
            onClick={onOpenProfile}
            className="flex items-center gap-1.5 sm:gap-2 p-1 pl-1 pr-2 sm:pr-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/15 transition-all hover:border-[#D4AF37]/50 active:scale-95 shrink-0"
            title="Mi Perfil y Cuenta"
          >
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-slate-800 border border-white/20 overflow-hidden flex items-center justify-center shrink-0">
              {userProfile?.photoUrl ? (
                <img
                  src={userProfile.photoUrl}
                  alt={userProfile.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <User className="w-3.5 h-3.5 text-slate-300" />
              )}
            </div>
            <span className="text-xs font-semibold text-slate-200 max-w-[75px] sm:max-w-[90px] truncate hidden xs:inline-block">
              {isAuthenticated ? userProfile?.name?.split(' ')[0] : 'Ingresar'}
            </span>
          </button>

          {/* Logout Action (when logged in with ANY role) */}
          {isAuthenticated && (
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 p-1.5 sm:px-2.5 sm:py-1.5 rounded-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-bold transition-all active:scale-95 shrink-0"
              title="Cerrar Sesión"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
