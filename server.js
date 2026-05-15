const http = require("node:http");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const fsp = fs.promises;
const port = Number(process.env.PORT || 3000);
const publicDir = path.join(__dirname, "public");
const dataDir = path.resolve(process.env.A3_DATA_DIR || path.join(__dirname, ".a3-data"));
const statePath = path.join(dataDir, "state.json");
const openAiApiKey = process.env.OPENAI_API_KEY || "";
const openAiModel = process.env.OPENAI_MODEL || "gpt-5.5";
const monitorIntervalMs = Number(process.env.A3_MONITOR_INTERVAL_MS || 15 * 60 * 1000);
const accessCode = process.env.A3_ACCESS_CODE || "";

const A3_GOAL = {
  name: "Audi A3 Premium Plus",
  trim: "A3 TFSI quattro Premium Plus S tronic",
  audiCode: "A0J42547",
  audiUrl: "https://www.audiusa.com/A0J42547",
  sourcePdf: "/a3-a0j42547.pdf",
  sourceDate: "2026-05-13",
  priceAsBuilt: 46690,
  msrp: 43000,
  options: 2395,
  destinationCharge: 1295,
  exterior: "Manhattan Gray metallic",
  interior: "Parchment Beige-Steel Gray / Black dashboard",
  package: "Black optic package",
  power: "201 HP",
  torque: "236 lb-ft",
  acceleration: "0-60 mph in 6.0 seconds",
  fuel: "Premium"
};

const DEFAULT_SETTINGS = {
  mode: "auto",
  currentBalance: "",
  cashFloor: 500,
  downPaymentTarget: 7000,
  monthlyCarCap: 650,
  monthlyNonCarSavingsTarget: 900,
  targetDate: "",
  advisorCadence: "on_change"
};

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

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".pdf": "application/pdf",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".ico": "image/x-icon"
};

function defaultStore() {
  return {
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    settings: { ...DEFAULT_SETTINGS },
    transactions: SAMPLE_TRANSACTIONS,
    imports: [{
      id: "sample",
      name: "Sample data",
      importedAt: new Date().toISOString(),
      transactionCount: SAMPLE_TRANSACTIONS.length,
      source: "sample"
    }],
    snapshots: [],
    advisorRuns: [],
    messages: [],
    events: []
  };
}

async function readStore() {
  try {
    const parsed = JSON.parse(await fsp.readFile(statePath, "utf8"));
    return {
      ...defaultStore(),
      ...parsed,
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
      transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
      imports: Array.isArray(parsed.imports) ? parsed.imports : [],
      snapshots: Array.isArray(parsed.snapshots) ? parsed.snapshots : [],
      advisorRuns: Array.isArray(parsed.advisorRuns) ? parsed.advisorRuns : [],
      messages: Array.isArray(parsed.messages) ? parsed.messages : [],
      events: Array.isArray(parsed.events) ? parsed.events : []
    };
  } catch {
    return defaultStore();
  }
}

async function writeStore(store) {
  await fsp.mkdir(dataDir, { recursive: true });
  const next = {
    ...store,
    updatedAt: new Date().toISOString(),
    snapshots: (store.snapshots || []).slice(-240),
    advisorRuns: (store.advisorRuns || []).slice(-80),
    messages: (store.messages || []).slice(-160),
    events: (store.events || []).slice(-400)
  };
  await fsp.writeFile(statePath, JSON.stringify(next, null, 2));
  return next;
}

function send(res, status, payload, headers = {}) {
  const isObject = payload && typeof payload === "object" && !Buffer.isBuffer(payload);
  const body = isObject ? JSON.stringify(payload) : payload;
  res.writeHead(status, {
    "Content-Type": isObject ? "application/json; charset=utf-8" : "text/plain; charset=utf-8",
    "Cache-Control": "no-store",
    ...headers
  });
  res.end(body);
}

function sendJson(res, status, payload) {
  send(res, status, payload, { "Content-Type": "application/json; charset=utf-8" });
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left || ""));
  const rightBuffer = Buffer.from(String(right || ""));
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function suppliedAccessCode(req) {
  const bearer = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
  return bearer || String(req.headers["x-a3-access"] || "").trim();
}

