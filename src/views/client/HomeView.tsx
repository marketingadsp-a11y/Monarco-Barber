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
import { isAppointmentOwnedByCurrentBrowser } from '../../utils/guestSession';
import { Barber, Appointment } from '../../types';

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

  const myAppointments = appointments.filter((a) =>
    userProfile?.id ? a.clientId === userProfile.id : isAppointmentOwnedByCurrentBrowser(a)
  );

  const nextAppointment = myAppointments.find(
    (a) => a.status === 'confirmed' || a.status === 'pending'
  );

  const featuredServices = services.filter((s) => s.active && s.isPopular).slice(0, 3);
  const activeBarbers = barbers.filter((b) => b.active);

  return (
    <div className="space-y-8 pb-24">
      {/* EDITORIAL HERO BANNER */}
      {businessSettings.showHeroSection !== false && (
        <section className="relative overflow-hidden rounded-3xl bg-white border border-[#E6E1D6] p-6 sm:p-10 shadow-[0_10px_30px_rgba(22,21,20,0.05)]">
          {/* Subtle architectural top bronze rule */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#161514] via-[#9A6B3B] to-[#E6E1D6]" />

          {/* Logo-only centered hero banner */}
          {businessSettings.heroShowLogo &&
          businessSettings.heroShowBadge === false &&
          businessSettings.heroShowTitle === false &&
          businessSettings.heroShowSubtitle === false &&
          businessSettings.heroShowButton === false ? (
            <div className="relative z-10 flex flex-col items-center justify-center py-6 text-center">
              {businessSettings.logoUrl ? (
                <img
                  src={businessSettings.logoUrl}
                  alt={businessSettings.name || 'Monarca Barber'}
                  className="h-20 sm:h-28 w-auto max-w-[280px] object-contain drop-shadow-[0_2px_6px_rgba(22,21,20,0.2)]"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex items-center gap-3 text-[#9A6B3B]">
                  <Crown className="w-10 h-10" />
                  <span className="font-display text-3xl sm:text-4xl font-bold text-[#161514] tracking-widest uppercase">
                    {businessSettings.name || 'MONARCA BARBER'}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="relative z-10 max-w-2xl space-y-4">
              {businessSettings.heroShowLogo && (
                <div className="pb-1">
                  {businessSettings.logoUrl ? (
                    <img
                      src={businessSettings.logoUrl}
                      alt={businessSettings.name || 'Logo'}
                      className="h-12 sm:h-14 w-auto max-w-[220px] object-contain drop-shadow-[0_1px_3px_rgba(22,21,20,0.18)]"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex items-center gap-2 text-[#9A6B3B]">
                      <Crown className="w-6 h-6" />
                      <span className="font-display text-xl font-bold text-[#161514] tracking-wider uppercase">
                        {businessSettings.name || 'MONARCA BARBER'}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {businessSettings.heroShowBadge !== false && (
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#9A6B3B]">
                  <Crown className="w-3.5 h-3.5 shrink-0" />
                  <span>{businessSettings.heroBadge || 'EXPERIENCIA EXCLUSIVA EN POLANCO'}</span>
                </div>
              )}

              {businessSettings.heroShowTitle !== false && (
                <h1 className="font-display text-4xl sm:text-5xl font-bold text-[#161514] tracking-tight leading-[1.02] uppercase">
                  {businessSettings.heroTitle || 'El arte del corte clásico y la barbería contemporánea.'}
                </h1>
              )}

              {businessSettings.heroShowSubtitle !== false && (
                <p className="text-sm sm:text-base text-[#5C5852] font-normal leading-relaxed max-w-xl">
                  {businessSettings.heroSubtitle ||
                    businessSettings.tagline ||
                    'Donde la elegancia y la maestría se encuentran.'}
                </p>
              )}

              {businessSettings.heroShowButton !== false && (
                <div className="pt-2 flex items-center gap-3">
                  <button
                    onClick={() => onStartBooking()}
                    className="flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-[#161514] hover:bg-[#2A2826] text-[#FAF9F6] font-semibold text-xs sm:text-sm shadow-sm transition-all active:scale-[0.98] whitespace-nowrap"
                  >
                    <Scissors className="w-4 h-4 text-[#C69765] stroke-[2.2]" />
                    <span>{businessSettings.heroButtonText || 'Reservar Cita Ahora'}</span>
                    <ChevronRight className="w-4 h-4 text-[#C69765]" />
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* NEXT UPCOMING APPOINTMENT */}
      {nextAppointment && (
        <section className="rounded-2xl bg-[#F2EFE9] border border-[#9A6B3B]/35 p-4 sm:p-5 relative overflow-hidden">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-white border border-[#E6E1D6] flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5 text-[#9A6B3B]" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9A6B3B] block">
                  Tu Próxima Cita
                </span>
                <h4 className="font-display text-lg font-bold text-[#161514] tracking-wide truncate uppercase">
                  {nextAppointment.serviceNameSnapshot}
                </h4>
                <p className="text-xs text-[#5C5852] tabular-nums">
                  {formatDateSpanish(nextAppointment.date)} · {formatTime12h(nextAppointment.startTime)} ·{' '}
                  <strong className="text-[#161514]">{nextAppointment.barberName}</strong>
                </p>
              </div>
            </div>

            <button
              onClick={() => onOpenAppointmentDetail(nextAppointment)}
              className="shrink-0 px-3.5 py-2 rounded-xl bg-white hover:bg-[#161514] text-[#161514] hover:text-[#FAF9F6] border border-[#E6E1D6] text-xs font-semibold transition-colors whitespace-nowrap"
            >
              Ver Detalle
            </button>
          </div>
        </section>
      )}

      {/* POPULAR SERVICES */}
      <section className="space-y-4">
        <div className="flex items-end justify-between px-1 border-b border-[#E6E1D6] pb-3">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#161514] tracking-wide uppercase">
              Servicios Populares
            </h2>
            <p className="text-xs text-[#5C5852] mt-0.5">
              Los rituales más solicitados por nuestros clientes
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('book')}
            className="text-xs font-semibold text-[#9A6B3B] hover:text-[#161514] transition-colors flex items-center gap-1 whitespace-nowrap shrink-0"
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
              className="group flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-white hover:bg-[#F7F5F0] border border-[#E6E1D6] hover:border-[#9A6B3B]/60 transition-all cursor-pointer w-full overflow-hidden"
            >
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-[#F2EFE9] shrink-0 border border-[#E6E1D6]">
                  <img
                    src={service.imageUrl}
                    alt={service.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="min-w-0 flex-1 pr-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-display text-lg font-bold text-[#161514] tracking-wide uppercase truncate group-hover:text-[#9A6B3B] transition-colors">
                      {service.name}
                    </h3>
                    <span className="text-[11px] font-semibold text-[#9A6B3B] uppercase tracking-wider shrink-0">
                      · VIP
                    </span>
                  </div>
                  <p className="text-xs text-[#5C5852] truncate w-full mt-0.5">
                    {service.description}
                  </p>
                  <div className="flex items-center gap-2.5 mt-1.5 text-xs tabular-nums">
                    <span className="flex items-center gap-1 text-[#5C5852] shrink-0">
                      <Clock className="w-3.5 h-3.5 text-[#9A6B3B]" />
                      {service.durationMinutes} min
                    </span>
                    <span aria-hidden="true" className="text-[#D2CBBF]">·</span>
                    <span className="font-mono font-bold text-[#161514] shrink-0">
                      {formatCurrency(service.price)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-2 rounded-xl bg-[#F2EFE9] text-[#5C5852] group-hover:bg-[#161514] group-hover:text-[#FAF9F6] transition-colors shrink-0 ml-1">
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* OUR BARBERS */}
      <section className="space-y-4">
        <div className="flex items-end justify-between px-1 border-b border-[#E6E1D6] pb-3">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#161514] tracking-wide uppercase">
              Nuestros Barberos
            </h2>
            <p className="text-xs text-[#5C5852] mt-0.5">
              Especialistas certificados en imagen masculina
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('barbers')}
            className="text-xs font-semibold text-[#9A6B3B] hover:text-[#161514] transition-colors flex items-center gap-1 whitespace-nowrap shrink-0"
          >
            <span>Ver perfiles</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {activeBarbers.map((barber) => (
            <div
              key={barber.id}
              onClick={() => onOpenBarberProfile(barber)}
              className="group p-3.5 rounded-2xl bg-white hover:bg-[#F7F5F0] border border-[#E6E1D6] hover:border-[#9A6B3B]/60 transition-all cursor-pointer flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-[#F2EFE9] shrink-0 border border-[#E6E1D6]">
                  <img
                    src={barber.photoUrl}
                    alt={barber.displayName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    referrerPolicy="no-referrer"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-base font-bold text-[#161514] uppercase tracking-wide truncate group-hover:text-[#9A6B3B] transition-colors">
                    {barber.displayName}
                  </h3>
                  <p className="text-[11px] text-[#9A6B3B] font-semibold truncate mt-0.5">
                    {barber.specialties[0] || 'Corte Clásico'}
                  </p>
                  <div className="flex items-center gap-1.5 text-[11px] text-[#5C5852] mt-1 tabular-nums">
                    <span className="flex items-center gap-0.5 text-[#161514] font-semibold">
                      <Star className="w-3 h-3 text-[#9A6B3B] fill-[#9A6B3B]" />
                      {barber.rating.toFixed(1)}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{barber.experienceYears || 5} años exp.</span>
                  </div>
                </div>
              </div>

              <div className="p-1.5 rounded-xl bg-[#F2EFE9] text-[#5C5852] group-hover:bg-[#161514] group-hover:text-[#FAF9F6] transition-colors shrink-0">
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
