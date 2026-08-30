import React, { useState } from 'react';
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
} from 'lucide-react';
import { useBarbershop } from '../../contexts/BarbershopContext';
import { Product, PosSale } from '../../types';
import { formatCurrency, formatDateSpanish, formatTime12h } from '../../utils/dateTime';

export const AdminProductsSection: React.FC = () => {
  const {
    products,
    posSales,
    businessSettings,
    saveProduct,
    deleteProduct,
    toggleProductActive,
    updateProductPointsSettings,
    showToast,
  } = useBarbershop();

  // Sub-tab: products or posSales
  const [subTab, setSubTab] = useState<'inventory' | 'sales' | 'points_config'>('inventory');

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Product modal
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [isSavingProduct, setIsSavingProduct] = useState(false);

  // Points settings state
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
      } catch (err: any) {
        showToast('error', 'Error al eliminar', err.message);
      }
    }
  };

  const handleSavePointsSettings = async () => {
    setIsSavingPoints(true);
    try {
      await updateProductPointsSettings(pointsEnabled, Number(pointsPercentage) || 1);
    } catch (err: any) {
      showToast('error', 'Error', err.message);
    } finally {
      setIsSavingPoints(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Sub-tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-gradient-to-r from-[#181D26] to-[#12151B] border border-white/10 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">Inventario de Productos & POS</h3>
            <p className="text-xs text-slate-400">
              Catálogo unificado para barberos, control de stock y sistema de puntos por compras
            </p>
          </div>
        </div>

        {/* Sub-nav buttons */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-black/40 border border-white/10">
          <button
            onClick={() => setSubTab('inventory')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              subTab === 'inventory' ? 'bg-[#D4AF37] text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Productos ({products.length})
          </button>
          <button
            onClick={() => setSubTab('sales')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              subTab === 'sales' ? 'bg-[#D4AF37] text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Ventas POS ({posSales.length})
          </button>
          <button
            onClick={() => setSubTab('points_config')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              subTab === 'points_config' ? 'bg-[#D4AF37] text-slate-950 shadow' : 'text-slate-400 hover:text-white'
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
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar producto por nombre o descripción..."
                className="w-full pl-9 pr-4 py-2 rounded-2xl bg-[#14171E] border border-white/10 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            {/* Add product button */}
            <button
              onClick={() =>
                setEditingProduct({
                  name: '',
                  description: '',
                  price: 150,
                  active: true,
                  createdByType: 'admin',
                })
              }
              className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-2xl bg-[#D4AF37] text-slate-950 text-xs font-bold shadow-lg hover:bg-[#E5B869] transition-all shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Producto</span>
            </button>
          </div>

          {/* Product Cards List */}
          {filteredProducts.length === 0 ? (
            <div className="rounded-3xl bg-[#14171E] border border-white/10 p-8 text-center text-slate-400 space-y-2">
              <Package className="w-10 h-10 mx-auto text-slate-600 mb-2" />
              <p className="font-semibold text-white text-sm">No hay productos en el inventario</p>
              <p className="text-xs text-slate-500">
                Registra productos para que los barberos puedan venderlos a través de su punto de venta POS.
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
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                      {prod.createdByType === 'barber' ? (
                        <span className="px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-300 font-semibold border border-blue-500/20">
                          Barbero: {prod.createdByBarberName || 'Equipo'}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 font-semibold border border-amber-500/20">
                          Administración
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Active toggle */}
                      <button
                        onClick={() => toggleProductActive(prod.id, !prod.active)}
                        className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition-all"
                        title={prod.active ? 'Desactivar producto' : 'Activar producto'}
                      >
                        {prod.active ? (
                          <ToggleRight className="w-5 h-5 text-emerald-400" />
                        ) : (
                          <ToggleLeft className="w-5 h-5 text-slate-500" />
                        )}
                      </button>

                      {/* Edit product */}
                      <button
                        onClick={() => setEditingProduct(prod)}
                        className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all"
                        title="Editar producto"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      {/* Delete product (Admin only) */}
                      <button
                        onClick={() => handleDeleteProductSubmit(prod.id, prod.name)}
                        className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 transition-all"
                        title="Eliminar producto del catálogo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Modal: Crear / Editar Producto (Solo NOMBRE, DESCRIPCIÓN, PRECIO) */}
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
                        Catálogo general para todos los barberos
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
                      placeholder="Ej. Cera Fijadora Pomade Classic Monarca"
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
                      placeholder="Ej. Fijación media con brillo natural y aroma a madera noble. 100g."
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
                    onClick={handleSaveProductSubmit}
                    disabled={isSavingProduct}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#996515] via-[#D4AF37] to-[#F3E5AB] text-slate-950 text-xs font-bold shadow-md hover:scale-[1.02] active:scale-95 transition-all"
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
            <div className="rounded-2xl bg-[#14171E] border border-white/10 p-4">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Recaudado POS</p>
              <p className="text-xl font-extrabold text-[#D4AF37] mt-1">{formatCurrency(totalSalesRevenue)}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">{posSales.length} transacciones registradas</p>
            </div>
            <div className="rounded-2xl bg-[#14171E] border border-white/10 p-4">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Puntos Otorgados a Clientes</p>
              <p className="text-xl font-extrabold text-amber-300 mt-1">+{totalPointsAwarded} pts</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Fidelización por ventas de productos</p>
            </div>
            <div className="rounded-2xl bg-[#14171E] border border-white/10 p-4">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Productos en Catálogo</p>
              <p className="text-xl font-extrabold text-white mt-1">{products.length}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">{products.filter((p) => p.active).length} activos a la venta</p>
            </div>
          </div>

          {/* Sales List */}
          {posSales.length === 0 ? (
            <div className="rounded-3xl bg-[#14171E] border border-white/10 p-8 text-center text-slate-400 space-y-2">
              <ShoppingBag className="w-10 h-10 mx-auto text-slate-600 mb-2" />
              <p className="font-semibold text-white text-sm">No hay ventas registradas aún</p>
              <p className="text-xs text-slate-500">
                Cuando los barberos procesen ventas desde su POS, aparecerán listadas aquí con el detalle de artículos y puntos otorgados.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {posSales.map((sale) => (
                <div
                  key={sale.id}
                  className="rounded-2xl bg-[#14171E] border border-white/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{sale.customerName}</span>
                      {sale.customerClientNumber && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#D4AF37]/20 text-[#D4AF37]">
                          #{sale.customerClientNumber}
                        </span>
                      )}
                      <span className="text-[11px] text-slate-400">
                        • Barbero: <strong className="text-slate-300">{sale.barberName}</strong>
                      </span>
                    </div>

                    <p className="text-xs text-slate-300">
                      {(sale.items || []).map((it) => `${it.quantity}x ${it.productName} (${formatCurrency(it.subtotal)})`).join(' • ')}
                    </p>

                    <div className="flex items-center gap-3 text-[11px] text-slate-500">
                      <span>{formatDateSpanish(sale.createdAt)}</span>
                      <span>•</span>
                      <span>Método: {sale.paymentMethod === 'cash' ? 'Efectivo' : sale.paymentMethod === 'card' ? 'Tarjeta' : 'Transferencia'}</span>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-white/5 shrink-0">
                    <span className="font-black text-[#D4AF37] text-base">{formatCurrency(sale.total)}</span>
                    {sale.pointsAwarded > 0 && (
                      <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full mt-0.5">
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

      {/* SUBTAB 3: POINTS REWARD CONFIGURATION */}
      {subTab === 'points_config' && (
        <div className="rounded-3xl bg-[#14171E] border border-white/10 p-6 space-y-6 shadow-2xl">
          <div className="flex items-center gap-3 pb-4 border-b border-white/10">
            <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37]">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-white">Programa de Lealtad en Venta de Productos</h4>
              <p className="text-xs text-slate-400">
                Otorga puntos automáticos a clientes registrados cuando compran productos a los barberos
              </p>
            </div>
          </div>

          <div className="space-y-4 max-w-xl">
            {/* Toggle Habilitar / Deshabilitar */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-900 border border-white/10">
              <div className="space-y-0.5">
                <span className="text-sm font-bold text-white block">
                  Otorgar Puntos de Lealtad por Productos
                </span>
                <span className="text-xs text-slate-400">
                  {pointsEnabled
                    ? 'Los clientes acumulan puntos al comprar productos en el POS del barbero.'
                    : 'Las ventas de productos no generarán puntos de lealtad.'}
                </span>
              </div>
              <button
                onClick={() => setPointsEnabled(!pointsEnabled)}
                className="p-1 rounded-xl transition-all shrink-0 ml-3"
              >
                {pointsEnabled ? (
                  <ToggleRight className="w-9 h-9 text-[#D4AF37]" />
                ) : (
                  <ToggleLeft className="w-9 h-9 text-slate-600" />
                )}
              </button>
            </div>

            {/* Percentage setting */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-white/10 space-y-3">
              <div>
                <label className="text-sm font-bold text-white block mb-1">
                  Porcentaje de Puntos sobre el Valor del Producto (%)
                </label>
                <p className="text-xs text-slate-400 mb-3">
                  Porcentaje del valor total del producto vendido que se convierte en puntos para el cliente (por ejemplo, el 1% de un producto de $300 otorga 3 puntos).
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative w-36">
                  <input
                    type="number"
                    min="0.1"
                    max="100"
                    step="0.5"
                    value={pointsPercentage}
                    onChange={(e) => setPointsPercentage(parseFloat(e.target.value) || 1)}
                    disabled={!pointsEnabled}
                    className="w-full pl-3 pr-8 py-2.5 rounded-xl bg-[#14171E] border border-white/15 text-white font-bold text-base focus:outline-none focus:border-[#D4AF37] disabled:opacity-50"
                  />
                  <Percent className="w-4 h-4 text-[#D4AF37] absolute right-3 top-1/2 -translate-y-1/2" />
                </div>
                <span className="text-xs text-slate-400">
                  Valor predeterminado: <strong>1%</strong>
                </span>
              </div>
            </div>

            {/* Example calculation card */}
            <div className="p-4 rounded-2xl bg-[#1E232F]/50 border border-[#D4AF37]/20 flex items-start gap-3 text-xs text-slate-300">
              <Info className="w-5 h-5 text-[#D4AF37] shrink-0 mt-0.5" />
              <div>
                <strong className="text-white block font-bold mb-0.5">Ejemplo en Vivo:</strong>
                <span>
                  Si un cliente compra una cera de <strong>$250 MXN</strong> y un shampoo de <strong>$350 MXN</strong> (Total $600 MXN), recibirá{' '}
                  <strong className="text-[#D4AF37]">
                    +{pointsEnabled ? Math.floor((600 * pointsPercentage) / 100) : 0} puntos
                  </strong>{' '}
                  en su cuenta Monarca Barber.
                </span>
              </div>
            </div>

            <button
              onClick={handleSavePointsSettings}
              disabled={isSavingPoints}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-[#996515] via-[#D4AF37] to-[#F3E5AB] text-slate-950 font-bold text-xs shadow-lg hover:scale-[1.02] active:scale-95 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>{isSavingPoints ? 'Guardando...' : 'Guardar Configuración de Puntos'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
