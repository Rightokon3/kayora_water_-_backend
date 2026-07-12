// Define strict typing mapping back directly to the Laravel Database fields

export type Product = {
  id: number;
  name: string;
  size: string;
  tagline: string | null;
  short_description: string | null;
  description: string | null;
  image: string | null;
};
