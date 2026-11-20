import React from "react";
import { createRoot } from "react-dom/client";
import GooeyNav from "./components/GooeyNav.jsx";

const mount = document.getElementById("gooey-nav-root");

if (mount) {
  const path = window.location.pathname.toLowerCase();
  const hash = window.location.hash.toLowerCase();
  const isHome = path === "/" || path.endsWith("/index.html");
  const items = [
    { label: "Home", href: isHome ? "#home" : "index.html#home" },
    { label: "About", href: isHome ? "#about" : "index.html#about" },
    { label: "Services", href: isHome ? "#services" : "index.html#services" },
    { label: "Gallery", href: "gallery.html" },
    { label: "Feedback", href: "feedback.html" },
    { label: "Contact", href: "contact.html" }
  ];

  let activeIndex = 0;
  if (path.endsWith("/about.html") || (isHome && hash === "#about")) activeIndex = 1;
  else if (isHome && hash === "#services") activeIndex = 2;
  else if (path.endsWith("/gallery.html") || path.endsWith("/project.html")) activeIndex = 3;
  else if (path.endsWith("/feedback.html")) activeIndex = 4;
  else if (path.endsWith("/contact.html")) activeIndex = 5;

  createRoot(mount).render(
    <GooeyNav
      items={items}
      initialActiveIndex={activeIndex}
      theme="dark"
      size="sm"
      frame={false}
      animationTime={620}
      particleCount={16}
      spread={48}
      gooeyness={0.55}
      wobble={0.45}
    />
  );
}
