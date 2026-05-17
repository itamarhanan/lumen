"use client";

import { Button } from "@/components/ui/button";

export function CallToActionSection() {
  return (
    <section className="py-24 md:py-32 px-5">
      <div className="mx-auto max-w-5xl text-center">
        <div className="mb-10">
          <img
            src="/window.svg"
            alt="Application monitoring illustration"
            className="h-16 w-16 mx-auto text-primary"
          />
        </div>
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
          Ready to get started?
        </h2>
        <p className="max-w-xl mx-auto text-base md:text-lg text-muted-foreground mb-10 leading-relaxed">
          Join thousands of developers who are already using Lumen to monitor
          their applications.
        </p>
        <Button variant="secondary">Start Now</Button>
      </div>
    </section>
  );
}
