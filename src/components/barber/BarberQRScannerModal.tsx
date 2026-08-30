import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  QrCode,
  X,
  Search,
  CheckCircle2,
  PlusCircle,
  MinusCircle,
  Sparkles,
  Phone,
  User,
  Calendar,
  AlertCircle,
  RefreshCw,
  Award,
  History,
  Scissors,
  Check,
} from 'lucide-react';
import jsQR from 'jsqr';
import confetti from 'canvas-confetti';
import { useBarbershop } from '../../contexts/BarbershopContext';
import { useAuth } from '../../contexts/AuthContext';
import { dataService } from '../../services/firebase/dataService';
import { UserProfile, Barber } from '../../types';
import { formatCurrency, formatDateSpanish } from '../../utils/dateTime';

interface BarberQRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBookForClient?: (client: UserProfile) => void;
  activeBarber: Barber;
}

export const BarberQRScannerModal: React.FC<BarberQRScannerModalProps> = ({
  isOpen,
  onClose,
  onBookForClient,
  activeBarber,
}) => {
  const { showToast } = useBarbershop();
  const { userProfile: authUser } = useAuth();

  // Camera & Scanning State
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(true);

  // Search & Found Client State
  const [manualInput, setManualInput] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [scannedClient, setScannedClient] = useState<UserProfile | null>(null);
  const [clientVisitsCount, setClientVisitsCount] = useState<number>(0);

  // Client Action Panel State
  const [pointsActionType, setPointsActionType] = useState<'add' | 'deduct'>('add');
  const [pointsAmount, setPointsAmount] = useState<number>(50);
  const [pointsReason, setPointsReason] = useState<string>('Corte de cabello realizado');
  const [isSubmittingAction, setIsSubmittingAction] = useState<boolean>(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // Start Camera when modal opens
  useEffect(() => {
    if (isOpen) {
      setScannedClient(null);
      setActionSuccessMessage(null);
      setManualInput('');
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    setCameraError(null);
    setIsScanning(true);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('La cámara no está disponible en este navegador o dispositivo.');
      }

      // Stop existing stream if any
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true'); // Required for iOS Safari
        await videoRef.current.play();
        setCameraActive(true);
        requestScanFrame();
      }
    } catch (err: any) {
      console.warn('Camera access warning:', err);
      setCameraActive(false);
      setCameraError(
        err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
          ? 'Permiso de cámara denegado. Puedes escribir el No. de Cliente o Celular abajo.'
          : 'No se pudo activar la cámara trasera. Ingresa el No. de Cliente o teléfono manualmente.'
      );
    }
  };

  const stopCamera = () => {
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const requestScanFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });

      if (code && code.data) {
        handleRawScannedData(code.data);
        return; // Pause scanning while displaying client
      }
    }

    animFrameIdRef.current = requestAnimationFrame(requestScanFrame);
  };

  const handleRawScannedData = async (rawData: string) => {
    try {
      setIsScanning(false);
      let searchKey = rawData.trim();

      // Check if rawData is a JSON payload
      if (searchKey.startsWith('{') && searchKey.endsWith('}')) {
        try {
          const parsed = JSON.parse(searchKey);
          searchKey = parsed.monarca_client_id || parsed.clientNumber || parsed.phone || parsed.id || searchKey;
        } catch {
          // ignore
        }
      }

      await lookupAndSetClient(searchKey);
    } catch (err: any) {
      showToast('error', 'Código no reconocido', err.message || 'No se pudo leer el QR.');
      setIsScanning(true);
      requestScanFrame();
    }
  };

  const lookupAndSetClient = async (identifier: string) => {
    setIsSearching(true);
    try {
      const clean = identifier.replace(/[^a-zA-Z0-9@+]/g, '').trim();
      if (!clean) {
        throw new Error('Ingresa un número de cliente o teléfono válido.');
      }

      const client = await dataService.findUserByIdentifier(clean);
      if (!client) {
        throw new Error(`No se encontró cliente con el código "${identifier}".`);
      }

      // Calculate total visits (manual visits + completed appointments in database)
      const allAppointments = await new Promise<any[]>((resolve) => {
        const unsub = dataService.subscribeToAppointments('client', client.id, undefined, (apps) => {
          unsub();
          resolve(apps);
        });
      }).catch(() => []);

      const completedCount = allAppointments.filter((a) => a.status === 'completed').length;
      const totalVisits = (client.manualVisits || 0) + completedCount;

      setScannedClient(client);
      setClientVisitsCount(totalVisits);

      // Play joyful confetti & audio feedback
      try {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#D4AF37', '#FFFFFF', '#E5B869'],
        });
      } catch {
        // ignore
      }

      showToast('success', 'Cliente Identificado', `${client.name} (#${client.clientNumber || 'VIP'})`);
    } catch (err: any) {
      showToast('error', 'Búsqueda fallida', err.message || 'Cliente no encontrado');
      setIsScanning(true);
      if (cameraActive) {
        requestScanFrame();
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    lookupAndSetClient(manualInput.trim());
  };

  // 1. Quick Register Visit (+1 Visit & optional +50 pts)
  const handleRegisterVisit = async () => {
    if (!scannedClient) return;
    setIsSubmittingAction(true);
    try {
      const newManualVisits = (scannedClient.manualVisits || 0) + 1;
      const currentPts = scannedClient.points || 0;
      const bonusPts = 50;
      const newTotalPts = currentPts + bonusPts;

      // Update visits
      await dataService.updateUserVisits(scannedClient.id, newManualVisits);

      // Add points for the visit
      await dataService.updateUserPoints(
        scannedClient.id,
        newTotalPts,
        `Visita y servicio en silla de ${activeBarber.displayName} (+50 pts)`,
        'add'
      );

      // Log purchase/visit record
      await dataService.addUserPurchase(scannedClient.id, {
        itemName: `Corte / Visita en Barbería`,
        price: 250,
        barberName: activeBarber.displayName,
        notes: `Atendido por ${activeBarber.displayName}. Visita registrada vía escáner QR.`,
      });

      // Update local state
      const updatedClient: UserProfile = {
        ...scannedClient,
        manualVisits: newManualVisits,
        points: newTotalPts,
      };
      setScannedClient(updatedClient);
      setClientVisitsCount((prev) => prev + 1);

      setActionSuccessMessage(`¡Visita registrada con éxito! Se sumaron +50 puntos a ${scannedClient.name}.`);
      showToast('success', 'Visita Registrada', `+1 Visita y +50 puntos para ${scannedClient.name}`);

      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.5 },
          colors: ['#10B981', '#D4AF37', '#FFFFFF'],
        });
      } catch {
        // ignore
      }
    } catch (err: any) {
      showToast('error', 'Error al registrar visita', err.message);
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // 2. Custom Points Adjustment (Add / Deduct)
  const handleApplyPoints = async () => {
    if (!scannedClient || pointsAmount <= 0) return;
    setIsSubmittingAction(true);
    try {
      const currentPts = scannedClient.points || 0;
      let newTotal = currentPts;
      let reasonText = pointsReason.trim() || 'Ajuste de puntos en sucursal';

      if (pointsActionType === 'add') {
        newTotal = currentPts + pointsAmount;
        reasonText = `Abono de +${pointsAmount} pts por ${activeBarber.displayName}: ${reasonText}`;
      } else {
        if (currentPts < pointsAmount) {
          throw new Error(`El cliente solo cuenta con ${currentPts} puntos disponibles.`);
        }
        newTotal = Math.max(0, currentPts - pointsAmount);
        reasonText = `Canje de -${pointsAmount} pts por ${activeBarber.displayName}: ${reasonText}`;
      }

      await dataService.updateUserPoints(scannedClient.id, newTotal, reasonText, pointsActionType);

      const updatedClient: UserProfile = {
        ...scannedClient,
        points: newTotal,
      };
      setScannedClient(updatedClient);

      setActionSuccessMessage(
        pointsActionType === 'add'
          ? `¡Se abonaron +${pointsAmount} puntos correctamente!`
          : `¡Se canjearon -${pointsAmount} puntos correctamente!`
      );

      showToast(
        'success',
        pointsActionType === 'add' ? 'Puntos Abonados' : 'Puntos Canjeados',
        `Nuevo balance: ${newTotal} puntos.`
      );

      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#D4AF37', '#38BDF8', '#FFFFFF'],
        });
      } catch {
        // ignore
      }
    } catch (err: any) {
      showToast('error', 'Error con puntos', err.message);
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleScanAnother = () => {
    setScannedClient(null);
    setActionSuccessMessage(null);
    setManualInput('');
    setIsScanning(true);
    if (!cameraActive) {
      startCamera();
    } else {
      requestScanFrame();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-[#12151B] border border-white/15 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col my-auto max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-[#181D26] to-[#12151B]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#996515] via-[#D4AF37] to-[#F3E5AB] flex items-center justify-center text-slate-950 shadow-lg shadow-[#D4AF37]/20">
              <QrCode className="w-5 h-5 stroke-[2.4]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>Lector de QR Clientes</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30">
                  MODO BARBERO
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Escanea el pase VIP para registrar visitas y abonar puntos
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          {!scannedClient ? (
            /* SCANNER & MANUAL SEARCH VIEW */
            <div className="space-y-4">
              {/* Camera Viewfinder */}
              <div className="relative aspect-square max-h-[300px] w-full rounded-2xl overflow-hidden bg-black/90 border border-white/15 flex items-center justify-center shadow-inner">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* Scanning Frame Overlay */}
                {cameraActive && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-8">
                    <div className="relative w-48 h-48 sm:w-56 sm:h-56 border-2 border-[#D4AF37] rounded-3xl shadow-[0_0_25px_rgba(212,175,55,0.4)]">
                      {/* Corner marks */}
                      <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-white rounded-tl-lg" />
                      <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-white rounded-tr-lg" />
                      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-white rounded-bl-lg" />
                      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-white rounded-br-lg" />

                      {/* Laser scanning line animation */}
                      <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent animate-pulse top-1/2 -translate-y-1/2 shadow-[0_0_12px_#D4AF37]" />
                    </div>
                  </div>
                )}

                {/* Camera Fallback / Error State */}
                {!cameraActive && (
                  <div className="absolute inset-0 p-6 flex flex-col items-center justify-center text-center space-y-3 bg-[#0D0F12]/95">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-[#D4AF37]">
                      <Camera className="w-6 h-6" />
                    </div>
                    <p className="text-slate-300 font-medium text-xs max-w-xs">
                      {cameraError || 'Iniciando cámara del dispositivo...'}
                    </p>
                    <button
                      type="button"
                      onClick={startCamera}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-[#D4AF37]" />
                      <span>Reintentar Cámara</span>
                    </button>
                  </div>
                )}

                {/* Live Scanner Banner */}
                {cameraActive && (
                  <div className="absolute bottom-3 inset-x-4 flex justify-center">
                    <span className="px-3 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/10 text-slate-200 text-[11px] font-medium flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      Apunta la cámara al código QR del cliente
                    </span>
                  </div>
                )}
              </div>

              {/* Divider with text */}
              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-white/10" />
                <span className="flex-shrink mx-3 text-slate-500 text-[11px] uppercase tracking-wider font-semibold">
                  O búsqueda manual directa
                </span>
                <div className="flex-grow border-t border-white/10" />
              </div>

              {/* Manual Search Form */}
              <form onSubmit={handleManualSearch} className="space-y-2">
                <label className="text-slate-300 font-medium block">
                  Ingresa No. de Cliente (6 dígitos) o Teléfono celular:
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={manualInput}
                      onChange={(e) => setManualInput(e.target.value)}
                      placeholder="Ej. 849201 o 3411975639"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:border-[#D4AF37] font-mono text-xs"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSearching || !manualInput.trim()}
                    className="px-4 py-2.5 rounded-xl bg-[#D4AF37] hover:bg-[#E5B869] text-slate-950 font-bold text-xs shadow-md transition-all disabled:opacity-50 flex items-center gap-1"
                  >
                    {isSearching ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <span>Buscar</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* CLIENT EXPEDIENTE & ACTIONS VIEW */
            <div className="space-y-4 animate-in fade-in">
              {/* Success Notification Banner */}
              {actionSuccessMessage && (
                <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 flex items-center gap-2 text-xs">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{actionSuccessMessage}</span>
                </div>
              )}

              {/* Client Info Card */}
              <div className="p-4 rounded-3xl bg-gradient-to-b from-[#1A1F29] to-[#12151B] border border-[#D4AF37]/40 shadow-xl space-y-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-[#996515] to-[#D4AF37] p-0.5 shadow-lg shrink-0">
                      {scannedClient.photoUrl ? (
                        <img
                          src={scannedClient.photoUrl}
                          alt={scannedClient.name}
                          className="w-full h-full rounded-[14px] object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full bg-[#14171E] rounded-[14px] flex items-center justify-center text-[#D4AF37] font-black text-base">
                          {scannedClient.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-black text-white">{scannedClient.name}</h3>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30">
                          {scannedClient.membershipTier || 'VIP'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 font-mono mt-0.5">
                        No. Cliente: <strong className="text-[#D4AF37]">#{scannedClient.clientNumber || 'SIN-NUMERO'}</strong>
                      </p>
                      <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{scannedClient.phone || 'Sin celular'}</span>
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleScanAnother}
                    className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-[11px] font-bold flex items-center gap-1 transition-all shrink-0"
                    title="Escanear otro cliente"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Otro</span>
                  </button>
                </div>

                {/* Metric Badges */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10 text-center">
                  <div className="p-2.5 rounded-2xl bg-black/40 border border-white/10">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Puntos VIP</span>
                    <span className="text-lg font-black text-[#D4AF37] mt-0.5 block flex items-center justify-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                      {scannedClient.points || 0} pts
                    </span>
                  </div>

                  <div className="p-2.5 rounded-2xl bg-black/40 border border-white/10">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Visitas Acumuladas</span>
                    <span className="text-lg font-black text-emerald-400 mt-0.5 block flex items-center justify-center gap-1">
                      <Award className="w-3.5 h-3.5 text-emerald-400" />
                      {clientVisitsCount} visitas
                    </span>
                  </div>
                </div>

                {scannedClient.notes && (
                  <p className="text-[11px] text-amber-200/90 bg-amber-500/10 border border-amber-500/20 p-2 rounded-xl">
                    <strong>Nota de Estilo:</strong> {scannedClient.notes}
                  </p>
                )}
              </div>

              {/* ACTION 1: INSTANT VISIT REGISTRATION */}
              <div className="p-4 rounded-3xl bg-[#181D26] border border-white/10 space-y-2.5 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <h4 className="font-bold text-white text-xs uppercase tracking-wide">
                      1. Registrar Visita del Cliente
                    </h4>
                  </div>
                  <span className="text-[10px] text-emerald-300 font-bold bg-emerald-500/20 px-2 py-0.5 rounded-full">
                    +1 Visita & +50 pts
                  </span>
                </div>

                <p className="text-[11px] text-slate-300">
                  Registra que {scannedClient.name} se atendió hoy contigo en tu silla. Sumará 1 visita y 50 puntos de lealtad.
                </p>

                <button
                  onClick={handleRegisterVisit}
                  disabled={isSubmittingAction}
                  className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>{isSubmittingAction ? 'Registrando...' : 'Registrar Visita (+50 Puntos)'}</span>
                </button>
              </div>

              {/* ACTION 2: CUSTOM POINTS ADJUSTMENT */}
              <div className="p-4 rounded-3xl bg-[#181D26] border border-white/10 space-y-3 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                    <h4 className="font-bold text-white text-xs uppercase tracking-wide">
                      2. Abonar o Canjear Puntos
                    </h4>
                  </div>

                  <div className="flex items-center p-0.5 rounded-xl bg-black/40 border border-white/10">
                    <button
                      type="button"
                      onClick={() => setPointsActionType('add')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                        pointsActionType === 'add' ? 'bg-[#D4AF37] text-slate-950' : 'text-slate-400'
                      }`}
                    >
                      Abonar (+)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPointsActionType('deduct')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                        pointsActionType === 'deduct' ? 'bg-rose-500 text-white' : 'text-slate-400'
                      }`}
                    >
                      Canjear (-)
                    </button>
                  </div>
                </div>

                {/* Quick Chips */}
                <div className="flex flex-wrap gap-1.5">
                  {[50, 100, 150, 200].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setPointsAmount(amt)}
                      className={`px-2.5 py-1 rounded-xl font-bold text-[11px] border transition-all ${
                        pointsAmount === amt
                          ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-[#D4AF37]'
                          : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      {pointsActionType === 'add' ? `+${amt}` : `-${amt}`} pts
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-1">
                    <label className="text-slate-400 block mb-1 text-[10px]">Cantidad</label>
                    <input
                      type="number"
                      value={pointsAmount}
                      onChange={(e) => setPointsAmount(Math.max(1, Number(e.target.value)))}
                      className="w-full p-2 rounded-xl bg-slate-900 border border-white/15 text-white font-bold"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-slate-400 block mb-1 text-[10px]">Motivo / Concepto</label>
                    <input
                      type="text"
                      value={pointsReason}
                      onChange={(e) => setPointsReason(e.target.value)}
                      placeholder="Ej. Corte + Barba / Promo"
                      className="w-full p-2 rounded-xl bg-slate-900 border border-white/15 text-white"
                    />
                  </div>
                </div>

                <button
                  onClick={handleApplyPoints}
                  disabled={isSubmittingAction || pointsAmount <= 0}
                  className={`w-full py-2.5 rounded-2xl font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 ${
                    pointsActionType === 'add'
                      ? 'bg-[#D4AF37] hover:bg-[#E5B869] text-slate-950'
                      : 'bg-rose-600 hover:bg-rose-500 text-white'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>
                    {isSubmittingAction
                      ? 'Procesando...'
                      : pointsActionType === 'add'
                      ? `Abonar +${pointsAmount} Puntos`
                      : `Canjear -${pointsAmount} Puntos`}
                  </span>
                </button>
              </div>

              {/* ACTION 3: BOOK APPOINTMENT FOR THIS CLIENT */}
              {onBookForClient && (
                <button
                  onClick={() => {
                    onClose();
                    onBookForClient(scannedClient);
                  }}
                  className="w-full py-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow"
                >
                  <Calendar className="w-4 h-4 text-[#D4AF37]" />
                  <span>Agendar Nueva Cita para {scannedClient.name.split(' ')[0]}</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:p-4 border-t border-white/10 bg-[#0D0F12] flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            {scannedClient ? `Cliente: ${scannedClient.name}` : 'Alinea el código QR dentro del recuadro'}
          </span>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-semibold transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
