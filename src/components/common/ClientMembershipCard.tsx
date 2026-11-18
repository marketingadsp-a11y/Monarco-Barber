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
          dark: '#161514',
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
      {/* Editorial Atelier Paper & Bronze Card */}
      <div className="relative w-full h-full rounded-2xl sm:rounded-3xl p-5 sm:p-6 overflow-hidden shadow-[0_14px_34px_rgba(22,21,20,0.10)] border border-[#9A6B3B]/45 bg-gradient-to-br from-[#FFFFFF] via-[#FAF7F0] to-[#F1ECE1] flex flex-col justify-between group transition-all duration-300">
        {/* Subtle inset editorial frame */}
        <div className="absolute inset-2.5 rounded-xl sm:rounded-2xl border border-[#E6E1D6] pointer-events-none" />

        {/* 1. TOP ROW: Logo & Editorial Marker */}
        <div className="relative z-10 flex items-center justify-between px-1 pt-0.5">
          <div className="flex items-center">
            {businessSettings?.logoUrl ? (
              <img
                src={businessSettings.logoUrl}
                alt="Logo"
                className="h-9 sm:h-10 w-auto max-w-[140px] object-contain drop-shadow-[0_1px_2px_rgba(22,21,20,0.2)]"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex items-center gap-2">
                <Crown className="w-6 h-6 text-[#9A6B3B]" />
                <span className="font-display text-lg font-bold tracking-wider uppercase text-[#161514]">
                  {businessSettings?.name || 'MONARCA'}
                </span>
              </div>
            )}
          </div>
          <span className="font-display text-xs font-semibold uppercase tracking-[0.22em] text-[#9A6B3B]">
            Socio Atelier
          </span>
        </div>

        {/* 2. BODY: Details Left & Crisp QR Right */}
        <div className="relative z-10 flex items-end justify-between gap-4 mt-auto px-1 pb-0.5">
          <div className="min-w-0 flex-1 space-y-2.5">
            <div>
              <span className="text-[9px] uppercase font-semibold text-[#9A6B3B] tracking-[0.18em] block">
                No. Cliente
              </span>
              <p className="font-mono text-lg sm:text-2xl font-bold tracking-[0.16em] text-[#161514] tabular-nums mt-0.5">
                #{formattedClientNumber}
              </p>
            </div>

            <div className="min-w-0 pr-2">
              <span className="text-[8px] uppercase font-semibold text-[#5C5852] tracking-[0.18em] block">
                Titular
              </span>
              <p className="font-display font-bold text-base sm:text-lg text-[#161514] uppercase tracking-wider truncate mt-0.5">
                {name || 'Cliente'}
              </p>
            </div>
          </div>

          <div className="shrink-0">
            <div className="bg-white p-1.5 rounded-xl border border-[#E6E1D6] shadow-sm">
              {qrCodeUrl ? (
                <img
                  src={qrCodeUrl}
                  alt={`QR Cliente ${clientNumber}`}
                  className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-lg"
                />
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#F2EFE9] rounded-lg flex items-center justify-center">
                  <QrIcon className="w-8 h-8 text-[#9A6B3B]" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
