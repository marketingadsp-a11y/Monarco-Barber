import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Crown, Sparkles, ShieldCheck, QrCode as QrIcon, Wifi } from 'lucide-react';
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
        width: 340,
        margin: 1,
        color: {
          dark: '#0A0C10',
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
      {/* Outer Card Container with Luxury Metallic Gold Frame & Deep Obsidian Canvas */}
      <div className="relative w-full h-full rounded-2xl sm:rounded-3xl p-4 sm:p-5 overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.92)] border border-[#D4AF37]/50 bg-gradient-to-br from-[#1B202B] via-[#0E1117] to-[#07080B] flex flex-col justify-between group transition-all duration-300">
        
        {/* Golden Foil / Radial Sheen Backlight */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#D4AF37]/25 via-transparent to-transparent pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -right-12 -top-12 w-48 h-48 bg-[#D4AF37]/15 rounded-full blur-3xl pointer-events-none" />
        
        {/* Micro Guilloche Security Texture */}
        <div 
          className="absolute inset-0 opacity-[0.05] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(#D4AF37 1px, transparent 1px)`,
            backgroundSize: '14px 14px',
          }}
        />

        {/* 1. TOP HEADER: Logotipo, Monarca Branding & VIP Tier Badge */}
        <div className="relative z-10 flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            {/* LOGOTIPO OFICIAL O CORONA EMBLEM */}
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-[#F5D77F] via-[#D4AF37] to-[#8C6212] p-[1.5px] shadow-lg flex items-center justify-center shrink-0">
              <div className="w-full h-full bg-[#0D0F14] rounded-[10px] flex items-center justify-center overflow-hidden">
                {businessSettings?.logoUrl ? (
                  <img
                    src={businessSettings.logoUrl}
                    alt={businessSettings?.name || 'Monarca'}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <Crown className="w-5 h-5 text-[#D4AF37]" />
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-serif font-black tracking-widest text-xs sm:text-sm text-white drop-shadow">
                  {businessSettings?.name || 'MONARCA'}
                </span>
                <span className="text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40 tracking-wider">
                  BARBER
                </span>
              </div>
              <p className="text-[8px] sm:text-[9px] text-[#D4AF37]/80 font-medium tracking-widest uppercase mt-0.5">
                Tarjeta de Membresía Digital
              </p>
            </div>
          </div>

          {/* CONTACTLESS ICON & TIER */}
          <div className="flex items-center gap-2">
            <Wifi className="w-4 h-4 text-[#D4AF37]/80 rotate-90" />
            <div className="flex items-center gap-1 bg-gradient-to-r from-[#D4AF37]/25 to-[#996515]/25 border border-[#D4AF37]/50 px-2 py-0.5 rounded-full shadow-inner">
              <Sparkles className="w-2.5 h-2.5 text-[#D4AF37]" />
              <span className="text-[9px] sm:text-[10px] font-black text-[#D4AF37] tracking-wider uppercase">
                {tier}
              </span>
            </div>
          </div>
        </div>

        {/* 2. MIDDLE ROW: Metallic Smart Chip + Prestigious QR Code */}
        <div className="relative z-10 flex items-center justify-between my-auto py-1">
          {/* Metallic EMV Chip */}
          <div className="flex flex-col gap-1">
            <div className="w-11 h-8 sm:w-12 sm:h-9 rounded-md bg-gradient-to-br from-[#F5D77F] via-[#D4AF37] to-[#8C6212] p-[1.5px] shadow-md">
              <div className="w-full h-full rounded-[4px] bg-[#241E10] border border-[#E5C158]/50 grid grid-cols-3 grid-rows-2 gap-[2px] p-1">
                <div className="border-r border-b border-[#D4AF37]/60 rounded-tl-sm"></div>
                <div className="border-b border-[#D4AF37]/60"></div>
                <div className="border-l border-b border-[#D4AF37]/60 rounded-tr-sm"></div>
                <div className="border-r border-[#D4AF37]/60 rounded-bl-sm"></div>
                <div></div>
                <div className="border-l border-[#D4AF37]/60 rounded-br-sm"></div>
              </div>
            </div>
            <span className="text-[7px] font-mono tracking-widest text-[#D4AF37]/70 uppercase">
              CLIENT PASS
            </span>
          </div>

          {/* Luxury Framed QR Code */}
          <div className="flex items-center gap-2 bg-[#090B0E]/90 border border-[#D4AF37]/60 rounded-2xl p-1.5 shadow-[0_8px_20px_rgba(0,0,0,0.8)] backdrop-blur-md">
            {qrCodeUrl ? (
              <img
                src={qrCodeUrl}
                alt={`QR Cliente ${clientNumber}`}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-white p-0.5 object-contain"
              />
            ) : (
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-white/10 flex items-center justify-center">
                <QrIcon className="w-6 h-6 text-[#D4AF37]" />
              </div>
            )}
          </div>
        </div>

        {/* 3. BOTTOM ROW: Number of Client & Name of Client */}
        <div className="relative z-10 space-y-1 sm:space-y-1.5">
          {/* Embossed Client Number */}
          <div className="flex items-baseline justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[8px] sm:text-[9px] font-bold text-[#D4AF37] uppercase tracking-widest">
                NO. CLIENTE:
              </span>
              <span className="font-mono text-base sm:text-lg font-black tracking-[0.25em] text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                #{formattedClientNumber}
              </span>
            </div>

            {showDetails && (
              <div className="text-right">
                <span className="text-[7px] sm:text-[8px] font-semibold text-slate-400 uppercase tracking-wider block">
                  MIEMBRO DESDE
                </span>
                <span className="text-[10px] sm:text-xs font-bold text-amber-200">
                  {memberYear}
                </span>
              </div>
            )}
          </div>

          {/* Client Full Name (Titular) & Points */}
          <div className="flex items-end justify-between border-t border-white/10 pt-1.5">
            <div className="min-w-0 pr-2">
              <span className="text-[7px] sm:text-[8px] font-semibold text-slate-400 uppercase tracking-widest block">
                TITULAR
              </span>
              <p className="font-serif font-black text-xs sm:text-sm text-slate-100 uppercase tracking-wider truncate">
                {name || 'CLIENTE MONARCA'}
              </p>
            </div>

            {showDetails && points !== undefined && (
              <div className="flex items-center gap-1 bg-[#D4AF37]/15 border border-[#D4AF37]/40 px-2 py-0.5 rounded-md shrink-0">
                <ShieldCheck className="w-3 h-3 text-[#D4AF37]" />
                <span className="text-[9px] sm:text-[10px] font-black text-[#D4AF37]">
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

