import type { Metadata } from "next";
import { primefieldCanonical } from "@/lib/primefield-routing";

const address = "Agbon Ile Village, Makoni Hotels Bus Stop, Ido Eleyele-Ologuneru Road, Ibadan";
const phone = "+2348055306917";
const email = "orders@primefieldagric.com";

export const primefield = {
  name: "Primefield Agri-Business Limited",
  locality: "Ibadan, Oyo State",
  address,
  directions: "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(address + ", Oyo State, Nigeria"),
  phone,
  phoneDisplay: "+234 805 530 6917",
  phoneLink: "tel:" + phone,
  email,
  emailLink: "mailto:" + email,
};

export const heroImage = {
  src: "/primefield/hero-cinematic.webp",
  width: 1672,
  height: 941,
  alt: "Illustration of a grower gathering leafy greens into a woven basket",
};

export const pondImage = {
  src: "/primefield/pond-cinematic.webp",
  width: 1672,
  height: 941,
  alt: "Illustration of a fish farmer lifting a hand net from a freshwater pond",
};

export const farmImage = {
  src: "/primefield/farm.webp",
  width: 1408,
  height: 792,
  alt: "Illustration of a red-earth path between a fish pond and vegetable rows",
};

export const farmProducts = [
  {
    slug: "catfish",
    name: "Catfish",
    category: "Fish",
    description: "Ask about fresh catfish for your household, business or event.",
    details: "Tell us the weight of catfish you need and your preferred date. We’ll confirm what’s available and give you a quote.",
    seoTitle: "Fresh catfish enquiries in Ibadan",
    seoDescription: "Ask Primefield about fresh catfish in Ibadan, Oyo State. Share the weight you need and request an availability and price quote.",
    unit: "kg",
    image: { src: "/primefield/catfish.webp", width: 1200, height: 800, alt: "Illustration of catfish in a hand net above a pond" },
  },
  {
    slug: "goats",
    name: "Goats",
    category: "Livestock",
    description: "Enquire about goats for your household or an upcoming event.",
    details: "Let us know how many goats you’re looking for, the size you have in mind and when you need them. We’ll confirm availability and price.",
    seoTitle: "Goat enquiries in Ibadan",
    seoDescription: "Enquire about buying goats from Primefield in Ibadan, Oyo State. Request a quote with the number, size and date you need.",
    unit: "animals",
    image: { src: "/primefield/goats.webp", width: 1080, height: 720, alt: "Illustration of three goats standing by a wooden fence" },
  },
  {
    slug: "broiler-chickens",
    name: "Broiler chickens",
    category: "Poultry",
    description: "Ask about broilers for your kitchen, business or event.",
    details: "Share the number of broilers you need, any size preference and the date you’re planning for. We’ll confirm what we can supply.",
    seoTitle: "Broiler chickens in Ibadan",
    seoDescription: "Request a quote for broiler chickens from Primefield in Ibadan, Oyo State. Tell the farm the number of birds and your preferred date.",
    unit: "birds",
    image: { src: "/primefield/broiler-chickens.webp", width: 1200, height: 800, alt: "Illustration of white broiler chickens in an open-sided poultry house" },
  },
  {
    slug: "seasonal-produce",
    name: "Seasonal produce",
    category: "Produce",
    description: "Find out which vegetables and other seasonal crops are available.",
    details: "Tell us the produce you’re looking for and roughly how much you need. We’ll let you know what’s in season and can confirm quantities before you order.",
    seoTitle: "Seasonal farm produce in Ibadan",
    seoDescription: "Ask Primefield about seasonal farm produce in Ibadan, Oyo State. Get in touch to confirm what’s available and request a quote.",
    unit: "kg",
    image: { src: "/primefield/seasonal-produce.webp", width: 1200, height: 800, alt: "Illustration of leafy greens and okra in a woven tray" },
  },
] as const;

export type FarmProduct = (typeof farmProducts)[number];
export type FarmImage = FarmProduct["image"] | typeof heroImage | typeof pondImage | typeof farmImage;

export function findFarmProduct(slug: string | undefined) {
  return farmProducts.find((product) => product.slug === slug);
}

export function farmQuoteLink(product?: FarmProduct) {
  return "/contact?request=quote" + (product ? "&product=" + product.slug : "");
}

export function farmPageMetadata(path: string, title: string, description: string, image: FarmImage = heroImage): Metadata {
  const url = primefieldCanonical(path);
  const fullTitle = title + " | Primefield";
  return {
    title: { absolute: fullTitle },
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      siteName: primefield.name,
      locale: "en_NG",
      title: fullTitle,
      description,
      url,
      images: [{ url: primefieldCanonical(image.src), width: image.width, height: image.height, alt: image.alt }],
    },
    twitter: { card: "summary_large_image", title: fullTitle, description, images: [primefieldCanonical(image.src)] },
  };
}
