/**
 * Shared demo product catalog.
 *
 * Single source of truth for product data - both dashboard.tsx and
 * our-products.tsx import PRODUCTS and Product from here instead of
 * each keeping their own copy. This is what actually makes the
 * "Future Ready" requirement true: swapping this array for a real
 * Firebase/Supabase/API fetch only ever means editing this one file;
 * no UI screen needs to change since they all consume the same shape.
 *
 * Copy is taken from the real Kayora product reference rather than
 * placeholder text.
 */

export type ProductCategory = "30cl" | "50cl" | "75cl" | "18.9L";

export type Product = {
  id: number;
  name: string;
  size: string;
  category: ProductCategory;
  tagline: string;
  shortDescription: string;
  longDescription: string;
  idealFor: string;
  price: number;
  image?: string;
  isAvailable: boolean;
  isPopular: boolean;
  releaseOrder: number;
};

export const PRODUCTS: Product[] = [
  {
    id: 1,
    name: "Sharp-Sharp",
    size: "30CL",
    category: "30cl",
    tagline: "The Event Bottle",
    shortDescription: "Compact, easy to chill, easy to share.",
    longDescription:
      "Built for events. Compact, easy to chill, easy to share. The Kayora you reach for at weddings, naming ceremonies and corporate functions.",
    idealFor: "Perfect for events, celebrations and anywhere water is served to guests.",
    price: 300,
    isAvailable: true,
    isPopular: false,
    releaseOrder: 1,
  },
  {
    id: 2,
    name: "Original",
    size: "50CL",
    category: "50cl",
    tagline: "The Everyday Bottle",
    shortDescription: "Everyday hydration, perfected.",
    longDescription:
      "Everyday hydration, perfected. The bottle that started it all, sized right for school bags, dashboards and desks across Akwa Ibom.",
    idealFor: "Ideal for homes, offices, schools and on-the-go hydration.",
    price: 400,
    isAvailable: true,
    isPopular: true,
    releaseOrder: 2,
  },
  {
    id: 3,
    name: "Jara",
    size: "75CL",
    category: "75cl",
    tagline: "The Extra Bottle",
    shortDescription: "A little extra, the way only Nigerians know how.",
    longDescription:
      "A little extra, the way only Nigerians know how. Generous volume for long days, the gym, the road, and anyone who hydrates seriously.",
    idealFor: "Great for fitness, travel and long working days.",
    price: 550,
    isAvailable: true,
    isPopular: true,
    releaseOrder: 3,
  },
  {
    id: 4,
    name: "Never Finish",
    size: "18.9L",
    category: "18.9L",
    tagline: "The Dispenser Standard",
    shortDescription: "The dispenser standard for households and offices.",
    longDescription:
      "The dispenser standard. One bottle keeps a household, office or hotel running for days. Clean. Sealed. Tracked from borehole to delivery.",
    idealFor: "The go-to choice for offices, hotels, schools and large households.",
    price: 3500,
    isAvailable: true,
    isPopular: false,
    releaseOrder: 4,
  },
];

export function getProductById(id: number): Product | undefined {
  return PRODUCTS.find((product) => product.id === id);
}