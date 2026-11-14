const contactForm = document.getElementById("contact-form");

if (contactForm && window.supabase) {
  const contactClient = window.supabase.createClient(
    "https://zkxtlbvgurziniicpdyg.supabase.co",
    "sb_publishable_Q3IBH3JE1e6fGoqFQNUoig_FLufny0b"
  );
  const status = document.getElementById("contact-status");
  const submitButton = contactForm.querySelector(".contact-send");

  contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!contactForm.reportValidity()) return;
    const formData = new FormData(contactForm);
    const message = {
      name: String(formData.get("name") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      service: String(formData.get("service") || "").trim(),
      message: String(formData.get("message") || "").trim()
    };
    submitButton.disabled = true;
    submitButton.textContent = "SENDING...";
    status.textContent = "Sending your message securely...";
    try {
      const { error } = await contactClient.from("contact_messages").insert(message);
      if (error) throw error;
      contactForm.reset();
      status.textContent = "Thank you! Your message has been received. I will get back to you soon.";
    } catch (error) {
      console.error("BLOOM contact form:", error);
      status.textContent = "Sorry, your message could not be sent. Please try again or email bloom.creativesss@gamil.com.";
    } finally {
      submitButton.disabled = false;
      submitButton.innerHTML = 'SEND MESSAGE <span>↗</span>';
    }
  });
} else if (contactForm) {
  const status = document.getElementById("contact-status");
  if (status) status.textContent = "The contact form is temporarily unavailable. Please email bloom.creativesss@gamil.com.";
}
