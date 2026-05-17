"use client";

import { useEffect, useRef, useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { ModeToggle } from "../general/mode-toggle";

const NAV_LINKS = [
  { label: "Product", href: "#product" },
  { label: "Pricing", href: "#pricing" },
  { label: "Docs", href: "#docs" },
  {
    label: "GitHub",
    href: "https://github.com/itamarhanan/lumen",
    external: true,
  },
];

const linkClasses =
  "whitespace-nowrap rounded-lg px-2 py-1.5 transition-colors md:px-3 md:text-sm text-sm font-normal";

function activeLink(active: boolean) {
  return active
    ? "bg-muted text-foreground"
    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground";
}

export function Nav() {
  const [activeHash, setActiveHash] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const onHashChange = () => setActiveHash(window.location.hash);
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    const sectionIds = NAV_LINKS.filter((l) => l.href.startsWith("#")).map(
      (l) => l.href.slice(1),
    );
    const sections = sectionIds
      .map((id) => document.getElementById(id))
      .filter(Boolean);

    if (sections.length === 0) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveHash(`#${entry.target.id}`);
          }
        }
      },
      { rootMargin: "-40% 0px -55% 0px" },
    );

    for (const section of sections) {
      observerRef.current.observe(section!);
    }

    return () => observerRef.current?.disconnect();
  }, []);

  const renderLink = (
    link: (typeof NAV_LINKS)[number],
    onClick?: () => void,
  ) => {
    const isActive = link.href.startsWith("#") && activeHash === link.href;
    return (
      <a
        key={link.label}
        href={link.href}
        target={link.external ? "_blank" : undefined}
        rel={link.external ? "noopener noreferrer" : undefined}
        className={`${linkClasses} ${activeLink(isActive)}`}
        aria-current={isActive ? "page" : undefined}
        onClick={onClick}
      >
        {link.label}
      </a>
    );
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4">
      <header
        className="pointer-events-auto w-full max-w-3xl rounded-2xl border border-border/60 bg-background/85 px-2 py-3 backdrop-blur-xl md:px-5 md:py-2.5"
        role="banner"
      >
        {/* Mobile: logo + hamburger */}
        <div className="flex items-center justify-between md:hidden">
          <LogoLink />
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-xl"
                aria-label="Open navigation menu"
              >
                <Menu className="size-5" strokeWidth={1.5} />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="flex flex-col gap-4 p-6 pt-12 shadow-none"
            >
              <SheetTitle className="font-semibold text-2xl">Lumen</SheetTitle>
              <div className="flex flex-col gap-1">
                {NAV_LINKS.map((link) =>
                  renderLink(link, () => setSheetOpen(false)),
                )}
              </div>
              <Button
                size="sm"
                className="mt-2 rounded-xl bg-foreground text-xs font-semibold text-background hover:bg-foreground/85"
              >
                Get started
              </Button>
            </SheetContent>
          </Sheet>
        </div>

        {/* Desktop: single row */}
        <div className="hidden md:flex md:items-center md:gap-2">
          <LogoLink />
          <nav
            className="flex flex-1 items-center justify-center gap-1"
            aria-label="Main navigation"
          >
            {NAV_LINKS.map((link) => renderLink(link))}
          </nav>
          <Button
            size="sm"
            className="h-8 shrink-0 rounded-xl bg-foreground px-4 text-xs font-semibold text-background hover:bg-foreground/85"
          >
            Get started
          </Button>
          <ModeToggle />
        </div>
      </header>
    </div>
  );
}

function LogoLink() {
  return (
    <a
      href="#"
      className="flex shrink-0 items-center gap-2 pl-1"
      aria-label="Lumen home"
    >
      <LumenMark />
      <span className="text-sm font-semibold tracking-tight text-foreground">
        Lumen
      </span>
    </a>
  );
}

function LumenMark() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect width="20" height="20" rx="5" fill="var(--primary)" />
      <rect
        x="5.5"
        y="4.5"
        width="2.25"
        height="11"
        rx="1"
        fill="var(--primary-foreground)"
      />
      <rect
        x="5.5"
        y="13.25"
        width="9"
        height="2.25"
        rx="1"
        fill="var(--primary-foreground)"
      />
    </svg>
  );
}
