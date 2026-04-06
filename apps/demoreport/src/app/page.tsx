import { Nav } from "@/components/Nav";
import { Hero } from "@/components/Hero";
import { HowItWorks } from "@/components/HowItWorks";
import { WhatIncluded } from "@/components/WhatIncluded";
import { Pricing } from "@/components/Pricing";
import { FAQ } from "@/components/FAQ";
import { Footer } from "@/components/Footer";

export default function HomePage() {
  return (
    <>
      <Nav />
      <Hero />
      <HowItWorks />
      <WhatIncluded />
      <Pricing />
      <FAQ />
      <Footer />
    </>
  );
}
