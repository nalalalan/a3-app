const STORAGE_KEY = "chaseRadar:v1";

const SAMPLE_TRANSACTIONS = [
  ["2026-05-15", "PAYROLL AO LABS", "Income", "ACH Credit", 2140.00, 3482.12],
  ["2026-05-14", "CHASE CREDIT CARD PAYMENT", "Bills", "ACH Debit", -420.00, 1342.12],
  ["2026-05-13", "TRADER JOE'S 538", "Groceries", "Debit Card", -38.22, 1762.12],
  ["2026-05-12", "SPOTIFY USA", "Subscriptions", "Debit Card", -11.99, 1800.34],
  ["2026-05-11", "WALGREENS", "Health", "Debit Card", -18.43, 1812.33],
  ["2026-05-10", "MTA MOBILE TICKET", "Transport", "Debit Card", -17.00, 1830.76],
  ["2026-05-09", "DOORDASH", "Food", "Debit Card", -34.12, 1847.76],
  ["2026-05-07", "TARGET", "Home", "Debit Card", -63.77, 1881.88],
  ["2026-05-05", "RENT PAYMENT", "Bills", "ACH Debit", -925.00, 1945.65],
  ["2026-05-02", "NETFLIX", "Subscriptions", "Debit Card", -15.49, 2870.65],
  ["2026-05-01", "PAYROLL AO LABS", "Income", "ACH Credit", 2140.00, 2886.14],
  ["2026-04-30", "CHIPOTLE", "Food", "Debit Card", -15.88, 746.14],
  ["2026-04-28", "CVS", "Health", "Debit Card", -12.72, 762.02],
  ["2026-04-26", "SHELL OIL", "Transport", "Debit Card", -42.68, 774.74],
  ["2026-04-24", "TRADER JOE'S 538", "Groceries", "Debit Card", -46.29, 817.42],
  ["2026-04-21", "OPENAI", "Tools", "Debit Card", -20.00, 863.71],
  ["2026-04-18", "UBER TRIP", "Transport", "Debit Card", -28.16, 883.71],
  ["2026-04-16", "PAYROLL AO LABS", "Income", "ACH Credit", 2140.00, 911.87],
  ["2026-04-14", "CHASE CREDIT CARD PAYMENT", "Bills", "ACH Debit", -360.00, -1228.13],
  ["2026-04-12", "SPOTIFY USA", "Subscriptions", "Debit Card", -11.99, -868.13],
  ["2026-04-06", "RENT PAYMENT", "Bills", "ACH Debit", -925.00, -856.14],
  ["2026-04-02", "NETFLIX", "Subscriptions", "Debit Card", -15.49, 68.86],
  ["2026-04-01", "PAYROLL AO LABS", "Income", "ACH Credit", 2140.00, 84.35],
  ["2026-03-29", "TRADER JOE'S 538", "Groceries", "Debit Card", -51.22, -2055.65],
  ["2026-03-22", "OPENAI", "Tools", "Debit Card", -20.00, -2004.43],
  ["2026-03-16", "PAYROLL AO LABS", "Income", "ACH Credit", 2140.00, -1984.43],
  ["2026-03-12", "SPOTIFY USA", "Subscriptions", "Debit Card", -11.99, -4124.43],
  ["2026-03-06", "RENT PAYMENT", "Bills", "ACH Debit", -925.00, -4112.44],
  ["2026-03-02", "NETFLIX", "Subscriptions", "Debit Card", -15.49, -3187.44],
  ["2026-03-01", "PAYROLL AO LABS", "Income", "ACH Credit", 2140.00, -3171.95]
].map(([date, description, category, type, amount, balance], index) => ({
  id: `sample-${index}`,
  date,
  description,
  category,
  type,
  amount,
  balance,
  source: "sample"
}));

