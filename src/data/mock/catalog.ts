import type {
  CategoryId,
  ContentLanguage,
  Product,
  ProductArtRef,
  ProductTexts,
} from "@/domain/product";
import { emptySeo, productSeoStatus, slugifyName, type SeoTexts } from "@/domain/seo";

import { createRandom } from "./random";

/**
 * Mock catalog: the eight rows drawn on the products screen, ten more
 * hand-written products used by the sample orders, and generated products up
 * to the 248 shown in the design header.
 */

const EMPTY: ProductTexts = { name: "", description: "", ingredients: "", usage: "" };

const texts = (
  uz: Partial<ProductTexts>,
  ru: Partial<ProductTexts> = {},
  en: Partial<ProductTexts> = {},
): Record<ContentLanguage, ProductTexts> => ({
  uz: { ...EMPTY, ...uz },
  ru: { ...EMPTY, ...ru },
  en: { ...EMPTY, ...en },
});

const HYALURON_INCI =
  "Aqua, Sodium Hyaluronate, Hydrolyzed Hyaluronic Acid, Sodium Acetylated Hyaluronate, Panthenol, Glycerin, Allantoin, Betaine, 1,2-Hexanediol.";

const SERUM_IMAGES: Product["images"] = [
  { id: "img-1", label: "Asosiy rasm", art: { kind: "dropper" } },
  { id: "img-2", label: "Qadoq bilan", art: { kind: "box" } },
  { id: "img-3", label: "Tekstura", art: { kind: "texture" } },
];

interface Seed {
  billzId: string;
  billzName: string;
  volume: string;
  category: CategoryId | null;
  price: number;
  stock: number;
  art: ProductArtRef | null;
  texts: Record<ContentLanguage, ProductTexts>;
  promo?: boolean;
  status?: Product["status"];
  isNewFromBillz?: boolean;
  images?: Product["images"];
  lastChange?: Product["lastChange"];
  seo?: SeoTexts;
}

/** Rows exactly as they appear in the design, in display order. */
const DESIGN_PRODUCTS: Seed[] = [
  {
    billzId: "4607012301",
    billzName: "HYALURONIC SERUM 30ML",
    volume: "30 ml",
    category: "serums",
    price: 185_000,
    stock: 12,
    art: { kind: "dropper" },
    images: SERUM_IMAGES,
    seo: {
      uz: {
        title: "Gialuron kislotali serum 30 ml — namlantirish",
        description:
          "Uch xil gialuron kislotali yengil serum: terini chuqur namlaydi, tez so‘riladi. Toshkent bo‘ylab yetkazib berish.",
      },
      ru: { title: "Сыворотка с гиалуроновой кислотой", description: "" },
      en: { title: "", description: "" },
    },
    lastChange: {
      by: "Administrator",
      at: "2026-10-22T18:04:00+05:00",
      note: "narx 175 000 → 185 000",
    },
    texts: texts(
      {
        name: "Gialuron kislotali serum",
        description:
          "Gialuron kislotasining uch xil molekulasi terining turli qatlamlarini namlaydi. Yengil tekstura tez so‘riladi va yopishqoqlik qoldirmaydi.",
        ingredients: HYALURON_INCI,
        usage:
          "Tozalangan yuzga 2–3 tomchi surting va barmoq uchlari bilan yengil singdiring. So‘ngra namlantiruvchi krem qo‘llang.",
      },
      {
        name: "Сыворотка с гиалуроновой кислотой",
        description:
          "Три вида молекул гиалуроновой кислоты увлажняют разные слои кожи. Лёгкая текстура быстро впитывается и не оставляет липкости.",
        ingredients: HYALURON_INCI,
        usage:
          "Нанесите 2–3 капли на очищенную кожу и мягко распределите кончиками пальцев. Затем нанесите увлажняющий крем.",
      },
      { name: "Hyaluronic acid serum", ingredients: HYALURON_INCI },
    ),
  },
  {
    billzId: "4607012401",
    billzName: "SUN CREAM SPF50 50ML",
    volume: "50 ml",
    category: "sun",
    price: 240_000,
    stock: 8,
    promo: true,
    art: { kind: "tube" },
    texts: texts(
      { name: "Quyoshdan himoya kremi SPF 50" },
      { name: "Солнцезащитный крем SPF 50" },
      { name: "Sunscreen SPF 50" },
    ),
  },
  {
    billzId: "4607012388",
    billzName: "GENTLE FOAM 150ML",
    volume: "150 ml",
    category: "cleansing",
    price: 128_000,
    stock: 3,
    art: { kind: "pump" },
    texts: texts(
      { name: "Yumshoq tozalovchi ko‘pik" },
      { name: "Мягкая очищающая пенка" },
      { name: "Gentle cleansing foam" },
    ),
  },
  {
    billzId: "4607012345",
    billzName: "CERAMIDE CREAM 50ML",
    volume: "50 ml",
    category: "moisturizing",
    price: 312_000,
    stock: 5,
    art: { kind: "jar" },
    texts: texts(
      { name: "Seramidli namlantiruvchi krem" },
      { name: "Увлажняющий крем с керамидами" },
      { name: "Ceramide moisturising cream" },
    ),
  },
  {
    billzId: "4607012422",
    billzName: "NIACINAMIDE TONER 200ML",
    volume: "200 ml",
    category: "toners",
    price: 156_000,
    stock: 0,
    art: { kind: "toner" },
    texts: texts(
      { name: "Niatsinamidli toner" },
      { name: "Тонер с ниацинамидом" },
      { name: "Niacinamide toner" },
    ),
  },
  {
    billzId: "4607012399",
    billzName: "RETINOL NIGHT SERUM 30ML",
    volume: "30 ml",
    category: "serums",
    price: 276_000,
    stock: 6,
    art: { kind: "dropper", tone: "night" },
    texts: texts(
      { name: "Retinolli tungi serum" },
      { name: "Ночная сыворотка с ретинолом" },
      { name: "Retinol night serum" },
    ),
  },
  {
    billzId: "4607012455",
    billzName: "VIT C SERUM 20ML",
    volume: "20 ml",
    category: null,
    price: 230_000,
    stock: 14,
    status: "hidden",
    isNewFromBillz: true,
    art: null,
    texts: texts({}),
  },
  {
    billzId: "4607012366",
    billzName: "AZELAIC CREAM 40ML",
    volume: "40 ml",
    category: "moisturizing",
    price: 198_000,
    stock: 9,
    status: "hidden",
    art: { kind: "tube", tone: "dark-cap" },
    texts: texts(
      { name: "Azelain kislotali krem" },
      { name: "Крем с азелаиновой кислотой" },
      { name: "Azelaic acid cream" },
    ),
  },
];

