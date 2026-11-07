import React, { useState, useMemo } from 'react';
import {
  Search,
  SlidersHorizontal,
  Flame,
  MapPin,
  ArrowUpDown,
  FileText,
  Plus,
  Minus,
  CheckCircle2,
  X,
  Store,
  Clock,
  ArrowRight,
  ShieldCheck,
  Send,
  Sparkles,
} from 'lucide-react';
import { ProduceItem, HarvestStatus, Order, OrderItem, UserProfile } from '../types';
import { ProduceCard } from './ProduceCard';
import { DA_DAILY_PRICES } from '../data/daPricesData';

interface BuyerMarketViewProps {
  produceList: ProduceItem[];
  onSelectProduce: (produce: ProduceItem) => void;
  onAddToCart: (produce: ProduceItem, e: React.MouseEvent) => void;
  cartItemIds: Set<string>;
  isBuyer?: boolean;
  currentUser?: UserProfile | null;
  onOrderPlaced?: (order: Order) => void;
}

export const BuyerMarketView: React.FC<BuyerMarketViewProps> = ({
  produceList,
  onSelectProduce,
  onAddToCart,
  cartItemIds,
  isBuyer = true,
  currentUser,
  onOrderPlaced,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyHarvestToday, setOnlyHarvestToday] = useState(false);
  const [maxDistance, setMaxDistance] = useState<number>(100);
  const [sortBy, setSortBy] = useState<'freshness' | 'price_low' | 'distance'>('freshness');
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);

  // Custom Buyer Purchase Request Modal state (Step 1)
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestVegetables, setRequestVegetables] = useState<Array<{ name: string; quantity: number; unit: string; estimatedPrice: number }>>([
    { name: 'Tomato (Kamatis)', quantity: 5, unit: 'kg', estimatedPrice: 55 },
    { name: 'Cabbage (Repolyo)', quantity: 3, unit: 'kg', estimatedPrice: 75 },
  ]);
  const [selectedPresetCrop, setSelectedPresetCrop] = useState('');
  const [customCropName, setCustomCropName] = useState('');
  const [customCropQty, setCustomCropQty] = useState(5);
  const [buyerReqName, setBuyerReqName] = useState(currentUser?.name || '');
  const [buyerReqPhone, setBuyerReqPhone] = useState(currentUser?.phone || '');
  const [buyerReqSlot, setBuyerReqSlot] = useState('Today at 3:00 PM (Store Depot Pickup)');
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [requestSuccessMsg, setRequestSuccessMsg] = useState<string | null>(null);

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
        const distA = typeof a.distanceKm === 'number' ? a.distanceKm : parseFloat(a.distanceKm as any) || 0;
        const distB = typeof b.distanceKm === 'number' ? b.distanceKm : parseFloat(b.distanceKm as any) || 0;
        if (sortBy === 'distance') {
          return distA - distB;
        }
        // freshness default: Harvested Today first
        const score = (status?: HarvestStatus) => {
          if (status === 'Harvested Today') return 3;
          if (status === 'Fresh Picked on Order') return 2;
          if (status === 'Harvesting Tomorrow AM') return 1;
          return 0;
        };
        return score(b.harvestStatus) - score(a.harvestStatus);
      });
  }, [produceList, searchQuery, onlyHarvestToday, maxDistance, sortBy]);

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

    setRequestVegetables((prev) => {
      const existing = prev.find((i) => i.name.toLowerCase() === nameToAdd.toLowerCase());
      if (existing) {
        return prev.map((i) =>
          i.name.toLowerCase() === nameToAdd.toLowerCase()
            ? { ...i, quantity: i.quantity + customCropQty }
            : i
        );
      }
      return [...prev, { name: nameToAdd, quantity: customCropQty, unit: 'kg', estimatedPrice: estPrice }];
    });

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
      return;
    }
    setRequestVegetables((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, quantity: newQty } : item))
    );
  };

  // Submit Buyer Purchase Request to Admin (Step 1)
  const handleSubmitBuyerRequest = () => {
    if (requestVegetables.length === 0) return;

    const trimmedName = (buyerReqName || currentUser?.name || 'Valued Buyer').trim();
    const trimmedPhone = (buyerReqPhone || currentUser?.phone || '0917 000 0000').trim();
    const trimmedSlot = buyerReqSlot.trim() || 'Store Depot Pickup';

    setIsSubmittingRequest(true);

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
      status: 'pending', // Step 1: Buyer request submitted, awaits Admin processing (Step 2)
      createdAt: new Date().toISOString(),
      farmerId: 'admin-main',
      farmName: 'VeggieConnect Central Market',
      paymentMethod: 'Over-the-Counter Cash at Depot',
      notes: `Buyer Purchase Request (Buyer-Led Workflow): Details ${orderItems.length} specific vegetable lot(s) requested for Admin inventory verification and fulfillment.`,
    };

    setTimeout(() => {
      setIsSubmittingRequest(false);
      setRequestSuccessMsg(`Purchase Request #${newRequestOrder.id} submitted to Admin!`);
      if (onOrderPlaced) {
        onOrderPlaced(newRequestOrder);
      }
      setTimeout(() => {
        setShowRequestModal(false);
        setRequestSuccessMsg(null);
      }, 1400);
    }, 500);
  };

  return (
    <div className="flex flex-col space-y-4 p-3.5 pb-8 w-full">
      {/* Buyer-Led Workflow Explainer Banner & Primary Request Trigger */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 text-white rounded-3xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center text-emerald-200">
              <FileText className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="font-black text-sm text-white">Buyer-Led Vegetable Requests</h3>
              <p className="text-[10px] text-emerald-200 font-medium">
                Submit specific vegetables &amp; quantities directly to Admin
              </p>
            </div>
          </div>
          <span className="text-[9px] font-bold bg-emerald-700/80 text-emerald-200 px-2 py-0.5 rounded-full border border-emerald-600/60">
            Step 1: Buyer Request
          </span>
        </div>

        <p className="text-[11px] text-emerald-100/90 leading-relaxed bg-emerald-950/40 p-2.5 rounded-2xl border border-emerald-800/60">
          Need specific vegetables in bulk or exact quantities? Submit a purchase request directly to the Admin. The Admin reviews your request, verifies warehouse Stocks, and fulfills your order!
        </p>

        <button
          id="btn-open-buyer-request-modal"
          onClick={() => setShowRequestModal(true)}
          className="w-full py-2.5 px-3 bg-white hover:bg-emerald-50 text-emerald-900 font-extrabold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
        >
          <FileText className="w-4 h-4 text-emerald-700" />
          <span>Submit Vegetable Purchase Request (Step 1) →</span>
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
              {(['freshness', 'price_low', 'distance'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSortBy(s)}
                  className={`min-h-[34px] px-2.5 py-1 rounded-xl text-[11px] font-bold cursor-pointer transition-all ${
                    sortBy === s
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200/70 hover:bg-emerald-100'
                  }`}
                >
                  {s === 'freshness' ? 'Freshness' : s === 'price_low' ? 'Price: Low' : 'Distance'}
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
              onAddToCart={onAddToCart}
              isInCart={cartItemIds.has(produce.id)}
              isBuyer={isBuyer}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white border border-emerald-100 rounded-3xl p-8 text-center space-y-3 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto text-2xl">
            🥬
          </div>
          <h3 className="text-base font-bold text-emerald-950 font-display">No Vegetables Currently Listed</h3>
          <p className="text-xs text-neutral-600 max-w-xs mx-auto leading-relaxed">
            You don't have to wait! Submit your purchase request detailing the exact vegetables and quantities you need directly to the Admin.
          </p>
          <button
            onClick={() => setShowRequestModal(true)}
            className="min-h-[44px] px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-xs inline-flex items-center gap-1.5"
          >
            <FileText className="w-4 h-4" />
            <span>Submit Vegetable Purchase Request</span>
          </button>
        </div>
      )}

      {/* STEP 1: SUBMIT VEGETABLE PURCHASE REQUEST MODAL */}
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
                    Step 1: Detail Vegetables &amp; Quantities to Admin
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowRequestModal(false)}
                className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Workflow steps indicator */}
            <div className="grid grid-cols-4 gap-1 text-center text-[9px] font-bold">
              <div className="bg-emerald-600 text-white py-1.5 rounded-lg">
                1. Buyer Request ✓
              </div>
              <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 py-1.5 rounded-lg">
                2. Admin Processing
              </div>
              <div className="bg-neutral-100 text-neutral-500 py-1.5 rounded-lg">
                3. Check Stocks
              </div>
              <div className="bg-neutral-100 text-neutral-500 py-1.5 rounded-lg">
                4. Fulfillment
              </div>
            </div>

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
                            className="w-5 h-5 rounded bg-emerald-600 text-white font-bold flex items-center justify-center text-xs cursor-pointer shadow-2xs"
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
                  <span>Submit Purchase Request to Admin (Step 1)</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
