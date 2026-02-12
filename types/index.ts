export interface Service {
  id: string;
  name: string;
  shortDescription: string;
  description: string;
  features: string[];
  startingPrice: number;
  minDuration: string;
  icon: string;
}

export interface Testimonial {
  id: string;
  name: string;
  serviceType: string;
  rating: number;
  text: string;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  featured_image: string | null;
  meta_description: string | null;
  status: "draft" | "published";
  published_at: string | null;
  author_id: string;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: string;
  business: "ultratidy" | "dba" | "primefield";
  source: string;
  name: string;
  email: string;
  phone: string;
  service: string;
  property_size: string | null;
  date_needed: string | null;
  notes: string | null;
  status: "new" | "contacted" | "quoted" | "booked" | "completed" | "lost";
  created_at: string;
  updated_at: string;
}

export interface ContactFormData {
  name: string;
  phone: string;
  email: string;
  service: string;
  propertyType?: string;
  squareFootage?: string;
  dateNeeded?: string;
  timePreference?: string;
  frequency?: string;
  specialRequests?: string;
  referralSource?: string;
}

export interface GalleryItem {
  id: string;
  title: string;
  category: string;
  beforeImage?: string;
  afterImage?: string;
  image?: string;
}

export interface NavLink {
  label: string;
  href: string;
}
