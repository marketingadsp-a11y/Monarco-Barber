import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Calendar,
  Users,
  DollarSign,
  Package,
  Scissors,
  Award,
  Sparkles,
  ChevronDown,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  ShoppingBag,
  Star,
  UserCheck,
  ArrowUpRight,
  Receipt,
  Eye,
} from 'lucide-react';
import { Appointment, Barber, PosSale, Service } from '../../types';
import { formatCurrency, formatDateSpanish, getTodayDateString } from '../../utils/dateTime';

interface AdminMetricsSectionProps {
  appointments: Appointment[];
  posSales: PosSale[];
  barbers: Barber[];
  services: Service[];
  onSelectBarberFilter?: (barberId: string) => void;
  onNavigateToSection?: (section: any) => void;
}

type DateFilterMode = 'today' | 'last_7_days' | 'this_month' | 'last_month' | 'all' | 'specific' | 'range';

export const AdminMetricsSection: React.FC<AdminMetricsSectionProps> = ({
  appointments,
  posSales,
  barbers,
  services,
  onNavigateToSection,
}) => {
  const todayStr = getTodayDateString();

  // Date Filtering State
  const [filterMode, setFilterMode] = useState<DateFilterMode>('this_month');
  const [specificDate, setSpecificDate] = useState<string>(todayStr);
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(1); // First day of current month
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
  });
  const [endDate, setEndDate] = useState<string>(todayStr);

  // Barber Filter State
  const [selectedBarberId, setSelectedBarberId] = useState<string>('all');

  // Activity Log Filter Tab
  const [activityTab, setActivityTab] = useState<'all' | 'appointments' | 'sales'>('all');

  // Compute Active Date Range Bounds
  const dateRangeBounds = useMemo(() => {
    const now = new Date();

    if (filterMode === 'today') {
      return { start: todayStr, end: todayStr, label: 'Hoy' };
    }

    if (filterMode === 'last_7_days') {
      const past7 = new Date();
      past7.setDate(past7.getDate() - 6);
      const m = (past7.getMonth() + 1).toString().padStart(2, '0');
      const d = past7.getDate().toString().padStart(2, '0');
      const start = `${past7.getFullYear()}-${m}-${d}`;
      return { start, end: todayStr, label: 'Últimos 7 días' };
    }

    if (filterMode === 'this_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const start = `${firstDay.getFullYear()}-${(firstDay.getMonth() + 1).toString().padStart(2, '0')}-01`;
      const end = `${lastDay.getFullYear()}-${(lastDay.getMonth() + 1).toString().padStart(2, '0')}-${lastDay.getDate().toString().padStart(2, '0')}`;
      return { start, end, label: 'Este Mes' };
    }

    if (filterMode === 'last_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
      const start = `${firstDay.getFullYear()}-${(firstDay.getMonth() + 1).toString().padStart(2, '0')}-01`;
      const end = `${lastDay.getFullYear()}-${(lastDay.getMonth() + 1).toString().padStart(2, '0')}-${lastDay.getDate().toString().padStart(2, '0')}`;
      return { start, end, label: 'Mes Anterior' };
    }

    if (filterMode === 'specific') {
      return { start: specificDate || todayStr, end: specificDate || todayStr, label: `Fecha: ${specificDate}` };
    }

    if (filterMode === 'range') {
      const start = startDate || '2000-01-01';
      const end = endDate || '2099-12-31';
      return { start, end, label: `Del ${start} al ${end}` };
    }

    // Default: 'all'
    return { start: '1970-01-01', end: '2099-12-31', label: 'Todo el Histórico' };
  }, [filterMode, specificDate, startDate, endDate, todayStr]);

  // Helper to extract YYYY-MM-DD from an ISO string
  const getIsoDateString = (isoString?: string) => {
    if (!isoString) return '';
    return isoString.substring(0, 10);
  };

  // 1. FILTERED APPOINTMENTS
  const filteredAppointments = useMemo(() => {
    return appointments.filter((app) => {
      // Date filter
      if (app.date < dateRangeBounds.start || app.date > dateRangeBounds.end) {
        return false;
      }
      // Barber filter
      if (selectedBarberId !== 'all' && app.barberId !== selectedBarberId) {
        return false;
      }
      return true;
    });
  }, [appointments, dateRangeBounds, selectedBarberId]);

  // 2. FILTERED POS SALES
  const filteredSales = useMemo(() => {
    return posSales.filter((sale) => {
      const saleDate = getIsoDateString(sale.createdAt);
      // Date filter
      if (saleDate < dateRangeBounds.start || saleDate > dateRangeBounds.end) {
        return false;
      }
      // Barber filter
      if (selectedBarberId !== 'all' && sale.barberId !== selectedBarberId) {
        return false;
      }
      return true;
    });
  }, [posSales, dateRangeBounds, selectedBarberId]);

  // METRICS COMPUTATIONS OVER FILTERED DATA
  const completedAppointments = filteredAppointments.filter((a) => a.status === 'completed');
  const confirmedAppointments = filteredAppointments.filter((a) => a.status === 'confirmed');
  const cancelledAppointments = filteredAppointments.filter((a) => a.status === 'cancelled');
  const noShowAppointments = filteredAppointments.filter((a) => a.status === 'no_show');

  const servicesRevenue = completedAppointments.reduce((acc, a) => acc + (a.servicePriceSnapshot || 0), 0);
  const productsRevenue = filteredSales.reduce((acc, s) => acc + (s.total || 0), 0);
  const totalRevenue = servicesRevenue + productsRevenue;

  const totalPointsAwardedFromSales = filteredSales.reduce((acc, s) => acc + (s.pointsAwarded || 0), 0);
  // Estimate service points (e.g. 50 pts per completed appt)
  const totalServicePointsAwarded = completedAppointments.length * 50;
  const totalPointsAwarded = totalPointsAwardedFromSales + totalServicePointsAwarded;

  const totalTransactionsCount = completedAppointments.length + filteredSales.length;
  const averageTicket = totalTransactionsCount > 0 ? totalRevenue / totalTransactionsCount : 0;

  // PER-BARBER METRICS BREAKDOWN
  const barberMetrics = useMemo(() => {
    return barbers.map((barber) => {
      const barberAppts = appointments.filter((a) => {
        if (a.barberId !== barber.id) return false;
        return a.date >= dateRangeBounds.start && a.date <= dateRangeBounds.end;
      });

      const barberSales = posSales.filter((s) => {
        if (s.barberId !== barber.id) return false;
        const sDate = getIsoDateString(s.createdAt);
        return sDate >= dateRangeBounds.start && sDate <= dateRangeBounds.end;
      });

      const bCompleted = barberAppts.filter((a) => a.status === 'completed');
      const bConfirmed = barberAppts.filter((a) => a.status === 'confirmed');
      const bCancelled = barberAppts.filter((a) => a.status === 'cancelled');
      const bNoShow = barberAppts.filter((a) => a.status === 'no_show');

      const bServicesRevenue = bCompleted.reduce((acc, a) => acc + (a.servicePriceSnapshot || 0), 0);
      const bProductsRevenue = barberSales.reduce((acc, s) => acc + (s.total || 0), 0);
      const bTotalRevenue = bServicesRevenue + bProductsRevenue;

      const bTotalTrans = bCompleted.length + barberSales.length;
      const bAvgTicket = bTotalTrans > 0 ? bTotalRevenue / bTotalTrans : 0;

      return {
        barber,
        totalAppointments: barberAppts.length,
        completedCount: bCompleted.length,
        confirmedCount: bConfirmed.length,
        cancelledCount: bCancelled.length,
        noShowCount: bNoShow.length,
        servicesRevenue: bServicesRevenue,
        productsRevenue: bProductsRevenue,
        salesCount: barberSales.length,
        totalRevenue: bTotalRevenue,
        avgTicket: bAvgTicket,
        revenueShare: totalRevenue > 0 ? Math.round((bTotalRevenue / totalRevenue) * 100) : 0,
      };
    }).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [barbers, appointments, posSales, dateRangeBounds, totalRevenue]);

  // COMBINED ACTIVITY LOG LIST
  const unifiedActivities = useMemo(() => {
    const list: Array<{
      id: string;
      type: 'appointment' | 'sale';
      date: string;
      time?: string;
      clientName: string;
      barberName: string;
      barberId: string;
      title: string;
      subtitle: string;
      amount: number;
      points?: number;
      status?: string;
    }> = [];

    if (activityTab === 'all' || activityTab === 'appointments') {
      filteredAppointments.forEach((a) => {
        list.push({
          id: `appt_${a.id}`,
          type: 'appointment',
          date: a.date,
          time: a.startTime,
          clientName: a.customerNameSnapshot || 'Cliente',
          barberName: a.barberNameSnapshot || 'Barbero',
          barberId: a.barberId,
          title: a.serviceNameSnapshot || 'Corte / Tratamiento',
          subtitle: `Cita #${a.id.substring(0, 6)} • ${a.startTime} - ${a.endTime}`,
          amount: a.status === 'completed' ? (a.servicePriceSnapshot || 0) : 0,
          points: a.status === 'completed' ? 50 : 0,
          status: a.status,
        });
      });
    }

    if (activityTab === 'all' || activityTab === 'sales') {
      filteredSales.forEach((s) => {
        const sDate = getIsoDateString(s.createdAt);
        const sTime = s.createdAt ? new Date(s.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '';
        const itemsSummary = (s.items || []).map((i) => `${i.quantity}x ${i.productName}`).join(', ');

        list.push({
          id: `sale_${s.id}`,
          type: 'sale',
          date: sDate,
          time: sTime,
          clientName: s.customerName || 'Público General',
          barberName: s.barberName || 'Barbero',
          barberId: s.barberId,
          title: itemsSummary || 'Venta de Productos POS',
          subtitle: `Venta POS • ${s.paymentMethod === 'cash' ? 'Efectivo' : s.paymentMethod === 'card' ? 'Tarjeta' : 'Transfer'}`,
          amount: s.total || 0,
          points: s.pointsAwarded || 0,
          status: 'completed',
        });
      });
    }

    // Sort by date/time descending
    return list.sort((a, b) => {
      const dtA = `${a.date} ${a.time || '00:00'}`;
      const dtB = `${b.date} ${b.time || '00:00'}`;
      return dtB.localeCompare(dtA);
    });
  }, [filteredAppointments, filteredSales, activityTab]);

  const selectedBarberObj = barbers.find((b) => b.id === selectedBarberId);

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* 1. FILTER CONTROLS BAR */}
      <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-[#181D26] via-[#14171E] to-[#12151B] border border-white/10 shadow-2xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37] shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>Métricas de Rendimiento & Facturación</span>
                {selectedBarberObj && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30 font-semibold">
                    {selectedBarberObj.displayName}
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400">
                Filtra por fecha específica, rango personalizado o barbero para analizar ingresos en tiempo real
              </p>
            </div>
          </div>

          {/* Barber Selector Dropdown */}
          <div className="flex items-center gap-2">
            <div className="relative min-w-[200px] w-full sm:w-auto">
              <Users className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <select
                value={selectedBarberId}
                onChange={(e) => setSelectedBarberId(e.target.value)}
                className="w-full pl-9 pr-8 py-2 rounded-2xl bg-[#0F1217] border border-white/15 text-white text-xs font-semibold focus:outline-none focus:border-[#D4AF37] appearance-none"
              >
                <option value="all">💈 Todos los Barberos ({barbers.length})</option>
                {barbers.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.displayName} {b.active ? '' : '(Inactivo)'}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {selectedBarberId !== 'all' && (
              <button
                onClick={() => setSelectedBarberId('all')}
                className="px-3 py-2 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold border border-white/10 transition-colors shrink-0"
                title="Limpiar filtro de barbero"
              >
                Ver Todos
              </button>
            )}
          </div>
        </div>

        {/* Date Filter Tabs & Pickers */}
        <div className="pt-3 border-t border-white/5 space-y-3">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <button
              onClick={() => setFilterMode('today')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                filterMode === 'today'
                  ? 'bg-[#D4AF37] text-slate-950 shadow'
                  : 'bg-black/30 text-slate-400 hover:text-white border border-white/5'
              }`}
            >
              Hoy
            </button>
            <button
              onClick={() => setFilterMode('last_7_days')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                filterMode === 'last_7_days'
                  ? 'bg-[#D4AF37] text-slate-950 shadow'
                  : 'bg-black/30 text-slate-400 hover:text-white border border-white/5'
              }`}
            >
              Últimos 7 Días
            </button>
            <button
              onClick={() => setFilterMode('this_month')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                filterMode === 'this_month'
                  ? 'bg-[#D4AF37] text-slate-950 shadow'
                  : 'bg-black/30 text-slate-400 hover:text-white border border-white/5'
              }`}
            >
              Este Mes
            </button>
            <button
              onClick={() => setFilterMode('last_month')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                filterMode === 'last_month'
                  ? 'bg-[#D4AF37] text-slate-950 shadow'
                  : 'bg-black/30 text-slate-400 hover:text-white border border-white/5'
              }`}
            >
              Mes Anterior
            </button>
            <button
              onClick={() => setFilterMode('specific')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1 ${
                filterMode === 'specific'
                  ? 'bg-[#D4AF37] text-slate-950 shadow'
                  : 'bg-black/30 text-slate-400 hover:text-white border border-white/5'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Fecha Específica</span>
            </button>
            <button
              onClick={() => setFilterMode('range')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1 ${
                filterMode === 'range'
                  ? 'bg-[#D4AF37] text-slate-950 shadow'
                  : 'bg-black/30 text-slate-400 hover:text-white border border-white/5'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Rango (Inicio - Fin)</span>
            </button>
            <button
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                filterMode === 'all'
                  ? 'bg-[#D4AF37] text-slate-950 shadow'
                  : 'bg-black/30 text-slate-400 hover:text-white border border-white/5'
              }`}
            >
              Todo el Histórico
            </button>
          </div>

          {/* Conditional Date Pickers based on Mode */}
          {filterMode === 'specific' && (
            <div className="p-3.5 rounded-2xl bg-[#0F1217] border border-[#D4AF37]/30 flex flex-col sm:flex-row items-start sm:items-center gap-3 animate-in fade-in">
              <span className="text-xs font-bold text-[#D4AF37] flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                <span>Seleccionar Fecha Específica:</span>
              </span>
              <input
                type="date"
                value={specificDate}
                onChange={(e) => setSpecificDate(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-900 border border-white/20 text-white text-xs font-semibold focus:outline-none focus:border-[#D4AF37]"
              />
              <span className="text-xs text-slate-400">
                Visualizando métricas exclusivamente del día: <strong>{formatDateSpanish(specificDate, true)}</strong>
              </span>
            </div>
          )}

          {filterMode === 'range' && (
            <div className="p-3.5 rounded-2xl bg-[#0F1217] border border-[#D4AF37]/30 flex flex-col sm:flex-row items-start sm:items-center gap-3 animate-in fade-in flex-wrap">
              <span className="text-xs font-bold text-[#D4AF37] flex items-center gap-1.5">
                <Filter className="w-4 h-4" />
                <span>Rango de Fechas:</span>
              </span>

              <div className="flex items-center gap-2">
                <div className="space-y-0.5">
                  <label className="text-[10px] text-slate-400 font-semibold block uppercase">Fecha Inicio</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 border border-white/20 text-white text-xs font-semibold focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <span className="text-slate-500 font-bold self-end pb-2">a</span>

                <div className="space-y-0.5">
                  <label className="text-[10px] text-slate-400 font-semibold block uppercase">Fecha Fin</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 border border-white/20 text-white text-xs font-semibold focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              <span className="text-xs text-slate-400">
                Periodo seleccionado: del <strong>{formatDateSpanish(startDate)}</strong> al <strong>{formatDateSpanish(endDate, true)}</strong>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 2. PRIMARY KPI SUMMARY CARDS FOR SELECTED RANGE & BARBER */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* TOTAL REVENUE */}
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-[#1B202A] to-[#12151B] border border-[#D4AF37]/30 shadow-xl space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-[#D4AF37] uppercase tracking-wider">
              Ingresos Totales
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#D4AF37]/20 flex items-center justify-center text-[#D4AF37]">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight">
            {formatCurrency(totalRevenue)}
          </p>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 pt-1">
            <span>Servicios + POS ({totalTransactionsCount} transacciones)</span>
          </div>
        </div>

        {/* SERVICES REVENUE */}
        <div className="p-4 sm:p-5 rounded-3xl bg-[#14171E] border border-white/10 shadow-lg space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
              Facturación Servicios
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <Scissors className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-white tracking-tight">
            {formatCurrency(servicesRevenue)}
          </p>
          <div className="flex items-center gap-1 text-[11px] text-emerald-400 pt-1 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{completedAppointments.length} citas completadas</span>
          </div>
        </div>

        {/* PRODUCTS REVENUE */}
        <div className="p-4 sm:p-5 rounded-3xl bg-[#14171E] border border-white/10 shadow-lg space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
              Ventas POS Productos
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-amber-300 tracking-tight">
            {formatCurrency(productsRevenue)}
          </p>
          <div className="flex items-center gap-1 text-[11px] text-slate-400 pt-1">
            <span>{filteredSales.length} ventas en punto de venta</span>
          </div>
        </div>

        {/* TICKET PROMEDIO & PUNTOS */}
        <div className="p-4 sm:p-5 rounded-3xl bg-[#14171E] border border-white/10 shadow-lg space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
              Ticket Promedio
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-white tracking-tight">
            {formatCurrency(averageTicket)}
          </p>
          <div className="flex items-center gap-1 text-[11px] text-[#D4AF37] pt-1 font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>+{totalPointsAwarded} pts otorgados</span>
          </div>
        </div>
      </div>

      {/* 3. APPOINTMENTS STATUS BREAKDOWN PILLS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-emerald-400">Completadas</span>
            <p className="text-lg font-black text-white">{completedAppointments.length}</p>
          </div>
          <CheckCircle2 className="w-6 h-6 text-emerald-400 opacity-80" />
        </div>

        <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-blue-400">Agendadas / Confirmadas</span>
            <p className="text-lg font-black text-white">{confirmedAppointments.length}</p>
          </div>
          <Clock className="w-6 h-6 text-blue-400 opacity-80" />
        </div>

        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-rose-400">Canceladas</span>
            <p className="text-lg font-black text-white">{cancelledAppointments.length}</p>
          </div>
          <XCircle className="w-6 h-6 text-rose-400 opacity-80" />
        </div>

        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-amber-400">No Asistieron</span>
            <p className="text-lg font-black text-white">{noShowAppointments.length}</p>
          </div>
          <AlertTriangle className="w-6 h-6 text-amber-400 opacity-80" />
        </div>
      </div>

      {/* 4. PER-BARBER PERFORMANCE COMPARISON TABLE & CARDS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#D4AF37]" />
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">
              Desglose y Rendimiento por Barbero ({dateRangeBounds.label})
            </h4>
          </div>
          <span className="text-xs text-slate-400">
            Haz clic en un barbero para filtrar sus resultados
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {barberMetrics.map((bm) => {
            const isSelected = selectedBarberId === bm.barber.id;
            return (
              <div
                key={bm.barber.id}
                onClick={() => setSelectedBarberId(isSelected ? 'all' : bm.barber.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-lg relative overflow-hidden ${
                  isSelected
                    ? 'bg-[#181D27] border-[#D4AF37] ring-1 ring-[#D4AF37]/50'
                    : 'bg-[#14171E] border-white/10 hover:border-[#D4AF37]/40'
                }`}
              >
                {/* Barber Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={bm.barber.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}
                      alt={bm.barber.displayName}
                      className="w-12 h-12 rounded-2xl object-cover border border-white/15 shadow"
                    />
                    <div>
                      <h5 className="font-bold text-white text-sm flex items-center gap-1.5">
                        <span>{bm.barber.displayName}</span>
                        {isSelected && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#D4AF37] text-slate-950 font-black">
                            FILTRADO
                          </span>
                        )}
                      </h5>
                      <div className="flex items-center gap-1 text-[11px] text-slate-400">
                        <Star className="w-3 h-3 text-[#D4AF37] fill-[#D4AF37]" />
                        <span>{bm.barber.rating?.toFixed(1) || '5.0'}</span>
                        <span>•</span>
                        <span>{bm.barber.experienceYears || 3} años exp.</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[11px] font-bold text-[#D4AF37] block">
                      {bm.revenueShare}% del total
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {bm.completedCount} cortes
                    </span>
                  </div>
                </div>

                {/* Financial Breakdown */}
                <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-black/40 border border-white/5 text-center text-xs mb-3">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block font-semibold">Servicios</span>
                    <span className="font-bold text-white block mt-0.5">
                      {formatCurrency(bm.servicesRevenue)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block font-semibold">POS Prods</span>
                    <span className="font-bold text-amber-300 block mt-0.5">
                      {formatCurrency(bm.productsRevenue)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#D4AF37] uppercase block font-bold">Total</span>
                    <span className="font-black text-[#D4AF37] block mt-0.5">
                      {formatCurrency(bm.totalRevenue)}
                    </span>
                  </div>
                </div>

                {/* Progress bar of revenue contribution */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Aporte en el periodo:</span>
                    <span className="font-bold text-white">{formatCurrency(bm.totalRevenue)}</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#996515] to-[#D4AF37]"
                      style={{ width: `${Math.min(100, Math.max(5, bm.revenueShare))}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. DETAILED ACTIVITY LOG (APPOINTMENTS & POS SALES IN SELECTED PERIOD) */}
      <div className="p-4 sm:p-5 rounded-3xl bg-[#14171E] border border-white/10 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-[#D4AF37]" />
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">
              Detalle de Movimientos del Periodo ({unifiedActivities.length})
            </h4>
          </div>

          {/* Sub-tabs */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-black/40 border border-white/10 text-xs">
            <button
              onClick={() => setActivityTab('all')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                activityTab === 'all' ? 'bg-[#D4AF37] text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              Todos ({filteredAppointments.length + filteredSales.length})
            </button>
            <button
              onClick={() => setActivityTab('appointments')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                activityTab === 'appointments' ? 'bg-[#D4AF37] text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              Citas ({filteredAppointments.length})
            </button>
            <button
              onClick={() => setActivityTab('sales')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                activityTab === 'sales' ? 'bg-[#D4AF37] text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              Ventas POS ({filteredSales.length})
            </button>
          </div>
        </div>

        {/* Activity Items List */}
        {unifiedActivities.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs space-y-2">
            <Calendar className="w-8 h-8 mx-auto text-slate-600 mb-1" />
            <p className="font-semibold text-white">No hay movimientos registrados en este periodo o barbero</p>
            <p className="text-slate-500">Prueba cambiando el rango de fechas o seleccionando todos los barberos.</p>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
            {unifiedActivities.map((act) => (
              <div
                key={act.id}
                className="p-3.5 rounded-2xl bg-[#0F1217] border border-white/5 hover:border-white/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                      act.type === 'appointment'
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    {act.type === 'appointment' ? <Scissors className="w-4 h-4" /> : <Package className="w-4 h-4" />}
                  </div>

                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-white text-xs">{act.clientName}</span>
                      <span className="text-[11px] text-slate-400">• Barbero: <strong className="text-slate-300">{act.barberName}</strong></span>
                      {act.status && (
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                            act.status === 'completed'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : act.status === 'confirmed'
                              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                              : act.status === 'cancelled'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {act.status === 'completed'
                            ? 'Completada'
                            : act.status === 'confirmed'
                            ? 'Confirmada'
                            : act.status === 'cancelled'
                            ? 'Cancelada'
                            : 'No Asistió'}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-300">{act.title}</p>
                    <p className="text-[11px] text-slate-500">
                      {formatDateSpanish(act.date)} {act.time ? `• ${act.time}` : ''} • {act.subtitle}
                    </p>
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-white/5 shrink-0">
                  <span className="font-black text-[#D4AF37] text-sm">
                    {act.amount > 0 ? formatCurrency(act.amount) : '$0 MXN'}
                  </span>
                  {act.points && act.points > 0 ? (
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full mt-0.5">
                      +{act.points} pts
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
