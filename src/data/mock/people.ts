import type { CustomerRef } from "@/domain/order";

import { createRandom } from "./random";

/**
 * Customer identities. The first twelve appear by name in the designs (orders,
 * appointments); the rest are generated so lists and filters behave
 * realistically.
 */
export const NAMED_CUSTOMERS: ReadonlyArray<CustomerRef> = [
  { id: "1", name: "Sherzod Qodirov", phone: "+998973014418" },
  { id: "2", name: "Aziza Tursunova", phone: "+998935551209" },
  { id: "3", name: "Gulnora Ismoilova", phone: "+998917072030" },
  { id: "4", name: "Bekzod Rasulov", phone: "+998904186602" },
  { id: "5", name: "Malika Karimova", phone: "+998901234567" },
  { id: "6", name: "Nilufar Saidova", phone: "+998942203175" },
  { id: "7", name: "Javohir Ergashev", phone: "+998998120561" },
  { id: "8", name: "Kamola Nazarova", phone: "+998909741823" },
  { id: "9", name: "Dilshod Mirzayev", phone: "+998936417740" },
  { id: "10", name: "Sevara Xolmatova", phone: "+998971553912" },
  { id: "11", name: "Sardor Umarov", phone: "+998993007215" },
  { id: "12", name: "Nozima Qodirova", phone: "+998938124460" },
];

export const CUSTOMER_IDS = {
  sherzod: "1",
  aziza: "2",
  gulnora: "3",
  bekzod: "4",
  malika: "5",
  nilufar: "6",
  javohir: "7",
  kamola: "8",
  dilshod: "9",
  sevara: "10",
  sardor: "11",
  nozima: "12",
} as const;

const FEMALE = [
  "Madina",
  "Shahnoza",
  "Zarina",
  "Feruza",
  "Mohira",
  "Lola",
  "Dildora",
  "Gulchehra",
  "Munisa",
  "Sabina",
  "Yulduz",
  "Nigora",
  "Ozoda",
  "Umida",
  "Barno",
  "Iroda",
  "Zilola",
  "Rayhona",
  "Shoira",
  "Hulkar",
  "Mahliyo",
  "Dilfuza",
  "Nargiza",
  "Komila",
  "Charos",
];
const MALE = [
  "Aziz",
  "Bobur",
  "Otabek",
  "Rustam",
  "Ulug‘bek",
  "Farrux",
  "Akmal",
  "Sanjar",
  "Temur",
  "Islom",
  "Jamshid",
  "Doniyor",
  "Shoxrux",
  "Abdulla",
  "Elyor",
  "Nodir",
];
const SURNAMES = [
  "Qodirov",
  "Tursunov",
  "Ismoilov",
  "Rasulov",
  "Karimov",
  "Saidov",
  "Ergashev",
  "Nazarov",
  "Mirzayev",
  "Xolmatov",
  "Umarov",
  "Aliyev",
  "Yusupov",
  "Rahimov",
  "Abdullayev",
  "Hasanov",
  "Toshmatov",
  "Sobirov",
  "Jo‘rayev",
  "Mahmudov",
  "Normatov",
  "Usmonov",
  "Valiyev",
  "Ahmedov",
  "Sultonov",
  "Bakirov",
  "Shodmonov",
  "Ibragimov",
];
const OPERATORS = ["90", "91", "93", "94", "95", "97", "98", "99", "33", "88"];

const GENERATED_COUNT = 420;

function generateCustomers(): CustomerRef[] {
  const random = createRandom(4812);
  const seen = new Set(NAMED_CUSTOMERS.map((c) => c.name));
  const result: CustomerRef[] = [];
  while (result.length < GENERATED_COUNT) {
    const female = random.chance(0.78);
    const surname = random.pick(SURNAMES);
    const name = `${random.pick(female ? FEMALE : MALE)} ${female ? `${surname}a` : surname}`;
    if (seen.has(name)) continue;
    seen.add(name);
    const digits = String(random.int(0, 9_999_999)).padStart(7, "0");
    result.push({
      id: String(NAMED_CUSTOMERS.length + result.length + 1),
      name,
      phone: `+998${random.pick(OPERATORS)}${digits}`,
    });
  }
  return result;
}

export const CUSTOMERS: ReadonlyArray<CustomerRef> = [...NAMED_CUSTOMERS, ...generateCustomers()];

export function customerRef(id: string): CustomerRef {
  const customer = CUSTOMERS.find((c) => c.id === id);
  if (!customer) throw new Error(`Unknown mock customer ${id}`);
  return customer;
}
