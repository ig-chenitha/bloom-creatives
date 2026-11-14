(() => {
  const SUPABASE_URL = "https://qenobhmetbarxepggocx.supabase.co";
  const SUPABASE_KEY = "sb_publishable_U3jXC6vggzC_bqHJxmAoEA_riJcQh29";
  const ADMIN_EMAIL = "chenithakodithuwakku444@gmail.com";
  const loginSection = document.getElementById("admin-login");
  const dashboard = document.getElementById("admin-dashboard");
  const loginForm = document.getElementById("admin-login-form");
  const loginMessage = document.getElementById("login-message");
  const loginButton = document.getElementById("login-button");
  const list = document.getElementById("admin-feedback-list");
  const dashboardMessage = document.getElementById("dashboard-message");
  if (!window.supabase) {
    loginMessage.textContent = "Dashboard could not connect. Please refresh the page.";
    return;
  }
  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  let currentFilter = "pending";
  let feedbackRows = [];

  function showDashboard() {
    loginSection.hidden = true;
    dashboard.hidden = false;
    refreshFeedback();
  }
  function showLogin() {
    dashboard.hidden = true;
    loginSection.hidden = false;
  }
  async function verifySession() {
    const { data: { user } } = await client.auth.getUser();
    if (!user) return;
    if ((user.email || "").toLowerCase() !== ADMIN_EMAIL) {
      await client.auth.signOut();
      loginMessage.textContent = "This account is not authorised to access the admin dashboard.";
      return;
    }
    showDashboard();
  }
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    loginButton.disabled = true;
    loginMessage.textContent = "Verifying your account…";
    const email = document.getElementById("admin-email").value.trim().toLowerCase();
    const password = document.getElementById("admin-password").value;
    if (email !== ADMIN_EMAIL) {
      loginMessage.textContent = "Please use the authorised admin email address.";
      loginButton.disabled = false;
      return;
    }
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    loginButton.disabled = false;
    if (error) {
      loginMessage.textContent = "Sign-in failed. Check your password or create this user in Supabase Auth first.";
      return;
    }
    if ((data.user?.email || "").toLowerCase() !== ADMIN_EMAIL) {
      await client.auth.signOut();
      loginMessage.textContent = "This account is not authorised.";
      return;
    }
    document.getElementById("admin-password").value = "";
    showDashboard();
  });

  async function refreshFeedback() {
    list.innerHTML = '<p class="admin-muted">Loading feedback…</p>';
    const { data, error } = await client.from("client_feedback")
      .select("id,name,email,rating,feedback,approved,created_at")
      .order("created_at", { ascending: false });
    if (error) {
      list.innerHTML = '<p class="admin-empty">Could not load feedback. Please sign out and sign in again.</p>';
      dashboardMessage.textContent = error.message;
      return;
    }
    feedbackRows = data || [];
    const pending = feedbackRows.filter(row => !row.approved).length;
    const approved = feedbackRows.filter(row => row.approved).length;
    document.getElementById("stat-total").textContent = feedbackRows.length;
    document.getElementById("stat-pending").textContent = pending;
    document.getElementById("stat-approved").textContent = approved;
    renderList();
  }
  function renderList() {
    const rows = feedbackRows.filter(row => currentFilter === "all" || (currentFilter === "approved" ? row.approved : !row.approved));
    if (!rows.length) {
      list.innerHTML = '<p class="admin-empty">Nothing to show in this section yet.</p>';
      return;
    }
    list.replaceChildren(...rows.map(row => {
      const card = document.createElement("article");
      card.className = "admin-feedback-card";
      const top = document.createElement("div");
      top.className = "admin-card-top";
      const stars = document.createElement("span");
      stars.className = "admin-stars";
      stars.textContent = "★".repeat(row.rating) + "☆".repeat(5 - row.rating);
      const status = document.createElement("span");
      status.className = "admin-status";
      status.textContent = row.approved ? "APPROVED" : "PENDING REVIEW";
      top.append(stars, status);
      const message = document.createElement("p");
      message.textContent = row.feedback;
      const clientInfo = document.createElement("div");
      clientInfo.className = "admin-client";
      const name = document.createElement("strong");
      name.textContent = row.name;
      const email = document.createElement("small");
      email.textContent = row.email;
      clientInfo.append(name, email);
      const bottom = document.createElement("div");
      bottom.className = "admin-card-bottom";
      const date = document.createElement("time");
      date.className = "admin-date";
      date.dateTime = row.created_at;
      date.textContent = new Date(row.created_at).toLocaleString();
      const actions = document.createElement("div");
      actions.className = "admin-actions";
      if (!row.approved) {
        const approve = document.createElement("button");
        approve.type = "button";
        approve.className = "admin-action approve";
        approve.textContent = "APPROVE";
        approve.addEventListener("click", () => updateApproval(row.id, true));
        actions.append(approve);
      } else {
        const unapprove = document.createElement("button");
        unapprove.type = "button";
        unapprove.className = "admin-action";
        unapprove.textContent = "UNAPPROVE";
        unapprove.addEventListener("click", () => updateApproval(row.id, false));
        actions.append(unapprove);
      }
      const reject = document.createElement("button");
      reject.type = "button";
      reject.className = "admin-action reject";
      reject.textContent = "REJECT & DELETE";
      reject.addEventListener("click", () => rejectFeedback(row.id));
      actions.append(reject);
      bottom.append(date, actions);
      card.append(top, message, clientInfo, bottom);
      return card;
    }));
  }
  async function updateApproval(id, approved) {
    dashboardMessage.textContent = approved ? "Approving feedback…" : "Moving feedback back to pending…";
    const { error } = await client.from("client_feedback").update({ approved }).eq("id", id);
    if (error) { dashboardMessage.textContent = "Could not update feedback. " + error.message; return; }
    dashboardMessage.textContent = approved ? "Feedback approved and now visible on the public page." : "Feedback moved back to pending.";
    await refreshFeedback();
  }
  async function rejectFeedback(id) {
    if (!window.confirm("Reject and permanently delete this feedback?")) return;
    dashboardMessage.textContent = "Deleting feedback…";
    const { error } = await client.from("client_feedback").delete().eq("id", id);
    if (error) { dashboardMessage.textContent = "Could not delete feedback. " + error.message; return; }
    dashboardMessage.textContent = "Feedback rejected and deleted.";
    await refreshFeedback();
  }
  document.querySelectorAll(".admin-tab").forEach(button => {
    button.addEventListener("click", () => {
      currentFilter = button.dataset.filter;
      document.querySelectorAll(".admin-tab").forEach(tab => tab.classList.toggle("active", tab === button));
      renderList();
    });
  });
  document.getElementById("admin-logout").addEventListener("click", async () => {
    await client.auth.signOut();
    feedbackRows = [];
    showLogin();
  });
  verifySession();
})();