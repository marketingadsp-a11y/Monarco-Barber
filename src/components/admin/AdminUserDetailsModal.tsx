import React, { useState } from 'react';
import {
  X,
  Crown,
  User,
  Phone,
  Mail,
  Calendar,
  Sparkles,
  Scissors,
  DollarSign,
  Shield,
  Edit2,
  Save,
  Plus,
  Minus,
  CheckCircle2,
  Clock,
  QrCode,
  Copy,
  Check,
  ShoppingBag,
  FileText,
  AlertCircle,
  TrendingUp,
  MessageCircle,
} from 'lucide-react';
import { UserProfile, Appointment, UserRole } from '../../types';
import { formatCurrency, formatDateSpanish, formatTime12h } from '../../utils/dateTime';
import { dataService } from '../../services/firebase/dataService';
import { useBarbershop } from '../../contexts/BarbershopContext';

interface AdminUserDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  appointments: Appointment[];
  onUserUpdated?: () => void;
}

export const AdminUserDetailsModal: React.FC<AdminUserDetailsModalProps> = ({
  isOpen,
  onClose,
  user,
  appointments,
  onUserUpdated,
}) => {
  const { showToast } = useBarbershop();
  const [activeTab, setActiveTab] = useState<'profile' | 'points' | 'visits' | 'purchases' | 'qr' | 'permissions'>('profile');

  // Edit Profile State
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<UserProfile>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Quick Points Adjustment State
  const [pointsDelta, setPointsDelta] = useState<number>(50);
  const [pointsReason, setPointsReason] = useState<string>('Bonificación por administración');
  const [isUpdatingPoints, setIsUpdatingPoints] = useState(false);

  // Quick Visits Adjustment State
  const [visitsInput, setVisitsInput] = useState<number>(0);
  const [isUpdatingVisits, setIsUpdatingVisits] = useState(false);

  // Quick Purchase Addition State
  const [isAddingPurchase, setIsAddingPurchase] = useState(false);
  const [newPurchaseName, setNewPurchaseName] = useState('');
  const [newPurchasePrice, setNewPurchasePrice] = useState<number>(150);
  const [newPurchaseBarber, setNewPurchaseBarber] = useState('');
  const [newPurchaseNotes, setNewPurchaseNotes] = useState('');
  const [isSavingPurchase, setIsSavingPurchase] = useState(false);

  // Copy helper
  const [copiedField, setCopiedField] = useState<string | null>(null);

  React.useEffect(() => {
    if (user) {
      setEditForm({
        name: user.name,
        phone: user.phone,
        email: user.email,
        clientNumber: user.clientNumber,
        pin: user.pin,
        membershipTier: user.membershipTier || 'VIP',
        notes: user.notes || '',
        birthday: user.birthday || '',
        role: user.role,
        active: user.active !== undefined ? user.active : true,
      });
      setVisitsInput(user.manualVisits || 0);
    }
  }, [user]);

  if (!isOpen || !user) return null;

  // Filter appointments for this user
  const userAppointments = appointments.filter(
    (a) =>
      a.clientId === user.id ||
      (user.phone && a.clientPhone && a.clientPhone.replace(/\D/g, '') === user.phone.replace(/\D/g, '')) ||
      (user.clientNumber && a.clientId === user.clientNumber)
  );

  const completedAppointments = userAppointments.filter((a) => a.status === 'completed');
  const totalCompletedVisits = completedAppointments.length + (user.manualVisits || 0);
  const totalSpentServices = completedAppointments.reduce((sum, a) => sum + (a.servicePriceSnapshot || 0), 0);
  const totalSpentPurchases = (user.purchases || []).reduce((sum, p) => sum + (p.price || 0), 0);
  const totalCustomerLifetimeValue = totalSpentServices + totalSpentPurchases;

  const copyToClipboard = (text: string, fieldName: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      showToast('success', 'Copiado', `${fieldName} copiado al portapapeles.`);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  const handleSaveProfile = async () => {
    if (!editForm.name) {
      showToast('error', 'Error', 'El nombre es obligatorio.');
      return;
    }
    setIsSaving(true);
    try {
      await dataService.updateUserFullProfile(user.id, editForm);
      showToast('success', 'Guardado', 'Los datos del usuario han sido actualizados con éxito.');
      setIsEditing(false);
      if (onUserUpdated) onUserUpdated();
    } catch (err: any) {
      showToast('error', 'Error', err.message || 'No se pudo actualizar el usuario.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleApplyPoints = async (mode: 'add' | 'deduct' | 'set', customAmount?: number) => {
    setIsUpdatingPoints(true);
    try {
      const currentPts = user.points || 0;
      let targetPts = currentPts;
      let type: 'add' | 'deduct' | 'set' = mode;
      let reasonText = pointsReason.trim() || 'Ajuste administrativo';

      if (mode === 'add') {
        const amount = customAmount !== undefined ? customAmount : pointsDelta;
        targetPts = currentPts + amount;
      } else if (mode === 'deduct') {
        const amount = customAmount !== undefined ? customAmount : pointsDelta;
        targetPts = Math.max(0, currentPts - amount);
      } else if (mode === 'set') {
        targetPts = Math.max(0, customAmount !== undefined ? customAmount : pointsDelta);
      }

      await dataService.updateUserPoints(user.id, targetPts, reasonText, type);
      showToast('success', 'Puntos actualizados', `Nuevo balance de puntos: ${targetPts} pts.`);
      if (onUserUpdated) onUserUpdated();
    } catch (err: any) {
      showToast('error', 'Error', err.message || 'No se pudieron actualizar los puntos.');
    } finally {
      setIsUpdatingPoints(false);
    }
  };

  const handleSaveVisits = async () => {
    setIsUpdatingVisits(true);
    try {
      await dataService.updateUserVisits(user.id, Number(visitsInput));
      showToast('success', 'Visitas actualizadas', `Visitas manuales fijadas en ${visitsInput}.`);
      if (onUserUpdated) onUserUpdated();
    } catch (err: any) {
      showToast('error', 'Error', err.message || 'No se pudieron actualizar las visitas.');
    } finally {
      setIsUpdatingVisits(false);
    }
  };

  const handleRoleChange = async (newRole: UserRole) => {
    try {
      await dataService.updateUserRole(user.id, newRole);
      showToast('success', 'Rol asignado', `El usuario ahora tiene el rol de: ${newRole.toUpperCase()}`);
      if (onUserUpdated) onUserUpdated();
    } catch (err: any) {
      showToast('error', 'Error al cambiar rol', err.message);
    }
  };

  const handleAddPurchase = async () => {
    if (!newPurchaseName.trim()) {
      showToast('error', 'Faltan datos', 'Ingresa el nombre del producto o servicio.');
      return;
    }
    setIsSavingPurchase(true);
    try {
      await dataService.addUserPurchase(user.id, {
        itemName: newPurchaseName.trim(),
        price: Number(newPurchasePrice) || 0,
        barberName: newPurchaseBarber.trim() || undefined,
        notes: newPurchaseNotes.trim() || undefined,
      });
      showToast('success', 'Compra registrada', 'Se agregó el consumo al expediente del cliente.');
      setNewPurchaseName('');
      setNewPurchasePrice(150);
      setNewPurchaseNotes('');
      setIsAddingPurchase(false);
      if (onUserUpdated) onUserUpdated();
    } catch (err: any) {
      showToast('error', 'Error', err.message);
    } finally {
      setIsSavingPurchase(false);
    }
  };

  const qrData = JSON.stringify({
    monarca_client_id: user.clientNumber || '000000',
    name: user.name,
    phone: user.phone,
    timestamp: new Date().toISOString(),
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-3xl bg-[#12151B] border border-white/15 p-4 sm:p-6 space-y-4 shadow-[0_20px_70px_rgba(0,0,0,0.85)] relative my-auto max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* TOP MODAL HEADER */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {user.photoUrl ? (
              <img
                src={user.photoUrl}
                alt={user.name}
                className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl object-cover border-2 border-[#D4AF37] shadow-lg shrink-0"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-[#996515] to-[#D4AF37] text-slate-950 font-black text-xl flex items-center justify-center border border-white/20 shadow-lg shrink-0">
                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
            )}

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-white truncate">{user.name}</h2>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                    user.role === 'admin'
                      ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                      : user.role === 'barber'
                      ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                      : 'bg-[#D4AF37]/20 text-[#D4AF37] border-[#D4AF37]/40'
                  }`}
                >
                  {user.role === 'admin' ? 'Administrador' : user.role === 'barber' ? 'Barbero' : 'Cliente'}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-[#D4AF37] border border-[#D4AF37]/30">
                  {user.membershipTier || 'VIP'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                <span className="font-mono text-[#D4AF37] font-bold">
                  No. #{user.clientNumber || 'Sin número'}
                </span>
                {user.phone && <span>• {user.phone}</span>}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors shrink-0"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* SUMMARY STATS BAR */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs shrink-0">
          <div className="p-2.5 rounded-2xl bg-white/[0.03] border border-white/10 text-center">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Puntos VIP</span>
            <span className="text-lg font-black text-[#D4AF37] font-mono">{user.points ?? 100}</span>
          </div>

          <div className="p-2.5 rounded-2xl bg-white/[0.03] border border-white/10 text-center">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Visitas</span>
            <span className="text-lg font-black text-white font-mono">{totalCompletedVisits}</span>
          </div>

          <div className="p-2.5 rounded-2xl bg-white/[0.03] border border-white/10 text-center">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Consumo Total</span>
            <span className="text-lg font-black text-emerald-400 font-mono">
              {formatCurrency(totalCustomerLifetimeValue)}
            </span>
          </div>

          <div className="p-2.5 rounded-2xl bg-white/[0.03] border border-white/10 text-center">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Citas Agendadas</span>
            <span className="text-lg font-black text-blue-400 font-mono">{userAppointments.length}</span>
          </div>
        </div>

        {/* TAB NAVIGATION */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-white/10 shrink-0 scrollbar-none text-xs">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-3 py-2 rounded-xl font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'profile' ? 'bg-[#D4AF37] text-slate-950' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Expediente & Datos</span>
          </button>

          <button
            onClick={() => setActiveTab('points')}
            className={`px-3 py-2 rounded-xl font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'points' ? 'bg-[#D4AF37] text-slate-950' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Puntos ({user.points ?? 100})</span>
          </button>

          <button
            onClick={() => setActiveTab('visits')}
            className={`px-3 py-2 rounded-xl font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'visits' ? 'bg-[#D4AF37] text-slate-950' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Visitas & Citas ({userAppointments.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('purchases')}
            className={`px-3 py-2 rounded-xl font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'purchases' ? 'bg-[#D4AF37] text-slate-950' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Compras ({(user.purchases || []).length})</span>
          </button>

          <button
            onClick={() => setActiveTab('qr')}
            className={`px-3 py-2 rounded-xl font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'qr' ? 'bg-[#D4AF37] text-slate-950' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Código QR</span>
          </button>

          <button
            onClick={() => setActiveTab('permissions')}
            className={`px-3 py-2 rounded-xl font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'permissions' ? 'bg-[#D4AF37] text-slate-950' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Rol & Permisos</span>
          </button>
        </div>

        {/* TAB CONTENTS (SCROLLABLE) */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4 text-xs">
          {/* 1. TAB: PROFILE / EXPEDIENTE */}
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#D4AF37]" />
                  <span>Datos Generales del Cliente</span>
                </h3>
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-slate-200 font-bold transition-all"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>Editar Datos</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-3 py-1.5 rounded-xl bg-white/5 text-slate-400 hover:text-white font-semibold"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSaveProfile}
                      disabled={isSaving}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#D4AF37] text-slate-950 font-bold shadow-md"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{isSaving ? 'Guardando...' : 'Guardar'}</span>
                    </button>
                  </div>
                )}
              </div>

              {!isEditing ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Nombre Completo</span>
                    <span className="text-white font-bold text-sm block">{user.name}</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Número de Cliente</span>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[#D4AF37] font-bold text-sm">
                        {user.clientNumber || 'No asignado'}
                      </span>
                      {user.clientNumber && (
                        <button
                          onClick={() => copyToClipboard(user.clientNumber!, 'Número de cliente')}
                          className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
                        >
                          {copiedField === 'Número de cliente' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Teléfono / WhatsApp</span>
                    <div className="flex items-center justify-between">
                      <span className="text-white font-mono">{user.phone || 'Sin registrar'}</span>
                      {user.phone && (
                        <div className="flex items-center gap-1">
                          <a
                            href={`https://wa.me/${user.phone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                            title="Enviar WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </a>
                          <a
                            href={`tel:${user.phone}`}
                            className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300"
                            title="Llamar"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Correo Electrónico</span>
                    <span className="text-slate-300 truncate block">{user.email || 'Sin correo'}</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Nivel de Membresía</span>
                    <span className="text-[#D4AF37] font-bold block">{user.membershipTier || 'VIP'}</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">PIN de Acceso Rápido</span>
                    <span className="font-mono text-slate-300 font-bold block">{user.pin || '1234'}</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Cumpleaños</span>
                    <span className="text-slate-300 block">{user.birthday || 'No registrado'}</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Fecha de Registro</span>
                    <span className="text-slate-300 block">
                      {user.createdAt ? formatDateSpanish(user.createdAt.substring(0, 10)) : 'Reciente'}
                    </span>
                  </div>

                  <div className="sm:col-span-2 p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-1.5">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block flex items-center gap-1">
                      <Scissors className="w-3 h-3 text-[#D4AF37]" />
                      Notas de Estilo, Corte y Preferencias
                    </span>
                    <p className="text-slate-200 leading-relaxed italic">
                      {user.notes ? `"${user.notes}"` : 'Sin notas registradas. Haz clic en "Editar Datos" para agregar preferencias de corte, navaja o productos favoritos.'}
                    </p>
                  </div>
                </div>
              ) : (
                /* EDIT FORM */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white/[0.02] border border-white/15 p-4 rounded-2xl">
                  <div>
                    <label className="text-slate-400 block mb-1">Nombre Completo *</label>
                    <input
                      type="text"
                      value={editForm.name || ''}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/10 text-white"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Número de Cliente (6 dígitos)</label>
                    <input
                      type="text"
                      maxLength={6}
                      value={editForm.clientNumber || ''}
                      onChange={(e) => setEditForm({ ...editForm, clientNumber: e.target.value.replace(/\D/g, '') })}
                      className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/10 text-white font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Teléfono</label>
                    <input
                      type="text"
                      value={editForm.phone || ''}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/10 text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Correo Electrónico</label>
                    <input
                      type="email"
                      value={editForm.email || ''}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/10 text-white"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">PIN de Acceso (4 dígitos)</label>
                    <input
                      type="text"
                      maxLength={6}
                      value={editForm.pin || ''}
                      onChange={(e) => setEditForm({ ...editForm, pin: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/10 text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Nivel de Membresía</label>
                    <select
                      value={editForm.membershipTier || 'VIP'}
                      onChange={(e) => setEditForm({ ...editForm, membershipTier: e.target.value as any })}
                      className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/10 text-white"
                    >
                      <option value="VIP">VIP</option>
                      <option value="Gold">Gold</option>
                      <option value="Black">Black</option>
                      <option value="Classic">Classic</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Cumpleaños (DD/MM o AAAA-MM-DD)</label>
                    <input
                      type="text"
                      value={editForm.birthday || ''}
                      onChange={(e) => setEditForm({ ...editForm, birthday: e.target.value })}
                      placeholder="Ej. 15 de Octubre"
                      className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/10 text-white"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Estado de la cuenta</label>
                    <select
                      value={editForm.active ? 'active' : 'inactive'}
                      onChange={(e) => setEditForm({ ...editForm, active: e.target.value === 'active' })}
                      className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/10 text-white"
                    >
                      <option value="active">Activo</option>
                      <option value="inactive">Inactivo / Bloqueado</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-slate-400 block mb-1">Notas de Estilo, Corte y Preferencias</label>
                    <textarea
                      rows={3}
                      value={editForm.notes || ''}
                      onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                      placeholder="Ej. Le gusta degradado medio con navaja, poco producto, peinado hacia la derecha..."
                      className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/10 text-white"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 2. TAB: POINTS ENGINE & MODIFIER */}
          {activeTab === 'points' && (
            <div className="space-y-4">
              {/* CURRENT BALANCE BANNER */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-[#181D26] to-[#0F1218] border border-[#D4AF37]/40 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Balance Actual de Puntos</span>
                  <span className="text-2xl font-black text-[#D4AF37] font-mono tracking-wider">
                    {user.points ?? 100} PTS
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">Nivel</span>
                  <span className="font-bold text-white text-xs px-2.5 py-1 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/30 text-[#D4AF37]">
                    {user.membershipTier || 'VIP'}
                  </span>
                </div>
              </div>

              {/* QUICK POINTS MODIFIER */}
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>Modificar o Abonar Puntos</span>
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    onClick={() => handleApplyPoints('add', 50)}
                    disabled={isUpdatingPoints}
                    className="p-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-bold transition-all active:scale-95"
                  >
                    +50 Puntos
                  </button>
                  <button
                    onClick={() => handleApplyPoints('add', 100)}
                    disabled={isUpdatingPoints}
                    className="p-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-bold transition-all active:scale-95"
                  >
                    +100 Puntos
                  </button>
                  <button
                    onClick={() => handleApplyPoints('deduct', 50)}
                    disabled={isUpdatingPoints}
                    className="p-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 font-bold transition-all active:scale-95"
                  >
                    -50 Puntos
                  </button>
                  <button
                    onClick={() => handleApplyPoints('deduct', 100)}
                    disabled={isUpdatingPoints}
                    className="p-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 font-bold transition-all active:scale-95"
                  >
                    -100 Puntos
                  </button>
                </div>

                {/* Custom Points Input */}
                <div className="pt-2 border-t border-white/5 space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-slate-400 block mb-1">Cantidad personalizada</label>
                      <input
                        type="number"
                        value={pointsDelta}
                        onChange={(e) => setPointsDelta(Number(e.target.value))}
                        className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/10 text-white font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">Motivo / Concepto</label>
                      <input
                        type="text"
                        value={pointsReason}
                        onChange={(e) => setPointsReason(e.target.value)}
                        placeholder="Ej. Cortesía por recomendación"
                        className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/10 text-white"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => handleApplyPoints('add')}
                      disabled={isUpdatingPoints}
                      className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all shadow-md"
                    >
                      Abonar (+{pointsDelta})
                    </button>
                    <button
                      onClick={() => handleApplyPoints('deduct')}
                      disabled={isUpdatingPoints}
                      className="flex-1 py-2.5 rounded-xl bg-rose-600/80 hover:bg-rose-600 text-white font-bold transition-all shadow-md"
                    >
                      Descontar (-{pointsDelta})
                    </button>
                    <button
                      onClick={() => handleApplyPoints('set')}
                      disabled={isUpdatingPoints}
                      className="py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 font-bold transition-all"
                      title="Fijar exactamente esta cantidad"
                    >
                      Fijar Total ({pointsDelta})
                    </button>
                  </div>
                </div>
              </div>

              {/* POINTS HISTORY LOG */}
              <div className="space-y-2">
                <h4 className="font-bold text-white text-xs">Historial Reciente de Puntos</h4>
                {(!user.pointsHistory || user.pointsHistory.length === 0) ? (
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 text-slate-400 text-center">
                    No hay movimientos manuales registrados aún.
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {user.pointsHistory.map((item) => (
                      <div
                        key={item.id}
                        className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between"
                      >
                        <div>
                          <p className="text-white font-semibold">{item.reason}</p>
                          <span className="text-[10px] text-slate-500">
                            {formatDateSpanish(item.date.substring(0, 10))} • {item.date.substring(11, 16)}
                          </span>
                        </div>
                        <span
                          className={`font-mono font-bold text-xs ${
                            item.amount >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {item.amount >= 0 ? `+${item.amount}` : item.amount} pts
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 3. TAB: VISITAS & APPOINTMENTS */}
          {activeTab === 'visits' && (
            <div className="space-y-4">
              {/* MANUAL VISITS ADJUSTMENT CARD */}
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-white text-xs">Ajuste de Visitas Realizadas</h4>
                    <p className="text-[11px] text-slate-400">
                      Citas completadas en sistema: <strong>{completedAppointments.length}</strong> + Visitas adicionales: <strong>{user.manualVisits || 0}</strong>
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Visible</span>
                    <span className="text-xl font-black text-white font-mono">{totalCompletedVisits} Visitas</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="number"
                    min={0}
                    value={visitsInput}
                    onChange={(e) => setVisitsInput(Number(e.target.value))}
                    className="w-32 p-2.5 rounded-xl bg-slate-900 border border-white/10 text-white font-mono font-bold text-center"
                  />
                  <button
                    onClick={handleSaveVisits}
                    disabled={isUpdatingVisits}
                    className="px-4 py-2.5 rounded-xl bg-[#D4AF37] text-slate-950 font-bold hover:bg-[#E5B869] transition-all"
                  >
                    {isUpdatingVisits ? 'Guardando...' : 'Actualizar Visitas Manuales'}
                  </button>
                  <button
                    onClick={() => setVisitsInput((prev) => prev + 1)}
                    className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 font-bold"
                    title="+1 Visita"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setVisitsInput((prev) => Math.max(0, prev - 1))}
                    className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 font-bold"
                    title="-1 Visita"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* APPOINTMENT TIMELINE */}
              <div className="space-y-2">
                <h4 className="font-bold text-white text-xs">Historial Completo de Citas</h4>
                {userAppointments.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 text-slate-400 text-center">
                    Este usuario aún no tiene citas registradas en el sistema.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {userAppointments.map((app) => (
                      <div
                        key={app.id}
                        className="p-3 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-xs">{app.serviceNameSnapshot}</span>
                            <span
                              className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                app.status === 'completed'
                                  ? 'bg-blue-500/20 text-blue-300'
                                  : app.status === 'confirmed'
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : 'bg-rose-500/20 text-rose-300'
                              }`}
                            >
                              {app.status}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            💈 Barbero: <strong className="text-[#D4AF37]">{app.barberName}</strong> • 📅 {formatDateSpanish(app.date)} {formatTime12h(app.startTime)}
                          </p>
                          {app.notes && (
                            <p className="text-[10px] text-slate-500 italic mt-0.5">Nota: "{app.notes}"</p>
                          )}
                        </div>

                        <span className="font-mono font-bold text-white text-xs self-end sm:self-auto">
                          {formatCurrency(app.servicePriceSnapshot)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 4. TAB: PURCHASES & CONSUMOS */}
          {activeTab === 'purchases' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-white text-xs">Registro de Compras y Productos</h4>
                  <p className="text-[11px] text-slate-400">
                    Total gastado en productos: <strong className="text-emerald-400">{formatCurrency(totalSpentPurchases)}</strong>
                  </p>
                </div>

                <button
                  onClick={() => setIsAddingPurchase(!isAddingPurchase)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#D4AF37] text-slate-950 font-bold hover:bg-[#E5B869] transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Registrar Compra</span>
                </button>
              </div>

              {/* NEW PURCHASE FORM */}
              {isAddingPurchase && (
                <div className="p-4 rounded-2xl bg-white/[0.04] border border-[#D4AF37]/40 space-y-3 animate-in fade-in">
                  <h5 className="font-bold text-white text-xs">Registrar Nuevo Producto / Venta</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-slate-400 block mb-1">Producto o Concepto *</label>
                      <input
                        type="text"
                        value={newPurchaseName}
                        onChange={(e) => setNewPurchaseName(e.target.value)}
                        placeholder="Ej. Cera Pomada Mate 100ml"
                        className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/10 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">Precio ($ MXN) *</label>
                      <input
                        type="number"
                        value={newPurchasePrice}
                        onChange={(e) => setNewPurchasePrice(Number(e.target.value))}
                        className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/10 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">Barbero que atendió (opcional)</label>
                      <input
                        type="text"
                        value={newPurchaseBarber}
                        onChange={(e) => setNewPurchaseBarber(e.target.value)}
                        placeholder="Ej. Ramón"
                        className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/10 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">Notas (opcional)</label>
                      <input
                        type="text"
                        value={newPurchaseNotes}
                        onChange={(e) => setNewPurchaseNotes(e.target.value)}
                        placeholder="Ej. Pago con tarjeta"
                        className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/10 text-white"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => setIsAddingPurchase(false)}
                      className="px-3 py-2 rounded-xl bg-white/5 text-slate-300 font-semibold"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleAddPurchase}
                      disabled={isSavingPurchase}
                      className="px-4 py-2 rounded-xl bg-[#D4AF37] text-slate-950 font-bold hover:bg-[#E5B869]"
                    >
                      {isSavingPurchase ? 'Guardando...' : 'Guardar Compra'}
                    </button>
                  </div>
                </div>
              )}

              {/* LIST OF PURCHASES */}
              {(!user.purchases || user.purchases.length === 0) ? (
                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 text-slate-400 text-center">
                  No hay compras de productos registradas para este cliente todavía.
                </div>
              ) : (
                <div className="space-y-2">
                  {user.purchases.map((p) => (
                    <div
                      key={p.id}
                      className="p-3 rounded-2xl bg-white/[0.02] border border-white/10 flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <ShoppingBag className="w-3.5 h-3.5 text-[#D4AF37]" />
                          <span className="font-bold text-white text-xs">{p.itemName}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          📅 {formatDateSpanish(p.date.substring(0, 10))} {p.barberName ? `• Barbero: ${p.barberName}` : ''} {p.notes ? `• (${p.notes})` : ''}
                        </p>
                      </div>
                      <span className="font-mono font-bold text-emerald-400 text-xs">
                        {formatCurrency(p.price)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 5. TAB: QR CODE */}
          {activeTab === 'qr' && (
            <div className="p-4 rounded-2xl bg-gradient-to-b from-[#161A22] to-[#0E1015] border-2 border-[#D4AF37]/50 text-center space-y-4 max-w-sm mx-auto shadow-2xl">
              <div className="flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[#D4AF37] text-xs font-bold w-fit mx-auto">
                <Crown className="w-3.5 h-3.5" />
                <span>PASE VIP • MONARCA</span>
              </div>

              {/* High Contrast QR Container */}
              <div className="relative mx-auto max-w-[200px] bg-white rounded-2xl p-3 shadow-2xl border-2 border-[#D4AF37]/30">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&margin=4&data=${encodeURIComponent(qrData)}`}
                  alt={`QR Cliente ${user.clientNumber}`}
                  className="w-full aspect-square object-contain block mx-auto select-none"
                />
              </div>

              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest block">
                  Número de Cliente
                </span>
                <span className="font-mono text-2xl font-black text-[#D4AF37] tracking-[0.25em]">
                  {user.clientNumber || '000000'}
                </span>
                <p className="font-bold text-white text-xs uppercase mt-1">{user.name}</p>
                {user.phone && <p className="font-mono text-slate-400 text-xs mt-0.5">{user.phone}</p>}
              </div>

              <button
                onClick={() => copyToClipboard(user.clientNumber || '', 'Número de cliente')}
                className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs flex items-center justify-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar Número de Cliente</span>
              </button>
            </div>
          )}

          {/* 6. TAB: PERMISSIONS & ROLE MANAGEMENT */}
          {activeTab === 'permissions' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>Control de Rol y Permisos de Acceso</span>
                </h4>
                <p className="text-slate-300 text-xs leading-relaxed">
                  Asigna el nivel de privilegios para este usuario dentro del sistema de Monarca Barber.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
                  {/* CLIENT ROLE */}
                  <button
                    onClick={() => handleRoleChange('client')}
                    className={`p-3.5 rounded-2xl border text-left transition-all ${
                      user.role === 'client'
                        ? 'bg-[#D4AF37]/15 border-[#D4AF37] text-white shadow-lg'
                        : 'bg-white/[0.02] border-white/10 text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <User className={`w-4 h-4 ${user.role === 'client' ? 'text-[#D4AF37]' : 'text-slate-400'}`} />
                      {user.role === 'client' && <CheckCircle2 className="w-4 h-4 text-[#D4AF37]" />}
                    </div>
                    <span className="font-bold text-white block">Cliente</span>
                    <span className="text-[10px] text-slate-400 block mt-1">
                      Reserva citas, acumula puntos VIP y consulta su historial.
                    </span>
                  </button>

                  {/* BARBER ROLE */}
                  <button
                    onClick={() => handleRoleChange('barber')}
                    className={`p-3.5 rounded-2xl border text-left transition-all ${
                      user.role === 'barber'
                        ? 'bg-blue-500/15 border-blue-500 text-white shadow-lg'
                        : 'bg-white/[0.02] border-white/10 text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <Scissors className={`w-4 h-4 ${user.role === 'barber' ? 'text-blue-400' : 'text-slate-400'}`} />
                      {user.role === 'barber' && <CheckCircle2 className="w-4 h-4 text-blue-400" />}
                    </div>
                    <span className="font-bold text-white block">Barbero</span>
                    <span className="text-[10px] text-slate-400 block mt-1">
                      Acceso al panel de barbero, agenda de citas y creación de servicios propios.
                    </span>
                  </button>

                  {/* ADMIN ROLE */}
                  <button
                    onClick={() => handleRoleChange('admin')}
                    className={`p-3.5 rounded-2xl border text-left transition-all ${
                      user.role === 'admin'
                        ? 'bg-purple-500/15 border-purple-500 text-white shadow-lg'
                        : 'bg-white/[0.02] border-white/10 text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <Shield className={`w-4 h-4 ${user.role === 'admin' ? 'text-purple-400' : 'text-slate-400'}`} />
                      {user.role === 'admin' && <CheckCircle2 className="w-4 h-4 text-purple-400" />}
                    </div>
                    <span className="font-bold text-white block">Administrador</span>
                    <span className="text-[10px] text-slate-400 block mt-1">
                      Acceso total a métricas, catálogo, equipo, configuración global y usuarios.
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* BOTTOM ACTION BAR */}
        <div className="pt-2 border-t border-white/10 flex items-center justify-end gap-2 shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition-all"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
