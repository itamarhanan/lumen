import { Hero } from "@/components/marketing/hero";
import { Nav } from "@/components/marketing/nav";
import { ProblemSection } from "@/components/marketing/problem-section";
import { ProductSection } from "@/components/marketing/product-section";
import { PhilosophySection } from "@/components/marketing/philosophy-section";
import { IntegrationSection } from "@/components/marketing/integration-section";
import { PricingSection } from "@/components/marketing/pricing-section";
import { CallToActionSection } from "@/components/marketing/call-to-action-section";
import { Footer } from "@/components/marketing/footer";

export default function Home() {
  return (
    <main className="min-h-screen">
      <Nav />
      <Hero />
      <ProblemSection />
      <ProductSection />
      <PhilosophySection />
      <IntegrationSection />
      <PricingSection />
      <CallToActionSection />
      <Footer />
    </main>
  );
}
