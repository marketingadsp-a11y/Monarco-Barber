import React from 'react';
import { CheckCircle2, AlertCircle, Info, X, Bell, Calendar, Clock, Sparkles } from 'lucide-react';
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
            ? 'border-[#D4AF37]/40 bg-[#161A22]/95 text-slate-100 shadow-[#D4AF37]/10 shadow-2xl ring-1 ring-[#D4AF37]/20'
            : isError
            ? 'border-rose-500/40 bg-rose-950/90 text-rose-100 shadow-rose-950/40 shadow-2xl ring-1 ring-rose-500/20'
            : isWarning
            ? 'border-amber-500/40 bg-[#1C1811]/95 text-amber-100 shadow-amber-950/40 shadow-2xl ring-1 ring-amber-500/20'
            : 'border-blue-500/40 bg-[#121824]/95 text-blue-100 shadow-blue-950/40 shadow-2xl ring-1 ring-blue-500/20';

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -24, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.88, y: -10, transition: { duration: 0.18 } }}
              className={`pointer-events-auto relative overflow-hidden flex items-start gap-3.5 p-4 rounded-2xl border backdrop-blur-2xl ${borderBg}`}
            >
              {/* Subtle gold accent light in the corner */}
              {isBooking && (
                <div className="absolute top-0 right-0 w-24 h-24 bg-[#D4AF37]/10 rounded-full blur-xl pointer-events-none" />
              )}

              {/* Icon */}
              <div className="mt-0.5 shrink-0 relative">
                {isBooking ? (
                  <div className="w-8 h-8 rounded-xl bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37]">
                    <Bell className="w-4 h-4 animate-bounce" />
                  </div>
                ) : isReminder ? (
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                    <Clock className="w-4 h-4" />
                  </div>
                ) : isSuccess ? (
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                ) : isError ? (
                  <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                    <Info className="w-4 h-4" />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pr-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-white leading-tight tracking-wide">
                    {toast.title}
                  </h4>
                  {isBooking && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30 uppercase tracking-wider">
                      En Vivo
                    </span>
                  )}
                </div>
                <p className="text-xs opacity-90 mt-1 text-slate-300 break-words font-normal leading-relaxed">
                  {toast.message}
                </p>
              </div>

              {/* Dismiss button */}
              <button
                onClick={() => removeToast(toast.id)}
                className="shrink-0 p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
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
