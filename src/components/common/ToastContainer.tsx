import React from 'react';
import { CheckCircle2, AlertCircle, Info, X, Bell, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useBarbershop } from '../../contexts/BarbershopContext';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useBarbershop();

  return (
    <div className="fixed top-4 sm:top-6 right-3 sm:right-6 z-[9999] flex flex-col gap-2.5 max-w-sm sm:max-w-md w-[calc(100%-1.5rem)] pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => {
          const isSuccess = toast.type === 'success';
          const isError = toast.type === 'error';
          const isWarning = toast.type === 'warning';

          const isBooking = toast.title.includes('Nueva Cita') || toast.title.includes('Confirmada');
          const isReminder = toast.title.includes('Recordatorio') || toast.title.includes('Horas');

          const borderBg = isSuccess
            ? 'border-[#9A6B3B]/40 bg-white/95 text-[#161514] shadow-[0_12px_32px_rgba(22,21,20,0.12)]'
            : isError
            ? 'border-rose-300 bg-white/95 text-[#161514] shadow-[0_12px_32px_rgba(185,28,28,0.12)]'
            : isWarning
            ? 'border-amber-300 bg-white/95 text-[#161514] shadow-[0_12px_32px_rgba(180,83,9,0.12)]'
            : 'border-[#D2CBBF] bg-white/95 text-[#161514] shadow-[0_12px_32px_rgba(22,21,20,0.10)]';

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, y: -8, transition: { duration: 0.16 } }}
              className={`pointer-events-auto relative overflow-hidden flex items-start gap-3.5 p-4 rounded-2xl border backdrop-blur-xl ${borderBg}`}
            >
              <div className="mt-0.5 shrink-0 relative">
                {isBooking ? (
                  <div className="w-8 h-8 rounded-xl bg-[#F2EFE9] border border-[#9A6B3B]/35 flex items-center justify-center text-[#9A6B3B]">
                    <Bell className="w-4 h-4" />
                  </div>
                ) : isReminder ? (
                  <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                    <Clock className="w-4 h-4" />
                  </div>
                ) : isSuccess ? (
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                ) : isError ? (
                  <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-700">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-xl bg-[#F2EFE9] border border-[#E6E1D6] flex items-center justify-center text-[#161514]">
                    <Info className="w-4 h-4" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0 pr-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-[#161514] leading-tight tracking-wide">
                    {toast.title}
                  </h4>
                  {isBooking && (
                    <span className="text-[10px] font-semibold text-[#9A6B3B] uppercase tracking-wider">
                      · En Vivo
                    </span>
                  )}
                </div>
                <p className="text-xs mt-1 text-[#5C5852] break-words font-normal leading-relaxed">
                  {toast.message}
                </p>
              </div>

              <button
                onClick={() => removeToast(toast.id)}
                className="shrink-0 p-1.5 text-[#5C5852] hover:text-[#161514] rounded-xl hover:bg-[#F2EFE9] transition-colors"
                title="Cerrar notificación"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
