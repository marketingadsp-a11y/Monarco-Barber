import React, { useState, useRef } from 'react';
import {
  Package,
  Plus,
  Edit2,
  Search,
  DollarSign,
  Info,
  CheckCircle2,
  Sparkles,
  Upload,
  Image as ImageIcon,
  Trash2,
  RefreshCw,
  X,
} from 'lucide-react';
import { useBarbershop } from '../../contexts/BarbershopContext';
import { useAuth } from '../../contexts/AuthContext';
import { Product } from '../../types';
import { formatCurrency } from '../../utils/dateTime';
import { imageService } from '../../services/imgbb/imageService';

interface BarberProductsSectionProps {
  onGoToPos?: () => void;
}

export const BarberProductsSection: React.FC<BarberProductsSectionProps> = ({ onGoToPos }) => {
  const { products, saveProduct, showToast } = useBarbershop();
  const { currentBarberId, userProfile } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filtered products list
  const filteredProducts = products.filter((p) => {
    const query = searchQuery.toLowerCase();
    return p.name.toLowerCase().includes(query) || (p.description && p.description.toLowerCase().includes(query));
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    try {
      const uploadedResult = await imageService.uploadImage(file);
      const cleanUrl = typeof uploadedResult === 'string' ? uploadedResult : (uploadedResult as any)?.url || '';
      setEditingProduct((prev) => (prev ? { ...prev, imageUrl: cleanUrl } : { imageUrl: cleanUrl }));
      showToast('success', 'Imagen cargada', 'Fotografía del producto cargada correctamente.');
    } catch (err: any) {
      showToast('error', 'Error al subir imagen', err.message);
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

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

  // Helper for image fallback
  const getProductImage = (prod: Partial<Product>) => {
    if (prod.imageUrl) return prod.imageUrl;
    const name = (prod.name || '').toLowerCase();
    const desc = (prod.description || '').toLowerCase();
    const cat = (prod.category || '').toLowerCase();
    if (name.includes('pomada') || name.includes('matte') || desc.includes('fijación') || cat.includes('fijación')) {
      return 'https://images.unsplash.com/photo-1597854710119-a5a8fc004a66?auto=format&fit=crop&w=400&q=80';
    }
    if (name.includes('aceite') || name.includes('barba') || desc.includes('barba') || cat.includes('barba')) {
      return 'https://images.unsplash.com/photo-1621607512214-68297480165e?auto=format&fit=crop&w=400&q=80';
    }
    if (name.includes('shampoo') || name.includes('capilar') || name.includes('anticaída') || cat.includes('capilar')) {
      return 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?auto=format&fit=crop&w=400&q=80';
    }
    if (name.includes('cera') || name.includes('polvo') || name.includes('texturiz')) {
      return 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=400&q=80';
    }
    if (name.includes('aftershave') || name.includes('balsamo') || name.includes('bálsamo') || name.includes('afeitado') || cat.includes('afeitado')) {
      return 'https://images.unsplash.com/photo-1512290900672-1f4a47146522?auto=format&fit=crop&w=400&q=80';
    }
    return 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=400&q=80';
  };

  return (
    <div className="space-y-4">
      {/* Banner de Inventario Unificado */}
      <div className="p-4 rounded-3xl bg-gradient-to-r from-[#181D26] to-[#12151B] border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Inventario General & Catálogo POS</h3>
            <p className="text-[11px] text-slate-400">
              Registra nuevos artículos para venderlos en el Punto de Venta (POS) al cobrar a tus clientes
            </p>
          </div>
        </div>

        <button
          onClick={() =>
            setEditingProduct({
              name: '',
              category: '',
              imageUrl: '',
              description: '',
              price: 150,
              active: true,
              createdByType: 'barber',
            })
          }
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-[#D4AF37] text-slate-950 text-xs font-bold shadow-md hover:bg-[#E5B869] transition-all self-stretch sm:self-auto justify-center shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar Producto</span>
        </button>
      </div>

      {/* Barra de búsqueda */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar producto por nombre o descripción..."
          className="w-full pl-9 pr-4 py-2 rounded-2xl bg-[#14171E] border border-white/10 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-[#D4AF37]"
        />
      </div>

      {/* Grid de Productos */}
      {filteredProducts.length === 0 ? (
        <div className="p-8 rounded-3xl bg-[#14171E] border border-white/10 text-center text-xs text-slate-400 space-y-2">
          <Package className="w-8 h-8 mx-auto text-slate-600 mb-1" />
          <p className="font-semibold text-white">No se encontraron productos</p>
          <p className="text-slate-500">
            Sé el primero en registrar un producto para tenerlo listo al momento de cobrar con el POS.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {filteredProducts.map((prod) => {
            const imgSource = getProductImage(prod);
            return (
              <div
                key={prod.id}
                className="rounded-2xl bg-[#14171E] border border-white/10 p-3.5 flex flex-col justify-between gap-2.5 shadow-lg hover:border-[#D4AF37]/40 transition-all"
              >
                <div className="flex gap-2.5">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-black/40 border border-white/10 shrink-0">
                    <img
                      src={imgSource}
                      alt={prod.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="space-y-0.5 min-w-0 flex-1">
                    <h4 className="font-bold text-white text-xs leading-snug truncate" title={prod.name}>
                      {prod.name}
                    </h4>
                    <span className="font-black text-[#D4AF37] text-sm block">
                      {formatCurrency(prod.price)}
                    </span>
                    {prod.category && (
                      <span className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-slate-400">
                        {prod.category}
                      </span>
                    )}
                  </div>
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
            );
          })}
        </div>
      )}

      {/* Modal: Registrar / Editar Producto con IMAGEN */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div className="bg-[#14171E] border border-white/15 rounded-3xl p-5 w-full max-w-md space-y-4 shadow-2xl my-8">
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

              <button
                onClick={() => setEditingProduct(null)}
                className="p-1 rounded-lg bg-white/5 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* FOTOGRAFÍA DEL PRODUCTO */}
            <div className="space-y-2 p-3 rounded-2xl bg-slate-900 border border-white/10">
              <label className="text-slate-300 font-semibold block text-xs flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-[#D4AF37]" />
                  <span>FOTOGRAFÍA DEL PRODUCTO</span>
                </span>
                {editingProduct.imageUrl && (
                  <button
                    type="button"
                    onClick={() => setEditingProduct({ ...editingProduct, imageUrl: '' })}
                    className="text-[10px] text-rose-400 hover:underline flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    Quitar foto
                  </button>
                )}
              </label>

              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-black/60 border border-white/20 shrink-0 relative flex items-center justify-center">
                  <img
                    src={editingProduct.imageUrl || getProductImage(editingProduct)}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  {isUploadingPhoto && (
                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                      <RefreshCw className="w-4 h-4 text-[#D4AF37] animate-spin" />
                    </div>
                  )}
                </div>

                <div className="space-y-1 flex-1 text-xs">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/png,image/jpeg,image/webp,image/jpg"
                    onChange={handleImageUpload}
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingPhoto}
                    className="w-full py-1.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-semibold flex items-center justify-center gap-1.5 transition-all text-xs"
                  >
                    {isUploadingPhoto ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Subiendo...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5 text-[#D4AF37]" />
                        <span>Subir Foto</span>
                      </>
                    )}
                  </button>

                  <input
                    type="url"
                    value={editingProduct.imageUrl || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, imageUrl: e.target.value })}
                    placeholder="O escribe URL de imagen"
                    className="w-full p-1.5 rounded-xl bg-black/40 border border-white/10 text-white text-[11px] placeholder:text-slate-500 focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3 text-xs">
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

              {/* CATEGORÍA */}
              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  CATEGORÍA
                </label>
                <select
                  value={editingProduct.category || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-[#D4AF37]"
                >
                  <option value="">Seleccionar categoría...</option>
                  <option value="Fijación">Fijación (Pomadas / Ceras / Sprays)</option>
                  <option value="Cuidado de Barba">Cuidado de Barba (Aceites / Bálsamos)</option>
                  <option value="Cuidado Capilar">Cuidado Capilar (Shampoo / Tónicos)</option>
                  <option value="Afeitado">Afeitado (Geles / Aftershave)</option>
                  <option value="Accesorios">Accesorios y Herramientas</option>
                </select>
              </div>

              {/* DESCRIPCIÓN */}
              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  DESCRIPCIÓN
                </label>
                <textarea
                  value={editingProduct.description || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  rows={2}
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
                disabled={isSaving || isUploadingPhoto}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#996515] via-[#D4AF37] to-[#F3E5AB] text-slate-950 text-xs font-bold shadow-md hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
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
