import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Crown, Sparkles, ShieldCheck, QrCode as QrIcon, Wifi, CreditCard } from 'lucide-react';
import { useBarbershop } from '../../contexts/BarbershopContext';

interface ClientMembershipCardProps {
  name: string;
  phone?: string;
  clientNumber: string;
  tier?: string;
  memberSince?: string;
  points?: number;
  className?: string;
  showDetails?: boolean;
}

export const ClientMembershipCard: React.FC<ClientMembershipCardProps> = ({
  name,
  phone,
  clientNumber,
  tier = 'VIP CLUB',
  memberSince,
  points = 100,
  className = '',
  showDetails = true,
}) => {
  const { businessSettings } = useBarbershop();
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  // Format 6-digit client number nicely: "123 456"
  const formattedClientNumber = clientNumber
    ? `${clientNumber.slice(0, 3)} ${clientNumber.slice(3, 6)}`
    : '000 000';

  const memberYear = memberSince
    ? new Date(memberSince).getFullYear()
    : new Date().getFullYear();

  useEffect(() => {
    if (clientNumber) {
      // Generate clean high-res QR code
      const qrPayload = JSON.stringify({
        monarca_client_id: clientNumber,
        type: 'monarca_membership_card',
        v: 1,
      });

      QRCode.toDataURL(qrPayload, {
        width: 320,
        margin: 1,
        color: {
          dark: '#0D0F12',
          light: '#FFFFFF',
        },
        errorCorrectionLevel: 'M',
      })
        .then((url) => setQrCodeUrl(url))
        .catch((err) => console.warn('QR Code generation error:', err));
    }
  }, [clientNumber]);

  return (
    <div className={`relative w-full max-w-sm sm:max-w-md mx-auto aspect-[1.586/1] select-none ${className}`}>
      {/* Outer Card Container with Bank Card Proportions & Premium Texture */}
      <div className="relative w-full h-full rounded-2xl sm:rounded-3xl p-4 sm:p-5 overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.85)] border border-[#D4AF37]/50 bg-gradient-to-br from-[#1C212A] via-[#101318] to-[#07080A] flex flex-col justify-between group transition-all duration-300">
        
        {/* Hologram / Golden Foil Light Reflection */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#D4AF37]/20 via-transparent to-transparent pointer-events-none" />
        <div className="absolute -right-16 -bottom-16 w-56 h-56 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none" />
        
        {/* Subtle Guilloche Grid Lines for Bank Card Security Aesthetic */}
        <div 
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(#D4AF37 1px, transparent 1px)`,
            backgroundSize: '12px 12px',
          }}
        />

        {/* TOP BAR: Logo, Chip, Contactless Wave, Tier */}
        <div className="relative z-10 flex items-start justify-between">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#996515] p-0.5 shadow-md flex items-center justify-center">
              <div className="w-full h-full bg-[#0D0F12] rounded-[10px] flex items-center justify-center">
                <Crown className="w-4 h-4 text-[#D4AF37]" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-serif font-black tracking-widest text-xs sm:text-sm text-white">
                  {businessSettings?.name || 'MONARCA'}
                </span>
                <span className="text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40 tracking-wider">
                  BARBER
                </span>
              </div>
              <p className="text-[8px] sm:text-[9px] text-amber-200/60 font-semibold tracking-widest uppercase">
                Membresía Exclusiva
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Wifi className="w-4 h-4 text-[#D4AF37]/70 rotate-90" />
            <div className="flex items-center gap-1 bg-gradient-to-r from-[#D4AF37]/30 to-[#996515]/30 border border-[#D4AF37]/60 px-2 py-0.5 rounded-full shadow-inner">
              <Sparkles className="w-2.5 h-2.5 text-[#D4AF37]" />
              <span className="text-[9px] sm:text-[10px] font-black text-[#D4AF37] tracking-wider uppercase">
                {tier}
              </span>
            </div>
          </div>
        </div>

        {/* MIDDLE ROW: Smart Chip & QR Code */}
        <div className="relative z-10 flex items-center justify-between my-auto py-1">
          {/* Metallic EMV Smart Card Chip */}
          <div className="flex flex-col gap-1">
            <div className="w-10 h-8 sm:w-12 sm:h-9 rounded-md bg-gradient-to-br from-[#F5D77F] via-[#D4AF37] to-[#8C6212] p-[1.5px] shadow-md">
              <div className="w-full h-full rounded-[4px] bg-[#2A2312] border border-[#E5C158]/40 grid grid-cols-3 grid-rows-2 gap-[2px] p-1">
                <div className="border-r border-b border-[#D4AF37]/50 rounded-tl-sm"></div>
                <div className="border-b border-[#D4AF37]/50"></div>
                <div className="border-l border-b border-[#D4AF37]/50 rounded-tr-sm"></div>
                <div className="border-r border-[#D4AF37]/50 rounded-bl-sm"></div>
                <div></div>
                <div className="border-l border-[#D4AF37]/50 rounded-br-sm"></div>
              </div>
            </div>
            <span className="text-[7px] font-mono tracking-widest text-slate-400 uppercase">
              CLIENT PASS
            </span>
          </div>

          {/* Luxury QR Code on Golden Badge */}
          <div className="flex items-center gap-2 bg-[#0D0F12]/80 border border-[#D4AF37]/60 rounded-xl p-1.5 shadow-lg backdrop-blur-md">
            {qrCodeUrl ? (
              <img
                src={qrCodeUrl}
                alt={`QR Cliente ${clientNumber}`}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg bg-white p-0.5 object-contain"
              />
            ) : (
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg bg-white/10 flex items-center justify-center">
                <QrIcon className="w-6 h-6 text-[#D4AF37]" />
              </div>
            )}
          </div>
        </div>

        {/* BOTTOM ROW: Client Number, Name, Member Since */}
        <div className="relative z-10 space-y-1 sm:space-y-1.5">
          {/* Embossed Client Number */}
          <div className="flex items-baseline justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[8px] sm:text-[9px] font-bold text-[#D4AF37]/80 uppercase tracking-widest">
                NO. CLIENTE:
              </span>
              <span className="font-mono text-base sm:text-lg font-black tracking-[0.25em] text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                {formattedClientNumber}
              </span>
            </div>

            {showDetails && (
              <div className="text-right">
                <span className="text-[8px] sm:text-[9px] font-semibold text-slate-400 uppercase tracking-wider block">
                  DESDE
                </span>
                <span className="text-[10px] sm:text-xs font-bold text-amber-200">
                  {memberYear}
                </span>
              </div>
            )}
          </div>

          {/* Client Full Name & Points */}
          <div className="flex items-end justify-between border-t border-white/10 pt-1.5">
            <div className="min-w-0 pr-2">
              <span className="text-[7px] sm:text-[8px] font-medium text-slate-400 uppercase tracking-widest block">
                TITULAR
              </span>
              <p className="font-serif font-bold text-xs sm:text-sm text-slate-100 uppercase tracking-wider truncate">
                {name || 'CLIENTE MONARCA'}
              </p>
            </div>

            {showDetails && points !== undefined && (
              <div className="flex items-center gap-1 bg-[#D4AF37]/15 border border-[#D4AF37]/30 px-2 py-0.5 rounded-md shrink-0">
                <ShieldCheck className="w-3 h-3 text-[#D4AF37]" />
                <span className="text-[9px] sm:text-[10px] font-extrabold text-[#D4AF37]">
                  {points} pts
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
