import React from 'react';
import { Flame, Sprout, FileText } from 'lucide-react';
import { ProduceItem } from '../types';

/**
 * Buyer-facing origin — province level only ("Negros Oriental").
 * Farmers are anonymous: no farmer names, farm names, or "(Farmer)" text.
 */
export const getBuyerOriginLabel = (): string => 'Negros Oriental';

/** "Harvested Today" shows only when the admin displayed/stocked the item today. */
export const isStockedToday = (produce: ProduceItem): boolean => {
  const ref = (produce as any).boughtAt || (produce as any).createdAt;
  if (ref) {
    const d = new Date(ref);
    if (!isNaN(d.getTime())) {
      const now = new Date();
      return (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate()
      );
    }
  }
  return (produce.harvestStatus || '') === 'Harvested Today';
};

interface ProduceCardProps {
  produce: ProduceItem;
  onSelect: (produce: ProduceItem) => void;
  /** Buyer action: request THIS crop from the Admin (request-only market). */
  onRequestProduct: (produce: ProduceItem) => void;
  isBuyer?: boolean;
}

export const ProduceCard: React.FC<ProduceCardProps> = ({
  produce,
  onSelect,
  onRequestProduct,
  isBuyer = true,
}) => {
  if (!produce) return null;

  const price = typeof produce.pricePerUnit === 'number' ? produce.pricePerUnit : parseFloat(produce.pricePerUnit) || 0;
  const stock = typeof produce.stockQuantity === 'number' ? produce.stockQuantity : parseInt(produce.stockQuantity as any, 10) || 0;
  const name = produce.name || 'Fresh Produce';
  const imageUrl = produce.imageUrl || 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80';
  // Buyer view: farmer identities are hidden. "Harvested Today" appears only
  // when the admin put the item on display today — otherwise no badge at all.
  const showHarvestedToday = isBuyer ? isStockedToday(produce) : (produce.harvestStatus || '') === 'Harvested Today';
  const originLabel = getBuyerOriginLabel();

  return (
    <div
      id={`produce-card-${produce.id}`}
      onClick={() => onSelect(produce)}
      className="group bg-white rounded-2xl border border-emerald-200/80 overflow-hidden hover:border-emerald-500 hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col shadow-xs"
    >
      {/* Image Container */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-emerald-50">
        <img
          src={imageUrl}
          alt={name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80';
          }}
        />

        {/* Gradient Overlay for badges */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />

        {/* Harvest Status Badge — buyers see "Harvested Today" only when the
            admin displayed the item today; no badge otherwise. Never shows
            "Fresh Picked on Order" or farmer-side statuses. */}
        {showHarvestedToday && (
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-md flex items-center gap-1 shadow-xs bg-emerald-600 text-white">
              <Flame className="w-3 h-3 text-amber-300 fill-amber-300" />
              Harvested Today
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3 flex-1 flex flex-col justify-between">
        <div>
          {/* Sourcing — buyers see province-level origin only. Farmer and farm
              names are never shown to buyers (Admin is the middleman). */}
          <div className="flex items-center justify-between gap-1 text-[11px] text-emerald-800 mb-0.5">
            <span className="truncate font-bold">
              {isBuyer ? `Fresh from ${originLabel}` : produce.farmName || 'Local Farm'}
            </span>
          </div>

          {/* Produce Name — variety hidden from buyers */}
          <h3 className="font-bold text-sm text-emerald-950 line-clamp-1 group-hover:text-emerald-700 transition-colors">
            {name}
          </h3>

          {/* Origin line for buyers — province only, farmers anonymous */}
          {isBuyer && (
            <div className="flex items-center gap-1 text-[10px] text-neutral-500 mt-1.5">
              <Sprout className="w-3 h-3 text-emerald-600" />
              <span className="truncate">Farmer harvest, {originLabel}</span>
            </div>
          )}
        </div>

        {/* Pricing & Request Action */}
        <div className="mt-2.5 pt-2 border-t border-emerald-100 flex items-center justify-between">
          <div>
            <div className="flex items-baseline gap-0.5">
              <span className="text-base font-black text-emerald-950">
                ₱{price.toFixed(2)}
              </span>
              <span className="text-[11px] text-neutral-500 font-medium">
                /{produce.unit || 'kg'}
              </span>
            </div>
            <span className="text-[10px] text-emerald-700 font-semibold block">
              {stock > 0 ? `${stock} ${produce.unit || 'kg'} available` : 'Sold out'}
            </span>
          </div>

          {isBuyer && (
            <button
              id={`btn-request-${produce.id}`}
              onClick={(e) => {
                e.stopPropagation();
                onRequestProduct(produce);
              }}
              disabled={stock === 0}
              className="min-h-[40px] px-3 rounded-xl flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold text-[11px] transition-all duration-150 active:scale-90 cursor-pointer shadow-xs"
              title="Request this crop"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Request</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
