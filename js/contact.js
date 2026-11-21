const contactForm = document.getElementById("contact-form");

if (contactForm) {
  const status = document.getElementById("contact-status");
  const submitButton = contactForm.querySelector(".contact-send");

  contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!contactForm.reportValidity()) return;

    const formData = new FormData(contactForm);
    const message = {
      access_key: "ef6d1e80-7bfc-4284-93af-6a9d843cd2fc",
      subject: "New website enquiry — BLOOM CREATIVES",
      from_name: "BLOOM CREATIVES Website",
      name: String(formData.get("name") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      service: String(formData.get("service") || "").trim(),
      message: String(formData.get("message") || "").trim()
    };

    submitButton.disabled = true;
    submitButton.textContent = "SENDING...";
    status.textContent = "Sending your message securely...";

    try {
      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(message)
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Message delivery failed");
      }

      contactForm.reset();
      status.textContent = "Thank you! Your message has been sent successfully. I'll get back to you soon.";
    } catch (error) {
      console.error("BLOOM contact form:", error);
      status.textContent = "Sorry, your message could not be sent right now. Please try again or email bloom.creativesss@gmail.com.";
    } finally {
      submitButton.disabled = false;
      submitButton.innerHTML = 'SEND MESSAGE <span>↗</span>';
    }
  });
}
