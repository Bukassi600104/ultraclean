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

export interface Profile {
  id: string;
  role: "admin" | "manager";
  name: string | null;
  email: string | null;
  created_at: string;
}

export interface FarmSale {
  id: string;
  date: string;
  customer_name: string;
  product: "catfish" | "goat" | "chicken" | "other";
  quantity: number;
  unit_price: number;
  total_amount: number;
  payment_method: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface FarmExpense {
  id: string;
  date: string;
  category:
    | "feed"
    | "labor"
    | "utilities"
    | "veterinary"
    | "transport"
    | "equipment";
  amount: number;
  paid_to: string | null;
  payment_method: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface FarmInventory {
  id: string;
  product: string;
  current_stock: number;
  last_updated: string;
}

export interface FarmInventoryTransaction {
  id: string;
  product: string;
  action: "add" | "remove" | "sale" | "mortality";
  quantity: number;
  reason: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface DBAProduct {
  id: string;
  name: string;
  description: string | null;
  price: number;
  file_url: string | null;
  thumbnail: string | null;
  status: "active" | "inactive";
  download_count: number;
  created_at: string;
  updated_at: string;
}

export interface DBASale {
  id: string;
  product_id: string;
  buyer_name: string;
  buyer_email: string;
  amount: number;
  payment_method: string;
  notes: string | null;
  created_at: string;
  product?: DBAProduct;
}
