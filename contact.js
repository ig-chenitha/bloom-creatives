const contactForm = document.getElementById("contact-form");

if (contactForm && window.supabase) {
  const contactClient = window.supabase.createClient(
    "https://qenobhmetbarxepggocx.supabase.co",
    "sb_publishable_U3jXC6vggzC_bqHJxmAoEA_riJcQh29"
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
      const { error: saveError } = await contactClient
        .from("contact_messages")
        .insert(message);
      if (saveError) throw saveError;

      const { error: emailError } = await contactClient.functions.invoke(
        "send-contact-email",
        { body: message }
      );

      contactForm.reset();
      if (emailError) {
        console.error("BLOOM email notification:", emailError);
        status.textContent = "Your message was saved, but the email notification could not be sent. Please try again later.";
      } else {
        status.textContent = "Thank you! Your message has been received and an email notification has been sent.";
      }
    } catch (error) {
      console.error("BLOOM contact form:", error);
      status.textContent = "Sorry, your message could not be submitted. Please try again or email bloom.creativesss@gamil.com.";
    } finally {
      submitButton.disabled = false;
      submitButton.innerHTML = 'SEND MESSAGE <span>↗</span>';
    }
  });
} else if (contactForm) {
  const status = document.getElementById("contact-status");
  if (status) status.textContent = "The contact form is temporarily unavailable. Please email bloom.creativesss@gamil.com.";
}
