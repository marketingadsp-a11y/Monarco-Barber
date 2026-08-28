import React, { useState } from 'react';
import {
  User,
  Phone,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Heart,
  MapPin,
  Clock,
  Instagram,
  Shield,
  Scissors,
  LogOut,
  Save,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Camera,
  Upload,
  ExternalLink,
  MessageCircle,
  ArrowRight,
  RefreshCw,
  KeyRound,
  Check,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useBarbershop } from '../../contexts/BarbershopContext';
import { Barber } from '../../types';
import { imageService } from '../../services/imgbb/imageService';

interface ProfileViewProps {
  onOpenBarberProfile: (barber: Barber) => void;
  onStartBookingWithBarber: (barberId: string) => void;
}

type AuthTab = 'login' | 'register';
type AuthMethod = 'email' | 'phone';

export const ProfileView: React.FC<ProfileViewProps> = ({
  onOpenBarberProfile,
  onStartBookingWithBarber,
}) => {
  const {
    userProfile,
    currentRole,
    isAuthenticated,
    login,
    register,
    loginWithGoogle,
    loginWithApple,
    loginWithPhone,
    logout,
    resetPassword,
    updateUserPreferences,
  } = useAuth();
  const { barbers, businessSettings, showToast } = useBarbershop();

  // Auth Form State
  const [authTab, setAuthTab] = useState<AuthTab>('login');
  const [authMethod, setAuthMethod] = useState<AuthMethod>('email');

  // Email form fields
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Mexico Phone form fields (+52 10 digits)
  const [rawPhone, setRawPhone] = useState('');
  const [phoneStep, setPhoneStep] = useState<'input' | 'otp'>('input');
  const [phoneOtp, setPhoneOtp] = useState('');
  const [simulatedSentCode, setSimulatedSentCode] = useState<string | null>(null);

  // Profile Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(userProfile?.name || '');
  const [editPhone, setEditPhone] = useState(userProfile?.phone || '');
  const [editPhotoUrl, setEditPhotoUrl] = useState(userProfile?.photoUrl || '');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Reset Password Modal
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isSubmittingReset, setIsSubmittingReset] = useState(false);

  // Status & loading
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const favoriteBarbers = barbers.filter((b) =>
    userProfile?.favoriteBarberIds?.includes(b.id)
  );

  // Format Mexico 10-digit phone
  const handlePhoneInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
    setRawPhone(val);
  };

  const formatMexicoDisplayPhone = (digits: string) => {
    if (!digits) return '';
    if (digits.length <= 2) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
    return `${digits.slice(0, 2)} ${digits.slice(2, 6)} ${digits.slice(6)}`;
  };

  // Handlers for Authentication
  const handleEmailAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsLoadingAuth(true);

    try {
      if (authTab === 'login') {
        if (!authEmail.trim() || !authPassword) {
          throw new Error('Por favor ingresa tu correo y contraseña.');
        }
        await login(authEmail, authPassword);
        showToast('success', '¡Bienvenido!', 'Has iniciado sesión correctamente.');
      } else {
        if (!authName.trim()) {
          throw new Error('Por favor ingresa tu nombre completo.');
        }
        if (!authEmail.trim() || !authPassword) {
          throw new Error('Por favor ingresa un correo y contraseña.');
        }
        if (authPassword.length < 6) {
          throw new Error('La contraseña debe tener mínimo 6 caracteres.');
        }
        await register(authName, authEmail, authPassword);
        showToast('success', '¡Cuenta Creada!', 'Te has registrado exitosamente en Monarca Barber.');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Ocurrió un error al procesar tu solicitud.');
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const handleSendPhoneCode = () => {
    if (rawPhone.length !== 10) {
      setAuthError('Ingresa un número celular válido de 10 dígitos (México).');
      return;
    }
    setAuthError(null);
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setSimulatedSentCode(code);
    setPhoneStep('otp');
    setPhoneOtp(code); // Pre-fill for frictionless UX while displaying notice
    showToast('info', 'Código SMS Enviado', `Código de verificación enviado a +52 ${formatMexicoDisplayPhone(rawPhone)}: ${code}`);
  };

  const handleVerifyPhoneOtp = async () => {
    if (phoneOtp.trim().length !== 6) {
      setAuthError('El código de verificación debe tener 6 dígitos.');
      return;
    }
    setAuthError(null);
    setIsLoadingAuth(true);
    try {
      await loginWithPhone(rawPhone, phoneOtp, authName || undefined);
      showToast('success', '¡Acceso Concedido!', 'Número de celular verificado con éxito.');
    } catch (err: any) {
      setAuthError(err.message || 'Código incorrecto o expirado.');
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const handleGoogleLogin = async () => {
    setAuthError(null);
    setIsLoadingAuth(true);
    try {
      await loginWithGoogle();
      showToast('success', 'Google Auth', 'Inicio de sesión con Google exitoso.');
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const handleAppleLogin = async () => {
    setAuthError(null);
    setIsLoadingAuth(true);
    try {
      await loginWithApple();
      showToast('success', 'Apple Auth', 'Inicio de sesión con Apple exitoso.');
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const handleSendPasswordReset = async () => {
    if (!resetEmail.trim()) {
      showToast('error', 'Campo Requerido', 'Ingresa tu correo electrónico.');
      return;
    }
    setIsSubmittingReset(true);
    try {
      await resetPassword(resetEmail);
      showToast('success', 'Correo Enviado', 'Revisa tu bandeja de entrada para restablecer tu contraseña.');
      setShowResetModal(false);
      setResetEmail('');
    } catch (err: any) {
      showToast('error', 'Error', err.message);
    } finally {
      setIsSubmittingReset(false);
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

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      await updateUserPreferences({
        name: editName.trim(),
        phone: editPhone.trim(),
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

  return (
    <div className="space-y-5 pb-24 max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            {isAuthenticated ? 'Mi Cuenta & Perfil' : 'Acceso a Monarca Barber'}
          </h1>
          <p className="text-xs text-slate-400">
            {isAuthenticated
              ? 'Administra tus datos, preferencias y barberos favoritos'
              : 'Inicia sesión o regístrate para agendar y guardar tu historial'}
          </p>
        </div>
        <div className="p-2.5 rounded-2xl bg-[#D4AF37]/10 text-[#D4AF37]">
          <User className="w-5 h-5" />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* NOT AUTHENTICATED: LOGIN & REGISTER FLOW */}
      {/* ========================================================================= */}
      {!isAuthenticated && (
        <div className="rounded-3xl bg-[#14171E] border border-white/10 p-5 sm:p-6 space-y-5 shadow-2xl">
          {/* Tab Switcher: Iniciar Sesión / Registrarse */}
          <div className="flex p-1 rounded-2xl bg-black/40 border border-white/10">
            <button
              onClick={() => {
                setAuthTab('login');
                setAuthError(null);
              }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                authTab === 'login'
                  ? 'bg-gradient-to-r from-[#996515] via-[#D4AF37] to-[#F3E5AB] text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Iniciar Sesión
            </button>
            <button
              onClick={() => {
                setAuthTab('register');
                setAuthError(null);
              }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                authTab === 'register'
                  ? 'bg-gradient-to-r from-[#996515] via-[#D4AF37] to-[#F3E5AB] text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Registrarse
            </button>
          </div>

          {authError && (
            <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-200 text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          {/* Social Auth Providers (Google & Apple) */}
          <div className="space-y-2.5">
            <button
              onClick={handleGoogleLogin}
              disabled={isLoadingAuth}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {/* Google G icon */}
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continuar con Google</span>
            </button>

            <button
              onClick={handleAppleLogin}
              disabled={isLoadingAuth}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl bg-black hover:bg-slate-900 border border-white/20 text-white font-bold text-xs shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {/* Apple Icon */}
              <svg className="w-4 h-4 fill-current" viewBox="0 0 170 170">
                <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.6-7.7-11.72-13.98-6.19-9.5-11.08-20.2-14.67-32.08-3.59-11.89-5.39-23.3-5.39-34.25 0-14.36 3.59-26.06 10.77-35.1 7.18-9.05 16.27-13.67 27.27-13.88 5.11 0 10.63 1.3 16.54 3.9 5.92 2.6 9.87 3.96 11.87 4.07 1.63 0 5.76-1.39 12.39-4.17 6.63-2.77 12.44-3.99 17.43-3.65 13.04.65 23.33 5.48 30.87 14.49-11.52 6.96-17.17 16.52-16.96 28.69.22 9.57 3.86 17.55 10.92 23.97 7.07 6.41 15.54 10.05 25.43 10.92-2.17 6.74-4.89 13.37-8.16 19.89zm-38.39-110.82c0 6.52-2.45 12.83-7.34 18.91-4.9 6.09-10.87 9.89-17.93 11.41-.65-1.96-.98-3.91-.98-5.87 0-6.31 2.56-12.61 7.66-18.91 5.11-6.3 11.25-10.05 18.42-11.25.11 1.9.17 3.8.17 5.71z" />
              </svg>
              <span>Continuar con Apple</span>
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-[1px] bg-white/10" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              O elige otro método
            </span>
            <div className="flex-1 h-[1px] bg-white/10" />
          </div>

          {/* Method Selector: Correo vs Celular México */}
          <div className="flex gap-2">
            <button
              onClick={() => {
                setAuthMethod('email');
                setAuthError(null);
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                authMethod === 'email'
                  ? 'bg-white/10 border-[#D4AF37] text-white'
                  : 'bg-transparent border-white/10 text-slate-400 hover:text-white'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Correo y Contraseña</span>
            </button>

            <button
              onClick={() => {
                setAuthMethod('phone');
                setAuthError(null);
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                authMethod === 'phone'
                  ? 'bg-white/10 border-[#D4AF37] text-white'
                  : 'bg-transparent border-white/10 text-slate-400 hover:text-white'
              }`}
            >
              <span>🇲🇽</span>
              <span>Celular México</span>
            </button>
          </div>

          {/* 1. EMAIL FORM */}
          {authMethod === 'email' && (
            <form onSubmit={handleEmailAuthSubmit} className="space-y-3.5">
              {authTab === 'register' && (
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    Nombre Completo
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                      placeholder="Ej. Rodrigo Mendoza"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-white/15 text-white text-xs focus:outline-none focus:border-[#D4AF37] transition-colors"
                      required
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="tu@correo.com"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-white/15 text-white text-xs focus:outline-none focus:border-[#D4AF37] transition-colors"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-300">
                    Contraseña
                  </label>
                  {authTab === 'login' && (
                    <button
                      type="button"
                      onClick={() => setShowResetModal(true)}
                      className="text-[11px] text-[#D4AF37] hover:underline"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-900/90 border border-white/15 text-white text-xs focus:outline-none focus:border-[#D4AF37] transition-colors"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoadingAuth}
                className="w-full mt-2 py-3.5 rounded-2xl bg-gradient-to-r from-[#996515] via-[#D4AF37] to-[#F3E5AB] text-slate-950 font-bold text-xs shadow-xl shadow-[#D4AF37]/20 hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoadingAuth ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>{authTab === 'login' ? 'Ingresar a mi Cuenta' : 'Crear Cuenta'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* 2. MEXICO PHONE NUMBER AUTH (+52) */}
          {authMethod === 'phone' && (
            <div className="space-y-4">
              {phoneStep === 'input' ? (
                <div className="space-y-3.5">
                  {authTab === 'register' && (
                    <div>
                      <label className="text-xs font-medium text-slate-300 block mb-1">
                        Tu Nombre (Opcional)
                      </label>
                      <input
                        type="text"
                        value={authName}
                        onChange={(e) => setAuthName(e.target.value)}
                        placeholder="Ej. Rodrigo Mendoza"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-white/15 text-white text-xs focus:outline-none focus:border-[#D4AF37] transition-colors"
                      />
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1">
                      Número Celular (México - 10 dígitos)
                    </label>
                    <div className="flex items-center rounded-xl bg-slate-900/90 border border-white/15 overflow-hidden focus-within:border-[#D4AF37] transition-colors">
                      <div className="flex items-center gap-1.5 px-3 py-2.5 bg-white/5 border-r border-white/10 text-xs font-bold text-white shrink-0">
                        <span>🇲🇽</span>
                        <span>+52</span>
                      </div>
                      <input
                        type="tel"
                        value={rawPhone}
                        onChange={handlePhoneInputChange}
                        placeholder="55 1234 5678"
                        className="w-full px-3.5 py-2.5 bg-transparent text-white text-xs focus:outline-none tracking-widest font-mono"
                        maxLength={10}
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Solo números válidos de la República Mexicana (10 dígitos).
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleSendPhoneCode}
                    disabled={rawPhone.length !== 10}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#996515] via-[#D4AF37] to-[#F3E5AB] text-slate-950 font-bold text-xs shadow-xl shadow-[#D4AF37]/20 hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Phone className="w-4 h-4" />
                    <span>Enviar Código de Verificación SMS</span>
                  </button>
                </div>
              ) : (
                /* OTP Step */
                <div className="space-y-4 animate-in fade-in">
                  <div className="p-3.5 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-xs space-y-1">
                    <p className="text-slate-300">
                      Código de 6 dígitos enviado a <strong className="text-white">+52 {formatMexicoDisplayPhone(rawPhone)}</strong>
                    </p>
                    {simulatedSentCode && (
                      <p className="text-[#D4AF37] font-semibold">
                        Código de prueba: <strong>{simulatedSentCode}</strong>
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1">
                      Ingresa el código SMS de 6 dígitos
                    </label>
                    <input
                      type="text"
                      value={phoneOtp}
                      onChange={(e) => setPhoneOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="829471"
                      className="w-full text-center tracking-widest text-lg font-mono py-2.5 rounded-xl bg-slate-900 border border-white/15 text-[#D4AF37] focus:outline-none focus:border-[#D4AF37]"
                      maxLength={6}
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPhoneStep('input')}
                      className="px-4 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold"
                    >
                      Cambiar número
                    </button>
                    <button
                      type="button"
                      onClick={handleVerifyPhoneOtp}
                      disabled={phoneOtp.length !== 6 || isLoadingAuth}
                      className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-[#996515] via-[#D4AF37] to-[#F3E5AB] text-slate-950 font-bold text-xs shadow-xl shadow-[#D4AF37]/20 hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isLoadingAuth ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Verificar y Entrar</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* AUTHENTICATED: PROFILE INFORMATION & MANAGEMENT */}
      {/* ========================================================================= */}
      {isAuthenticated && (
        <>
          {/* User Profile Card */}
          <div className="rounded-3xl bg-[#14171E] border border-white/10 p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-slate-800 border-2 border-[#D4AF37]/60 shadow-lg">
                  {userProfile?.photoUrl ? (
                    <img
                      src={userProfile.photoUrl}
                      alt={userProfile.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400 bg-slate-900">
                      <User className="w-8 h-8 text-[#D4AF37]" />
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white text-base">{userProfile?.name}</h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] uppercase border border-[#D4AF37]/30">
                      {currentRole === 'admin' ? 'Administrador' : currentRole === 'barber' ? 'Barbero' : 'Cliente VIP'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">{userProfile?.email || 'Sin correo asignado'}</p>
                  <p className="text-xs text-slate-400">{userProfile?.phone || 'Sin teléfono'}</p>
                </div>
              </div>

              <button
                onClick={() => {
                  setIsEditing(!isEditing);
                  setEditName(userProfile?.name || '');
                  setEditPhone(userProfile?.phone || '');
                  setEditPhotoUrl(userProfile?.photoUrl || '');
                }}
                className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 border border-white/10 transition-colors"
              >
                {isEditing ? 'Cerrar' : 'Editar'}
              </button>
            </div>

            {/* Editing Form */}
            {isEditing && (
              <div className="pt-4 border-t border-white/10 space-y-3.5 animate-in fade-in">
                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1">Nombre Completo</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1">Teléfono Móvil</label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="+52 55 1234 5678"
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                {/* Photo Upload with ImgBB and Preview */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-400 block">Foto de Perfil</label>
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
                      <span>{isUploadingPhoto ? 'Subiendo imagen...' : 'Subir imagen desde celular'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoFileUpload}
                        disabled={isUploadingPhoto}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <input
                    type="url"
                    value={editPhotoUrl}
                    onChange={(e) => setEditPhotoUrl(e.target.value)}
                    placeholder="O ingresa enlace directo (URL)"
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-[11px] focus:outline-none focus:border-[#D4AF37]"
                  />
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

          {/* Favorite Barbers */}
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

          {/* Log Out Button */}
          <div className="pt-1">
            <button
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-xs font-bold transition-all active:scale-[0.98]"
            >
              <LogOut className="w-4 h-4" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* MONARCA BARBER SHOP INFORMATION CARD (WITH GLOBAL LOGO) */}
      {/* ========================================================================= */}
      <div className="rounded-3xl bg-[#14171E] border border-white/10 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {businessSettings.logoUrl ? (
              <img
                src={businessSettings.logoUrl}
                alt="Logo Monarca"
                className="w-10 h-10 rounded-xl object-contain bg-black/40 border border-[#D4AF37]/40 p-0.5"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#996515] flex items-center justify-center text-slate-950 font-bold text-sm">
                MB
              </div>
            )}
            <div>
              <h3 className="text-sm font-bold text-white">
                {businessSettings.name || 'MONARCA BARBER'}
              </h3>
              <p className="text-[11px] text-slate-400">Sucursal Principal</p>
            </div>
          </div>

          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            Abierto
          </span>
        </div>

        <div className="space-y-2.5 text-xs text-slate-300 pt-1">
          <div className="flex items-start gap-2.5">
            <MapPin className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
            <div>
              <strong className="text-white block">{businessSettings.name}</strong>
              <span className="text-slate-400">{businessSettings.address}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-[#D4AF37] shrink-0" />
            <span>
              Lunes a Sábado: {businessSettings.openingTime} - {businessSettings.closingTime}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <Phone className="w-4 h-4 text-[#D4AF37] shrink-0" />
            <span>{businessSettings.phone}</span>
          </div>

          {businessSettings.whatsapp && (
            <div className="flex items-center gap-2.5">
              <MessageCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <a
                href={`https://wa.me/${businessSettings.whatsapp.replace(/\+/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400 hover:underline flex items-center gap-1"
              >
                <span>WhatsApp: {businessSettings.whatsapp}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {businessSettings.instagram && (
            <div className="flex items-center gap-2.5">
              <Instagram className="w-4 h-4 text-pink-400 shrink-0" />
              <a
                href={`https://instagram.com/${businessSettings.instagram.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-pink-400 hover:underline"
              >
                Instagram: {businessSettings.instagram}
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Reset Password Lightbox Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-[#161A22] border border-white/15 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-[#D4AF37]/10 text-[#D4AF37]">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Recuperar Contraseña</h3>
                <p className="text-[11px] text-slate-400">Te enviaremos un enlace a tu correo</p>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">
                Correo Electrónico
              </label>
              <input
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="tu@correo.com"
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/15 text-white text-xs focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSendPasswordReset}
                disabled={isSubmittingReset}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#996515] via-[#D4AF37] to-[#F3E5AB] text-slate-950 font-bold text-xs shadow-md disabled:opacity-50"
              >
                {isSubmittingReset ? 'Enviando...' : 'Enviar Enlace'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
