import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Search,
  SlidersHorizontal,
  Flame,
  MapPin,
  ArrowUpDown,
  FileText,
  Plus,
  CheckCircle2,
  X,
  Store,
  Send,
  PackageCheck,
  AlertTriangle,
} from 'lucide-react';
import { ProduceItem, HarvestStatus, Order, OrderItem, UserProfile } from '../types';
import { ProduceCard } from './ProduceCard';
import { DA_DAILY_PRICES } from '../data/daPricesData';

interface BuyerMarketViewProps {
  produceList: ProduceItem[];
  onSelectProduce: (produce: ProduceItem) => void;
  /** Legacy direct-purchase hook (market is request-only now). */
  onAddToCart?: (produce: ProduceItem, e: React.MouseEvent) => void;
  cartItemIds?: Set<string>;
  isBuyer?: boolean;
  currentUser?: UserProfile | null;
  onOrderPlaced?: (order: Order) => void;
}

export const BuyerMarketView: React.FC<BuyerMarketViewProps> = ({
  produceList,
  onSelectProduce,
  isBuyer = true,
  currentUser,
  onOrderPlaced,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyHarvestToday, setOnlyHarvestToday] = useState(false);
  const [maxDistance, setMaxDistance] = useState<number>(100);
  const [sortBy, setSortBy] = useState<'stock_high' | 'freshness' | 'price_low' | 'distance'>('stock_high');
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);

  // Custom Buyer Purchase Request Modal state.
  // The request list ALWAYS starts EMPTY — the buyer chooses every crop
  // themselves (preset dropdown, typed name, or a market card "Request" tap).
  // No pre-added products, ever.
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestVegetables, setRequestVegetables] = useState<Array<{ name: string; quantity: number; unit: string; estimatedPrice: number }>>([]);
  const [selectedPresetCrop, setSelectedPresetCrop] = useState('');
  const [customCropName, setCustomCropName] = useState('');
  const [customCropQty, setCustomCropQty] = useState(5);
  const [buyerReqName, setBuyerReqName] = useState(currentUser?.name || '');
  const [buyerReqPhone, setBuyerReqPhone] = useState(currentUser?.phone || '');
  const [buyerReqSlot, setBuyerReqSlot] = useState('Today at 3:00 PM (Store Depot Pickup)');
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [requestSuccessMsg, setRequestSuccessMsg] = useState<string | null>(null);

  // Product-specific request context: when the buyer taps "Request" on a market
  // card (or inside the produce detail modal), the request modal opens pre-filled
  // with THAT crop. availableStock caps the requested quantity.
  const [requestProductInfo, setRequestProductInfo] = useState<{ name: string; availableStock: number; unit: string } | null>(null);

  // ── Stock-aware request validation ─────────────────────────────────────
  // Any requested item that matches a crop currently listed on the Market is
  // capped at that crop's available shelf stock, so a buyer can never request
  // more than the shelf can actually supply (overselling guard).
  const [stockWarning, setStockWarning] = useState<string | null>(null);

  const getAvailableStockFor = useCallback(
    (name: string): { stock: number; unit: string } | null => {
      const q = (name || '').trim().toLowerCase();
      if (!q) return null;
      const match =
        produceList.find((p) => (p.name || '').trim().toLowerCase() === q) ||
        produceList.find(
          (p) =>
            ((p.name || '').toLowerCase().includes(q) || q.includes((p.name || '').toLowerCase())) &&
            (p.name || '').length > 0
        );
      if (!match) return null;
      const stock =
        typeof match.stockQuantity === 'number' ? match.stockQuantity : parseInt(String(match.stockQuantity), 10) || 0;
      return { stock, unit: match.unit || 'kg' };
    },
    [produceList]
  );

  // Preset popular vegetables list for quick selection
  const popularVegetables = [
    { name: 'Tomato (Kamatis)', price: 55 },
    { name: 'Cabbage (Repolyo)', price: 75 },
    { name: 'Eggplant (Talong)', price: 60 },
    { name: 'Ampalaya (Bitter Gourd)', price: 80 },
    { name: 'Carrots', price: 70 },
    { name: 'Bell Pepper (Green)', price: 120 },
    { name: 'Red Onion (Sibuyas Pula)', price: 140 },
    { name: 'Native Garlic (Bawang)', price: 180 },
    { name: 'Ginger (Luya)', price: 110 },
    { name: 'Squash (Kalabasa)', price: 45 },
    { name: 'String Beans (Sitaw)', price: 50 },
    { name: 'Native Spinach (Kangkong)', price: 30 },
  ];

  // Filtered & Sorted Produce - all marketplace catalog vegetables (farmer identities anonymous)
  const filteredProduce = useMemo(() => {
    if (!Array.isArray(produceList)) return [];
    return produceList
      .filter((item) => {
        if (!item) return false;

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = (item.name || '').toLowerCase().includes(q);
          const matchCategory = (item.category || '').toLowerCase().includes(q);
          const matchVar = (item.variety || '').toLowerCase().includes(q);
          if (!matchName && !matchCategory && !matchVar) return false;
        }

        // Harvest Today filter
        if (onlyHarvestToday && item.harvestStatus !== 'Harvested Today') {
          return false;
        }

        // Distance filter: only filter if user manually lowered the distance slider below 100 km
        if (maxDistance < 100) {
          const dist = typeof item.distanceKm === 'number' ? item.distanceKm : parseFloat(item.distanceKm as any) || 0;
          if (dist > maxDistance) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        const priceA = typeof a.pricePerUnit === 'number' ? a.pricePerUnit : parseFloat(a.pricePerUnit as any) || 0;
        const priceB = typeof b.pricePerUnit === 'number' ? b.pricePerUnit : parseFloat(b.pricePerUnit as any) || 0;
        if (sortBy === 'price_low') {
          return priceA - priceB;
        }
        // Default: highest stock quantity first (freshest as tiebreaker)
        const stockOf = (v: ProduceItem) =>
          typeof v.stockQuantity === 'number' ? v.stockQuantity : parseInt(String(v.stockQuantity), 10) || 0;
        const stockDiff = stockOf(b) - stockOf(a);
        if (sortBy === 'stock_high') {
          return stockDiff;
        }
        const distA = typeof a.distanceKm === 'number' ? a.distanceKm : parseFloat(a.distanceKm as any) || 0;
        const distB = typeof b.distanceKm === 'number' ? b.distanceKm : parseFloat(b.distanceKm as any) || 0;
        if (sortBy === 'distance') {
          return distA - distB;
        }
        // freshness default: Harvested Today first, then highest stock
        const score = (status?: HarvestStatus) => {
          if (status === 'Harvested Today') return 3;
          if (status === 'Fresh Picked on Order') return 2;
          if (status === 'Harvesting Tomorrow AM') return 1;
          return 0;
        };
        const freshnessDiff = score(b.harvestStatus) - score(a.harvestStatus);
        if (freshnessDiff !== 0) {
          return freshnessDiff;
        }
        return stockDiff;
      });
  }, [produceList, searchQuery, onlyHarvestToday, maxDistance, sortBy]);

  // Open the request modal pre-filled with a specific market product.
  // The buyer "requests" the crop — quantity is capped at the farmer's
  // available stock and the estimated price is the live store price.
  // `preferredQty` (optional) carries over the quantity picked in the
  // produce detail modal's stepper.
  const openRequestForProduct = useCallback((produce: ProduceItem, preferredQty?: number) => {
    const stock =
      typeof produce.stockQuantity === 'number'
        ? produce.stockQuantity
        : parseInt(String(produce.stockQuantity), 10) || 0;
    const price =
      typeof produce.pricePerUnit === 'number'
        ? produce.pricePerUnit
        : parseFloat(String(produce.pricePerUnit)) || 0;
    const unit = produce.unit || 'kg';

    const initialQty = Math.min(
      Math.max(1, Math.floor(preferredQty || 5)),
      Math.max(1, stock)
    );

    setRequestVegetables([
      { name: produce.name, quantity: initialQty, unit, estimatedPrice: price },
    ]);
    setRequestProductInfo({ name: produce.name, availableStock: stock, unit });
    setSelectedPresetCrop('');
    setCustomCropName('');
    setCustomCropQty(5);
    setRequestSuccessMsg(null);
    setStockWarning(null);
    setShowRequestModal(true);
  }, []);

  // Generic "Request Crops" entry points (header button + empty-state button):
  // open the modal with a CLEAN slate — empty item list, no pre-selected crop,
  // no stale warnings — so the buyer builds the request from scratch.
  const openGenericRequestModal = useCallback(() => {
    setRequestVegetables([]);
    setRequestProductInfo(null);
    setSelectedPresetCrop('');
    setCustomCropName('');
    setCustomCropQty(5);
    setRequestSuccessMsg(null);
    setStockWarning(null);
    setShowRequestModal(true);
  }, []);

  // Buyers can also trigger a product request from the produce detail modal
  // (rendered at App level) via this app-wide event.
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as (ProduceItem & { requestQty?: number }) | undefined;
      if (detail) {
        const { requestQty, ...produce } = detail;
        openRequestForProduct(produce as ProduceItem, requestQty);
      }
    };
    window.addEventListener('veggieconnect:request-product', handler);
    return () => window.removeEventListener('veggieconnect:request-product', handler);
  }, [openRequestForProduct]);

  const closeRequestModal = () => {
    setShowRequestModal(false);
    setRequestProductInfo(null);
    setRequestSuccessMsg(null);
    setStockWarning(null);
  };

  // Handle adding vegetable to the custom request
  const handleAddVegetableToRequest = () => {
    const nameToAdd = (customCropName || selectedPresetCrop).trim();
    if (!nameToAdd) return;

    // Check price
    const matchedPreset = popularVegetables.find(
      (v) => v.name.toLowerCase() === nameToAdd.toLowerCase() || nameToAdd.toLowerCase().includes(v.name.toLowerCase().split(' ')[0])
    );
    const matchedDA = DA_DAILY_PRICES.find(
      (d) => d.commodity.toLowerCase().includes(nameToAdd.toLowerCase().split(' ')[0])
    );
    const estPrice = matchedPreset?.price || matchedDA?.prevailingRetailPrice || 60;

    setStockWarning(null);

    // Shelf-stock guard: matched listed crops cap at their available stock
    const stockInfo = getAvailableStockFor(nameToAdd);
    if (stockInfo && stockInfo.stock <= 0) {
      setStockWarning(`${nameToAdd} is currently sold out — no shelf stock available to request.`);
      return;
    }

    const existing = requestVegetables.find((i) => i.name.toLowerCase() === nameToAdd.toLowerCase());
    let cappedNow = false;
    let nextList: Array<{ name: string; quantity: number; unit: string; estimatedPrice: number }>;
    if (existing) {
      nextList = requestVegetables.map((i) => {
        if (i.name.toLowerCase() !== nameToAdd.toLowerCase()) return i;
        let nextQty = i.quantity + customCropQty;
        // Cap product-specific requests at the farmer's available stock
        if (requestProductInfo && i.name.toLowerCase() === requestProductInfo.name.toLowerCase()) {
          nextQty = Math.min(nextQty, requestProductInfo.availableStock);
        }
        if (stockInfo && nextQty > stockInfo.stock) {
          nextQty = stockInfo.stock;
          cappedNow = true;
        }
        return { ...i, quantity: nextQty };
      });
    } else {
      let addQty = customCropQty;
      if (stockInfo && addQty > stockInfo.stock) {
        addQty = stockInfo.stock;
        cappedNow = true;
      }
      nextList = [...requestVegetables, { name: nameToAdd, quantity: addQty, unit: stockInfo?.unit || 'kg', estimatedPrice: estPrice }];
    }
    setRequestVegetables(nextList);

    if (cappedNow && stockInfo) {
      setStockWarning(
        `Only ${stockInfo.stock} ${stockInfo.unit} of ${nameToAdd} available on the shelf — your quantity was capped.`
      );
    }

    setCustomCropName('');
    setSelectedPresetCrop('');
    setCustomCropQty(5);
  };

  const handleRemoveVegetableFromRequest = (index: number) => {
    setRequestVegetables((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleUpdateReqQty = (index: number, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveVegetableFromRequest(index);
      setStockWarning(null);
      return;
    }
    setStockWarning(null);
    setRequestVegetables((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        let clamped = newQty;
        // Product-specific requests can never exceed the farmer's available stock
        if (requestProductInfo && item.name.toLowerCase() === requestProductInfo.name.toLowerCase()) {
          clamped = Math.min(clamped, requestProductInfo.availableStock);
        }
        // Market shelf guard: listed crops cap at available stock
        const stockInfo = getAvailableStockFor(item.name);
        if (stockInfo) {
          clamped = Math.min(clamped, stockInfo.stock);
        }
        return { ...item, quantity: clamped };
      })
    );
  };

  // Submit Buyer Purchase Request to Admin
  const handleSubmitBuyerRequest = () => {
    if (requestVegetables.length === 0) return;

    // ── Final stock gate (safety net) ─────────────────────────────────
    // Every item matching a listed market crop must be within its
    // available shelf stock before the request can be submitted.
    const problems: string[] = [];
    for (const v of requestVegetables) {
      const info = getAvailableStockFor(v.name);
      if (info && v.quantity > info.stock) {
        problems.push(`${v.name}: requested ${v.quantity}${v.unit}, only ${info.stock}${info.unit} available`);
      }
    }
    if (problems.length > 0) {
      setStockWarning(`Not enough shelf stock — ${problems.join(' • ')}. Please adjust the quantities.`);
      return;
    }
    setStockWarning(null);

    const trimmedName = (buyerReqName || currentUser?.name || 'Valued Buyer').trim();
    const trimmedPhone = (buyerReqPhone || currentUser?.phone || '0917 000 0000').trim();
    const trimmedSlot = buyerReqSlot.trim() || 'Store Depot Pickup';

    setIsSubmittingRequest(true);

    const isProductRequest = Boolean(requestProductInfo);
    const orderItems: OrderItem[] = requestVegetables.map((v, i) => ({
      produceId: `req-prod-${Date.now()}-${i}`,
      produceName: v.name,
      imageUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80',
      unitPrice: v.estimatedPrice,
      pricePerUnit: v.estimatedPrice,
      unit: v.unit,
      quantity: v.quantity,
      farmName: 'VeggieConnect Central Market',
      farmerId: 'admin-main',
    }));

    const totalAmt = requestVegetables.reduce((sum, v) => sum + v.quantity * v.estimatedPrice, 0);

    const newRequestOrder: Order = {
      id: `VC-REQ-${Math.floor(1000 + Math.random() * 9000)}`,
      buyerId: currentUser?.id || 'buyer-custom',
      buyerName: trimmedName,
      buyerPhone: trimmedPhone,
      sellerStoreName: 'VeggieConnect Central Market',
      brokerHubName: 'VeggieConnect Central Market',
      deliveryType: 'farm_pickup',
      pickupSlot: trimmedSlot,
      items: orderItems,
      subtotal: totalAmt,
      deliveryFee: 0,
      totalAmount: totalAmt,
      status: 'pending', // Buyer request submitted, awaits Admin processing
      createdAt: new Date().toISOString(),
      farmerId: 'admin-main',
      farmName: 'VeggieConnect Central Market',
      paymentMethod: 'Over-the-Counter Cash at Depot',
      notes: isProductRequest
        ? `Product Request (Buyer-Led Workflow): Buyer requested "${requestProductInfo?.name}" from the Market catalog (${orderItems.length} vegetable lot(s)). Admin to source from the farmer's current harvest and fulfill.`
        : `Buyer Purchase Request (Buyer-Led Workflow): Details ${orderItems.length} specific vegetable lot(s) requested for Admin inventory verification and fulfillment.`,
    };

    setTimeout(() => {
      setIsSubmittingRequest(false);
      setRequestSuccessMsg(`Request #${newRequestOrder.id} submitted to Admin!`);
      if (onOrderPlaced) {
        onOrderPlaced(newRequestOrder);
      }
      setTimeout(() => {
        closeRequestModal();
      }, 1400);
    }, 500);
  };

  return (
    <div className="flex flex-col space-y-4 p-3.5 pb-8 w-full">
      {/* Compact Market Header + Purchase Request trigger */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <div className="min-w-0">
          <h2 className="text-lg font-extrabold text-emerald-950 font-display leading-tight">
            Today&apos;s Market
          </h2>
          <p className="text-[11px] text-neutral-500 font-medium truncate">
            {produceList.length} crops available today
          </p>
        </div>
        <button
          id="btn-open-buyer-request-modal"
          onClick={openGenericRequestModal}
          className="flex-shrink-0 min-h-[40px] px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-xl shadow-sm flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
          title="Submit a purchase request to the Admin"
        >
          <FileText className="w-4 h-4" />
          <span>Request Crops</span>
        </button>
      </div>

      {/* Search and Filter Row */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-emerald-700/60 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="input-market-search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search catalog: spinach, tomatoes, carrots, cabbage..."
            className="w-full min-h-[46px] bg-white border border-emerald-200/90 rounded-2xl pl-10 pr-9 py-2.5 text-xs text-emerald-950 placeholder-emerald-800/40 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 text-sm p-1 cursor-pointer font-bold"
            >
              ✕
            </button>
          )}
        </div>

        <button
          id="btn-toggle-filters"
          onClick={() => setShowFilterDrawer(!showFilterDrawer)}
          className={`min-h-[46px] min-w-[46px] p-2.5 rounded-2xl border text-xs flex items-center justify-center gap-1 transition-all active:scale-95 shadow-xs cursor-pointer ${
            showFilterDrawer || onlyHarvestToday || maxDistance < 100
              ? 'bg-emerald-700 text-white border-emerald-700 font-bold'
              : 'bg-white text-emerald-900 border-emerald-200 hover:bg-emerald-50'
          }`}
          title="Filter and Sort options"
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* Expandable Quick Filter Panel */}
      {showFilterDrawer && (
        <div className="bg-white border border-emerald-200/90 rounded-2xl p-4 space-y-3.5 shadow-sm animate-in fade-in duration-150">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-950">
            <span>Market Filters</span>
            <button
              onClick={() => {
                setOnlyHarvestToday(false);
                setMaxDistance(100);
                setSortBy('freshness');
              }}
              className="text-[11px] text-emerald-700 font-semibold hover:underline cursor-pointer"
            >
              Reset
            </button>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            {/* Harvested Today Quick Toggle */}
            <button
              id="btn-filter-harvest-today"
              onClick={() => setOnlyHarvestToday(!onlyHarvestToday)}
              className={`min-h-[40px] px-3 py-2 rounded-xl flex items-center gap-1.5 font-bold transition-all cursor-pointer ${
                onlyHarvestToday
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-900 border border-emerald-200/70 hover:bg-emerald-100'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              Harvested Today Only
            </button>
          </div>

          {/* Distance Slider */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-xs text-emerald-900">
              <span className="flex items-center gap-1 font-semibold">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" /> Max Sourcing Distance
              </span>
              <span className="font-bold text-emerald-950 bg-emerald-100 px-2 py-0.5 rounded-full text-[11px]">
                {maxDistance >= 100 ? 'All Negros Oriental (Any distance)' : `${maxDistance} km`}
              </span>
            </div>
            <input
              type="range"
              min="5"
              max="100"
              step="5"
              value={maxDistance}
              onChange={(e) => setMaxDistance(Number(e.target.value))}
              className="w-full accent-emerald-600 cursor-pointer h-2 bg-emerald-100 rounded-lg"
            />
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-2 text-xs text-emerald-900 pt-1">
            <ArrowUpDown className="w-3.5 h-3.5 text-emerald-600" />
            <span className="font-semibold text-[11px]">Sort:</span>
            <div className="flex gap-1.5">
              {(['stock_high', 'freshness', 'price_low', 'distance'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSortBy(s)}
                  className={`min-h-[34px] px-2.5 py-1 rounded-xl text-[11px] font-bold cursor-pointer transition-all ${
                    sortBy === s
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200/70 hover:bg-emerald-100'
                  }`}
                >
                  {s === 'stock_high' ? 'Stock: High' : s === 'freshness' ? 'Freshness' : s === 'price_low' ? 'Price: Low' : 'Distance'}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Produce Results Header */}
      <div className="flex items-center justify-between text-xs text-emerald-900 pt-1 px-1">
        <span>
          Showing <strong className="text-emerald-950 font-bold">{filteredProduce.length}</strong> vegetables in catalog
        </span>
        {onlyHarvestToday && (
          <span className="text-emerald-700 text-[11px] font-bold flex items-center gap-1 bg-emerald-100 px-2 py-0.5 rounded-full">
            <Flame className="w-3 h-3 fill-emerald-600 text-emerald-600" /> Morning Harvests
          </span>
        )}
      </div>

      {/* Produce Grid */}
      {filteredProduce.length > 0 ? (
        <div className="grid grid-cols-2 gap-2.5">
          {filteredProduce.map((produce) => (
            <ProduceCard
              key={produce.id}
              produce={produce}
              onSelect={onSelectProduce}
              onRequestProduct={(prod) => openRequestForProduct(prod)}
              isBuyer={isBuyer}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white border border-emerald-100 rounded-3xl p-8 text-center space-y-3 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto text-2xl">
            🥬
          </div>
          <h3 className="text-base font-bold text-emerald-950 font-display">No Farmer Crops Available Right Now</h3>
          <p className="text-xs text-neutral-600 max-w-xs mx-auto leading-relaxed">
            No crops match your filters right now. You can still submit a request with the exact vegetables and quantities you need.
          </p>
          <button
            onClick={openGenericRequestModal}
            className="min-h-[44px] px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-xs inline-flex items-center gap-1.5"
          >
            <FileText className="w-4 h-4" />
            <span>Request a Vegetable</span>
          </button>
        </div>
      )}

      {/* SUBMIT VEGETABLE PURCHASE REQUEST MODAL */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full max-h-[92%] overflow-y-auto shadow-2xl border border-emerald-200 p-5 space-y-4 text-emerald-950">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <FileText className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-emerald-950">
                    Vegetable Purchase Request
                  </h3>
                  <p className="text-[11px] text-emerald-700 font-semibold">
                    Detail Vegetables &amp; Quantities to Admin
                  </p>
                </div>
              </div>
              <button
                onClick={closeRequestModal}
                className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Product-specific request banner: shows when the buyer tapped
                "Request" on a market crop. Quantity is capped at farmer stock. */}
            {requestProductInfo && (
              <div className="bg-emerald-600 text-white rounded-2xl p-3 flex items-center gap-2.5 shadow-xs">
                <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
                  <PackageCheck className="w-4 h-4 text-emerald-100" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-extrabold truncate">Requesting: {requestProductInfo.name}</h4>
                  <p className="text-[10px] text-emerald-100 font-medium">
                    {requestProductInfo.availableStock} {requestProductInfo.unit} available from today's farmer harvest — request quantity is capped at this amount.
                  </p>
                </div>
              </div>
            )}

            {/* Add Vegetables Form */}
            <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3.5 space-y-3">
              <h4 className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-emerald-600" />
                <span>Add Vegetable to Request</span>
              </h4>

              <div className="space-y-2">
                <div>
                  <label className="text-[10px] font-bold text-emerald-900 block mb-1">
                    Select Popular Commodity or Type Name:
                  </label>
                  <select
                    value={selectedPresetCrop}
                    onChange={(e) => {
                      setSelectedPresetCrop(e.target.value);
                      setCustomCropName(e.target.value);
                    }}
                    className="w-full bg-white border border-emerald-200 rounded-xl px-3 py-2 text-xs text-neutral-900 focus:outline-none focus:border-emerald-600"
                  >
                    <option value="">-- Choose a Vegetable --</option>
                    {popularVegetables.map((v) => (
                      <option key={v.name} value={v.name}>
                        {v.name} (~₱{v.price}/kg)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={customCropName}
                    onChange={(e) => setCustomCropName(e.target.value)}
                    placeholder="Or type vegetable name..."
                    className="flex-1 bg-white border border-emerald-200 rounded-xl px-3 py-2 text-xs text-neutral-900 focus:outline-none focus:border-emerald-600"
                  />
                  <div className="flex items-center gap-1 bg-white border border-emerald-200 rounded-xl px-2 py-1">
                    <button
                      type="button"
                      onClick={() => setCustomCropQty(Math.max(1, customCropQty - 1))}
                      className="w-6 h-6 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold flex items-center justify-center cursor-pointer text-xs"
                    >
                      -
                    </button>
                    <span className="font-bold text-xs text-neutral-900 px-1 font-mono">
                      {customCropQty} kg
                    </span>
                    <button
                      type="button"
                      onClick={() => setCustomCropQty(customCropQty + 1)}
                      className="w-6 h-6 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center cursor-pointer text-xs"
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddVegetableToRequest}
                    disabled={!customCropName.trim() && !selectedPresetCrop}
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold text-xs rounded-xl cursor-pointer shadow-xs"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            {/* List of Requested Vegetables */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-950">
                <span>Requested Items ({requestVegetables.length})</span>
                <span className="text-[11px] text-neutral-500 font-medium">Estimated Pricing</span>
              </div>

              {requestVegetables.length === 0 ? (
                <div className="p-4 text-center text-xs text-neutral-500 bg-neutral-50 rounded-2xl border border-neutral-200">
                  No vegetables added yet. Select or type a vegetable above!
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {requestVegetables.map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-white border border-emerald-200/80 rounded-2xl p-2.5 flex items-center justify-between gap-2 shadow-2xs"
                    >
                      <div className="min-w-0">
                        <h5 className="font-bold text-xs text-emerald-950 truncate">{item.name}</h5>
                        <p className="text-[10px] text-neutral-500">
                          ~₱{item.estimatedPrice}/{item.unit} • Est. Subtotal: ₱{(item.quantity * item.estimatedPrice).toFixed(2)}
                        </p>
                        {(() => {
                          const info = getAvailableStockFor(item.name);
                          if (!info) {
                            return <p className="text-[10px] text-neutral-400 italic">Custom request — Admin will source from farmers</p>;
                          }
                          const atCap = item.quantity >= info.stock;
                          return (
                            <p className={`text-[10px] font-bold ${atCap ? 'text-amber-600' : 'text-emerald-600'}`}>
                              {info.stock} {info.unit} available on shelf{atCap ? ' • at maximum' : ''}
                            </p>
                          );
                        })()}
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-200 rounded-lg p-0.5">
                          <button
                            type="button"
                            onClick={() => handleUpdateReqQty(idx, item.quantity - 1)}
                            className="w-5 h-5 rounded bg-white text-emerald-900 font-bold flex items-center justify-center text-xs cursor-pointer shadow-2xs"
                          >
                            -
                          </button>
                          <span className="text-xs font-extrabold text-emerald-950 px-1 font-mono">
                            {item.quantity} {item.unit}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateReqQty(idx, item.quantity + 1)}
                            disabled={(() => {
                              const info = getAvailableStockFor(item.name);
                              return info ? item.quantity >= info.stock : false;
                            })()}
                            className="w-5 h-5 rounded bg-emerald-600 text-white font-bold flex items-center justify-center text-xs cursor-pointer shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            +
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveVegetableFromRequest(idx)}
                          className="p-1 text-neutral-400 hover:text-rose-600 rounded-md cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Stock validation warning (overselling guard) */}
            {stockWarning && (
              <div className="bg-amber-50 border border-amber-300 rounded-2xl p-2.5 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] font-bold text-amber-900 leading-relaxed">{stockWarning}</p>
              </div>
            )}

            {/* Buyer Contact & Pickup Information */}
            <div className="space-y-2 text-xs pt-1 border-t border-neutral-100">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-neutral-700 block mb-0.5">Your Name:</label>
                  <input
                    type="text"
                    value={buyerReqName}
                    onChange={(e) => setBuyerReqName(e.target.value)}
                    placeholder="Enter full name"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-2.5 py-1.5 text-xs text-neutral-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-neutral-700 block mb-0.5">Phone Number:</label>
                  <input
                    type="text"
                    value={buyerReqPhone}
                    onChange={(e) => setBuyerReqPhone(e.target.value)}
                    placeholder="0917 123 4567"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-2.5 py-1.5 text-xs text-neutral-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-neutral-700 block mb-0.5">Pickup Time / Delivery Slot:</label>
                <input
                  type="text"
                  value={buyerReqSlot}
                  onChange={(e) => setBuyerReqSlot(e.target.value)}
                  placeholder="e.g. Today at 3:00 PM (Central Depot Pickup)"
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-2.5 py-1.5 text-xs text-neutral-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
                />
              </div>
            </div>

            {/* Total Summary */}
            <div className="bg-emerald-100/70 p-3 rounded-2xl flex items-center justify-between border border-emerald-300">
              <div>
                <span className="text-[10px] text-emerald-800 uppercase font-bold block">
                  Estimated Total ({requestVegetables.reduce((s, v) => s + v.quantity, 0)} kg requested):
                </span>
                <span className="text-lg font-black text-emerald-950 font-mono">
                  ₱{requestVegetables.reduce((sum, v) => sum + v.quantity * v.estimatedPrice, 0).toFixed(2)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-emerald-800 font-semibold block">Fulfillment:</span>
                <span className="text-xs font-bold text-emerald-950">VeggieConnect Depot</span>
              </div>
            </div>

            {requestSuccessMsg && (
              <div className="p-3 bg-emerald-600 text-white font-bold text-xs rounded-xl flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-200 flex-shrink-0" />
                <span>{requestSuccessMsg}</span>
              </div>
            )}

            {/* Submit Action Button */}
            <button
              type="button"
              id="btn-submit-vegetable-request"
              onClick={handleSubmitBuyerRequest}
              disabled={isSubmittingRequest || requestVegetables.length === 0}
              className="w-full min-h-[46px] py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-xs shadow-md flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
            >
              {isSubmittingRequest ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Submitting Request to Admin...
                </span>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Submit Purchase Request to Admin</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
