import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  User,
  Users,
  Search,
  CheckCircle2,
  DollarSign,
  Award,
  Sparkles,
  CreditCard,
  Banknote,
  Receipt,
  X,
  Clock,
  ArrowRight,
  Package,
  Check,
} from 'lucide-react';
import { useBarbershop } from '../../contexts/BarbershopContext';
import { useAuth } from '../../contexts/AuthContext';
import { Product, PosSale, PosSaleItem, UserProfile } from '../../types';
import { formatCurrency, formatDateSpanish, formatTime12h } from '../../utils/dateTime';
import { dataService } from '../../services/firebase/dataService';

interface BarberPosViewProps {
  onOpenNewProductModal?: () => void;
  initialCustomer?: UserProfile | null;
  onClearInitialCustomer?: () => void;
}

export const BarberPosView: React.FC<BarberPosViewProps> = ({
  onOpenNewProductModal,
  initialCustomer,
  onClearInitialCustomer,
}) => {
  const {
    products,
    posSales,
    barbers,
    businessSettings,
    recordPosSale,
    showToast,
  } = useBarbershop();
  const { currentBarberId, userProfile } = useAuth();

  // Find active barber
  const activeBarber =
    barbers.find(
      (b) =>
        b.id === currentBarberId ||
        b.userId === userProfile?.id ||
        b.displayName.toLowerCase() === userProfile?.name?.toLowerCase()
    ) || barbers[0];

  // Active subtab: 'pos' or 'history'
  const [activeTab, setActiveTab] = useState<'pos' | 'history'>('pos');

  // Search product
  const [productSearch, setProductSearch] = useState('');

  // Cart state: Map of productId -> quantity
  const [cart, setCart] = useState<Record<string, number>>({});

  // Customer selection mode: 'general' (público general) or 'specific' (cliente registrado)
  const [customerMode, setCustomerMode] = useState<'general' | 'specific'>('general');
  const [customerSearch, setCustomerSearch] = useState('');
  const [allCustomers, setAllCustomers] = useState<UserProfile[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<UserProfile | null>(null);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);

  // Set initial customer if passed from scanner
  useEffect(() => {
    if (initialCustomer) {
      setSelectedCustomer(initialCustomer);
      setCustomerMode('specific');
    }
  }, [initialCustomer]);

  // Payment method & notes
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer'>('cash');
  const [saleNotes, setSaleNotes] = useState('');
  const [isProcessingSale, setIsProcessingSale] = useState(false);

  // Completed sale receipt modal
  const [completedSale, setCompletedSale] = useState<PosSale | null>(null);

  // Subscribe to registered users for customer search
  useEffect(() => {
    const unsub = dataService.subscribeToUsers((users) => {
      // Filter clients
      const clientsOnly = users.filter((u) => u.role === 'client' || !u.role);
      setAllCustomers(clientsOnly);
    });
    return () => unsub();
  }, []);

  // Category filter
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Helper to retrieve high-res barbershop product images with smart contextual fallbacks
  const getProductImage = (prod: Product) => {
    if (prod.imageUrl) return prod.imageUrl;
    const name = prod.name.toLowerCase();
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

  // Filtered products (only active)
  const activeProducts = products.filter((p) => p.active !== false);

  // Available categories
  const categories = ['all', ...Array.from(new Set(activeProducts.map((p) => p.category).filter(Boolean))) as string[]];

  const filteredProducts = activeProducts.filter((p) => {
    const matchesCat = selectedCategory === 'all' || p.category === selectedCategory;
    const q = productSearch.toLowerCase();
    const matchesSearch = p.name.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q));
    return matchesCat && matchesSearch;
  });

  // Filtered customer list for selection
  const filteredCustomers = allCustomers.filter((c) => {
    if (!customerSearch) return true;
    const q = customerSearch.toLowerCase();
    const nameMatch = c.name?.toLowerCase().includes(q);
    const phoneMatch = c.phone?.toLowerCase().includes(q);
    const numberMatch = c.clientNumber?.toLowerCase().includes(q);
    return nameMatch || phoneMatch || numberMatch;
  });

  // Cart operations
  const addToCart = (productId: string) => {
    setCart((prev) => ({
      ...prev,
      [productId]: (prev[productId] || 0) + 1,
    }));
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => {
      const next = { ...prev };
      if (next[productId] > 1) {
        next[productId] -= 1;
      } else {
        delete next[productId];
      }
      return next;
    });
  };

  const deleteItemFromCart = (productId: string) => {
    setCart((prev) => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
  };

  const clearCart = () => {
    setCart({});
  };

  // Calculations
  const cartItems: PosSaleItem[] = Object.entries(cart)
    .map(([prodId, qty]) => {
      const product = products.find((p) => p.id === prodId);
      if (!product) return null;
      return {
        productId: product.id,
        productName: product.name,
        price: product.price,
        quantity: Number(qty),
        subtotal: product.price * Number(qty),
      };
    })
    .filter(Boolean) as PosSaleItem[];

  const totalCartAmount = cartItems.reduce((sum, item) => sum + item.subtotal, 0);

  // Loyalty points calculation: 1% (or configured percentage) of total product value
  const pointsEnabled =
    businessSettings.enableProductPointsReward !== undefined ? businessSettings.enableProductPointsReward : true;
  const pointsPercentage =
    businessSettings.productPointsPercentage !== undefined ? businessSettings.productPointsPercentage : 1;

  const pointsToAward =
    customerMode === 'specific' && selectedCustomer && pointsEnabled
      ? Math.floor((totalCartAmount * pointsPercentage) / 100)
      : 0;

  // Process POS Sale
  const handleCompleteSale = async () => {
    if (cartItems.length === 0) {
      showToast('error', 'Carrito vacío', 'Agrega al menos un producto para registrar la venta.');
      return;
    }

    if (customerMode === 'specific' && !selectedCustomer) {
      showToast('error', 'Cliente no seleccionado', 'Selecciona el cliente registrado o cambia a "Público en General".');
      return;
    }

    setIsProcessingSale(true);
    try {
      const saleRecord = await recordPosSale({
        barberId: activeBarber?.id || 'barber_default',
        barberName: activeBarber?.displayName || userProfile?.name || 'Barbero Monarca',
        customerId: customerMode === 'specific' && selectedCustomer ? selectedCustomer.id : undefined,
        customerName:
          customerMode === 'specific' && selectedCustomer
            ? selectedCustomer.name
            : 'Público en General',
        customerClientNumber:
          customerMode === 'specific' && selectedCustomer
            ? selectedCustomer.clientNumber
            : undefined,
        customerPhone:
          customerMode === 'specific' && selectedCustomer
            ? selectedCustomer.phone
            : undefined,
        items: cartItems,
        total: totalCartAmount,
        pointsAwarded: pointsToAward,
        pointsPercentageUsed: pointsPercentage,
        paymentMethod,
        notes: saleNotes,
      });

      setCompletedSale(saleRecord);
      clearCart();
      setCustomerMode('general');
      setSelectedCustomer(null);
      setSaleNotes('');
    } catch (err: any) {
      showToast('error', 'Error al procesar venta', err.message);
    } finally {
      setIsProcessingSale(false);
    }
  };

  // Filter sales for this barber
  const myPosSales = posSales.filter((s) => s.barberId === activeBarber?.id);
  const myTotalRevenue = myPosSales.reduce((sum, s) => sum + (s.total || 0), 0);

  return (
    <div className="space-y-5">
      {/* Header with Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-gradient-to-r from-[#181D26] to-[#12151B] border border-white/10 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#996515] flex items-center justify-center text-slate-950 font-black shadow-lg">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-white tracking-tight">Punto de Venta POS</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30">
                {activeBarber?.displayName}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Vende productos a público general o a clientes con asignación de puntos ({pointsPercentage}%)
            </p>
          </div>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-black/40 border border-white/10 shrink-0">
          <button
            onClick={() => setActiveTab('pos')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'pos' ? 'bg-[#D4AF37] text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Terminal POS
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'history' ? 'bg-[#D4AF37] text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Mis Ventas ({myPosSales.length})
          </button>
        </div>
      </div>

      {/* POS TERMINAL TAB */}
      {activeTab === 'pos' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* LEFT COLUMN: PRODUCTS CATALOG SELECTION (7 COLS) */}
          <div className="lg:col-span-7 space-y-3">
            {/* Search & Category Pills */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Buscar producto por nombre..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-[#14171E] border border-white/10 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              {/* Category pills for fast mobile filtering */}
              {categories.length > 2 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1 rounded-xl font-bold whitespace-nowrap transition-all text-[11px] ${
                        selectedCategory === cat
                          ? 'bg-[#D4AF37] text-slate-950 shadow'
                          : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {cat === 'all' ? 'Todos' : cat}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Products Grid (2 COLUMNS COMPACT FOR MOBILE) */}
            {filteredProducts.length === 0 ? (
              <div className="rounded-3xl bg-[#14171E] border border-white/10 p-8 text-center text-slate-400 space-y-3">
                <Package className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                <p className="font-semibold text-white text-sm">No hay productos disponibles</p>
                <p className="text-xs text-slate-500">
                  Agrega productos al catálogo general para comenzar a vender en tu POS.
                </p>
                {onOpenNewProductModal && (
                  <button
                    onClick={onOpenNewProductModal}
                    className="px-4 py-2 rounded-2xl bg-[#D4AF37] text-slate-950 font-bold text-xs shadow hover:bg-[#E5B869] transition-all"
                  >
                    Registrar Producto
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:gap-3 max-h-[580px] overflow-y-auto pr-1">
                {filteredProducts.map((prod) => {
                  const inCartQty = cart[prod.id] || 0;
                  const imgUrl = getProductImage(prod);
                  return (
                    <div
                      key={prod.id}
                      onClick={() => addToCart(prod.id)}
                      className={`group cursor-pointer rounded-2xl bg-[#14171E] border ${
                        inCartQty > 0 ? 'border-[#D4AF37] ring-1 ring-[#D4AF37]/50 bg-[#161B24]' : 'border-white/10'
                      } p-2 sm:p-2.5 flex flex-col justify-between gap-2 shadow-md hover:border-[#D4AF37] hover:scale-[1.01] active:scale-[0.97] transition-all relative overflow-hidden`}
                    >
                      {/* Product Image Box */}
                      <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-slate-900 border border-white/5">
                        <img
                          src={imgUrl}
                          alt={prod.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          referrerPolicy="no-referrer"
                        />
                        {/* Cart Badge */}
                        {inCartQty > 0 && (
                          <div className="absolute top-1.5 right-1.5 px-2 py-0.5 rounded-full bg-[#D4AF37] text-slate-950 font-black text-[10px] sm:text-xs flex items-center justify-center shadow-lg border border-white/20">
                            {inCartQty} en orden
                          </div>
                        )}
                        {/* Category tag */}
                        {prod.category && (
                          <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-[9px] font-semibold text-slate-300">
                            {prod.category}
                          </div>
                        )}
                      </div>

                      {/* Product Title & Info */}
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <h4 className="font-bold text-white text-xs line-clamp-2 leading-tight group-hover:text-[#D4AF37] transition-colors">
                          {prod.name}
                        </h4>
                        <p className="text-[10px] text-slate-400 line-clamp-1">
                          {prod.description || 'Monarca Barber'}
                        </p>
                      </div>

                      {/* Price and Add Action */}
                      <div className="flex items-center justify-between pt-1.5 border-t border-white/5 mt-auto">
                        <span className="font-black text-[#D4AF37] text-xs sm:text-sm">
                          {formatCurrency(prod.price)}
                        </span>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            addToCart(prod.id);
                          }}
                          className="p-1.5 rounded-xl bg-white/5 group-hover:bg-[#D4AF37] group-hover:text-slate-950 text-slate-200 text-xs font-bold transition-all flex items-center justify-center"
                          title="Añadir a la orden"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: POS CART & CLIENT SELECTION (5 COLS) */}
          <div className="lg:col-span-5 rounded-3xl bg-[#14171E] border border-white/10 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-[#D4AF37]" />
                <h4 className="font-bold text-white text-sm">Orden de Venta POS</h4>
              </div>
              {cartItems.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold"
                >
                  Vaciar
                </button>
              )}
            </div>

            {/* 1. SELECCIÓN DE CLIENTE / PÚBLICO GENERAL */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Destinatario de la Venta
              </label>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCustomerMode('general');
                    setSelectedCustomer(null);
                  }}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    customerMode === 'general'
                      ? 'bg-gradient-to-r from-[#996515] via-[#D4AF37] to-[#F3E5AB] text-slate-950 border-transparent shadow'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Público General</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCustomerMode('specific')}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    customerMode === 'specific'
                      ? 'bg-gradient-to-r from-[#996515] via-[#D4AF37] to-[#F3E5AB] text-slate-950 border-transparent shadow'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Cliente Específico</span>
                </button>
              </div>

              {/* Specific Customer Selection Input */}
              {customerMode === 'specific' && (
                <div className="space-y-2 pt-1 animate-in fade-in">
                  {selectedCustomer ? (
                    <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-[#D4AF37] text-slate-950 font-bold flex items-center justify-center text-xs">
                          {selectedCustomer.name.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-white text-xs">{selectedCustomer.name}</span>
                            {selectedCustomer.clientNumber && (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-[#D4AF37]">
                                #{selectedCustomer.clientNumber}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400">
                            Puntos actuales: <strong className="text-[#D4AF37]">{selectedCustomer.points || 0} pts</strong> • {selectedCustomer.phone || 'Sin tel'}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => setSelectedCustomer(null)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-400 transition-all"
                        title="Cambiar cliente"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={customerSearch}
                          onChange={(e) => setCustomerSearch(e.target.value)}
                          placeholder="Buscar por nombre, teléfono o #cliente..."
                          className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-[#D4AF37]"
                        />
                      </div>

                      {/* Dropdown list of customers */}
                      <div className="max-h-36 overflow-y-auto space-y-1 rounded-xl bg-slate-950 p-1 border border-white/10">
                        {filteredCustomers.length === 0 ? (
                          <p className="text-[11px] text-slate-500 p-2 text-center">
                            No se encontraron clientes
                          </p>
                        ) : (
                          filteredCustomers.slice(0, 15).map((cust) => (
                            <button
                              key={cust.id}
                              type="button"
                              onClick={() => setSelectedCustomer(cust)}
                              className="w-full text-left p-2 rounded-lg hover:bg-white/10 flex items-center justify-between text-xs transition-all"
                            >
                              <div>
                                <span className="font-semibold text-white block">{cust.name}</span>
                                <span className="text-[10px] text-slate-400">
                                  #{cust.clientNumber || 'MB'} • {cust.phone || 'Sin tel'}
                                </span>
                              </div>
                              <span className="text-[10px] font-bold text-[#D4AF37]">
                                {cust.points || 0} pts
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 2. CART ITEMS LIST */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Artículos en Carrito ({cartItems.length})
              </label>

              {cartItems.length === 0 ? (
                <div className="p-6 rounded-2xl bg-black/20 border border-dashed border-white/10 text-center text-slate-500 text-xs">
                  Toca cualquier producto a la izquierda para agregarlo a la venta.
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {cartItems.map((item) => (
                    <div
                      key={item.productId}
                      className="p-2.5 rounded-xl bg-slate-900/80 border border-white/5 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-white text-xs truncate">{item.productName}</p>
                        <p className="text-[11px] text-slate-400">
                          {formatCurrency(item.price)} c/u
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center gap-1 bg-black/40 rounded-lg p-0.5 border border-white/10">
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.productId)}
                            className="w-6 h-6 rounded bg-white/5 hover:bg-white/10 text-slate-300 flex items-center justify-center"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-6 text-center text-xs font-bold text-white">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => addToCart(item.productId)}
                            className="w-6 h-6 rounded bg-white/5 hover:bg-white/10 text-slate-300 flex items-center justify-center"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <span className="font-bold text-white text-xs min-w-12 text-right">
                          {formatCurrency(item.subtotal)}
                        </span>

                        <button
                          type="button"
                          onClick={() => deleteItemFromCart(item.productId)}
                          className="p-1 text-slate-500 hover:text-rose-400 transition-all"
                          title="Quitar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 3. PAYMENT METHOD */}
            <div className="space-y-1.5 pt-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Método de Pago
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={`py-2 px-1 rounded-xl border text-[11px] font-bold flex flex-col items-center gap-1 transition-all ${
                    paymentMethod === 'cash'
                      ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-[#D4AF37]'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  <Banknote className="w-4 h-4" />
                  <span>Efectivo</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`py-2 px-1 rounded-xl border text-[11px] font-bold flex flex-col items-center gap-1 transition-all ${
                    paymentMethod === 'card'
                      ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-[#D4AF37]'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Tarjeta</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('transfer')}
                  className={`py-2 px-1 rounded-xl border text-[11px] font-bold flex flex-col items-center gap-1 transition-all ${
                    paymentMethod === 'transfer'
                      ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-[#D4AF37]'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  <Receipt className="w-4 h-4" />
                  <span>Transferencia</span>
                </button>
              </div>
            </div>

            {/* 4. TOTAL & LOYALTY POINTS BADGE */}
            <div className="p-4 rounded-2xl bg-black/50 border border-white/10 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Subtotal Artículos</span>
                <span className="font-semibold text-white">{formatCurrency(totalCartAmount)}</span>
              </div>

              <div className="flex items-center justify-between text-sm pt-1 border-t border-white/10">
                <span className="font-bold text-white">TOTAL A COBRAR</span>
                <span className="font-black text-[#D4AF37] text-lg">
                  {formatCurrency(totalCartAmount)}
                </span>
              </div>

              {/* Points calculation reward badge */}
              {customerMode === 'specific' && selectedCustomer && pointsEnabled && (
                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-emerald-300 bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20">
                  <div className="flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Puntos para el cliente ({pointsPercentage}%):</span>
                  </div>
                  <strong className="text-emerald-400 font-black">+{pointsToAward} pts</strong>
                </div>
              )}
            </div>

            {/* 5. SUBMIT SALE BUTTON */}
            <button
              type="button"
              onClick={handleCompleteSale}
              disabled={cartItems.length === 0 || isProcessingSale}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#996515] via-[#D4AF37] to-[#F3E5AB] text-slate-950 font-black text-sm shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>{isProcessingSale ? 'Procesando Cobro...' : `Cobrar ${formatCurrency(totalCartAmount)}`}</span>
            </button>
          </div>
        </div>
      )}

      {/* POS SALES HISTORY TAB */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl bg-[#14171E] border border-white/10">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Recaudado en mi POS
              </span>
              <p className="text-2xl font-black text-[#D4AF37] mt-1">
                {formatCurrency(myTotalRevenue)}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">{myPosSales.length} ventas realizadas</p>
            </div>

            <div className="p-4 rounded-2xl bg-[#14171E] border border-white/10">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Catálogo General
              </span>
              <p className="text-2xl font-black text-white mt-1">{activeProducts.length} productos</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Listos para vender en cualquier momento</p>
            </div>
          </div>

          {myPosSales.length === 0 ? (
            <div className="rounded-3xl bg-[#14171E] border border-white/10 p-8 text-center text-slate-400 space-y-2">
              <ShoppingBag className="w-10 h-10 mx-auto text-slate-600 mb-2" />
              <p className="font-semibold text-white text-sm">No has realizado ventas en tu POS aún</p>
              <p className="text-xs text-slate-500">
                Tus ventas de productos a clientes o público general aparecerán listadas aquí.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {myPosSales.map((sale) => (
                <div
                  key={sale.id}
                  className="p-4 rounded-2xl bg-[#14171E] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{sale.customerName}</span>
                      {sale.customerClientNumber && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#D4AF37]/20 text-[#D4AF37]">
                          #{sale.customerClientNumber}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-300">
                      {(sale.items || []).map((it) => `${it.quantity}x ${it.productName}`).join(' • ')}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {formatDateSpanish(sale.createdAt)} • {formatTime12h(sale.createdAt.slice(11, 16))} •{' '}
                      {sale.paymentMethod === 'cash' ? 'Efectivo' : sale.paymentMethod === 'card' ? 'Tarjeta' : 'Transferencia'}
                    </p>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-white/5 shrink-0">
                    <span className="font-black text-[#D4AF37] text-base">{formatCurrency(sale.total)}</span>
                    {sale.pointsAwarded > 0 && (
                      <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full mt-0.5">
                        +{sale.pointsAwarded} pts otorgados
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* COMPLETED SALE RECEIPT MODAL */}
      {completedSale && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#14171E] border border-white/15 rounded-3xl p-6 w-full max-w-sm space-y-4 shadow-2xl text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-lg">
              <Check className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-base font-bold text-white">¡Venta Registrada Exitosamente!</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Ticket #{completedSale.id.slice(-6).toUpperCase()}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2 text-left text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Cliente:</span>
                <strong className="text-white">{completedSale.customerName}</strong>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Barbero:</span>
                <span className="text-slate-300">{completedSale.barberName}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Método:</span>
                <span className="text-slate-300">
                  {completedSale.paymentMethod === 'cash' ? 'Efectivo' : completedSale.paymentMethod === 'card' ? 'Tarjeta' : 'Transferencia'}
                </span>
              </div>
              <div className="pt-2 border-t border-white/10 flex justify-between text-sm">
                <span className="font-bold text-white">Total Pagado:</span>
                <strong className="text-[#D4AF37] font-black">{formatCurrency(completedSale.total)}</strong>
              </div>

              {completedSale.pointsAwarded > 0 && (
                <div className="pt-2 border-t border-white/10 flex justify-between text-xs text-emerald-300 bg-emerald-500/10 p-2 rounded-xl">
                  <span>Puntos Ganados:</span>
                  <strong className="font-black text-emerald-400">+{completedSale.pointsAwarded} pts</strong>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setCompletedSale(null)}
              className="w-full py-2.5 rounded-2xl bg-[#D4AF37] text-slate-950 font-bold text-xs shadow-lg hover:bg-[#E5B869] transition-all"
            >
              Aceptar & Nueva Venta
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
