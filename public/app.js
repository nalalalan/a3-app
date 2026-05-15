const els = {
  storageState: document.getElementById("storageState"),
  csvInput: document.getElementById("csvInput"),
  runAdvisor: document.getElementById("runAdvisor"),
  tickButton: document.getElementById("tickButton"),
  lockPanel: document.getElementById("lockPanel"),
  accessInput: document.getElementById("accessInput"),
  unlockButton: document.getElementById("unlockButton"),
  accessMessage: document.getElementById("accessMessage"),
  modeSelect: document.getElementById("modeSelect"),
  balanceInput: document.getElementById("balanceInput"),
  floorInput: document.getElementById("floorInput"),
  downPaymentInput: document.getElementById("downPaymentInput"),
  monthlyCapInput: document.getElementById("monthlyCapInput"),
  targetDateInput: document.getElementById("targetDateInput"),
  saveSettings: document.getElementById("saveSettings"),
  stateLabel: document.getElementById("stateLabel"),
  stateReason: document.getElementById("stateReason"),
  gapValue: document.getElementById("gapValue"),
  gapLabel: document.getElementById("gapLabel"),
  roomValue: document.getElementById("roomValue"),
  roomLabel: document.getElementById("roomLabel"),
  actionLabel: document.getElementById("actionLabel"),
  actionDetail: document.getElementById("actionDetail"),
  a3Price: document.getElementById("a3Price"),
  a3Code: document.getElementById("a3Code"),
  a3Build: document.getElementById("a3Build"),
  advisorStatus: document.getElementById("advisorStatus"),
  advisorSummary: document.getElementById("advisorSummary"),
  advisorAction: document.getElementById("advisorAction"),
  advisorEffect: document.getElementById("advisorEffect"),
  weekChart: document.getElementById("weekChart"),
  watchList: document.getElementById("watchList"),
  recurringList: document.getElementById("recurringList"),
  categoryList: document.getElementById("categoryList"),
  eventList: document.getElementById("eventList"),
  transactionList: document.getElementById("transactionList"),
  chatInput: document.getElementById("chatInput"),
  chatButton: document.getElementById("chatButton"),
  chatList: document.getElementById("chatList")
};

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0
});

const moneyExact = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2
});

const shortDate = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC"
});

let latestState = null;