/** Products referenced by the sample orders (prices chosen to match order totals). */
const SUPPORTING_PRODUCTS: Seed[] = [
  [
    "4607012410",
    "PANTHENOL BALM 50ML",
    "50 ml",
    "moisturizing",
    96_000,
    21,
    "tube",
    "Pantenolli tiklovchi balzam",
    "Восстанавливающий бальзам с пантенолом",
    "Panthenol repair balm",
  ],
  [
    "4607012411",
    "SALICYLIC GEL 200ML",
    "200 ml",
    "cleansing",
    142_000,
    17,
    "pump",
    "Salitsil kislotali tozalovchi gel",
    "Очищающий гель с салициловой кислотой",
    "Salicylic acid cleansing gel",
  ],
  [
    "4607012412",
    "CENTELLA CREAM 50ML",
    "50 ml",
    "moisturizing",
    214_000,
    11,
    "jar",
    "Sentella ekstraktli krem",
    "Крем с экстрактом центеллы",
    "Centella cream",
  ],
  [
    "4607012413",
    "MICELLAR WATER 400ML",
    "400 ml",
    "cleansing",
    89_000,
    34,
    "toner",
    "Mitsellyar suv",
    "Мицеллярная вода",
    "Micellar water",
  ],
  [
    "4607012414",
    "PEPTIDE EYE CREAM 20ML",
    "20 ml",
    "moisturizing",
    168_000,
    7,
    "tube",
    "Peptidli ko‘z atrofi kremi",
    "Крем для кожи вокруг глаз с пептидами",
    "Peptide eye cream",
  ],
  [
    "4607012415",
    "PEPTIDE SERUM 30ML",
    "30 ml",
    "serums",
    298_000,
    10,
    "dropper",
    "Peptidli serum",
    "Сыворотка с пептидами",
    "Peptide serum",
  ],
  [
    "4607012416",
    "HYALURON SHEET MASK",
    "1 dona",
    "moisturizing",
    45_000,
    120,
    "jar",
    "Gialuron kislotali niqob",
    "Маска с гиалуроновой кислотой",
    "Hyaluronic acid sheet mask",
  ],
  [
    "4607012417",
    "PANTHENOL LIP BALM",
    "10 ml",
    "moisturizing",
    39_000,
    58,
    "tube",
    "Pantenolli lab balzami",
    "Бальзам для губ с пантенолом",
    "Panthenol lip balm",
  ],
  [
    "4607012418",
    "SPF30 FLUID 40ML",
    "40 ml",
    "sun",
    205_000,
    13,
    "tube",
    "Quyoshdan himoya fluidi SPF 30",
    "Солнцезащитный флюид SPF 30",
    "Sun fluid SPF 30",
  ],
  [
    "4607012419",
    "ENZYME POWDER 50G",
    "50 g",
    "cleansing",
    174_000,
    9,
    "jar",
    "Fermentli tozalovchi pudra",
    "Энзимная пудра для умывания",
    "Enzyme cleansing powder",
  ],
].map(([billzId, billzName, volume, category, price, stock, kind, uz, ru, en]) => ({
  billzId: billzId as string,
  billzName: billzName as string,
  volume: volume as string,
  category: category as CategoryId,
  price: price as number,
  stock: stock as number,
  art: { kind: kind as ProductArtRef["kind"] },
  texts: texts({ name: uz as string }, { name: ru as string }, { name: en as string }),
}));

