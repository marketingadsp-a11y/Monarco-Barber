import React from 'react';
import { Crown, User, MessageCircle, LogOut, QrCode, ScanLine } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useBarbershop } from '../../contexts/BarbershopContext';

interface HeaderProps {
  onOpenProfile?: () => void;
  onOpenQr?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenProfile, onOpenQr }) => {
  const { currentRole, userProfile, isAuthenticated, logout } = useAuth();
  const { businessSettings, showToast } = useBarbershop();

  const handleLogout = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await logout();
    showToast('info', 'Sesión cerrada', 'Has cerrado sesión correctamente.');
  };

  return (
    <div className="sticky top-0 z-40 w-full flex flex-col">
      {/* Header superior vacío adaptado al modo claro */}
      <div
        className="w-full bg-[#F2EFE9]/95 backdrop-blur-md border-b border-[#E6E1D6]"
        style={{
          height: '44px',
          paddingTop: 'env(safe-area-inset-top, 0px)',
        }}
      />

      <header
        className="w-full bg-[#FAF9F6]/92 backdrop-blur-xl border-b border-[#E6E1D6] px-3 sm:px-6 pb-3 transition-all"
        style={{
          paddingTop: '0.75rem',
        }}
      >
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          {/* Brand Logo */}
          <div className="flex items-center cursor-pointer shrink-0" onClick={onOpenProfile}>
            {businessSettings.logoUrl ? (
              <img
                src={businessSettings.logoUrl}
                alt={businessSettings.name || 'Monarca Barber'}
                className="h-10 sm:h-11 w-auto max-w-[180px] sm:max-w-[230px] object-contain select-none transition-transform hover:scale-[1.02] drop-shadow-[0_1px_2px_rgba(22,21,20,0.18)]"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-[#9A6B3B]" />
                <span className="font-display font-bold tracking-wider text-xl uppercase text-[#161514] whitespace-nowrap shrink-0">
                  {businessSettings.name || 'MONARCA BARBER'}
                </span>
              </div>
            )}
          </div>

          {/* Right Actions: WhatsApp Direct, QR, User Avatar & Logout */}
          <div className="flex items-center gap-2 shrink-0">
            {businessSettings.whatsapp && (
              <a
                href={`https://wa.me/${businessSettings.whatsapp.replace(/\+/g, '')}?text=Hola%20Monarca%20Barber,%20quisiera%20información.`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-xl bg-white text-emerald-700 hover:bg-emerald-50 border border-[#E6E1D6] hover:border-emerald-300 transition-colors active:scale-95 shrink-0"
                title="Contacto directo por WhatsApp"
              >
                <MessageCircle className="w-4 h-4" />
              </a>
            )}

            {isAuthenticated && userProfile && onOpenQr && (
              <button
                onClick={onOpenQr}
                className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-white hover:bg-[#F7F5F0] border border-[#9A6B3B]/45 text-[#161514] text-xs font-semibold transition-all active:scale-95 shrink-0 whitespace-nowrap"
                title={
                  currentRole === 'barber' || currentRole === 'admin'
                    ? 'Lector QR de Clientes'
                    : 'Mostrar mi pase VIP y No. de Cliente'
                }
              >
                {currentRole === 'barber' || currentRole === 'admin' ? (
                  <>
                    <ScanLine className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#9A6B3B]" />
                    <span className="hidden sm:inline">Lector QR</span>
                  </>
                ) : (
                  <>
                    <QrCode className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#9A6B3B]" />
                    <span className="hidden sm:inline font-mono tabular-nums tracking-wider">
                      {userProfile.clientNumber ? `#${userProfile.clientNumber}` : 'Mi QR'}
                    </span>
                  </>
                )}
              </button>
            )}

            <button
              onClick={onOpenProfile}
              className="flex items-center gap-2 p-1 pl-1 pr-2.5 rounded-xl bg-white hover:bg-[#F7F5F0] border border-[#E6E1D6] hover:border-[#9A6B3B]/50 transition-all active:scale-95 shrink-0 whitespace-nowrap"
              title="Mi Perfil y Cuenta"
            >
              <div className="w-7 h-7 rounded-lg bg-[#F2EFE9] border border-[#E6E1D6] overflow-hidden flex items-center justify-center shrink-0">
                {userProfile?.photoUrl ? (
                  <img
                    src={userProfile.photoUrl}
                    alt={userProfile.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <User className="w-3.5 h-3.5 text-[#5C5852]" />
                )}
              </div>
              <span className="text-xs font-semibold text-[#161514] max-w-[75px] sm:max-w-[100px] truncate hidden xs:inline-block">
                {isAuthenticated ? userProfile?.name?.split(' ')[0] : 'Ingresar'}
              </span>
            </button>

            {isAuthenticated && (
              <button
                onClick={handleLogout}
                className="flex items-center gap-1 p-2 sm:px-2.5 sm:py-2 rounded-xl bg-white hover:bg-rose-50 text-rose-700 border border-[#E6E1D6] hover:border-rose-200 text-xs font-semibold transition-all active:scale-95 shrink-0 whitespace-nowrap"
                title="Cerrar Sesión"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Salir</span>
              </button>
            )}
          </div>
        </div>
      </header>
    </div>
  );
};
