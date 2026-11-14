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


// BLOOM client feedback — submissions are saved as pending until approved.
const feedbackForm = document.getElementById("feedback-form");
if (feedbackForm && window.supabase) {
  const feedbackClient = window.supabase.createClient(
    "https://zkxtlbvgurziniicpdyg.supabase.co",
    "sb_publishable_Q3IBH3JE1e6fGoqFQNUoig_FLufny0b"
  );
  const ratingInput = document.getElementById("feedback-rating");
  const ratingHint = document.getElementById("rating-hint");
  const ratingButtons = [...feedbackForm.querySelectorAll(".rating-star")];
  const feedbackStatus = document.getElementById("feedback-status");
  const submitButton = feedbackForm.querySelector(".feedback-submit");
  const feedbackList = document.getElementById("feedback-list");

  function setFeedbackRating(value) {
    ratingInput.value = value || "";
    ratingButtons.forEach((button) => {
      const selected = Number(button.dataset.rating) <= value;
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-checked", String(Number(button.dataset.rating) === value));
    });
    ratingHint.textContent = value ? value + (value === 1 ? " star" : " stars") : "Select a rating";
  }
  ratingButtons.forEach((button) => button.addEventListener("click", () => setFeedbackRating(Number(button.dataset.rating))));

  async function loadApprovedFeedback() {
    const { data, error } = await feedbackClient.from("client_feedback")
      .select("name, rating, feedback, created_at").eq("approved", true)
      .order("created_at", { ascending: false }).limit(6);
    if (error || !data || !data.length) {
      feedbackList.innerHTML = '<p class="feedback-empty">No published feedback yet. Your words could be the first.</p>';
      return;
    }
    feedbackList.replaceChildren(...data.map((item) => {
      const card = document.createElement("article");
      card.className = "feedback-item";
      const stars = document.createElement("div");
      stars.className = "feedback-item-stars";
      stars.textContent = "★".repeat(item.rating) + "☆".repeat(5 - item.rating);
      const message = document.createElement("p");
      message.textContent = item.feedback;
      const name = document.createElement("strong");
      name.textContent = item.name;
      const date = document.createElement("time");
      date.dateTime = item.created_at;
      date.textContent = new Date(item.created_at).toLocaleDateString(undefined, {year:"numeric",month:"short"});
      card.append(stars, message, name, date);
      return card;
    }));
  }

  feedbackForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(feedbackForm);
    const rating = Number(ratingInput.value);
    const name = String(data.get("name") || "").trim();
    const email = String(data.get("email") || "").trim();
    const message = String(data.get("feedback") || "").trim();
    if (!rating) { feedbackStatus.textContent = "Please choose a star rating first."; return; }
    if (name.length < 2 || message.length < 10) { feedbackStatus.textContent = "Please enter your name and at least 10 characters of feedback."; return; }
    submitButton.disabled = true;
    submitButton.textContent = "SUBMITTING...";
    feedbackStatus.textContent = "Sending your feedback securely...";
    const { error } = await feedbackClient.from("client_feedback").insert({name,email,rating,feedback:message,approved:false});
    submitButton.disabled = false;
    submitButton.innerHTML = 'SUBMIT FEEDBACK <span>↗</span>';
    if (error) { feedbackStatus.textContent = "Sorry, your feedback could not be sent. Please try again."; return; }
    feedbackForm.reset();
    setFeedbackRating(0);
    feedbackStatus.textContent = "Thank you! Your feedback was received and is awaiting review.";
  });
  loadApprovedFeedback();
} else if (feedbackForm) {
  document.getElementById("feedback-status").textContent = "Feedback form is temporarily unavailable. Please email us instead.";
}
