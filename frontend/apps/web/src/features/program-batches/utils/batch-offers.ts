import type { BatchOffer } from "../types/domain"
export const validateOffer = (offer: BatchOffer) =>
  Number(offer.value) > 0 &&
  (offer.valueType !== "percentage" || Number(offer.value) <= 100) &&
  (!offer.validFrom || !offer.validTo || offer.validFrom <= offer.validTo)
