function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

function formatBRL(value) {
  return (value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(value) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  return isNaN(date.getTime()) ? "-" : date.toLocaleDateString("pt-BR");
}

function showScreen(name) {
  document.getElementById("screen-login").classList.toggle("hidden", name !== "login");
  document.getElementById("screen-forbidden").classList.toggle("hidden", name !== "forbidden");
  document.getElementById("app").classList.toggle("hidden", name !== "app");
}

async function loadAccounts() {
  const container = document.getElementById("accounts-table");
  container.textContent = "Carregando...";
  try {
    const [accounts, stats] = await Promise.all([
      window.OrceiAdmin.adminListAccounts(),
      window.OrceiAdmin.adminGetDashboardStats(),
    ]);
    const statsByAccount = Object.fromEntries(stats.map((s) => [s.accountId, s]));

    const rows = accounts.map((acc) => {
      const s = statsByAccount[acc.id] || {};
      const expiresAt = acc.subscriptionExpiresAt?.toDate?.() ?? acc.subscriptionExpiresAt ?? null;
      const isExpired = expiresAt ? new Date(expiresAt) < new Date() : true;
      return `
        <tr>
          <td>${esc(acc.companyName)}</td>
          <td>${esc(acc.email)}</td>
          <td>${esc(acc.status)}${isExpired ? " (vencida)" : ""}</td>
          <td>${formatDate(expiresAt)}</td>
          <td>${s.totalPropostas ?? 0}</td>
          <td>${s.abertas ?? 0}</td>
          <td>${formatBRL(s.valorEmAberto)}</td>
          <td>${s.fechados ?? 0}</td>
          <td>${formatBRL(s.valorTotalFechado)}</td>
          <td style="white-space:nowrap;">
            <a class="link-btn" href="index.html?viewAs=${encodeURIComponent(acc.id)}" target="_blank" rel="noopener">ver como cliente</a>
            <button class="link-btn" data-renew="${esc(acc.id)}">+1 mês</button>
            <button class="link-btn" data-toggle="${esc(acc.id)}" data-status="${esc(acc.status)}">
              ${acc.status === "active" ? "suspender" : "ativar"}
            </button>
          </td>
        </tr>
      `;
    }).join("");

    container.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Empresa</th><th>E-mail</th><th>Status</th><th>Vence em</th>
            <th>Propostas</th><th>Abertas</th><th>Em aberto (R$)</th><th>Fechados</th><th>Faturado (fechado)</th><th>Ações</th>
          </tr>
        </thead>
        <tbody>${rows || `<tr><td colspan="10">Nenhuma conta ainda.</td></tr>`}</tbody>
      </table>
    `;

    container.querySelectorAll("[data-renew]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        btn.disabled = true;
        try {
          await window.OrceiAdmin.adminRenewSubscription(btn.dataset.renew, 1);
          await loadAccounts();
        } catch (e) {
          console.error("Falha ao renovar assinatura", e);
          alert("Não foi possível renovar.");
          btn.disabled = false;
        }
      });
    });

    container.querySelectorAll("[data-toggle]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const nextStatus = btn.dataset.status === "active" ? "suspended" : "active";
        btn.disabled = true;
        try {
          await window.OrceiAdmin.adminSetAccountStatus(btn.dataset.toggle, nextStatus);
          await loadAccounts();
        } catch (e) {
          console.error("Falha ao atualizar status", e);
          alert("Não foi possível atualizar o status.");
          btn.disabled = false;
        }
      });
    });
  } catch (e) {
    console.error("Falha ao carregar contas", e);
    container.textContent = "Não foi possível carregar as contas.";
  }
}

function attachLoginForm() {
  document.getElementById("login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const errEl = document.getElementById("login-error");
    errEl.textContent = "";
    const email = document.getElementById("login-email").value.trim();
    const senha = document.getElementById("login-password").value;
    const btn = document.getElementById("login-submit");
    btn.disabled = true;
    try {
      await window.OrceiDB.login(email, senha);
    } catch (err) {
      errEl.textContent = "E-mail ou senha inválidos.";
    } finally {
      btn.disabled = false;
    }
  });
}

function attachCreateAccountForm() {
  document.getElementById("btn-create-account").addEventListener("click", async () => {
    const companyName = document.getElementById("new-company-name").value.trim();
    const email = document.getElementById("new-company-email").value.trim();
    const months = Number(document.getElementById("new-company-months").value) || 1;
    const msgEl = document.getElementById("create-account-msg");

    if (!companyName || !email) {
      msgEl.textContent = "Preencha nome e e-mail.";
      return;
    }

    msgEl.textContent = "Criando...";
    try {
      await window.OrceiAdmin.adminCreateAccount({ companyName, email, subscriptionMonths: months });
      msgEl.textContent = "Conta criada! O cliente vai receber um e-mail pra definir a senha.";
      document.getElementById("new-company-name").value = "";
      document.getElementById("new-company-email").value = "";
      document.getElementById("new-company-months").value = "1";
      await loadAccounts();
    } catch (e) {
      console.error("Falha ao criar conta", e);
      msgEl.textContent = "Não foi possível criar a conta: " + (e?.code || e?.message || e);
    }
  });
}

function boot() {
  attachLoginForm();
  attachCreateAccountForm();
  document.getElementById("logout-btn").addEventListener("click", () => window.OrceiDB.logout());
  document.getElementById("forbidden-logout-btn").addEventListener("click", () => window.OrceiDB.logout());

  window.OrceiDB.onAuthStateChange(async (user) => {
    if (!user) {
      showScreen("login");
      return;
    }
    const isAdmin = await window.OrceiAdmin.isCurrentUserAdmin();
    if (!isAdmin) {
      showScreen("forbidden");
      return;
    }
    showScreen("app");
    await loadAccounts();
  });
}

document.addEventListener("DOMContentLoaded", boot);
