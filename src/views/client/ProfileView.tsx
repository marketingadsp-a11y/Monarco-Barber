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
          colors: ['#D4AF37', '#F5D77F', '#FFFFFF', '#996515'],
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
        <div className="rounded-3xl bg-[#14171E] border border-white/10 p-4 sm:p-6 space-y-5 shadow-2xl">
          {/* TAB SWITCHER */}
          <div className="flex p-1 rounded-2xl bg-black/50 border border-white/10">
            <button
              onClick={() => {
                setAuthTab('login');
                setLoginStep(1);
                setAuthError(null);
              }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                authTab === 'login'
                  ? 'bg-gradient-to-r from-[#996515] via-[#D4AF37] to-[#F3E5AB] text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
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
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                authTab === 'register'
                  ? 'bg-gradient-to-r from-[#996515] via-[#D4AF37] to-[#F3E5AB] text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Soy Nuevo</span>
            </button>
          </div>

          {/* ERROR MESSAGE BOX */}
          {authError && (
            <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-200 text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1">{authError}</div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* FLOW A: INICIAR SESIÓN (Phone or Client Number + 4-digit PIN) */}
          {/* ------------------------------------------------------------- */}
          {authTab === 'login' && (
            <div className="space-y-4">
              {loginStep === 1 ? (
                /* STEP 1: Enter Phone or Client Number */
                <form onSubmit={handleVerifyLoginIdentifier} className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-200 block mb-1.5">
                      Ingresa tu Celular o Número de Cliente
                    </label>
                    <div className="relative">
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-slate-400">
                        <Phone className="w-4 h-4 text-[#D4AF37]" />
                      </div>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={loginIdentifier}
                        onChange={(e) => setLoginIdentifier(e.target.value)}
                        placeholder="Ej. 55 1234 5678 o 849201"
                        className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-900/90 border border-white/15 text-white text-sm font-mono tracking-wider focus:outline-none focus:border-[#D4AF37] transition-all"
                        required
                        autoFocus
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1">
                      <span>💡</span>
                      <span>Puedes ingresar tus 10 dígitos de celular o tu No. de cliente de 6 dígitos.</span>
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={!loginIdentifier.trim() || isLoadingAuth}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#996515] via-[#D4AF37] to-[#F3E5AB] text-slate-950 font-bold text-xs shadow-xl shadow-[#D4AF37]/20 hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isLoadingAuth ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <span>Siguiente</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <div className="pt-2 text-center border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthTab('register');
                        setAuthError(null);
                      }}
                      className="text-xs text-[#D4AF37] hover:underline font-semibold"
                    >
                      ¿Eres nuevo? Crea tu Tarjeta de Cliente Digital aquí
                    </button>
                  </div>
                </form>
              ) : (
                /* STEP 2: Enter 4-Digit Numeric Password */
                <form onSubmit={handleLoginWithPin} className="space-y-4 animate-in fade-in">
                  <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                        Titular de la cuenta
                      </span>
                      <p className="text-sm font-bold text-white font-serif">
                        {matchedUser?.name || 'Cliente'}
                      </p>
                      {matchedUser?.clientNumber && (
                        <p className="text-[11px] text-[#D4AF37] font-mono">
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
                      className="text-xs text-slate-400 hover:text-white px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/10"
                    >
                      Cambiar
                    </button>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-200 block mb-1.5 text-center">
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
                        className="w-full text-center tracking-[0.5em] text-2xl font-mono py-3 rounded-2xl bg-slate-900 border-2 border-[#D4AF37]/60 text-[#D4AF37] focus:outline-none focus:border-[#D4AF37] shadow-inner"
                        required
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPin(!showLoginPin)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      >
                        {showLoginPin ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-400 text-center mt-2">
                      Teclado numérico • 4 dígitos de seguridad
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
                      className="px-4 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold"
                    >
                      Atrás
                    </button>
                    <button
                      type="submit"
                      disabled={loginPin.length !== 4 || isLoadingAuth}
                      className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-[#996515] via-[#D4AF37] to-[#F3E5AB] text-slate-950 font-bold text-xs shadow-xl shadow-[#D4AF37]/20 hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isLoadingAuth ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Iniciar Sesión</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* FLOW B: SOY NUEVO (Digital Bank-Card Registration) */}
          {/* ------------------------------------------------------------- */}
          {authTab === 'register' && (
            <div className="space-y-4">
              {registerStep === 1 ? (
                /* STAGE 1: Beautiful Card Preview & Invitation */
                <div className="space-y-4 text-center">
                  <div className="p-1">
                    <ClientMembershipCard
                      name={regName || 'TU NOMBRE AQUÍ'}
                      clientNumber={newClientNumber || '849201'}
                      tier="VIP CLUB"
                      points={100}
                    />
                  </div>

                  <div className="p-3 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-xs text-amber-200/90 text-left space-y-1">
                    <div className="flex items-center gap-2 font-bold text-[#D4AF37]">
                      <Crown className="w-4 h-4" />
                      <span>Beneficios de tu Tarjeta Monarca</span>
                    </div>
                    <p className="text-[11px] text-slate-300">
                      • Código QR único para identificarte y agendar al instante.
                    </p>
                    <p className="text-[11px] text-slate-300">
                      • 100 Puntos de regalo de bienvenida.
                    </p>
                    <p className="text-[11px] text-slate-300">
                      • Acceso rápido solo con tu celular y NIP de 4 dígitos.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setRegisterStep(2);
                      setAuthError(null);
                    }}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#996515] via-[#D4AF37] to-[#F3E5AB] text-slate-950 font-bold text-xs shadow-xl shadow-[#D4AF37]/25 hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Obtener mi Tarjeta de Cliente</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                /* STAGE 2: 3 Simple Fields (Name, Phone, 4-Digit Numeric PIN) */
                <form onSubmit={handleRegisterSubmit} className="space-y-4 animate-in fade-in">
                  {/* Live Mini Card Preview */}
                  <div className="p-1 transform scale-90 sm:scale-100 origin-top">
                    <ClientMembershipCard
                      name={regName || 'TU NOMBRE'}
                      clientNumber={newClientNumber || '849201'}
                      tier="VIP CLUB"
                      points={100}
                    />
                  </div>

                  {/* 1. NOMBRE */}
                  <div>
                    <label className="text-xs font-semibold text-slate-200 block mb-1">
                      Nombre Completo
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        placeholder="Ej. Rodrigo Mendoza"
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-white/15 text-white text-xs focus:outline-none focus:border-[#D4AF37] uppercase tracking-wide"
                        required
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* 2. CELULAR (10 DIGITS) */}
                  <div>
                    <label className="text-xs font-semibold text-slate-200 block mb-1">
                      Número Celular (10 dígitos)
                    </label>
                    <div className="flex items-center rounded-xl bg-slate-900/90 border border-white/15 overflow-hidden focus-within:border-[#D4AF37]">
                      <div className="flex items-center gap-1 px-3 py-2.5 bg-white/5 border-r border-white/10 text-xs font-bold text-white shrink-0">
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
                        className="w-full px-3 py-2.5 bg-transparent text-white text-xs font-mono tracking-widest focus:outline-none"
                        required
                      />
                    </div>
                  </div>

                  {/* 3. CONTRASEÑA DE 4 DÍGITOS NUMÉRICOS */}
                  <div>
                    <label className="text-xs font-semibold text-slate-200 block mb-1">
                      Contraseña de 4 dígitos numéricos (NIP de acceso)
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
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
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-900/90 border border-white/15 text-white text-xs font-mono tracking-[0.3em] focus:outline-none focus:border-[#D4AF37]"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPin(!showRegPin)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      >
                        {showRegPin ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Solo 4 números que recordarás fácilmente al ingresar.
                    </p>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setRegisterStep(1)}
                      className="px-4 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold"
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
                      className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-[#996515] via-[#D4AF37] to-[#F3E5AB] text-slate-950 font-bold text-xs shadow-xl shadow-[#D4AF37]/20 hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isLoadingAuth ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
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
        <div className="space-y-5">
          {/* DIGITAL VIP MEMBERSHIP CARD */}
          <div className="relative group cursor-pointer" onClick={() => setShowQrModal(true)}>
            <ClientMembershipCard
              name={userProfile.name}
              phone={userProfile.phone}
              clientNumber={userProfile.clientNumber || '000000'}
              tier={userProfile.membershipTier || (currentRole === 'admin' ? 'ADMIN VIP' : 'VIP CLUB')}
              points={userProfile.points ?? 100}
              memberSince={userProfile.createdAt}
            />
            <div className="mt-2 text-center">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#D4AF37] hover:underline">
                <QrIcon className="w-3.5 h-3.5" />
                <span>Toca para ver el Código QR en grande</span>
              </span>
            </div>
          </div>

          {/* USER DATA & EDIT PROFILE ACCORDION */}
          <div className="rounded-3xl bg-[#14171E] border border-white/10 p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-800 border border-[#D4AF37]/60 flex items-center justify-center">
                  {userProfile.photoUrl ? (
                    <img
                      src={userProfile.photoUrl}
                      alt={userProfile.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <User className="w-6 h-6 text-[#D4AF37]" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white text-sm">{userProfile.name}</h3>
                    <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40 uppercase">
                      {currentRole === 'admin' ? 'ADMIN' : 'CLIENTE VIP'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-mono">
                    {userProfile.phone || 'Sin celular'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsEditing(!isEditing)}
                className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 border border-white/10 transition-colors"
              >
                {isEditing ? 'Cerrar' : 'Editar Datos'}
              </button>
            </div>

            {/* EDITING FORM */}
            {isEditing && (
              <div className="pt-4 border-t border-white/10 space-y-3.5 animate-in fade-in">
                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1">
                    Nombre Completo
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1">
                    Teléfono Celular
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1">
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
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/10 text-[#D4AF37] font-mono tracking-widest text-xs focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                {/* Photo upload */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-400 block">
                    Foto de Perfil
                  </label>
                  <div className="flex items-center gap-3">
                    {editPhotoUrl && (
                      <img
                        src={editPhotoUrl}
                        alt="Preview"
                        className="w-12 h-12 rounded-xl object-cover border border-[#D4AF37]/50"
                        referrerPolicy="no-referrer"
                      />
                    )}
                    <label className="flex-1 flex items-center justify-center gap-2 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-200 cursor-pointer transition-colors">
                      <Upload className="w-4 h-4 text-[#D4AF37]" />
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
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#996515] via-[#D4AF37] to-[#F3E5AB] text-slate-950 font-bold text-xs shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Guardando...' : 'Guardar Cambios'}</span>
                </button>
              </div>
            )}
          </div>

          {/* FAVORITE BARBERS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Mis Barberos Favoritos ({favoriteBarbers.length})
              </h3>
            </div>

            {favoriteBarbers.length === 0 ? (
              <div className="p-4 rounded-2xl bg-[#14171E] border border-white/10 text-center text-xs text-slate-400">
                Aún no has guardado barberos en tus favoritos. Explora la lista de barberos y presiona el icono de corazón.
              </div>
            ) : (
              <div className="grid gap-2">
                {favoriteBarbers.map((barber) => (
                  <div
                    key={barber.id}
                    className="flex items-center justify-between p-3 rounded-2xl bg-[#14171E] border border-white/10 hover:border-[#D4AF37]/30 transition-all"
                  >
                    <div
                      onClick={() => onOpenBarberProfile(barber)}
                      className="flex items-center gap-3 cursor-pointer"
                    >
                      <img
                        src={barber.photoUrl}
                        alt={barber.displayName}
                        className="w-10 h-10 rounded-xl object-cover border border-white/10"
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <h4 className="font-bold text-white text-xs">{barber.displayName}</h4>
                        <span className="text-[11px] text-[#D4AF37] font-medium">
                          ★ {barber.rating.toFixed(1)} • {barber.specialties[0]}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => onStartBookingWithBarber(barber.id)}
                      className="px-3 py-1.5 rounded-xl bg-[#D4AF37]/20 hover:bg-[#D4AF37] hover:text-slate-950 text-[#D4AF37] text-xs font-bold transition-all"
                    >
                      Reservar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* LOG OUT BUTTON */}
          <div className="pt-2">
            <button
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-xs font-bold transition-all active:scale-[0.98]"
            >
              <LogOut className="w-4 h-4" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>
      )}

      {/* FULL SCREEN QR MODAL */}
      <ClientQRModal
        isOpen={showQrModal}
        onClose={() => setShowQrModal(false)}
        userProfile={userProfile}
      />
    </div>
  );
};
