import React, { useState } from 'react';
import {
  Users,
  Star,
  Scissors,
  Heart,
  Sparkles,
  Search,
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
    <div className="space-y-6 pb-24">
      <div className="flex items-end justify-between border-b border-[#E6E1D6] pb-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-[#161514] tracking-wide uppercase">
            Nuestros Barberos
          </h1>
          <p className="text-xs text-[#5C5852] mt-0.5">
            Conoce a los maestros del estilo en MONARCA BARBER
          </p>
        </div>
        <div className="p-2.5 rounded-xl bg-[#F2EFE9] border border-[#E6E1D6] text-[#9A6B3B]">
          <Users className="w-5 h-5" />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#5C5852] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre o especialidad (Fade, Barba...)"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-[#E6E1D6] text-[#161514] placeholder-[#5C5852]/70 text-xs focus:outline-none focus:border-[#9A6B3B] transition-colors"
          />
        </div>

        <button
          onClick={() => setOnlyFavorites(!onlyFavorites)}
          className={`p-2.5 rounded-xl border transition-all ${
            onlyFavorites
              ? 'bg-rose-50 border-rose-300 text-rose-700'
              : 'bg-white border-[#E6E1D6] text-[#5C5852] hover:text-[#161514]'
          }`}
          title="Solo favoritos"
        >
          <Heart className={`w-4 h-4 ${onlyFavorites ? 'fill-rose-600' : ''}`} />
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {filteredBarbers.map((barber) => {
          const isFav = userProfile?.favoriteBarberIds?.includes(barber.id);

          return (
            <div
              key={barber.id}
              className="rounded-2xl bg-white border border-[#E6E1D6] p-4 sm:p-5 space-y-4 hover:border-[#9A6B3B]/60 transition-all"
            >
              <div className="flex items-start gap-3.5">
                <div
                  onClick={() => onOpenBarberProfile(barber)}
                  className="relative w-20 h-20 rounded-xl overflow-hidden bg-[#F2EFE9] border border-[#E6E1D6] shrink-0 cursor-pointer group"
                >
                  <img
                    src={barber.photoUrl}
                    alt={barber.displayName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    referrerPolicy="no-referrer"
                  />
                  {barber.featured && (
                    <span className="absolute bottom-1 right-1 p-1 rounded-full bg-[#161514] text-[#FAF9F6]">
                      <Sparkles className="w-2.5 h-2.5 text-[#C69765]" />
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-1">
                    <h3
                      onClick={() => onOpenBarberProfile(barber)}
                      className="font-display text-xl font-bold text-[#161514] uppercase tracking-wide truncate cursor-pointer hover:text-[#9A6B3B] transition-colors"
                    >
                      {barber.displayName}
                    </h3>
                    <button
                      onClick={() => toggleFavorite(barber.id)}
                      className={`p-1.5 rounded-full transition-colors ${
                        isFav ? 'text-rose-600' : 'text-[#5C5852] hover:text-rose-600'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${isFav ? 'fill-rose-600' : ''}`} />
                    </button>
                  </div>

                  <div className="flex items-center gap-2 mt-0.5 tabular-nums">
                    <div className="flex items-center gap-1 text-[#161514] text-xs font-semibold">
                      <Star className="w-3.5 h-3.5 text-[#9A6B3B] fill-[#9A6B3B]" />
                      <span>{barber.rating.toFixed(2)}</span>
                      <span className="text-[#5C5852] font-normal">({barber.reviewCount})</span>
                    </div>
                    <span className="text-[11px] text-[#5C5852]">· {barber.experienceYears || 5} años</span>
                  </div>

                  <p className="text-xs text-[#5C5852] line-clamp-2 mt-1.5 leading-relaxed">
                    {barber.bio}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#9A6B3B] font-medium">
                {barber.specialties.map((spec, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <span className="text-[#D2CBBF]" aria-hidden="true">/</span>}
                    <span>{spec}</span>
                  </React.Fragment>
                ))}
              </div>

              <div className="pt-3 border-t border-[#E6E1D6] flex items-center gap-2.5">
                <button
                  onClick={() => onOpenBarberProfile(barber)}
                  className="flex-1 py-2.5 rounded-xl bg-[#F2EFE9] hover:bg-[#E6E1D6] text-[#161514] text-xs font-semibold transition-colors whitespace-nowrap"
                >
                  Ver Perfil & Galería
                </button>
                <button
                  onClick={() => onBookWithBarber(barber.id)}
                  className="flex-1 py-2.5 rounded-xl bg-[#161514] hover:bg-[#2A2826] text-[#FAF9F6] text-xs font-semibold active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 whitespace-nowrap"
                >
                  <Scissors className="w-3.5 h-3.5 text-[#C69765] stroke-[2.2]" />
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
