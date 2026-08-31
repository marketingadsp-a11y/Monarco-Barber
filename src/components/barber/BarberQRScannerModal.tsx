import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Camera,
  QrCode,
  X,
  Search,
  CheckCircle2,
  Plus,
  Minus,
  Sparkles,
  Phone,
  User,
  Calendar,
  AlertCircle,
  RefreshCw,
  Award,
  Scissors,
  Check,
  ShoppingBag,
  CreditCard,
  Banknote,
  Receipt,
  Package,
  ArrowRight,
  Clock,
  ChevronDown,
} from 'lucide-react';
import jsQR from 'jsqr';
import confetti from 'canvas-confetti';
import { useBarbershop } from '../../contexts/BarbershopContext';
import { useAuth } from '../../contexts/AuthContext';
import { dataService } from '../../services/firebase/dataService';
import { UserProfile, Barber, Service, Product, PosSaleItem, Appointment } from '../../types';
import { formatCurrency, formatDateSpanish, formatTime12h, getTodayDateString } from '../../utils/dateTime';

interface BarberQRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBookForClient?: (client: UserProfile) => void;
  onOpenPosForClient?: (client: UserProfile) => void;
  activeBarber: Barber;
}

export const BarberQRScannerModal: React.FC<BarberQRScannerModalProps> = ({
  isOpen,
  onClose,
  onBookForClient,
  onOpenPosForClient,
  activeBarber,
}) => {
  const {
    services,
    products,
    appointments,
    businessSettings,
    recordPosSale,
    showToast,
  } = useBarbershop();
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

  // Unified Checkout Section State
  const [visitsToAdd, setVisitsToAdd] = useState<number>(1); // Default 1 visit
  const [serviceOption, setServiceOption] = useState<'booked' | 'custom' | 'none'>('booked');
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [markAppointmentCompleted, setMarkAppointmentCompleted] = useState<boolean>(true);
  
  // Product cart in scanner: Map of productId -> quantity
  const [productCart, setProductCart] = useState<Record<string, number>>({});
  const [isProductCatalogExpanded, setIsProductCatalogExpanded] = useState<boolean>(false);
  
  // Points & Payment state
  const [customPointsBonus, setCustomPointsBonus] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer'>('cash');
  const [isSubmittingAction, setIsSubmittingAction] = useState<boolean>(false);
  const [actionSuccessData, setActionSuccessData] = useState<{
    clientName: string;
    totalCharged: number;
    pointsEarned: number;
    newTotalPoints: number;
    newTotalVisits: number;
  } | null>(null);

  // Today string & client's appointment today if any
  const todayStr = getTodayDateString();
  const clientTodayAppointment: Appointment | null = useMemo(() => {
    if (!scannedClient) return null;
    return (
      appointments.find(
        (a) =>
          a.date === todayStr &&
          (a.clientId === scannedClient.id ||
            a.clientPhone === scannedClient.phone ||
            (scannedClient.name && a.clientName.toLowerCase() === scannedClient.name.toLowerCase())) &&
          a.status !== 'cancelled' &&
          a.status !== 'rejected'
      ) || null
    );
  }, [scannedClient, appointments, todayStr]);

  // When client is found, initialize checkout selections
  useEffect(() => {
    if (scannedClient) {
      setVisitsToAdd(1); // Default 1 visit
      setProductCart({});
      setIsProductCatalogExpanded(false);
      setCustomPointsBonus(null);
      setActionSuccessData(null);
      setPaymentMethod('cash');

      if (clientTodayAppointment) {
        setServiceOption('booked');
        setSelectedServiceId(clientTodayAppointment.serviceId);
        setMarkAppointmentCompleted(true);
      } else {
        // If no booking today, select the first popular service or custom
        const defaultService = services.find((s) => s.active !== false) || services[0];
        setServiceOption('custom');
        setSelectedServiceId(defaultService?.id || '');
        setMarkAppointmentCompleted(false);
      }
    }
  }, [scannedClient, clientTodayAppointment, services]);

  // Start Camera when modal opens
  useEffect(() => {
    if (isOpen) {
      setScannedClient(null);
      setActionSuccessData(null);
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
        videoRef.current.setAttribute('playsinline', 'true');
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
        return;
      }
    }

    animFrameIdRef.current = requestAnimationFrame(requestScanFrame);
  };

  const handleRawScannedData = async (rawData: string) => {
    try {
      setIsScanning(false);
      let searchKey = rawData.trim();

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

      // Calculate total visits
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

  // Product Cart operations inside Scanner
  const handleAddProduct = (productId: string) => {
    setProductCart((prev) => ({
      ...prev,
      [productId]: (prev[productId] || 0) + 1,
    }));
  };

  const handleRemoveProduct = (productId: string) => {
    setProductCart((prev) => {
      const next = { ...prev };
      if (next[productId] > 1) {
        next[productId] -= 1;
      } else {
        delete next[productId];
      }
      return next;
    });
  };

  // Helper to retrieve high-res barbershop product images with fallback
  const getProductImage = (prod: Product) => {
    if (prod.imageUrl) return prod.imageUrl;
    const name = prod.name.toLowerCase();
    const desc = (prod.description || '').toLowerCase();
    if (name.includes('pomada') || name.includes('matte') || desc.includes('fijación')) {
      return 'https://images.unsplash.com/photo-1597854710119-a5a8fc004a66?auto=format&fit=crop&w=400&q=80';
    }
    if (name.includes('aceite') || name.includes('barba') || desc.includes('barba')) {
      return 'https://images.unsplash.com/photo-1621607512214-68297480165e?auto=format&fit=crop&w=400&q=80';
    }
    if (name.includes('shampoo') || name.includes('capilar') || name.includes('anticaída')) {
      return 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?auto=format&fit=crop&w=400&q=80';
    }
    if (name.includes('cera') || name.includes('polvo') || name.includes('texturiz')) {
      return 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=400&q=80';
    }
    if (name.includes('aftershave') || name.includes('balsamo') || name.includes('bálsamo') || name.includes('afeitado')) {
      return 'https://images.unsplash.com/photo-1512290900672-1f4a47146522?auto=format&fit=crop&w=400&q=80';
    }
    return 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=400&q=80';
  };

  // Active products list
  const activeProducts = products.filter((p) => p.active !== false);

  // Cart products items
  const cartItems: PosSaleItem[] = Object.entries(productCart)
    .map(([prodId, qty]) => {
      const product = products.find((p) => p.id === prodId);
      if (!product) return null;
      return {
        productId: product.id,
        productName: product.name,
        price: product.price,
        quantity: Number(qty),
        subtotal: product.price * Number(qty),
      };
    })
    .filter(Boolean) as PosSaleItem[];

  const totalProductsPrice = cartItems.reduce((sum, item) => sum + item.subtotal, 0);

  // Service Price & Name determination
  const activeSelectedService = services.find((s) => s.id === selectedServiceId);
  let servicePrice = 0;
  let serviceName = '';

  if (serviceOption === 'booked' && clientTodayAppointment) {
    servicePrice = clientTodayAppointment.servicePriceSnapshot || activeSelectedService?.price || 0;
    serviceName = clientTodayAppointment.serviceNameSnapshot || activeSelectedService?.name || 'Servicio Agendado';
  } else if (serviceOption === 'custom' && activeSelectedService) {
    servicePrice = activeSelectedService.price || 0;
    serviceName = activeSelectedService.name;
  }

  // Total Monetary Charge
  const totalAmountToCharge = servicePrice + totalProductsPrice;

  // Points Calculation
  // 1. Service Points (50 base points or proportional)
  const servicePointsEarned = serviceOption !== 'none' && servicePrice > 0 ? 50 : 0;

  // 2. Product Points (% configured in settings, default 1%)
  const pointsEnabled = businessSettings.enableProductPointsReward !== undefined ? businessSettings.enableProductPointsReward : true;
  const productPointsPercentage = businessSettings.productPointsPercentage !== undefined ? businessSettings.productPointsPercentage : 1;
  const productPointsEarned = pointsEnabled && totalProductsPrice > 0 ? Math.floor((totalProductsPrice * productPointsPercentage) / 100) : 0;

  const autoCalculatedPoints = servicePointsEarned + productPointsEarned;
  const finalPointsToAdd = customPointsBonus !== null ? customPointsBonus : autoCalculatedPoints;

  // EXECUTE UNIFIED CHECKOUT & VISIT REGISTRATION
  const handleExecuteCheckout = async () => {
    if (!scannedClient) return;
    setIsSubmittingAction(true);

    try {
      const newManualVisits = (scannedClient.manualVisits || 0) + visitsToAdd;
      const currentPts = scannedClient.points || 0;
      const newTotalPts = currentPts + finalPointsToAdd;

      // 1. Update client's visits in Firestore
      if (visitsToAdd > 0) {
        await dataService.updateUserVisits(scannedClient.id, newManualVisits);
      }

      // 2. Update client's points in Firestore
      if (finalPointsToAdd > 0) {
        let reason = `Atención en silla con ${activeBarber.displayName}: `;
        if (serviceName) reason += `${serviceName} `;
        if (cartItems.length > 0) reason += `+ ${cartItems.length} producto(s) `;
        reason += `(+${finalPointsToAdd} pts)`;

        await dataService.updateUserPoints(
          scannedClient.id,
          newTotalPts,
          reason,
          'add'
        );
      }

      // 3. Mark appointment as completed if requested
      if (clientTodayAppointment && markAppointmentCompleted) {
        await dataService.updateAppointmentStatus(clientTodayAppointment.id, 'completed', {
          notes: `Cobrado y completado por ${activeBarber.displayName} vía escáner QR.`,
        });
      }

      // 4. Record product sale in POS if products were purchased
      if (cartItems.length > 0) {
        await recordPosSale({
          barberId: activeBarber.id,
          barberName: activeBarber.displayName,
          customerId: scannedClient.id,
          customerName: scannedClient.name,
          customerClientNumber: scannedClient.clientNumber,
          customerPhone: scannedClient.phone,
          items: cartItems,
          total: totalProductsPrice,
          pointsAwarded: productPointsEarned,
          pointsPercentageUsed: productPointsPercentage,
          paymentMethod,
          notes: `Venta agregada durante cobro en silla por ${activeBarber.displayName}`,
        });
      }

      // 5. Record service purchase record in user's history
      if (servicePrice > 0) {
        await dataService.addUserPurchase(scannedClient.id, {
          itemName: serviceName || 'Servicio de Barbería',
          price: servicePrice,
          barberName: activeBarber.displayName,
          notes: `Servicio realizado por ${activeBarber.displayName}. Pago en ${paymentMethod}.`,
        });
      }

      // Update local state
      const updatedClient: UserProfile = {
        ...scannedClient,
        manualVisits: newManualVisits,
        points: newTotalPts,
      };
      setScannedClient(updatedClient);
      setClientVisitsCount((prev) => prev + visitsToAdd);

      setActionSuccessData({
        clientName: scannedClient.name,
        totalCharged: totalAmountToCharge,
        pointsEarned: finalPointsToAdd,
        newTotalPoints: newTotalPts,
        newTotalVisits: clientVisitsCount + visitsToAdd,
      });

      showToast(
        'success',
        '✅ Cobro y Visita Registrados',
        `$${totalAmountToCharge.toFixed(2)} cobrados • +${visitsToAdd} Visita • +${finalPointsToAdd} Pts`,
        { playSound: true, soundType: 'success' }
      );

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
      showToast('error', 'Error al procesar', err.message || 'No se pudo completar el registro.');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleScanAnother = () => {
    setScannedClient(null);
    setActionSuccessData(null);
    setManualInput('');
    setProductCart({});
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
      <div className="bg-[#12151B] border border-white/15 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col my-auto max-h-[94vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-[#181D26] to-[#12151B]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#996515] via-[#D4AF37] to-[#F3E5AB] flex items-center justify-center text-slate-950 shadow-lg shadow-[#D4AF37]/20">
              <QrCode className="w-5 h-5 stroke-[2.4]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>Lector QR & Cobro</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30">
                  {activeBarber.displayName.split(' ')[0]}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Escanear cliente para cobro, servicios, productos y puntos
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
            /* 1. CAMERA SCANNER & MANUAL SEARCH VIEW */
            <div className="space-y-4">
              {/* Camera Viewfinder */}
              <div className="relative aspect-square max-h-[290px] w-full rounded-2xl overflow-hidden bg-black/90 border border-white/15 flex items-center justify-center shadow-inner">
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
                      <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-white rounded-tl-lg" />
                      <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-white rounded-tr-lg" />
                      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-white rounded-bl-lg" />
                      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-white rounded-br-lg" />
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

                {/* Live Scanner Indicator */}
                {cameraActive && (
                  <div className="absolute bottom-3 inset-x-4 flex justify-center">
                    <span className="px-3 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/10 text-slate-200 text-[11px] font-medium flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      Apunta al código QR del cliente
                    </span>
                  </div>
                )}
              </div>

              {/* Divider */}
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
          ) : actionSuccessData ? (
            /* SUCCESS CONFIRMATION RECEIPT */
            <div className="space-y-4 text-center py-4 animate-in zoom-in-95">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400 flex items-center justify-center mx-auto shadow-[0_0_25px_rgba(16,185,129,0.3)]">
                <Check className="w-8 h-8 stroke-[3]" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">
                  ¡Cobro y Registro Exitoso!
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  Atención completada para <strong className="text-[#D4AF37]">{actionSuccessData.clientName}</strong>
                </p>
              </div>

              {/* Receipt Summary Card */}
              <div className="p-4 rounded-2xl bg-[#181D26] border border-white/10 space-y-2 text-left">
                <div className="flex justify-between items-center py-1 border-b border-white/5">
                  <span className="text-slate-400">Monto Total Cobrado:</span>
                  <strong className="text-emerald-400 text-sm font-black">
                    {formatCurrency(actionSuccessData.totalCharged)}
                  </strong>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-white/5">
                  <span className="text-slate-400">Puntos Sumados:</span>
                  <strong className="text-[#D4AF37] font-black">
                    +{actionSuccessData.pointsEarned} pts
                  </strong>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-white/5">
                  <span className="text-slate-400">Nuevo Saldo de Puntos:</span>
                  <span className="text-white font-bold">{actionSuccessData.newTotalPoints} pts</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-400">Total Visitas Acumuladas:</span>
                  <span className="text-teal-400 font-bold">{actionSuccessData.newTotalVisits} visitas</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <button
                  onClick={handleScanAnother}
                  className="flex-1 py-2.5 rounded-xl bg-[#D4AF37] hover:bg-[#E5B869] text-slate-950 font-bold text-xs shadow transition-all flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Escanear Otro Cliente</span>
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs transition-all"
                >
                  Finalizar
                </button>
              </div>
            </div>
          ) : (
            /* 2. SCANNED CLIENT FICHA & UNIFIED COBRO / VISITAS / PUNTOS SECTION */
            <div className="space-y-4 animate-in fade-in">
              {/* FICHA CLIENTE: Datos, Puntos y Visitas Actuales */}
              <div className="p-3.5 sm:p-4 rounded-3xl bg-gradient-to-b from-[#1A1F29] to-[#12151B] border border-[#D4AF37]/40 shadow-xl space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#996515] to-[#D4AF37] p-0.5 shadow-lg shrink-0">
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
                        <h3 className="text-sm sm:text-base font-black text-white">{scannedClient.name}</h3>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30">
                          {scannedClient.membershipTier || 'VIP'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 font-mono mt-0.5">
                        No. Cliente: <strong className="text-[#D4AF37]">#{scannedClient.clientNumber || 'SIN-NUM'}</strong>
                      </p>
                      <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{scannedClient.phone || 'Sin teléfono'}</span>
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

                {/* Saldo Actual: Puntos y Visitas */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10 text-center">
                  <div className="p-2 rounded-2xl bg-black/40 border border-white/10">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Puntos Actuales</span>
                    <span className="text-base font-black text-[#D4AF37] mt-0.5 block flex items-center justify-center gap-1">
                      <Sparkles className="w-3 h-3 text-[#D4AF37]" />
                      {scannedClient.points || 0} pts
                    </span>
                  </div>

                  <div className="p-2 rounded-2xl bg-black/40 border border-white/10">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Visitas Acumuladas</span>
                    <span className="text-base font-black text-emerald-400 mt-0.5 block flex items-center justify-center gap-1">
                      <Award className="w-3 h-3 text-emerald-400" />
                      {clientVisitsCount} visitas
                    </span>
                  </div>
                </div>
              </div>

              {/* UNIFIED TRANSACTION PANEL */}
              <div className="p-4 rounded-3xl bg-[#14171E] border border-white/10 space-y-4 shadow-xl">
                {/* 1. VISITAS A SUMAR (POR DEFECTO 1 VISITA) */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-[#181D26] border border-white/10">
                  <div>
                    <span className="text-xs font-bold text-white block">Visitas a Registrar:</span>
                    <span className="text-[11px] text-slate-400">Por defecto: 1 visita</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setVisitsToAdd(Math.max(0, visitsToAdd - 1))}
                      className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center font-bold"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-mono font-bold text-sm text-teal-300 min-w-[2rem] text-center">
                      +{visitsToAdd}
                    </span>
                    <button
                      type="button"
                      onClick={() => setVisitsToAdd(visitsToAdd + 1)}
                      className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center font-bold"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* 2. COBRO DE SERVICIO (AGENDADO U OTRO SERVICIO) */}
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Servicio a Cobrar
                  </label>

                  {/* If client had an appointment scheduled for today */}
                  {clientTodayAppointment && (
                    <div
                      onClick={() => setServiceOption('booked')}
                      className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                        serviceOption === 'booked'
                          ? 'bg-amber-500/15 border-[#D4AF37] ring-1 ring-[#D4AF37]/50'
                          : 'bg-[#181D26] border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            serviceOption === 'booked' ? 'border-[#D4AF37] bg-[#D4AF37]' : 'border-slate-500'
                          }`}>
                            {serviceOption === 'booked' && <Check className="w-3 h-3 text-slate-950 stroke-[3]" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-white text-xs">
                                Cita Agendada Hoy ({formatTime12h(clientTodayAppointment.startTime)})
                              </span>
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400">
                                AGENDADA
                              </span>
                            </div>
                            <p className="text-[11px] text-[#D4AF37] font-semibold mt-0.5">
                              {clientTodayAppointment.serviceNameSnapshot} • {formatCurrency(clientTodayAppointment.servicePriceSnapshot || 0)}
                            </p>
                          </div>
                        </div>

                        <span className="font-black text-white text-sm">
                          {formatCurrency(clientTodayAppointment.servicePriceSnapshot || 0)}
                        </span>
                      </div>

                      {serviceOption === 'booked' && (
                        <label className="flex items-center gap-2 mt-2 pt-2 border-t border-white/10 text-[11px] text-slate-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={markAppointmentCompleted}
                            onChange={(e) => setMarkAppointmentCompleted(e.target.checked)}
                            className="rounded border-white/20 text-[#D4AF37] focus:ring-[#D4AF37]"
                          />
                          <span>Marcar cita en agenda como cobrada / completada</span>
                        </label>
                      )}
                    </div>
                  )}

                  {/* Option: Choose another service from the catalog */}
                  <div
                    onClick={() => setServiceOption('custom')}
                    className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                      serviceOption === 'custom'
                        ? 'bg-amber-500/15 border-[#D4AF37] ring-1 ring-[#D4AF37]/50'
                        : 'bg-[#181D26] border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        serviceOption === 'custom' ? 'border-[#D4AF37] bg-[#D4AF37]' : 'border-slate-500'
                      }`}>
                        {serviceOption === 'custom' && <Check className="w-3 h-3 text-slate-950 stroke-[3]" />}
                      </div>
                      <span className="font-bold text-white text-xs">
                        {clientTodayAppointment ? 'Cobrar otro servicio del catálogo' : 'Cobrar servicio realizado en silla'}
                      </span>
                    </div>

                    {serviceOption === 'custom' && (
                      <div className="mt-2.5 pt-2 border-t border-white/10" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={selectedServiceId}
                          onChange={(e) => setSelectedServiceId(e.target.value)}
                          className="w-full p-2 rounded-xl bg-slate-900 border border-white/15 text-white font-medium text-xs focus:outline-none focus:border-[#D4AF37]"
                        >
                          {services.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name} - {formatCurrency(s.price)} ({s.durationMinutes} min)
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Option: No service (products only or points only) */}
                  <div
                    onClick={() => setServiceOption('none')}
                    className={`p-2.5 rounded-2xl border cursor-pointer transition-all ${
                      serviceOption === 'none'
                        ? 'bg-white/10 border-white/30'
                        : 'bg-[#181D26] border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        serviceOption === 'none' ? 'border-white bg-white' : 'border-slate-500'
                      }`}>
                        {serviceOption === 'none' && <Check className="w-3 h-3 text-slate-950 stroke-[3]" />}
                      </div>
                      <span className="text-slate-300 text-xs">Sin servicio (Solo registrar visita o productos)</span>
                    </div>
                  </div>
                </div>

                {/* 3. VENTA DE PRODUCTOS (POS RÁPIDO O ACCESO A POS COMPLETO) */}
                <div className="space-y-2 pt-1 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <ShoppingBag className="w-4 h-4 text-[#D4AF37]" />
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Productos Adicionales (POS)
                      </span>
                    </div>

                    {onOpenPosForClient && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenPosForClient(scannedClient);
                        }}
                        className="text-[10px] text-[#D4AF37] hover:text-[#E5B869] font-bold flex items-center gap-1 hover:underline"
                        title="Abrir terminal de venta completa con este cliente"
                      >
                        <span>Abrir POS Completo</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* Quick Product Selection Drawer */}
                  <div className="space-y-2">
                    {cartItems.length > 0 && (
                      <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-bold text-amber-200">
                          <span>Productos agregados ({cartItems.length}):</span>
                          <span>{formatCurrency(totalProductsPrice)}</span>
                        </div>
                        {cartItems.map((item) => (
                          <div key={item.productId} className="flex items-center justify-between text-xs text-white">
                            <span className="truncate pr-2">{item.productName}</span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => handleRemoveProduct(item.productId)}
                                className="w-5 h-5 rounded bg-white/10 flex items-center justify-center text-xs"
                              >
                                -
                              </button>
                              <span className="font-mono text-xs w-4 text-center">{item.quantity}</span>
                              <button
                                onClick={() => handleAddProduct(item.productId)}
                                className="w-5 h-5 rounded bg-white/10 flex items-center justify-center text-xs"
                              >
                                +
                              </button>
                              <span className="font-bold text-[#D4AF37] ml-1">
                                {formatCurrency(item.subtotal)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => setIsProductCatalogExpanded(!isProductCatalogExpanded)}
                      className="w-full py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-bold text-xs flex items-center justify-between transition-all"
                    >
                      <span className="flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-[#D4AF37]" />
                        <span>{isProductCatalogExpanded ? 'Ocultar Catálogo' : '+ Agregar Productos a la Venta'}</span>
                      </span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${isProductCatalogExpanded ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Expandable Product Grid */}
                    {isProductCatalogExpanded && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1 border border-white/10 rounded-2xl bg-black/40 animate-in fade-in">
                        {activeProducts.length === 0 ? (
                          <p className="text-slate-500 text-center col-span-2 py-3 text-xs">
                            No hay productos registrados en el catálogo.
                          </p>
                        ) : (
                          activeProducts.map((prod) => {
                            const inCart = productCart[prod.id] || 0;
                            const imgUrl = getProductImage(prod);
                            return (
                              <div
                                key={prod.id}
                                className="p-2 rounded-xl bg-[#181D26] border border-white/5 flex items-center justify-between gap-2"
                              >
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <img
                                    src={imgUrl}
                                    alt={prod.name}
                                    className="w-9 h-9 rounded-lg object-cover shrink-0 border border-white/10 bg-slate-900"
                                    referrerPolicy="no-referrer"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <h5 className="font-bold text-white text-[11px] truncate">{prod.name}</h5>
                                    <span className="text-[10px] text-[#D4AF37] font-semibold">
                                      {formatCurrency(prod.price)}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  {inCart > 0 && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveProduct(prod.id)}
                                        className="w-6 h-6 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center font-bold"
                                      >
                                        <Minus className="w-3 h-3" />
                                      </button>
                                      <span className="font-bold text-xs text-white w-4 text-center">
                                        {inCart}
                                      </span>
                                    </>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleAddProduct(prod.id)}
                                    className="w-6 h-6 rounded-lg bg-[#D4AF37] hover:bg-[#E5B869] text-slate-950 flex items-center justify-center font-bold"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* 4. PUNTOS AUTOMÁTICOS CALCULADOS */}
                <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-500/10 via-[#D4AF37]/15 to-transparent border border-[#D4AF37]/30 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                    <div>
                      <span className="font-bold text-white text-xs block">Puntos Acumulados Automáticos:</span>
                      <span className="text-[10px] text-slate-400">
                        {serviceOption !== 'none' ? '+50 pts servicio' : '0 pts serv'} • {productPointsEarned > 0 ? `+${productPointsEarned} pts prod (${productPointsPercentage}%)` : '0 pts prod'}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-base font-black text-[#D4AF37] block">
                      +{finalPointsToAdd} pts
                    </span>
                  </div>
                </div>

                {/* 5. MÉTODO DE PAGO */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Método de Pago
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['cash', 'card', 'transfer'] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setPaymentMethod(m)}
                        className={`py-2 px-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                          paymentMethod === m
                            ? 'bg-[#D4AF37] text-slate-950 border-[#D4AF37] shadow'
                            : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                        }`}
                      >
                        {m === 'cash' && <Banknote className="w-3.5 h-3.5" />}
                        {m === 'card' && <CreditCard className="w-3.5 h-3.5" />}
                        {m === 'transfer' && <Receipt className="w-3.5 h-3.5" />}
                        <span className="capitalize">{m === 'cash' ? 'Efectivo' : m === 'card' ? 'Tarjeta' : 'Transfer'}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 6. TOTAL Y BOTÓN DE ACCIÓN PRINCIPAL */}
                <div className="pt-2 border-t border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-400 block">Total a Cobrar:</span>
                      <span className="text-xl font-black text-white">
                        {formatCurrency(totalAmountToCharge)}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] text-teal-400 font-bold block">
                        +{visitsToAdd} Visita(s)
                      </span>
                      <span className="text-xs font-bold text-[#D4AF37]">
                        +{finalPointsToAdd} Puntos VIP
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={handleExecuteCheckout}
                    disabled={isSubmittingAction}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#996515] via-[#D4AF37] to-[#F3E5AB] hover:opacity-95 text-slate-950 font-black text-xs sm:text-sm shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-98"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>
                      {isSubmittingAction
                        ? 'Registrando...'
                        : `Cobrar ${formatCurrency(totalAmountToCharge)} y Registrar (+${visitsToAdd} Visita, +${finalPointsToAdd} Pts)`}
                    </span>
                  </button>
                </div>
              </div>

              {/* Direct Booking Option if client wants another future appointment */}
              {onBookForClient && (
                <button
                  onClick={() => {
                    onClose();
                    onBookForClient(scannedClient);
                  }}
                  className="w-full py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-bold text-xs flex items-center justify-center gap-2 transition-all"
                >
                  <Calendar className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>Agendar Próxima Cita para {scannedClient.name.split(' ')[0]}</span>
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
