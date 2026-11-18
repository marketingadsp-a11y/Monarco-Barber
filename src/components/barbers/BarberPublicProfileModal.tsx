import React, { useState } from 'react';
import {
  X,
  Star,
  Scissors,
  Heart,
  Instagram,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Barber } from '../../types';
import { useBarbershop } from '../../contexts/BarbershopContext';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency } from '../../utils/dateTime';

interface BarberPublicProfileModalProps {
  barber: Barber | null;
  onClose: () => void;
  onBookWithBarber: (barberId: string, serviceId?: string) => void;
}

export const BarberPublicProfileModal: React.FC<BarberPublicProfileModalProps> = ({
  barber,
  onClose,
  onBookWithBarber,
}) => {
  const { services } = useBarbershop();
  const { userProfile, toggleFavorite } = useAuth();
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  if (!barber) return null;

  const isFavorite = userProfile?.favoriteBarberIds?.includes(barber.id);

  const barberServices = services.filter(
    (s) => s.active && (barber.serviceIds.length === 0 || barber.serviceIds.includes(s.id))
  );

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-[#161514]/55 backdrop-blur-sm"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 16 }}
          className="relative w-full max-w-lg bg-[#FAF9F6] border border-[#E6E1D6] rounded-3xl overflow-hidden shadow-[0_24px_60px_rgba(22,21,20,0.22)] z-10 max-h-[90vh] flex flex-col"
        >
          {/* Header Cover */}
          <div className="relative h-44 sm:h-48 w-full bg-[#F2EFE9] overflow-hidden border-b border-[#E6E1D6]">
            <img
              src={barber.gallery?.[0] || barber.photoUrl}
              alt={barber.displayName}
              className="w-full h-full object-cover opacity-30 blur-sm scale-105"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#FAF9F6] via-[#FAF9F6]/65 to-transparent" />

            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-xl bg-white/90 text-[#161514] hover:bg-white border border-[#E6E1D6] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <button
              onClick={() => toggleFavorite(barber.id)}
              className={`absolute top-4 left-4 p-2 rounded-xl border transition-all ${
                isFavorite
                  ? 'bg-rose-50 border-rose-300 text-rose-600'
                  : 'bg-white/90 border-[#E6E1D6] text-[#5C5852] hover:text-rose-600'
              }`}
            >
              <Heart className={`w-4 h-4 ${isFavorite ? 'fill-rose-600' : ''}`} />
            </button>

            <div className="absolute bottom-4 left-5 right-5 flex items-end gap-4">
              <div className="relative">
                <img
                  src={barber.photoUrl}
                  alt={barber.displayName}
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-[#9A6B3B] shadow-md bg-white"
                  referrerPolicy="no-referrer"
                />
                {barber.featured && (
                  <span className="absolute -top-2 -right-2 p-1 rounded-full bg-[#161514] text-[#FAF9F6] shadow">
                    <Sparkles className="w-3.5 h-3.5 text-[#C69765]" />
                  </span>
                )}
              </div>

              <div className="flex-1 min-w-0 pb-1">
                <h3 className="font-display text-2xl font-bold text-[#161514] uppercase tracking-wide truncate">
                  {barber.displayName}
                </h3>
                <div className="flex items-center gap-2 mt-0.5 tabular-nums">
                  <div className="flex items-center gap-1 text-[#161514] text-xs font-semibold">
                    <Star className="w-3.5 h-3.5 text-[#9A6B3B] fill-[#9A6B3B]" />
                    <span>{barber.rating.toFixed(2)}</span>
                    <span className="text-[#5C5852] font-normal">({barber.reviewCount})</span>
                  </div>
                  <span className="text-[#D2CBBF]" aria-hidden="true">·</span>
                  <span className="text-xs text-[#5C5852] font-medium">
                    {barber.experienceYears || 5} años exp.
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            <div>
              <h4 className="text-[11px] font-semibold uppercase tracking-widest text-[#9A6B3B] mb-1.5">
                Sobre el Barbero
              </h4>
              <p className="text-xs text-[#5C5852] leading-relaxed font-normal">
                {barber.bio || 'Especialista en cortes modernos y estilo masculino de alta gama.'}
              </p>
            </div>

            {barber.specialties && barber.specialties.length > 0 && (
              <div>
                <h4 className="text-[11px] font-semibold uppercase tracking-widest text-[#9A6B3B] mb-1.5">
                  Especialidades
                </h4>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold text-[#161514]">
                  {barber.specialties.map((spec, i) => (
                    <React.Fragment key={i}>
                      {i > 0 && <span className="text-[#D2CBBF]" aria-hidden="true">/</span>}
                      <span>{spec}</span>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )}

            {barber.gallery && barber.gallery.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-[11px] font-semibold uppercase tracking-widest text-[#9A6B3B]">
                    Galería de Trabajos ({barber.gallery.length})
                  </h4>
                  {barber.instagram && (
                    <a
                      href={`https://instagram.com/${barber.instagram.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs font-semibold text-[#9A6B3B] hover:text-[#161514]"
                    >
                      <Instagram className="w-3.5 h-3.5" />
                      <span>{barber.instagram}</span>
                    </a>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {barber.gallery.map((imgUrl, idx) => (
                    <div
                      key={idx}
                      onClick={() => setSelectedPhoto(imgUrl)}
                      className="aspect-square rounded-xl overflow-hidden bg-[#F2EFE9] border border-[#E6E1D6] cursor-pointer hover:opacity-90 transition-transform hover:scale-[1.02]"
                    >
                      <img
                        src={imgUrl}
                        alt={`Trabajo ${idx + 1}`}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h4 className="text-[11px] font-semibold uppercase tracking-widest text-[#9A6B3B] mb-2.5">
                Servicios que realiza ({barberServices.length})
              </h4>
              <div className="space-y-2">
                {barberServices.map((srv) => (
                  <div
                    key={srv.id}
                    onClick={() => {
                      onClose();
                      onBookWithBarber(barber.id, srv.id);
                    }}
                    className="flex items-center justify-between p-3 rounded-xl bg-white hover:bg-[#F7F5F0] border border-[#E6E1D6] hover:border-[#9A6B3B]/60 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {srv.imageUrl ? (
                        <img
                          src={srv.imageUrl}
                          alt={srv.name}
                          className="w-11 h-11 rounded-lg object-cover border border-[#E6E1D6] shrink-0"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-lg bg-[#F2EFE9] flex items-center justify-center text-[#9A6B3B] shrink-0 border border-[#E6E1D6]">
                          <Scissors className="w-4 h-4" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h5 className="font-display text-base font-bold text-[#161514] uppercase tracking-wide group-hover:text-[#9A6B3B] transition-colors truncate">
                            {srv.name}
                          </h5>
                          {srv.barberId && (
                            <span className="text-[10px] font-semibold text-[#9A6B3B] uppercase shrink-0">
                              · Exclusivo
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-[#5C5852] tabular-nums">
                          {srv.durationMinutes} min
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-mono font-bold text-[#161514] tabular-nums">
                        {formatCurrency(srv.price)}
                      </span>
                      <ChevronRight className="w-4 h-4 text-[#5C5852] group-hover:text-[#9A6B3B] transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="p-4 bg-white border-t border-[#E6E1D6] flex items-center gap-3">
            <button
              onClick={() => {
                onClose();
                onBookWithBarber(barber.id);
              }}
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#161514] hover:bg-[#2A2826] text-[#FAF9F6] font-semibold text-sm active:scale-[0.98] transition-all"
            >
              <Scissors className="w-4 h-4 text-[#C69765] stroke-[2.2]" />
              <span>Reservar con {barber.firstName}</span>
            </button>
          </div>

          {selectedPhoto && (
            <div
              className="fixed inset-0 z-60 bg-[#161514]/90 flex items-center justify-center p-4"
              onClick={() => setSelectedPhoto(null)}
            >
              <button
                onClick={() => setSelectedPhoto(null)}
                className="absolute top-6 right-6 p-2 rounded-xl bg-white/15 text-white hover:bg-white/25"
              >
                <X className="w-6 h-6" />
              </button>
              <img
                src={selectedPhoto}
                alt="Detalle de trabajo"
                className="max-w-full max-h-[85vh] rounded-2xl object-contain border border-white/20"
                referrerPolicy="no-referrer"
              />
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
