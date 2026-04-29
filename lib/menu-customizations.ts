export type ToppingOption = {
  label: string;
  price: number;
};

export type MenuCustomizationPreset = {
  sweetnessOptions?: string[];
  toppingOptions?: ToppingOption[];
  notePlaceholder: string;
};

const DRINK_SWEETNESS = ["0%", "25%", "50%", "75%", "100%"];

const DRINK_TOPPINGS: ToppingOption[] = [
  { label: "Boba pearls", price: 10 },
  { label: "Whipped cream", price: 15 },
  { label: "Cheese foam", price: 20 },
  { label: "Extra shot", price: 15 },
];

const DESSERT_TOPPINGS: ToppingOption[] = [
  { label: "Chocolate sauce", price: 10 },
  { label: "Caramel sauce", price: 10 },
  { label: "Vanilla ice cream", price: 20 },
  { label: "Whipped cream", price: 15 },
];

const CATEGORY_PRESETS: Record<string, MenuCustomizationPreset> = {
  tea: {
    sweetnessOptions: DRINK_SWEETNESS,
    toppingOptions: DRINK_TOPPINGS,
    notePlaceholder: "Example: less ice, no straw",
  },
  coffee: {
    sweetnessOptions: DRINK_SWEETNESS,
    toppingOptions: DRINK_TOPPINGS,
    notePlaceholder: "Example: extra hot, less ice, oat milk",
  },
  "non coffee": {
    sweetnessOptions: DRINK_SWEETNESS,
    toppingOptions: DRINK_TOPPINGS,
    notePlaceholder: "Example: less ice, extra milk",
  },
  dessert: {
    toppingOptions: DESSERT_TOPPINGS,
    notePlaceholder: "Example: serve warm, no syrup",
  },
  bakery: {
    notePlaceholder: "Example: warm before serving",
  },
  food: {
    notePlaceholder: "Example: no onions, extra spicy",
  },
};

const DEFAULT_PRESET: MenuCustomizationPreset = {
  notePlaceholder: "Add a special request for this item",
};

export function getMenuCustomizationPreset(categoryName?: string | null) {
  const normalizedCategory = (categoryName || "").trim().toLowerCase();
  return CATEGORY_PRESETS[normalizedCategory] || DEFAULT_PRESET;
}

