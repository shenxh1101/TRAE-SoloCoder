import type { Booth, PricingResult } from '../types';

export function calculateDynamicPrice(
  booth: Booth,
  selectedDate: Date,
  currentDemand: number,
  adjacentBooths: Booth[] = [],
  selectedAdjacentIds: string[] = []
): PricingResult {
  const popularityMultiplier = 1 + (booth.popularityScore - 0.5) * 0.3;
  const dayOfWeek = selectedDate.getDay();
  const isPeakDay = dayOfWeek >= 1 && dayOfWeek <= 5;
  const dateMultiplier = isPeakDay ? 1.2 : 0.9;
  const demandMultiplier = 1 + (currentDemand / 100) * 0.4;

  const basePrice = booth.basePrice;
  const priceBeforeDiscount = basePrice * popularityMultiplier * dateMultiplier * demandMultiplier;

  const hasAdjacentDiscount = selectedAdjacentIds.length > 0 && 
    selectedAdjacentIds.some(id => booth.adjacentBooths.includes(id));
  const discount = hasAdjacentDiscount ? priceBeforeDiscount * 0.15 : 0;

  const finalPrice = priceBeforeDiscount - discount;

  const recommendedAdjacent = adjacentBooths
    .filter(adj => 
      booth.adjacentBooths.includes(adj.id) && 
      adj.status === 'available' &&
      !selectedAdjacentIds.includes(adj.id)
    )
    .map(adj => {
      const adjPopularityMultiplier = 1 + (adj.popularityScore - 0.5) * 0.3;
      const adjPriceBeforeDiscount = adj.basePrice * adjPopularityMultiplier * dateMultiplier * demandMultiplier;
      const adjDiscount = adjPriceBeforeDiscount * 0.15;
      const adjFinalPrice = adjPriceBeforeDiscount - adjDiscount;
      
      const combinedPrice = finalPrice + adjFinalPrice;
      const originalCombinedPrice = priceBeforeDiscount + adjPriceBeforeDiscount;
      const saving = originalCombinedPrice - combinedPrice;

      return {
        booth: adj,
        combinedPrice: Math.round(combinedPrice * 100) / 100,
        saving: Math.round(saving * 100) / 100
      };
    })
    .slice(0, 3);

  return {
    basePrice: Math.round(basePrice * 100) / 100,
    popularityMultiplier: Math.round(popularityMultiplier * 1000) / 1000,
    dateMultiplier: Math.round(dateMultiplier * 1000) / 1000,
    demandMultiplier: Math.round(demandMultiplier * 1000) / 1000,
    discount: Math.round(discount * 100) / 100,
    finalPrice: Math.round(finalPrice * 100) / 100,
    recommendedAdjacent
  };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 2,
  }).format(amount);
}
