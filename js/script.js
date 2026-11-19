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
 const projects = [
  {
    id: "billie-eilish",
    title: "Billie Eilish Music-Inspired Design",
    category: "MUSIC POSTER",
    discipline: "Visual Exploration",
    description: "A music-inspired poster celebrating Billie Eilish's distinctive artistic identity through expressive imagery, atmospheric visuals and creative composition.",
    image: "assets/gallery/Billie%20Eilish%2004.png",
    approach: "An image-led design approach that combines expressive visuals with carefully balanced typography.",
    objective: "To create an eye-catching music poster that captures the artist's unique personality and alternative music aesthetic.",
    concept: "Inspired by Billie Eilish's experimental music style, individuality and distinctive visual identity.",
    direction: "Use a strong central image, atmospheric details and contrasting elements to establish a memorable visual mood.",
    designLanguage: "Alternative, expressive and contemporary, with bold visual contrasts and carefully arranged typography.",
    process: [
      "Explore the artist's visual identity and musical references.",
      "Develop an expressive image-led poster composition.",
      "Refine typography, contrast and visual balance."
    ]
  },
  {
    id: "central-cee",
    title: "Central Cee Music-Inspired Design",
    category: "MUSIC POSTER",
    discipline: "Graphic Design",
    description: "A contemporary music poster inspired by Central Cee, exploring modern UK rap culture through bold imagery and urban-inspired graphic elements.",
    image: "assets/gallery/Centrak%20Cee%2001.png",
    approach: "A bold graphic approach combining artist-focused imagery with modern typography and street-inspired aesthetics.",
    objective: "To create a striking promotional poster that reflects the artist's identity and modern hip-hop culture.",
    concept: "Inspired by urban street culture, contemporary rap music and the confident personality associated with the artist.",
    direction: "Keep the main subject visually prominent while using typography and graphic elements to create a strong composition.",
    designLanguage: "Urban, bold, modern and expressive, with strong contrast and confident typography.",
    process: [
      "Explore urban music references and visual inspiration.",
      "Arrange the main image and typography into a strong composition.",
      "Refine contrast, spacing and graphic details."
    ]
  },
  {
    id: "oreo-shake",
    title: "Oreo Shake Promotion",
    category: "ADVERTISING POSTER",
    discipline: "Advertising Design",
    description: "A creative product advertisement designed to showcase an Oreo-inspired shake through an attractive and refreshing visual presentation.",
    image: "assets/gallery/Coffee%20Poster.png",
    approach: "A product-focused advertising approach that highlights the featured drink through visual hierarchy and appealing presentation.",
    objective: "To attract attention and create interest in the product through an engaging promotional design.",
    concept: "Inspired by the delicious combination of chocolate, cookies and creamy milkshake textures.",
    direction: "Prioritise the product image and support it with attractive typography, colour and promotional messaging.",
    designLanguage: "Fresh, playful and appetising, using a visually engaging product-focused composition.",
    process: [
      "Identify the main product and advertising message.",
      "Build the promotional layout around the featured drink.",
      "Refine colours, typography and overall presentation."
    ]
  },
  {
    id: "the-weeknd",
    title: "The Weeknd Music-Inspired Design",
    category: "MUSIC POSTER",
    discipline: "Visual Design",
    description: "A cinematic music-inspired poster exploring The Weeknd's artistic identity through dramatic imagery, atmosphere and visual contrast.",
    image: "assets/gallery/The%20Weeknd%20Design%2003.png",
    approach: "A cinematic visual approach that uses imagery, lighting and contrast to communicate the mood of the artist.",
    objective: "To develop a memorable music poster that communicates the atmosphere and personality of the artist's music.",
    concept: "Inspired by atmospheric music, emotional storytelling and contemporary pop culture.",
    direction: "Create a dominant visual focal point supported by dramatic lighting, tonal contrast and carefully positioned typography.",
    designLanguage: "Cinematic, atmospheric, dramatic and contemporary, with a strong emphasis on visual storytelling.",
    process: [
      "Explore the artist's atmosphere and visual references.",
      "Develop the main image and cinematic composition.",
      "Refine lighting, contrast and typography placement."
    ]
  },
  {
    id: "hindi-poster",
    title: "Cinematic Portrait Design",
    category: "MUSIC POSTER",
    discipline: "Visual Exploration",
    description: "Every ending has its own beauty. A moment where golden light meets the darkness, capturing the beauty of something slowly fading away." <br>"Even the most beautiful light has its final moment. As the last rays of sunlight touch her face, darkness slowly takes over.",
    image: "assets/gallery/Hindi%20Poster%2002.png",
    approach: "A portrait-led design approach that uses composition, tonal contrast and negative space to create visual impact.",
    objective: "To create an atmospheric poster that captures attention through a strong cinematic portrait.",
    concept: "Inspired by cinematic storytelling, expressive portraiture and dramatic visual composition.",
    direction: "Let the portrait lead the composition while using supporting visual elements to establish depth and atmosphere.",
    designLanguage: "Cinematic, dramatic, expressive and minimal, with a focus on portrait imagery.",
    process: [
      "Select the main portrait and establish the visual mood.",
      "Develop the cinematic composition and supporting elements.",
      "Refine tonal balance, spacing and typography."
    ]
  },
  {
    id: "magic-show",
    title: "Magic Show",
    category: "EVENT PROMOTION",
    discipline: "Event Graphic Design",
    description: "A promotional event poster designed to capture the mystery, excitement and theatrical atmosphere of a live magic show.",
    image: "assets/gallery/Magican%20Poster%2007.png",
    approach: "A theatrical design approach combining mysterious imagery, dramatic visual effects and clear event information.",
    objective: "To promote the magic show and create curiosity and excitement among the target audience.",
    concept: "Inspired by magical illusions, theatrical performances, mystery and unexpected experiences.",
    direction: "Build the composition around a strong magical visual, supported by dramatic effects and prominent event typography.",
    designLanguage: "Mysterious, theatrical, dramatic and imaginative, with strong visual contrast.",
    process: [
      "Establish the theme and mysterious visual atmosphere.",
      "Combine magical imagery with the event information.",
      "Refine typography, effects and readability."
    ]
  },
  {
    id: "halloween-party",
    title: "Halloween Party",
    category: "EVENT PROMOTION",
    discipline: "Event Branding",
    description: "A Halloween-themed event poster created to communicate a spooky atmosphere and promote an exciting themed entertainment experience.",
    image: "assets/gallery/Main%20Poster%2004.png",
    approach: "A dark cinematic design approach using Halloween-inspired visuals, atmospheric effects and expressive typography.",
    objective: "To promote the Halloween party and build excitement and curiosity among the intended audience.",
    concept: "Inspired by Halloween traditions, haunted environments, spooky characters and themed entertainment.",
    direction: "Create an immersive dark composition with a prominent event title and clearly organised supporting information.",
    designLanguage: "Spooky, cinematic, dark and atmospheric, using dramatic visual elements to establish the Halloween identity.",
    process: [
      "Explore Halloween references and establish the event theme.",
      "Develop the main visual composition and event identity.",
      "Refine typography, atmosphere and information hierarchy."
    ]
  },
  {
    id: "dj-night",
    title: "DJ Night Poster",
    category: "EVENT PROMOTION",
    discipline: "Event Graphic Design",
    description: "An energetic promotional poster created to communicate the excitement of a DJ event and capture the atmosphere of nightlife entertainment.",
    image: "assets/gallery/Party%20Poster.png",
    approach: "A high-energy graphic approach combining bold typography, dynamic visual elements and nightlife-inspired effects.",
    objective: "To attract attention and promote the DJ night through an energetic and engaging visual.",
    concept: "Inspired by nightlife culture, electronic music, club environments and live DJ performances.",
    direction: "Give the event title and main graphic elements strong visual priority while maintaining a clear information layout.",
    designLanguage: "Energetic, vibrant, modern and bold, with strong contrast and dynamic typography.",
    process: [
      "Establish the event mood and nightlife visual direction.",
      "Develop the poster layout and main graphic elements.",
      "Refine typography, contrast and information placement."
    ]
  },
  {
    id: "event-postponed",
    title: "Event Postponement Announcement",
    category: "ANNOUNCEMENT POSTER",
    discipline: "Social Media Design",
    description: "An announcement poster designed to communicate an event postponement clearly and professionally through a direct visual message.",
    image: "assets/gallery/Postpoend%20Poster%2002.png",
    approach: "An information-focused design approach that prioritises clarity, visibility and effective communication.",
    objective: "To inform the audience about the event schedule change while keeping the announcement easy to understand.",
    concept: "A straightforward announcement concept focused on delivering important information quickly.",
    direction: "Make the postponement message the main focal point and keep supporting information organised and readable.",
    designLanguage: "Minimal, professional, clear and modern, with strong typography and visual hierarchy.",
    process: [
      "Identify the essential announcement information.",
      "Organise the message into a clear visual hierarchy.",
      "Refine typography, spacing and readability."
    ]
  },
  {
    id: "tickets-80",
    title: "Tickets 80% Sold Out",
    category: "PROMOTIONAL DESIGN",
    discipline: "Event Promotion",
    description: "A ticket-sales promotional design created to highlight an important sales milestone and encourage audiences to secure their event tickets.",
    image: "assets/gallery/Ticket%2080%25%20Poster%2013.png",
    approach: "A promotional design approach that uses a strong headline and clear visual hierarchy to communicate urgency.",
    objective: "To highlight that 80% of tickets have been sold and encourage potential attendees to take action.",
    concept: "Transforming a ticket-sales milestone into an attention-grabbing promotional message.",
    direction: "Give the 80% sold-out message visual priority and make the supporting call to action easy to notice.",
    designLanguage: "Bold, modern, energetic and functional, with high-contrast typography and a clear promotional message.",
    process: [
      "Establish the ticket-sales milestone as the main message.",
      "Create a promotional layout with a clear call to action.",
      "Refine typography, contrast and information hierarchy."
    ]
  }
];
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
 document.getElementById("project-software-list").innerHTML='<img class="project-software-icon" src="assets/Photoshop%20Logo.png?v=2" alt="Adobe Photoshop logo"><div><strong>Adobe Photoshop</strong><p>Image editing, poster composition and final visual refinement.</p></div>';
 const image=document.getElementById("project-image");image.src=project.image;image.alt=project.title;
})();
