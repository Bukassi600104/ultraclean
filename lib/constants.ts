import { Service, Testimonial, GalleryItem, NavLink } from "@/types";

export const NAV_LINKS: NavLink[] = [
  { label: "Home", href: "/" },
  { label: "Services", href: "/services" },
  { label: "Gallery", href: "/gallery" },
  { label: "About", href: "/about" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact" },
];

export const SERVICES: Service[] = [
  {
    id: "residential",
    name: "Residential Cleaning",
    shortDescription:
      "Regular home cleaning to keep your living space spotless and fresh.",
    description:
      "Our residential cleaning service covers every corner of your home. From dusting and vacuuming to mopping and sanitizing, we leave your space sparkling clean. We use eco-friendly products safe for your family and pets.",
    features: [
      "Dusting all surfaces and fixtures",
      "Vacuuming carpets and rugs",
      "Mopping hard floors",
      "Kitchen and bathroom deep sanitization",
      "Window sill and baseboard cleaning",
      "Trash removal and bag replacement",
    ],
    startingPrice: 150,
    minDuration: "4 hours",
    icon: "Home",
  },
  {
    id: "commercial",
    name: "Commercial Cleaning",
    shortDescription:
      "Professional cleaning for offices, retail spaces, and commercial properties.",
    description:
      "Keep your workplace professional and hygienic with our commercial cleaning services. We work around your schedule to minimize disruption, providing thorough cleaning for offices, retail spaces, and more.",
    features: [
      "Office and workspace cleaning",
      "Restroom sanitization",
      "Break room and kitchen cleaning",
      "Floor care (carpet and hard surface)",
      "Trash and recycling management",
      "Reception and common area upkeep",
    ],
    startingPrice: 200,
    minDuration: "3 hours",
    icon: "Building2",
  },
  {
    id: "deep-cleaning",
    name: "Deep Cleaning",
    shortDescription:
      "Thorough top-to-bottom cleaning for homes needing extra attention.",
    description:
      "Our deep cleaning service goes beyond regular maintenance. We tackle built-up grime, hidden dirt, and hard-to-reach areas. Perfect for seasonal cleaning or getting your home back to pristine condition.",
    features: [
      "Inside oven and refrigerator cleaning",
      "Inside cabinet and drawer wiping",
      "Baseboard and crown molding detail",
      "Light fixture and ceiling fan cleaning",
      "Grout and tile scrubbing",
      "Window interior cleaning",
    ],
    startingPrice: 250,
    minDuration: "6 hours",
    icon: "Sparkles",
  },
  {
    id: "move-in-out",
    name: "Move-In/Move-Out Cleaning",
    shortDescription:
      "Complete cleaning for smooth transitions between tenants or homeowners.",
    description:
      "Moving is stressful enough without worrying about cleaning. Our move-in/move-out service ensures the space is spotless for the next occupant or ready for you to settle into your new home.",
    features: [
      "Full interior deep clean",
      "All appliance interior cleaning",
      "Cabinet and closet interior wipe-down",
      "Wall spot cleaning and scuff removal",
      "Light switch and outlet plate cleaning",
      "Garage sweeping (if applicable)",
    ],
    startingPrice: 250,
    minDuration: "5 hours",
    icon: "Truck",
  },
  {
    id: "post-construction",
    name: "Post-Construction Cleaning",
    shortDescription:
      "Remove dust, debris, and residue after renovations or new builds.",
    description:
      "Construction and renovations leave behind a mess that regular cleaning can't handle. Our post-construction cleaning removes dust, debris, paint splatters, and residue to reveal the beautiful results of your project.",
    features: [
      "Construction dust and debris removal",
      "Paint splatter and adhesive removal",
      "Window and glass cleaning",
      "Hard surface scrubbing and polishing",
      "HVAC vent and fixture dusting",
      "Final detail inspection",
    ],
    startingPrice: 250,
    minDuration: "5 hours",
    icon: "HardHat",
  },
];

export const SERVICE_OPTIONS = [
  { value: "residential", label: "Residential Cleaning" },
  { value: "commercial", label: "Commercial Cleaning" },
  { value: "deep-cleaning", label: "Deep Cleaning" },
  { value: "move-in-out", label: "Move-In/Move-Out Cleaning" },
  { value: "post-construction", label: "Post-Construction Cleaning" },
  { value: "airbnb", label: "Airbnb Cleaning" },
];

export const TESTIMONIALS: Testimonial[] = [
  {
    id: "1",
    name: "Sarah M.",
    serviceType: "Residential Cleaning",
    rating: 5,
    text: "UltraTidy transformed my home! The team was professional, thorough, and left everything spotless. I couldn't believe the difference. Highly recommend their residential cleaning service!",
  },
  {
    id: "2",
    name: "David K.",
    serviceType: "Post-Construction Cleaning",
    rating: 5,
    text: "After our kitchen renovation, the mess was overwhelming. UltraTidy came in and handled everything — dust, debris, paint splatters — all gone. They made our new kitchen shine!",
  },
  {
    id: "3",
    name: "Priya T.",
    serviceType: "Move-In/Move-Out Cleaning",
    rating: 5,
    text: "I hired UltraTidy for a move-out clean and got my full deposit back. They cleaned areas I didn't even think of. Will definitely use them again for my next move!",
  },
  {
    id: "4",
    name: "James R.",
    serviceType: "Commercial Cleaning",
    rating: 5,
    text: "Our office has never looked better. The UltraTidy team is reliable, efficient, and always goes the extra mile. Our clients have even commented on how clean the space is!",
  },
];

export const GALLERY_ITEMS: GalleryItem[] = [
  {
    id: "1",
    title: "Kitchen Deep Clean",
    category: "deep-cleaning",
    image: "/images/gallery/placeholder-1.jpg",
  },
  {
    id: "2",
    title: "Living Room Transformation",
    category: "residential",
    image: "/images/gallery/placeholder-2.jpg",
  },
  {
    id: "3",
    title: "Office Space Cleaning",
    category: "commercial",
    image: "/images/gallery/placeholder-3.jpg",
  },
  {
    id: "4",
    title: "Post-Reno Bathroom",
    category: "post-construction",
    image: "/images/gallery/placeholder-4.jpg",
  },
  {
    id: "5",
    title: "Move-Out Deep Clean",
    category: "move-in-out",
    image: "/images/gallery/placeholder-5.jpg",
  },
  {
    id: "6",
    title: "Sparkling Kitchen",
    category: "residential",
    image: "/images/gallery/placeholder-6.jpg",
  },
];

export const BUSINESS_HOURS = [
  { day: "Monday - Friday", hours: "9:00 AM - 6:00 PM" },
  { day: "Saturday", hours: "8:00 AM - 6:00 PM" },
  { day: "Sunday", hours: "10:00 AM - 4:00 PM" },
];

export const CONTACT_INFO = {
  phone: "+1 (647) 823-8262",
  email: "hello@ultratidy.ca",
  address: "Toronto, ON, Canada",
  serviceArea: "GTA (Greater Toronto Area), Brantford & 40km radius",
};

export const SOCIAL_LINKS = {
  instagram: "https://instagram.com/ultratidycleaningservices",
  facebook: "https://facebook.com/UltraTidyCleaningServices",
  googleReview: "https://g.page/r/CbgkPYbL4D3JEBM/review",
};
