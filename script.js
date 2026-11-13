const menuButton = document.querySelector(".menu");
const navLinks = document.querySelector(".navlinks");

function closeMenu() {
  if (!menuButton || !navLinks) return;
  navLinks.classList.remove("open");
  menuButton.setAttribute("aria-expanded", "false");
  menuButton.setAttribute("aria-label", "Open navigation");
}

if (menuButton && navLinks) {
  menuButton.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("open");
    menuButton.setAttribute("aria-expanded", String(isOpen));
    menuButton.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
  });

  navLinks.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeMenu);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });

  document.addEventListener("click", (event) => {
    if (!navLinks.contains(event.target) && !menuButton.contains(event.target)) closeMenu();
  });
}

// Subtle blue ripple feedback wherever the page is clicked or tapped.
const rippleStyle = document.createElement("style");
rippleStyle.textContent = `
  .bloom-click-ripple {
    position: fixed;
    z-index: 9999;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    pointer-events: none;
    transform: translate(-50%, -50%) scale(.25);
    background: radial-gradient(circle, rgba(91,176,255,.72) 0%, rgba(35,112,255,.34) 42%, rgba(35,112,255,0) 74%);
    animation: bloomRipple .48s ease-out forwards;
  }
  @keyframes bloomRipple {
    0% { opacity: .85; transform: translate(-50%, -50%) scale(.25); }
    100% { opacity: 0; transform: translate(-50%, -50%) scale(5.5); }
  }
  @media (prefers-reduced-motion: reduce) {
    .bloom-click-ripple { animation-duration: .01ms; }
  }
`;
document.head.appendChild(rippleStyle);

document.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) return;
  const ripple = document.createElement("span");
  ripple.className = "bloom-click-ripple";
  ripple.style.left = event.clientX + "px";
  ripple.style.top = event.clientY + "px";
  document.body.appendChild(ripple);
  ripple.addEventListener("animationend", () => ripple.remove(), { once: true });
  window.setTimeout(() => ripple.remove(), 600);
});

const year = document.getElementById("year");
if (year) year.textContent = new Date().getFullYear();
