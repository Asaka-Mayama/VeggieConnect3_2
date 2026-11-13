import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  Store,
  Truck,
  ShieldCheck,
  CheckCircle2,
  MapPin,
  Calendar,
  User,
  Phone,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { CartItem, Order, OrderItem, UserProfile } from '../types';
import { farmerUnitPrice, withAdminCommission } from '../utils/pricing';

interface CartDrawerProps {
  cart: CartItem[];
  currentUser?: UserProfile | null;
  onUpdateQuantity: (produceId: string, quantity: number) => void;
  onRemoveItem: (produceId: string) => void;
  onClearCart: () => void;
  onOrderPlaced: (order: Order) => void;
  onClose: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  cart,
  currentUser,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onOrderPlaced,
  onClose,
}) => {
  const [buyerName, setBuyerName] = useState(currentUser?.name || '');
  const [buyerPhone, setBuyerPhone] = useState(currentUser?.phone || '');
  const [pickupSlot, setPickupSlot] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync state if currentUser changes
  useEffect(() => {
    if (currentUser) {
      if (currentUser.name && !buyerName) setBuyerName(currentUser.name);
      if (currentUser.phone && !buyerPhone) setBuyerPhone(currentUser.phone);
    }
  }, [currentUser]);

  // Subtotal calculation — buyers pay the market price: farmer asking price
  // plus the Admin's per-kg commission (wholesale discount applies on top).
  const subtotal = cart.reduce((sum, item) => {
    const marketUnit = withAdminCommission(item.produce.pricePerUnit);
    const unitPrice =
      item.produce.bulkDiscount && item.quantity >= item.produce.bulkDiscount.minQty
        ? Math.round(marketUnit * (1 - item.produce.bulkDiscount.discountPercent / 100) * 100) / 100
        : marketUnit;
    return sum + unitPrice * item.quantity;
  }, 0);

  const totalAmount = subtotal;

  const handleCheckout = () => {
    if (cart.length === 0) return;
    setErrorMessage(null);

    const trimmedName = buyerName.trim();
    const trimmedPhone = buyerPhone.trim();
    const trimmedPickupSlot = pickupSlot.trim();

    if (!trimmedName) {
      setErrorMessage('Please enter your Name so the Admin knows who submitted this purchase request.');
      return;
    }

    if (!trimmedPhone) {
      setErrorMessage('Please enter your Mobile Phone number for order updates.');
      return;
    }

    if (!trimmedPickupSlot) {
      setErrorMessage('Please type your preferred Pickup Time / Delivery Slot (e.g., Today at 3:00 PM).');
      return;
    }

    setIsSubmitting(true);

    const orderItems: OrderItem[] = cart.map((item) => {
      const farmgateUnit = farmerUnitPrice(item.produce);
      // Buyer pays the market per-kg price (farmgate + Admin commission);
      // the wholesale discount, when active, applies on that market price.
      const marketUnit = withAdminCommission(farmgateUnit);
      const paidUnit =
        item.produce.bulkDiscount && item.quantity >= item.produce.bulkDiscount.minQty
          ? Math.round(marketUnit * (1 - item.produce.bulkDiscount.discountPercent / 100) * 100) / 100
          : marketUnit;
      return {
        produceId: item.produce.id,
        produceName: item.produce.name,
        imageUrl: item.produce.imageUrl,
        unitPrice: paidUnit,
        pricePerUnit: paidUnit,
        farmgateUnitPrice: farmgateUnit,
        unit: item.produce.unit || 'kg',
        quantity: item.quantity,
        farmName: 'VeggieConnect Central Market',
        farmerId: 'admin-main',
      };
    });

    // Admin commission per kg = market price − farmer asking price.
    const farmgateCostTotal = Math.round(orderItems.reduce((s, it) => s + (it.farmgateUnitPrice || 0) * (it.quantity || 0), 0) * 100) / 100;
    const adminCommissionTotal = Math.round((subtotal - farmgateCostTotal) * 100) / 100;

    // Buyer Request: Buyer submits a request/order to the Admin detailing vegetables & quantities
    const newOrder: Order = {
      id: `VC-REQ-${Math.floor(1000 + Math.random() * 9000)}`,
      buyerId: currentUser?.id || 'user-buyer-1',
      buyerName: trimmedName,
      buyerPhone: trimmedPhone,
      sellerStoreName: 'VeggieConnect Central Market',
      brokerHubName: 'VeggieConnect Central Market',
      deliveryType: 'farm_pickup',
      pickupSlot: trimmedPickupSlot,
      items: orderItems,
      subtotal,
      deliveryFee: 0,
      totalAmount,
      farmgateCostTotal,
      adminCommissionTotal,
      status: 'pending', // Buyer Request Submitted, waiting for Admin Processing
      createdAt: new Date().toISOString(),
      farmerId: 'admin-main',
      farmName: 'VeggieConnect Central Market',
      paymentMethod: 'Over-the-Counter Cash at Depot',
      notes: `Buyer Purchase Request detailing ${orderItems.length} vegetable item(s) for Admin inventory verification and fulfillment.`,
    };

    setTimeout(() => {
      setIsSubmitting(false);
      onOrderPlaced(newOrder);
      onClearCart();
    }, 450);
  };

  return (
    <div className="flex flex-col min-h-full bg-emerald-50/40 p-3.5 relative">
      {/* Title Header */}
      <div className="flex items-center justify-between border-b border-emerald-200/80 pb-3 mb-3.5 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-800">
            <ShoppingBag className="w-4 h-4 text-emerald-700" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-emerald-950 font-display">
              Vegetable Purchase Request ({cart.reduce((s, i) => s + i.quantity, 0)} items)
            </h2>
            <p className="text-[10px] text-emerald-700 font-bold">
              Review your basket before submitting to the Admin
            </p>
          </div>
        </div>
        {cart.length > 0 && (
          <button
            id="btn-clear-cart"
            onClick={onClearCart}
            className="min-h-[36px] px-2.5 py-1 text-xs text-neutral-500 hover:text-red-600 transition-colors flex items-center gap-1 font-semibold cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" /> Clear All
          </button>
        )}
      </div>

      {cart.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-3 my-auto bg-white border border-emerald-100 rounded-3xl shadow-xs">
          <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-3xl">
            🧺
          </div>
          <h3 className="text-base font-bold text-emerald-950 font-display">Your Basket is Empty</h3>
          <p className="text-xs text-neutral-600 max-w-xs leading-relaxed">
            Browse available vegetables in the catalog and add the specific vegetables and quantities you want to request!
          </p>
          <button
            id="btn-explore-harvests-empty"
            onClick={onClose}
            className="min-h-[44px] px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors shadow-xs cursor-pointer"
          >
            Explore Vegetable Catalog
          </button>
        </div>
      ) : (
        <div className="flex flex-col space-y-3.5 pb-4 flex-1">
          {/* Items listed under VeggieConnect Central Market (Farmer identities anonymous) */}
          <div className="bg-white border border-emerald-200/85 rounded-2xl p-3.5 space-y-3 shadow-xs">
            <div className="flex items-center justify-between text-xs border-b border-emerald-100 pb-2">
              <div className="flex items-center gap-1.5 font-extrabold text-emerald-900">
                <Store className="w-4 h-4 text-emerald-700" />
                <span>VeggieConnect Central Market • Negros Oriental</span>
              </div>
              <span className="text-[10px] bg-emerald-100 text-emerald-900 border border-emerald-300 px-2.5 py-0.5 rounded-full font-bold">
                Admin Fulfillment
              </span>
            </div>

            <div className="space-y-2.5">
              {cart.map(({ produce, quantity }) => {
                const bulkActive = Boolean(produce.bulkDiscount && quantity >= produce.bulkDiscount.minQty);
                const marketUnit = withAdminCommission(produce.pricePerUnit);
                const itemUnitPrice = bulkActive
                  ? Math.round(marketUnit * (1 - produce.bulkDiscount!.discountPercent / 100) * 100) / 100
                  : marketUnit;
                const lineTotal = (itemUnitPrice * quantity).toFixed(2);

                return (
                  <div
                    key={produce.id}
                    className="flex items-center justify-between gap-3 text-xs bg-emerald-50/50 p-2 rounded-xl border border-emerald-200/70"
                  >
                      <img
                        src={produce.imageUrl}
                        alt={produce.name}
                        className="w-12 h-12 rounded-xl object-cover bg-emerald-100 flex-shrink-0"
                      />

                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-emerald-950 truncate text-xs">{produce.name}</h4>
                        <div className="text-[11px] text-neutral-500 font-medium mt-0.5">
                          ₱{itemUnitPrice.toFixed(2)} / kg
                          {bulkActive && (
                            <span className="ml-1.5 text-emerald-700 text-[10px] font-bold">
                              ({produce.bulkDiscount!.discountPercent}% Wholesale)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Quantity Stepper */}
                      <div className="flex items-center gap-1 bg-white border border-emerald-200 rounded-xl p-0.5 shadow-2xs">
                        <button
                          onClick={() => {
                            if (quantity <= 1) {
                              onRemoveItem(produce.id);
                            } else {
                              onUpdateQuantity(produce.id, quantity - 1);
                            }
                          }}
                          className="w-7 h-7 rounded-lg flex items-center justify-center bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-bold cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
                        </button>
                        <span className="w-6 text-center font-extrabold text-emerald-950 text-xs">{quantity}</span>
                        <button
                          onClick={() => onUpdateQuantity(produce.id, quantity + 1)}
                          disabled={quantity >= produce.stockQuantity}
                          className="w-7 h-7 rounded-lg flex items-center justify-center bg-emerald-50 hover:bg-emerald-100 disabled:opacity-30 text-emerald-900 font-bold cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                        </button>
                      </div>

                      <div className="w-16 text-right font-black text-emerald-900 text-xs">
                        ₱{lineTotal}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          {/* Fulfillment Option */}
          <div className="bg-white border border-emerald-200/85 rounded-2xl p-3.5 space-y-3 shadow-xs">
            <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
              <Store className="w-4 h-4 text-emerald-700" />
              1. Fulfillment Option
            </h4>
            
            <div className="p-3 bg-emerald-50 border border-emerald-600 rounded-xl text-xs space-y-1 text-emerald-950 font-bold ring-1 ring-emerald-600">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-emerald-950">Store Depot Pickup</span>
                <span className="text-[10px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-full">
                  FREE PICKUP
                </span>
              </div>
              <p className="text-[11px] text-neutral-600 font-normal">
                Pick up and pay physically at the VeggieConnect Central Supermarket Store Depot.
              </p>
            </div>

            <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-200 text-xs space-y-1.5">
              <label className="flex items-center gap-1 text-emerald-900 font-bold">
                <Calendar className="w-3.5 h-3.5 text-emerald-700" /> Pickup Time Window
              </label>
              <input
                type="text"
                value={pickupSlot}
                onChange={(e) => setPickupSlot(e.target.value)}
                placeholder="Type preferred pickup time (e.g. Today at 3:00 PM or Tomorrow 10 AM)"
                className="w-full min-h-[44px] bg-white border border-emerald-200 rounded-xl px-3 py-2 text-xs text-emerald-950 focus:outline-none focus:border-emerald-600 font-medium"
              />
            </div>
          </div>

          {/* Buyer Details */}
          <div className="bg-white border border-emerald-200/85 rounded-2xl p-3.5 space-y-3 shadow-xs">
            <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
              2. Buyer Contact Information
            </h4>
            <div className="grid grid-cols-1 gap-2.5">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-emerald-900 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-emerald-700" /> Full Name / Business Name
                </label>
                <input
                  type="text"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  placeholder="Enter your name (e.g. Maria Santos)"
                  className="w-full min-h-[44px] bg-emerald-50/30 border border-emerald-200 rounded-xl px-3 py-2 text-xs text-emerald-950 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-emerald-900 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-emerald-700" /> Mobile / GCash Number
                </label>
                <input
                  type="tel"
                  value={buyerPhone}
                  onChange={(e) => setBuyerPhone(e.target.value)}
                  placeholder="0917 123 4567"
                  className="w-full min-h-[44px] bg-emerald-50/30 border border-emerald-200 rounded-xl px-3 py-2 text-xs text-emerald-950 focus:outline-none focus:border-emerald-600 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Cost Breakdown */}
          <div className="bg-white border border-emerald-200/85 rounded-2xl p-3.5 space-y-2 text-xs shadow-xs">
            <div className="flex justify-between text-neutral-600">
              <span>Produce Subtotal</span>
              <span className="text-emerald-950 font-bold">₱{subtotal.toFixed(2)}</span>
            </div>
            <div className="border-t border-emerald-100 pt-2 flex justify-between text-sm font-black text-emerald-950">
              <span>Total Direct Payment</span>
              <span className="text-emerald-700 font-black">₱{totalAmount.toFixed(2)}</span>
            </div>
            <p className="text-[11px] text-neutral-500 font-medium pt-1 border-t border-dashed border-emerald-100">
              💳 Payment: Over-the-Counter Physical Cash upon Pickup at Store Depot.
            </p>
          </div>

          {/* Error Message if any */}
          {errorMessage && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-3 text-xs text-red-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Sticky Bottom Order Bar */}
          <div className="sticky bottom-0 -mx-3.5 -mb-3.5 mt-2 bg-white/95 backdrop-blur-md border-t border-emerald-200/90 p-4 z-30 shadow-[0_-8px_24px_rgba(0,0,0,0.06)]">
            <div className="flex items-center justify-between gap-3 mb-2.5">
              <div>
                <span className="text-[10px] uppercase font-bold text-neutral-500 block tracking-wider">
                  Total Direct Payment
                </span>
                <div className="text-xl font-black text-emerald-950">
                  ₱{totalAmount.toFixed(2)}
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-neutral-500 block">Fulfillment</span>
                <span className="text-xs font-bold text-emerald-800">
                  Store Depot Pickup
                </span>
              </div>
            </div>

            <button
              id="btn-confirm-direct-order"
              onClick={handleCheckout}
              disabled={isSubmitting || cart.length === 0}
              className="w-full min-h-[48px] py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Submitting Request to Admin...
                </span>
              ) : (
                <>
                  <span>Submit Purchase Request to Admin • ₱{totalAmount.toFixed(2)}</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