const els = {
  storageState: document.getElementById("storageState"),
  csvInput: document.getElementById("csvInput"),
  modeSelect: document.getElementById("modeSelect"),
  balanceInput: document.getElementById("balanceInput"),
  floorInput: document.getElementById("floorInput"),
  sampleButton: document.getElementById("sampleButton"),
  clearButton: document.getElementById("clearButton"),
  stateLabel: document.getElementById("stateLabel"),
  stateReason: document.getElementById("stateReason"),
  bufferValue: document.getElementById("bufferValue"),
  balanceLabel: document.getElementById("balanceLabel"),
  spendValue: document.getElementById("spendValue"),
  spendTrend: document.getElementById("spendTrend"),
  actionLabel: document.getElementById("actionLabel"),
  actionDetail: document.getElementById("actionDetail"),
  trendWindow: document.getElementById("trendWindow"),
  weekChart: document.getElementById("weekChart"),
  recurringCount: document.getElementById("recurringCount"),
  recurringList: document.getElementById("recurringList"),
  watchCount: document.getElementById("watchCount"),
  watchList: document.getElementById("watchList"),
  categoryCount: document.getElementById("categoryCount"),
  categoryList: document.getElementById("categoryList"),
  transactionCount: document.getElementById("transactionCount"),
  transactionList: document.getElementById("transactionList")
};

const moneyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0
});

const moneyExactFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2
});

const shortDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC"
});

