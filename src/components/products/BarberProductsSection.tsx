import React, { useState } from 'react';
import {
  Package,
  Plus,
  Edit2,
  Search,
  DollarSign,
  Info,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { useBarbershop } from '../../contexts/BarbershopContext';
import { useAuth } from '../../contexts/AuthContext';
import { Product } from '../../types';
import { formatCurrency } from '../../utils/dateTime';

interface BarberProductsSectionProps {
  onGoToPos?: () => void;
}

export const BarberProductsSection: React.FC<BarberProductsSectionProps> = ({ onGoToPos }) => {
  const { products, saveProduct, showToast } = useBarbershop();
  const { currentBarberId, userProfile } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Filtered products list
  const filteredProducts = products.filter((p) => {
    const query = searchQuery.toLowerCase();
    return p.name.toLowerCase().includes(query) || (p.description && p.description.toLowerCase().includes(query));
  });

  const handleSaveProduct = async () => {
    if (!editingProduct?.name || editingProduct.name.trim() === '') {
      showToast('error', 'Nombre requerido', 'El producto necesita un nombre.');
      return;
    }
    if (editingProduct.price === undefined || editingProduct.price < 0) {
      showToast('error', 'Precio inválido', 'El precio debe ser un número válido mayor o igual a 0.');
      return;
    }

    setIsSaving(true);
    try {
      await saveProduct({
        ...editingProduct,
        createdByType: editingProduct.createdByType || 'barber',
        createdByBarberId: editingProduct.createdByBarberId || currentBarberId || undefined,
        createdByBarberName: editingProduct.createdByBarberName || userProfile?.name || 'Barbero',
        active: editingProduct.active !== undefined ? editingProduct.active : true,
      });
      setEditingProduct(null);
      showToast(
        'success',
        'Producto en Inventario General',
        'El producto ha sido registrado y ahora está disponible para todos los barberos.'
      );
    } catch (err: any) {
      showToast('error', 'Error al guardar producto', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-gradient-to-r from-[#181D26] to-[#12151B] border border-white/10 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37]">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">Catálogo General de Productos</h3>
            <p className="text-xs text-slate-400">
              Registra o actualiza productos. Todos los barberos comparten este mismo catálogo general.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onGoToPos && (
            <button
              onClick={onGoToPos}
              className="px-3.5 py-2 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold transition-all"
            >
              Ir a Punto de Venta (POS)
            </button>
          )}

          <button
            onClick={() =>
              setEditingProduct({
                name: '',
                description: '',
                price: 200,
                active: true,
                createdByType: 'barber',
                createdByBarberId: currentBarberId || undefined,
                createdByBarberName: userProfile?.name || 'Barbero',
              })
            }
            className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-[#D4AF37] text-slate-950 text-xs font-bold shadow-lg hover:bg-[#E5B869] transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Producto</span>
          </button>
        </div>
      </div>

      {/* Info notice about permissions */}
      <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-start gap-2.5 text-xs text-blue-200">
        <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
        <div>
          <span>
            Como barbero puedes <strong>crear nuevos productos</strong> y <strong>editar información</strong>. Los productos registrados se publican en el inventario general de la barbería.
          </span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar producto por nombre o descripción..."
          className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-[#14171E] border border-white/10 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-[#D4AF37]"
        />
      </div>

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <div className="rounded-3xl bg-[#14171E] border border-white/10 p-8 text-center text-slate-400 space-y-2">
          <Package className="w-10 h-10 mx-auto text-slate-600 mb-2" />
          <p className="font-semibold text-white text-sm">No se encontraron productos</p>
          <p className="text-xs text-slate-500">
            Sé el primero en registrar un producto a la venta en el catálogo general.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredProducts.map((prod) => (
            <div
              key={prod.id}
              className={`rounded-2xl bg-[#14171E] border ${
                prod.active ? 'border-white/10' : 'border-white/5 opacity-60'
              } p-4 flex flex-col justify-between gap-3 shadow-lg hover:border-[#D4AF37]/40 transition-all`}
            >
              <div className="space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-bold text-white text-sm leading-snug">{prod.name}</h4>
                  <span className="font-black text-[#D4AF37] text-base shrink-0">
                    {formatCurrency(prod.price)}
                  </span>
                </div>

                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                  {prod.description || 'Sin descripción detallada.'}
                </p>
              </div>

              <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2">
                <div className="text-[11px] text-slate-500">
                  {prod.createdByType === 'barber' ? (
                    <span className="text-blue-300">
                      Por: {prod.createdByBarberName || 'Barbero'}
                    </span>
                  ) : (
                    <span className="text-amber-300">Monarca Oficial</span>
                  )}
                </div>

                {/* Edit Button (Barber can edit, but CANNOT delete) */}
                <button
                  onClick={() => setEditingProduct(prod)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 hover:text-white text-xs font-semibold transition-all"
                  title="Editar producto"
                >
                  <Edit2 className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>Editar</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Registrar / Editar Producto (Solo NOMBRE, DESCRIPCIÓN, PRECIO) */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#14171E] border border-white/15 rounded-3xl p-5 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37]">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {editingProduct.id ? 'Editar Producto' : 'Registrar Nuevo Producto'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Se añadirá al inventario general visible para todos los barberos
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* NOMBRE */}
              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  NOMBRE DEL PRODUCTO *
                </label>
                <input
                  type="text"
                  value={editingProduct.name || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  placeholder="Ej. Gel Fijador Barber Premium 250ml"
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              {/* DESCRIPCIÓN */}
              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  DESCRIPCIÓN
                </label>
                <textarea
                  value={editingProduct.description || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  rows={3}
                  placeholder="Describe las características y beneficios del producto..."
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              {/* PRECIO */}
              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  PRECIO ($ MXN) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#D4AF37] font-bold text-sm">
                    $
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={editingProduct.price !== undefined ? editingProduct.price : ''}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="0.00"
                    className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white font-bold text-sm focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-3 border-t border-white/10">
              <button
                onClick={() => setEditingProduct(null)}
                className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveProduct}
                disabled={isSaving}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#996515] via-[#D4AF37] to-[#F3E5AB] text-slate-950 text-xs font-bold shadow-md hover:scale-[1.02] active:scale-95 transition-all"
              >
                {isSaving ? 'Guardando...' : 'Guardar Producto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
