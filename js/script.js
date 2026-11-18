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
    ratingHint.textContent = value ? value + "/5 · " + value + (value === 1 ? " star" : " stars") : "Select a rating";
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


/* Extracted from index.html — original page behavior preserved */
(() => {
      const section = document.querySelector(".bloom-impact");
      if (!section || !("IntersectionObserver" in window)) return;
      const counters = section.querySelectorAll(".impact-count");
      const animate = () => counters.forEach((counter) => {
        const target = Number(counter.dataset.target);
        const duration = 1100;
        const start = performance.now();
        const tick = (now) => {
          const progress = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          counter.textContent = String(Math.round(target * eased));
          if (progress < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
      const observer = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          section.classList.add("is-visible");
          animate();
          observer.disconnect();
        }
      }, { threshold: 0.35 });
      observer.observe(section);
    })();


/* Extracted from gallery.html — original page behavior preserved */
(() => {
 // Start loading gallery posters before they enter the phone viewport.
 const galleryImages=[...document.querySelectorAll(".work-image-button img")];
 if("IntersectionObserver" in window){
  const imageLoader=new IntersectionObserver((entries,observer)=>{
   entries.forEach(entry=>{
    if(!entry.isIntersecting)return;
    const img=entry.target;
    img.loading="eager";
    if(img.decode) img.decode().catch(()=>{});
    observer.unobserve(img);
   });
  },{rootMargin:"1400px 0px"});
  galleryImages.forEach(img=>imageLoader.observe(img));
 }else{
  galleryImages.forEach(img=>img.loading="eager");
 }
 const box=document.getElementById("work-lightbox"), preview=box&&box.querySelector("img");
 if(!box||!preview)return;
 const close=()=>{box.classList.remove("open");box.setAttribute("aria-hidden","true");preview.src="";document.body.classList.remove("work-lightbox-open");};
 document.querySelectorAll(".work-image-button").forEach(button=>button.addEventListener("click",()=>{preview.src=button.dataset.full;preview.alt=button.querySelector("img").alt;box.classList.add("open");box.setAttribute("aria-hidden","false");document.body.classList.add("work-lightbox-open");}));
 document.querySelectorAll(".work-filter").forEach(filter=>filter.addEventListener("click",()=>{
  const category=filter.dataset.filter;
  document.querySelectorAll(".work-filter").forEach(item=>{const active=item===filter;item.classList.toggle("active",active);item.setAttribute("aria-pressed",String(active));});
  document.querySelectorAll(".work-card").forEach(card=>{card.hidden=category!=="all"&&card.querySelector(".work-image-button").dataset.category!==category;});
  const hasVisible=[...document.querySelectorAll(".work-card")].some(card=>!card.hidden);
  const empty=document.querySelector(".work-empty-state");
  if(empty)empty.hidden=hasVisible;
 }));
 box.addEventListener("click",event=>{if(event.target===box||event.target.closest(".work-lightbox-close"))close();});
 document.addEventListener("keydown",event=>{if(event.key==="Escape")close();});
})();


/* Extracted from project.html — original page behavior preserved */
(() => {
 const projects=[{"id":"billie-eilish","title":"Billie Eilish Music-Inspired Design","category":"MUSIC POSTER","discipline":"Visual exploration","description":"A music-inspired poster exploring atmosphere, contrast and visual storytelling through a bold editorial composition.","image":"assets/gallery/Billie%20Eilish%2004.png","objective":"Create an artist-inspired music poster with a strong visual mood.","concept":"Translate the music reference into an editorial, portrait-led composition.","direction":"Let the main image lead; use supporting type and contrast to guide the eye.","designLanguage":"A restrained, contrast-led treatment gives the poster its atmosphere. Type supports the image rather than competing with it.","process":["Explore artist references and mood.","Build an image-led composition.","Refine contrast, spacing and type."]},{"id":"central-cee","title":"Central Cee Music-Inspired Design","category":"MUSIC POSTER","discipline":"Visual exploration","description":"A music-inspired visual study built around expressive typography, imagery and a distinctive graphic mood.","image":"assets/gallery/Centrak%20Cee%2001.png","objective":"Create a bold music-inspired poster that is immediately recognisable.","concept":"Use the artist reference as the starting point for a graphic interpretation.","direction":"Keep the subject prominent and organise typography around the main image.","designLanguage":"Expressive imagery and typography create energy while preserving a clear focal point.","process":["Set the visual tone.","Arrange image and typography.","Polish scale, spacing and contrast."]},{"id":"oreo-shake","title":"Oreo Shake Promotion","category":"ADVERTISING POSTER","discipline":"Promotional design","description":"A promotional poster concept designed to make a product stand out through clear hierarchy and attention-grabbing visuals.","image":"assets/gallery/Coffee%20Poster.png","objective":"Make the Oreo Shake the hero of a clear product promotion.","concept":"Use a product-first advertising layout with supporting promotional copy.","direction":"Prioritise the drink image, then arrange the headline and supporting message.","designLanguage":"Colour and typography should complement the featured drink and keep the message easy to scan.","process":["Identify the hero product.","Build the promotional layout.","Check hierarchy and clarity."]},{"id":"the-weeknd","title":"The Weeknd Music-Inspired Design","category":"MUSIC POSTER","discipline":"Visual exploration","description":"A music-inspired composition using imagery and visual contrast to create a memorable poster direction.","image":"assets/gallery/The%20Weeknd%20Design%2003.png","objective":"Create a memorable music-inspired visual that communicates mood.","concept":"Treat the poster as a visual interpretation of the artist's atmosphere.","direction":"Use a dominant image with carefully placed supporting details.","designLanguage":"Image contrast establishes the mood; typography remains secondary to the main visual.","process":["Define the atmosphere.","Develop the image-led composition.","Unify contrast and text placement."]},{"id":"hindi-poster","title":"Cinematic Portrait Design","category":"MUSIC POSTER","discipline":"Visual exploration","description":"A Cinematic portrait design exploring expressive imagery, atmosphere and a distinctive visual composition.","image":"assets/gallery/Hindi%20Poster%2002.png","objective":"Create an atmospheric cinematic portrait poster.","concept":"Use a character-led composition to suggest a story.","direction":"Let the portrait lead, supported by tonal contrast and considered negative space.","designLanguage":"A cinematic tonal treatment builds atmosphere while integrated type preserves the portrait's impact.","process":["Find the focal portrait.","Shape the cinematic image.","Balance portrait, space and type."]},{"id":"magic-show","title":"Magic Show","category":"EVENT PROMOTION","discipline":"Event design","description":"An event-promotion poster created to communicate the show and build interest through a strong visual direction.","image":"assets/gallery/Magican%20Poster%2007.png","objective":"Promote the magic show and build interest in the event.","concept":"Use a theatrical, mystery-led direction that signals magic and performance.","direction":"Create a strong central visual and organise event information around it.","designLanguage":"Dramatic contrast and display typography create a theatrical mood while keeping details legible.","process":["Establish the show mood.","Combine key imagery and event information.","Check atmosphere and readability."]},{"id":"halloween-party","title":"Halloween Party","category":"EVENT PROMOTION","discipline":"Event design","description":"A themed event poster designed to establish the Halloween atmosphere and present event information clearly.","image":"assets/gallery/Main%20Poster%2004.png","objective":"Introduce the Halloween party and communicate its theme.","concept":"Create a spooky event identity that feels immersive and recognisable.","direction":"Keep the event title prominent and organise supporting information clearly.","designLanguage":"A dark atmospheric direction supports the theme; display type gives the title character.","process":["Set the Halloween theme.","Create the themed key visual.","Refine the event information hierarchy."]},{"id":"dj-night","title":"DJ Night Poster","category":"EVENT PROMOTION","discipline":"Event design","description":"A nightlife promotional visual focused on energy, atmosphere and communicating the event at a glance.","image":"assets/gallery/Party%20Poster.png","objective":"Promote the DJ night with an energetic visual direction.","concept":"Suggest music, movement and a night-time event atmosphere.","direction":"Give the event title and central graphic the strongest presence.","designLanguage":"Bold contrast and energetic typography help the poster stand out while staying readable.","process":["Define the event mood.","Create the poster hierarchy.","Refine spacing and legibility."]},{"id":"event-postponed","title":"Event Postponed","category":"ANNOUNCEMENT POSTER","discipline":"Event communication","description":"An event announcement design created to communicate an important schedule update clearly and visibly.","image":"assets/gallery/Postpoend%20Poster%2002.png","objective":"Clearly notify the audience that the event has been postponed.","concept":"Use a direct announcement format with the update as the main message.","direction":"Make the postponement message the focal point; keep other details secondary.","designLanguage":"Strong contrast and clear display type make the update easy to notice.","process":["Clarify the update.","Prioritise the announcement.","Check immediate readability."]},{"id":"tickets-80","title":"Tickets 80% Sold Out","category":"PROMOTIONAL DESIGN","discipline":"Event promotion","description":"A ticket-sales update visual designed to highlight availability and encourage timely audience action.","image":"assets/gallery/Ticket%2080%25%20Poster%2013.png","objective":"Communicate that 80% of tickets have been sold and prompt action.","concept":"Turn the ticket-sales milestone into a focused promotional message.","direction":"Give the 80% message visual priority and keep the call to action easy to find.","designLanguage":"Bold high-contrast type makes the milestone register quickly; supporting copy stays secondary.","process":["Lead with the sales milestone.","Create a clear call to action.","Refine for quick viewing."]}];
 const id=new URLSearchParams(window.location.search).get("project");
 const project=projects.find(item=>item.id===id);
 if(!project){document.querySelector(".project-detail-page").innerHTML='<div class="project-not-found"><p class="eyebrow">PROJECT NOT FOUND</p><h1>This work is not <em>available.</em></h1><a class="primary-btn" href="gallery.html">BACK TO GALLERY ↗</a></div>';return;}
 document.title=project.title+" | BLOOM CREATIVES";
 const pageUrl=window.location.origin+window.location.pathname+"?project="+encodeURIComponent(project.id);
 document.querySelector('link[rel="canonical"]')?.setAttribute("href",pageUrl);
 document.querySelector('meta[property="og:url"]')?.setAttribute("content",pageUrl);
 document.querySelector('meta[property="og:title"]')?.setAttribute("content",project.title+" | BLOOM CREATIVES");
 document.querySelector('meta[property="og:description"]')?.setAttribute("content",project.description);
 document.querySelector('meta[name="description"]')?.setAttribute("content",project.description);
 document.querySelector('meta[property="og:image"]')?.setAttribute("content",new URL(project.image,window.location.href).href);
 document.querySelector('meta[name="twitter:image"]')?.setAttribute("content",new URL(project.image,window.location.href).href);
 document.getElementById("project-title").textContent=project.title;
 document.getElementById("project-category").textContent=project.category;
 document.getElementById("project-description").textContent=project.description;
 document.getElementById("project-discipline").textContent=project.discipline;
 document.getElementById("project-approach").textContent=project.approach;
 document.getElementById("project-objective").textContent=project.objective;
 document.getElementById("project-concept").textContent=project.concept;
 document.getElementById("project-direction").textContent=project.direction;
 document.getElementById("project-design-language").textContent=project.designLanguage;
 document.getElementById("project-process-grid").innerHTML=project.process.map((step,i)=>'<article><span>0'+(i+1)+' / '+['CONCEPT','DESIGN','REFINEMENT'][i]+'</span><h3>'+['Explore the idea.','Build the composition.','Refine the details.'][i]+'</h3><p>'+step+'</p></article>').join("");
 document.getElementById("project-software-list").innerHTML="<img class=\"project-software-icon\" src=\"assets/photoshop-logo.svg\" alt=\"Adobe Photoshop logo\"><div><strong>Adobe Photoshop</strong><p>Image editing, poster composition and final visual refinement.</p></div>";
 const image=document.getElementById("project-image");image.src=project.image;image.alt=project.title;
})();
