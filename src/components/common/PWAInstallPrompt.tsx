import React, { useState, useEffect } from 'react';
import { Download, Share2, PlusSquare, X, Smartphone, CheckCircle2 } from 'lucide-react';
import { useBarbershop } from '../../contexts/BarbershopContext';

export const PWAInstallPrompt: React.FC = () => {
  const { businessSettings } = useBarbershop();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    const checkIsStandalone = () => {
      const isStandaloneMedia = window.matchMedia('(display-mode: standalone)').matches;
      const isIOSStandalone = (window.navigator as any).standalone === true;
      const isAndroidApp = document.referrer.includes('android-app://');
      const isStoredInstalled = localStorage.getItem('monarca_pwa_installed') === 'true';

      return isStandaloneMedia || isIOSStandalone || isAndroidApp || isStoredInstalled;
    };

    if (checkIsStandalone()) {
      setIsInstalled(true);
      return;
    }

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isAppleDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);

      const lastDismissed = localStorage.getItem('monarca_pwa_dismissed_time');
      const twelveHours = 12 * 60 * 60 * 1000;
      if (!lastDismissed || Date.now() - Number(lastDismissed) > twelveHours) {
        const timer = setTimeout(() => {
          setIsOpen(true);
        }, 1500);
        return () => clearTimeout(timer);
      }
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsOpen(false);
      setDeferredPrompt(null);
      localStorage.setItem('monarca_pwa_installed', 'true');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#161514]/50 backdrop-blur-sm animate-in fade-in duration-300">
      <div
        className="relative w-full max-w-md bg-[#FAF9F6] border border-[#E6E1D6] rounded-3xl p-6 sm:p-7 shadow-[0_24px_60px_rgba(22,21,20,0.2)] text-[#161514] space-y-6"
        role="dialog"
        aria-modal="true"
      >
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-2 rounded-xl bg-white hover:bg-[#F2EFE9] border border-[#E6E1D6] text-[#5C5852] hover:text-[#161514] transition-colors"
          title="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-20 h-20 rounded-2xl overflow-hidden bg-white border border-[#9A6B3B]/45 p-2 shadow-sm flex items-center justify-center">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={appName}
                className="w-full h-full object-contain rounded-xl drop-shadow-[0_1px_2px_rgba(22,21,20,0.18)]"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/icon.svg';
                }}
              />
            ) : (
              <Smartphone className="w-9 h-9 text-[#9A6B3B]" />
            )}
          </div>

          <div>
            <h3 className="font-display text-2xl font-bold text-[#161514] tracking-wide uppercase">
              Instala la App de {appName}
            </h3>
            <p className="text-xs text-[#5C5852] font-medium mt-1">
              Accede más rápido y agenda tus citas con un solo toque
            </p>
          </div>
        </div>

        {!showIOSInstructions ? (
          <div className="space-y-2.5 bg-white rounded-2xl p-4 border border-[#E6E1D6] text-xs text-[#161514]">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-4 h-4 text-[#9A6B3B] shrink-0" />
              <span>Acceso directo desde tu pantalla de inicio sin navegador</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-4 h-4 text-[#9A6B3B] shrink-0" />
              <span>Recordatorios y confirmaciones de citas en tiempo real</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-4 h-4 text-[#9A6B3B] shrink-0" />
              <span>Experiencia fluida y navegación a pantalla completa</span>
            </div>
          </div>
        ) : (
          <div className="space-y-3 bg-[#F2EFE9] border border-[#9A6B3B]/35 rounded-2xl p-4 text-xs text-[#161514]">
            <p className="font-display font-bold text-[#9A6B3B] text-base text-center uppercase tracking-wide">
              Cómo instalar en iPhone / iPad
            </p>
            <ol className="space-y-2.5">
              <li className="flex items-start gap-2.5">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#161514] text-[#FAF9F6] font-bold text-[11px] shrink-0 mt-0.5 tabular-nums">1</span>
                <div>
                  Toca el botón <strong>Compartir</strong> <Share2 className="inline w-3.5 h-3.5 text-[#9A6B3B] ml-1" /> en la barra inferior de Safari.
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#161514] text-[#FAF9F6] font-bold text-[11px] shrink-0 mt-0.5 tabular-nums">2</span>
                <div>
                  Desplaza hacia abajo y selecciona <strong>"Añadir a pantalla de inicio"</strong> <PlusSquare className="inline w-3.5 h-3.5 text-[#9A6B3B] ml-1" />.
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#161514] text-[#FAF9F6] font-bold text-[11px] shrink-0 mt-0.5 tabular-nums">3</span>
                <div>
                  Toca <strong className="text-[#9A6B3B]">"Añadir"</strong> en la esquina superior derecha. ¡Listo!
                </div>
              </li>
            </ol>
          </div>
        )}

        <div className="space-y-2 pt-1">
          {!showIOSInstructions ? (
            <button
              onClick={handleInstallClick}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-bold text-sm bg-[#161514] hover:bg-[#2A2826] text-[#FAF9F6] transition-all active:scale-[0.98]"
            >
              <Download className="w-4 h-4 stroke-[2.2]" />
              <span>{isIOS ? 'Ver Instrucciones para Instalar' : 'Instalar Aplicación'}</span>
            </button>
          ) : (
            <button
              onClick={() => setShowIOSInstructions(false)}
              className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-[#F2EFE9] hover:bg-[#E6E1D6] text-[#161514] transition-all text-center"
            >
              Entendido
            </button>
          )}

          <button
            onClick={handleDismiss}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-[#5C5852] hover:text-[#161514] transition-colors text-center"
          >
            Quizás más tarde
          </button>
        </div>
      </div>
    </div>
  );
};
