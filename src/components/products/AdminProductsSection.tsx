import React, { useState, useRef } from 'react';
import {
  Package,
  Plus,
  Edit2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  DollarSign,
  Award,
  Sparkles,
  ShoppingBag,
  Search,
  CheckCircle2,
  Calendar,
  User,
  Percent,
  Save,
  Info,
  Upload,
  Image as ImageIcon,
  X,
  RefreshCw,
  QrCode,
  Scissors,
} from 'lucide-react';
import { useBarbershop } from '../../contexts/BarbershopContext';
import { Product, PosSale } from '../../types';
import { formatCurrency, formatDateSpanish, formatTime12h } from '../../utils/dateTime';
import { imageService } from '../../services/imgbb/imageService';

export const AdminProductsSection: React.FC = () => {
  const {
    products,
    posSales,
    businessSettings,
    saveProduct,
    deleteProduct,
    toggleProductActive,
    saveSettings,
    showToast,
  } = useBarbershop();

  // Sub-tab: products, sales or points_config
  const [subTab, setSubTab] = useState<'inventory' | 'sales' | 'points_config'>('inventory');

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Product modal state
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [isUploadingProductPhoto, setIsUploadingProductPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Points settings state
  const [pointsPerVisit, setPointsPerVisit] = useState<number>(
    businessSettings.pointsPerVisit !== undefined ? businessSettings.pointsPerVisit : 0
  );
  const [servicePointsReward, setServicePointsReward] = useState<number>(
    businessSettings.servicePointsReward !== undefined ? businessSettings.servicePointsReward : 50
  );
  const [pointsEnabled, setPointsEnabled] = useState<boolean>(
    businessSettings.enableProductPointsReward !== undefined ? businessSettings.enableProductPointsReward : true
  );
  const [pointsPercentage, setPointsPercentage] = useState<number>(
    businessSettings.productPointsPercentage !== undefined ? businessSettings.productPointsPercentage : 1
  );
  const [isSavingPoints, setIsSavingPoints] = useState(false);

  // Update local points state when settings change
  React.useEffect(() => {
    if (businessSettings) {
      setPointsPerVisit(
        businessSettings.pointsPerVisit !== undefined ? businessSettings.pointsPerVisit : 0
      );
      setServicePointsReward(
        businessSettings.servicePointsReward !== undefined ? businessSettings.servicePointsReward : 50
      );
      setPointsEnabled(
        businessSettings.enableProductPointsReward !== undefined ? businessSettings.enableProductPointsReward : true
      );
      setPointsPercentage(
        businessSettings.productPointsPercentage !== undefined ? businessSettings.productPointsPercentage : 1
      );
    }
  }, [businessSettings]);

  // Filtered products
  const filteredProducts = products.filter((p) => {
    const query = searchQuery.toLowerCase();
    return p.name.toLowerCase().includes(query) || (p.description && p.description.toLowerCase().includes(query));
  });

  const totalSalesRevenue = posSales.reduce((acc, s) => acc + (s.total || 0), 0);
  const totalPointsAwarded = posSales.reduce((acc, s) => acc + (s.pointsAwarded || 0), 0);

  // Handle Image Upload for Product
  const handleProductImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingProductPhoto(true);
    try {
      const uploadedResult = await imageService.uploadImage(file);
      const cleanUrl = typeof uploadedResult === 'string' ? uploadedResult : (uploadedResult as any)?.url || '';
      setEditingProduct((prev) => (prev ? { ...prev, imageUrl: cleanUrl } : { imageUrl: cleanUrl }));
      showToast('success', 'Imagen cargada', 'La fotografía del producto se ha subido correctamente.');
    } catch (err: any) {
      showToast('error', 'Error al subir imagen', err.message);
    } finally {
      setIsUploadingProductPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSaveProductSubmit = async () => {
    if (!editingProduct?.name || editingProduct.name.trim() === '') {
      showToast('error', 'Nombre requerido', 'Ingresa el nombre del producto.');
      return;
    }
    if (editingProduct.price === undefined || editingProduct.price < 0) {
      showToast('error', 'Precio inválido', 'El precio debe ser un número mayor o igual a 0.');
      return;
    }

    setIsSavingProduct(true);
    try {
      await saveProduct({
        ...editingProduct,
        createdByType: editingProduct.createdByType || 'admin',
      });
      setEditingProduct(null);
      showToast('success', 'Producto guardado', 'El producto se ha guardado en el catálogo general.');
    } catch (err: any) {
      showToast('error', 'Error al guardar', err.message);
    } finally {
      setIsSavingProduct(false);
    }
  };

  const handleDeleteProductSubmit = async (productId: string, productName: string) => {
    if (confirm(`¿Estás seguro de eliminar el producto "${productName}" del inventario general?`)) {
      try {
        await deleteProduct(productId);
        showToast('info', 'Producto eliminado', `Se eliminó "${productName}" del inventario.`);
      } catch (err: any) {
        showToast('error', 'Error al eliminar', err.message);
      }
    }
  };

  const handleSavePointsSettings = async () => {
    setIsSavingPoints(true);
    try {
      await saveSettings({
        pointsPerVisit: Number(pointsPerVisit) || 0,
        servicePointsReward: Number(servicePointsReward) || 50,
        enableProductPointsReward: pointsEnabled,
        productPointsPercentage: Number(pointsPercentage) || 1,
      });
      showToast(
        'success',
        'Configuración de puntos guardada',
        'Los parámetros de acumulación de puntos por visita, servicio y productos se han actualizado.'
      );
    } catch (err: any) {
      showToast('error', 'Error al guardar puntos', err.message);
    } finally {
      setIsSavingPoints(false);
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
    <div className="space-y-6">
      {/* Header & Sub-tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-white border border-[#E6E1D6] shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#161514] border border-[#161514] flex items-center justify-center text-[#C69765] shrink-0">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-display text-xl font-bold text-[#161514] uppercase tracking-wide">Inventario de Productos & POS</h3>
            <p className="text-xs text-[#5C5852]">
              Catálogo general con fotografías, control para barberos y programa de puntos por compra
            </p>
          </div>
        </div>

        {/* Sub-nav buttons */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[#F2EFE9] border border-[#E6E1D6] flex-wrap">
          <button
            onClick={() => setSubTab('inventory')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              subTab === 'inventory' ? 'bg-[#161514] text-[#FAF9F6] shadow-sm' : 'text-[#5C5852] hover:text-[#161514]'
            }`}
          >
            Productos ({products.length})
          </button>
          <button
            onClick={() => setSubTab('sales')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              subTab === 'sales' ? 'bg-[#161514] text-[#FAF9F6] shadow-sm' : 'text-[#5C5852] hover:text-[#161514]'
            }`}
          >
            Ventas POS ({posSales.length})
          </button>
          <button
            onClick={() => setSubTab('points_config')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              subTab === 'points_config' ? 'bg-[#161514] text-[#FAF9F6] shadow-sm' : 'text-[#5C5852] hover:text-[#161514]'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Config. Puntos</span>
          </button>
        </div>
      </div>

      {/* SUBTAB 1: PRODUCT INVENTORY */}
      {subTab === 'inventory' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search Bar */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-[#767067] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar producto por nombre o descripción..."
                className="w-full pl-9 pr-4 py-2 rounded-2xl bg-white border border-[#D2CBBF] text-[#161514] text-xs placeholder:text-[#8E887E] focus:outline-none focus:border-[#9A6B3B]"
              />
            </div>

            {/* Add product button */}
            <button
              onClick={() =>
                setEditingProduct({
                  name: '',
                  description: '',
                  price: 180,
                  active: true,
                  createdByType: 'admin',
                  imageUrl: '',
                })
              }
              className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-2xl bg-[#161514] text-[#FAF9F6] text-xs font-bold shadow-sm hover:bg-[#2A2826] transition-all shrink-0"
            >
              <Plus className="w-4 h-4 text-[#C69765]" />
              <span>Registrar Producto</span>
            </button>
          </div>

          {/* Product Cards List */}
          {filteredProducts.length === 0 ? (
            <div className="rounded-3xl bg-white border border-[#E6E1D6] p-8 text-center text-[#5C5852] space-y-2 shadow-sm">
              <Package className="w-10 h-10 mx-auto text-[#8E887E] mb-2" />
              <p className="font-semibold text-[#161514] text-sm">No hay productos en el inventario</p>
              <p className="text-xs text-[#767067]">
                Registra productos con su fotografía y precio para que los barberos puedan venderlos desde el POS.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredProducts.map((prod) => {
                const imgSource = getProductImage(prod);
                return (
                  <div
                    key={prod.id}
                    className={`rounded-2xl bg-white border ${
                      prod.active ? 'border-[#E6E1D6]' : 'border-[#E6E1D6] opacity-60'
                    } p-4 flex flex-col justify-between gap-3 shadow-sm hover:border-[#9A6B3B]/60 transition-all`}
                  >
                    <div className="flex gap-3">
                      {/* Product Thumbnail */}
                      <div className="w-20 h-20 rounded-xl overflow-hidden bg-[#F2EFE9] border border-[#E6E1D6] shrink-0 relative group">
                        <img
                          src={imgSource}
                          alt={prod.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {prod.imageUrl ? (
                          <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-[#161514]/85 text-[9px] font-bold text-[#FAF9F6]">
                            Foto
                          </span>
                        ) : null}
                      </div>

                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-1.5">
                          <h4 className="font-bold text-[#161514] text-sm leading-snug truncate" title={prod.name}>
                            {prod.name}
                          </h4>
                        </div>
                        <span className="font-mono font-black text-[#9A6B3B] text-base block tabular-nums">
                          {formatCurrency(prod.price)}
                        </span>
                        <p className="text-xs text-[#5C5852] line-clamp-2 leading-relaxed">
                          {prod.description || 'Sin descripción detallada.'}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[#E6E1D6] flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-[11px] text-[#767067]">
                        {prod.createdByType === 'barber' ? (
                          <span className="px-2 py-0.5 rounded-md bg-sky-50 text-sky-800 font-semibold border border-sky-200">
                            Barbero: {prod.createdByBarberName || 'Equipo'}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-[#FBF6EE] text-[#7D542B] font-semibold border border-[#9A6B3B]/30">
                            Monarca Oficial
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        {/* Active toggle */}
                        <button
                          onClick={() => toggleProductActive(prod.id, !prod.active)}
                          className="p-1.5 rounded-xl bg-[#F2EFE9] hover:bg-[#E8E3D9] text-[#5C5852] transition-all"
                          title={prod.active ? 'Desactivar producto' : 'Activar producto'}
                        >
                          {prod.active ? (
                            <ToggleRight className="w-5 h-5 text-emerald-700" />
                          ) : (
                            <ToggleLeft className="w-5 h-5 text-[#8E887E]" />
                          )}
                        </button>

                        {/* Edit product */}
                        <button
                          onClick={() => setEditingProduct(prod)}
                          className="p-1.5 rounded-xl bg-[#F2EFE9] hover:bg-[#E8E3D9] text-[#5C5852] hover:text-[#161514] transition-all"
                          title="Editar producto"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        {/* Delete product */}
                        <button
                          onClick={() => handleDeleteProductSubmit(prod.id, prod.name)}
                          className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 transition-all"
                          title="Eliminar producto del catálogo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Modal: Crear / Editar Producto con FOTOGRAFÍA */}
          {editingProduct && (
            <div className="fixed inset-0 z-50 bg-[#161514]/55 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in overflow-y-auto">
              <div className="bg-[#FAF9F6] border border-[#D2CBBF] rounded-3xl p-5 w-full max-w-lg space-y-4 shadow-2xl my-8">
                <div className="flex items-center justify-between pb-2 border-b border-[#E6E1D6]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-[#161514] border border-[#161514] flex items-center justify-center text-[#C69765]">
                      <Package className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-display text-base font-bold text-[#161514] uppercase tracking-wide">
                        {editingProduct.id ? 'Editar Producto' : 'Registrar Nuevo Producto'}
                      </h3>
                      <p className="text-[11px] text-[#5C5852]">
                        Configura imagen, nombre, descripción y precio de venta
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setEditingProduct(null)}
                    className="p-1.5 rounded-xl bg-[#F2EFE9] border border-[#E6E1D6] text-[#5C5852] hover:text-[#161514]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* FOTOGRAFÍA DEL PRODUCTO */}
                <div className="space-y-2 p-3.5 rounded-2xl bg-white border border-[#E6E1D6]">
                  <label className="text-[#161514] font-semibold block text-xs flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-[#9A6B3B]" />
                      <span>FOTOGRAFÍA DEL PRODUCTO</span>
                    </span>
                    {editingProduct.imageUrl && (
                      <button
                        type="button"
                        onClick={() => setEditingProduct({ ...editingProduct, imageUrl: '' })}
                        className="text-[10px] text-rose-700 hover:underline flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        Quitar foto
                      </button>
                    )}
                  </label>

                  <div className="flex items-center gap-3">
                    {/* Preview Thumbnail */}
                    <div className="w-20 h-20 rounded-2xl overflow-hidden bg-[#F2EFE9] border border-[#D2CBBF] shrink-0 relative flex items-center justify-center">
                      <img
                        src={editingProduct.imageUrl || getProductImage(editingProduct)}
                        alt="Preview"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                      {isUploadingProductPhoto && (
                        <div className="absolute inset-0 bg-[#FAF9F6]/80 flex flex-col items-center justify-center">
                          <RefreshCw className="w-5 h-5 text-[#9A6B3B] animate-spin" />
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5 flex-1 text-xs">
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/png,image/jpeg,image/webp,image/jpg"
                        onChange={handleProductImageUpload}
                        className="hidden"
                      />

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingProductPhoto}
                        className="w-full py-2 px-3 rounded-xl bg-[#F2EFE9] hover:bg-[#E8E3D9] border border-[#D2CBBF] text-[#161514] font-semibold flex items-center justify-center gap-1.5 transition-all text-xs"
                      >
                        {isUploadingProductPhoto ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#9A6B3B]" />
                            <span>Subiendo imagen...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-3.5 h-3.5 text-[#9A6B3B]" />
                            <span>Subir Foto desde Dispositivo</span>
                          </>
                        )}
                      </button>

                      {/* URL input fallback */}
                      <input
                        type="url"
                        value={editingProduct.imageUrl || ''}
                        onChange={(e) => setEditingProduct({ ...editingProduct, imageUrl: e.target.value })}
                        placeholder="O pega una URL de imagen (https://...)"
                        className="w-full p-2 rounded-xl bg-[#FAF9F6] border border-[#D2CBBF] text-[#161514] text-[11px] placeholder:text-[#8E887E] focus:outline-none focus:border-[#9A6B3B]"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  {/* NOMBRE */}
                  <div>
                    <label className="text-[#5C5852] font-semibold block mb-1">
                      NOMBRE DEL PRODUCTO *
                    </label>
                    <input
                      type="text"
                      value={editingProduct.name || ''}
                      onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                      placeholder="Ej. Cera Pomade Mate Masaryk 120ml"
                      className="w-full p-2.5 rounded-xl bg-white border border-[#D2CBBF] text-[#161514] placeholder:text-[#8E887E] focus:outline-none focus:border-[#9A6B3B]"
                    />
                  </div>

                  {/* CATEGORÍA */}
                  <div>
                    <label className="text-[#5C5852] font-semibold block mb-1">
                      CATEGORÍA (OPCIONAL)
                    </label>
                    <select
                      value={editingProduct.category || ''}
                      onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-white border border-[#D2CBBF] text-[#161514] focus:outline-none focus:border-[#9A6B3B]"
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
                    <label className="text-[#5C5852] font-semibold block mb-1">
                      DESCRIPCIÓN
                    </label>
                    <textarea
                      value={editingProduct.description || ''}
                      onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                      rows={2}
                      placeholder="Ej. Fijación media con brillo mate natural y aroma sutil amaderado."
                      className="w-full p-2.5 rounded-xl bg-white border border-[#D2CBBF] text-[#161514] placeholder:text-[#8E887E] focus:outline-none focus:border-[#9A6B3B]"
                    />
                  </div>

                  {/* PRECIO */}
                  <div>
                    <label className="text-[#5C5852] font-semibold block mb-1">
                      PRECIO DE VENTA ($ MXN) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9A6B3B] font-bold text-sm">
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
                        className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-white border border-[#D2CBBF] text-[#161514] font-mono font-bold text-sm focus:outline-none focus:border-[#9A6B3B]"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-[#E6E1D6]">
                  <button
                    onClick={() => setEditingProduct(null)}
                    className="flex-1 py-2.5 rounded-xl bg-[#F2EFE9] hover:bg-[#E8E3D9] border border-[#D2CBBF] text-[#161514] text-xs font-semibold transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveProductSubmit}
                    disabled={isSavingProduct || isUploadingProductPhoto}
                    className="flex-1 py-2.5 rounded-xl bg-[#161514] hover:bg-[#2A2826] text-[#FAF9F6] text-xs font-bold shadow-sm active:scale-95 transition-all disabled:opacity-50"
                  >
                    {isSavingProduct ? 'Guardando...' : 'Guardar Producto'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 2: POS SALES HISTORY */}
      {subTab === 'sales' && (
        <div className="space-y-4">
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-2xl bg-white border border-[#E6E1D6] p-4 shadow-sm">
              <p className="text-[11px] font-bold text-[#767067] uppercase tracking-wider">Total Recaudado POS</p>
              <p className="font-mono text-xl font-extrabold text-[#9A6B3B] mt-1 tabular-nums">{formatCurrency(totalSalesRevenue)}</p>
              <p className="text-[11px] text-[#5C5852] mt-0.5">{posSales.length} transacciones registradas</p>
            </div>
            <div className="rounded-2xl bg-white border border-[#E6E1D6] p-4 shadow-sm">
              <p className="text-[11px] font-bold text-[#767067] uppercase tracking-wider">Puntos Otorgados a Clientes</p>
              <p className="font-mono text-xl font-extrabold text-emerald-700 mt-1 tabular-nums">+{totalPointsAwarded} pts</p>
              <p className="text-[11px] text-[#5C5852] mt-0.5">Fidelización por ventas de productos</p>
            </div>
            <div className="rounded-2xl bg-white border border-[#E6E1D6] p-4 shadow-sm">
              <p className="text-[11px] font-bold text-[#767067] uppercase tracking-wider">Productos en Catálogo</p>
              <p className="font-mono text-xl font-extrabold text-[#161514] mt-1 tabular-nums">{products.length}</p>
              <p className="text-[11px] text-[#5C5852] mt-0.5">{products.filter((p) => p.active).length} activos a la venta</p>
            </div>
          </div>

          {/* Sales List */}
          {posSales.length === 0 ? (
            <div className="rounded-3xl bg-white border border-[#E6E1D6] p-8 text-center text-[#5C5852] space-y-2 shadow-sm">
              <ShoppingBag className="w-10 h-10 mx-auto text-[#8E887E] mb-2" />
              <p className="font-semibold text-[#161514] text-sm">No hay ventas registradas aún</p>
              <p className="text-xs text-[#767067]">
                Cuando los barberos procesen ventas desde su POS, aparecerán listadas aquí con el detalle de artículos y puntos otorgados.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {posSales.map((sale) => (
                <div
                  key={sale.id}
                  className="rounded-2xl bg-white border border-[#E6E1D6] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-[#161514] text-sm">{sale.customerName}</span>
                      {sale.customerClientNumber && (
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#FBF6EE] border border-[#9A6B3B]/30 text-[#7D542B]">
                          #{sale.customerClientNumber}
                        </span>
                      )}
                      <span className="text-[11px] text-[#5C5852]">
                        • Barbero: <strong className="text-[#161514]">{sale.barberName}</strong>
                      </span>
                    </div>

                    <p className="text-xs text-[#5C5852]">
                      {(sale.items || []).map((it) => `${it.quantity}x ${it.productName} (${formatCurrency(it.subtotal)})`).join(' • ')}
                    </p>

                    <div className="flex items-center gap-3 text-[11px] text-[#767067]">
                      <span>{formatDateSpanish(sale.createdAt)}</span>
                      <span>•</span>
                      <span>Método: {sale.paymentMethod === 'cash' ? 'Efectivo' : sale.paymentMethod === 'card' ? 'Tarjeta' : 'Transferencia'}</span>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-[#E6E1D6] shrink-0">
                    <span className="font-mono font-black text-[#161514] text-base tabular-nums">{formatCurrency(sale.total)}</span>
                    {sale.pointsAwarded > 0 && (
                      <span className="text-[11px] font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full mt-0.5">
                        +{sale.pointsAwarded} pts ({sale.pointsPercentageUsed}%)
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 3: COMPLETE POINTS REWARD CONFIGURATION (VISITS / QR, SERVICES, PRODUCTS) */}
      {subTab === 'points_config' && (
        <div className="rounded-3xl bg-white border border-[#E6E1D6] p-6 space-y-6 shadow-sm animate-in fade-in">
          <div className="flex items-center gap-3 pb-4 border-b border-[#E6E1D6]">
            <div className="w-12 h-12 rounded-2xl bg-[#161514] border border-[#161514] flex items-center justify-center text-[#C69765] shrink-0">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-display text-lg font-bold text-[#161514] uppercase tracking-wide">Programa Global de Puntos y Fidelización</h4>
              <p className="text-xs text-[#5C5852]">
                Gestiona cuántos puntos recibe el cliente por escanear su QR/visitas, cobrar servicios y comprar productos
              </p>
            </div>
          </div>

          <div className="space-y-4 max-w-2xl">
            {/* 1. PUNTOS POR VISITA / ESCANEO DE QR */}
            <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#E6E1D6] space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-sm font-bold text-[#161514] flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-[#9A6B3B]" />
                    <span>Puntos por Visita / Escaneo de Código QR</span>
                  </span>
                  <p className="text-xs text-[#5C5852]">
                    Cantidad fija de puntos que se abonan automáticamente a la cuenta del cliente cada vez que se escanea su código QR o se registra una visita (establece 0 si no deseas otorgar puntos solo por escanear).
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <div className="relative w-36">
                  <input
                    type="number"
                    min="0"
                    step="5"
                    value={pointsPerVisit}
                    onChange={(e) => setPointsPerVisit(parseInt(e.target.value, 10) || 0)}
                    className="w-full pl-3 pr-8 py-2.5 rounded-xl bg-white border border-[#D2CBBF] text-[#161514] font-mono font-bold text-base focus:outline-none focus:border-[#9A6B3B]"
                  />
                  <span className="text-xs font-bold text-[#9A6B3B] absolute right-3 top-1/2 -translate-y-1/2">
                    pts
                  </span>
                </div>
                <span className="text-xs text-[#5C5852]">
                  Puntos por escaneo de QR: <strong className="text-[#161514] font-mono">+{pointsPerVisit} pts por visita</strong>
                </span>
              </div>
            </div>

            {/* 2. PUNTOS POR SERVICIO COBRADO EN SILLA */}
            <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#E6E1D6] space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-sm font-bold text-[#161514] flex items-center gap-2">
                    <Scissors className="w-4 h-4 text-sky-700" />
                    <span>Puntos por Servicio / Corte Cobrado</span>
                  </span>
                  <p className="text-xs text-[#5C5852]">
                    Puntos automáticos que el cliente acumula cuando el barbero cobra un servicio o corte de cabello en silla.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <div className="relative w-36">
                  <input
                    type="number"
                    min="0"
                    step="5"
                    value={servicePointsReward}
                    onChange={(e) => setServicePointsReward(parseInt(e.target.value, 10) || 0)}
                    className="w-full pl-3 pr-8 py-2.5 rounded-xl bg-white border border-[#D2CBBF] text-[#161514] font-mono font-bold text-base focus:outline-none focus:border-[#9A6B3B]"
                  />
                  <span className="text-xs font-bold text-[#9A6B3B] absolute right-3 top-1/2 -translate-y-1/2">
                    pts
                  </span>
                </div>
                <span className="text-xs text-[#5C5852]">
                  Predeterminado: <strong className="text-[#161514] font-mono">50 pts</strong> por servicio cobrado
                </span>
              </div>
            </div>

            {/* 3. PUNTOS POR COMPRA DE PRODUCTOS */}
            <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#E6E1D6] space-y-3">
              <div className="flex items-center justify-between gap-3 pb-2 border-b border-[#E6E1D6]">
                <div className="space-y-0.5">
                  <span className="text-sm font-bold text-[#161514] flex items-center gap-2">
                    <Package className="w-4 h-4 text-[#9A6B3B]" />
                    <span>Puntos por Venta de Productos POS</span>
                  </span>
                  <span className="text-xs text-[#5C5852]">
                    {pointsEnabled
                      ? 'Los clientes acumulan un porcentaje de puntos sobre el valor de los productos comprados.'
                      : 'Las ventas de productos no generarán puntos de fidelización.'}
                  </span>
                </div>
                <button
                  onClick={() => setPointsEnabled(!pointsEnabled)}
                  className="p-1 rounded-xl transition-all shrink-0 ml-3"
                >
                  {pointsEnabled ? (
                    <ToggleRight className="w-9 h-9 text-[#9A6B3B]" />
                  ) : (
                    <ToggleLeft className="w-9 h-9 text-[#8E887E]" />
                  )}
                </button>
              </div>

              {pointsEnabled && (
                <div className="space-y-2 pt-1">
                  <label className="text-xs font-semibold text-[#5C5852] block">
                    Porcentaje de Puntos sobre el Valor del Producto (%)
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="relative w-36">
                      <input
                        type="number"
                        min="0.1"
                        max="100"
                        step="0.5"
                        value={pointsPercentage}
                        onChange={(e) => setPointsPercentage(parseFloat(e.target.value) || 1)}
                        className="w-full pl-3 pr-8 py-2.5 rounded-xl bg-white border border-[#D2CBBF] text-[#161514] font-mono font-bold text-base focus:outline-none focus:border-[#9A6B3B]"
                      />
                      <Percent className="w-4 h-4 text-[#9A6B3B] absolute right-3 top-1/2 -translate-y-1/2" />
                    </div>
                    <span className="text-xs text-[#5C5852]">
                      Ejemplo: Un producto de $300 otorga <strong className="text-[#161514] font-mono">{Math.floor((300 * pointsPercentage) / 100)} pts</strong>
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* LIVE SIMULATION CARD */}
            <div className="p-4 rounded-2xl bg-[#FBF6EE] border border-[#9A6B3B]/30 flex items-start gap-3 text-xs text-[#5C5852]">
              <Sparkles className="w-5 h-5 text-[#9A6B3B] shrink-0 mt-0.5" />
              <div>
                <strong className="text-[#161514] block font-bold mb-0.5">Simulación en Vivo de una Atención Completa:</strong>
                <span>
                  Si un cliente asiste a su corte de <strong className="text-[#161514] font-mono">$350 MXN</strong> y compra un producto de <strong className="text-[#161514] font-mono">$250 MXN</strong>:
                </span>
                <div className="mt-2 space-y-0.5 font-mono text-[11px] text-[#5C5852]">
                  {pointsPerVisit > 0 && <div>• Escaneo de QR / Visita: +{pointsPerVisit} pts</div>}
                  <div>• Servicio en Silla: +{servicePointsReward} pts</div>
                  <div>• Compra de Producto: +{pointsEnabled ? Math.floor((250 * pointsPercentage) / 100) : 0} pts</div>
                  <div className="text-[#9A6B3B] font-bold pt-1">
                    = Total a Recibir: +{pointsPerVisit + servicePointsReward + (pointsEnabled ? Math.floor((250 * pointsPercentage) / 100) : 0)} puntos de fidelización VIP
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={handleSavePointsSettings}
              disabled={isSavingPoints}
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-[#161514] hover:bg-[#2A2826] text-[#FAF9F6] font-bold text-xs shadow-sm active:scale-95 transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4 text-[#C69765]" />
              <span>{isSavingPoints ? 'Guardando configuración...' : 'Guardar Parámetros de Puntos'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
