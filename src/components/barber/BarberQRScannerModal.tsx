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
          colors: ['#9A6B3B', '#161514', '#C69765'],
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
  // 1. Visit Points: Earned when visits are added based on businessSettings.pointsPerVisit
  const pointsPerVisit = businessSettings.pointsPerVisit !== undefined ? businessSettings.pointsPerVisit : 0;
  const visitPointsEarned = visitsToAdd > 0 ? visitsToAdd * pointsPerVisit : 0;

  // 2. Service Points: ONLY earned when a service is actually charged (serviceOption !== 'none' && servicePrice > 0)
  const serviceRewardConfig = businessSettings.servicePointsReward !== undefined ? businessSettings.servicePointsReward : 50;
  const servicePointsEarned = (serviceOption !== 'none' && servicePrice > 0) ? serviceRewardConfig : 0;

  // 3. Product Points: ONLY earned when products are purchased (totalProductsPrice > 0)
  const pointsEnabled = businessSettings.enableProductPointsReward !== undefined ? businessSettings.enableProductPointsReward : true;
  const productPointsPercentage = businessSettings.productPointsPercentage !== undefined ? businessSettings.productPointsPercentage : 1;
  const productPointsEarned = pointsEnabled && totalProductsPrice > 0
    ? Math.max(1, Math.floor((totalProductsPrice * productPointsPercentage) / 100))
    : 0;

  // Total automatic points earned from this transaction
  const autoCalculatedPoints = visitPointsEarned + servicePointsEarned + productPointsEarned;
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
          colors: ['#047857', '#9A6B3B', '#161514'],
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
    <div className="fixed inset-0 z-50 bg-[#161514]/55 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-[#FAF9F6] border border-[#D2CBBF] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col my-auto max-h-[94vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[#E6E1D6] flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#161514] flex items-center justify-center text-[#C69765] shadow-sm">
              <QrCode className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-[#161514] uppercase tracking-wide flex items-center gap-2">
                <span>Lector QR & Cobro</span>
                <span className="font-sans normal-case text-[11px] font-bold px-2 py-0.5 rounded bg-[#FBF6EE] text-[#7D542B] border border-[#9A6B3B]/30">
                  {activeBarber.displayName.split(' ')[0]}
                </span>
              </h2>
              <p className="text-xs text-[#5C5852]">
                Escanear cliente para cobro, servicios, productos y puntos
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-[#F2EFE9] hover:bg-[#E8E3D9] border border-[#E6E1D6] text-[#161514] flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          {!scannedClient ? (
            /* 1. CAMERA SCANNER & MANUAL SEARCH VIEW */
            <div className="space-y-4">
              {/* Camera Viewfinder (kept dark behind live video for QR scan contrast) */}
              <div className="relative aspect-square max-h-[290px] w-full rounded-2xl overflow-hidden bg-[#161514] border border-[#D2CBBF] flex items-center justify-center shadow-inner">
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
                    <div className="relative w-48 h-48 sm:w-56 sm:h-56 border-2 border-[#C69765] rounded-2xl shadow-[0_0_25px_rgba(198,151,101,0.35)]">
                      <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-[#FAF9F6] rounded-tl-lg" />
                      <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-[#FAF9F6] rounded-tr-lg" />
                      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-[#FAF9F6] rounded-bl-lg" />
                      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-[#FAF9F6] rounded-br-lg" />
                      <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-[#C69765] to-transparent top-1/2 -translate-y-1/2 shadow-[0_0_10px_#C69765]" />
                    </div>
                  </div>
                )}

                {/* Camera Fallback / Error State */}
                {!cameraActive && (
                  <div className="absolute inset-0 p-6 flex flex-col items-center justify-center text-center space-y-3 bg-[#161514]/95">
                    <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-[#C69765]">
                      <Camera className="w-6 h-6" />
                    </div>
                    <p className="text-[#FAF9F6]/85 font-medium text-xs max-w-xs">
                      {cameraError || 'Iniciando cámara del dispositivo...'}
                    </p>
                    <button
                      type="button"
                      onClick={startCamera}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-[#FAF9F6] font-bold text-xs transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-[#C69765]" />
                      <span>Reintentar Cámara</span>
                    </button>
                  </div>
                )}

                {/* Live Scanner Indicator */}
                {cameraActive && (
                  <div className="absolute bottom-3 inset-x-4 flex justify-center">
                    <span className="px-3 py-1 rounded-full bg-[#161514]/85 backdrop-blur-md border border-white/15 text-[#FAF9F6] text-[11px] font-medium flex items-center gap-1.5">
                      <QrCode className="w-3 h-3 text-[#C69765]" />
                      Apunta al código QR del cliente
                    </span>
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-[#E6E1D6]" />
                <span className="flex-shrink mx-3 text-[#767067] text-[11px] uppercase tracking-wider font-semibold">
                  O búsqueda manual directa
                </span>
                <div className="flex-grow border-t border-[#E6E1D6]" />
              </div>

              {/* Manual Search Form */}
              <form onSubmit={handleManualSearch} className="space-y-2 bg-white p-3.5 rounded-2xl border border-[#E6E1D6]">
                <label className="text-[#161514] font-semibold block">
                  Ingresa No. de Cliente (6 dígitos) o Teléfono celular:
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#767067]" />
                    <input
                      type="text"
                      value={manualInput}
                      onChange={(e) => setManualInput(e.target.value)}
                      placeholder="Ej. 849201 o 3411975639"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#FAF9F6] border border-[#D2CBBF] text-[#161514] placeholder-[#8E887E] focus:outline-none focus:border-[#9A6B3B] font-mono text-xs"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSearching || !manualInput.trim()}
                    className="px-4 py-2.5 rounded-xl bg-[#161514] hover:bg-[#2A2826] text-[#FAF9F6] font-bold text-xs shadow-sm transition-all disabled:opacity-50 flex items-center gap-1"
                  >
                    {isSearching ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#C69765]" />
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
              <div className="w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-600 text-emerald-700 flex items-center justify-center mx-auto shadow-sm">
                <Check className="w-8 h-8 stroke-[3]" />
              </div>

              <div>
                <h3 className="font-display text-2xl font-bold text-[#161514] uppercase tracking-wide">
                  ¡Cobro y Registro Exitoso!
                </h3>
                <p className="text-xs text-[#5C5852] mt-1">
                  Atención completada para <strong className="text-[#9A6B3B]">{actionSuccessData.clientName}</strong>
                </p>
              </div>

              {/* Receipt Summary Card */}
              <div className="p-4 rounded-2xl bg-white border border-[#E6E1D6] space-y-2 text-left shadow-sm">
                <div className="flex justify-between items-center py-1.5 border-b border-[#E6E1D6]">
                  <span className="text-[#5C5852]">Monto Total Cobrado:</span>
                  <strong className="font-mono tabular-nums text-emerald-800 text-sm font-black">
                    {formatCurrency(actionSuccessData.totalCharged)}
                  </strong>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-[#E6E1D6]">
                  <span className="text-[#5C5852]">Puntos Sumados:</span>
                  <strong className="font-mono tabular-nums text-[#7D542B] font-black">
                    +{actionSuccessData.pointsEarned} pts
                  </strong>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-[#E6E1D6]">
                  <span className="text-[#5C5852]">Nuevo Saldo de Puntos:</span>
                  <span className="font-mono tabular-nums text-[#161514] font-bold">{actionSuccessData.newTotalPoints} pts</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-[#5C5852]">Total Visitas Acumuladas:</span>
                  <span className="font-mono tabular-nums text-emerald-700 font-bold">{actionSuccessData.newTotalVisits} visitas</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <button
                  onClick={handleScanAnother}
                  className="flex-1 py-2.5 rounded-xl bg-[#161514] hover:bg-[#2A2826] text-[#FAF9F6] font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-[#C69765]" />
                  <span>Escanear Otro Cliente</span>
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl bg-[#F2EFE9] hover:bg-[#E8E3D9] border border-[#D2CBBF] text-[#161514] font-semibold text-xs transition-all"
                >
                  Finalizar
                </button>
              </div>
            </div>
          ) : (
            /* 2. REDESIGNED ULTRA-CLEAN & FUNCTIONAL CLIENT CHECKOUT PANEL */
            <div className="space-y-3.5 animate-in fade-in">
              {/* COMPACT CLIENT HEADER */}
              <div className="p-3 rounded-2xl bg-white border border-[#9A6B3B]/40 flex items-center justify-between gap-3 shadow-sm">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-[#161514] p-0.5 shrink-0 shadow-sm">
                    {scannedClient.photoUrl ? (
                      <img
                        src={scannedClient.photoUrl}
                        alt={scannedClient.name}
                        className="w-full h-full rounded-[10px] object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full bg-[#FAF7F0] rounded-[10px] flex items-center justify-center text-[#9A6B3B] font-black text-sm">
                        {scannedClient.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <h3 className="font-bold text-[#161514] text-sm truncate">{scannedClient.name}</h3>
                    <div className="flex items-center gap-2 text-[11px] text-[#5C5852] mt-0.5">
                      <span className="text-[#7D542B] font-mono font-semibold tabular-nums">#{scannedClient.clientNumber || 'VIP'}</span>
                      {scannedClient.phone && (
                        <>
                          <span>•</span>
                          <span className="truncate font-mono tabular-nums">{scannedClient.phone}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Badges + Change Client Button */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <div className="text-[11px] font-mono tabular-nums font-bold text-[#7D542B] flex items-center justify-end gap-1">
                      <Sparkles className="w-3 h-3 text-[#9A6B3B]" />
                      <span>{scannedClient.points || 0} pts</span>
                    </div>
                    <div className="text-[11px] font-mono tabular-nums font-bold text-emerald-700 flex items-center justify-end gap-1">
                      <Award className="w-3 h-3 text-emerald-700" />
                      <span>{clientVisitsCount} vis.</span>
                    </div>
                  </div>

                  <button
                    onClick={handleScanAnother}
                    className="p-2 rounded-xl bg-[#F2EFE9] hover:bg-[#E8E3D9] border border-[#D2CBBF] text-[#161514] transition-colors"
                    title="Escanear otro cliente"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* 1. SERVICIO REALIZADO */}
              <div className="p-3.5 rounded-2xl bg-white border border-[#E6E1D6] space-y-2.5">
                <label className="text-[11px] font-bold text-[#5C5852] uppercase tracking-wider block">
                  1. Servicio Realizado
                </label>

                {clientTodayAppointment ? (
                  <div className="space-y-2">
                    <div
                      onClick={() => setServiceOption('booked')}
                      className={`p-2.5 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                        serviceOption === 'booked'
                          ? 'bg-[#FAF7F0] border-[#9A6B3B] ring-1 ring-[#9A6B3B]/30'
                          : 'bg-[#FAF9F6] border-[#E6E1D6] text-[#5C5852]'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                          serviceOption === 'booked' ? 'border-[#9A6B3B] bg-[#9A6B3B]' : 'border-[#D2CBBF] bg-white'
                        }`}>
                          {serviceOption === 'booked' && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-[#161514] text-xs block truncate">
                            Cita Agendada: {clientTodayAppointment.serviceNameSnapshot}
                          </span>
                          <span className="text-[11px] text-emerald-700 font-semibold font-mono tabular-nums">
                            Hoy {formatTime12h(clientTodayAppointment.startTime)}
                          </span>
                        </div>
                      </div>
                      <span className="font-mono tabular-nums font-black text-[#9A6B3B] text-xs shrink-0">
                        {formatCurrency(clientTodayAppointment.servicePriceSnapshot || 0)}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setServiceOption('custom')}
                        className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-semibold border transition-all ${
                          serviceOption === 'custom'
                            ? 'bg-[#161514] border-[#161514] text-[#FAF9F6] font-bold'
                            : 'bg-[#F2EFE9] border-[#D2CBBF] text-[#5C5852] hover:text-[#161514]'
                        }`}
                      >
                        Otro Servicio
                      </button>
                      <button
                        type="button"
                        onClick={() => setServiceOption('none')}
                        className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-semibold border transition-all ${
                          serviceOption === 'none'
                            ? 'bg-[#161514] border-[#161514] text-[#FAF9F6] font-bold'
                            : 'bg-[#F2EFE9] border-[#D2CBBF] text-[#5C5852] hover:text-[#161514]'
                        }`}
                      >
                        Sin Servicio
                      </button>
                    </div>

                    {serviceOption === 'custom' && (
                      <select
                        value={selectedServiceId}
                        onChange={(e) => setSelectedServiceId(e.target.value)}
                        className="w-full p-2.5 rounded-xl bg-[#FAF9F6] border border-[#D2CBBF] text-[#161514] font-medium text-xs focus:outline-none focus:border-[#9A6B3B]"
                      >
                        {services.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} - {formatCurrency(s.price)}
                          </option>
                        ))}
                      </select>
                    )}

                    {serviceOption === 'booked' && (
                      <label className="flex items-center gap-2 pt-1 text-[11px] text-[#5C5852] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={markAppointmentCompleted}
                          onChange={(e) => setMarkAppointmentCompleted(e.target.checked)}
                          className="rounded border-[#D2CBBF] text-[#9A6B3B] focus:ring-[#9A6B3B]"
                        />
                        <span>Marcar cita en agenda como completada</span>
                      </label>
                    )}
                  </div>
                ) : (
                  <select
                    value={serviceOption === 'none' ? 'none' : selectedServiceId}
                    onChange={(e) => {
                      if (e.target.value === 'none') {
                        setServiceOption('none');
                      } else {
                        setServiceOption('custom');
                        setSelectedServiceId(e.target.value);
                      }
                    }}
                    className="w-full p-2.5 rounded-xl bg-[#FAF9F6] border border-[#D2CBBF] text-[#161514] font-medium text-xs focus:outline-none focus:border-[#9A6B3B]"
                  >
                    <option value="none">-- Sin servicio (Solo registrar visita o productos) --</option>
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} - {formatCurrency(s.price)}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* 2. VISITAS & PRODUCTOS COMPACT ROW */}
              <div className="grid grid-cols-2 gap-2.5">
                {/* VISITA COUNTER */}
                <div className="p-3 rounded-2xl bg-white border border-[#E6E1D6] flex flex-col justify-between">
                  <span className="text-[11px] font-bold text-[#5C5852] uppercase tracking-wider block">
                    Visitas a Sumar
                  </span>
                  <div className="flex items-center justify-between mt-2">
                    <button
                      type="button"
                      onClick={() => setVisitsToAdd(Math.max(0, visitsToAdd - 1))}
                      className="w-7 h-7 rounded-lg bg-[#F2EFE9] hover:bg-[#E8E3D9] border border-[#D2CBBF] text-[#161514] flex items-center justify-center font-bold"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-mono tabular-nums font-bold text-sm text-emerald-700">
                      +{visitsToAdd} Visita
                    </span>
                    <button
                      type="button"
                      onClick={() => setVisitsToAdd(visitsToAdd + 1)}
                      className="w-7 h-7 rounded-lg bg-[#F2EFE9] hover:bg-[#E8E3D9] border border-[#D2CBBF] text-[#161514] flex items-center justify-center font-bold"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* PRODUCTOS TOGGLE BUTTON */}
                <div className="p-3 rounded-2xl bg-white border border-[#E6E1D6] flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#5C5852] uppercase tracking-wider">
                      Productos
                    </span>
                    {totalProductsPrice > 0 && (
                      <span className="font-mono tabular-nums text-[11px] font-black text-[#9A6B3B]">
                        {formatCurrency(totalProductsPrice)}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsProductCatalogExpanded(!isProductCatalogExpanded)}
                    className={`mt-2 py-1.5 px-2 rounded-xl border text-[11px] font-bold flex items-center justify-center gap-1 transition-all ${
                      cartItems.length > 0 || isProductCatalogExpanded
                        ? 'bg-[#161514] text-[#FAF9F6] border-[#161514]'
                        : 'bg-[#F2EFE9] border-[#D2CBBF] text-[#161514] hover:bg-[#E8E3D9]'
                    }`}
                  >
                    <Package className={`w-3 h-3 ${cartItems.length > 0 || isProductCatalogExpanded ? 'text-[#C69765]' : 'text-[#9A6B3B]'}`} />
                    <span>{cartItems.length > 0 ? `${cartItems.length} prod.` : '+ Agregar'}</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isProductCatalogExpanded ? 'rotate-180' : ''}`} />
                  </button>
                </div>
              </div>

              {/* EXPANDABLE PRODUCTS MINI-CATALOG */}
              {isProductCatalogExpanded && (
                <div className="p-3 rounded-2xl bg-[#F2EFE9] border border-[#D2CBBF] space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#161514]">Seleccionar Productos:</span>
                    {onOpenPosForClient && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenPosForClient(scannedClient);
                        }}
                        className="text-[11px] text-[#7D542B] font-bold hover:underline flex items-center gap-1"
                      >
                        <span>Abrir POS</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1">
                    {activeProducts.length === 0 ? (
                      <p className="text-[#767067] text-center col-span-2 py-2 text-xs">
                        No hay productos disponibles.
                      </p>
                    ) : (
                      activeProducts.map((prod) => {
                        const inCart = productCart[prod.id] || 0;
                        const imgUrl = getProductImage(prod);
                        return (
                          <div
                            key={prod.id}
                            className={`p-2 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                              inCart > 0 ? 'bg-[#FAF7F0] border-[#9A6B3B]' : 'bg-white border-[#E6E1D6]'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <img
                                src={imgUrl}
                                alt={prod.name}
                                className="w-8 h-8 rounded-lg object-cover shrink-0 border border-[#E6E1D6] bg-[#F2EFE9]"
                                referrerPolicy="no-referrer"
                              />
                              <div className="min-w-0 flex-1">
                                <h5 className="font-bold text-[#161514] text-[11px] truncate">{prod.name}</h5>
                                <span className="font-mono tabular-nums text-[10px] text-[#9A6B3B] font-semibold">
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
                                    className="w-5 h-5 rounded bg-[#F2EFE9] hover:bg-[#E8E3D9] border border-[#D2CBBF] text-[#161514] flex items-center justify-center font-bold text-xs"
                                  >
                                    -
                                  </button>
                                  <span className="font-mono tabular-nums font-bold text-xs text-[#161514] w-3.5 text-center">
                                    {inCart}
                                  </span>
                                </>
                              )}
                              <button
                                type="button"
                                onClick={() => handleAddProduct(prod.id)}
                                className="w-5 h-5 rounded bg-[#161514] hover:bg-[#2A2826] text-[#FAF9F6] flex items-center justify-center font-bold text-xs"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* 3. MÉTODO DE PAGO */}
              <div className="p-3 rounded-2xl bg-white border border-[#E6E1D6] space-y-2">
                <span className="text-[11px] font-bold text-[#5C5852] uppercase tracking-wider block">
                  2. Método de Pago
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {(['cash', 'card', 'transfer'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPaymentMethod(m)}
                      className={`py-2 px-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                        paymentMethod === m
                          ? 'bg-[#161514] text-[#FAF9F6] border-[#161514] shadow-sm'
                          : 'bg-[#FAF9F6] border-[#D2CBBF] text-[#5C5852] hover:text-[#161514]'
                      }`}
                    >
                      {m === 'cash' && <Banknote className={`w-3.5 h-3.5 ${paymentMethod === m ? 'text-[#C69765]' : ''}`} />}
                      {m === 'card' && <CreditCard className={`w-3.5 h-3.5 ${paymentMethod === m ? 'text-[#C69765]' : ''}`} />}
                      {m === 'transfer' && <Receipt className={`w-3.5 h-3.5 ${paymentMethod === m ? 'text-[#C69765]' : ''}`} />}
                      <span>{m === 'cash' ? 'Efectivo' : m === 'card' ? 'Tarjeta' : 'Transfer'}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. TOTAL A COBRAR CON DESGLOSE DETALLADO */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-[#D2CBBF] space-y-3 shadow-sm">
                {/* Header with Title */}
                <div className="flex items-center justify-between border-b border-[#E6E1D6] pb-2">
                  <div className="flex items-center gap-1.5">
                    <Receipt className="w-4 h-4 text-[#9A6B3B]" />
                    <span className="text-[11px] font-bold text-[#161514] uppercase tracking-wider">
                      Detalle de Cobro
                    </span>
                  </div>
                  <span className="text-[11px] text-[#5C5852] font-semibold font-mono tabular-nums">
                    {cartItems.length + (serviceOption !== 'none' && servicePrice > 0 ? 1 : 0)} concepto(s)
                  </span>
                </div>

                {/* Itemized List */}
                <div className="space-y-1.5 text-xs">
                  {/* Service Line Item if selected */}
                  {serviceOption !== 'none' && servicePrice > 0 ? (
                    <div className="flex items-center justify-between p-2 rounded-xl bg-[#FAF9F6] border border-[#E6E1D6]">
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <Scissors className="w-3.5 h-3.5 text-[#9A6B3B] shrink-0" />
                        <div className="min-w-0">
                          <span className="font-semibold text-[#161514] block truncate text-[11px]">
                            {serviceName || 'Servicio en Silla'}
                          </span>
                          <span className="text-[10px] text-[#5C5852]">
                            1x Servicio {servicePointsEarned > 0 ? `(+${servicePointsEarned} pts)` : ''}
                          </span>
                        </div>
                      </div>
                      <span className="font-mono tabular-nums font-bold text-[#161514] shrink-0 text-xs">
                        {formatCurrency(servicePrice)}
                      </span>
                    </div>
                  ) : null}

                  {/* Product Line Items */}
                  {cartItems.map((item) => (
                    <div key={item.productId} className="flex items-center justify-between p-2 rounded-xl bg-[#FAF9F6] border border-[#E6E1D6]">
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <Package className="w-3.5 h-3.5 text-[#9A6B3B] shrink-0" />
                        <div className="min-w-0">
                          <span className="font-semibold text-[#161514] block truncate text-[11px]">
                            {item.productName}
                          </span>
                          <span className="text-[10px] text-[#5C5852] font-mono tabular-nums">
                            {item.quantity}x a {formatCurrency(item.price)}
                          </span>
                        </div>
                      </div>
                      <span className="font-mono tabular-nums font-bold text-[#161514] shrink-0 text-xs">
                        {formatCurrency(item.subtotal)}
                      </span>
                    </div>
                  ))}

                  {/* Fallback if no service and no products */}
                  {serviceOption === 'none' && cartItems.length === 0 && (
                    <div className="p-2.5 rounded-xl bg-[#FAF9F6] border border-dashed border-[#D2CBBF] text-center text-[#5C5852] text-xs">
                      <span>Solo registro de visita • Sin cobro de servicio ni productos ($0)</span>
                    </div>
                  )}
                </div>

                {/* Total Row */}
                <div className="pt-2 border-t border-[#E6E1D6] flex items-baseline justify-between">
                  <div>
                    <span className="text-[11px] text-[#5C5852] block font-semibold uppercase tracking-wider">
                      Total a Cobrar:
                    </span>
                    <span className="font-mono tabular-nums text-xl sm:text-2xl font-black text-[#161514] tracking-tight">
                      {formatCurrency(totalAmountToCharge)}
                    </span>
                  </div>

                  <div className="text-right space-y-0.5">
                    <div className="font-mono tabular-nums text-xs font-black text-[#7D542B] flex items-center justify-end gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-[#9A6B3B]" />
                      <span>+{finalPointsToAdd} pts VIP</span>
                    </div>
                    <span className="font-mono tabular-nums text-[11px] text-emerald-700 font-semibold block">
                      +{visitsToAdd} Visita al cliente
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleExecuteCheckout}
                  disabled={isSubmittingAction}
                  className="w-full py-3 rounded-xl bg-[#161514] hover:bg-[#2A2826] text-[#FAF9F6] font-bold text-xs sm:text-sm shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-98"
                >
                  <Check className="w-4 h-4 stroke-[3] text-[#C69765]" />
                  <span>
                    {isSubmittingAction
                      ? 'Procesando...'
                      : totalAmountToCharge > 0
                      ? `Cobrar ${formatCurrency(totalAmountToCharge)} y Registrar (+${visitsToAdd} Visita, +${finalPointsToAdd} Pts)`
                      : `Registrar Visita (+${visitsToAdd} Visita, 0 Pts)`}
                  </span>
                </button>
              </div>

              {/* AGENDAR PRÓXIMA CITA DIRECTA */}
              {onBookForClient && (
                <button
                  onClick={() => {
                    onClose();
                    onBookForClient(scannedClient);
                  }}
                  className="w-full py-2.5 rounded-xl bg-[#F2EFE9] hover:bg-[#E8E3D9] border border-[#D2CBBF] text-[#161514] font-semibold text-xs flex items-center justify-center gap-1.5 transition-all"
                >
                  <Calendar className="w-3.5 h-3.5 text-[#9A6B3B]" />
                  <span>Agendar Próxima Cita</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:p-4 border-t border-[#E6E1D6] bg-white flex items-center justify-between">
          <span className="text-[11px] text-[#5C5852]">
            {scannedClient ? `Cliente: ${scannedClient.name}` : 'Alinea el código QR dentro del recuadro'}
          </span>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#F2EFE9] hover:bg-[#E8E3D9] border border-[#D2CBBF] text-[#161514] text-xs font-semibold transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
