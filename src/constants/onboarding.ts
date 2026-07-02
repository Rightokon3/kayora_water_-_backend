/**
 * Static content for the onboarding flow. Kept separate from
 * components so copy changes never require touching UI code.
 */
import { Colors } from "./theme";

export type FeatureItem = {
  id: string;
  icon: string; // emoji or icon glyph
  label: string;
};

export type OnboardingPage = {
  id: string;
  type: "hero" | "features" | "features-alt" | "cta";
  title: string;
  subtitleLead?: string;
  subtitle: string;
  features?: FeatureItem[];
  backgroundColor: string;
};

export const ONBOARDING_PAGES: OnboardingPage[] = [
  {
    id: "page-1",
    type: "hero",
    title: "Welcome to Kayora Water",
    subtitleLead: "Premium Water .\nHealthy Living.",
    subtitle:
      "Delivering premium purified water directly to homes, offices and businesses with speed, safety and reliability.",
    backgroundColor: Colors.white,
  },
  {
    id: "page-2",
    type: "features",
    title: "About Kayora",
    subtitle:
      "Kayora Premium Water is produced using advanced multi-stage purification processes to deliver clean, refreshing and safe drinking water that meets the highest quality standards.",
    backgroundColor: Colors.white,
    features: [
      { id: "f1", icon: "check", label: "NAFDAC Certified" },
      { id: "f2", icon: "filter", label: "Premium Purification Process" },
      { id: "f3", icon: "home", label: "Safe For Homes & Businesses" },
      { id: "f4", icon: "truck", label: "Reliable Distribution Network" },
    ],
  },
  {
    id: "page-3",
    type: "features-alt",
    title: "Why Choose Kayora?",
    subtitle: "Thousands of customers trust Kayora Water every day.",
    backgroundColor: Colors.white,
    features: [
      { id: "f5", icon: "drop", label: "Crystal Clear Purity" },
      { id: "f6", icon: "star", label: "Consistent Quality" },
      { id: "f7", icon: "price", label: "Affordable Premium Water" },
      { id: "f8", icon: "truck", label: "Fast Distribution" },
      { id: "f9", icon: "heart", label: "Trusted Across Akwa Ibom" },
    ],
  },
  {
    id: "page-4",
    type: "cta",
    title: "Let's Get Started",
    subtitle: "Create your account and enjoy premium water delivery right at your doorstep.",
    backgroundColor: Colors.white,
  },
];

export const ONBOARDING_STORAGE_KEY = "hasSeenOnboarding";