async function api(path, options = {}) {
  const { accessCodeOverride, headers = {}, ...fetchOptions } = options;
  const code = accessCodeOverride ?? localStorage.getItem("a3AccessCode") ?? "";
  const response = await fetch(path, {
    cache: "no-store",
    ...fetchOptions,
    headers: {
      "Content-Type": "application/json",
      ...(code ? { "x-a3-access": code } : {}),
      ...headers
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || `${response.status}`);
    error.locked = Boolean(data.locked || response.status === 401);
    throw error;
  }
  return data;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function signed(value) {
  const number = Number(value || 0);
  const formatted = money.format(Math.abs(number));
  if (number > 0) return `+${formatted}`;
  if (number < 0) return `-${formatted}`;
  return formatted;
}

function dateLabel(date) {
  if (!date) return "--";
  return shortDate.format(new Date(`${date}T00:00:00Z`));
}

function setBusy(text) {
  els.storageState.textContent = text;
}

function showLock(message = "Code required") {
  els.lockPanel.hidden = false;
  els.accessMessage.textContent = message;
  els.accessInput.focus();
}

function hideLock() {
  els.lockPanel.hidden = true;
  els.accessMessage.textContent = "";
}

async function loadState() {
  const data = await api("/api/state");
  latestState = data;
  hideLock();
  render(data);
}

function render(data) {
  const analysis = data.analysis;
  const settings = analysis.settings;
  const goal = analysis.goal;
  const latestRun = data.advisorRuns[0];
  const latestImport = data.imports[0];

  els.storageState.textContent = latestRun?.error
    ? "AI blocked"
    : latestImport?.source === "sample"
      ? "Sample data"
      : data.openaiConfigured
        ? `AI ${data.model}`
        : "AI missing";
  els.modeSelect.value = settings.mode;
  els.balanceInput.value = settings.currentBalance;
  els.floorInput.value = settings.cashFloor;
  els.downPaymentInput.value = settings.downPaymentTarget;
  els.monthlyCapInput.value = settings.monthlyCarCap;
  els.targetDateInput.value = settings.targetDate || "";

  document.documentElement.dataset.state = analysis.readiness.color;
  els.stateLabel.textContent = analysis.readiness.label;
  els.stateReason.textContent = analysis.readiness.reason;
  els.gapValue.textContent = money.format(goal.downPaymentGap);
  els.gapLabel.textContent = `${money.format(goal.availableForDownPayment)} above floor / ${money.format(goal.downPaymentTarget)} target`;
  els.roomValue.textContent = signed(goal.monthlyRoom);
  els.roomLabel.textContent = `${money.format(goal.monthlySavingsPace)} saved/mo / ${money.format(goal.monthlySavingsNeeded)} needed`;
  els.actionLabel.textContent = analysis.action.label;
  els.actionDetail.textContent = analysis.action.detail;

  els.a3Price.textContent = money.format(data.goal.priceAsBuilt);
  els.a3Code.textContent = data.goal.audiCode;
  els.a3Build.textContent = `${data.goal.exterior} / ${data.goal.interior} / ${data.goal.package}`;

  if (latestRun) {
    els.advisorStatus.textContent = latestRun.advice.status;
    els.advisorSummary.textContent = latestRun.advice.summary;
    els.advisorAction.textContent = latestRun.advice.one_action;
    els.advisorEffect.textContent = latestRun.advice.a3_effect;
  } else {
    els.advisorStatus.textContent = "not run";
    els.advisorSummary.textContent = "Run advisor after import";
    els.advisorAction.textContent = analysis.action.label;
    els.advisorEffect.textContent = analysis.action.detail;
  }

  renderWeeks(analysis.weeks);
  renderRows(els.watchList, analysis.watch, (item) => [item.label, item.detail]);
  renderRows(els.recurringList, analysis.recurring, (item) => [item.merchant, `${moneyExact.format(item.amount)} / ${item.count} hits`]);
  renderRows(els.categoryList, analysis.categories, (item) => [item.category, money.format(item.total)]);
  renderRows(els.eventList, data.events, (item) => [item.label, `${item.type} / ${new Date(item.createdAt).toLocaleString()}`]);
  renderTransactions(analysis.transactions);
  renderChat(data.messages);
}

function renderWeeks(weeks) {
  const max = Math.max(...weeks.map((week) => week.total), 1);
  els.weekChart.innerHTML = weeks.map((week) => {
    const height = Math.max(3, Math.round((week.total / max) * 100));
    return `<div class="week">
      <div class="bar-wrap"><span class="bar" style="--h:${height}%"></span></div>
      <strong>${escapeHtml(money.format(week.total))}</strong>
      <span>${escapeHtml(dateLabel(week.start))}</span>
    </div>`;
  }).join("");
}

function renderRows(container, items, mapper) {
  container.innerHTML = items.length ? items.map((item) => {
    const [label, detail] = mapper(item);
    return `<div class="row">
      <div class="row-main">
        <strong>${escapeHtml(label)}</strong>
        <span>${escapeHtml(detail)}</span>
      </div>
    </div>`;
  }).join("") : `<div class="empty">None.</div>`;
}

function renderTransactions(transactions) {
  els.transactionList.innerHTML = transactions.slice(0, 18).map((transaction) => {
    const value = transaction.spend > 0 ? -transaction.spend : transaction.inflow;
    return `<div class="tx">
      <div class="tx-main">
        <strong>${escapeHtml(transaction.merchant)}</strong>
        <strong class="amount ${value < 0 ? "negative" : "positive"}">${escapeHtml(moneyExact.format(value))}</strong>
      </div>
      <div class="tx-meta">
        <span>${escapeHtml(dateLabel(transaction.date))} / ${escapeHtml(transaction.category)}</span>
        <span>${escapeHtml(transaction.type || transaction.source || "")}</span>
      </div>
    </div>`;
  }).join("") || `<div class="empty">No transactions.</div>`;
}

function renderChat(messages) {
  els.chatList.innerHTML = messages.slice(-10).map((message) => (
    `<div class="message ${message.role}">
      <strong>${escapeHtml(message.role)}</strong>
      <span>${escapeHtml(message.text)}</span>
    </div>`
  )).join("") || `<div class="empty">No chat yet.</div>`;
}

function settingsPayload() {
  return {
    settings: {
      mode: els.modeSelect.value,
      currentBalance: els.balanceInput.value.trim(),
      cashFloor: Number(els.floorInput.value || 0),
      downPaymentTarget: Number(els.downPaymentInput.value || 0),
      monthlyCarCap: Number(els.monthlyCapInput.value || 0),
      targetDate: els.targetDateInput.value
    }
  };
}

els.saveSettings.addEventListener("click", async () => {
  setBusy("Saving");
  await api("/api/settings", {
    method: "POST",
    body: JSON.stringify(settingsPayload())
  });
  await loadState();
});

els.csvInput.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    setBusy("Importing");
    const text = await file.text();
    await api("/api/import-csv", {
      method: "POST",
      body: JSON.stringify({ name: file.name, text })
    });
    await loadState();
  } finally {
    event.target.value = "";
  }
});

els.runAdvisor.addEventListener("click", async () => {
  setBusy("Advisor");
  await api("/api/advisor/run", { method: "POST", body: "{}" });
  await loadState();
});

els.tickButton.addEventListener("click", async () => {
  setBusy("Checking");
  await api("/api/monitor/tick", { method: "POST", body: "{}" });
  await loadState();
});

els.unlockButton.addEventListener("click", async () => {
  const code = els.accessInput.value.trim();
  if (!code) return;
  try {
    setBusy("Unlocking");
    await api("/api/auth/check", {
      method: "POST",
      body: JSON.stringify({ code }),
      accessCodeOverride: code
    });
    localStorage.setItem("a3AccessCode", code);
    await loadState();
  } catch (error) {
    showLock(error.message);
    setBusy("Locked");
  }
});

els.accessInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") els.unlockButton.click();
});

els.chatButton.addEventListener("click", async () => {
  const message = els.chatInput.value.trim();
  if (!message) return;
  setBusy("Thinking");
  els.chatInput.value = "";
  await api("/api/chat", {
    method: "POST",
    body: JSON.stringify({ message })
  });
  await loadState();
});

loadState().catch((error) => {
  if (error.locked) {
    setBusy("Locked");
    showLock(error.message);
    return;
  }
  setBusy("Blocked");
  document.body.insertAdjacentHTML("beforeend", `<pre class="boot-error">${escapeHtml(error.message)}</pre>`);
});
