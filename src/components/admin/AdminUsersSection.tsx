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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-[#E6E1D6] p-4 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <Users className="w-5 h-5 text-[#9A6B3B]" />
            <h3 className="font-display text-lg font-bold text-[#161514] uppercase tracking-wide">
              Directorio de Usuarios Registrados
            </h3>
            <span className="text-xs font-mono tabular-nums font-bold px-2 py-0.5 rounded bg-[#FBF6EE] text-[#7D542B] border border-[#9A6B3B]/30">
              {users.length} total
            </span>
          </div>
          <p className="text-xs text-[#5C5852] mt-0.5">
            Consulta expedientes de clientes, historial de visitas, compras, códigos QR, modifica puntos y asigna permisos de barbero o administrador.
          </p>
        </div>

        {/* QUICK STATS PILLS */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="px-3 py-1.5 rounded-xl bg-[#FAF9F6] border border-[#E6E1D6] text-xs">
            <span className="text-[#5C5852]">Clientes: </span>
            <strong className="font-mono tabular-nums text-[#161514]">{totalClients}</strong>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-sky-50 border border-sky-200 text-xs">
            <span className="text-sky-800">Barberos: </span>
            <strong className="font-mono tabular-nums text-[#161514]">{totalBarbers}</strong>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-purple-50 border border-purple-200 text-xs">
            <span className="text-purple-800">Admins: </span>
            <strong className="font-mono tabular-nums text-[#161514]">{totalAdmins}</strong>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-[#FBF6EE] border border-[#9A6B3B]/30 text-xs">
            <span className="text-[#7D542B]">Puntos Activos: </span>
            <strong className="text-[#161514] font-mono tabular-nums">{totalCirculatingPoints} pts</strong>
          </div>
        </div>
      </div>

      {/* SEARCH AND FILTER BAR */}
      <div className="p-3.5 rounded-2xl bg-white border border-[#E6E1D6] shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-[#767067] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre, teléfono, correo o No. de Cliente #849201..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#FAF9F6] border border-[#D2CBBF] text-[#161514] text-xs placeholder:text-[#8E887E] focus:outline-none focus:border-[#9A6B3B] transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5C5852] hover:text-[#161514] text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
            className="w-full sm:w-auto px-3 py-2 rounded-xl bg-[#FAF9F6] border border-[#D2CBBF] text-[#161514] text-xs font-medium focus:outline-none focus:border-[#9A6B3B]"
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
            className="w-full sm:w-auto px-3 py-2 rounded-xl bg-[#FAF9F6] border border-[#D2CBBF] text-[#161514] text-xs font-medium focus:outline-none focus:border-[#9A6B3B]"
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
            className="w-full sm:w-auto px-3 py-2 rounded-xl bg-[#FAF9F6] border border-[#D2CBBF] text-[#161514] text-xs font-medium focus:outline-none focus:border-[#9A6B3B]"
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
        <div className="p-12 rounded-2xl bg-white border border-[#E6E1D6] text-center space-y-2">
          <RefreshCw className="w-6 h-6 text-[#9A6B3B] animate-spin mx-auto" />
          <p className="text-xs text-[#5C5852]">Cargando directorio de usuarios...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="p-10 rounded-2xl bg-white border border-[#E6E1D6] text-center space-y-2">
          <Users className="w-8 h-8 text-[#8E887E] mx-auto" />
          <p className="text-sm font-bold text-[#161514]">No se encontraron usuarios</p>
          <p className="text-xs text-[#5C5852]">
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
                className="group rounded-2xl bg-white hover:bg-[#FAF7F0] border border-[#E6E1D6] hover:border-[#9A6B3B]/60 p-4 transition-all duration-150 cursor-pointer shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                {/* User Identity Column */}
                <div className="flex items-center gap-3.5 min-w-0">
                  {user.photoUrl ? (
                    <img
                      src={user.photoUrl}
                      alt={user.name}
                      className="w-12 h-12 rounded-xl object-cover border border-[#D2CBBF] shrink-0"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-[#161514] text-[#C69765] font-black text-lg flex items-center justify-center border border-[#D2CBBF] shadow-sm shrink-0">
                      {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                  )}

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-[#161514] text-sm group-hover:text-[#9A6B3B] transition-colors truncate">
                        {user.name}
                      </h4>

                      {/* Role Tag */}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase border ${
                          user.role === 'admin'
                            ? 'bg-purple-50 text-purple-800 border-purple-200'
                            : user.role === 'barber'
                            ? 'bg-sky-50 text-sky-800 border-sky-200'
                            : 'bg-[#FBF6EE] text-[#7D542B] border-[#9A6B3B]/30'
                        }`}
                      >
                        {user.role === 'admin' ? 'Admin' : user.role === 'barber' ? 'Barbero' : 'Cliente'}
                      </span>

                      {/* Tier Tag */}
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#F2EFE9] text-[#5C5852] border border-[#E6E1D6]">
                        {user.membershipTier || 'VIP'}
                      </span>

                      {!user.active && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-200">
                          Inactivo
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-[#5C5852] mt-1 flex-wrap font-mono tabular-nums">
                      <span className="text-[#9A6B3B] font-bold">
                        #{user.clientNumber || 'Sin número'}
                      </span>
                      {user.phone && <span className="text-[#161514]">• {user.phone}</span>}
                      {user.email && <span className="text-[#767067] font-sans truncate max-w-[200px]">• {user.email}</span>}
                    </div>

                    {user.notes && (
                      <p className="text-[11px] text-[#767067] italic line-clamp-1 mt-1">
                        "{user.notes}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Metrics Column */}
                <div className="flex items-center gap-4 text-xs shrink-0 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-[#E6E1D6]">
                  <div className="text-left md:text-right">
                    <span className="text-[10px] text-[#5C5852] uppercase font-bold block">Puntos VIP</span>
                    <span className="font-mono tabular-nums font-black text-[#9A6B3B] text-sm block">
                      {user.points ?? 100} pts
                    </span>
                  </div>

                  <div className="text-left md:text-right">
                    <span className="text-[10px] text-[#5C5852] uppercase font-bold block">Visitas</span>
                    <span className="font-mono tabular-nums font-bold text-[#161514] text-sm block">
                      {totalVisits}
                    </span>
                  </div>

                  <div className="text-left md:text-right">
                    <span className="text-[10px] text-[#5C5852] uppercase font-bold block">Total Consumo</span>
                    <span className="font-mono tabular-nums font-bold text-emerald-700 text-sm block">
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
                      className="p-2 rounded-xl bg-[#F2EFE9] hover:bg-[#E8E3D9] border border-[#D2CBBF] text-[#9A6B3B] transition-all"
                      title="Ver Código QR del Cliente"
                    >
                      <QrCode className="w-4 h-4" />
                    </button>

                    {/* Role Quick Selector */}
                    <select
                      value={user.role}
                      onChange={(e) => handleQuickRoleChange(user, e.target.value as UserRole, e as any)}
                      className="px-2.5 py-1.5 rounded-xl bg-[#FAF9F6] border border-[#D2CBBF] text-[#161514] text-[11px] font-bold focus:outline-none focus:border-[#9A6B3B]"
                      title="Cambiar rol"
                    >
                      <option value="client">Cliente</option>
                      <option value="barber">Barbero</option>
                      <option value="admin">Admin</option>
                    </select>

                    {/* Open Details Button */}
                    <button
                      onClick={() => handleOpenUserModal(user)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#161514] hover:bg-[#2A2826] text-[#FAF9F6] font-bold text-xs shadow-sm transition-all active:scale-95"
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#161514]/55 backdrop-blur-sm animate-in fade-in"
          onClick={() => setQuickQrUser(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-[#FAF9F6] border-2 border-[#9A6B3B]/60 p-6 space-y-4 text-center shadow-2xl animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-[#161514] text-[#C69765] text-xs font-bold w-fit mx-auto">
              <Crown className="w-3.5 h-3.5" />
              <span>PASE VIP MONARCA BARBER</span>
            </div>

            <div className="bg-white p-3 rounded-2xl max-w-[200px] mx-auto shadow-md border border-[#E6E1D6]">
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
              <span className="text-[10px] text-[#5C5852] uppercase font-bold tracking-widest block">
                Número de Cliente
              </span>
              <span className="font-mono tabular-nums text-2xl font-black text-[#9A6B3B] tracking-[0.25em]">
                #{quickQrUser.clientNumber || '000000'}
              </span>
              <h3 className="font-bold text-[#161514] text-sm mt-1">{quickQrUser.name}</h3>
              <p className="text-xs text-[#5C5852] font-mono tabular-nums">{quickQrUser.phone || 'Sin teléfono'}</p>
            </div>

            <button
              onClick={() => setQuickQrUser(null)}
              className="w-full py-2.5 rounded-xl bg-[#161514] hover:bg-[#2A2826] text-[#FAF9F6] font-bold text-xs"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
