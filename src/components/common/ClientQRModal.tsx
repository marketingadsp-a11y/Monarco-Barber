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
      className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-[28px] bg-gradient-to-b from-[#161A22] to-[#0E1015] border-2 border-[#D4AF37] p-5 sm:p-6 space-y-4 shadow-[0_20px_60px_rgba(212,175,55,0.25)] text-center relative animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
          title="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Top Header */}
        <div className="flex items-center justify-center pt-1 pb-1">
          {businessSettings?.logoUrl ? (
            <img
              src={businessSettings.logoUrl}
              alt="Logo"
              className="h-9 w-auto max-w-[140px] object-contain"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="flex items-center gap-2 text-[#D4AF37]">
              <Crown className="w-5 h-5" />
              <span className="font-serif font-black tracking-wider text-sm text-white">
                {businessSettings?.name || 'MONARCA'}
              </span>
            </div>
          )}
        </div>

        {/* High Contrast QR Container */}
        <div className="relative mx-auto max-w-[210px] sm:max-w-[220px] bg-white rounded-2xl p-3.5 shadow-2xl border-2 border-[#D4AF37]/30">
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&margin=4&data=${encodeURIComponent(qrData)}`}
            alt={`QR Cliente ${clientNumber}`}
            className="w-full aspect-square object-contain block mx-auto select-none"
          />
        </div>

        {/* Client Number Highlight */}
        <div className="space-y-1.5">
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest block">
            Número de Cliente
          </span>
          <div className="flex items-center justify-center gap-2">
            <span className="font-mono text-2xl sm:text-3xl font-black text-[#D4AF37] tracking-[0.25em]">
              {clientNumber}
            </span>
            <button
              onClick={handleCopyClientNumber}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-[#D4AF37] transition-colors"
              title="Copiar número"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* User Details & Points */}
        <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1 text-left">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-[#D4AF37]" />
              Titular:
            </span>
            <span className="font-bold text-white font-serif truncate max-w-[170px]">
              {userProfile.name}
            </span>
          </div>

          {userProfile.phone && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-[#D4AF37]" />
                Celular:
              </span>
              <span className="font-mono text-slate-300 font-medium">
                {userProfile.phone}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between text-xs pt-1 border-t border-white/5">
            <span className="text-slate-400 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
              Puntos Acumulados:
            </span>
            <span className="font-bold text-[#D4AF37] font-mono">
              {userProfile.points ?? 100} pts
            </span>
          </div>
        </div>

        {/* Helpful instructions */}
        <p className="text-[11px] text-slate-400 leading-tight px-2">
          Muestra este código al barbero en recepción para escanear tu visita y abonar tus puntos.
        </p>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full py-3 rounded-2xl bg-white/10 hover:bg-white/15 active:scale-95 text-white font-bold text-xs transition-all"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
};
