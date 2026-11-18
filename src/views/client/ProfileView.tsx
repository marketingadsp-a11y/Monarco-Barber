import React, { useState, useEffect } from 'react';
import {
  User,
  Phone,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  LogOut,
  Save,
  CheckCircle2,
  AlertCircle,
  QrCode as QrIcon,
  CreditCard,
  Crown,
  ChevronLeft,
  Calendar,
  ShieldCheck,
  Upload,
  RefreshCw,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth, isAdminIdentifier } from '../../contexts/AuthContext';
import { useBarbershop } from '../../contexts/BarbershopContext';
import { Barber, UserProfile } from '../../types';
import { dataService } from '../../services/firebase/dataService';
import { imageService } from '../../services/imgbb/imageService';
import { ClientMembershipCard } from '../../components/common/ClientMembershipCard';
import { ClientQRModal } from '../../components/common/ClientQRModal';

interface ProfileViewProps {
  onOpenBarberProfile: (barber: Barber) => void;
  onStartBookingWithBarber: (barberId: string) => void;
  onNavigateTab?: (tab: 'home' | 'barbers' | 'book' | 'appointments' | 'profile') => void;
}

type AuthTab = 'login' | 'register';

export const ProfileView: React.FC<ProfileViewProps> = ({
  onOpenBarberProfile,
  onStartBookingWithBarber,
  onNavigateTab,
}) => {
  const {
    userProfile,
    currentRole,
    isAuthenticated,
    loginWithPhoneOrClientNumber,
    registerWithCard,
    logout,
    updateUserPreferences,
  } = useAuth();
  const { barbers, businessSettings, showToast } = useBarbershop();

  // Navigation tab for unauthenticated user: 'login' | 'register'
  const [authTab, setAuthTab] = useState<AuthTab>('login');

  // --- LOGIN STATE ---
  const [loginStep, setLoginStep] = useState<1 | 2>(1);
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [matchedUser, setMatchedUser] = useState<UserProfile | null>(null);
  const [loginPin, setLoginPin] = useState('');
  const [showLoginPin, setShowLoginPin] = useState(false);

  // --- REGISTRATION STATE ---
  const [registerStep, setRegisterStep] = useState<1 | 2>(1);
  const [newClientNumber, setNewClientNumber] = useState('');
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPin, setRegPin] = useState('');
  const [showRegPin, setShowRegPin] = useState(false);

  // --- PROFILE EDIT STATE ---
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(userProfile?.name || '');
  const [editPhone, setEditPhone] = useState(userProfile?.phone || '');
  const [editPin, setEditPin] = useState(userProfile?.pin || '');
  const [editPhotoUrl, setEditPhotoUrl] = useState(userProfile?.photoUrl || '');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // --- FULL SCREEN QR MODAL ---
  const [showQrModal, setShowQrModal] = useState(false);

  // Loading & Error states
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Generate a preview 6-digit client number on mount for new registrations
  useEffect(() => {
    if (!isAuthenticated) {
      dataService.generateUniqueClientNumber().then((num) => {
        setNewClientNumber(num);
      });
    }
  }, [isAuthenticated]);

  // Sync edit form with userProfile
  useEffect(() => {
    if (userProfile) {
      setEditName(userProfile.name || '');
      setEditPhone(userProfile.phone || '');
      setEditPin(userProfile.pin || '');
      setEditPhotoUrl(userProfile.photoUrl || '');
    }
  }, [userProfile]);

  const favoriteBarbers = barbers.filter((b) =>
    userProfile?.favoriteBarberIds?.includes(b.id)
  );

  // --- LOGIN STEP 1: VERIFY IDENTIFIER ---
  const handleVerifyLoginIdentifier = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    const clean = loginIdentifier.trim();
    if (!clean) {
      setAuthError('Ingresa tu número celular (10 dígitos) o tu No. de cliente (6 dígitos).');
      return;
    }

    setIsLoadingAuth(true);
    try {
      // Check admin shortcut or normal user
      if (isAdminIdentifier(clean)) {
        const existing = await dataService.findUserByIdentifier(clean);
        if (existing) {
          existing.role = 'admin';
          setMatchedUser(existing);
        } else {
          const digits = clean.replace(/\D/g, '');
          const tenDigits = digits.startsWith('52') && digits.length === 12 ? digits.substring(2) : digits;
          const formattedPhone = tenDigits.length === 10
            ? `+52 ${tenDigits.substring(0, 2)} ${tenDigits.substring(2, 6)} ${tenDigits.substring(6)}`
            : '+52 34 1197 5639';
          setMatchedUser({
            id: `usr_${tenDigits || 'admin'}`,
            role: 'admin',
            name: 'Administrador Monarca',
            phone: formattedPhone,
            clientNumber: tenDigits === '5512345678' ? '000000' : (tenDigits.slice(-6) || '341197'),
            pin: '1234',
            active: true,
            createdAt: new Date().toISOString(),
          });
        }
        setLoginStep(2);
        return;
      }

      const user = await dataService.findUserByIdentifier(clean);
      if (!user) {
        setAuthError(
          'No encontramos ninguna cuenta con este celular o número de cliente. Si eres nuevo, obtén tu tarjeta en la pestaña "Soy Nuevo".'
        );
        return;
      }

      setMatchedUser(user);
      setLoginStep(2);
    } catch (err: any) {
      setAuthError(err.message || 'Error al verificar tus datos.');
    } finally {
      setIsLoadingAuth(false);
    }
  };

  // --- LOGIN STEP 2: VERIFY 4-DIGIT PIN ---
  const handleLoginWithPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (loginPin.length !== 4) {
      setAuthError('La contraseña debe tener exactamente 4 dígitos numéricos.');
      return;
    }

    setIsLoadingAuth(true);
    try {
      await loginWithPhoneOrClientNumber(loginIdentifier, loginPin);
      showToast('success', '¡Bienvenido!', 'Has iniciado sesión correctamente.');
    } catch (err: any) {
      setAuthError(err.message || 'Contraseña incorrecta.');
    } finally {
      setIsLoadingAuth(false);
    }
  };

  // --- REGISTRATION SUBMIT ---
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (!regName.trim()) {
      setAuthError('Por favor escribe tu nombre completo.');
      return;
    }
    const cleanPhone = regPhone.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      setAuthError('El número celular debe tener 10 dígitos numéricos.');
      return;
    }
    if (regPin.length !== 4) {
      setAuthError('La contraseña debe tener exactamente 4 dígitos numéricos.');
      return;
    }

    setIsLoadingAuth(true);
    try {
      await registerWithCard({
        name: regName.trim(),
        phone: cleanPhone,
        pin: regPin,
        clientNumber: newClientNumber,
      });

      // Golden Celebration Confetti
      try {
        confetti({
          particleCount: 120,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#9A6B3B', '#C69765', '#161514', '#FAF9F6'],
        });
      } catch {
        // ignore
      }

      showToast('success', '¡Tarjeta Creada!', 'Tu tarjeta digital Monarca está lista.');
    } catch (err: any) {
      setAuthError(err.message || 'Error al crear tu tarjeta de cliente.');
    } finally {
      setIsLoadingAuth(false);
    }
  };

  // --- EDIT PROFILE HANDLER ---
  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      if (editPin && editPin.length !== 4) {
        throw new Error('El NIP de acceso debe tener exactamente 4 dígitos numéricos.');
      }

      await updateUserPreferences({
        name: editName.trim(),
        phone: editPhone.trim(),
        pin: editPin.trim() || undefined,
        photoUrl: editPhotoUrl.trim(),
      });
      setIsEditing(false);
      showToast('success', 'Perfil Actualizado', 'Tus datos han sido guardados.');
    } catch (err: any) {
      showToast('error', 'Error', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhotoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    try {
      const uploadedUrl = await imageService.uploadImage(file);
      setEditPhotoUrl(uploadedUrl);
      showToast('success', 'Foto Cargada', 'Tu foto ha sido subida correctamente.');
    } catch (err: any) {
      showToast('error', 'Error al subir foto', err.message);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  return (
    <div className="space-y-5 pb-28 max-w-lg mx-auto px-1 sm:px-0 pt-1">
      {/* ========================================================================= */}
      {/* 1. NOT AUTHENTICATED: LOGIN / SOY NUEVO FLOW */}
      {/* ========================================================================= */}
      {!isAuthenticated && (
        <div className="rounded-3xl bg-white border border-[#E6E1D6] p-4 sm:p-6 space-y-5 shadow-[0_12px_32px_rgba(22,21,20,0.06)]">
          {/* TAB SWITCHER */}
          <div className="flex p-1 rounded-xl bg-[#F2EFE9] border border-[#E6E1D6]">
            <button
              onClick={() => {
                setAuthTab('login');
                setLoginStep(1);
                setAuthError(null);
              }}
              className={`flex-1 py-2.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
                authTab === 'login'
                  ? 'bg-[#161514] text-[#FAF9F6] shadow-sm'
                  : 'text-[#5C5852] hover:text-[#161514]'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Iniciar Sesión</span>
            </button>
            <button
              onClick={() => {
                setAuthTab('register');
                setRegisterStep(1);
                setAuthError(null);
              }}
              className={`flex-1 py-2.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
                authTab === 'register'
                  ? 'bg-[#161514] text-[#FAF9F6] shadow-sm'
                  : 'text-[#5C5852] hover:text-[#161514]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Soy Nuevo</span>
            </button>
          </div>

          {/* ERROR MESSAGE BOX */}
          {authError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">{authError}</div>
            </div>
          )}

          {/* FLOW A: INICIAR SESIÓN */}
          {authTab === 'login' && (
            <div className="space-y-4">
              {loginStep === 1 ? (
                <form onSubmit={handleVerifyLoginIdentifier} className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-[#161514] block mb-1.5">
                      Ingresa tu Celular, No. de Cliente o Código de Acceso
                    </label>
                    <div className="relative">
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-[#5C5852]">
                        <Phone className="w-4 h-4 text-[#9A6B3B]" />
                      </div>
                      <input
                        type="text"
                        inputMode="text"
                        value={loginIdentifier}
                        onChange={(e) => setLoginIdentifier(e.target.value)}
                        placeholder="Ej. 55 1234 5678 o 849201"
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#FAF9F6] border border-[#E6E1D6] text-[#161514] placeholder-[#5C5852]/60 text-sm font-mono tracking-wider tabular-nums focus:outline-none focus:border-[#9A6B3B] transition-all"
                        required
                        autoFocus
                      />
                    </div>
                    <p className="text-[11px] text-[#5C5852] mt-1.5">
                      Ingresa tus 10 dígitos de celular, tu No. de cliente o código de barbero.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={!loginIdentifier.trim() || isLoadingAuth}
                    className="w-full py-3.5 rounded-xl bg-[#161514] hover:bg-[#2A2826] text-[#FAF9F6] font-semibold text-xs active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isLoadingAuth ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <span>Siguiente</span>
                        <ArrowRight className="w-4 h-4 text-[#C69765]" />
                      </>
                    )}
                  </button>

                  <div className="pt-3 text-center border-t border-[#E6E1D6]">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthTab('register');
                        setAuthError(null);
                      }}
                      className="text-xs text-[#9A6B3B] hover:text-[#161514] hover:underline font-semibold"
                    >
                      ¿Eres nuevo? Crea tu Tarjeta de Cliente Digital aquí
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleLoginWithPin} className="space-y-4 animate-in fade-in">
                  <div className="p-3.5 rounded-xl bg-[#F2EFE9] border border-[#E6E1D6] flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-[#5C5852] uppercase font-semibold tracking-wider block">
                        Titular de la cuenta
                      </span>
                      <p className="font-display text-lg font-bold text-[#161514] uppercase tracking-wide">
                        {matchedUser?.name || 'Cliente'}
                      </p>
                      {matchedUser?.clientNumber && (
                        <p className="text-[11px] text-[#9A6B3B] font-mono tabular-nums">
                          No. Cliente: {matchedUser.clientNumber}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setLoginStep(1);
                        setLoginPin('');
                        setAuthError(null);
                      }}
                      className="text-xs text-[#161514] hover:bg-[#E6E1D6] px-3 py-1.5 rounded-lg bg-white border border-[#E6E1D6] font-medium"
                    >
                      Cambiar
                    </button>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[#161514] block mb-2 text-center">
                      Ingresa tu contraseña de 4 dígitos numéricos
                    </label>
                    <div className="relative max-w-[200px] mx-auto">
                      <input
                        type={showLoginPin ? 'text' : 'password'}
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={4}
                        value={loginPin}
                        onChange={(e) =>
                          setLoginPin(e.target.value.replace(/\D/g, '').slice(0, 4))
                        }
                        placeholder="••••"
                        className="w-full text-center tracking-[0.5em] text-2xl font-mono py-3 rounded-xl bg-[#FAF9F6] border-2 border-[#9A6B3B]/60 text-[#161514] focus:outline-none focus:border-[#9A6B3B] tabular-nums"
                        required
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPin(!showLoginPin)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5C5852] hover:text-[#161514]"
                      >
                        {showLoginPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[11px] text-[#5C5852] text-center mt-2">
                      Teclado numérico · 4 dígitos de seguridad
                    </p>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setLoginStep(1);
                        setLoginPin('');
                        setAuthError(null);
                      }}
                      className="px-4 py-3 rounded-xl bg-[#F2EFE9] hover:bg-[#E6E1D6] text-[#161514] text-xs font-semibold"
                    >
                      Atrás
                    </button>
                    <button
                      type="submit"
                      disabled={loginPin.length !== 4 || isLoadingAuth}
                      className="flex-1 py-3.5 rounded-xl bg-[#161514] hover:bg-[#2A2826] text-[#FAF9F6] font-semibold text-xs active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isLoadingAuth ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-[#C69765]" />
                          <span>Iniciar Sesión</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* FLOW B: SOY NUEVO */}
          {authTab === 'register' && (
            <div className="space-y-4">
              {registerStep === 1 ? (
                <div className="space-y-4 text-center">
                  <div className="p-1">
                    <ClientMembershipCard
                      name={regName || 'TU NOMBRE AQUÍ'}
                      clientNumber={newClientNumber || '849201'}
                      tier="VIP CLUB"
                      points={100}
                    />
                  </div>

                  <div className="p-4 rounded-2xl bg-[#F2EFE9] border border-[#9A6B3B]/30 text-xs text-[#161514] text-left space-y-1.5">
                    <div className="flex items-center gap-2 font-display text-base font-bold uppercase tracking-wide text-[#9A6B3B]">
                      <Crown className="w-4 h-4" />
                      <span>Beneficios de tu Tarjeta Monarca</span>
                    </div>
                    <p className="text-[11px] text-[#5C5852]">
                      · Código QR único para identificarte y agendar al instante.
                    </p>
                    <p className="text-[11px] text-[#5C5852]">
                      · 100 Puntos de regalo de bienvenida.
                    </p>
                    <p className="text-[11px] text-[#5C5852]">
                      · Acceso rápido solo con tu celular y NIP de 4 dígitos.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setRegisterStep(2);
                      setAuthError(null);
                    }}
                    className="w-full py-3.5 rounded-xl bg-[#161514] hover:bg-[#2A2826] text-[#FAF9F6] font-semibold text-xs active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4 text-[#C69765]" />
                    <span>Obtener mi Tarjeta de Cliente</span>
                    <ArrowRight className="w-4 h-4 text-[#C69765]" />
                  </button>
                </div>
              ) : (
                <form onSubmit={handleRegisterSubmit} className="space-y-4 animate-in fade-in">
                  <div className="p-1 transform scale-95 sm:scale-100 origin-top">
                    <ClientMembershipCard
                      name={regName || 'TU NOMBRE'}
                      clientNumber={newClientNumber || '849201'}
                      tier="VIP CLUB"
                      points={100}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[#161514] block mb-1">
                      Nombre Completo
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-[#5C5852] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        placeholder="Ej. Rodrigo Mendoza"
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#FAF9F6] border border-[#E6E1D6] text-[#161514] text-xs focus:outline-none focus:border-[#9A6B3B] uppercase tracking-wide"
                        required
                        autoFocus
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[#161514] block mb-1">
                      Número Celular (10 dígitos)
                    </label>
                    <div className="flex items-center rounded-xl bg-[#FAF9F6] border border-[#E6E1D6] overflow-hidden focus-within:border-[#9A6B3B]">
                      <div className="flex items-center gap-1 px-3 py-2.5 bg-[#F2EFE9] border-r border-[#E6E1D6] text-xs font-bold text-[#161514] shrink-0">
                        <span>🇲🇽</span>
                        <span>+52</span>
                      </div>
                      <input
                        type="tel"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={10}
                        value={regPhone}
                        onChange={(e) =>
                          setRegPhone(e.target.value.replace(/\D/g, '').slice(0, 10))
                        }
                        placeholder="55 1234 5678"
                        className="w-full px-3 py-2.5 bg-transparent text-[#161514] text-xs font-mono tracking-widest tabular-nums focus:outline-none"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[#161514] block mb-1">
                      Contraseña de 4 dígitos numéricos (NIP de acceso)
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-[#5C5852] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type={showRegPin ? 'text' : 'password'}
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={4}
                        value={regPin}
                        onChange={(e) =>
                          setRegPin(e.target.value.replace(/\D/g, '').slice(0, 4))
                        }
                        placeholder="4 dígitos numéricos"
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#FAF9F6] border border-[#E6E1D6] text-[#161514] text-xs font-mono tracking-[0.3em] tabular-nums focus:outline-none focus:border-[#9A6B3B]"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPin(!showRegPin)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5C5852] hover:text-[#161514]"
                      >
                        {showRegPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[10px] text-[#5C5852] mt-1">
                      Solo 4 números que recordarás fácilmente al ingresar.
                    </p>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setRegisterStep(1)}
                      className="px-4 py-3 rounded-xl bg-[#F2EFE9] hover:bg-[#E6E1D6] text-[#161514] text-xs font-semibold"
                    >
                      Atrás
                    </button>
                    <button
                      type="submit"
                      disabled={
                        !regName.trim() ||
                        regPhone.replace(/\D/g, '').length !== 10 ||
                        regPin.length !== 4 ||
                        isLoadingAuth
                      }
                      className="flex-1 py-3.5 rounded-xl bg-[#161514] hover:bg-[#2A2826] text-[#FAF9F6] font-semibold text-xs active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isLoadingAuth ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-[#C69765]" />
                          <span>Activar y Guardar mi Tarjeta</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. AUTHENTICATED: DIGITAL CARD & ACCOUNT DASHBOARD */}
      {/* ========================================================================= */}
      {isAuthenticated && userProfile && (
        <div className="space-y-6">
          <div className="relative group cursor-pointer" onClick={() => setShowQrModal(true)}>
            <ClientMembershipCard
              name={userProfile.name}
              phone={userProfile.phone}
              clientNumber={userProfile.clientNumber || '000000'}
              tier={userProfile.membershipTier || (currentRole === 'admin' ? 'ADMIN VIP' : 'VIP CLUB')}
              points={userProfile.points ?? 100}
              memberSince={userProfile.createdAt}
            />
            <div className="mt-2.5 text-center">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#9A6B3B] hover:text-[#161514] hover:underline">
                <QrIcon className="w-3.5 h-3.5" />
                <span>Toca para ver el Código QR en grande</span>
              </span>
            </div>
          </div>

          <div className="rounded-2xl bg-white border border-[#E6E1D6] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-[#F2EFE9] border border-[#9A6B3B]/45 flex items-center justify-center">
                  {userProfile.photoUrl ? (
                    <img
                      src={userProfile.photoUrl}
                      alt={userProfile.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <User className="w-6 h-6 text-[#9A6B3B]" />
                  )}
                </div>
                <div>
                  <h3 className="font-display text-xl font-bold text-[#161514] uppercase tracking-wide">
                    {userProfile.name}
                  </h3>
                  <p className="text-xs text-[#5C5852] font-mono tabular-nums mt-0.5">
                    {userProfile.phone || 'Sin celular'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsEditing(!isEditing)}
                className="px-3.5 py-2 rounded-xl bg-[#F2EFE9] hover:bg-[#E6E1D6] text-xs font-semibold text-[#161514] border border-[#E6E1D6] transition-colors whitespace-nowrap"
              >
                {isEditing ? 'Cerrar' : 'Editar Datos'}
              </button>
            </div>

            {isEditing && (
              <div className="pt-4 border-t border-[#E6E1D6] space-y-3.5 animate-in fade-in">
                <div>
                  <label className="text-xs font-semibold text-[#5C5852] block mb-1">
                    Nombre Completo
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#FAF9F6] border border-[#E6E1D6] text-[#161514] text-xs focus:outline-none focus:border-[#9A6B3B]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#5C5852] block mb-1">
                    Teléfono Celular
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#FAF9F6] border border-[#E6E1D6] text-[#161514] text-xs font-mono tabular-nums focus:outline-none focus:border-[#9A6B3B]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#5C5852] block mb-1">
                    Cambiar Contraseña / NIP (4 dígitos numéricos)
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={editPin}
                    onChange={(e) =>
                      setEditPin(e.target.value.replace(/\D/g, '').slice(0, 4))
                    }
                    placeholder="••••"
                    className="w-full p-2.5 rounded-xl bg-[#FAF9F6] border border-[#E6E1D6] text-[#161514] font-mono tracking-widest text-xs tabular-nums focus:outline-none focus:border-[#9A6B3B]"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[#5C5852] block">
                    Foto de Perfil
                  </label>
                  <div className="flex items-center gap-3">
                    {editPhotoUrl && (
                      <img
                        src={editPhotoUrl}
                        alt="Preview"
                        className="w-12 h-12 rounded-xl object-cover border border-[#9A6B3B]/40"
                        referrerPolicy="no-referrer"
                      />
                    )}
                    <label className="flex-1 flex items-center justify-center gap-2 p-2.5 rounded-xl bg-[#F2EFE9] hover:bg-[#E6E1D6] border border-[#E6E1D6] text-xs font-semibold text-[#161514] cursor-pointer transition-colors">
                      <Upload className="w-4 h-4 text-[#9A6B3B]" />
                      <span>
                        {isUploadingPhoto ? 'Subiendo imagen...' : 'Subir imagen desde celular'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoFileUpload}
                        disabled={isUploadingPhoto}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                <button
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="w-full py-3 rounded-xl bg-[#161514] hover:bg-[#2A2826] text-[#FAF9F6] font-semibold text-xs transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4 text-[#C69765]" />
                  <span>{isSaving ? 'Guardando...' : 'Guardar Cambios'}</span>
                </button>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between px-1 border-b border-[#E6E1D6] pb-2">
              <h3 className="font-display text-lg font-bold uppercase tracking-wide text-[#161514]">
                Mis Barberos Favoritos ({favoriteBarbers.length})
              </h3>
            </div>

            {favoriteBarbers.length === 0 ? (
              <div className="p-4 rounded-2xl bg-white border border-[#E6E1D6] text-center text-xs text-[#5C5852]">
                Aún no has guardado barberos en tus favoritos. Explora la lista de barberos y presiona el icono de corazón.
              </div>
            ) : (
              <div className="grid gap-2.5">
                {favoriteBarbers.map((barber) => (
                  <div
                    key={barber.id}
                    className="flex items-center justify-between p-3 rounded-2xl bg-white border border-[#E6E1D6] hover:border-[#9A6B3B]/60 transition-all"
                  >
                    <div
                      onClick={() => onOpenBarberProfile(barber)}
                      className="flex items-center gap-3 cursor-pointer"
                    >
                      <img
                        src={barber.photoUrl}
                        alt={barber.displayName}
                        className="w-11 h-11 rounded-xl object-cover border border-[#E6E1D6]"
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <h4 className="font-display text-base font-bold text-[#161514] uppercase tracking-wide">
                          {barber.displayName}
                        </h4>
                        <span className="text-[11px] text-[#9A6B3B] font-semibold tabular-nums">
                          ★ {barber.rating.toFixed(1)} · {barber.specialties[0]}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => onStartBookingWithBarber(barber.id)}
                      className="px-3.5 py-2 rounded-xl bg-[#161514] hover:bg-[#9A6B3B] text-[#FAF9F6] text-xs font-semibold transition-colors whitespace-nowrap"
                    >
                      Reservar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-2">
            <button
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition-all active:scale-[0.99]"
            >
              <LogOut className="w-4 h-4" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>
      )}

      <ClientQRModal
        isOpen={showQrModal}
        onClose={() => setShowQrModal(false)}
        userProfile={userProfile}
      />
    </div>
  );
};

