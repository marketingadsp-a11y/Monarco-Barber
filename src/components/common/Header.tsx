import React from 'react';
import { Crown, User, MessageCircle, Shield, Scissors } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useBarbershop } from '../../contexts/BarbershopContext';

interface HeaderProps {
  onOpenProfile?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenProfile }) => {
  const { currentRole, userProfile, isAuthenticated } = useAuth();
  const { barbers, businessSettings } = useBarbershop();

  return (
    <header className="sticky top-0 z-40 w-full bg-[#0D0F12]/85 backdrop-blur-xl border-b border-white/10 px-4 py-3 transition-all">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={onOpenProfile}>
          {businessSettings.logoUrl ? (
            <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-[#12151B] border border-[#D4AF37]/40 shadow-lg shadow-[#D4AF37]/15 p-0.5">
              <img
                src={businessSettings.logoUrl}
                alt={businessSettings.name || 'Monarca Barber'}
                className="w-full h-full object-contain rounded-[10px]"
                referrerPolicy="no-referrer"
              />
            </div>
          ) : (
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#996515] p-[1px] shadow-lg shadow-[#D4AF37]/15">
              <div className="w-full h-full bg-[#12151B] rounded-[11px] flex items-center justify-center">
                <Crown className="w-5 h-5 text-[#D4AF37]" />
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-serif font-black tracking-wider text-base text-white">
                {businessSettings.name || 'MONARCA'}
              </span>
              <span className="text-[10px] font-semibold tracking-widest uppercase bg-[#D4AF37]/20 text-[#D4AF37] px-1.5 py-0.5 rounded border border-[#D4AF37]/30">
                BARBER
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium truncate max-w-[170px] sm:max-w-xs">
              {businessSettings.address.split(',')[0]}
            </p>
          </div>
        </div>

        {/* Right Actions: Role Badge (if Admin/Barber), WhatsApp Direct, & User Avatar */}
        <div className="flex items-center gap-2.5">
          {/* Active Role Badge (Only for Staff) */}
          {currentRole === 'admin' && (
            <span className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-bold">
              <Shield className="w-3 h-3" />
              <span>Panel Admin</span>
            </span>
          )}

          {currentRole === 'barber' && (
            <span className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/30 text-[#D4AF37] text-[11px] font-bold">
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
              className="p-2 rounded-full bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all active:scale-95 shadow-sm"
              title="Contacto directo por WhatsApp"
            >
              <MessageCircle className="w-4 h-4" />
            </a>
          )}

          {/* User Avatar / Profile Access */}
          <button
            onClick={onOpenProfile}
            className="flex items-center gap-2 p-1 pl-1 pr-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/15 transition-all hover:border-[#D4AF37]/50 active:scale-95"
            title="Mi Perfil y Cuenta"
          >
            <div className="w-7 h-7 rounded-full bg-slate-800 border border-white/20 overflow-hidden flex items-center justify-center">
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
            <span className="text-xs font-semibold text-slate-200 max-w-[90px] truncate hidden xs:inline-block">
              {isAuthenticated ? userProfile?.name?.split(' ')[0] : 'Ingresar'}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
