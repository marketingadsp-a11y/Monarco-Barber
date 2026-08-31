import React from 'react';
import { Crown, User, MessageCircle, Shield, Scissors, LogOut, QrCode, ScanLine } from 'lucide-react';
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
        {/* Brand Logo (Solo logotipo sin fondos ni contornos) */}
        <div className="flex items-center cursor-pointer shrink-0" onClick={onOpenProfile}>
          {businessSettings.logoUrl ? (
            <img
              src={businessSettings.logoUrl}
              alt={businessSettings.name || 'Monarca Barber'}
              className="h-10 sm:h-12 w-auto max-w-[180px] sm:max-w-[240px] object-contain select-none transition-transform hover:scale-105"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="flex items-center gap-2">
              <Crown className="w-6 h-6 text-[#D4AF37]" />
              <span className="font-serif font-black tracking-wider text-base text-white">
                {businessSettings.name || 'MONARCA BARBER'}
              </span>
            </div>
          )}
        </div>

        {/* Right Actions: WhatsApp Direct, User Avatar & Logout */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
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

          {/* Quick QR Pass Button (for Client) or QR Scanner (for Barber/Admin) */}
          {isAuthenticated && userProfile && onOpenQr && (
            <button
              onClick={onOpenQr}
              className="flex items-center gap-1.5 p-1.5 sm:px-2.5 sm:py-1.5 rounded-full bg-[#14171E] hover:bg-[#1A1E27] border border-[#D4AF37]/60 text-[#D4AF37] text-xs font-bold transition-all active:scale-95 shadow-[0_0_12px_rgba(212,175,55,0.2)] shrink-0"
              title={currentRole === 'barber' || currentRole === 'admin' ? "Lector QR de Clientes" : "Mostrar mi pase VIP y No. de Cliente"}
            >
              {currentRole === 'barber' || currentRole === 'admin' ? (
                <>
                  <ScanLine className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#D4AF37]" />
                  <span className="hidden sm:inline font-bold">Lector QR</span>
                </>
              ) : (
                <>
                  <QrCode className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#D4AF37]" />
                  <span className="hidden sm:inline font-mono tracking-wider">{userProfile.clientNumber ? `#${userProfile.clientNumber}` : 'Mi QR'}</span>
                </>
              )}
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
