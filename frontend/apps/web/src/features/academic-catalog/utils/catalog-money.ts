import { makeMoney, zeroMoney, type Money } from "@/shared/utils/money"

/**
 * Catalog money mechanics.
 *
 * Catalog prices are the head of the chain that ends in a student's balance: a
 * price flows into an Admissions financial revision and then into a Student
 * Finance invoice, which derives every figure in integer minor units. A `number`
 * here would put a float at the start of that chain, so the catalog carries the
 * same decimal-string `Money` as every other module.
 *
 * Currency and precision are seeded configuration, published through
 * `CatalogLookups` so a future administration source can replace them without
 * touching a screen.
 */

export const CATALOG_CURRENCY = "EGP"
export const CATALOG_PRECISION = 2

/** Builds a catalog `Money` from a decimal string. */
export function catalogMoney(amount: string): Money {
  return makeMoney(amount, CATALOG_CURRENCY, CATALOG_PRECISION)
}

/** A fresh zero, so form defaults never share one object across nine fields. */
export function zeroCatalogMoney(): Money {
  return zeroMoney(CATALOG_CURRENCY, CATALOG_PRECISION)
}