function isAuthorized(req) {
  if (!accessCode) return true;
  return safeEqual(suppliedAccessCode(req), accessCode);
}

function sendFile(res, filePath) {
  fs.readFile(filePath, (error, data) => {
    if (error) {
      send(res, 404, "Not found");
      return;
    }
    res.writeHead(200, {
      "Content-Type": mimeTypes[path.extname(filePath)] || "application/octet-stream",
      "Cache-Control": "no-store"
    });
    res.end(data);
  });
}

function readJsonBody(req, maxBytes = 6 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > maxBytes) {
        reject(new Error("Request body too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
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
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
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
    const date = parseDate(headerValue(record, ["Transaction Date", "Posting Date", "Post Date", "Date"]));
    const description = headerValue(record, ["Description", "Payee", "Name", "Merchant", "Memo"]);
    const details = headerValue(record, ["Details", "Type", "Transaction Type"]);
    const category = headerValue(record, ["Category", "Transaction Category"]) || details || "Uncategorized";
    const balance = headerValue(record, ["Balance", "Running Balance"]);
    return {
      id: crypto.createHash("sha1").update(`${fileName}|${index}|${date}|${description}|${amount}`).digest("hex"),
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

function sum(values) {
  return values.reduce((total, value) => total + value, 0);
}

function median(values) {
  const sorted = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
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

function activeMode(settings, transactions) {
  if (settings.mode !== "auto") return settings.mode;
  const text = transactions.map((transaction) => `${transaction.type} ${transaction.category}`).join(" ").toLowerCase();
  return /\bsale\b|credit card|cardmember/.test(text) ? "credit" : "checking";
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

function withinDays(transaction, latestDate, days, offset = 0) {
  const age = daysBetween(latestDate, transaction.date);
  return age >= offset && age < days + offset;
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
    .slice(0, 8);
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
    .slice(0, 8);
}

function weeklySpend(transactions, latestDate) {
  const weeks = [];
  for (let index = 7; index >= 0; index -= 1) {
    const startOffset = index * 7;
    const total = sum(transactions
      .filter((transaction) => withinDays(transaction, latestDate, 7, startOffset))
      .map((transaction) => transaction.spend));
    const start = new Date(dateMs(latestDate) - ((startOffset + 6) * 86400000)).toISOString().slice(0, 10);
    weeks.push({ start, total });
  }
  return weeks;
}

function watchItems(input) {
  const { withFlow, last30, latestDate, balanceKnown, balance, cashFloor, bufferDays, spendChange, recurring, goal } = input;
  const items = [];
  if (balanceKnown && balance < cashFloor) {
    items.push({ label: "Below floor", detail: `$${Math.round(balance)} vs $${Math.round(cashFloor)} floor`, severity: "danger" });
  } else if (bufferDays !== null && bufferDays < 10) {
    items.push({ label: "Thin buffer", detail: `${bufferDays.toFixed(1)} days above floor`, severity: "watch" });
  }
  if (spendChange !== null && spendChange > 18) {
    items.push({ label: "Spend up", detail: `${Math.round(spendChange)}% vs previous 30d`, severity: "watch" });
  }
  if (goal.downPaymentGap > 0 && goal.monthlySavingsPace < goal.monthlySavingsNeeded) {
    items.push({ label: "A3 pace short", detail: `$${Math.round(goal.monthlySavingsPace)} saved/mo vs $${Math.round(goal.monthlySavingsNeeded)} needed`, severity: "watch" });
  }
  const byMerchant = new Map();
  for (const transaction of withFlow) {
    if (transaction.spend <= 0) continue;
    if (!byMerchant.has(transaction.merchant)) byMerchant.set(transaction.merchant, []);
    byMerchant.get(transaction.merchant).push(transaction.spend);
  }
  for (const transaction of last30) {
    if (items.length >= 6) break;
    if (transaction.spend < 25 || !withinDays(transaction, latestDate, 14)) continue;
    const history = byMerchant.get(transaction.merchant) || [];
    const normal = median(history);
    if (normal > 0 && transaction.spend > normal * 1.55 && history.length >= 2) {
      items.push({ label: transaction.merchant, detail: `$${transaction.spend.toFixed(2)} unusual charge`, severity: "watch" });
    }
  }
  const topRecurring = recurring[0];
  if (topRecurring && topRecurring.amount > 50 && items.length < 6) {
    items.push({ label: topRecurring.merchant, detail: `$${topRecurring.amount.toFixed(2)} recurring`, severity: "watch" });
  }
  return items.slice(0, 6);
}

function analyze(store) {
  const settings = { ...DEFAULT_SETTINGS, ...(store.settings || {}) };
  const transactions = [...(store.transactions || [])]
    .filter((transaction) => transaction.date)
    .sort((a, b) => dateMs(b.date) - dateMs(a.date));
  const mode = activeMode(settings, transactions);
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
  const manualBalance = parseAmount(settings.currentBalance);
  const balanceKnown = settings.currentBalance !== "" || latestBalance !== null;
  const balance = settings.currentBalance !== "" ? manualBalance : latestBalance;
  const cashFloor = Number(settings.cashFloor || 0);
  const bufferDays = balanceKnown && avgDailySpend > 0 ? Math.max(0, (balance - cashFloor) / avgDailySpend) : null;
  const spendChange = spendPrev > 0 ? ((spend30 - spendPrev) / spendPrev) * 100 : null;
  const recurring = recurringCharges(withFlow);
  const categories = categoryTotals(last30);
  const monthlySavingsPace = Math.max(0, net30);
  const availableForDownPayment = balanceKnown ? Math.max(0, balance - cashFloor) : 0;
  const downPaymentGap = Math.max(0, Number(settings.downPaymentTarget || 0) - availableForDownPayment);
  const targetDate = settings.targetDate || "";
  const monthsToTarget = targetDate
    ? Math.max(1, Math.ceil((dateMs(targetDate) - Date.now()) / (86400000 * 30.4375)))
    : 12;
  const monthlySavingsNeeded = downPaymentGap / monthsToTarget;
  const monthlyRoom = monthlySavingsPace - monthlySavingsNeeded;
  const goal = {
    a3: A3_GOAL,
    availableForDownPayment,
    downPaymentTarget: Number(settings.downPaymentTarget || 0),
    downPaymentGap,
    monthlySavingsPace,
    monthlySavingsNeeded,
    monthlyRoom,
    monthsToTarget,
    targetDate
  };
  const watch = watchItems({ withFlow, last30, latestDate, balanceKnown, balance, cashFloor, bufferDays, spendChange, recurring, goal });
  const readiness = readinessState({ balanceKnown, balance, cashFloor, bufferDays, spendChange, watch, goal, transactions });
  const action = oneAction({ readiness, watch, recurring, categories, goal, balanceKnown });
  return {
    goal,
    settings,
    mode,
    latestDate,
    totals: {
      transactionCount: transactions.length,
      spend30,
      spendPrev,
      spendChange,
      inflow30,
      net30,
      avgDailySpend,
      balanceKnown,
      balance,
      cashFloor,
      bufferDays
    },
    readiness,
    action,
    weeks: weeklySpend(withFlow, latestDate),
    recurring,
    categories,
    watch,
    transactions: withFlow.slice(0, 80)
  };
}

function readinessState(input) {
  const { transactions, balanceKnown, balance, cashFloor, bufferDays, spendChange, watch, goal } = input;
  if (!transactions.length) return { label: "no data", reason: "Import Chase CSV", color: "muted" };
  if ((balanceKnown && balance < cashFloor) || (bufferDays !== null && bufferDays < 5)) {
    return { label: "danger", reason: "Cash floor pressure", color: "danger" };
  }
  if (goal.downPaymentGap <= 0 && goal.monthlyRoom >= 0) {
    return { label: "a3 ready", reason: "Down payment target covered", color: "good" };
  }
  if ((bufferDays !== null && bufferDays < 14) || (spendChange !== null && spendChange > 18) || watch.length >= 3 || goal.monthlyRoom < 0) {
    return { label: "watch", reason: "A3 pace needs control", color: "watch" };
  }
  return { label: "building", reason: "A3 path improving", color: "good" };
}

function oneAction(input) {
  const { readiness, watch, recurring, categories, goal, balanceKnown } = input;
  if (!balanceKnown) return { label: "Add balance", detail: "A3 gap needs current cash" };
  if (readiness.label === "danger") return { label: "Protect floor", detail: "Pause flexible spend until next deposit" };
  if (goal.downPaymentGap > 0 && goal.monthlyRoom < 0) {
    return { label: "Close A3 gap", detail: `$${Math.ceil(Math.abs(goal.monthlyRoom))}/mo short` };
  }
  if (watch[0]?.label === "Spend up") return { label: "Slow spend", detail: watch[0].detail };
  if (watch[0]) return { label: "Check pattern", detail: watch[0].label };
  if (recurring[0]) return { label: "Review recurring", detail: recurring[0].merchant };
  if (categories[0]) return { label: "Hold category", detail: categories[0].category };
  return { label: "Keep pace", detail: "Review after new transactions" };
}

function changeSummary(previous, current) {
  if (!previous) return ["First stored snapshot"];
  const changes = [];
  const fields = [
    ["readiness", previous.readiness?.label, current.readiness?.label],
    ["30d spend", Math.round(previous.totals?.spend30 || 0), Math.round(current.totals?.spend30 || 0)],
    ["net 30d", Math.round(previous.totals?.net30 || 0), Math.round(current.totals?.net30 || 0)],
    ["A3 gap", Math.round(previous.goal?.downPaymentGap || 0), Math.round(current.goal?.downPaymentGap || 0)]
  ];
  for (const [label, before, after] of fields) {
    if (before !== after) changes.push(`${label}: ${before} -> ${after}`);
  }
  return changes.length ? changes : ["No material change"];
}

function advisorFallback(analysis) {
  return {
    status: analysis.readiness.label,
    summary: analysis.readiness.reason,
    one_action: analysis.action.label,
    why: analysis.action.detail,
    a3_effect: analysis.goal.downPaymentGap > 0
      ? `$${Math.round(analysis.goal.downPaymentGap)} still needed for the down payment target.`
      : "Down payment target is covered by current cash above floor.",
    watch: analysis.watch.slice(0, 3).map((item) => item.label),
    confidence: openAiApiKey ? "fallback_after_error" : "deterministic_no_key"
  };
}

function extractResponseText(data) {
  if (typeof data.output_text === "string") return data.output_text;
  for (const item of data.output || []) {
    if (item.type !== "message") continue;
    for (const content of item.content || []) {
      if (content.type === "output_text" && typeof content.text === "string") return content.text;
    }
  }
  return "";
}

async function callOpenAiForAdvice({ analysis, events, messages }) {
  if (!openAiApiKey) return advisorFallback(analysis);
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openAiApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: openAiModel,
      instructions: [
        "You are the private financial planning layer inside a boring A3 goal app.",
        "The goal is to increase the realistic possibility of buying the specified Audi A3 without destabilizing cash flow.",
        "Do not claim to be a licensed financial advisor. Do not give investment, tax, insurance, or loan approval guarantees.",
        "Use the provided source-backed numbers only. If a required number is missing, say what is missing.",
        "Return one calm action. Keep it concrete, low-stress, and measurable."
      ].join("\n"),
      input: [{
        role: "user",
        content: [{
          type: "input_text",
          text: JSON.stringify({
            a3_goal: A3_GOAL,
            current_analysis: analysis,
            recent_events: events.slice(-30),
            recent_messages: messages.slice(-12)
          })
        }]
      }],
      text: {
        format: {
          type: "json_schema",
          name: "a3_advice",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["status", "summary", "one_action", "why", "a3_effect", "watch", "confidence"],
            properties: {
              status: { type: "string" },
              summary: { type: "string" },
              one_action: { type: "string" },
              why: { type: "string" },
              a3_effect: { type: "string" },
              watch: { type: "array", items: { type: "string" }, maxItems: 4 },
              confidence: { type: "string" }
            }
          }
        }
      }
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error?.message || `OpenAI request failed: ${response.status}`);
  return JSON.parse(extractResponseText(data));
}

async function runAdvisor(store, reason = "manual") {
  const analysis = analyze(store);
  let advice;
  let error = "";
  try {
    advice = await callOpenAiForAdvice({ analysis, events: store.events || [], messages: store.messages || [] });
  } catch (err) {
    error = err.message;
    advice = advisorFallback(analysis);
  }
  const run = {
    id: crypto.randomUUID(),
    reason,
    createdAt: new Date().toISOString(),
    model: openAiApiKey ? openAiModel : "none",
    error,
    advice,
    analysisDigest: {
      readiness: analysis.readiness.label,
      spend30: analysis.totals.spend30,
      net30: analysis.totals.net30,
      a3Gap: analysis.goal.downPaymentGap
    }
  };
  store.advisorRuns = [...(store.advisorRuns || []), run];
  store.events = [...(store.events || []), {
    id: crypto.randomUUID(),
    createdAt: run.createdAt,
    type: "advisor_run",
    label: advice.one_action,
    detail: advice.a3_effect
  }];
  return run;
}

async function monitorTick(reason = "interval") {
  const store = await readStore();
  const analysis = analyze(store);
  const previous = store.snapshots?.[store.snapshots.length - 1]?.analysis || null;
  const changes = changeSummary(previous, analysis);
  const snapshot = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    reason,
    changes,
    analysis
  };
  store.snapshots = [...(store.snapshots || []), snapshot];
  store.events = [...(store.events || []), {
    id: crypto.randomUUID(),
    createdAt: snapshot.createdAt,
    type: "snapshot",
    label: changes[0],
    detail: `${analysis.readiness.label} / A3 gap $${Math.round(analysis.goal.downPaymentGap)}`
  }];
  const materialChange = !previous || changes.some((change) => change !== "No material change");
  if (materialChange && store.settings.advisorCadence !== "manual") {
    await runAdvisor(store, reason);
  }
  await writeStore(store);
  return snapshot;
}

async function handleApi(req, res, requestUrl) {
  if (requestUrl.pathname === "/api/health" || requestUrl.pathname === "/health") {
    const store = await readStore();
    sendJson(res, 200, {
      ok: true,
      app: "a3.aolabs.io",
      storage: dataDir,
      accessLocked: Boolean(accessCode),
      openaiConfigured: Boolean(openAiApiKey),
      model: openAiModel,
      transactions: store.transactions.length,
      checkedAt: new Date().toISOString()
    });
    return true;
  }

  if (requestUrl.pathname === "/api/auth/status" && req.method === "GET") {
    sendJson(res, 200, { ok: true, locked: Boolean(accessCode) });
    return true;
  }

  if (requestUrl.pathname === "/api/auth/check" && req.method === "POST") {
    const payload = await readJsonBody(req, 16 * 1024);
    if (!accessCode || safeEqual(payload.code, accessCode)) {
      sendJson(res, 200, { ok: true });
      return true;
    }
    sendJson(res, 401, { ok: false, locked: true, error: "access code required" });
    return true;
  }

  if (!isAuthorized(req)) {
    sendJson(res, 401, { ok: false, locked: true, error: "access code required" });
    return true;
  }

  if (requestUrl.pathname === "/api/state" && req.method === "GET") {
    const store = await readStore();
    sendJson(res, 200, {
      ok: true,
      goal: A3_GOAL,
      openaiConfigured: Boolean(openAiApiKey),
      model: openAiModel,
      analysis: analyze(store),
      imports: store.imports.slice(-10).reverse(),
      snapshots: store.snapshots.slice(-12).reverse().map((snapshot) => ({
        id: snapshot.id,
        createdAt: snapshot.createdAt,
        reason: snapshot.reason,
        changes: snapshot.changes,
        readiness: snapshot.analysis?.readiness?.label,
        a3Gap: snapshot.analysis?.goal?.downPaymentGap
      })),
      advisorRuns: store.advisorRuns.slice(-8).reverse(),
      messages: store.messages.slice(-20),
      events: store.events.slice(-40).reverse()
    });
    return true;
  }

  if (requestUrl.pathname === "/api/settings" && req.method === "POST") {
    const payload = await readJsonBody(req);
    const store = await readStore();
    store.settings = {
      ...store.settings,
      ...Object.fromEntries(Object.entries(payload.settings || {}).filter(([key]) => key in DEFAULT_SETTINGS))
    };
    store.events.push({
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      type: "settings",
      label: "Settings changed",
      detail: "A3 planning inputs updated"
    });
    await writeStore(store);
    sendJson(res, 200, { ok: true, analysis: analyze(store) });
    return true;
  }

  if (requestUrl.pathname === "/api/import-csv" && req.method === "POST") {
    const payload = await readJsonBody(req);
    const name = String(payload.name || "chase.csv").slice(0, 180);
    const text = String(payload.text || "");
    const transactions = csvToTransactions(text, name);
    const store = await readStore();
    store.transactions = payload.append
      ? dedupeTransactions([...(store.transactions || []), ...transactions])
      : transactions;
    store.imports.push({
      id: crypto.randomUUID(),
      name,
      importedAt: new Date().toISOString(),
      transactionCount: transactions.length,
      append: Boolean(payload.append)
    });
    store.events.push({
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      type: "import",
      label: name,
      detail: `${transactions.length} transactions`
    });
    await writeStore(store);
    await monitorTick("import");
    sendJson(res, 200, { ok: true, imported: transactions.length, analysis: analyze(await readStore()) });
    return true;
  }

  if (requestUrl.pathname === "/api/advisor/run" && req.method === "POST") {
    const store = await readStore();
    const run = await runAdvisor(store, "manual");
    await writeStore(store);
    sendJson(res, 200, { ok: true, run });
    return true;
  }

  if (requestUrl.pathname === "/api/monitor/tick" && req.method === "POST") {
    const snapshot = await monitorTick("manual");
    sendJson(res, 200, { ok: true, snapshot });
    return true;
  }

  if (requestUrl.pathname === "/api/chat" && req.method === "POST") {
    const payload = await readJsonBody(req, 64 * 1024);
    const question = String(payload.message || "").trim().slice(0, 1200);
    if (!question) {
      sendJson(res, 400, { ok: false, error: "message is required" });
      return true;
    }
    const store = await readStore();
    store.messages.push({ id: crypto.randomUUID(), role: "user", text: question, createdAt: new Date().toISOString() });
    const run = await runAdvisor(store, "chat");
    const answer = `${run.advice.one_action}. ${run.advice.why} ${run.advice.a3_effect}`;
    store.messages.push({ id: crypto.randomUUID(), role: "assistant", text: answer, createdAt: new Date().toISOString(), runId: run.id });
    await writeStore(store);
    sendJson(res, 200, { ok: true, answer, run });
    return true;
  }

  return false;
}

function dedupeTransactions(transactions) {
  const seen = new Set();
  const result = [];
  for (const transaction of transactions) {
    const key = transaction.id || `${transaction.date}|${transaction.description}|${transaction.amount}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(transaction);
  }
  return result;
}

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  try {
    if (requestUrl.pathname.startsWith("/api/") || requestUrl.pathname === "/health") {
      const handled = await handleApi(req, res, requestUrl);
      if (!handled) sendJson(res, 404, { ok: false, error: "Unknown endpoint" });
      return;
    }
    let pathname = decodeURIComponent(requestUrl.pathname);
    if (pathname === "/") pathname = "/index.html";
    const normalizedPath = path.normalize(pathname).replace(/^(\.\.[/\\])+/, "");
    const filePath = path.join(publicDir, normalizedPath);
    if (!filePath.startsWith(publicDir)) {
      send(res, 403, "Forbidden");
      return;
    }
    sendFile(res, filePath);
  } catch (error) {
    sendJson(res, 500, { ok: false, error: error.message, checkedAt: new Date().toISOString() });
  }
});

server.listen(port, () => {
  console.log(`A3 financial advisor running at http://localhost:${port}`);
  monitorTick("startup").catch(() => {});
  if (Number.isFinite(monitorIntervalMs) && monitorIntervalMs >= 60000) {
    setInterval(() => {
      monitorTick("interval").catch(() => {});
    }, monitorIntervalMs).unref();
  }
});
