import type { ShopProduct, ShopService, ShopSettings, ShopSpecialist } from "@/domain/shop";
import type { Locale } from "@/lib/i18n/locales";

/**
 * schema.org builders for the storefront (pure; unit-tested). Nodes that
 * other nodes reference carry a stable `@id` on the site origin
 * (`#organization`, `#clinic`, `#website`), so one page can point at the
 * clinic without repeating it.
 */

export type JsonLdNode = Record<string, unknown>;

/**
 * `JSON.stringify` made safe inside `<script>`: `<` (closing tags, comments),
 * `>` and `&` become unicode escapes, and so do U+2028/U+2029 (line
 * terminators in older JavaScript parsers). The result is still valid JSON.
 */
export function serializeJsonLd(data: JsonLdNode | JsonLdNode[]): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function compact<T extends JsonLdNode>(node: T): T {
  return Object.fromEntries(
    Object.entries(node).filter(
      ([, value]) =>
        value !== undefined &&
        value !== null &&
        value !== "" &&
        !(Array.isArray(value) && value.length === 0),
    ),
  ) as T;
}

export function ids(origin: string) {
  return {
    organization: `${origin}/#organization`,
    clinic: `${origin}/#clinic`,
    website: `${origin}/#website`,
  };
}

function phones(settings: ShopSettings): string[] {
  return [settings.supportPhone, settings.storePhone, settings.cosmetologistPhone].filter(
    (phone): phone is string => Boolean(phone),
  );
}

function postalAddress(address: string): JsonLdNode | undefined {
  if (!address) return undefined;
  return {
    "@type": "PostalAddress",
    streetAddress: address,
    addressLocality: "Toshkent",
    addressCountry: "UZ",
  };
}

export function organizationLd(input: { origin: string; settings: ShopSettings }): JsonLdNode {
  const { origin, settings } = input;
  return compact({
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ids(origin).organization,
    name: "Glow Derma",
    url: origin,
    logo: `${origin}/apple-icon.png`,
    sameAs: [settings.telegramUrl, settings.instagramUrl].filter(Boolean),
    contactPoint: settings.supportPhone
      ? [
          {
            "@type": "ContactPoint",
            telephone: settings.supportPhone,
            contactType: "customer service",
            areaServed: "UZ",
            availableLanguage: ["uz", "ru", "en"],
          },
        ]
      : undefined,
  });
}

export function clinicLd(input: {
  origin: string;
  settings: ShopSettings;
  location?: { latitude: number | null; longitude: number | null } | null;
  /** Configured fallbacks (`clinic-facts.ts`). */
  facts?: {
    openingHours: ReadonlyArray<JsonLdNode>;
    geo: { latitude: number; longitude: number } | null;
  };
}): JsonLdNode {
  const { origin, settings, location, facts } = input;
  const point =
    location && location.latitude !== null && location.longitude !== null
      ? { latitude: location.latitude, longitude: location.longitude }
      : (facts?.geo ?? null);
  const geo = point ? { "@type": "GeoCoordinates", ...point } : undefined;
  return compact({
    "@context": "https://schema.org",
    "@type": ["MedicalClinic", "Store"],
    "@id": ids(origin).clinic,
    name: "Glow Derma",
    url: origin,
    image: `${origin}/og.png`,
    telephone: phones(settings)[0],
    address: postalAddress(settings.pickupAddress),
    geo,
    openingHoursSpecification: facts?.openingHours.length ? [...facts.openingHours] : undefined,
    medicalSpecialty: ["Dermatology"],
    currenciesAccepted: "UZS",
    parentOrganization: { "@id": ids(origin).organization },
  });
}

export function websiteLd(input: {
  origin: string;
  /** The language's home URL (`/`, `/ru`, `/en`). */
  url: string;
  locale: Locale;
  name: string;
  searchUrlTemplate: string;
}): JsonLdNode {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    // One node per language: the same @id with three names/URLs would merge
    // into one contradictory entity (U14).
    "@id": `${input.url.replace(/\/$/, "")}/#website`,
    name: input.name,
    url: input.url,
    inLanguage: input.locale,
    publisher: { "@id": ids(input.origin).organization },
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: input.searchUrlTemplate },
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbLd(items: ReadonlyArray<{ name: string; url: string }>): JsonLdNode {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function productLd(input: {
  origin: string;
  product: ShopProduct;
  url: string;
  description: string;
}): JsonLdNode {
  const { product } = input;
  const images = product.images.length
    ? product.images.map((image) => image.url)
    : product.imageUrl
      ? [product.imageUrl]
      : [];
  return compact({
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${input.url}#product`,
    name: product.name,
    description: input.description,
    image: images,
    sku: product.sku ?? undefined,
    category: product.category?.name,
    brand: product.brand ? { "@type": "Brand", name: product.brand } : undefined,
    size: product.volume || undefined,
    url: input.url,
    offers: {
      "@type": "Offer",
      url: input.url,
      price: product.price,
      priceCurrency: "UZS",
      availability: product.inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@id": ids(input.origin).organization },
    },
  });
}

export function itemListLd(urls: ReadonlyArray<string>): JsonLdNode {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: urls.map((url, index) => ({ "@type": "ListItem", position: index + 1, url })),
  };
}

export function specialistLd(input: {
  origin: string;
  specialist: ShopSpecialist;
  url: string;
}): JsonLdNode {
  const { specialist, origin } = input;
  const address = postalAddress(specialist.location.address);
  const services = specialist.services.map((service) => ({
    "@type": "MedicalProcedure",
    name: service.name,
  }));
  if (specialist.role === "dermatologist") {
    return compact({
      "@context": "https://schema.org",
      "@type": "Physician",
      "@id": `${input.url}#specialist`,
      name: specialist.name,
      url: input.url,
      image: specialist.photoUrl ?? undefined,
      description: specialist.bio || undefined,
      medicalSpecialty: "Dermatology",
      address,
      telephone: specialist.location.phone ?? undefined,
      availableService: services,
      parentOrganization: { "@id": ids(origin).clinic },
    });
  }
  return compact({
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": `${input.url}#specialist`,
    name: specialist.name,
    url: input.url,
    image: specialist.photoUrl ?? undefined,
    description: specialist.bio || undefined,
    jobTitle: specialist.roleLabel,
    knowsAbout: specialist.services.map((service) => service.name),
    worksFor: { "@id": ids(origin).clinic },
  });
}

export function serviceLd(input: {
  origin: string;
  service: ShopService;
  url: string;
}): JsonLdNode {
  const { service } = input;
  return compact({
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.name,
    description: service.description || undefined,
    serviceType: service.categoryLabel,
    url: input.url,
    provider: { "@id": ids(input.origin).clinic },
    areaServed: { "@type": "City", name: "Tashkent" },
    offers: {
      "@type": "Offer",
      priceCurrency: "UZS",
      price: service.priceFrom,
      priceSpecification: {
        "@type": "PriceSpecification",
        priceCurrency: "UZS",
        minPrice: service.priceFrom,
        maxPrice: service.priceTo,
      },
    },
  });
}
