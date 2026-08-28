import React, { useState } from 'react';
import {
  X,
  Star,
  Clock,
  Scissors,
  Calendar,
  Heart,
  Instagram,
  Phone,
  Sparkles,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Barber, Service } from '../../types';
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

  // Filter services offered by this barber
  const barberServices = services.filter(
    (s) => s.active && (barber.serviceIds.length === 0 || barber.serviceIds.includes(s.id))
  );

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-lg bg-[#14171E] border border-white/15 rounded-3xl overflow-hidden shadow-2xl z-10 max-h-[90vh] flex flex-col"
        >
          {/* Header Cover & Close Button */}
          <div className="relative h-44 sm:h-52 w-full bg-slate-900 overflow-hidden">
            <img
              src={barber.gallery?.[0] || barber.photoUrl}
              alt={barber.displayName}
              className="w-full h-full object-cover opacity-40 blur-sm scale-110"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#14171E] via-[#14171E]/60 to-transparent" />

            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-slate-300 hover:text-white border border-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Favorite button */}
            <button
              onClick={() => toggleFavorite(barber.id)}
              className={`absolute top-4 left-4 p-2 rounded-full border transition-all ${
                isFavorite
                  ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                  : 'bg-black/50 border-white/10 text-slate-300 hover:text-rose-400'
              }`}
            >
              <Heart className={`w-5 h-5 ${isFavorite ? 'fill-rose-400' : ''}`} />
            </button>

            {/* Profile Avatar & Primary Info */}
            <div className="absolute bottom-4 left-5 right-5 flex items-end gap-4">
              <div className="relative">
                <img
                  src={barber.photoUrl}
                  alt={barber.displayName}
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-[#D4AF37] shadow-xl"
                  referrerPolicy="no-referrer"
                />
                {barber.featured && (
                  <span className="absolute -top-2 -right-2 p-1 rounded-full bg-[#D4AF37] text-slate-950 shadow">
                    <Sparkles className="w-3.5 h-3.5 fill-slate-950" />
                  </span>
                )}
              </div>

              <div className="flex-1 min-w-0 pb-1">
                <h3 className="text-xl font-bold text-white tracking-tight truncate">
                  {barber.displayName}
                </h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="flex items-center gap-1 text-amber-400 text-xs font-bold bg-black/40 px-2 py-0.5 rounded-lg border border-amber-400/20">
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    <span>{barber.rating.toFixed(2)}</span>
                    <span className="text-slate-400 font-normal">({barber.reviewCount})</span>
                  </div>
                  <span className="text-xs text-slate-300 font-medium">
                    {barber.experienceYears || 5} años exp.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Bio */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Sobre el Barbero
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed font-normal">
                {barber.bio || 'Especialista en cortes modernos y estilo masculino de alta gama.'}
              </p>
            </div>

            {/* Specialties */}
            {barber.specialties && barber.specialties.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Especialidades
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {barber.specialties.map((spec, i) => (
                    <span
                      key={i}
                      className="text-xs font-medium px-3 py-1 rounded-full bg-white/5 text-[#D4AF37] border border-[#D4AF37]/20"
                    >
                      {spec}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Gallery (Section 13) */}
            {barber.gallery && barber.gallery.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Galería de Trabajos ({barber.gallery.length})
                  </h4>
                  {barber.instagram && (
                    <a
                      href={`https://instagram.com/${barber.instagram.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-[#D4AF37] hover:underline"
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
                      className="aspect-square rounded-2xl overflow-hidden bg-slate-800 border border-white/10 cursor-pointer hover:opacity-80 transition-all hover:scale-105"
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

            {/* Services Performed */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
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
                    className="flex items-center justify-between p-3 rounded-2xl bg-white/5 hover:bg-[#D4AF37]/10 border border-white/5 hover:border-[#D4AF37]/30 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {srv.imageUrl ? (
                        <img
                          src={srv.imageUrl}
                          alt={srv.name}
                          className="w-11 h-11 rounded-xl object-cover border border-white/10 shrink-0"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-xl bg-slate-800 flex items-center justify-center text-[#D4AF37] shrink-0 border border-white/10">
                          <Scissors className="w-4 h-4" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h5 className="font-bold text-white text-xs group-hover:text-[#D4AF37] transition-colors truncate">
                            {srv.name}
                          </h5>
                          {srv.barberId && (
                            <span className="text-[8px] font-bold px-1.5 py-0.2 rounded bg-[#D4AF37]/20 text-[#D4AF37] uppercase shrink-0">
                              Exclusivo
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {srv.durationMinutes} min
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-bold text-[#D4AF37]">
                        {formatCurrency(srv.price)}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-[#D4AF37] transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Modal Footer CTA */}
          <div className="p-4 bg-[#101217] border-t border-white/10 flex items-center gap-3">
            <button
              onClick={() => {
                onClose();
                onBookWithBarber(barber.id);
              }}
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-[#996515] via-[#D4AF37] to-[#F3E5AB] text-slate-950 font-bold text-sm shadow-xl shadow-[#D4AF37]/20 hover:scale-[1.02] active:scale-95 transition-all"
            >
              <Scissors className="w-4 h-4 stroke-[2.5]" />
              <span>Reservar con {barber.firstName}</span>
            </button>
          </div>

          {/* Lightbox for Gallery Photo */}
          {selectedPhoto && (
            <div
              className="fixed inset-0 z-60 bg-black/95 flex items-center justify-center p-4"
              onClick={() => setSelectedPhoto(null)}
            >
              <button
                onClick={() => setSelectedPhoto(null)}
                className="absolute top-6 right-6 p-2 rounded-full bg-white/10 text-white"
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
