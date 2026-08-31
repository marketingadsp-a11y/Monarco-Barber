import React from 'react';
import {
  Crown,
  Scissors,
  Calendar,
  Clock,
  ChevronRight,
  Star,
} from 'lucide-react';
import { useBarbershop } from '../../contexts/BarbershopContext';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency, formatDateSpanish, formatTime12h } from '../../utils/dateTime';
import { Barber, Service, Appointment } from '../../types';

interface HomeViewProps {
  onStartBooking: (serviceId?: string, barberId?: string) => void;
  onOpenBarberProfile: (barber: Barber) => void;
  onOpenAppointmentDetail: (appointment: Appointment) => void;
  onNavigateTab: (tab: any) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onStartBooking,
  onOpenBarberProfile,
  onOpenAppointmentDetail,
  onNavigateTab,
}) => {
  const { services, barbers, appointments, businessSettings } = useBarbershop();
  const { userProfile } = useAuth();

  // Find next upcoming appointment
  const nextAppointment = appointments.find(
    (a) => a.status === 'confirmed' || a.status === 'pending'
  );

  const featuredServices = services.filter((s) => s.active && s.isPopular).slice(0, 3);
  const activeBarbers = barbers.filter((b) => b.active);

  return (
    <div className="space-y-6 pb-24">
      {/* SPATIAL HERO BANNER */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1B202B] via-[#14171F] to-[#0D0F13] border border-white/15 p-6 sm:p-8 shadow-2xl">
        {/* Glow ambient background circles */}
        <div className="absolute -top-16 -right-16 w-60 h-60 bg-[#D4AF37]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-60 h-60 bg-[#996515]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-lg space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/30 text-[#D4AF37] text-xs font-semibold tracking-wide">
            <Crown className="w-3.5 h-3.5" />
            <span>{businessSettings.heroBadge || 'EXPERIENCIA EXCLUSIVA EN POLANCO'}</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
            {businessSettings.heroTitle || 'El arte del corte clásico y la barbería contemporánea.'}
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 font-normal leading-relaxed">
            {businessSettings.heroSubtitle || businessSettings.tagline || 'Donde la elegancia y la maestría se encuentran.'}
          </p>

          <div className="pt-2 flex items-center gap-3">
            <button
              onClick={() => onStartBooking()}
              className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-[#996515] via-[#D4AF37] to-[#F3E5AB] text-slate-950 font-bold text-xs sm:text-sm shadow-xl shadow-[#D4AF37]/25 hover:scale-[1.02] active:scale-95 transition-all"
            >
              <Scissors className="w-4 h-4 stroke-[2.5]" />
              <span>{businessSettings.heroButtonText || 'Reservar Cita Ahora'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* NEXT UPCOMING APPOINTMENT ALERT (If exists) */}
      {nextAppointment && (
        <section className="rounded-2xl bg-gradient-to-r from-[#1E2533] to-[#141822] border border-[#D4AF37]/30 p-4 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center shrink-0">
                <Calendar className="w-6 h-6 text-[#D4AF37]" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#D4AF37] block">
                  Tu Próxima Cita
                </span>
                <h4 className="font-bold text-white text-sm truncate">
                  {nextAppointment.serviceNameSnapshot}
                </h4>
                <p className="text-xs text-slate-300">
                  {formatDateSpanish(nextAppointment.date)} a las {formatTime12h(nextAppointment.startTime)} con{' '}
                  <strong className="text-white">{nextAppointment.barberName}</strong>
                </p>
              </div>
            </div>

            <button
              onClick={() => onOpenAppointmentDetail(nextAppointment)}
              className="shrink-0 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-colors"
            >
              Ver Detalle
            </button>
          </div>
        </section>
      )}

      {/* POPULAR VIP SERVICES */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Servicios Populares</h2>
            <p className="text-xs text-slate-400">Los rituales más solicitados por nuestros clientes</p>
          </div>
          <button
            onClick={() => onNavigateTab('book')}
            className="text-xs font-bold text-[#D4AF37] hover:underline flex items-center gap-1"
          >
            <span>Ver todos</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid gap-3 w-full">
          {featuredServices.map((service) => (
            <div
              key={service.id}
              onClick={() => onStartBooking(service.id)}
              className="group flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-[#14171E] hover:bg-[#181D26] border border-white/10 hover:border-[#D4AF37]/40 transition-all cursor-pointer shadow-md w-full overflow-hidden"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl overflow-hidden bg-slate-800 shrink-0 border border-white/10 group-hover:scale-105 transition-transform">
                  <img
                    src={service.imageUrl}
                    alt={service.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="min-w-0 flex-1 pr-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="font-bold text-white text-sm truncate group-hover:text-[#D4AF37] transition-colors">
                      {service.name}
                    </h3>
                    <span className="text-[9px] bg-amber-500/20 text-[#D4AF37] px-1.5 py-0.5 rounded font-bold uppercase shrink-0">
                      VIP
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 truncate w-full mt-0.5">
                    {service.description}
                  </p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-300">
                    <span className="flex items-center gap-1 text-slate-400 shrink-0">
                      <Clock className="w-3 h-3 text-[#D4AF37]" />
                      {service.durationMinutes} min
                    </span>
                    <span className="font-bold text-[#D4AF37] shrink-0">
                      {formatCurrency(service.price)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-2 rounded-xl bg-white/5 text-slate-400 group-hover:bg-[#D4AF37] group-hover:text-slate-950 transition-colors shrink-0 ml-1">
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* NUESTROS BARBEROS (VISTA COMPACTA Y ELEGANTE) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Nuestros Barberos</h2>
            <p className="text-xs text-slate-400">Especialistas certificados en imagen masculina</p>
          </div>
          <button
            onClick={() => onNavigateTab('barbers')}
            className="text-xs font-bold text-[#D4AF37] hover:underline flex items-center gap-1"
          >
            <span>Ver perfiles</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {activeBarbers.map((barber) => (
            <div
              key={barber.id}
              onClick={() => onOpenBarberProfile(barber)}
              className="group p-3 rounded-2xl bg-[#14171E] hover:bg-[#181D26] border border-white/10 hover:border-[#D4AF37]/40 transition-all cursor-pointer shadow-md flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl overflow-hidden bg-slate-800 shrink-0 border border-white/15 group-hover:scale-105 transition-transform shadow-inner">
                  <img
                    src={barber.photoUrl}
                    alt={barber.displayName}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-bold text-white text-xs sm:text-sm truncate group-hover:text-[#D4AF37] transition-colors">
                      {barber.displayName}
                    </h3>
                  </div>
                  <p className="text-[11px] text-[#D4AF37] font-semibold truncate mt-0.5">
                    {barber.specialties[0] || 'Corte Clásico'}
                  </p>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                    <span className="flex items-center gap-0.5 text-amber-400 font-bold">
                      <Star className="w-3 h-3 fill-amber-400" />
                      {barber.rating.toFixed(1)}
                    </span>
                    <span>•</span>
                    <span>{barber.experienceYears || 5} años exp.</span>
                  </div>
                </div>
              </div>

              <div className="p-1.5 rounded-xl bg-white/5 text-slate-400 group-hover:bg-[#D4AF37] group-hover:text-slate-950 transition-colors shrink-0">
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
