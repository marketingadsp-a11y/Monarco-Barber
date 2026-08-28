import React, { useState, useEffect } from 'react';
import { Download, Share2, PlusSquare, X, Smartphone, Sparkles, CheckCircle2 } from 'lucide-react';
import { useBarbershop } from '../../contexts/BarbershopContext';

export const PWAInstallPrompt: React.FC = () => {
  const { businessSettings } = useBarbershop();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    // 1. Detect if already running in standalone mode (installed PWA)
    const checkIsStandalone = () => {
      const isStandaloneMedia = window.matchMedia('(display-mode: standalone)').matches;
      const isIOSStandalone = (window.navigator as any).standalone === true;
      const isAndroidApp = document.referrer.includes('android-app://');
      const isStoredInstalled = localStorage.getItem('monarca_pwa_installed') === 'true';

      return isStandaloneMedia || isIOSStandalone || isAndroidApp || isStoredInstalled;
    };

    if (checkIsStandalone()) {
      setIsInstalled(true);
      return; // Already installed, NEVER show modal
    }

    // 2. Detect iOS device
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isAppleDevice);

    // 3. Listen for Android/Chrome/Desktop beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);

      // Check if user dismissed it recently in this session (e.g. in last 12 hours)
      const lastDismissed = localStorage.getItem('monarca_pwa_dismissed_time');
      const twelveHours = 12 * 60 * 60 * 1000;
      if (!lastDismissed || Date.now() - Number(lastDismissed) > twelveHours) {
        // Show after a brief pleasant delay (1.5 seconds)
        const timer = setTimeout(() => {
          setIsOpen(true);
        }, 1500);
        return () => clearTimeout(timer);
      }
    };

    // 4. Listen for successful install event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsOpen(false);
      setDeferredPrompt(null);
      localStorage.setItem('monarca_pwa_installed', 'true');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // If iOS Safari, prompt after delay if not dismissed recently
    if (isAppleDevice) {
      const lastDismissed = localStorage.getItem('monarca_pwa_dismissed_time');
      const twelveHours = 12 * 60 * 60 * 1000;
      if (!lastDismissed || Date.now() - Number(lastDismissed) > twelveHours) {
        const timer = setTimeout(() => {
          setIsOpen(true);
        }, 2500);
        return () => clearTimeout(timer);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // If already installed or closed, do not render modal
  if (isInstalled || !isOpen) {
    return null;
  }

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        localStorage.setItem('monarca_pwa_installed', 'true');
      }
      setDeferredPrompt(null);
      setIsOpen(false);
    } else if (isIOS) {
      setShowIOSInstructions(true);
    } else {
      setShowIOSInstructions(true);
    }
  };

  const handleDismiss = () => {
    setIsOpen(false);
    localStorage.setItem('monarca_pwa_dismissed_time', Date.now().toString());
  };

  const appName = businessSettings?.name || 'MONARCA BARBER';
  const logoUrl = businessSettings?.logoUrl || '/icon.svg';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div 
        className="relative w-full max-w-md bg-gradient-to-b from-[#181C24] to-[#0D0F12] border border-[#D4AF37]/40 rounded-3xl p-6 sm:p-7 shadow-2xl shadow-[#D4AF37]/15 text-slate-100 space-y-6"
        role="dialog"
        aria-modal="true"
      >
        {/* Close Button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          title="Cerrar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header with App Logo & Title */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl overflow-hidden bg-[#0D0F12] border-2 border-[#D4AF37] p-1.5 shadow-xl shadow-[#D4AF37]/20 flex items-center justify-center">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={appName}
                  className="w-full h-full object-contain rounded-xl"
                  onError={(e) => {
                    // Fallback to svg icon if error
                    (e.target as HTMLImageElement).src = '/icon.svg';
                  }}
                />
              ) : (
                <Smartphone className="w-10 h-10 text-[#D4AF37]" />
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-[#D4AF37] text-black shadow-md">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
          </div>

          <div>
            <h3 className="text-xl font-extrabold text-white tracking-wide">
              Instala la App de {appName}
            </h3>
            <p className="text-xs text-amber-200/80 font-medium mt-1">
              Accede más rápido y agenda tus citas con un solo toque
            </p>
          </div>
        </div>

        {/* Benefits List */}
        {!showIOSInstructions ? (
          <div className="space-y-2.5 bg-black/30 rounded-2xl p-4 border border-white/5 text-xs text-slate-300">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-4 h-4 text-[#D4AF37] shrink-0" />
              <span>Acceso directo desde tu pantalla de inicio sin navegador</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-4 h-4 text-[#D4AF37] shrink-0" />
              <span>Recordatorios y confirmaciones de citas en tiempo real</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-4 h-4 text-[#D4AF37] shrink-0" />
              <span>Experiencia fluida y navegación a pantalla completa</span>
            </div>
          </div>
        ) : (
          /* iOS Safari Specific Installation Guide */
          <div className="space-y-3 bg-amber-500/10 border border-[#D4AF37]/30 rounded-2xl p-4 text-xs text-slate-200 animate-in fade-in">
            <p className="font-bold text-[#D4AF37] text-sm text-center">
              Cómo instalar en iPhone / iPad:
            </p>
            <ol className="space-y-2.5">
              <li className="flex items-start gap-2.5">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#D4AF37] text-black font-black text-[11px] shrink-0 mt-0.5">1</span>
                <div>
                  Toca el botón <strong className="text-white">Compartir</strong> <Share2 className="inline w-3.5 h-3.5 text-[#D4AF37] ml-1" /> en la barra inferior de Safari.
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#D4AF37] text-black font-black text-[11px] shrink-0 mt-0.5">2</span>
                <div>
                  Desplaza hacia abajo y selecciona <strong className="text-white">"Añadir a pantalla de inicio"</strong> <PlusSquare className="inline w-3.5 h-3.5 text-[#D4AF37] ml-1" />.
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#D4AF37] text-black font-black text-[11px] shrink-0 mt-0.5">3</span>
                <div>
                  Toca <strong className="text-[#D4AF37]">"Añadir"</strong> en la esquina superior derecha. ¡Listo!
                </div>
              </li>
            </ol>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-1">
          {!showIOSInstructions ? (
            <button
              onClick={handleInstallClick}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-[#D4AF37] to-[#E5C158] hover:from-[#E5C158] hover:to-[#FCE082] text-black shadow-lg shadow-[#D4AF37]/25 transition-all active:scale-[0.98]"
            >
              <Download className="w-4 h-4 stroke-[2.5]" />
              <span>{isIOS ? 'Ver Instrucciones para Instalar' : 'Instalar Aplicación'}</span>
            </button>
          ) : (
            <button
              onClick={() => setShowIOSInstructions(false)}
              className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-white/10 hover:bg-white/15 text-slate-200 transition-all text-center"
            >
              Entendido
            </button>
          )}

          <button
            onClick={handleDismiss}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors text-center"
          >
            Quizás más tarde
          </button>
        </div>
      </div>
    </div>
  );
};
