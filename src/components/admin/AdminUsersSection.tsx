import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Filter,
  Crown,
  Sparkles,
  Scissors,
  Shield,
  User,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  QrCode,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Plus,
  ArrowUpDown,
  RefreshCw,
} from 'lucide-react';
import { UserProfile, Appointment, UserRole } from '../../types';
import { dataService } from '../../services/firebase/dataService';
import { formatCurrency, formatDateSpanish } from '../../utils/dateTime';
import { useBarbershop } from '../../contexts/BarbershopContext';
import { AdminUserDetailsModal } from './AdminUserDetailsModal';

interface AdminUsersSectionProps {
  appointments: Appointment[];
}

export const AdminUsersSection: React.FC<AdminUsersSectionProps> = ({ appointments }) => {
  const { showToast } = useBarbershop();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'client' | 'barber' | 'admin'>('all');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'points' | 'name' | 'visits'>('newest');

  // Selected User for Detail / Edit Modal
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Quick QR Preview Modal
  const [quickQrUser, setQuickQrUser] = useState<UserProfile | null>(null);

  // Subscribe in real-time to users collection
  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = dataService.subscribeToUsers((fetchedUsers) => {
      setUsers(fetchedUsers);
      setIsLoading(false);
      // Keep selected user fresh if open
      if (selectedUser) {
        const updated = fetchedUsers.find((u) => u.id === selectedUser.id);
        if (updated) setSelectedUser(updated);
      }
    });

    return () => unsubscribe();
  }, []);

  // Compute visits and spend map per user for fast lookup
  const userStatsMap = React.useMemo(() => {
    const map: Record<string, { visits: number; spent: number; lastDate: string | null }> = {};
    for (const app of appointments) {
      if (!app.clientId) continue;
      if (!map[app.clientId]) {
        map[app.clientId] = { visits: 0, spent: 0, lastDate: null };
      }
      if (app.status === 'completed') {
        map[app.clientId].visits += 1;
        map[app.clientId].spent += app.servicePriceSnapshot || 0;
      }
      if (!map[app.clientId].lastDate || app.date > map[app.clientId].lastDate!) {
        map[app.clientId].lastDate = app.date;
      }
    }
    return map;
  }, [appointments]);

  // Filter and Sort Users
  const filteredUsers = React.useMemo(() => {
    return users
      .filter((u) => {
        // Search Filter
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase().trim();
          const matchName = u.name.toLowerCase().includes(q);
          const matchPhone = u.phone ? u.phone.includes(q) : false;
          const matchEmail = u.email ? u.email.toLowerCase().includes(q) : false;
          const matchNumber = u.clientNumber ? u.clientNumber.includes(q) : false;
          if (!matchName && !matchPhone && !matchEmail && !matchNumber) return false;
        }

        // Role Filter
        if (roleFilter !== 'all' && u.role !== roleFilter) return false;

        // Tier Filter
        if (tierFilter !== 'all' && (u.membershipTier || 'VIP') !== tierFilter) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') {
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        }
        if (sortBy === 'points') {
          return (b.points || 0) - (a.points || 0);
        }
        if (sortBy === 'name') {
          return a.name.localeCompare(b.name);
        }
        if (sortBy === 'visits') {
          const aVisits = (userStatsMap[a.id]?.visits || 0) + (a.manualVisits || 0);
          const bVisits = (userStatsMap[b.id]?.visits || 0) + (b.manualVisits || 0);
          return bVisits - aVisits;
        }
        return 0;
      });
  }, [users, searchTerm, roleFilter, tierFilter, sortBy, userStatsMap]);

  // Overall Metrics
  const totalClients = users.filter((u) => u.role === 'client').length;
  const totalBarbers = users.filter((u) => u.role === 'barber').length;
  const totalAdmins = users.filter((u) => u.role === 'admin').length;
  const totalCirculatingPoints = users.reduce((acc, u) => acc + (u.points || 0), 0);

  const handleOpenUserModal = (user: UserProfile) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const handleQuickRoleChange = async (user: UserProfile, newRole: UserRole, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await dataService.updateUserRole(user.id, newRole);
      showToast('success', 'Rol asignado', `Permiso de ${newRole.toUpperCase()} actualizado para ${user.name}`);
    } catch (err: any) {
      showToast('error', 'Error', err.message);
    }
  };

  return (
    <div className="space-y-4">
      {/* HEADER & METRIC SUMMARY */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#14171E] border border-white/10 p-4 rounded-2xl">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#D4AF37]" />
            <h3 className="text-base font-bold text-white">Directorio de Usuarios Registrados</h3>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30">
              {users.length} total
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Consulta expedientes de clientes, historial de visitas, compras, códigos QR, modifica puntos y asigna permisos de barbero o administrador.
          </p>
        </div>

        {/* QUICK STATS PILLS */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs">
            <span className="text-slate-400">Clientes: </span>
            <strong className="text-white">{totalClients}</strong>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs">
            <span className="text-blue-300">Barberos: </span>
            <strong className="text-white">{totalBarbers}</strong>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs">
            <span className="text-purple-300">Admins: </span>
            <strong className="text-white">{totalAdmins}</strong>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/25 text-xs">
            <span className="text-[#D4AF37]">Puntos Activos: </span>
            <strong className="text-white font-mono">{totalCirculatingPoints} pts</strong>
          </div>
        </div>
      </div>

      {/* SEARCH AND FILTER BAR */}
      <div className="p-3.5 rounded-2xl bg-[#14171E] border border-white/10 space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre, teléfono, correo o No. de Cliente #849201..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs placeholder:text-slate-500 focus:border-[#D4AF37] transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
            className="w-full sm:w-auto px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs"
          >
            <option value="all">Todos los Roles</option>
            <option value="client">Solo Clientes</option>
            <option value="barber">Solo Barberos</option>
            <option value="admin">Solo Administradores</option>
          </select>

          {/* Tier Filter */}
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs"
          >
            <option value="all">Todas las Membresías</option>
            <option value="VIP">Membresía VIP</option>
            <option value="Gold">Membresía Gold</option>
            <option value="Black">Membresía Black</option>
            <option value="Classic">Membresía Classic</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="w-full sm:w-auto px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs"
          >
            <option value="newest">Más Recientes</option>
            <option value="points">Mayor Puntos VIP</option>
            <option value="visits">Mayor Cantidad de Visitas</option>
            <option value="name">Alfabético (Nombre)</option>
          </select>
        </div>
      </div>

      {/* USERS LIST TABLE / CARDS */}
      {isLoading ? (
        <div className="p-12 rounded-3xl bg-[#14171E] border border-white/10 text-center space-y-2">
          <RefreshCw className="w-6 h-6 text-[#D4AF37] animate-spin mx-auto" />
          <p className="text-xs text-slate-400">Cargando directorio de usuarios...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="p-10 rounded-3xl bg-[#14171E] border border-white/10 text-center space-y-2">
          <Users className="w-8 h-8 text-slate-500 mx-auto" />
          <p className="text-sm font-bold text-white">No se encontraron usuarios</p>
          <p className="text-xs text-slate-400">
            Intenta cambiar los filtros de búsqueda o restablecer el término ingresado.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filteredUsers.map((user) => {
            const stats = userStatsMap[user.id] || { visits: 0, spent: 0, lastDate: null };
            const totalVisits = stats.visits + (user.manualVisits || 0);
            const totalSpentPurchases = (user.purchases || []).reduce((acc, p) => acc + (p.price || 0), 0);
            const totalSpent = stats.spent + totalSpentPurchases;

            return (
              <div
                key={user.id}
                onClick={() => handleOpenUserModal(user)}
                className="group rounded-2xl bg-[#14171E] hover:bg-[#181D26] border border-white/10 hover:border-[#D4AF37]/50 p-4 transition-all duration-150 cursor-pointer shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                {/* User Identity Column */}
                <div className="flex items-center gap-3.5 min-w-0">
                  {user.photoUrl ? (
                    <img
                      src={user.photoUrl}
                      alt={user.name}
                      className="w-12 h-12 rounded-2xl object-cover border border-[#D4AF37]/50 shrink-0"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#996515] to-[#D4AF37] text-slate-950 font-black text-lg flex items-center justify-center border border-white/10 shadow shrink-0">
                      {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                  )}

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-white text-sm group-hover:text-[#D4AF37] transition-colors truncate">
                        {user.name}
                      </h4>

                      {/* Role Pill */}
                      <span
                        className={`text-[9px] font-bold px-2 py-0.2 rounded-full uppercase border ${
                          user.role === 'admin'
                            ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                            : user.role === 'barber'
                            ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                            : 'bg-[#D4AF37]/15 text-[#D4AF37] border-[#D4AF37]/30'
                        }`}
                      >
                        {user.role === 'admin' ? 'Admin' : user.role === 'barber' ? 'Barbero' : 'Cliente'}
                      </span>

                      {/* Tier Pill */}
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-white/5 text-amber-300 border border-white/10">
                        {user.membershipTier || 'VIP'}
                      </span>

                      {!user.active && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300">
                          Inactivo
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-1 flex-wrap font-mono">
                      <span className="text-[#D4AF37] font-bold">
                        #{user.clientNumber || 'Sin número'}
                      </span>
                      {user.phone && <span className="text-slate-300">• 📱 {user.phone}</span>}
                      {user.email && <span className="text-slate-400 truncate max-w-[200px]">• ✉️ {user.email}</span>}
                    </div>

                    {user.notes && (
                      <p className="text-[11px] text-slate-400 italic line-clamp-1 mt-1">
                        "{user.notes}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Metrics Column */}
                <div className="flex items-center gap-4 text-xs shrink-0 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-white/5">
                  <div className="text-left md:text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Puntos VIP</span>
                    <span className="font-mono font-black text-[#D4AF37] text-sm block">
                      {user.points ?? 100} pts
                    </span>
                  </div>

                  <div className="text-left md:text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Visitas</span>
                    <span className="font-mono font-bold text-white text-sm block">
                      {totalVisits}
                    </span>
                  </div>

                  <div className="text-left md:text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Consumo</span>
                    <span className="font-mono font-bold text-emerald-400 text-sm block">
                      {formatCurrency(totalSpent)}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    {/* QR Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setQuickQrUser(user);
                      }}
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-[#D4AF37] hover:scale-105 transition-all"
                      title="Ver Código QR del Cliente"
                    >
                      <QrCode className="w-4 h-4" />
                    </button>

                    {/* Role Quick Selector */}
                    <select
                      value={user.role}
                      onChange={(e) => handleQuickRoleChange(user, e.target.value as UserRole, e as any)}
                      className="px-2 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-white text-[11px] font-bold"
                      title="Cambiar rol"
                    >
                      <option value="client">Cliente</option>
                      <option value="barber">Barbero</option>
                      <option value="admin">Admin</option>
                    </select>

                    {/* Open Details Button */}
                    <button
                      onClick={() => handleOpenUserModal(user)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#D4AF37] hover:bg-[#E5B869] text-slate-950 font-bold text-xs shadow-md transition-all active:scale-95"
                    >
                      <span>Expediente</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DETAILED USER EXPEDIENTE MODAL */}
      <AdminUserDetailsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        user={selectedUser}
        appointments={appointments}
        onUserUpdated={() => {
          // Trigger any refresh if needed
        }}
      />

      {/* QUICK QR PREVIEW MODAL */}
      {quickQrUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in"
          onClick={() => setQuickQrUser(null)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-[#14171E] border-2 border-[#D4AF37]/60 p-6 space-y-4 text-center shadow-2xl animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[#D4AF37] text-xs font-bold w-fit mx-auto">
              <Crown className="w-3.5 h-3.5" />
              <span>PASE VIP MONARCA BARBER</span>
            </div>

            <div className="bg-white p-3 rounded-2xl max-w-[200px] mx-auto shadow-xl">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&margin=4&data=${encodeURIComponent(
                  JSON.stringify({
                    monarca_client_id: quickQrUser.clientNumber || '000000',
                    name: quickQrUser.name,
                    phone: quickQrUser.phone,
                  })
                )}`}
                alt="QR Code"
                className="w-full aspect-square object-contain"
              />
            </div>

            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest block">
                Número de Cliente
              </span>
              <span className="font-mono text-2xl font-black text-[#D4AF37] tracking-[0.25em]">
                #{quickQrUser.clientNumber || '000000'}
              </span>
              <h3 className="font-bold text-white text-sm mt-1">{quickQrUser.name}</h3>
              <p className="text-xs text-slate-400">{quickQrUser.phone || 'Sin teléfono'}</p>
            </div>

            <button
              onClick={() => setQuickQrUser(null)}
              className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
