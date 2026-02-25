import { Service, Testimonial, GalleryItem, NavLink } from "@/types";

export const NAV_LINKS: NavLink[] = [
  { label: "Home", href: "/" },
  { label: "Services", href: "/services" },
  { label: "Gallery", href: "/gallery" },
  { label: "About", href: "/about" },
  { label: "FAQ", href: "/faq" },
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
  {
    id: "airbnb",
    name: "Airbnb / Short-Term Rental Cleaning",
    shortDescription:
      "Turnover cleaning that keeps guests coming back — fast, thorough, and reliable.",
    description:
      "We specialise in fast, professional turnovers for Airbnb and short-term rental properties. We deep-clean between guests so you maintain your ratings, maximise bookings, and never worry about the clean.",
    features: [
      "Full bathroom sanitization",
      "Kitchen and appliance wipe-down",
      "Fresh linen change and bed-making",
      "Restocking consumables (soap, paper products)",
      "Trash removal and new bag placement",
      "Quick turnaround to match check-out/check-in windows",
    ],
    startingPrice: 150,
    minDuration: "2 hours",
    icon: "Star",
  },
  {
    id: "restaurant-cafe",
    name: "Restaurant & Café Cleaning",
    shortDescription:
      "Health-code-compliant cleaning for food service environments.",
    description:
      "Maintain a spotless, compliant kitchen and dining area with our specialised restaurant and café cleaning. We handle grease, grime, and high-touch surfaces so your team can focus on the food.",
    features: [
      "Commercial kitchen deep cleaning",
      "Grease trap and hood filter degreasing",
      "Dining area and seating sanitization",
      "Washroom cleaning and restocking",
      "Food prep surface disinfection",
      "Health-code compliance ready",
    ],
    startingPrice: 200,
    minDuration: "3 hours",
    icon: "UtensilsCrossed",
  },
  {
    id: "clinic-medical",
    name: "Clinic & Medical Facility Cleaning",
    shortDescription:
      "IPAC-compliant sanitization for clinics, urgent care centres, and medical offices.",
    description:
      "Our clinic cleaning follows strict Infection Prevention and Control (IPAC) protocols. We use hospital-grade disinfectants to ensure patient safety and regulatory compliance for medical and dental offices.",
    features: [
      "Hospital-grade disinfectant application",
      "Exam room and treatment area sanitization",
      "High-touch surface disinfection",
      "Waiting area and reception cleaning",
      "Medical waste area cleaning support",
      "IPAC-compliant procedures throughout",
    ],
    startingPrice: 250,
    minDuration: "3 hours",
    icon: "Cross",
  },
];

export const SERVICE_OPTIONS = [
  { value: "residential", label: "Residential Cleaning" },
  { value: "commercial", label: "Commercial Cleaning" },
  { value: "deep-cleaning", label: "Deep Cleaning" },
  { value: "move-in-out", label: "Move-In/Move-Out Cleaning" },
  { value: "post-construction", label: "Post-Construction Cleaning" },
  { value: "airbnb", label: "Airbnb / Short-Term Rental Cleaning" },
  { value: "restaurant-cafe", label: "Restaurant & Café Cleaning" },
  { value: "clinic-medical", label: "Clinic & Medical Facility Cleaning" },
];

export const TESTIMONIALS: Testimonial[] = [
  {
    id: "1",
    name: "Karanveer Kabuli",
    serviceType: "Residential Cleaning",
    rating: 5,
    text: "Outstanding service from start to finish. The team arrived punctual and fully equipped. They transformed my home with spotless surfaces and gleaming floors. Their attention to detail exceeded my expectations.",
  },
  {
    id: "2",
    name: "Oshinowski Adenike",
    serviceType: "Deep Cleaning",
    rating: 5,
    text: "Outstanding deep clean experience. Punctual, thorough, and professional throughout. Excellent attention to detail. Highly recommend UltraTidy to anyone looking for a truly exceptional clean.",
  },
  {
    id: "3",
    name: "Ozo Nwankwo",
    serviceType: "Airbnb / Short-Term Rental Cleaning",
    rating: 5,
    text: "Great services — will definitely recommend. My guests have been leaving 5-star reviews consistently since I started using UltraTidy for my property turnovers.",
  },
  {
    id: "4",
    name: "Christina Chansamone",
    serviceType: "Restaurant & Café Cleaning",
    rating: 5,
    text: "Amazing, nice people. Definitely recommend if you want significant space improvement. Our restaurant looks better than it ever has. The team is professional and thorough.",
  },
];

