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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-[#E6E1D6] shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-[#161514] flex items-center justify-center text-[#C69765] shadow-sm shrink-0">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-display text-xl font-bold text-[#161514] uppercase tracking-wide">
                Punto de Venta POS
              </h3>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[#FBF6EE] text-[#7D542B] border border-[#9A6B3B]/30">
                {activeBarber?.displayName}
              </span>
            </div>
            <p className="text-xs text-[#5C5852]">
              Vende productos a público general o a clientes con asignación de puntos ({pointsPercentage}%)
            </p>
          </div>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[#F2EFE9] border border-[#E6E1D6] shrink-0">
          <button
            onClick={() => setActiveTab('pos')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'pos' ? 'bg-[#161514] text-[#FAF9F6] shadow-sm' : 'text-[#5C5852] hover:text-[#161514]'
            }`}
          >
            Terminal POS
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'history' ? 'bg-[#161514] text-[#FAF9F6] shadow-sm' : 'text-[#5C5852] hover:text-[#161514]'
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
                <Search className="w-4 h-4 text-[#767067] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Buscar producto por nombre..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-[#D2CBBF] text-[#161514] text-xs placeholder:text-[#8E887E] focus:outline-none focus:border-[#9A6B3B]"
                />
              </div>

              {/* Category filters for fast mobile filtering */}
              {categories.length > 2 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap transition-all text-[11px] border ${
                        selectedCategory === cat
                          ? 'bg-[#161514] text-[#FAF9F6] border-[#161514] shadow-sm'
                          : 'bg-white text-[#5C5852] border-[#E6E1D6] hover:text-[#161514] hover:border-[#D2CBBF]'
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
              <div className="rounded-2xl bg-white border border-[#E6E1D6] p-8 text-center text-[#5C5852] space-y-3">
                <Package className="w-10 h-10 mx-auto text-[#8E887E] mb-2" />
                <p className="font-semibold text-[#161514] text-sm">No hay productos disponibles</p>
                <p className="text-xs text-[#767067]">
                  Agrega productos al catálogo general para comenzar a vender en tu POS.
                </p>
                {onOpenNewProductModal && (
                  <button
                    onClick={onOpenNewProductModal}
                    className="px-4 py-2 rounded-xl bg-[#161514] hover:bg-[#2A2826] text-[#FAF9F6] font-bold text-xs shadow-sm transition-all"
                  >
                    Registrar Producto
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3 max-h-[580px] overflow-y-auto pr-1">
                {filteredProducts.map((prod) => {
                  const inCartQty = cart[prod.id] || 0;
                  const imgUrl = getProductImage(prod);
                  return (
                    <div
                      key={prod.id}
                      onClick={() => addToCart(prod.id)}
                      className={`group cursor-pointer rounded-2xl border ${
                        inCartQty > 0
                          ? 'border-[#9A6B3B] ring-1 ring-[#9A6B3B]/30 bg-[#FAF7F0]'
                          : 'border-[#E6E1D6] bg-white'
                      } p-2 sm:p-2.5 flex flex-col justify-between gap-2 shadow-sm hover:border-[#9A6B3B] active:scale-[0.98] transition-all relative overflow-hidden`}
                    >
                      {/* Product Image Box */}
                      <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-[#F2EFE9] border border-[#E6E1D6]">
                        <img
                          src={imgUrl}
                          alt={prod.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          referrerPolicy="no-referrer"
                        />
                        {/* Cart Badge */}
                        {inCartQty > 0 && (
                          <div className="absolute top-1.5 right-1.5 px-2 py-0.5 rounded-full bg-[#161514] text-[#FAF9F6] font-mono tabular-nums font-bold text-[10px] sm:text-xs flex items-center justify-center shadow-md border border-white/20">
                            {inCartQty} en orden
                          </div>
                        )}
                        {/* Category tag */}
                        {prod.category && (
                          <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-[#161514]/75 backdrop-blur-sm text-[10px] font-semibold text-[#FAF9F6]">
                            {prod.category}
                          </div>
                        )}
                      </div>

                      {/* Product Title & Info */}
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <h4 className="font-bold text-[#161514] text-xs line-clamp-2 leading-tight group-hover:text-[#9A6B3B] transition-colors">
                          {prod.name}
                        </h4>
                        <p className="text-[10px] text-[#767067] line-clamp-1">
                          {prod.description || 'Monarca Barber'}
                        </p>
                      </div>

                      {/* Price and Add Action */}
                      <div className="flex items-center justify-between pt-1.5 border-t border-[#E6E1D6] mt-auto">
                        <span className="font-mono tabular-nums font-black text-[#161514] text-xs sm:text-sm">
                          {formatCurrency(prod.price)}
                        </span>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            addToCart(prod.id);
                          }}
                          className="p-1.5 rounded-lg bg-[#F2EFE9] group-hover:bg-[#161514] group-hover:text-[#FAF9F6] text-[#161514] border border-[#D2CBBF] group-hover:border-[#161514] text-xs font-bold transition-all flex items-center justify-center"
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
          <div className="lg:col-span-5 rounded-2xl bg-white border border-[#E6E1D6] p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-[#E6E1D6]">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-[#9A6B3B]" />
                <h4 className="font-display text-lg font-bold text-[#161514] uppercase tracking-wide">
                  Orden de Venta POS
                </h4>
              </div>
              {cartItems.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-xs text-rose-700 hover:text-rose-800 font-semibold"
                >
                  Vaciar
                </button>
              )}
            </div>

            {/* 1. SELECCIÓN DE CLIENTE / PÚBLICO GENERAL */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-[#5C5852] uppercase tracking-wider block">
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
                      ? 'bg-[#161514] text-[#FAF9F6] border-[#161514] shadow-sm'
                      : 'bg-[#FAF9F6] border-[#D2CBBF] text-[#5C5852] hover:text-[#161514]'
                  }`}
                >
                  <Users className={`w-3.5 h-3.5 ${customerMode === 'general' ? 'text-[#C69765]' : ''}`} />
                  <span>Público General</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCustomerMode('specific')}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    customerMode === 'specific'
                      ? 'bg-[#161514] text-[#FAF9F6] border-[#161514] shadow-sm'
                      : 'bg-[#FAF9F6] border-[#D2CBBF] text-[#5C5852] hover:text-[#161514]'
                  }`}
                >
                  <User className={`w-3.5 h-3.5 ${customerMode === 'specific' ? 'text-[#C69765]' : ''}`} />
                  <span>Cliente Específico</span>
                </button>
              </div>

              {/* Specific Customer Selection Input */}
              {customerMode === 'specific' && (
                <div className="space-y-2 pt-1 animate-in fade-in">
                  {selectedCustomer ? (
                    <div className="p-3 rounded-xl bg-[#FAF7F0] border border-[#9A6B3B]/40 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-[#161514] text-[#C69765] font-bold flex items-center justify-center text-xs">
                          {selectedCustomer.name.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-[#161514] text-xs">{selectedCustomer.name}</span>
                            {selectedCustomer.clientNumber && (
                              <span className="font-mono tabular-nums text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#FBF6EE] text-[#7D542B] border border-[#9A6B3B]/30">
                                #{selectedCustomer.clientNumber}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#5C5852]">
                            Puntos actuales: <strong className="font-mono tabular-nums text-[#7D542B]">{selectedCustomer.points || 0} pts</strong> • {selectedCustomer.phone || 'Sin tel'}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => setSelectedCustomer(null)}
                        className="p-1.5 rounded-lg text-[#5C5852] hover:text-rose-700 hover:bg-rose-50 transition-all"
                        title="Cambiar cliente"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-[#767067] absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={customerSearch}
                          onChange={(e) => setCustomerSearch(e.target.value)}
                          placeholder="Buscar por nombre, teléfono o #cliente..."
                          className="w-full pl-8 pr-3 py-2 rounded-xl bg-[#FAF9F6] border border-[#D2CBBF] text-[#161514] text-xs placeholder:text-[#8E887E] focus:outline-none focus:border-[#9A6B3B]"
                        />
                      </div>

                      {/* Dropdown list of customers */}
                      <div className="max-h-36 overflow-y-auto space-y-1 rounded-xl bg-[#FAF9F6] p-1.5 border border-[#E6E1D6]">
                        {filteredCustomers.length === 0 ? (
                          <p className="text-[11px] text-[#767067] p-2 text-center">
                            No se encontraron clientes
                          </p>
                        ) : (
                          filteredCustomers.slice(0, 15).map((cust) => (
                            <button
                              key={cust.id}
                              type="button"
                              onClick={() => setSelectedCustomer(cust)}
                              className="w-full text-left p-2 rounded-lg hover:bg-white border border-transparent hover:border-[#E6E1D6] flex items-center justify-between text-xs transition-all"
                            >
                              <div>
                                <span className="font-semibold text-[#161514] block">{cust.name}</span>
                                <span className="text-[10px] text-[#5C5852] font-mono tabular-nums">
                                  #{cust.clientNumber || 'MB'} • {cust.phone || 'Sin tel'}
                                </span>
                              </div>
                              <span className="text-[11px] font-mono tabular-nums font-bold text-[#7D542B]">
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
              <label className="text-[11px] font-bold text-[#5C5852] uppercase tracking-wider block">
                Artículos en Carrito ({cartItems.length})
              </label>

              {cartItems.length === 0 ? (
                <div className="p-6 rounded-xl bg-[#FAF9F6] border border-dashed border-[#D2CBBF] text-center text-[#767067] text-xs">
                  Toca cualquier producto a la izquierda para agregarlo a la venta.
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {cartItems.map((item) => (
                    <div
                      key={item.productId}
                      className="p-2.5 rounded-xl bg-[#FAF9F6] border border-[#E6E1D6] flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-[#161514] text-xs truncate">{item.productName}</p>
                        <p className="text-[11px] text-[#5C5852] font-mono tabular-nums">
                          {formatCurrency(item.price)} c/u
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center gap-1 bg-white rounded-lg p-0.5 border border-[#D2CBBF]">
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.productId)}
                            className="w-6 h-6 rounded bg-[#F2EFE9] hover:bg-[#E8E3D9] text-[#161514] flex items-center justify-center"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-6 text-center text-xs font-mono tabular-nums font-bold text-[#161514]">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => addToCart(item.productId)}
                            className="w-6 h-6 rounded bg-[#F2EFE9] hover:bg-[#E8E3D9] text-[#161514] flex items-center justify-center"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <span className="font-mono tabular-nums font-bold text-[#161514] text-xs min-w-12 text-right">
                          {formatCurrency(item.subtotal)}
                        </span>

                        <button
                          type="button"
                          onClick={() => deleteItemFromCart(item.productId)}
                          className="p-1 text-[#767067] hover:text-rose-700 transition-all"
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
              <label className="text-[11px] font-bold text-[#5C5852] uppercase tracking-wider block">
                Método de Pago
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={`py-2 px-1 rounded-xl border text-[11px] font-bold flex flex-col items-center gap-1 transition-all ${
                    paymentMethod === 'cash'
                      ? 'bg-[#161514] border-[#161514] text-[#FAF9F6] shadow-sm'
                      : 'bg-[#FAF9F6] border-[#D2CBBF] text-[#5C5852] hover:text-[#161514]'
                  }`}
                >
                  <Banknote className={`w-4 h-4 ${paymentMethod === 'cash' ? 'text-[#C69765]' : ''}`} />
                  <span>Efectivo</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`py-2 px-1 rounded-xl border text-[11px] font-bold flex flex-col items-center gap-1 transition-all ${
                    paymentMethod === 'card'
                      ? 'bg-[#161514] border-[#161514] text-[#FAF9F6] shadow-sm'
                      : 'bg-[#FAF9F6] border-[#D2CBBF] text-[#5C5852] hover:text-[#161514]'
                  }`}
                >
                  <CreditCard className={`w-4 h-4 ${paymentMethod === 'card' ? 'text-[#C69765]' : ''}`} />
                  <span>Tarjeta</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('transfer')}
                  className={`py-2 px-1 rounded-xl border text-[11px] font-bold flex flex-col items-center gap-1 transition-all ${
                    paymentMethod === 'transfer'
                      ? 'bg-[#161514] border-[#161514] text-[#FAF9F6] shadow-sm'
                      : 'bg-[#FAF9F6] border-[#D2CBBF] text-[#5C5852] hover:text-[#161514]'
                  }`}
                >
                  <Receipt className={`w-4 h-4 ${paymentMethod === 'transfer' ? 'text-[#C69765]' : ''}`} />
                  <span>Transferencia</span>
                </button>
              </div>
            </div>

            {/* 4. TOTAL & LOYALTY POINTS BADGE */}
            <div className="p-4 rounded-xl bg-[#FAF9F6] border border-[#E6E1D6] space-y-2">
              <div className="flex items-center justify-between text-xs text-[#5C5852]">
                <span>Subtotal Artículos</span>
                <span className="font-mono tabular-nums font-semibold text-[#161514]">{formatCurrency(totalCartAmount)}</span>
              </div>

              <div className="flex items-center justify-between text-sm pt-2 border-t border-[#E6E1D6]">
                <span className="font-bold text-[#161514]">TOTAL A COBRAR</span>
                <span className="font-mono tabular-nums font-black text-[#9A6B3B] text-lg">
                  {formatCurrency(totalCartAmount)}
                </span>
              </div>

              {/* Points calculation reward badge */}
              {customerMode === 'specific' && selectedCustomer && pointsEnabled && (
                <div className="pt-2 border-t border-[#E6E1D6] flex items-center justify-between text-xs text-emerald-800 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                  <div className="flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span>Puntos para el cliente ({pointsPercentage}%):</span>
                  </div>
                  <strong className="font-mono tabular-nums text-emerald-800 font-black">+{pointsToAward} pts</strong>
                </div>
              )}
            </div>

            {/* 5. SUBMIT SALE BUTTON */}
            <button
              type="button"
              onClick={handleCompleteSale}
              disabled={cartItems.length === 0 || isProcessingSale}
              className="w-full py-3.5 rounded-xl bg-[#161514] hover:bg-[#2A2826] text-[#FAF9F6] font-bold text-sm shadow-sm active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <ShoppingBag className="w-4 h-4 text-[#C69765]" />
              <span>{isProcessingSale ? 'Procesando Cobro...' : `Cobrar ${formatCurrency(totalCartAmount)}`}</span>
            </button>
          </div>
        </div>
      )}

      {/* POS SALES HISTORY TAB */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl bg-white border border-[#E6E1D6] shadow-sm">
              <span className="text-[11px] font-bold text-[#5C5852] uppercase tracking-wider block">
                Total Recaudado en mi POS
              </span>
              <p className="font-mono tabular-nums text-2xl font-black text-[#161514] mt-1">
                {formatCurrency(myTotalRevenue)}
              </p>
              <p className="text-[11px] text-[#767067] mt-0.5 font-mono tabular-nums">{myPosSales.length} ventas realizadas</p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-[#E6E1D6] shadow-sm">
              <span className="text-[11px] font-bold text-[#5C5852] uppercase tracking-wider block">
                Catálogo General
              </span>
              <p className="font-mono tabular-nums text-2xl font-black text-[#9A6B3B] mt-1">{activeProducts.length} productos</p>
              <p className="text-[11px] text-[#767067] mt-0.5">Listos para vender en cualquier momento</p>
            </div>
          </div>

          {myPosSales.length === 0 ? (
            <div className="rounded-2xl bg-white border border-[#E6E1D6] p-8 text-center text-[#5C5852] space-y-2">
              <ShoppingBag className="w-10 h-10 mx-auto text-[#8E887E] mb-2" />
              <p className="font-semibold text-[#161514] text-sm">No has realizado ventas en tu POS aún</p>
              <p className="text-xs text-[#767067]">
                Tus ventas de productos a clientes o público general aparecerán listadas aquí.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {myPosSales.map((sale) => (
                <div
                  key={sale.id}
                  className="p-4 rounded-2xl bg-white border border-[#E6E1D6] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#161514] text-sm">{sale.customerName}</span>
                      {sale.customerClientNumber && (
                        <span className="font-mono tabular-nums text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#FBF6EE] text-[#7D542B] border border-[#9A6B3B]/30">
                          #{sale.customerClientNumber}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#5C5852]">
                      {(sale.items || []).map((it) => `${it.quantity}x ${it.productName}`).join(' • ')}
                    </p>
                    <p className="text-[11px] text-[#767067] font-mono tabular-nums">
                      {formatDateSpanish(sale.createdAt)} • {formatTime12h(sale.createdAt.slice(11, 16))} •{' '}
                      {sale.paymentMethod === 'cash' ? 'Efectivo' : sale.paymentMethod === 'card' ? 'Tarjeta' : 'Transferencia'}
                    </p>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-[#E6E1D6] shrink-0">
                    <span className="font-mono tabular-nums font-black text-[#161514] text-base">{formatCurrency(sale.total)}</span>
                    {sale.pointsAwarded > 0 && (
                      <span className="font-mono tabular-nums text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md mt-0.5">
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
        <div className="fixed inset-0 z-50 bg-[#161514]/55 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#FAF9F6] border border-[#D2CBBF] rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-2xl text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-700 flex items-center justify-center mx-auto shadow-sm">
              <Check className="w-7 h-7" />
            </div>

            <div>
              <h3 className="font-display text-xl font-bold text-[#161514] uppercase tracking-wide">
                ¡Venta Registrada Exitosamente!
              </h3>
              <p className="text-xs text-[#5C5852] font-mono tabular-nums mt-0.5">
                Ticket #{completedSale.id.slice(-6).toUpperCase()}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white border border-[#E6E1D6] space-y-2 text-left text-xs">
              <div className="flex justify-between text-[#5C5852]">
                <span>Cliente:</span>
                <strong className="text-[#161514]">{completedSale.customerName}</strong>
              </div>
              <div className="flex justify-between text-[#5C5852]">
                <span>Barbero:</span>
                <span className="text-[#161514] font-medium">{completedSale.barberName}</span>
              </div>
              <div className="flex justify-between text-[#5C5852]">
                <span>Método:</span>
                <span className="text-[#161514] font-medium">
                  {completedSale.paymentMethod === 'cash' ? 'Efectivo' : completedSale.paymentMethod === 'card' ? 'Tarjeta' : 'Transferencia'}
                </span>
              </div>
              <div className="pt-2 border-t border-[#E6E1D6] flex justify-between text-sm">
                <span className="font-bold text-[#161514]">Total Pagado:</span>
                <strong className="font-mono tabular-nums text-[#9A6B3B] font-black">{formatCurrency(completedSale.total)}</strong>
              </div>

              {completedSale.pointsAwarded > 0 && (
                <div className="pt-2 border-t border-[#E6E1D6] flex justify-between text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 p-2 rounded-lg">
                  <span>Puntos Ganados:</span>
                  <strong className="font-mono tabular-nums font-black text-emerald-800">+{completedSale.pointsAwarded} pts</strong>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setCompletedSale(null)}
              className="w-full py-2.5 rounded-xl bg-[#161514] hover:bg-[#2A2826] text-[#FAF9F6] font-bold text-xs shadow-sm transition-all"
            >
              Aceptar & Nueva Venta
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
