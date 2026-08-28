import React, { useState } from 'react';
import {
  Users,
  Star,
  Scissors,
  Heart,
  ChevronRight,
  Sparkles,
  Search,
  Filter,
} from 'lucide-react';
import { Barber } from '../../types';
import { useBarbershop } from '../../contexts/BarbershopContext';
import { useAuth } from '../../contexts/AuthContext';

interface BarbersViewProps {
  onOpenBarberProfile: (barber: Barber) => void;
  onBookWithBarber: (barberId: string) => void;
}

export const BarbersView: React.FC<BarbersViewProps> = ({
  onOpenBarberProfile,
  onBookWithBarber,
}) => {
  const { barbers } = useBarbershop();
  const { userProfile, toggleFavorite } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyFavorites, setOnlyFavorites] = useState(false);

  const activeBarbers = barbers.filter((b) => b.active);

  const filteredBarbers = activeBarbers.filter((barber) => {
    const matchesSearch =
      barber.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      barber.specialties.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()));

    const isFav = userProfile?.favoriteBarberIds?.includes(barber.id);
    if (onlyFavorites && !isFav) return false;

    return matchesSearch;
  });

  return (
    <div className="space-y-5 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Nuestros Barberos</h1>
          <p className="text-xs text-slate-400">
            Conoce a los maestros del estilo en MONARCA BARBER
          </p>
        </div>
        <div className="p-2.5 rounded-2xl bg-[#D4AF37]/10 text-[#D4AF37]">
          <Users className="w-5 h-5" />
        </div>
      </div>

      {/* Search & Favorites Filter */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre o especialidad (Fade, Barba...)"
            className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-[#14171E] border border-white/10 text-white text-xs focus:outline-none focus:border-[#D4AF37] transition-colors"
          />
        </div>

        <button
          onClick={() => setOnlyFavorites(!onlyFavorites)}
          className={`p-2.5 rounded-2xl border transition-all ${
            onlyFavorites
              ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
              : 'bg-[#14171E] border-white/10 text-slate-400 hover:text-white'
          }`}
          title="Solo favoritos"
        >
          <Heart className={`w-4 h-4 ${onlyFavorites ? 'fill-rose-400' : ''}`} />
        </button>
      </div>

      {/* Barbers Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {filteredBarbers.map((barber) => {
          const isFav = userProfile?.favoriteBarberIds?.includes(barber.id);

          return (
            <div
              key={barber.id}
              className="rounded-3xl bg-[#14171E] border border-white/10 p-4 space-y-4 hover:border-[#D4AF37]/40 transition-all shadow-xl"
            >
              <div className="flex items-start gap-3.5">
                <div
                  onClick={() => onOpenBarberProfile(barber)}
                  className="relative w-20 h-20 rounded-2xl overflow-hidden bg-slate-800 shrink-0 cursor-pointer group"
                >
                  <img
                    src={barber.photoUrl}
                    alt={barber.displayName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    referrerPolicy="no-referrer"
                  />
                  {barber.featured && (
                    <span className="absolute bottom-1 right-1 p-1 rounded-full bg-[#D4AF37] text-slate-950">
                      <Sparkles className="w-2.5 h-2.5 fill-slate-950" />
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-1">
                    <h3
                      onClick={() => onOpenBarberProfile(barber)}
                      className="font-bold text-white text-base truncate cursor-pointer hover:text-[#D4AF37] transition-colors"
                    >
                      {barber.displayName}
                    </h3>
                    <button
                      onClick={() => toggleFavorite(barber.id)}
                      className={`p-1.5 rounded-full transition-colors ${
                        isFav ? 'text-rose-400' : 'text-slate-500 hover:text-rose-400'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${isFav ? 'fill-rose-400' : ''}`} />
                    </button>
                  </div>

                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="flex items-center gap-0.5 text-amber-400 text-xs font-bold">
                      <Star className="w-3 h-3 fill-amber-400" />
                      <span>{barber.rating.toFixed(2)}</span>
                      <span className="text-slate-500 font-normal">({barber.reviewCount})</span>
                    </div>
                    <span className="text-[11px] text-slate-400">• {barber.experienceYears || 5} años</span>
                  </div>

                  <p className="text-xs text-slate-300 line-clamp-2 mt-1.5 leading-relaxed">
                    {barber.bio}
                  </p>
                </div>
              </div>

              {/* Specialties */}
              <div className="flex flex-wrap gap-1.5">
                {barber.specialties.map((spec, i) => (
                  <span
                    key={i}
                    className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-white/5 text-[#D4AF37] border border-[#D4AF37]/20"
                  >
                    {spec}
                  </span>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-white/5 flex items-center gap-2">
                <button
                  onClick={() => onOpenBarberProfile(barber)}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold transition-colors"
                >
                  Ver Perfil & Galería
                </button>
                <button
                  onClick={() => onBookWithBarber(barber.id)}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#996515] via-[#D4AF37] to-[#F3E5AB] text-slate-950 text-xs font-bold shadow-lg shadow-[#D4AF37]/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-1"
                >
                  <Scissors className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Reservar Cita</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