let state = loadState();

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return {
      transactions: Array.isArray(saved.transactions) && saved.transactions.length
        ? saved.transactions
        : SAMPLE_TRANSACTIONS,
      dataName: saved.dataName || "Sample data",
      mode: saved.mode || "auto",
      manualBalance: saved.manualBalance ?? "",
      floor: saved.floor ?? 500
    };
  } catch {
    return {
      transactions: SAMPLE_TRANSACTIONS,
      dataName: "Sample data",
      mode: "auto",
      manualBalance: "",
      floor: 500
    };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (quoted) {
      if (char === '"' && next === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }

  row.push(field);
  rows.push(row);
  return rows.filter((items) => items.some((item) => String(item).trim()));
}

function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function headerValue(record, keys) {
  for (const key of keys) {
    const normalized = normalizeKey(key);
    if (normalized in record) return record[normalized];
  }
  return "";
}

function parseAmount(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return 0;
  const negative = /^\(.*\)$/.test(raw);
  const cleaned = raw.replace(/[(),$]/g, "");
  const amount = Number.parseFloat(cleaned);
  if (!Number.isFinite(amount)) return 0;
  return negative ? -Math.abs(amount) : amount;
}

function parseDate(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const date = new Date(raw);
  if (!Number.isFinite(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function csvToTransactions(text, fileName) {
  const rows = parseCsv(text);
  if (rows.length < 2) throw new Error("No CSV rows found");

  const headers = rows[0].map(normalizeKey);
  const transactions = rows.slice(1).map((items, index) => {
    const record = Object.fromEntries(headers.map((header, itemIndex) => [header, items[itemIndex] || ""]));
    const debit = parseAmount(headerValue(record, ["Debit", "Withdrawal", "Withdrawals", "Charge"]));
    const credit = parseAmount(headerValue(record, ["Credit", "Deposit", "Deposits"]));
    const rawAmount = headerValue(record, ["Amount", "Transaction Amount"]);
    const amount = rawAmount !== "" ? parseAmount(rawAmount) : Math.abs(credit) - Math.abs(debit);
    const date = parseDate(headerValue(record, [
      "Transaction Date",
      "Posting Date",
      "Post Date",
      "Date"
    ]));
    const description = headerValue(record, [
      "Description",
      "Payee",
      "Name",
      "Merchant",
      "Memo"
    ]);
    const details = headerValue(record, ["Details", "Type", "Transaction Type"]);
    const category = headerValue(record, ["Category", "Transaction Category"]) || details || "Uncategorized";
    const balance = headerValue(record, ["Balance", "Running Balance"]);

    return {
      id: `${fileName}-${index}-${date}-${amount}`,
      date,
      description: String(description || details || "Transaction").trim(),
      category: String(category || "Uncategorized").trim(),
      type: String(details || "").trim(),
      amount,
      balance: balance === "" ? null : parseAmount(balance),
      source: fileName
    };
  }).filter((transaction) => transaction.date && Number.isFinite(transaction.amount));

  if (!transactions.length) throw new Error("No dated transactions found");
  return transactions;
}

function dateMs(date) {
  return new Date(`${date}T00:00:00Z`).getTime();
}

function daysBetween(a, b) {
  return Math.round((dateMs(a) - dateMs(b)) / 86400000);
}

function merchantName(description) {
  return String(description || "Transaction")
    .toUpperCase()
    .replace(/\b\d{2,}\b/g, "")
    .replace(/\b[A-Z]{2}\b/g, "")
    .replace(/[^A-Z0-9&' ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 34) || "Transaction";
}

function activeMode(transactions) {
  if (state.mode !== "auto") return state.mode;
  const typeText = transactions.map((transaction) => `${transaction.type} ${transaction.category}`).join(" ").toLowerCase();
  return /\bsale\b|credit card|cardmember/.test(typeText) ? "credit" : "checking";
}

function flowFor(transaction, mode) {
  const text = `${transaction.type} ${transaction.category} ${transaction.description}`.toLowerCase();
  const amount = Number(transaction.amount || 0);
  if (mode === "credit") {
    if (/payment|refund|return|credit|cashback/.test(text)) return { spend: 0, inflow: Math.abs(amount) };
    if (/sale|debit|purchase|fee|interest/.test(text)) return { spend: Math.abs(amount), inflow: 0 };
    return amount >= 0 ? { spend: amount, inflow: 0 } : { spend: 0, inflow: Math.abs(amount) };
  }
  if (/deposit|payroll|ach credit|interest earned/.test(text)) return { spend: 0, inflow: Math.abs(amount) };
  return amount < 0 ? { spend: Math.abs(amount), inflow: 0 } : { spend: 0, inflow: amount };
}

function sum(values) {
  return values.reduce((total, value) => total + value, 0);
}

function median(values) {
  const sorted = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function withinDays(transaction, latestDate, days, offset = 0) {
  const age = daysBetween(latestDate, transaction.date);
  return age >= offset && age < days + offset;
}

function analyze() {
  const transactions = [...state.transactions]
    .filter((transaction) => transaction.date)
    .sort((a, b) => dateMs(b.date) - dateMs(a.date));
  const mode = activeMode(transactions);
  const latestDate = transactions[0]?.date || new Date().toISOString().slice(0, 10);
  const withFlow = transactions.map((transaction) => ({
    ...transaction,
    ...flowFor(transaction, mode),
    merchant: merchantName(transaction.description)
  }));

  const last30 = withFlow.filter((transaction) => withinDays(transaction, latestDate, 30));
  const prev30 = withFlow.filter((transaction) => withinDays(transaction, latestDate, 30, 30));
  const spend30 = sum(last30.map((transaction) => transaction.spend));
  const spendPrev = sum(prev30.map((transaction) => transaction.spend));
  const inflow30 = sum(last30.map((transaction) => transaction.inflow));
  const net30 = inflow30 - spend30;
  const avgDailySpend = spend30 / 30;
  const latestBalance = latestKnownBalance(withFlow);
  const manualBalance = parseAmount(state.manualBalance);
  const balanceKnown = state.manualBalance !== "" || latestBalance !== null;
  const balance = state.manualBalance !== "" ? manualBalance : latestBalance;
  const floor = Number(state.floor || 0);
  const bufferDays = balanceKnown && avgDailySpend > 0 ? Math.max(0, (balance - floor) / avgDailySpend) : null;
  const spendChange = spendPrev > 0 ? ((spend30 - spendPrev) / spendPrev) * 100 : null;
  const recurring = recurringCharges(withFlow);
  const categories = categoryTotals(last30);
  const watch = watchItems({ withFlow, last30, latestDate, balanceKnown, balance, floor, bufferDays, spend30, spendPrev, spendChange, recurring });
  const stateInfo = stateStatus({ balanceKnown, balance, floor, bufferDays, spendChange, watch, net30, transactions });
  const weeks = weeklySpend(withFlow, latestDate);
  const action = oneAction({ stateInfo, recurring, watch, categories, balanceKnown, bufferDays });

  return {
    transactions: withFlow,
    mode,
    latestDate,
    last30,
    spend30,
    spendPrev,
    spendChange,
    inflow30,
    net30,
    avgDailySpend,
    balanceKnown,
    balance,
    floor,
    bufferDays,
    recurring,
    categories,
    watch,
    stateInfo,
    weeks,
    action
  };
}

function latestKnownBalance(transactions) {
  const found = transactions.find((transaction) => transaction.balance !== null && Number.isFinite(Number(transaction.balance)));
  return found ? Number(found.balance) : null;
}

function recurringCharges(transactions) {
  const groups = new Map();
  for (const transaction of transactions) {
    if (transaction.spend <= 0) continue;
    const key = transaction.merchant;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(transaction);
  }

  return [...groups.entries()].map(([merchant, items]) => {
    const sorted = items.sort((a, b) => dateMs(b.date) - dateMs(a.date));
    const amounts = sorted.map((item) => item.spend);
    const gaps = [];
    for (let index = 0; index < sorted.length - 1; index += 1) {
      gaps.push(Math.abs(daysBetween(sorted[index].date, sorted[index + 1].date)));
    }
    const cadence = median(gaps);
    return {
      merchant,
      count: sorted.length,
      latestDate: sorted[0].date,
      amount: median(amounts),
      category: sorted[0].category || "Uncategorized",
      cadence
    };
  }).filter((item) => item.count >= 2 && (!item.cadence || item.cadence >= 20 || item.amount < 30))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6);
}

function categoryTotals(transactions) {
  const groups = new Map();
  for (const transaction of transactions) {
    if (transaction.spend <= 0) continue;
    const category = transaction.category || "Uncategorized";
    groups.set(category, (groups.get(category) || 0) + transaction.spend);
  }
  return [...groups.entries()]
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);
}

function watchItems(input) {
  const items = [];
  const { withFlow, last30, latestDate, balanceKnown, balance, floor, bufferDays, spendChange, recurring } = input;

  if (balanceKnown && balance < floor) {
    items.push({
      label: "Below floor",
      detail: `${moneyExactFormatter.format(balance)} vs ${moneyExactFormatter.format(floor)} floor`,
      amount: floor - balance
    });
  } else if (bufferDays !== null && bufferDays < 10) {
    items.push({
      label: "Thin buffer",
      detail: `${bufferDays.toFixed(1)} days above floor`,
      amount: 10 - bufferDays
    });
  }

  if (spendChange !== null && spendChange > 18) {
    items.push({
      label: "Spend up",
      detail: `${Math.round(spendChange)}% vs previous 30d`,
      amount: spendChange
    });
  }

  const byMerchant = new Map();
  for (const transaction of withFlow) {
    if (transaction.spend <= 0) continue;
    if (!byMerchant.has(transaction.merchant)) byMerchant.set(transaction.merchant, []);
    byMerchant.get(transaction.merchant).push(transaction.spend);
  }

  const unusual = last30.filter((transaction) => {
    if (transaction.spend < 25 || !withinDays(transaction, latestDate, 14)) return false;
    const history = byMerchant.get(transaction.merchant) || [];
    const normal = median(history);
    return normal > 0 && transaction.spend > normal * 1.55 && history.length >= 2;
  }).slice(0, 3);

  for (const transaction of unusual) {
    items.push({
      label: transaction.merchant,
      detail: `${moneyExactFormatter.format(transaction.spend)} unusual charge`,
      amount: transaction.spend
    });
  }

  const topRecurring = recurring[0];
  if (topRecurring && topRecurring.amount > 50) {
    items.push({
      label: topRecurring.merchant,
      detail: `${moneyExactFormatter.format(topRecurring.amount)} recurring`,
      amount: topRecurring.amount
    });
  }

  return items.slice(0, 6);
}

function stateStatus(input) {
  const { transactions, balanceKnown, balance, floor, bufferDays, spendChange, watch, net30 } = input;
  if (!transactions.length) {
    return { label: "no file", reason: "Import Chase CSV", color: "var(--muted)" };
  }
  if ((balanceKnown && balance < floor) || (bufferDays !== null && bufferDays < 5)) {
    return { label: "danger", reason: "Cash floor pressure", color: "var(--danger)" };
  }
  if ((bufferDays !== null && bufferDays < 14) || (spendChange !== null && spendChange > 18) || watch.length >= 3) {
    return { label: "watch", reason: net30 >= 0 ? "Spending pattern changed" : "Cash flow negative", color: "var(--watch)" };
  }
  return { label: "fine", reason: "No urgent pattern", color: "var(--good)" };
}

function weeklySpend(transactions, latestDate) {
  const weeks = [];
  for (let index = 7; index >= 0; index -= 1) {
    const startOffset = index * 7;
    const total = sum(transactions
      .filter((transaction) => withinDays(transaction, latestDate, 7, startOffset))
      .map((transaction) => transaction.spend));
    const start = new Date(dateMs(latestDate) - ((startOffset + 6) * 86400000)).toISOString().slice(0, 10);
    weeks.push({ label: shortDateFormatter.format(new Date(`${start}T00:00:00Z`)), total });
  }
  return weeks;
}

function oneAction(input) {
  const { stateInfo, recurring, watch, categories, balanceKnown, bufferDays } = input;
  if (!state.transactions.length) {
    return { label: "Import CSV", detail: "Use a Chase transaction export" };
  }
  if (!balanceKnown) {
    return { label: "Add balance", detail: "Buffer needs a current balance" };
  }
  if (stateInfo.label === "danger") {
    return { label: "Protect floor", detail: "Pause flexible spend until next deposit" };
  }
  if (watch[0]) {
    if (watch[0].label === "Spend up") {
      return { label: "Slow spend", detail: watch[0].detail };
    }
    if (watch[0].label === "Thin buffer" || watch[0].label === "Below floor") {
      return { label: "Protect buffer", detail: watch[0].detail };
    }
    return { label: "Check charge", detail: watch[0].label };
  }
  if (recurring[0]) {
    return { label: "Review recurring", detail: recurring[0].merchant };
  }
  if (categories[0] && bufferDays !== null && bufferDays < 21) {
    return { label: "Trim category", detail: categories[0].category };
  }
  return { label: "Keep pace", detail: "Review again after new transactions" };
}

function render() {
  els.modeSelect.value = state.mode;
  els.balanceInput.value = state.manualBalance;
  els.floorInput.value = state.floor;

  const data = analyze();
  document.documentElement.style.setProperty("--state-color", data.stateInfo.color);
  els.storageState.textContent = state.dataName === "Sample data" ? "Sample data" : "Local only";
  els.stateLabel.textContent = data.stateInfo.label;
  els.stateReason.textContent = data.stateInfo.reason;
  els.bufferValue.textContent = data.bufferDays === null ? "--" : `${data.bufferDays.toFixed(1)}d`;
  els.balanceLabel.textContent = data.balanceKnown
    ? `${moneyExactFormatter.format(data.balance)} balance / ${moneyExactFormatter.format(data.floor)} floor`
    : "Balance unknown";
  els.spendValue.textContent = moneyFormatter.format(data.spend30);
  els.spendTrend.textContent = trendText(data.spendChange, data.spendPrev);
  els.actionLabel.textContent = data.action.label;
  els.actionDetail.textContent = data.action.detail;
  els.trendWindow.textContent = `${data.mode} mode`;

  renderWeeks(data.weeks);
  renderRecurring(data.recurring);
  renderWatch(data.watch);
  renderCategories(data.categories, data.spend30);
  renderTransactions(data.transactions);
}

function trendText(change, previous) {
  if (!previous) return "No previous 30d";
  if (Math.abs(change) < 3) return "Flat vs previous 30d";
  return `${change > 0 ? "Up" : "Down"} ${Math.abs(Math.round(change))}% vs previous 30d`;
}

function renderWeeks(weeks) {
  const max = Math.max(...weeks.map((week) => week.total), 1);
  els.weekChart.innerHTML = weeks.map((week) => {
    const height = Math.max(3, Math.round((week.total / max) * 100));
    return `<div class="week">
      <div class="bar-wrap"><span class="bar" style="--h:${height}%"></span></div>
      <strong>${escapeHtml(moneyFormatter.format(week.total))}</strong>
      <span>${escapeHtml(week.label)}</span>
    </div>`;
  }).join("");
}

function renderRecurring(items) {
  els.recurringCount.textContent = String(items.length);
  els.recurringList.innerHTML = items.length ? items.map((item) => (
    `<div class="row">
      <div class="row-main">
        <strong>${escapeHtml(item.merchant)}</strong>
        <strong class="amount">${escapeHtml(moneyExactFormatter.format(item.amount))}</strong>
      </div>
      <div class="row-meta">
        <span>${escapeHtml(item.category)}</span>
        <span>${escapeHtml(item.count)} hits / ${escapeHtml(shortDate(item.latestDate))}</span>
      </div>
    </div>`
  )).join("") : `<div class="empty">No recurring pattern yet.</div>`;
}

function renderWatch(items) {
  els.watchCount.textContent = String(items.length);
  els.watchList.innerHTML = items.length ? items.map((item) => (
    `<div class="row">
      <div class="row-main">
        <strong>${escapeHtml(item.label)}</strong>
      </div>
      <div class="row-meta">
        <span>${escapeHtml(item.detail)}</span>
      </div>
    </div>`
  )).join("") : `<div class="empty">No active checks.</div>`;
}

function renderCategories(items, total) {
  els.categoryCount.textContent = String(items.length);
  els.categoryList.innerHTML = items.length ? items.map((item) => {
    const width = total > 0 ? Math.max(4, Math.round((item.total / total) * 100)) : 0;
    return `<div class="row">
      <div class="row-main">
        <strong>${escapeHtml(item.category)}</strong>
        <strong class="amount">${escapeHtml(moneyFormatter.format(item.total))}</strong>
      </div>
      <div class="row-meter" aria-hidden="true"><span style="--w:${width}%"></span></div>
    </div>`;
  }).join("") : `<div class="empty">No spend categories.</div>`;
}

function renderTransactions(transactions) {
  const visible = transactions.slice(0, 18);
  els.transactionCount.textContent = String(transactions.length);
  els.transactionList.innerHTML = visible.length ? visible.map((transaction) => {
    const flow = transaction.spend > 0 ? -transaction.spend : transaction.inflow;
    const className = flow < 0 ? "negative" : "positive";
    return `<div class="tx">
      <div class="tx-main">
        <strong>${escapeHtml(transaction.merchant)}</strong>
        <strong class="amount ${className}">${escapeHtml(moneyExactFormatter.format(flow))}</strong>
      </div>
      <div class="tx-meta">
        <span>${escapeHtml(shortDate(transaction.date))} / ${escapeHtml(transaction.category)}</span>
        <span>${escapeHtml(transaction.type || transaction.source || "")}</span>
      </div>
    </div>`;
  }).join("") : `<div class="empty">No transactions loaded.</div>`;
}

function shortDate(date) {
  return shortDateFormatter.format(new Date(`${date}T00:00:00Z`));
}

els.csvInput.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  const text = await file.text();
  try {
    state.transactions = csvToTransactions(text, file.name);
    state.dataName = file.name;
    saveState();
    render();
  } catch (error) {
    els.storageState.textContent = error.message || "CSV blocked";
  } finally {
    event.target.value = "";
  }
});

els.modeSelect.addEventListener("change", () => {
  state.mode = els.modeSelect.value;
  saveState();
  render();
});

els.balanceInput.addEventListener("input", () => {
  state.manualBalance = els.balanceInput.value;
  saveState();
  render();
});

els.floorInput.addEventListener("input", () => {
  state.floor = Number(els.floorInput.value || 0);
  saveState();
  render();
});

els.sampleButton.addEventListener("click", () => {
  state.transactions = SAMPLE_TRANSACTIONS;
  state.dataName = "Sample data";
  state.mode = "auto";
  state.manualBalance = "";
  state.floor = 500;
  saveState();
  render();
});

els.clearButton.addEventListener("click", () => {
  state.transactions = [];
  state.dataName = "No file";
  saveState();
  render();
});

render();
