import type { OrganizationProfile } from "../types/domain"

/**
 * The organization's own identity, owned by code.
 *
 * This is deliberately **not** administrable from the panel. There is exactly one
 * organization, its identity changes at most once in the product's life, and an
 * editor for it would be a permanent surface for an accidental, org-wide change —
 * with no second organization to compare against and notice. It is configuration,
 * so it lives in configuration.
 *
 * The panel reads it and renders it; nothing writes it. To change it, change this
 * file. The Settings service exposes no `updateProfile` for the same reason, and
 * there is no `settings.organization.update` permission to grant.
 *
 * `logo` and `cover` are absent rather than empty: no asset is configured yet, and
 * an empty `FileAsset` would claim one exists.
 */
export const ORGANIZATION_PROFILE: OrganizationProfile = {
  id: "org-1" as OrganizationProfile["id"],
  organizationId: "org-1",
  version: 1,

  name: "Alsalam Academy",
  nameAr: "أكاديمية السلام المهنية",
  nameEn: "Alsalam Professional Academy",
  description: "نطوّر المهارات ونبني مستقبلًا مهنيًا أكثر ثقة.",

  contacts: [
    {
      id: "contact-1",
      type: "phone",
      label: "الهاتف الرئيسي",
      value: "+201000000000",
      isPrimary: true,
    },
    {
      id: "contact-2",
      type: "email",
      label: "البريد الرئيسي",
      value: "info@alsalam.academy",
      isPrimary: true,
    },
  ],

  website: "https://alsalam.academy",
  address: "القاهرة، جمهورية مصر العربية",
  country: "EG",
  city: "القاهرة",
  timeZone: "Africa/Cairo",
  currency: "EGP",
  languages: ["ar"],
  defaultLanguage: "ar",

  createdAt: "2026-01-01T08:00:00.000Z",
  createdBy: "system",
  updatedAt: "2026-01-01T08:00:00.000Z",
  updatedBy: "system",
}
