import React from 'react';
import { Crown, X, Sparkles, Phone, User, Check, Copy } from 'lucide-react';
import { UserProfile } from '../../types';
import { useBarbershop } from '../../contexts/BarbershopContext';

interface ClientQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile | null;
}

export const ClientQRModal: React.FC<ClientQRModalProps> = ({
  isOpen,
  onClose,
  userProfile,
}) => {
  const { businessSettings, showToast } = useBarbershop();
  const [copied, setCopied] = React.useState(false);

  if (!isOpen || !userProfile) return null;

  const clientNumber = userProfile.clientNumber || '000000';
  const qrData = JSON.stringify({
    monarca_client_id: clientNumber,
    name: userProfile.name,
    phone: userProfile.phone,
    timestamp: new Date().toISOString(),
  });

  const handleCopyClientNumber = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(clientNumber);
      setCopied(true);
      showToast('success', 'Copiado', `Número de cliente ${clientNumber} copiado.`);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-[#161514]/55 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-3xl bg-[#FAF9F6] border border-[#9A6B3B]/45 p-5 sm:p-6 space-y-4 shadow-[0_24px_60px_rgba(22,21,20,0.22)] text-center relative animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-white hover:bg-[#F2EFE9] border border-[#E6E1D6] text-[#5C5852] hover:text-[#161514] transition-colors"
          title="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center justify-center pt-1 pb-1">
          {businessSettings?.logoUrl ? (
            <img
              src={businessSettings.logoUrl}
              alt="Logo"
              className="h-9 w-auto max-w-[140px] object-contain drop-shadow-[0_1px_2px_rgba(22,21,20,0.18)]"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="flex items-center gap-2 text-[#9A6B3B]">
              <Crown className="w-5 h-5" />
              <span className="font-display font-bold tracking-wider text-xl uppercase text-[#161514]">
                {businessSettings?.name || 'MONARCA'}
              </span>
            </div>
          )}
        </div>

        <div className="relative mx-auto max-w-[210px] sm:max-w-[220px] bg-white rounded-2xl p-3.5 border border-[#E6E1D6] shadow-sm">
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&margin=4&data=${encodeURIComponent(qrData)}`}
            alt={`QR Cliente ${clientNumber}`}
            className="w-full aspect-square object-contain block mx-auto select-none"
          />
        </div>

        <div className="space-y-1">
          <span className="text-[11px] text-[#5C5852] uppercase font-semibold tracking-widest block">
            Número de Cliente
          </span>
          <div className="flex items-center justify-center gap-2">
            <span className="font-mono text-2xl sm:text-3xl font-bold text-[#161514] tracking-[0.2em] tabular-nums">
              {clientNumber}
            </span>
            <button
              onClick={handleCopyClientNumber}
              className="p-2 rounded-xl bg-white hover:bg-[#F2EFE9] border border-[#E6E1D6] text-[#5C5852] hover:text-[#9A6B3B] transition-colors"
              title="Copiar número"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-700" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-[#E6E1D6] space-y-2 text-left">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#5C5852] flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#9A6B3B]" />
              Titular
            </span>
            <span className="font-display font-bold text-base text-[#161514] uppercase tracking-wide truncate max-w-[170px]">
              {userProfile.name}
            </span>
          </div>

          {userProfile.phone && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#5C5852] flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-[#9A6B3B]" />
                Celular
              </span>
              <span className="font-mono text-[#161514] font-medium tabular-nums">
                {userProfile.phone}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between text-xs pt-2 border-t border-[#E6E1D6]">
            <span className="text-[#5C5852] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#9A6B3B]" />
              Puntos Acumulados
            </span>
            <span className="font-bold text-[#9A6B3B] font-mono tabular-nums">
              {userProfile.points ?? 100} pts
            </span>
          </div>
        </div>

        <p className="text-[11px] text-[#5C5852] leading-relaxed px-2">
          Muestra este código al barbero en recepción para escanear tu visita y abonar tus puntos.
        </p>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-[#161514] hover:bg-[#2A2826] active:scale-[0.98] text-[#FAF9F6] font-bold text-xs transition-all"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
};