const INGREDIENTS: ReadonlyArray<[uz: string, ru: string, en: string]> = [
  ["Gialuron kislotali", "с гиалуроновой кислотой", "Hyaluronic acid"],
  ["Niatsinamidli", "с ниацинамидом", "Niacinamide"],
  ["Seramidli", "с керамидами", "Ceramide"],
  ["Retinolli", "с ретинолом", "Retinol"],
  ["Peptidli", "с пептидами", "Peptide"],
  ["Pantenolli", "с пантенолом", "Panthenol"],
  ["Sentella ekstraktli", "с центеллой", "Centella"],
  ["Salitsil kislotali", "с салициловой кислотой", "Salicylic acid"],
  ["Kollagenli", "с коллагеном", "Collagen"],
  ["Skvalanli", "со скваланом", "Squalane"],
  ["Aloe verali", "с алоэ вера", "Aloe vera"],
  ["Glikol kislotali", "с гликолевой кислотой", "Glycolic acid"],
  ["C vitaminli", "с витамином C", "Vitamin C"],
  ["Choy daraxti moyli", "с маслом чайного дерева", "Tea tree"],
  ["Probiotikli", "с пробиотиками", "Probiotic"],
  ["Azelain kislotali", "с азелаиновой кислотой", "Azelaic acid"],
  ["Fermentli", "с энзимами", "Enzyme"],
  ["Ko‘mirli", "с углём", "Charcoal"],
  ["Arbutinli", "с арбутином", "Arbutin"],
  ["Bakuchiolli", "с бакучиолом", "Bakuchiol"],
];

interface Form {
  uz: string;
  ru: string;
  en: string;
  category: CategoryId;
  art: ProductArtRef["kind"];
  volumes: number[];
  price: [number, number];
}

const FORMS: ReadonlyArray<Form> = [
  {
    uz: "serum",
    ru: "Сыворотка",
    en: "serum",
    category: "serums",
    art: "dropper",
    volumes: [15, 20, 30, 50],
    price: [150, 360],
  },
  {
    uz: "krem",
    ru: "Крем",
    en: "cream",
    category: "moisturizing",
    art: "jar",
    volumes: [30, 50, 75],
    price: [140, 340],
  },
  {
    uz: "tungi krem",
    ru: "Ночной крем",
    en: "night cream",
    category: "moisturizing",
    art: "jar",
    volumes: [50],
    price: [180, 380],
  },
  {
    uz: "toner",
    ru: "Тонер",
    en: "toner",
    category: "toners",
    art: "toner",
    volumes: [100, 150, 200],
    price: [110, 220],
  },
  {
    uz: "essensiya",
    ru: "Эссенция",
    en: "essence",
    category: "toners",
    art: "toner",
    volumes: [100, 150],
    price: [150, 280],
  },
  {
    uz: "tozalovchi gel",
    ru: "Очищающий гель",
    en: "cleansing gel",
    category: "cleansing",
    art: "pump",
    volumes: [150, 200],
    price: [90, 190],
  },
  {
    uz: "tozalovchi ko‘pik",
    ru: "Очищающая пенка",
    en: "cleansing foam",
    category: "cleansing",
    art: "pump",
    volumes: [120, 150],
    price: [90, 180],
  },
  {
    uz: "mitsellyar suv",
    ru: "Мицеллярная вода",
    en: "micellar water",
    category: "cleansing",
    art: "toner",
    volumes: [200, 400],
    price: [70, 150],
  },
  {
    uz: "quyoshdan himoya kremi",
    ru: "Солнцезащитный крем",
    en: "sunscreen",
    category: "sun",
    art: "tube",
    volumes: [50],
    price: [170, 290],
  },
  {
    uz: "ko‘z atrofi kremi",
    ru: "Крем для век",
    en: "eye cream",
    category: "moisturizing",
    art: "tube",
    volumes: [15, 20],
    price: [140, 260],
  },
  {
    uz: "niqob",
    ru: "Маска",
    en: "mask",
    category: "moisturizing",
    art: "jar",
    volumes: [50, 75, 100],
    price: [60, 190],
  },
  {
    uz: "balzam",
    ru: "Бальзам",
    en: "balm",
    category: "moisturizing",
    art: "tube",
    volumes: [30, 50],
    price: [60, 150],
  },
  {
    uz: "SPF 30 fluid",
    ru: "Флюид SPF 30",
    en: "SPF 30 fluid",
    category: "sun",
    art: "tube",
    volumes: [40, 50],
    price: [160, 260],
  },
];

