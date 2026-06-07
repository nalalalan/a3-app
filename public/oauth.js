const state = document.getElementById("oauthState");
const message = document.getElementById("oauthMessage");

function setState(label, detail) {
  state.textContent = label;
  message.textContent = detail;
}

async function api(path, options = {}) {
  const code = localStorage.getItem("a3AccessCode") || "";
  const response = await fetch(path, {
    cache: "no-store",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(code ? { "x-a3-access": code } : {}),
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `${response.status}`);
  return data;
}

async function exchange(publicToken, metadata) {
  await api("/api/plaid/exchange-public-token", {
    method: "POST",
    body: JSON.stringify({ public_token: publicToken, metadata })
  });
  localStorage.removeItem("a3PlaidLinkToken");
  window.location.replace("/");
}

async function resumePlaid() {
  const token = localStorage.getItem("a3PlaidLinkToken");
  if (!token) {
    setState("Return path", "Open a3 and start bank connect again.");
    return;
  }
  if (!window.Plaid) {
    setState("Return path", "Plaid script pending.");
    return;
  }
  const handler = window.Plaid.create({
    token,
    receivedRedirectUri: window.location.href,
    onSuccess: async (publicToken, metadata) => {
      setState("Syncing", "Saving bank connection.");
      await exchange(publicToken, metadata);
    },
    onExit: (error) => {
      setState(error ? "Return path" : "Closed", error?.display_message || error?.error_message || "Return to a3.");
    }
  });
  handler.open();
}

resumePlaid().catch((error) => {
  setState("Return path", error.message);
});
