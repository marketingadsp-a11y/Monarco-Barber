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
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E6E1D6] shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#161514] flex items-center justify-center text-[#C69765] shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display text-lg sm:text-xl font-bold text-[#161514] uppercase tracking-wide flex items-center gap-2 flex-wrap">
                <span>Métricas de Rendimiento & Facturación</span>
                {selectedBarberObj && (
                  <span className="font-sans normal-case text-xs px-2.5 py-0.5 rounded bg-[#FBF6EE] text-[#7D542B] border border-[#9A6B3B]/30 font-semibold">
                    {selectedBarberObj.displayName}
                  </span>
                )}
              </h3>
              <p className="text-xs text-[#5C5852]">
                Filtra por fecha específica, rango personalizado o barbero para analizar ingresos en tiempo real
              </p>
            </div>
          </div>

          {/* Barber Selector Dropdown */}
          <div className="flex items-center gap-2">
            <div className="relative min-w-[200px] w-full sm:w-auto">
              <Users className="w-4 h-4 text-[#767067] absolute left-3 top-1/2 -translate-y-1/2" />
              <select
                value={selectedBarberId}
                onChange={(e) => setSelectedBarberId(e.target.value)}
                className="w-full pl-9 pr-8 py-2 rounded-xl bg-[#FAF9F6] border border-[#D2CBBF] text-[#161514] text-xs font-semibold focus:outline-none focus:border-[#9A6B3B] appearance-none"
              >
                <option value="all">Todos los Barberos ({barbers.length})</option>
                {barbers.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.displayName} {b.active ? '' : '(Inactivo)'}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#767067] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {selectedBarberId !== 'all' && (
              <button
                onClick={() => setSelectedBarberId('all')}
                className="px-3 py-2 rounded-xl bg-[#F2EFE9] hover:bg-[#E8E3D9] text-[#161514] text-xs font-semibold border border-[#D2CBBF] transition-colors shrink-0"
                title="Limpiar filtro de barbero"
              >
                Ver Todos
              </button>
            )}
          </div>
        </div>

        {/* Date Filter Tabs & Pickers */}
        <div className="pt-3 border-t border-[#E6E1D6] space-y-3">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <button
              onClick={() => setFilterMode('today')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all border ${
                filterMode === 'today'
                  ? 'bg-[#161514] text-[#FAF9F6] border-[#161514] shadow-sm'
                  : 'bg-[#FAF9F6] text-[#5C5852] hover:text-[#161514] border-[#E6E1D6]'
              }`}
            >
              Hoy
            </button>
            <button
              onClick={() => setFilterMode('last_7_days')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all border ${
                filterMode === 'last_7_days'
                  ? 'bg-[#161514] text-[#FAF9F6] border-[#161514] shadow-sm'
                  : 'bg-[#FAF9F6] text-[#5C5852] hover:text-[#161514] border-[#E6E1D6]'
              }`}
            >
              Últimos 7 Días
            </button>
            <button
              onClick={() => setFilterMode('this_month')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all border ${
                filterMode === 'this_month'
                  ? 'bg-[#161514] text-[#FAF9F6] border-[#161514] shadow-sm'
                  : 'bg-[#FAF9F6] text-[#5C5852] hover:text-[#161514] border-[#E6E1D6]'
              }`}
            >
              Este Mes
            </button>
            <button
              onClick={() => setFilterMode('last_month')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all border ${
                filterMode === 'last_month'
                  ? 'bg-[#161514] text-[#FAF9F6] border-[#161514] shadow-sm'
                  : 'bg-[#FAF9F6] text-[#5C5852] hover:text-[#161514] border-[#E6E1D6]'
              }`}
            >
              Mes Anterior
            </button>
            <button
              onClick={() => setFilterMode('specific')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1 border ${
                filterMode === 'specific'
                  ? 'bg-[#161514] text-[#FAF9F6] border-[#161514] shadow-sm'
                  : 'bg-[#FAF9F6] text-[#5C5852] hover:text-[#161514] border-[#E6E1D6]'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Fecha Específica</span>
            </button>
            <button
              onClick={() => setFilterMode('range')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1 border ${
                filterMode === 'range'
                  ? 'bg-[#161514] text-[#FAF9F6] border-[#161514] shadow-sm'
                  : 'bg-[#FAF9F6] text-[#5C5852] hover:text-[#161514] border-[#E6E1D6]'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Rango (Inicio - Fin)</span>
            </button>
            <button
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all border ${
                filterMode === 'all'
                  ? 'bg-[#161514] text-[#FAF9F6] border-[#161514] shadow-sm'
                  : 'bg-[#FAF9F6] text-[#5C5852] hover:text-[#161514] border-[#E6E1D6]'
              }`}
            >
              Todo el Histórico
            </button>
          </div>

          {/* Conditional Date Pickers based on Mode */}
          {filterMode === 'specific' && (
            <div className="p-3.5 rounded-xl bg-[#FAF7F0] border border-[#9A6B3B]/35 flex flex-col sm:flex-row items-start sm:items-center gap-3 animate-in fade-in">
              <span className="text-xs font-bold text-[#7D542B] flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-[#9A6B3B]" />
                <span>Seleccionar Fecha Específica:</span>
              </span>
              <input
                type="date"
                value={specificDate}
                onChange={(e) => setSpecificDate(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-white border border-[#D2CBBF] text-[#161514] text-xs font-semibold focus:outline-none focus:border-[#9A6B3B]"
              />
              <span className="text-xs text-[#5C5852]">
                Visualizando métricas exclusivamente del día: <strong className="text-[#161514]">{formatDateSpanish(specificDate, true)}</strong>
              </span>
            </div>
          )}

          {filterMode === 'range' && (
            <div className="p-3.5 rounded-xl bg-[#FAF7F0] border border-[#9A6B3B]/35 flex flex-col sm:flex-row items-start sm:items-center gap-3 animate-in fade-in flex-wrap">
              <span className="text-xs font-bold text-[#7D542B] flex items-center gap-1.5">
                <Filter className="w-4 h-4 text-[#9A6B3B]" />
                <span>Rango de Fechas:</span>
              </span>

              <div className="flex items-center gap-2">
                <div className="space-y-0.5">
                  <label className="text-[10px] text-[#5C5852] font-semibold block uppercase">Fecha Inicio</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-white border border-[#D2CBBF] text-[#161514] text-xs font-semibold focus:outline-none focus:border-[#9A6B3B]"
                  />
                </div>

                <span className="text-[#5C5852] font-bold self-end pb-2">a</span>

                <div className="space-y-0.5">
                  <label className="text-[10px] text-[#5C5852] font-semibold block uppercase">Fecha Fin</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-white border border-[#D2CBBF] text-[#161514] text-xs font-semibold focus:outline-none focus:border-[#9A6B3B]"
                  />
                </div>
              </div>

              <span className="text-xs text-[#5C5852]">
                Periodo seleccionado: del <strong className="text-[#161514]">{formatDateSpanish(startDate)}</strong> al <strong className="text-[#161514]">{formatDateSpanish(endDate, true)}</strong>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 2. PRIMARY KPI SUMMARY CARDS FOR SELECTED RANGE & BARBER */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* TOTAL REVENUE */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#FAF7F0] border border-[#9A6B3B]/45 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-[#7D542B] uppercase tracking-wider">
              Ingresos Totales
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#161514] flex items-center justify-center text-[#C69765]">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="font-mono tabular-nums text-xl sm:text-2xl lg:text-3xl font-black text-[#161514] tracking-tight">
            {formatCurrency(totalRevenue)}
          </p>
          <div className="flex items-center gap-1.5 text-[11px] text-[#5C5852] pt-1 font-mono tabular-nums">
            <span>Servicios + POS ({totalTransactionsCount} transacciones)</span>
          </div>
        </div>

        {/* SERVICES REVENUE */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E6E1D6] shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-[#5C5852] uppercase tracking-wider">
              Facturación Servicios
            </span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 border border-sky-200 text-sky-700 flex items-center justify-center">
              <Scissors className="w-4 h-4" />
            </div>
          </div>
          <p className="font-mono tabular-nums text-xl sm:text-2xl font-black text-[#161514] tracking-tight">
            {formatCurrency(servicesRevenue)}
          </p>
          <div className="flex items-center gap-1 text-[11px] text-emerald-700 pt-1 font-semibold font-mono tabular-nums">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{completedAppointments.length} citas completadas</span>
          </div>
        </div>

        {/* PRODUCTS REVENUE */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E6E1D6] shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-[#5C5852] uppercase tracking-wider">
              Ventas POS Productos
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#FBF6EE] border border-[#9A6B3B]/30 text-[#9A6B3B] flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <p className="font-mono tabular-nums text-xl sm:text-2xl font-black text-[#9A6B3B] tracking-tight">
            {formatCurrency(productsRevenue)}
          </p>
          <div className="flex items-center gap-1 text-[11px] text-[#5C5852] pt-1 font-mono tabular-nums">
            <span>{filteredSales.length} ventas en punto de venta</span>
          </div>
        </div>

        {/* TICKET PROMEDIO & PUNTOS */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E6E1D6] shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-[#5C5852] uppercase tracking-wider">
              Ticket Promedio
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <p className="font-mono tabular-nums text-xl sm:text-2xl font-black text-[#161514] tracking-tight">
            {formatCurrency(averageTicket)}
          </p>
          <div className="flex items-center gap-1 text-[11px] text-[#7D542B] pt-1 font-semibold font-mono tabular-nums">
            <Sparkles className="w-3.5 h-3.5 text-[#9A6B3B]" />
            <span>+{totalPointsAwarded} pts otorgados</span>
          </div>
        </div>
      </div>

      {/* 3. APPOINTMENTS STATUS BREAKDOWN CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-emerald-800">Completadas</span>
            <p className="font-mono tabular-nums text-lg font-black text-[#161514]">{completedAppointments.length}</p>
          </div>
          <CheckCircle2 className="w-6 h-6 text-emerald-700" />
        </div>

        <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-sky-800">Agendadas / Confirmadas</span>
            <p className="font-mono tabular-nums text-lg font-black text-[#161514]">{confirmedAppointments.length}</p>
          </div>
          <Clock className="w-6 h-6 text-sky-700" />
        </div>

        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-rose-800">Canceladas</span>
            <p className="font-mono tabular-nums text-lg font-black text-[#161514]">{cancelledAppointments.length}</p>
          </div>
          <XCircle className="w-6 h-6 text-rose-700" />
        </div>

        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-amber-800">No Asistieron</span>
            <p className="font-mono tabular-nums text-lg font-black text-[#161514]">{noShowAppointments.length}</p>
          </div>
          <AlertTriangle className="w-6 h-6 text-amber-700" />
        </div>
      </div>

      {/* 4. PER-BARBER PERFORMANCE COMPARISON TABLE & CARDS */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#9A6B3B]" />
            <h4 className="font-display text-lg font-bold text-[#161514] uppercase tracking-wide">
              Desglose y Rendimiento por Barbero ({dateRangeBounds.label})
            </h4>
          </div>
          <span className="text-xs text-[#5C5852]">
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
                className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-sm relative overflow-hidden ${
                  isSelected
                    ? 'bg-[#FAF7F0] border-[#9A6B3B] ring-1 ring-[#9A6B3B]/35'
                    : 'bg-white border-[#E6E1D6] hover:border-[#9A6B3B]/60'
                }`}
              >
                {/* Barber Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={bm.barber.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}
                      alt={bm.barber.displayName}
                      className="w-12 h-12 rounded-xl object-cover border border-[#D2CBBF] shadow-sm"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <h5 className="font-bold text-[#161514] text-sm flex items-center gap-1.5 flex-wrap">
                        <span>{bm.barber.displayName}</span>
                        {isSelected && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#161514] text-[#FAF9F6] font-bold">
                            FILTRADO
                          </span>
                        )}
                      </h5>
                      <div className="flex items-center gap-1 text-[11px] text-[#5C5852]">
                        <Star className="w-3 h-3 text-[#9A6B3B] fill-[#9A6B3B]" />
                        <span className="font-mono tabular-nums">{bm.barber.rating?.toFixed(1) || '5.0'}</span>
                        <span>•</span>
                        <span>{bm.barber.experienceYears || 3} años exp.</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-mono tabular-nums text-[11px] font-bold text-[#9A6B3B] block">
                      {bm.revenueShare}% del total
                    </span>
                    <span className="font-mono tabular-nums text-[11px] text-[#767067]">
                      {bm.completedCount} cortes
                    </span>
                  </div>
                </div>

                {/* Financial Breakdown */}
                <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-[#FAF9F6] border border-[#E6E1D6] text-center text-xs mb-3">
                  <div>
                    <span className="text-[10px] text-[#5C5852] uppercase block font-semibold">Servicios</span>
                    <span className="font-mono tabular-nums font-bold text-[#161514] block mt-0.5">
                      {formatCurrency(bm.servicesRevenue)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#5C5852] uppercase block font-semibold">POS Prods</span>
                    <span className="font-mono tabular-nums font-bold text-[#7D542B] block mt-0.5">
                      {formatCurrency(bm.productsRevenue)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#9A6B3B] uppercase block font-bold">Total</span>
                    <span className="font-mono tabular-nums font-black text-[#161514] block mt-0.5">
                      {formatCurrency(bm.totalRevenue)}
                    </span>
                  </div>
                </div>

                {/* Progress bar of revenue contribution */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-[#5C5852]">
                    <span>Aporte en el periodo:</span>
                    <span className="font-mono tabular-nums font-bold text-[#161514]">{formatCurrency(bm.totalRevenue)}</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-[#F2EFE9] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#161514]"
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
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E6E1D6] shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E6E1D6]">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-[#9A6B3B]" />
            <h4 className="font-display text-lg font-bold text-[#161514] uppercase tracking-wide">
              Detalle de Movimientos del Periodo ({unifiedActivities.length})
            </h4>
          </div>

          {/* Sub-tabs */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[#F2EFE9] border border-[#E6E1D6] text-xs">
            <button
              onClick={() => setActivityTab('all')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                activityTab === 'all' ? 'bg-[#161514] text-[#FAF9F6] shadow-sm' : 'text-[#5C5852] hover:text-[#161514]'
              }`}
            >
              Todos ({filteredAppointments.length + filteredSales.length})
            </button>
            <button
              onClick={() => setActivityTab('appointments')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                activityTab === 'appointments' ? 'bg-[#161514] text-[#FAF9F6] shadow-sm' : 'text-[#5C5852] hover:text-[#161514]'
              }`}
            >
              Citas ({filteredAppointments.length})
            </button>
            <button
              onClick={() => setActivityTab('sales')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                activityTab === 'sales' ? 'bg-[#161514] text-[#FAF9F6] shadow-sm' : 'text-[#5C5852] hover:text-[#161514]'
              }`}
            >
              Ventas POS ({filteredSales.length})
            </button>
          </div>
        </div>

        {/* Activity Items List */}
        {unifiedActivities.length === 0 ? (
          <div className="p-8 text-center text-[#5C5852] text-xs space-y-2">
            <Calendar className="w-8 h-8 mx-auto text-[#8E887E] mb-1" />
            <p className="font-semibold text-[#161514]">No hay movimientos registrados en este periodo o barbero</p>
            <p className="text-[#767067]">Prueba cambiando el rango de fechas o seleccionando todos los barberos.</p>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
            {unifiedActivities.map((act) => (
              <div
                key={act.id}
                className="p-3.5 rounded-xl bg-[#FAF9F6] border border-[#E6E1D6] hover:border-[#D2CBBF] flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                      act.type === 'appointment'
                        ? 'bg-sky-50 text-sky-700 border border-sky-200'
                        : 'bg-[#FBF6EE] text-[#9A6B3B] border border-[#9A6B3B]/30'
                    }`}
                  >
                    {act.type === 'appointment' ? <Scissors className="w-4 h-4" /> : <Package className="w-4 h-4" />}
                  </div>

                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-[#161514] text-xs">{act.clientName}</span>
                      <span className="text-[11px] text-[#5C5852]">• Barbero: <strong className="text-[#161514]">{act.barberName}</strong></span>
                      {act.status && (
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase border ${
                            act.status === 'completed'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : act.status === 'confirmed'
                              ? 'bg-sky-50 text-sky-800 border-sky-200'
                              : act.status === 'cancelled'
                              ? 'bg-rose-50 text-rose-800 border-rose-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
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

                    <p className="text-xs text-[#161514] font-medium">{act.title}</p>
                    <p className="text-[11px] text-[#767067] font-mono tabular-nums">
                      {formatDateSpanish(act.date)} {act.time ? `• ${act.time}` : ''} • {act.subtitle}
                    </p>
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-[#E6E1D6] shrink-0">
                  <span className="font-mono tabular-nums font-black text-[#161514] text-sm">
                    {act.amount > 0 ? formatCurrency(act.amount) : '$0 MXN'}
                  </span>
                  {act.points && act.points > 0 ? (
                    <span className="font-mono tabular-nums text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md mt-0.5">
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
