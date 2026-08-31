import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Crown, QrCode as QrIcon } from 'lucide-react';
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
  clientNumber,
  className = '',
}) => {
  const { businessSettings } = useBarbershop();
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  // Format 6-digit client number: "123 456"
  const formattedClientNumber = clientNumber
    ? `${clientNumber.slice(0, 3)} ${clientNumber.slice(3, 6)}`
    : '000 000';

  useEffect(() => {
    if (clientNumber) {
      const qrPayload = JSON.stringify({
        monarca_client_id: clientNumber,
        type: 'monarca_membership_card',
        v: 1,
      });

      QRCode.toDataURL(qrPayload, {
        width: 360,
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
      {/* Luxury Obsidian Card Container */}
      <div className="relative w-full h-full rounded-2xl sm:rounded-3xl p-5 sm:p-6 overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.9)] border border-[#D4AF37]/35 bg-gradient-to-br from-[#181C24] via-[#0E1015] to-[#060709] flex flex-col justify-between group transition-all duration-300">
        
        {/* Subtle Ambient Golden Sheen */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-[#D4AF37]/15 via-transparent to-transparent pointer-events-none" />
        <div className="absolute -right-10 -bottom-10 w-44 h-44 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none" />
        
        {/* Micro Texture */}
        <div 
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(#D4AF37 1px, transparent 1px)`,
            backgroundSize: '16px 16px',
          }}
        />

        {/* 1. TOP ROW: Logotipo sin fondo ni contornos */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center">
            {businessSettings?.logoUrl ? (
              <img
                src={businessSettings.logoUrl}
                alt="Logo"
                className="h-9 sm:h-11 w-auto max-w-[150px] object-contain filter drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]"
                referrerPolicy="no-referrer"
              />
            ) : (
              <Crown className="w-8 h-8 text-[#D4AF37] filter drop-shadow-[0_2px_6px_rgba(212,175,55,0.4)]" />
            )}
          </div>
        </div>

        {/* 2. BODY: Datos a la izquierda y Código QR nítido a la derecha */}
        <div className="relative z-10 flex items-center justify-between gap-4 mt-auto">
          {/* Client Details (Número y Nombre) */}
          <div className="min-w-0 flex-1 space-y-3">
            <div>
              <span className="text-[8px] sm:text-[9px] uppercase font-bold text-[#D4AF37] tracking-[0.2em] block">
                No. Cliente
              </span>
              <p className="font-mono text-lg sm:text-2xl font-black tracking-[0.2em] text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] mt-0.5">
                #{formattedClientNumber}
              </p>
            </div>

            <div className="min-w-0 pr-2">
              <span className="text-[7px] sm:text-[8px] uppercase font-bold text-slate-400 tracking-[0.2em] block">
                Titular
              </span>
              <p className="font-serif font-bold text-xs sm:text-sm text-slate-100 uppercase tracking-wider truncate mt-0.5">
                {name || 'Cliente'}
              </p>
            </div>
          </div>

          {/* Clean Frameless-feel QR Box */}
          <div className="shrink-0">
            <div className="bg-white p-1.5 rounded-xl shadow-[0_8px_25px_rgba(0,0,0,0.7)]">
              {qrCodeUrl ? (
                <img
                  src={qrCodeUrl}
                  alt={`QR Cliente ${clientNumber}`}
                  className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-lg"
                />
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-900 rounded-lg flex items-center justify-center">
                  <QrIcon className="w-8 h-8 text-[#D4AF37]" />
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};