const TOTAL_PRODUCTS = 248;

function generateProducts(count: number, taken: Set<string>): Seed[] {
  const random = createRandom(248);
  const combos = random.shuffle(
    INGREDIENTS.flatMap((ingredient) => FORMS.map((form) => ({ ingredient, form }))),
  );
  const seeds: Seed[] = [];
  let billz = 4607012500;
  for (const { ingredient, form } of combos) {
    if (seeds.length === count) break;
    const uz = `${ingredient[0]} ${form.uz}`;
    if (taken.has(uz)) continue;
    taken.add(uz);
    const volume = random.pick(form.volumes);
    const fullyTranslated = random.chance(0.55);
    seeds.push({
      billzId: String(billz++),
      billzName: `${ingredient[2]} ${form.en} ${volume}ML`.toUpperCase(),
      volume: `${volume} ml`,
      category: form.category,
      price: random.int(form.price[0], form.price[1]) * 1000,
      stock: random.int(1, 40),
      promo: random.chance(0.08),
      status: random.chance(0.05) ? "hidden" : "active",
      art: { kind: form.art, tone: random.chance(0.15) ? "dark-cap" : "default" },
      texts: texts(
        {
          name: uz,
          description: `${uz} — kundalik parvarish uchun.`,
          ingredients: "Aqua, Glycerin, Butylene Glycol, Panthenol, Allantoin.",
          usage: "Tozalangan teriga kuniga 1–2 marta qo‘llang.",
        },
        { name: `${form.ru} ${ingredient[1]}` },
        fullyTranslated ? { name: `${ingredient[2]} ${form.en}` } : {},
      ),
    });
  }
  return seeds;
}

function buildCatalog(): Product[] {
  const fixed = [...DESIGN_PRODUCTS, ...SUPPORTING_PRODUCTS];
  const taken = new Set(fixed.map((p) => p.texts.uz.name).filter(Boolean));
  const generated = generateProducts(TOTAL_PRODUCTS - fixed.length, taken);

  // Six more sold-out items (seven in total, as on the dashboard) and three
  // more fresh Billz imports (four in total, as in the products banner).
  [11, 37, 64, 102, 151, 199].forEach((i) => {
    const seed = generated[i];
    if (seed) seed.stock = 0;
  });
  [5, 88, 160].forEach((i) => {
    const seed = generated[i];
    if (!seed) return;
    seed.status = "hidden";
    seed.isNewFromBillz = true;
    seed.category = null;
    seed.art = null;
    seed.texts = texts({});
  });

  const takenSlugs = new Set<string>();
  const uniqueSlug = (seed: Seed): string => {
    const base =
      slugifyName(seed.texts.uz.name) || slugifyName(seed.billzName) || `mahsulot-${seed.billzId}`;
    let slug = base;
    for (let attempt = 2; takenSlugs.has(slug); attempt++) slug = `${base}-${attempt}`;
    takenSlugs.add(slug);
    return slug;
  };

  return [...fixed, ...generated].map((seed, index) =>
    withSeoStatus({
      id: String(index + 1),
      billzId: seed.billzId,
      billzName: seed.billzName,
      volume: seed.volume,
      category: seed.category,
      price: seed.price,
      stock: seed.stock,
      promo: seed.promo ?? false,
      status: seed.status ?? "active",
      isNewFromBillz: seed.isNewFromBillz ?? false,
      texts: seed.texts,
      art: seed.art,
      images:
        seed.images ?? (seed.art ? [{ id: "img-1", label: "Asosiy rasm", art: seed.art }] : []),
      lastChange: seed.lastChange,
      slug: uniqueSlug(seed),
      seo: seed.seo ?? emptySeo(),
    }),
  );
}

/** The demo's `seo_status`, computed the way the server does (`catalog.seo`). */
export function withSeoStatus(product: Omit<Product, "seoStatus">): Product {
  return {
    ...product,
    seoStatus: productSeoStatus({
      texts: product.texts,
      imageCount: product.images.length,
      category: product.category,
      seo: product.seo,
    }),
  };
}

export const PRODUCTS: ReadonlyArray<Product> = buildCatalog();

export function productByBillzId(billzId: string): Product {
  const product = PRODUCTS.find((p) => p.billzId === billzId);
  if (!product) throw new Error(`Unknown mock product ${billzId}`);
  return product;
}
