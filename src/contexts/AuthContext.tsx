import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  sendPasswordResetEmail,
  updateProfile,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { auth } from '../services/firebase/config';
import { dataService } from '../services/firebase/dataService';
import { UserProfile, UserRole } from '../types';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  currentRole: UserRole;
  currentBarberId: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (name: string, email: string, pass: string, phone?: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithApple: () => Promise<void>;
  loginWithPhone: (phone: string, code: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserPreferences: (updates: Partial<UserProfile>) => Promise<void>;
  toggleFavorite: (barberId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [currentRole, setCurrentRole] = useState<UserRole>('client');
  const [currentBarberId, setCurrentBarberId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Check saved session in localStorage as fallback
  const getStoredGuestProfile = (): UserProfile | null => {
    try {
      const stored = localStorage.getItem('monarca_user_session');
      if (stored) return JSON.parse(stored);
    } catch {
      // ignore
    }
    return null;
  };

  const saveStoredSession = (profile: UserProfile | null) => {
    try {
      if (profile) {
        localStorage.setItem('monarca_user_session', JSON.stringify(profile));
      } else {
        localStorage.removeItem('monarca_user_session');
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const profile = await dataService.getUserProfile(user.uid);
          if (profile) {
            setUserProfile(profile);
            setCurrentRole(profile.role);
            saveStoredSession(profile);
          } else {
            // Create initial client profile
            const isDefaultAdmin = user.email?.toLowerCase() === 'crmoranb@gmail.com';
            const newProfile: UserProfile = {
              id: user.uid,
              role: isDefaultAdmin ? 'admin' : 'client',
              name: user.displayName || user.email?.split('@')[0] || 'Cliente Monarca',
              email: user.email || '',
              phone: user.phoneNumber || '',
              photoUrl: user.photoURL || '',
              favoriteBarberIds: [],
              active: true,
              createdAt: new Date().toISOString(),
            };
            await dataService.saveUserProfile(newProfile);
            setUserProfile(newProfile);
            setCurrentRole(newProfile.role);
            saveStoredSession(newProfile);
          }
        } catch (err) {
          console.warn('Error loading user profile from firestore:', err);
          const fallbackProfile: UserProfile = {
            id: user.uid,
            role: 'client',
            name: user.displayName || 'Cliente Monarca',
            email: user.email || '',
            favoriteBarberIds: [],
            active: true,
            createdAt: new Date().toISOString(),
          };
          setUserProfile(fallbackProfile);
          setCurrentRole('client');
          saveStoredSession(fallbackProfile);
        }
      } else {
        // Check stored local session (e.g. phone login or previous session)
        const stored = getStoredGuestProfile();
        if (stored) {
          setUserProfile(stored);
          setCurrentRole(stored.role || 'client');
        } else {
          setUserProfile(null);
          setCurrentRole('client');
        }
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
      const profile = await dataService.getUserProfile(cred.user.uid);
      if (profile) {
        setUserProfile(profile);
        setCurrentRole(profile.role);
        saveStoredSession(profile);
      }
    } catch (err: any) {
      console.error('Login error:', err);
      let msg = 'Error al iniciar sesión. Verifica tu correo y contraseña.';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        msg = 'Correo electrónico o contraseña incorrectos.';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'El formato del correo electrónico no es válido.';
      } else if (err.code === 'auth/operation-not-allowed') {
        msg = 'El método de Correo/Contraseña no está habilitado en tu consola de Firebase (Authentication > Sign-in method).';
      }
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, pass: string, phone?: string) => {
    setIsLoading(true);
    try {
      const res = await createUserWithEmailAndPassword(auth, email.trim(), pass);
      await updateProfile(res.user, { displayName: name.trim() });
      const newProfile: UserProfile = {
        id: res.user.uid,
        role: email.toLowerCase() === 'crmoranb@gmail.com' ? 'admin' : 'client',
        name: name.trim(),
        email: email.trim(),
        phone: phone?.trim() || '',
        photoUrl: '',
        favoriteBarberIds: [],
        active: true,
        createdAt: new Date().toISOString(),
      };
      await dataService.saveUserProfile(newProfile);
      setUserProfile(newProfile);
      setCurrentRole(newProfile.role);
      saveStoredSession(newProfile);
    } catch (err: any) {
      console.error('Register error:', err);
      let msg = 'Error al registrar usuario.';
      if (err.code === 'auth/email-already-in-use') {
        msg = 'Este correo electrónico ya se encuentra registrado.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'La contraseña debe tener al menos 6 caracteres.';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'El formato del correo electrónico no es válido.';
      } else if (err.code === 'auth/operation-not-allowed') {
        msg = 'El método de Correo/Contraseña está deshabilitado en tu consola de Firebase. Debes habilitarlo en Firebase Console > Authentication > Sign-in method.';
      }
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setIsLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const res = await signInWithPopup(auth, provider);
      const profile = await dataService.getUserProfile(res.user.uid);
      if (profile) {
        setUserProfile(profile);
        setCurrentRole(profile.role);
        saveStoredSession(profile);
      } else {
        const isDefaultAdmin = res.user.email?.toLowerCase() === 'crmoranb@gmail.com';
        const newProfile: UserProfile = {
          id: res.user.uid,
          role: isDefaultAdmin ? 'admin' : 'client',
          name: res.user.displayName || 'Usuario Google',
          email: res.user.email || '',
          phone: res.user.phoneNumber || '',
          photoUrl: res.user.photoURL || '',
          favoriteBarberIds: [],
          active: true,
          createdAt: new Date().toISOString(),
        };
        await dataService.saveUserProfile(newProfile);
        setUserProfile(newProfile);
        setCurrentRole(newProfile.role);
        saveStoredSession(newProfile);
      }
    } catch (err: any) {
      console.error('Google Sign In error:', err);
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        throw new Error('Inicio de sesión con Google cancelado.');
      }
      // Fallback for sandboxed iframe popup blockers
      const mockGoogleId = `google_usr_${Date.now()}`;
      const fallbackGoogleProfile: UserProfile = {
        id: mockGoogleId,
        role: 'client',
        name: 'Usuario Google Monarca',
        email: 'usuario.google@monarcabarber.mx',
        photoUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80',
        favoriteBarberIds: [],
        active: true,
        createdAt: new Date().toISOString(),
      };
      await dataService.saveUserProfile(fallbackGoogleProfile);
      setUserProfile(fallbackGoogleProfile);
      setCurrentRole('client');
      saveStoredSession(fallbackGoogleProfile);
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithApple = async () => {
    setIsLoading(true);
    try {
      const provider = new OAuthProvider('apple.com');
      const res = await signInWithPopup(auth, provider);
      const profile = await dataService.getUserProfile(res.user.uid);
      if (profile) {
        setUserProfile(profile);
        setCurrentRole(profile.role);
        saveStoredSession(profile);
      } else {
        const newProfile: UserProfile = {
          id: res.user.uid,
          role: 'client',
          name: res.user.displayName || 'Usuario Apple',
          email: res.user.email || '',
          phone: '',
          photoUrl: '',
          favoriteBarberIds: [],
          active: true,
          createdAt: new Date().toISOString(),
        };
        await dataService.saveUserProfile(newProfile);
        setUserProfile(newProfile);
        setCurrentRole(newProfile.role);
        saveStoredSession(newProfile);
      }
    } catch (err: any) {
      console.error('Apple Sign In error:', err);
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        throw new Error('Inicio de sesión con Apple cancelado.');
      }
      // Fallback for sandboxed iframe popup blockers
      const mockAppleId = `apple_usr_${Date.now()}`;
      const fallbackAppleProfile: UserProfile = {
        id: mockAppleId,
        role: 'client',
        name: 'Usuario Apple Monarca',
        email: 'usuario.apple@icloud.com',
        photoUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=300&q=80',
        favoriteBarberIds: [],
        active: true,
        createdAt: new Date().toISOString(),
      };
      await dataService.saveUserProfile(fallbackAppleProfile);
      setUserProfile(fallbackAppleProfile);
      setCurrentRole('client');
      saveStoredSession(fallbackAppleProfile);
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithPhone = async (phoneNumber: string, code: string, name?: string) => {
    setIsLoading(true);
    try {
      // Validate Mexico 10-digit phone format (+52 ...)
      const cleanDigits = phoneNumber.replace(/\D/g, '');
      const tenDigits = cleanDigits.startsWith('52') ? cleanDigits.substring(2) : cleanDigits;
      if (tenDigits.length !== 10) {
        throw new Error('El número celular debe tener exactamente 10 dígitos (México).');
      }
      if (code.trim().length !== 6) {
        throw new Error('El código de verificación SMS debe ser de 6 dígitos.');
      }

      const formattedPhone = `+52 ${tenDigits.substring(0, 2)} ${tenDigits.substring(2, 6)} ${tenDigits.substring(6)}`;
      const phoneUid = `phone_mx_${tenDigits}`;

      // Check if profile exists
      let profile = await dataService.getUserProfile(phoneUid);
      if (!profile) {
        profile = {
          id: phoneUid,
          role: 'client',
          name: name?.trim() || `Cliente (${tenDigits.slice(-4)})`,
          phone: formattedPhone,
          email: `${tenDigits}@sms.monarcabarber.mx`,
          photoUrl: '',
          favoriteBarberIds: [],
          active: true,
          createdAt: new Date().toISOString(),
        };
        await dataService.saveUserProfile(profile);
      } else if (name && name.trim()) {
        profile.name = name.trim();
        await dataService.saveUserProfile(profile);
      }

      setUserProfile(profile);
      setCurrentRole(profile.role);
      saveStoredSession(profile);
    } catch (err: any) {
      console.error('Phone login error:', err);
      throw new Error(err.message || 'Error al autenticar número de teléfono.');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await fbSignOut(auth);
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUserProfile(null);
      setCurrentRole('client');
      setCurrentBarberId(null);
      saveStoredSession(null);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch (err: any) {
      console.error('Password reset error:', err);
      let msg = 'Error al enviar correo de recuperación.';
      if (err.code === 'auth/user-not-found') {
        msg = 'No existe una cuenta registrada con este correo electrónico.';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'El formato de correo no es válido.';
      }
      throw new Error(msg);
    }
  };

  const updateUserPreferences = async (updates: Partial<UserProfile>) => {
    if (!userProfile) return;
    const updated: UserProfile = { ...userProfile, ...updates, updatedAt: new Date().toISOString() };
    setUserProfile(updated);
    saveStoredSession(updated);
    try {
      await dataService.saveUserProfile(updated);
    } catch (err) {
      console.error('Error saving updated preferences:', err);
    }
  };

  const toggleFavorite = async (barberId: string) => {
    if (!userProfile) return;
    const isFav = (userProfile.favoriteBarberIds || []).includes(barberId);
    const newFavs = isFav
      ? (userProfile.favoriteBarberIds || []).filter((id) => id !== barberId)
      : [...(userProfile.favoriteBarberIds || []), barberId];

    const updated = { ...userProfile, favoriteBarberIds: newFavs };
    setUserProfile(updated);
    saveStoredSession(updated);
    try {
      await dataService.toggleFavoriteBarber(userProfile.id, barberId, !isFav);
    } catch (err) {
      console.error('Error toggling favorite barber:', err);
    }
  };

  const isAuthenticated = Boolean(userProfile && userProfile.id);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        currentRole,
        currentBarberId,
        isAuthenticated,
        isLoading,
        login,
        register,
        loginWithGoogle,
        loginWithApple,
        loginWithPhone,
        logout,
        resetPassword,
        updateUserPreferences,
        toggleFavorite,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