export const GALLERY_ITEMS: GalleryItem[] = [
  // ── Residential ──────────────────────────────────────────────
  {
    id: "1",
    title: "Bedroom Makeover",
    category: "residential",
    beforeImage: "/images/gallery/IMG_1264.jpg",
    afterImage: "/images/gallery/IMG_1265.jpg",
  },
  {
    id: "6",
    title: "Bedroom Fresh & Tidy",
    category: "residential",
    image: "/images/gallery/IMG_1266.jpg",
  },
  {
    id: "7",
    title: "Bathroom Vanity Refresh",
    category: "residential",
    image: "/images/gallery/IMG_4129.jpg",
  },
  {
    id: "22",
    title: "Dining Room — Spotless & Styled",
    category: "residential",
    image: "/images/gallery/residential-dining-room-clean.jpg",
  },
  {
    id: "23",
    title: "Kitchen Island — Gleaming Clean",
    category: "residential",
    image: "/images/gallery/residential-kitchen-island-clean.jpg",
  },
  // ── Commercial — Office ──────────────────────────────────────
  {
    id: "4",
    title: "Commercial Kitchen Clean",
    category: "commercial",
    beforeImage: "/images/gallery/IMG_4022.jpg",
    afterImage: "/images/gallery/IMG_4055.jpg",
  },
  {
    id: "11",
    title: "Commercial Sink Polished",
    category: "commercial",
    image: "/images/gallery/commercial-sink-cleaning.jpg",
  },
  {
    id: "12",
    title: "Break Room Transformation",
    category: "commercial",
    beforeImage: "/images/gallery/kitchenette-before.jpg",
    afterImage: "/images/gallery/kitchenette-after.jpg",
  },
  {
    id: "13",
    title: "Window Cleaning — Office",
    category: "commercial",
    image: "/images/gallery/window-cleaning-action.jpg",
  },
  {
    id: "14",
    title: "Team On-Site",
    category: "commercial",
    image: "/images/gallery/team-briefing.jpg",
  },
  {
    id: "15",
    title: "Commercial Kitchen Spotless",
    category: "commercial",
    image: "/images/gallery/commercial-kitchen-spotless.jpg",
  },
  {
    id: "17",
    title: "Office Space Sanitized",
    category: "commercial",
    image: "/images/gallery/office-sanitized.jpg",
  },
  {
    id: "18",
    title: "Bathroom Vanity — Marble Finish",
    category: "commercial",
    image: "/images/gallery/bathroom-vanity-marble.jpg",
  },
  {
    id: "19",
    title: "Window Detail Clean",
    category: "commercial",
    image: "/images/gallery/window-cleaning-closeup.jpg",
  },
  {
    id: "21",
    title: "Team Ready for Action",
    category: "commercial",
    image: "/images/gallery/team-lobby-equipment.jpg",
  },
  {
    id: "24",
    title: "Medical Office — Bright & Sanitized",
    category: "commercial",
    image: "/images/gallery/commercial-medical-office-bright.jpg",
  },
  {
    id: "25",
    title: "Exam Room Cleaned — Room 4",
    category: "commercial",
    image: "/images/gallery/commercial-medical-room-4.jpg",
  },
  {
    id: "26",
    title: "Multi-Station Exam Suite",
    category: "commercial",
    image: "/images/gallery/commercial-medical-multi-station.jpg",
  },
  {
    id: "27",
    title: "Medical Exam Room — Window View",
    category: "commercial",
    image: "/images/gallery/commercial-medical-exam-window.jpg",
  },
  {
    id: "28",
    title: "Medical Hallway — Polished Floors",
    category: "commercial",
    image: "/images/gallery/commercial-medical-hallway.jpg",
  },
  {
    id: "29",
    title: "Cleaner at Work — Medical Office",
    category: "commercial",
    image: "/images/gallery/commercial-cleaner-action.jpg",
  },
  {
    id: "30",
    title: "Medical Exam Room — Clean & Ready",
    category: "commercial",
    image: "/images/gallery/commercial-medical-exam-room.jpg",
  },
  {
    id: "31",
    title: "Exam Room — Clean Setup",
    category: "commercial",
    image: "/images/gallery/commercial-medical-exam-clean.jpg",
  },
  {
    id: "32",
    title: "Stainless Sink — Polished",
    category: "commercial",
    image: "/images/gallery/commercial-stainless-sink-polished.jpg",
  },
  {
    id: "33",
    title: "Office Breakroom Sink",
    category: "commercial",
    image: "/images/gallery/commercial-office-sink-sanitizer.jpg",
  },
  {
    id: "34",
    title: "Kindred Sink — After Clean",
    category: "commercial",
    image: "/images/gallery/commercial-kindred-sink-clean.jpg",
  },
  {
    id: "35",
    title: "Accessible Bathroom — Full Clean",
    category: "commercial",
    image: "/images/gallery/commercial-accessible-bathroom.jpg",
  },
  {
    id: "36",
    title: "Commercial Bathroom Vanity",
    category: "commercial",
    image: "/images/gallery/commercial-bathroom-vanity-full.jpg",
  },
  {
    id: "37",
    title: "Bathroom Vanity — Wide View",
    category: "commercial",
    image: "/images/gallery/commercial-bathroom-vanity-wide.jpg",
  },
  {
    id: "38",
    title: "Restroom Toilet — Spotless",
    category: "commercial",
    image: "/images/gallery/commercial-bathroom-toilet-fresh.jpg",
  },
  {
    id: "39",
    title: "Commercial Restroom — White & Clean",
    category: "commercial",
    image: "/images/gallery/commercial-bathroom-toilet-white.jpg",
  },
  // ── Deep Cleaning ────────────────────────────────────────────
  {
    id: "2",
    title: "Toilet Deep Clean",
    category: "deep-cleaning",
    beforeImage: "/images/gallery/0907d98c-c6ff-46a3-822d-e468b5505cb6.jpg",
    afterImage: "/images/gallery/IMG_4099.jpg",
  },
  {
    id: "3",
    title: "Bathroom Restoration",
    category: "deep-cleaning",
    beforeImage: "/images/gallery/a0a60e9d-d53d-49d7-b1d7-96db5fa4dc4a.jpg",
    afterImage: "/images/gallery/IMG_4132.jpg",
  },
  {
    id: "5",
    title: "Sink Drain Restoration",
    category: "deep-cleaning",
    beforeImage: "/images/gallery/IMG_4204.jpg",
    afterImage: "/images/gallery/IMG_4221.jpg",
  },
  {
    id: "8",
    title: "Toilet Sanitization",
    category: "deep-cleaning",
    image: "/images/gallery/IMG_3980.jpg",
  },
  {
    id: "10",
    title: "Pipe Decalcification",
    category: "deep-cleaning",
    image: "/images/gallery/IMG_4225.jpg",
  },
  {
    id: "16",
    title: "Sink Polished to Perfection",
    category: "deep-cleaning",
    image: "/images/gallery/sink-polished.jpg",
  },
  {
    id: "20",
    title: "Sink Sanitization",
    category: "deep-cleaning",
    image: "/images/gallery/sink-sanitized.jpg",
  },
];

export const BUSINESS_HOURS = [
  { day: "Monday - Friday", hours: "9:00 AM - 6:00 PM" },
  { day: "Saturday", hours: "8:00 AM - 6:00 PM" },
  { day: "Sunday", hours: "10:00 AM - 4:00 PM" },
];

export const CONTACT_INFO = {
  phone: "+1 (548) 328-6260",
  email: "hello@ultratidycleaning.com",
  address: "Toronto, ON, Canada",
  serviceArea: "Brantford & the GTA (Greater Toronto Area)",
};

export const SOCIAL_LINKS = {
  instagram: "https://instagram.com/ultratidycleaningservices",
  facebook: "https://facebook.com/UltraTidyCleaningServices",
  googleReview: "https://g.page/r/CbgkPYbL4D3JEBM/review",
};
