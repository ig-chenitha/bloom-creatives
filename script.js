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

// Scroll reveal: gently pop each public content section into view.
(() => {
  const sections = [...document.querySelectorAll("main section, body > section")]
    .filter((section) =>
      !section.classList.contains("bloom-impact") &&
      !section.querySelector(".work-lightbox")
    );
  if (!sections.length || !("IntersectionObserver" in window)) return;
  sections.forEach((section) => section.classList.add("bloom-reveal"));
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-revealed");
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -35px 0px" });
  sections.forEach((section) => observer.observe(section));
})();

// Discourage casual saving and dragging of portfolio images.
document.addEventListener("contextmenu", (event) => {
  if (event.target instanceof HTMLImageElement) event.preventDefault();
}, true);
document.addEventListener("dragstart", (event) => {
  if (event.target instanceof HTMLImageElement) event.preventDefault();
}, true);
document.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if ((event.ctrlKey || event.metaKey) && (key === "s" || key === "u")) {
    event.preventDefault();
  }
}, true);

const year = document.getElementById("year");
if (year) year.textContent = new Date().getFullYear();


// BLOOM client feedback — submissions are saved as pending until approved.
const feedbackForm = document.getElementById("feedback-form");
if (feedbackForm && window.supabase) {
  const feedbackClient = window.supabase.createClient(
    "https://qenobhmetbarxepggocx.supabase.co",
    "sb_publishable_U3jXC6vggzC_bqHJxmAoEA_riJcQh29"
  );
  const ratingInput = document.getElementById("feedback-rating");
  const ratingHint = document.getElementById("rating-hint");
  const ratingButtons = [...feedbackForm.querySelectorAll(".rating-star")];
  const feedbackStatus = document.getElementById("feedback-status");
  const submitButton = feedbackForm.querySelector(".feedback-submit");
  const feedbackList = document.getElementById("feedback-list");

  function setFeedbackRating(value) {
    ratingInput.value = value || "";
    ratingButtons.forEach((button, index) => {
      const rating = Number(button.dataset.rating);
      button.classList.toggle("selected", rating <= value);
      button.setAttribute("aria-checked", String(rating === value));
      button.tabIndex = rating === value || (!value && index === 0) ? 0 : -1;
    });
    ratingHint.textContent = value ? value + (value === 1 ? " star" : " stars") : "Select a rating";
  }
  ratingButtons.forEach((button, index) => {
    button.addEventListener("click", () => setFeedbackRating(Number(button.dataset.rating)));
    button.addEventListener("keydown", (event) => {
      let next = null;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (index + 1) % ratingButtons.length;
      if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (index - 1 + ratingButtons.length) % ratingButtons.length;
      if (event.key === "Home") next = 0;
      if (event.key === "End") next = ratingButtons.length - 1;
      if (next === null) return;
      event.preventDefault();
      ratingButtons[next].focus();
      setFeedbackRating(next + 1);
    });
  });

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
    try {
      const { error } = await feedbackClient.from("client_feedback").insert({name,email,rating,feedback:message,approved:false});
      if (error) throw error;
      feedbackForm.reset();
      setFeedbackRating(0);
      feedbackStatus.textContent = "Thank you! Your feedback was received and is awaiting review.";
    } catch (error) {
      console.error("BLOOM feedback submission:", error);
      feedbackStatus.textContent = "Sorry, your feedback could not be sent. Please try again.";
    } finally {
      submitButton.disabled = false;
      submitButton.innerHTML = 'SUBMIT FEEDBACK <span>↗</span>';
    }
  });
  loadApprovedFeedback();
} else if (feedbackForm) {
  document.getElementById("feedback-status").textContent = "Feedback form is temporarily unavailable. Please email us instead.";
}
