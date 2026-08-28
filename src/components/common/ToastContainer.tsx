import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useBarbershop } from '../../contexts/BarbershopContext';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useBarbershop();

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-[calc(100%-2rem)] pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => {
          const isSuccess = toast.type === 'success';
          const isError = toast.type === 'error';
          const isWarning = toast.type === 'warning';

          const borderBg = isSuccess
            ? 'border-emerald-500/30 bg-emerald-950/80 text-emerald-100'
            : isError
            ? 'border-rose-500/30 bg-rose-950/80 text-rose-100'
            : isWarning
            ? 'border-amber-500/30 bg-amber-950/80 text-amber-100'
            : 'border-[#D4AF37]/30 bg-[#1A1D24]/90 text-slate-100';

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl border backdrop-blur-2xl shadow-2xl ${borderBg}`}
            >
              <div className="mt-0.5 shrink-0">
                {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                {isError && <AlertCircle className="w-5 h-5 text-rose-400" />}
                {isWarning && <AlertCircle className="w-5 h-5 text-amber-400" />}
                {!isSuccess && !isError && !isWarning && <Info className="w-5 h-5 text-[#D4AF37]" />}
              </div>

              <div className="flex-1 min-w-0 pr-1">
                <h4 className="text-xs font-bold leading-tight tracking-wide">{toast.title}</h4>
                <p className="text-xs opacity-90 mt-0.5 break-words font-normal leading-relaxed">
                  {toast.message}
                </p>
              </div>

              <button
                onClick={() => removeToast(toast.id)}
                className="shrink-0 p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
