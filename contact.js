const contactForm=document.getElementById("contact-form");
if(contactForm){
  contactForm.addEventListener("submit",(event)=>{
    event.preventDefault();
    if(!contactForm.reportValidity()) return;
    const data=new FormData(contactForm);
    const subject=encodeURIComponent("BLOOM CREATIVES — "+data.get("service")+" enquiry");
    const body=encodeURIComponent(
      "Name: "+data.get("name")+"\n"+
      "Email: "+data.get("email")+"\n"+
      "Service: "+data.get("service")+"\n\n"+
      "Project details:\n"+data.get("message")
    );
    const status=document.getElementById("contact-status");
    status.textContent="Opening your email app…";
    window.location.href="mailto:vyntro.creatives@gmail.com?subject="+subject+"&body="+body;
    window.setTimeout(()=>{status.textContent="If your email app did not open, email vyntro.creatives@gmail.com directly.";},1200);
  });
}