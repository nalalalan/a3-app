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
const openAiModel = process.env.OPENAI_MODEL || "gpt-5-mini";
const monitorIntervalMs = Number(process.env.A3_MONITOR_INTERVAL_MS || 15 * 60 * 1000);
const accessCode = process.env.A3_ACCESS_CODE || "";
const plaidClientId = process.env.PLAID_CLIENT_ID || "";
const plaidSecret = process.env.PLAID_SECRET || "";
const plaidEnv = String(process.env.PLAID_ENV || "sandbox").toLowerCase();
const plaidProducts = String(process.env.PLAID_PRODUCTS || "transactions").split(",").map((item) => item.trim()).filter(Boolean);
const plaidCountryCodes = String(process.env.PLAID_COUNTRY_CODES || "US").split(",").map((item) => item.trim()).filter(Boolean);
const plaidClientUserId = process.env.PLAID_CLIENT_USER_ID || "a3-owner";
const plaidRedirectUri = process.env.PLAID_REDIRECT_URI || "";
const plaidWebhookUrl = process.env.PLAID_WEBHOOK_URL || "";
const plaidDaysRequested = Number(process.env.PLAID_DAYS_REQUESTED || 730);
const plaidProductionReviewPending = /^(1|true|yes|pending)$/i.test(String(process.env.PLAID_PRODUCTION_REVIEW_PENDING || ""));
const tokenSecret = process.env.A3_TOKEN_SECRET || accessCode || "";

const PLAID_BASE_URLS = {
  sandbox: "https://sandbox.plaid.com",
  development: "https://development.plaid.com",
  production: "https://production.plaid.com"
};

const A3_GOAL = {
  name: "Audi A3 Premium Plus",
  trim: "A3 TFSI quattro Premium Plus S tronic",
  audiCode: "AWG0XSW9",
  audiUrl: "https://www.audiusa.com/AWG0XSW9",
  sourcePdf: "/a3-awg0xsw9.pdf",
  sourceDate: "2026-06-01",
  priceAsBuilt: 46095,
  msrp: 43000,
  options: 1800,
  destinationCharge: 1295,
  exterior: "Arkona White",
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
  downPaymentTarget: 0,
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
  ".avif": "image/avif",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
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
    events: [],
    bankConnections: [],
    bankAccounts: [],
    bankSyncs: [],
    spendingLocks: []
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
      events: Array.isArray(parsed.events) ? parsed.events : [],
      bankConnections: Array.isArray(parsed.bankConnections) ? parsed.bankConnections : [],
      bankAccounts: Array.isArray(parsed.bankAccounts) ? parsed.bankAccounts : [],
      bankSyncs: Array.isArray(parsed.bankSyncs) ? parsed.bankSyncs : [],
      spendingLocks: Array.isArray(parsed.spendingLocks) ? parsed.spendingLocks : []
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
    events: (store.events || []).slice(-400),
    bankConnections: store.bankConnections || [],
    bankAccounts: store.bankAccounts || [],
    bankSyncs: (store.bankSyncs || []).slice(-120),
    spendingLocks: (store.spendingLocks || []).slice(-160)
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

function plaidConfigured() {
  return Boolean(plaidClientId && plaidSecret);
}

function plaidBaseUrl() {
  return PLAID_BASE_URLS[plaidEnv] || PLAID_BASE_URLS.sandbox;
}

function tokenKey() {
  if (!tokenSecret) return null;
  return crypto.createHash("sha256").update(tokenSecret).digest();
}

function protectToken(value) {
  const token = String(value || "");
  if (!token) return null;
  const key = tokenKey();
  if (!key) return { v: 1, plain: token };
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return {
    v: 1,
    alg: "aes-256-gcm",
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    ciphertext: ciphertext.toString("base64")
  };
}

function revealToken(stored) {
  if (!stored) return "";
  if (typeof stored === "string") return stored;
  if (stored.plain) return String(stored.plain);
  if (stored.alg !== "aes-256-gcm") throw new Error("Unsupported token storage");
  const key = tokenKey();
  if (!key) throw new Error("Plaid token encryption secret missing");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(stored.iv, "base64"));
  decipher.setAuthTag(Buffer.from(stored.tag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(stored.ciphertext, "base64")),
    decipher.final()
  ]).toString("utf8");
}

async function plaidPost(endpoint, payload = {}) {
  if (!plaidConfigured()) throw new Error("Plaid is not configured");
  const response = await fetch(`${plaidBaseUrl()}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: plaidClientId,
      secret: plaidSecret,
      ...payload
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const code = data.error_code ? `${data.error_code}: ` : "";
    throw new Error(data.error_message || data.display_message || `${code}Plaid request failed (${response.status})`);
  }
  return data;
}

function publicConnection(connection) {
  return {
    id: connection.id,
    provider: "plaid",
    institutionName: connection.institutionName || "Bank",
    institutionId: connection.institutionId || "",
    createdAt: connection.createdAt,
    updatedAt: connection.updatedAt,
    lastSyncAt: connection.lastSyncAt || "",
    lastError: connection.lastError || "",
    accountCount: Number(connection.accountCount || 0)
  };
}

function plaidStatus(store) {
  const connections = (store.bankConnections || []).map(publicConnection);
  const latestSync = [...(store.bankSyncs || [])].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))[0];
  const accounts = dedupeBankAccounts(store.bankAccounts || []);
  return {
    configured: plaidConfigured(),
    env: plaidEnv,
    productionReviewPending: plaidProductionReviewPending,
    connected: connections.length > 0,
    tokenProtected: Boolean(tokenKey()),
    connections,
    accountCount: accounts.length,
    lastSyncAt: latestSync?.createdAt || "",
    lastError: latestSync?.error || connections.find((item) => item.lastError)?.lastError || ""
  };
}

function intervalText(ms) {
  const value = Number(ms || 0);
  if (!Number.isFinite(value) || value < 60000) return "off";
  const minutes = Math.round(value / 60000);
  if (minutes < 60) return `${minutes} min`;
  const hours = value / 3600000;
  if (hours < 24) return `${Number.isInteger(hours) ? hours : hours.toFixed(1)} hr`;
  const days = hours / 24;
  return `${Number.isInteger(days) ? days : days.toFixed(1)} day`;
}

function autoUpdateStatus(store) {
  const enabled = Number.isFinite(monitorIntervalMs) && monitorIntervalMs >= 60000;
  const syncs = [...(store.bankSyncs || [])]
    .filter((item) => !item.provider || item.provider === "plaid")
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  const latestConnection = [...(store.bankConnections || [])]
    .sort((a, b) => String(b.lastSyncAt || b.updatedAt || "").localeCompare(String(a.lastSyncAt || a.updatedAt || "")))[0];
  return {
    enabled,
    intervalMs: enabled ? monitorIntervalMs : 0,
    intervalLabel: enabled ? intervalText(monitorIntervalMs) : "off",
    lastSyncAt: syncs[0]?.createdAt || latestConnection?.lastSyncAt || "",
    lastError: syncs[0]?.error || latestConnection?.lastError || ""
  };
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
    .replace(/\bREBILL\b/g, " ")
    .replace(/\bBESTBUYCOM\b/g, "BEST BUY")
    .replace(/\bBESTBUY\b/g, "BEST BUY")
    .replace(/\b\d{2,}\b/g, "")
    .replace(/\b[A-Z]{2}\b/g, "")
    .replace(/[^A-Z0-9&' ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 34) || "Transaction";
}

function cleanCategory(value) {
  return String(value || "Uncategorized")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (match) => match.toUpperCase())
    .trim() || "Uncategorized";
}

function accountBalanceValue(account) {
  const available = Number(account.balanceAvailable);
  const current = Number(account.balanceCurrent);
  if (Number.isFinite(available)) return available;
  if (Number.isFinite(current)) return current;
  return null;
}

function keyPart(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function accountLogicalKey(account) {
  const mask = keyPart(account.mask);
  if (!mask) return `id:${account.id || account.accountId || ""}`;
  return [
    keyPart(account.provider || "plaid"),
    keyPart(account.institutionId || account.institutionName),
    keyPart(account.type),
    keyPart(account.subtype),
    mask
  ].join("|");
}

function dedupeBankAccounts(accounts) {
  const byKey = new Map();
  for (const account of accounts || []) {
    const key = accountLogicalKey(account);
    const existing = byKey.get(key);
    if (!existing || String(account.updatedAt || "") >= String(existing.updatedAt || "")) {
      byKey.set(key, account);
    }
  }
  return [...byKey.values()];
}

function bankAccountTotals(accounts) {
  const totals = {
    connected: accounts.length > 0,
    cash: 0,
    cashKnown: false,
    creditDebt: 0,
    loanDebt: 0,
    debtTotal: 0,
    netCashAfterDebt: 0,
    lastUpdatedAt: "",
    items: accounts
  };
  for (const account of accounts) {
    const current = Number(account.balanceCurrent);
    const balance = accountBalanceValue(account);
    const type = String(account.type || "").toLowerCase();
    if (type === "depository") {
      if (balance !== null) {
        totals.cash += balance;
        totals.cashKnown = true;
      }
    } else if (type === "credit") {
      if (Number.isFinite(current) && current > 0) totals.creditDebt += current;
    } else if (type === "loan") {
      if (Number.isFinite(current) && current > 0) totals.loanDebt += current;
    }
    if (account.updatedAt && account.updatedAt > totals.lastUpdatedAt) totals.lastUpdatedAt = account.updatedAt;
  }
  totals.debtTotal = totals.creditDebt + totals.loanDebt;
  totals.netCashAfterDebt = totals.cash - totals.debtTotal;
  return totals;
}

function enrichTransactionAccount(transaction, accountsByAccountId) {
  if (!transaction.plaidAccountId) return transaction;
  const account = accountsByAccountId.get(transaction.plaidAccountId);
  if (!account) return transaction;
  return {
    ...transaction,
    plaidAccountMask: transaction.plaidAccountMask || account.mask || "",
    plaidInstitutionName: transaction.plaidInstitutionName || account.institutionName || "",
    plaidInstitutionId: transaction.plaidInstitutionId || account.institutionId || "",
    plaidLogicalAccountKey: accountLogicalKey(account)
  };
}

function transactionLogicalKey(transaction) {
  if (!transaction.plaidTransactionId) return transaction.id || "";
  return [
    "plaid",
    transaction.plaidLogicalAccountKey || transaction.plaidAccountId || "",
    transaction.date || "",
    keyPart(transaction.description),
    keyPart(transaction.category),
    Number(transaction.amount || 0).toFixed(2)
  ].join("|");
}

function dedupeAnalysisTransactions(transactions) {
  const exactIds = new Set();
  const logicalSources = new Map();
  const result = [];
  for (const transaction of transactions) {
    if (transaction.id && exactIds.has(transaction.id)) continue;
    if (transaction.id) exactIds.add(transaction.id);
    const logicalKey = transactionLogicalKey(transaction);
    const source = transaction.source || "";
    const existingSource = logicalSources.get(logicalKey);
    if (logicalKey && existingSource && source && existingSource !== source) continue;
    if (logicalKey && !existingSource) logicalSources.set(logicalKey, source || "unknown");
    result.push(transaction);
  }
  return result;
}

function activeMode(settings, transactions) {
  if (settings.mode !== "auto") return settings.mode;
  const text = transactions.map((transaction) => `${transaction.type} ${transaction.category}`).join(" ").toLowerCase();
  return /\bsale\b|credit card|cardmember/.test(text) ? "credit" : "checking";
}

function flowFor(transaction, mode) {
  if (transaction.plaidAccountType === "credit") mode = "credit";
  if (transaction.plaidAccountType === "depository") mode = "checking";
  const accountType = String(transaction.plaidAccountType || "").toLowerCase();
  const type = String(transaction.type || "").toLowerCase();
  const category = String(transaction.category || "").toLowerCase();
  const description = String(transaction.description || "").toLowerCase();
  const text = `${type} ${category} ${description}`.toLowerCase();
  const nonTypeText = `${category} ${description}`.toLowerCase();
  const amount = Number(transaction.amount || 0);
  if (mode === "credit") {
    if (/payment|refund|return|cashback|statement credit|credit crd|card payment|payment thank/.test(nonTypeText)) return { spend: 0, inflow: Math.abs(amount) };
    if (/interest|fee|purchase|sale|debit/.test(nonTypeText)) return { spend: Math.abs(amount), inflow: 0 };
    if (accountType === "credit") return amount >= 0 ? { spend: amount, inflow: 0 } : { spend: 0, inflow: Math.abs(amount) };
    return amount >= 0 ? { spend: amount, inflow: 0 } : { spend: 0, inflow: Math.abs(amount) };
  }
  if (/deposit|payroll|ach credit|interest earned/.test(text)) return { spend: 0, inflow: Math.abs(amount) };
  return amount < 0 ? { spend: Math.abs(amount), inflow: 0 } : { spend: 0, inflow: amount };
}

function paymentAmount(transaction) {
  return Math.max(
    Math.abs(Number(transaction.amount || 0)),
    Math.abs(Number(transaction.spend || 0)),
    Math.abs(Number(transaction.inflow || 0))
  );
}

function isCreditPayment(transaction) {
  const text = `${transaction.type || ""} ${transaction.category || ""} ${transaction.description || ""} ${transaction.merchant || ""}`.toLowerCase();
  return /autopay|credit crd|credit card payment|automatic payment|payment thank|card payment/.test(text)
    && paymentAmount(transaction) >= 500;
}

function paymentRole(transaction) {
  const accountType = String(transaction.plaidAccountType || "").toLowerCase();
  if (accountType === "credit" && Number(transaction.inflow || 0) > 0) return "card";
  if (accountType === "depository" && Number(transaction.spend || 0) > 0) return "checking";
  return "bank";
}

function creditPaymentStatus(transactions, latestDate) {
  const candidates = (transactions || [])
    .filter((transaction) => transaction.date && isCreditPayment(transaction))
    .filter((transaction) => !latestDate || daysBetween(latestDate, transaction.date) <= 45)
    .sort((a, b) => dateMs(b.date) - dateMs(a.date) || paymentAmount(b) - paymentAmount(a));
  if (!candidates.length) {
    return {
      status: "not_visible",
      label: "No large payment visible",
      amount: 0,
      detail: "No recent large credit-card payment is visible.",
      candidates: []
    };
  }
  const primary = candidates[0];
  const amount = paymentAmount(primary);
  const related = candidates
    .filter((transaction) => Math.abs(paymentAmount(transaction) - amount) < 1)
    .filter((transaction) => Math.abs(daysBetween(primary.date, transaction.date)) <= 3);
  const cardPosted = related.find((transaction) => !transaction.pending && paymentRole(transaction) === "card");
  const checkingPosted = related.find((transaction) => !transaction.pending && paymentRole(transaction) === "checking");
  const pending = related.some((transaction) => transaction.pending);
  const posted = related.some((transaction) => !transaction.pending);
  let status = "seen";
  let label = "Payment seen";
  let detail = "Payment visible.";
  if (cardPosted && checkingPosted) {
    status = "posted";
    label = "Payment posted";
    detail = `Seen on card ${cardPosted.date} and checking ${checkingPosted.date}.`;
  } else if (posted) {
    status = "posted_partial";
    label = "Payment posted";
    detail = `Seen as posted on ${related.find((transaction) => !transaction.pending)?.date || primary.date}.`;
  } else if (pending) {
    status = "pending";
    label = "Payment pending";
    detail = `Payment pending on ${primary.date}.`;
  }
  return {
    status,
    label,
    amount,
    date: primary.date,
    detail,
    candidates: related.map((transaction) => ({
      date: transaction.date,
      role: paymentRole(transaction),
      pending: Boolean(transaction.pending),
      accountName: transaction.plaidAccountName || "",
      accountMask: transaction.plaidAccountMask || "",
      description: transaction.description || "",
      amount: paymentAmount(transaction)
    }))
  };
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

function isDebtPaymentLike(transaction) {
  const text = `${transaction.category || ""} ${transaction.description || ""} ${transaction.merchant || ""}`.toLowerCase();
  return isCreditPayment(transaction)
    || /loan payment|credit card payment|credit crd|autopay|payment thank|card payment/.test(text);
}

function isFixedOrTransferLike(transaction) {
  const text = `${transaction.category || ""} ${transaction.description || ""} ${transaction.merchant || ""}`.toLowerCase();
  return isDebtPaymentLike(transaction)
    || /rent|utilities|payroll|income|deposit|transfer in|transfer out|zelle payment.*landlord/.test(text);
}

function isPurchaseOffsetLike(transaction) {
  const inflow = Number(transaction.inflow || 0);
  if (inflow <= 0) return false;
  if (isFixedOrTransferLike(transaction)) return false;
  const text = `${transaction.type || ""} ${transaction.category || ""} ${transaction.description || ""} ${transaction.merchant || ""}`.toLowerCase();
  if (/payroll|salary|ach credit|direct deposit|interest earned|transfer|zelle|venmo|cash app/.test(text)) return false;
  return /refund|return|cashback|statement credit|merchant credit|credit adjustment|purchase adjustment|reversal/.test(text)
    || String(transaction.plaidAccountType || "").toLowerCase() === "credit";
}

function groupedSpend(transactions, keyFn) {
  const groups = new Map();
  for (const transaction of transactions) {
    if (transaction.spend <= 0) continue;
    const key = keyFn(transaction) || "Uncategorized";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(transaction);
  }
  return [...groups.entries()].map(([label, items]) => {
    const sorted = items.sort((a, b) => dateMs(b.date) - dateMs(a.date));
    return {
      label,
      total: sum(sorted.map((item) => item.spend)),
      count: sorted.length,
      latestDate: sorted[0]?.date || "",
      category: sorted[0]?.category || ""
    };
  }).sort((a, b) => b.total - a.total);
}

function groupedInflow(transactions, keyFn) {
  const groups = new Map();
  for (const transaction of transactions) {
    if (transaction.inflow <= 0) continue;
    const key = keyFn(transaction) || "Credit";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(transaction);
  }
  return [...groups.entries()].map(([label, items]) => {
    const sorted = items.sort((a, b) => dateMs(b.date) - dateMs(a.date));
    return {
      label,
      total: sum(sorted.map((item) => item.inflow)),
      count: sorted.length,
      latestDate: sorted[0]?.date || "",
      category: sorted[0]?.category || ""
    };
  }).sort((a, b) => b.total - a.total);
}

function spendAlternative(label, category, context = {}) {
  const text = `${label || ""} ${category || ""}`.toLowerCase();
  const pattern = String(context.pattern || "").toLowerCase();
  const count = Number(context.count || 0);
  const recentCount = Number(context.recentCount || 0);
  const amount90 = Number(context.amount90 || 0);
  const amount14 = Number(context.amount14 || 0);
  const pastPurchase = /past purchase|one-off|large one-off/.test(pattern)
    || (count <= 2 && recentCount === 0);
  const countText = count > 0 ? `${count} charge${count === 1 ? "" : "s"} in 90d` : "";
  const recentText = recentCount > 0 ? `${recentCount} recent charge${recentCount === 1 ? "" : "s"}` : "";

  if (/shar|music|instrument|violin/.test(text)) {
    return pastPurchase
      ? "Past music purchase. Use the part already bought before buying another accessory."
      : `${countText || "Music gear spend"}. Use current strings, rosin, case, and setup before buying another accessory.`;
  }
  if (/chipotle|restaurant|food|coffee|cafe|fuel america|dining|takeout|delivery/.test(text)) {
    if (/chipotle/.test(text)) return `${countText || "Chipotle repeat spend"}. Bowl-and-chips pickup pattern; order only when it is the planned meal.`;
    if (/doordash|thai|pho|goldenpiz|pizza/.test(text)) return `${countText || "Takeout spend"}. Delivery and takeout are showing up; use food already paid for first.`;
    if (/fuel america/.test(text)) return `${countText || "Snack stop spend"}. Bring one drink or snack before another convenience stop.`;
    return `${countText || "Food spend"}. Eat one already-paid meal first, then decide if this order is still needed.`;
  }
  if (/sleeplay|cpap|medical|health/.test(text)) {
    if (/bodyspec/.test(text)) return `${countText || "Health check spend"}. Book only if the result changes a real health or training decision.`;
    return `${countText || "Sleep-supply spend"}. Buy only the mask, cushion, or part that fixes sleep tonight; skip spare upgrades.`;
  }
  if (/openai|chatgpt|netflix|spotify|capcut|datoromedia|adobe|github|notion|dropbox|patreon|substack|subscription|software|app|internet|online/.test(text)) {
    if (/openai|chatgpt/.test(text)) return `${countText || "OpenAI charges"}. API auto-funding is the leak; Pro is already dropping to Plus, so keep the cap tight.`;
    if (/netflix/.test(text)) return `${countText || "Netflix renewals"}. Pause unless you are actively watching it this month.`;
    if (/spotify/.test(text)) return `${countText || "Spotify renewals"}. Email suggests active fan use; keep only if it still improves the day.`;
    if (/capcut/.test(text)) return `${countText || "CapCut renewals"}. Receipt says Pro monthly; keep only for current video work.`;
    if (/datoromedia/.test(text)) return `${countText || "Recurring media charge"}. Segpay receipt says monthly membership; cancel if it is not intentionally used.`;
    return `${countText || "Recurring online charge"}. Open the account page and cancel anything not used this week.`;
  }
  if (/lyft|uber|taxi|rideshare|transport/.test(text)) {
    return `${countText || "Ride spend"}. Receipts show short campus/home trips; batch rides or walk daytime routes when safe.`;
  }
  if (/amazon/.test(text)) {
    return `${countText || "Amazon pattern"}. Receipts split into gear, supplies, food, health, and project parts.`;
  }
  if (/lululemon|clothing|apparel/.test(text)) {
    return `${countText || "Clothing spend"}. Promo emails are pushing tracksuits/accessories; replace only a daily item that is worn out.`;
  }
  if (/amazon|bestbuy|best buy|rebill|samsung|electronics|lululemon|clothing|apparel|shop|retail|merchandise/.test(text)) {
    if (/best ?buy/.test(text)) return "Receipt shows the camera purchase was refunded. Keep this resolved; no accessory follow-up.";
    if (/samsung/.test(text)) return "No recent Samsung receipt found in email. Treat as old electronics spend until matched.";
    return pastPurchase
      ? `$${Math.round(amount90).toLocaleString("en-US")} past spike. This is not a daily habit.`
      : `${recentText || countText || "Retail spend"}.`;
  }
  if (/grocery|supermarket/.test(text)) {
    return "One grocery run, one list, one limit.";
  }
  return pastPurchase
    ? `$${Math.round(amount90).toLocaleString("en-US")} already spent. Do not turn it into a second purchase.`
    : `${amount14 > 0 ? `$${Math.round(amount14).toLocaleString("en-US")} recent spend` : countText || "Repeat spend"}. Check whether it is still needed before another charge.`;
}

function merchantReceiptBreakdown(label) {
  const text = String(label || "").toLowerCase();
  if (!/amazon/.test(text)) return null;

  return {
    title: "Amazon: what it is",
    source: "Gmail receipts checked May 23.",
    rule: "Receipts split into gear, supplies, food, health, and project parts.",
    categories: [
      {
        label: "Electronics and camera gear",
        detail: "DJI parts, microSD, power banks, chargers, phone cases, screen protectors.",
        action: "Only buy if it finishes a current project today; no backup gear."
      },
      {
        label: "Health and sleep supplies",
        detail: "CPAP parts, TUMS, body wash, supplements.",
        action: "Replacement only when the current supply is actually ending."
      },
      {
        label: "Violin and research parts",
        detail: "Strings, hide glue, seam grip, DC power supply.",
        action: "Only if tied to this week's named build or practice task."
      },
      {
        label: "Food and kitchen",
        detail: "Pop-Tarts, cheese grater, small kitchen items.",
        action: "Buy only when it replaces one takeout or Chipotle decision."
      },
      {
        label: "Self-care extras",
        detail: "Hair, skin, cleaning, and body products.",
        action: "One active product per slot; finish it before replacing."
      },
      {
        label: "Cancelled big carts",
        detail: "Some electronics and accessory bursts were cancelled or refunded.",
        action: "Keep the cancellation; do not reopen a similar cart."
      }
    ]
  };
}

function isNamedSubscription(label, category) {
  const text = `${label || ""} ${category || ""}`.toLowerCase();
  return /openai|chatgpt|spotify|netflix|hulu|youtube|apple|icloud|google|microsoft|adobe|github|notion|dropbox|patreon|substack|capcut|subscription|membership|software|internet|online/.test(text);
}

function isRecurringCadence(count, cadence) {
  return count >= 3 && cadence !== null && cadence >= 20 && cadence <= 40;
}

function cadenceDays(sorted) {
  const gaps = [];
  for (let index = 0; index < sorted.length - 1; index += 1) {
    const gap = Math.abs(daysBetween(sorted[index].date, sorted[index + 1].date));
    if (Number.isFinite(gap) && gap > 0) gaps.push(gap);
  }
  return gaps.length ? median(gaps) : null;
}

function merchantSpendPicture(label, broadItems, recentItems, latestDate) {
  const sortedBroad = broadItems.sort((a, b) => dateMs(b.date) - dateMs(a.date));
  const sortedRecent = recentItems.sort((a, b) => dateMs(b.date) - dateMs(a.date));
  const broadTotal = sum(sortedBroad.map((item) => item.spend));
  const recentTotal = sum(sortedRecent.map((item) => item.spend));
  const latest7Items = latestDate ? sortedBroad.filter((item) => withinDays(item, latestDate, 7)) : [];
  const latest7Total = sum(latest7Items.map((item) => item.spend));
  const broadCount = sortedBroad.length;
  const recentCount = sortedRecent.length;
  const latest7Count = latest7Items.length;
  const category = sortedBroad[0]?.category || sortedRecent[0]?.category || "";
  const quietDays = latestDate && sortedBroad[0]?.date ? Math.max(0, daysBetween(latestDate, sortedBroad[0].date)) : 0;
  const cadence = cadenceDays(sortedBroad);
  const namedSubscription = isNamedSubscription(label, category) && broadCount >= 2;
  const cadenceRecurring = !namedSubscription && isRecurringCadence(broadCount, cadence);
  const repeat = broadCount >= 3 || recentCount >= 2;
  const oneOff = broadCount === 1;
  const purchaseCluster = broadCount >= 2 && !namedSubscription && !cadenceRecurring && !repeat;
  const activeMonthly = oneOff || purchaseCluster ? 0 : (latest7Count > 0 ? latest7Total * (30 / 7) : recentCount > 0 ? recentTotal * (30 / 14) : 0);
  const broadMonthly = oneOff || purchaseCluster ? 0 : broadTotal * (30 / 90);
  const monthlyImpact = Math.max(activeMonthly, broadMonthly);
  const quietLatest7 = latestDate && latest7Count === 0 && recentCount > 0;
  const quietStreak = latestDate && quietDays >= 3 && recentCount > 0;
  const pastSpendScore = oneOff || purchaseCluster ? Math.min(broadTotal * 0.08, 450) : 0;
  const priorityScore = monthlyImpact
    + (namedSubscription ? 180 : 0)
    + (cadenceRecurring ? 120 : 0)
    + (repeat ? 80 : 0)
    + (recentCount > 0 ? 60 : 0)
    + pastSpendScore
    - (oneOff || purchaseCluster ? 180 : 0);
  const pattern = namedSubscription
    ? "Subscription"
    : cadenceRecurring
      ? "Recurring charge"
    : repeat
      ? "Repeated habit"
      : purchaseCluster || broadTotal >= 250
        ? "Past purchase"
        : oneOff
          ? "One-off"
          : "Purchase";
  const impactLabel = namedSubscription
    ? `+$${Math.round(monthlyImpact).toLocaleString("en-US")}/mo if canceled`
    : (quietLatest7 || quietStreak) && monthlyImpact > 0
      ? `+$${Math.round(monthlyImpact).toLocaleString("en-US")}/mo if held down`
    : repeat || cadenceRecurring
      ? `+$${Math.round(monthlyImpact).toLocaleString("en-US")}/mo if reduced`
      : `Past spend: $${Math.round(broadTotal).toLocaleString("en-US")}`;
  const issueParts = [];
  if (quietStreak) issueParts.push(`$0 / ${quietDays}d`);
  else if (quietLatest7) issueParts.push("$0 / 7d");
  else if (latest7Count > 0) issueParts.push(`$${Math.round(latest7Total).toLocaleString("en-US")} / 7d`);
  else if (recentCount > 0) issueParts.push(`$${Math.round(recentTotal).toLocaleString("en-US")} / 14d`);
  issueParts.push(`$${Math.round(broadTotal).toLocaleString("en-US")} / 90d`);
  issueParts.push(`${broadCount} charge${broadCount === 1 ? "" : "s"}`);
  return {
    label,
    amount: recentCount > 0 ? recentTotal : broadTotal,
    amount90: broadTotal,
    amount14: recentTotal,
    amount7: latest7Total,
    monthlyImpact,
    impactLabel,
    count: broadCount,
    recentCount,
    latest7Count,
    quietLatest7,
    quietStreak,
    quietDays,
    category,
    cadence,
    pattern,
    window: recentCount > 0 ? "14 + 90 days" : "90 days",
    issue: issueParts.join("; "),
    next: spendAlternative(label, category, {
      pattern,
      count: broadCount,
      recentCount,
      amount90: broadTotal,
      amount14: recentTotal,
      monthlyImpact
    }),
    receiptBreakdown: merchantReceiptBreakdown(label),
    severity: quietLatest7 || quietStreak ? "watch" : monthlyImpact >= 150 || namedSubscription || cadenceRecurring ? "danger" : "watch",
    priorityScore,
    latestDate: sortedBroad[0]?.date || latestDate || ""
  };
}

function spendingTriage(flexible14, flexible90, byCategory, latestDate = "") {
  const recentByMerchant = new Map();
  for (const transaction of flexible14) {
    if (!recentByMerchant.has(transaction.merchant)) recentByMerchant.set(transaction.merchant, []);
    recentByMerchant.get(transaction.merchant).push(transaction);
  }
  const broadByMerchant = new Map();
  for (const transaction of flexible90) {
    if (!transaction.merchant || transaction.spend <= 0) continue;
    if (!broadByMerchant.has(transaction.merchant)) broadByMerchant.set(transaction.merchant, []);
    broadByMerchant.get(transaction.merchant).push(transaction);
  }
  const seen = new Set();
  const rows = [];
  for (const [label, items] of broadByMerchant.entries()) {
    const total = sum(items.map((item) => item.spend));
    if (!label || total < 20) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push(merchantSpendPicture(label, items, recentByMerchant.get(label) || [], latestDate || items[0]?.date || ""));
  }

  const food = byCategory.find((item) => /food/i.test(item.label));
  if (food && !rows.some((row) => /chipotle|restaurant|food|coffee|cafe|dining|takeout|delivery/i.test(`${row.label} ${row.category}`))) {
    rows.push({
      label: "Food and drink",
      amount: food.total,
      amount90: food.total,
      amount14: 0,
      monthlyImpact: food.total * (30 / 90),
      impactLabel: `+$${Math.round(food.total * (30 / 90)).toLocaleString("en-US")}/mo if reduced`,
      count: food.count,
      recentCount: 0,
      category: food.label,
      pattern: "Category",
      window: "90 days",
      issue: `$${Math.round(food.total).toLocaleString("en-US")} / 90d; ${food.count} charges`,
      next: spendAlternative("food", food.label, {
        pattern: "Category",
        count: food.count,
        amount90: food.total
      }),
      severity: "danger",
      priorityScore: food.total * (30 / 90) + 60
    });
  }

  const sortedRows = rows
    .sort((a, b) => {
      if (Number(b.priorityScore || 0) !== Number(a.priorityScore || 0)) {
        return Number(b.priorityScore || 0) - Number(a.priorityScore || 0);
      }
      return Number(b.monthlyImpact || b.amount || 0) - Number(a.monthlyImpact || a.amount || 0);
    });
  const repeatableRows = sortedRows.filter((row) => {
    const pattern = String(row.pattern || "").toLowerCase();
    return row.monthlyImpact > 0 || row.recentCount > 0 || /subscription|recurring|repeated|category/.test(pattern);
  });
  const pastRows = sortedRows
    .filter((row) => !repeatableRows.includes(row))
    .sort((a, b) => Number(b.amount90 || b.amount || 0) - Number(a.amount90 || a.amount || 0))
    .slice(0, 4);
  const repeatableLimit = 18 - pastRows.length;
  return [...repeatableRows.slice(0, repeatableLimit), ...pastRows]
    .map((row, index) => ({ ...row, priorityRank: index + 1 }));
}

function dailyPurchaseAction(topLabel, items) {
  const text = `${topLabel || ""} ${(items || []).map((item) => item.category || item.description || "").join(" ")}`.toLowerCase();
  if (/shar music|violin|string|music/.test(text)) return "Only if it directly fixes this week's named practice or build.";
  if (/bodyspec|body.?spec|fitness/.test(text)) return "Only if the scan changes a real health decision.";
  if (/pharmacy|medical|health|sleep|cpap|cvs/.test(text)) return "Replacement only if it fixes tonight or this week.";
  if (/amc|theatre|theater|movie|entertainment/.test(text)) return "Entertainment only if planned before checkout.";
  if (/mbta|transit|train|bus/.test(text)) return "Transit is fine; keep it separate from rideshare.";
  if (/amazon/.test(text)) return "Amazon repeat item.";
  if (/chipotle|restaurant|food|coffee|cafe|dining|takeout|delivery|supermarket|grocery/.test(text)) {
    return "Use food already paid for before another order.";
  }
  if (/lyft|uber|taxi|rideshare|transport/.test(text)) return "Batch trips or walk/transit when safe.";
  if (/openai|chatgpt|software|subscription|internet|online/.test(text)) return "Check the cap before another paid tool charge.";
  if (/best buy|samsung|electronics|camera|dji|gear|accessory|lululemon|clothing|apparel|shop|retail/.test(text)) {
    return "Replacement only; skip backup gear and upgrades.";
  }
  return "Repeat purchase.";
}

function dailyPurchaseScan(flexible14, latestDate, all14 = []) {
  const days = 7;
  const rows = [];
  for (let index = 0; index < days; index += 1) {
    const date = new Date(dateMs(latestDate) - (index * 86400000)).toISOString().slice(0, 10);
    const items = (flexible14 || []).filter((transaction) => transaction.date === date && transaction.spend > 0);
    const offsets = (all14 || []).filter((transaction) => transaction.date === date && isPurchaseOffsetLike(transaction));
    if (!items.length && !offsets.length) continue;
    const total = sum(items.map((transaction) => transaction.spend));
    const credits = sum(offsets.map((transaction) => transaction.inflow));
    const netOut = Math.max(0, total - credits);
    const merchants = groupedSpend(items, (transaction) => transaction.merchant).slice(0, 3);
    const creditMerchants = groupedInflow(offsets, (transaction) => transaction.merchant).slice(0, 3);
    const top = merchants[0];
    const topItems = top ? items.filter((transaction) => transaction.merchant === top.label) : items;
    rows.push({
      date,
      total,
      credits,
      netOut,
      count: items.length,
      creditCount: offsets.length,
      merchants: merchants.map((merchant) => `${merchant.label} ${moneyText(merchant.total)}`),
      creditMerchants: creditMerchants.map((merchant) => `${merchant.label} ${moneyText(merchant.total)}`),
      topMerchant: top?.label || "",
      next: dailyPurchaseAction(top?.label, topItems),
      severity: netOut >= 160 || items.length >= 5 ? "danger" : netOut >= 60 || items.length >= 3 ? "watch" : "good"
    });
  }
  const total = sum(rows.map((row) => row.total));
  const creditsTotal = sum(rows.map((row) => row.credits));
  const netOut = Math.max(0, total - creditsTotal);
  const byMerchant = groupedSpend(flexible14 || [], (transaction) => transaction.merchant).slice(0, 1);
  return {
    window: "latest 7 days",
    days,
    spendingDays: rows.length,
    total,
    creditsTotal,
    netOut,
    dailyAverage: netOut / days,
    averageSpendingDay: rows.length ? netOut / rows.length : 0,
    topMerchant: byMerchant[0]?.label || "",
    rows
  };
}

function moneyText(value) {
  return `$${Math.round(Number(value || 0)).toLocaleString("en-US")}`;
}

function firstSpendMatch(spending, pattern) {
  return (spending || []).find((item) => pattern.test(`${item.label || ""} ${item.category || ""} ${item.pattern || ""}`));
}

function progressTargets() {
  return [
    {
      label: "Chipotle",
      key: "chipotle",
      pattern: /chipotle/i,
      priority: 220,
      named: true
    },
    {
      label: "Lyft",
      key: "lyft",
      pattern: /\blyft\b|uber|taxi|rideshare/i,
      priority: 210,
      named: true
    },
    {
      label: "Food away",
      key: "food",
      pattern: /restaurant|dining|takeout|delivery|doordash|thai|pho|pizza|coffee|cafe/i,
      priority: 120
    },
    {
      label: "Ride spend",
      key: "rides",
      pattern: /transport|transit|ride/i,
      priority: 100
    }
  ];
}

function progressMatchText(transaction) {
  return `${transaction.merchant || ""} ${transaction.category || ""} ${transaction.description || ""}`.toLowerCase();
}

function progressRowForTarget(target, transactions, latestDate) {
  const matched = (transactions || [])
    .filter((transaction) => transaction.spend > 0 && target.pattern.test(progressMatchText(transaction)))
    .sort((a, b) => dateMs(b.date) - dateMs(a.date));
  if (!matched.length) return null;

  const latest7 = matched.filter((transaction) => withinDays(transaction, latestDate, 7));
  const previous21 = matched.filter((transaction) => withinDays(transaction, latestDate, 21, 7));
  const latest14 = matched.filter((transaction) => withinDays(transaction, latestDate, 14));
  const previous14 = matched.filter((transaction) => withinDays(transaction, latestDate, 14, 14));
  const total90 = sum(matched.map((transaction) => transaction.spend));
  const total7 = sum(latest7.map((transaction) => transaction.spend));
  const prior21Total = sum(previous21.map((transaction) => transaction.spend));
  const total14 = sum(latest14.map((transaction) => transaction.spend));
  const prior14Total = sum(previous14.map((transaction) => transaction.spend));
  const latest = matched[0];
  const quietDays = latest?.date ? Math.max(0, daysBetween(latestDate, latest.date)) : 0;
  const broadMonthly = total90 * (30 / 90);
  const prior21Monthly = prior21Total * (30 / 21);
  const prior14Monthly = prior14Total * (30 / 14);
  const latest14Monthly = total14 * (30 / 14);
  const latest7Quiet = total7 === 0 && (target.named || prior21Total >= 15 || total90 >= 60);
  const latest14Quiet = total14 === 0 && (target.named || total90 >= 60);
  const reduced14 = prior14Total >= 20 && total14 <= prior14Total * 0.6;
  const namedQuietStreak = Boolean(target.named && quietDays >= 3);
  const savedMonthly = latest14Quiet
    ? Math.max(broadMonthly, prior14Monthly)
    : latest7Quiet
      ? Math.max(broadMonthly, prior21Monthly)
      : namedQuietStreak
        ? broadMonthly
        : Math.max(0, prior14Monthly - latest14Monthly);

  if (!latest7Quiet && !latest14Quiet && !reduced14 && !namedQuietStreak) return null;
  if (!target.named && matched.length < 2 && total90 < 60) return null;

  const status = latest14Quiet
    ? "Quiet 14d"
    : latest7Quiet
      ? "Quiet 7d"
      : namedQuietStreak
        ? `Quiet ${quietDays}d`
        : "Reduced";
  const detail = namedQuietStreak && !latest7Quiet
    ? `No charge since ${latest?.date || "unknown"}; ${moneyText(total7)} still in latest 7d`
    : latest7Quiet
    ? `${moneyText(total7)} latest 7d; last ${latest?.date || "unknown"}`
    : `${moneyText(total14)} latest 14d; was ${moneyText(prior14Total)} prior 14d`;
  const evidence = `${moneyText(total90)} / 90d; ${matched.length} charge${matched.length === 1 ? "" : "s"}`;
  return {
    label: target.label,
    key: target.key,
    status,
    detail,
    evidence,
    latestDate: latest?.date || "",
    quietDays,
    latest7: total7,
    prior21: prior21Total,
    latest14: total14,
    prior14: prior14Total,
    amount90: total90,
    count90: matched.length,
    savedMonthly,
    impactLabel: savedMonthly > 0 ? `-${moneyText(savedMonthly)}/mo pace if held` : "Held at current pace",
    priorityScore: Number(target.priority || 0) + savedMonthly + (latest14Quiet ? 40 : latest7Quiet ? 20 : 0),
    named: Boolean(target.named),
    severity: "good"
  };
}

function reducedSpendingSignals(flexible90, latestDate) {
  if (!latestDate) {
    return { window: "latest 7d + 90d record", totalMonthlyPace: 0, rows: [] };
  }

  const rows = [];
  const usedKeys = new Set();
  for (const target of progressTargets()) {
    const row = progressRowForTarget(target, flexible90, latestDate);
    if (!row) continue;
    if (row.key === "food" && rows.some((candidate) => candidate.key === "chipotle")) continue;
    if (row.key === "rides" && rows.some((candidate) => candidate.key === "lyft")) continue;
    rows.push(row);
    usedKeys.add(row.key);
  }

  const grouped = groupedSpend(flexible90 || [], (transaction) => transaction.merchant);
  for (const merchant of grouped) {
    const key = normalizeSpendLockLabel(merchant.label);
    if (!key || usedKeys.has(key.toLowerCase())) continue;
    if (rows.some((row) => row.label.toLowerCase() === merchant.label.toLowerCase())) continue;
    if (rows.some((row) => row.key === "chipotle") && /chipotle/i.test(merchant.label)) continue;
    if (rows.some((row) => row.key === "lyft") && /lyft/i.test(merchant.label)) continue;
    const dynamicTarget = {
      label: merchant.label,
      key: key.toLowerCase(),
      pattern: new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+"), "i"),
      priority: 20
    };
    const row = progressRowForTarget(dynamicTarget, flexible90, latestDate);
    if (row && row.count90 >= 3 && row.savedMonthly >= 25) rows.push(row);
  }

  const sorted = rows
    .sort((a, b) => {
      if (Boolean(a.named) !== Boolean(b.named)) return a.named ? -1 : 1;
      return Number(b.priorityScore || 0) - Number(a.priorityScore || 0);
    })
    .slice(0, 5)
    .map((row, index) => ({ ...row, priorityRank: index + 1 }));
  return {
    window: "latest 7d + 90d record",
    totalMonthlyPace: sum(sorted.map((row) => Math.max(0, Number(row.savedMonthly || 0)))),
    rows: sorted
  };
}

function hasProgressMatch(progressRows, pattern) {
  return (progressRows || []).some((row) => pattern.test(`${row.label || ""} ${row.key || ""} ${row.status || ""}`));
}

function overallReview(input) {
  const { accounts, goal, settings, improvements, paymentStatus } = input;
  const spending = improvements?.spending || [];
  const progressRows = improvements?.progress?.rows || [];
  const cash = Number(accounts.cash || 0);
  const floor = Number(settings.cashFloor || 0);
  const cushion = Math.max(0, cash - floor);
  const cardBalance = Number(accounts.debtTotal || 0);
  const fullPurchaseGap = Number(goal.fullPurchaseGap || 0);
  const flexible14 = Number(improvements?.flexible14 || 0);
  const amazon = firstSpendMatch(spending, /amazon/i);
  const openai = firstSpendMatch(spending, /openai|chatgpt/i);
  const food = firstSpendMatch(spending, /chipotle|food|restaurant|dining|takeout|coffee|cafe/i);
  const foodCategory = (improvements?.topCategories || []).find((item) => /food/i.test(item.label || ""));
  const lyft = firstSpendMatch(spending, /lyft|uber|rideshare|transport/i);
  const foodImproving = hasProgressMatch(progressRows, /chipotle|food/i);
  const rideImproving = hasProgressMatch(progressRows, /lyft|rides/i);
  const subscriptions = spending
    .filter((item) => isNamedSubscription(item.label, item.category || item.pattern))
    .map((item) => item.label)
    .filter(Boolean)
    .slice(0, 5);

  if (!accounts.connected) {
    return {
      verdict: "No live review yet.",
      summary: "No live financial read.",
      good: ["The page is waiting for bank data instead of using fake sample numbers."],
      bad: ["No current balances or transactions are connected."],
      must: ["Live balances are required before the car decision."]
    };
  }

  const good = [
    "Live bank data is connected.",
    `${moneyText(cash)} current cash is included in the full-purchase check.`
  ];
  if (paymentStatus?.amount > 0 && paymentStatus.status !== "pending") {
    good.push(`${moneyText(paymentStatus.amount)} payment is already visible.`);
  }
  for (const row of progressRows.slice(0, 3)) {
    good.push(`${row.label}: ${row.detail}. ${row.impactLabel}.`);
  }
  if (goal.monthlyRoom > 0) {
    good.push(`${moneyText(goal.monthlyRoom)} monthly room exists if repeat spending is controlled.`);
  }

  const bad = [];
  if (cardBalance > 0) bad.push(`${moneyText(cardBalance)} card/loan balance is ahead of any car decision.`);
  if (fullPurchaseGap > 0) bad.push(`${moneyText(fullPurchaseGap)} below the car price before tax, fees, insurance, and interest.`);
  if (flexible14 > 0) bad.push(`${moneyText(flexible14)} flexible spend in the latest 14 days is too high for an A3 push.`);
  if (amazon) bad.push(`Amazon is the largest repeatable leak: ${moneyText(amazon.amount90)} in 90 days across ${amazon.count} charges.`);
  if ((foodCategory || food) && !foodImproving) bad.push(`Food and drink is still leaking: ${moneyText(foodCategory?.total || food.amount90 || food.amount)} in 90 days.`);

  const must = [];
  if (cardBalance > 0) must.push(`Do not treat cash as car money until the ${moneyText(cardBalance)} card/loan balance is lower.`);
  if (amazon) must.push("Amazon repeat item.");
  if (openai) must.push("OpenAI: remove duplicate plans or API auto-funding that is not doing current work.");
  if (food && !foodImproving) must.push("Food: use food already paid for before another order.");
  if (lyft && !rideImproving) must.push("Rides: batch trips; walk or transit when the schedule allows.");
  if (subscriptions.length) must.push(`Subscription audit: ${subscriptions.join(", ")}.`);
  if (!must.length) must.push("Keep cash steady and review the full A3 purchase before committing.");

  return {
    verdict: cardBalance > 0
      ? "Not A3-ready yet. The blocker is the card/loan balance plus repeat spending."
      : "Full purchase still needs payment, insurance, debt, and cashflow fit.",
    summary: `Whole purchase: ${moneyText(A3_GOAL.priceAsBuilt)}. Current picture: ${moneyText(cardBalance)} card/loan balance, ${moneyText(cash)} cash.`,
    good: good.slice(0, 4),
    bad: bad.slice(0, 5),
    must: must.slice(0, 6)
  };
}

function easternDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${byType.year}-${byType.month}-${byType.day}`;
}

function addDaysKey(date, days) {
  const next = new Date(`${date}T12:00:00Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

function normalizeSpendLockLabel(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9&' ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function spendingLockStatuses(store, analysis) {
  const today = easternDateKey();
  const spending = analysis?.improvements?.spending || [];
  const spendingByKey = new Map(spending.map((item) => [normalizeSpendLockLabel(item.label), item]));
  const transactions = analysis?.transactions || [];
  return (store.spendingLocks || []).map((lock) => {
    const key = lock.key || normalizeSpendLockLabel(lock.label);
    const matchingSpend = transactions
      .filter((transaction) => transaction.spend > 0)
      .filter((transaction) => normalizeSpendLockLabel(transaction.merchant) === key)
      .filter((transaction) => lock.startDate && dateMs(transaction.date) > dateMs(lock.startDate));
    const newSpend = sum(matchingSpend.map((transaction) => transaction.spend));
    const active = lock.expiresOn ? dateMs(lock.expiresOn) >= dateMs(today) : false;
    const daysLeft = active ? Math.max(0, Math.ceil((dateMs(lock.expiresOn) - dateMs(today)) / 86400000)) : 0;
    const current = spendingByKey.get(key) || {};
    return {
      id: lock.id,
      label: lock.label,
      key,
      startDate: lock.startDate,
      expiresOn: lock.expiresOn,
      days: Number(lock.days || 7),
      daysLeft,
      active,
      status: active && newSpend > 0 ? "new_charge" : active ? "clean" : "expired",
      newSpend,
      newChargeCount: matchingSpend.length,
      next: lock.next || current.next || spendAlternative(lock.label, current.category),
      impactLabel: lock.impactLabel || current.impactLabel || "",
      updatedAt: lock.updatedAt || lock.createdAt || ""
    };
  }).sort((a, b) => {
    if (a.active !== b.active) return a.active ? -1 : 1;
    return String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""));
  });
}

function immediateImprovements(input) {
  const { accounts, goal, settings, withFlow, latestDate, paymentStatus } = input;
  const cash = Number(accounts.cash || 0);
  const floor = Number(settings.cashFloor || 0);
  const cushion = Math.max(0, cash - floor);
  const debtTotal = Number(accounts.debtTotal || 0);
  const last14 = withFlow.filter((transaction) => withinDays(transaction, latestDate, 14));
  const last90 = withFlow.filter((transaction) => withinDays(transaction, latestDate, 90));
  const flexible = last14.filter((transaction) => transaction.spend > 0 && !isFixedOrTransferLike(transaction));
  const flexible90 = last90.filter((transaction) => transaction.spend > 0 && !isFixedOrTransferLike(transaction));
  const byMerchant = groupedSpend(flexible, (transaction) => transaction.merchant).slice(0, 6);
  const byCategory = groupedSpend(flexible90, (transaction) => transaction.category).slice(0, 8);
  const debtPayments = last14.filter((transaction) => isDebtPaymentLike(transaction));
  const debtPaymentTotal = sum(debtPayments.map((transaction) => transaction.spend));
  const items = [];

  if (!accounts.connected) {
    return {
      state: "Bank data unavailable.",
      flexible14: 0,
      debtPayment14: 0,
      topMerchants: [],
      topCategories: [],
      progress: { window: "latest 7d + 90d record", totalMonthlyPace: 0, rows: [] },
      dailyScan: { window: "latest 7 days", days: 7, spendingDays: 0, total: 0, creditsTotal: 0, netOut: 0, dailyAverage: 0, averageSpendingDay: 0, topMerchant: "", rows: [] },
      spending: [],
      items: [
        { label: "Live balances", detail: "The full A3 decision needs current balances and purchases.", severity: "watch" },
        { label: "Down payment today", detail: "Wait for real account data before testing cash damage.", severity: "watch" }
      ]
    };
  }

  if (debtTotal > 0) {
    items.push({
      label: "Mistake to avoid",
      detail: `Do not treat cash as car money while $${Math.round(debtTotal).toLocaleString("en-US")} card/loan balance remains.`,
      severity: "danger"
    });
  } else if (goal.fullPurchaseGap > 0) {
    items.push({
      label: "Whole purchase",
      detail: `$${Math.round(goal.fullPurchaseGap).toLocaleString("en-US")} below the car price before tax, fees, insurance, and interest.`,
      severity: "good"
    });
  }

  items.push({
    label: "Cash today",
    detail: `$${Math.round(cash).toLocaleString("en-US")} current cash. Cash does not change the balance blocker.`,
    severity: cushion < 500 ? "danger" : "watch"
  });

  const topMerchant = byMerchant.find((item) => item.count > 1) || byMerchant[0];
  if (topMerchant && topMerchant.total >= 25) {
    items.push({
      label: "Biggest leak",
      detail: `${topMerchant.label}: $${Math.round(topMerchant.total).toLocaleString("en-US")} in the latest 14d. Slow the next charge.`,
      severity: "watch"
    });
  }

  const progress = reducedSpendingSignals(flexible90, latestDate);
  const food = byCategory.find((item) => /food/i.test(item.label));
  const foodImproving = hasProgressMatch(progress.rows, /chipotle|food/i);
  if (food && !foodImproving && !items.some((item) => item.detail.includes(food.label))) {
    items.push({
      label: "Food leak",
      detail: `$${Math.round(food.total).toLocaleString("en-US")} in the latest 90d, ${food.count} charges. Use food already paid for before another order.`,
      severity: "watch"
    });
  }

  if (debtTotal > 0) {
    items.push({
      label: "Card spend",
      detail: "Only necessary charges until cash and balances improve.",
      severity: "danger"
    });
  }

  if (paymentStatus?.amount > 0) {
    items.push({
      label: paymentStatus.status === "pending" ? "Payment pending" : "Payment posted",
      detail: paymentStatus.status === "pending"
        ? `$${Math.round(paymentStatus.amount).toLocaleString("en-US")} still pending.`
        : `$${Math.round(paymentStatus.amount).toLocaleString("en-US")} payment visible.`,
      severity: paymentStatus.status === "pending" ? "watch" : "good"
    });
  }

  return {
    state: `$${Math.round(debtTotal).toLocaleString("en-US")} balance; $${Math.round(cash).toLocaleString("en-US")} cash against a $${Math.round(A3_GOAL.priceAsBuilt).toLocaleString("en-US")} car.`,
    flexible14: sum(flexible.map((transaction) => transaction.spend)),
    debtPayment14: debtPaymentTotal,
    topMerchants: byMerchant,
    topCategories: byCategory,
    progress,
    dailyScan: dailyPurchaseScan(flexible, latestDate, last14),
    spending: spendingTriage(flexible, flexible90, byCategory, latestDate),
    items: items.slice(0, 6)
  };
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

function weekStart(date) {
  const parsed = new Date(`${date}T00:00:00Z`);
  if (!Number.isFinite(parsed.getTime())) return "";
  const day = parsed.getUTCDay();
  const diff = (day + 6) % 7;
  parsed.setUTCDate(parsed.getUTCDate() - diff);
  return parsed.toISOString().slice(0, 10);
}

function addWeeks(date, amount) {
  const parsed = new Date(`${date}T00:00:00Z`);
  if (!Number.isFinite(parsed.getTime())) return "";
  parsed.setUTCDate(parsed.getUTCDate() + (amount * 7));
  return parsed.toISOString().slice(0, 10);
}

function weekRange(start, end) {
  const weeks = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) return weeks;
  let cursor = start;
  while (cursor && cursor <= end) {
    weeks.push(cursor);
    cursor = addWeeks(cursor, 1);
  }
  return weeks;
}

function addDays(date, amount) {
  const parsed = new Date(`${date}T00:00:00Z`);
  if (!Number.isFinite(parsed.getTime())) return "";
  parsed.setUTCDate(parsed.getUTCDate() + amount);
  return parsed.toISOString().slice(0, 10);
}

function dateRange(start, end) {
  const days = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) return days;
  let cursor = start;
  while (cursor && cursor <= end) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return days;
}

function dailyNetHistory(transactions, latestDate) {
  const byDate = new Map();
  for (const transaction of transactions || []) {
    const date = String(transaction.date || "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    if (!byDate.has(date)) {
      byDate.set(date, { date, inflow: 0, spend: 0, net: 0, count: 0 });
    }
    const row = byDate.get(date);
    const inflow = Number(transaction.inflow || 0);
    const spend = Number(transaction.spend || 0);
    row.inflow += inflow;
    row.spend += spend;
    row.net += inflow - spend;
    row.count += 1;
  }

  const keys = [...byDate.keys()].sort();
  if (!keys.length) {
    return {
      startDate: "",
      endDate: "",
      current: null,
      days: [],
      minNet: 0,
      maxNet: 0
    };
  }

  const startDate = keys[0];
  const endDate = latestDate && /^\d{4}-\d{2}-\d{2}$/.test(latestDate) ? latestDate : keys[keys.length - 1];
  const days = dateRange(startDate, endDate).map((date) => {
    const row = byDate.get(date) || { date, inflow: 0, spend: 0, net: 0, count: 0 };
    return {
      date,
      year: Number(date.slice(0, 4)),
      inflow: Number(row.inflow.toFixed(2)),
      spend: Number(row.spend.toFixed(2)),
      net: Number(row.net.toFixed(2)),
      count: row.count
    };
  });
  const nets = days.map((item) => item.net);
  return {
    startDate,
    endDate,
    current: days[days.length - 1] || null,
    days,
    minNet: Math.min(0, ...nets),
    maxNet: Math.max(0, ...nets)
  };
}

function weeklyNetHistory(transactions, latestDate) {
  const byWeek = new Map();
  for (const transaction of transactions || []) {
    if (!transaction.date) continue;
    const week = weekStart(transaction.date);
    if (!week) continue;
    if (!byWeek.has(week)) {
      byWeek.set(week, { week, inflow: 0, spend: 0, net: 0, count: 0 });
    }
    const row = byWeek.get(week);
    const inflow = Number(transaction.inflow || 0);
    const spend = Number(transaction.spend || 0);
    row.inflow += inflow;
    row.spend += spend;
    row.net += inflow - spend;
    row.count += 1;
  }

  const keys = [...byWeek.keys()].sort();
  if (!keys.length) {
    return {
      startWeek: "",
      endWeek: "",
      current: null,
      weeks: [],
      minNet: 0,
      maxNet: 0,
      last12Average: 0
    };
  }

  const startWeek = keys[0];
  const endWeek = latestDate ? weekStart(latestDate) : keys[keys.length - 1];
  const weeks = weekRange(startWeek, endWeek).map((week) => {
    const row = byWeek.get(week) || { week, inflow: 0, spend: 0, net: 0, count: 0 };
    return {
      week,
      year: Number(week.slice(0, 4)),
      inflow: Number(row.inflow.toFixed(2)),
      spend: Number(row.spend.toFixed(2)),
      net: Number(row.net.toFixed(2)),
      count: row.count
    };
  });
  const nets = weeks.map((item) => item.net);
  const nonEmpty = weeks.filter((item) => item.count > 0);
  const last12 = nonEmpty.slice(-12);
  return {
    startWeek,
    endWeek,
    current: weeks[weeks.length - 1] || null,
    weeks,
    minNet: Math.min(0, ...nets),
    maxNet: Math.max(0, ...nets),
    last12Average: last12.length ? Number((sum(last12.map((item) => item.net)) / last12.length).toFixed(2)) : 0
  };
}

function addMonths(month, amount) {
  const date = new Date(`${month}-01T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + amount);
  return date.toISOString().slice(0, 7);
}

function monthRange(start, end) {
  const months = [];
  if (!/^\d{4}-\d{2}$/.test(start) || !/^\d{4}-\d{2}$/.test(end)) return months;
  let cursor = start;
  while (cursor && cursor <= end) {
    months.push(cursor);
    cursor = addMonths(cursor, 1);
  }
  return months;
}

function monthlyNetHistory(transactions, latestDate) {
  const byMonth = new Map();
  for (const transaction of transactions || []) {
    if (!transaction.date) continue;
    const month = String(transaction.date).slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(month)) continue;
    if (!byMonth.has(month)) {
      byMonth.set(month, { month, inflow: 0, spend: 0, net: 0, count: 0 });
    }
    const row = byMonth.get(month);
    const inflow = Number(transaction.inflow || 0);
    const spend = Number(transaction.spend || 0);
    row.inflow += inflow;
    row.spend += spend;
    row.net += inflow - spend;
    row.count += 1;
  }
  const keys = [...byMonth.keys()].sort();
  if (!keys.length) {
    return {
      startMonth: "",
      endMonth: "",
      current: null,
      months: [],
      minNet: 0,
      maxNet: 0,
      last6Average: 0
    };
  }
  const startMonth = keys[0];
  const endMonth = latestDate ? String(latestDate).slice(0, 7) : keys[keys.length - 1];
  const months = monthRange(startMonth, endMonth).map((month) => {
    const row = byMonth.get(month) || { month, inflow: 0, spend: 0, net: 0, count: 0 };
    return {
      month,
      inflow: Number(row.inflow.toFixed(2)),
      spend: Number(row.spend.toFixed(2)),
      net: Number(row.net.toFixed(2)),
      count: row.count
    };
  });
  const nets = months.map((item) => item.net);
  const nonEmpty = months.filter((item) => item.count > 0);
  const bestMonth = [...nonEmpty].sort((a, b) => b.net - a.net)[0] || null;
  const worstMonth = [...nonEmpty].sort((a, b) => a.net - b.net)[0] || null;
  const last6 = nonEmpty.slice(-6);
  return {
    startMonth,
    endMonth,
    current: months[months.length - 1] || null,
    months,
    minNet: Math.min(0, ...nets),
    maxNet: Math.max(0, ...nets),
    bestMonth,
    worstMonth,
    last6Average: last6.length ? Number((sum(last6.map((item) => item.net)) / last6.length).toFixed(2)) : 0
  };
}

function watchItems(input) {
  const { withFlow, last30, latestDate, balanceKnown, balance, cashFloor, bufferDays, spendChange, recurring, goal, accounts } = input;
  const items = [];
  if (accounts?.debtTotal > 0) {
    items.push({ label: "Connected balance", detail: `$${Math.round(accounts.debtTotal)} across credit/loan accounts`, severity: "danger" });
  }
  if (balanceKnown && balance < cashFloor) {
    items.push({ label: "Below cash buffer", detail: `${moneyText(balance)} current cash is below the planning buffer`, severity: "danger" });
  } else if (bufferDays !== null && bufferDays < 10) {
    items.push({ label: "Thin buffer", detail: `${bufferDays.toFixed(1)} days of cash cushion at current spend`, severity: "watch" });
  }
  if (spendChange !== null && spendChange > 18) {
    items.push({ label: "Spend up", detail: `${Math.round(spendChange)}% vs previous 30d`, severity: "watch" });
  }
  if (!accounts?.debtTotal && balanceKnown && goal.fullPurchaseGap > 0) {
    items.push({ label: "Whole purchase gap", detail: `${moneyText(goal.fullPurchaseGap)} below car price before tax, fees, insurance, and interest`, severity: "watch" });
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
  const rawBankAccounts = [...(store.bankAccounts || [])];
  const accountsByAccountId = new Map(rawBankAccounts
    .filter((account) => account.accountId)
    .map((account) => [account.accountId, account]));
  const transactions = dedupeAnalysisTransactions([...(store.transactions || [])]
    .filter((transaction) => transaction.date)
    .map((transaction) => enrichTransactionAccount(transaction, accountsByAccountId)))
    .sort((a, b) => dateMs(b.date) - dateMs(a.date));
  const mode = activeMode(settings, transactions);
  const latestDate = transactions[0]?.date || new Date().toISOString().slice(0, 10);
  const withFlow = transactions.map((transaction) => ({
    ...transaction,
    ...flowFor(transaction, mode),
    merchant: merchantName(transaction.description)
  }));
  const accounts = bankAccountTotals(dedupeBankAccounts(rawBankAccounts).sort((a, b) => {
    const left = `${a.type || ""}${a.name || ""}`;
    const right = `${b.type || ""}${b.name || ""}`;
    return left.localeCompare(right);
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
  const bankCashBalance = accounts.cashKnown ? accounts.cash : null;
  const balanceKnown = settings.currentBalance !== "" || bankCashBalance !== null || latestBalance !== null;
  const balance = settings.currentBalance !== "" ? manualBalance : bankCashBalance !== null ? bankCashBalance : latestBalance;
  const cashFloor = Number(settings.cashFloor || 0);
  const bufferDays = balanceKnown && avgDailySpend > 0 ? Math.max(0, (balance - cashFloor) / avgDailySpend) : null;
  const spendChange = spendPrev > 0 ? ((spend30 - spendPrev) / spendPrev) * 100 : null;
  const recurring = recurringCharges(withFlow);
  const categories = categoryTotals(last30);
  const monthlySavingsPace = Math.max(0, net30);
  const availableForDownPayment = balanceKnown ? Math.max(0, balance) : 0;
  const fullPurchaseGap = balanceKnown ? Math.max(0, A3_GOAL.priceAsBuilt - balance) : A3_GOAL.priceAsBuilt;
  const downPaymentGap = 0;
  const targetDate = settings.targetDate || "";
  const monthsToTarget = targetDate
    ? Math.max(1, Math.ceil((dateMs(targetDate) - Date.now()) / (86400000 * 30.4375)))
    : 12;
  const monthlySavingsNeeded = 0;
  const monthlyRoom = monthlySavingsPace - monthlySavingsNeeded;
  const goal = {
    a3: A3_GOAL,
    availableForDownPayment,
    downPaymentTarget: Number(settings.downPaymentTarget || 0),
    downPaymentGap,
    fullPurchaseGap,
    cashFloor,
    monthlySavingsPace,
    monthlySavingsNeeded,
    monthlyRoom,
    monthsToTarget,
    targetDate
  };
  const watch = watchItems({ withFlow, last30, latestDate, balanceKnown, balance, cashFloor, bufferDays, spendChange, recurring, goal, accounts });
  const readiness = readinessState({ balanceKnown, balance, cashFloor, bufferDays, spendChange, watch, goal, transactions, accounts });
  const action = oneAction({ readiness, watch, recurring, categories, goal, balanceKnown, accounts });
  const paymentStatus = creditPaymentStatus(withFlow, latestDate);
  const improvements = immediateImprovements({ accounts, goal, settings, withFlow, latestDate, paymentStatus });
  const review = overallReview({ accounts, goal, settings, improvements, paymentStatus });
  return {
    goal,
    accounts,
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
    paymentStatus,
    improvements,
    review,
    weeks: weeklySpend(withFlow, latestDate),
    dailyNet: dailyNetHistory(withFlow, latestDate),
    weeklyNet: weeklyNetHistory(withFlow, latestDate),
    monthlyNet: monthlyNetHistory(withFlow, latestDate),
    recurring,
    categories,
    watch,
    transactions: withFlow.slice(0, 80)
  };
}

function readinessState(input) {
  const { transactions, balanceKnown, balance, cashFloor, bufferDays, spendChange, watch, goal, accounts } = input;
  if (!transactions.length) return { label: "no data", reason: "Import CSV", color: "muted" };
  if (accounts?.debtTotal > 0) {
    return { label: "not ready", reason: "Connected balances block a responsible A3 buy", color: "danger" };
  }
  if ((balanceKnown && balance < cashFloor) || (bufferDays !== null && bufferDays < 5)) {
    return { label: "danger", reason: "Cash cushion pressure", color: "danger" };
  }
  if (goal.monthlyRoom >= 0) {
    return { label: "full-cost check", reason: "Payment, insurance, and cashflow still decide", color: "watch" };
  }
  if ((bufferDays !== null && bufferDays < 14) || (spendChange !== null && spendChange > 18) || watch.length >= 3 || goal.monthlyRoom < 0) {
    return { label: "watch", reason: "A3 pace needs control", color: "watch" };
  }
  return { label: "building", reason: "A3 path improving", color: "good" };
}

function oneAction(input) {
  const { readiness, watch, recurring, categories, goal, balanceKnown, accounts } = input;
  if (!balanceKnown) return { label: "Add balance", detail: "Full A3 decision needs current cash" };
  if (accounts?.debtTotal > 0) return { label: "Do not buy yet", detail: `$${Math.round(accounts.debtTotal).toLocaleString("en-US")} card/loan balance has to come down first` };
  if (readiness.label === "danger") return { label: "Protect cash", detail: "Pause flexible spend until next deposit" };
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
    ["full purchase gap", Math.round(previous.goal?.fullPurchaseGap || 0), Math.round(current.goal?.fullPurchaseGap || 0)]
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
    a3_effect: analysis.accounts?.debtTotal > 0
      ? `${moneyText(analysis.accounts.debtTotal)} card/loan balance still remains.`
      : "Buying still needs the payment, insurance, tax, fees, interest, and cashflow check.",
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
        "The goal is to judge whether the whole Audi A3 purchase is realistic without destabilizing cash flow.",
        "Do not claim to be a licensed financial advisor. Do not give investment, tax, insurance, or loan approval guarantees.",
        "Use the provided source-backed numbers only. If a required number is missing, say what is missing.",
        "Frame down-payment cash as immediate cash impact, not as a savings label.",
        "Frame the decision around full price, current cash, credit/loan balance, repeat spending, monthly payment, insurance, and cashflow.",
        "Return one calm action. Keep it concrete, low-stress, and measurable.",
        "Do not write paragraphs. status is 1-3 words. one_action is at most 12 words.",
        "Do not recommend a specific extra payment amount unless that exact amount is present in the source data or settings.",
        "Use credit/loan balance instead of debt in user-facing language."
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
      fullPurchaseGap: analysis.goal.fullPurchaseGap
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

function plaidAccountToStore(account, connection, now) {
  return {
    id: `plaid-${account.account_id}`,
    provider: "plaid",
    connectionId: connection.id,
    accountId: account.account_id,
    institutionName: connection.institutionName || "Bank",
    name: account.name || account.official_name || "Account",
    officialName: account.official_name || "",
    mask: account.mask || "",
    type: account.type || "",
    subtype: account.subtype || "",
    balanceAvailable: account.balances?.available ?? null,
    balanceCurrent: account.balances?.current ?? null,
    balanceLimit: account.balances?.limit ?? null,
    currency: account.balances?.iso_currency_code || account.balances?.unofficial_currency_code || "USD",
    updatedAt: now
  };
}

function upsertBankAccounts(store, accounts, connection, now) {
  const byId = new Map((store.bankAccounts || []).map((account) => [account.id, account]));
  for (const account of accounts || []) {
    byId.set(`plaid-${account.account_id}`, plaidAccountToStore(account, connection, now));
  }
  store.bankAccounts = [...byId.values()];
  connection.accountCount = (accounts || []).length || connection.accountCount || 0;
}

function plaidTransactionToApp(transaction, accountsById, connection) {
  const account = accountsById.get(transaction.account_id) || {};
  const accountType = String(account.type || "").toLowerCase();
  const plaidAmount = Number(transaction.amount || 0);
  const amount = accountType === "credit" ? plaidAmount : -plaidAmount;
  const category = transaction.personal_finance_category?.primary || transaction.category?.[0] || account.subtype || "Uncategorized";
  return {
    id: `plaid-${transaction.transaction_id}`,
    plaidTransactionId: transaction.transaction_id,
    plaidAccountId: transaction.account_id,
    plaidAccountName: account.name || "",
    plaidAccountType: account.type || "",
    plaidAccountSubtype: account.subtype || "",
    plaidAccountMask: account.mask || "",
    plaidInstitutionName: account.institutionName || connection.institutionName || "",
    plaidInstitutionId: account.institutionId || connection.institutionId || "",
    date: transaction.date || transaction.authorized_date || "",
    description: transaction.merchant_name || transaction.name || "Transaction",
    category: cleanCategory(category),
    type: transaction.pending ? "Pending" : account.subtype || account.type || "Bank",
    amount,
    balance: null,
    pending: Boolean(transaction.pending),
    source: `plaid:${connection.id}`
  };
}

function mergePlaidTransactions(store, connection, accountsById, added, modified, removed) {
  const removedIds = new Set((removed || []).map((item) => `plaid-${item.transaction_id}`));
  const incoming = [...(added || []), ...(modified || [])]
    .map((transaction) => plaidTransactionToApp(transaction, accountsById, connection))
    .filter((transaction) => transaction.date && transaction.plaidTransactionId);
  const current = (store.transactions || []).filter((transaction) => {
    if (removedIds.has(transaction.id)) return false;
    if (incoming.some((item) => item.id === transaction.id)) return false;
    if (transaction.source === "sample" && incoming.length) return false;
    return true;
  });
  store.transactions = dedupeTransactions([...current, ...incoming])
    .sort((a, b) => dateMs(b.date) - dateMs(a.date));
  return incoming.length;
}

async function refreshPlaidAccounts(store, connection, accessToken, now) {
  let response;
  try {
    response = await plaidPost("/accounts/balance/get", { access_token: accessToken });
  } catch {
    response = await plaidPost("/accounts/get", { access_token: accessToken });
  }
  upsertBankAccounts(store, response.accounts || [], connection, now);
  return response.accounts || [];
}

async function syncPlaidConnection(store, connection, reason = "manual") {
  const now = new Date().toISOString();
  const accessToken = revealToken(connection.accessToken);
  const accounts = await refreshPlaidAccounts(store, connection, accessToken, now);
  const accountsById = new Map((store.bankAccounts || [])
    .filter((account) => account.connectionId === connection.id)
    .map((account) => [account.accountId, account]));
  let cursor = connection.cursor || null;
  let hasMore = true;
  let pageCount = 0;
  const added = [];
  const modified = [];
  const removed = [];
  while (hasMore && pageCount < 25) {
    const response = await plaidPost("/transactions/sync", {
      access_token: accessToken,
      cursor,
      count: 500
    });
    added.push(...(response.added || []));
    modified.push(...(response.modified || []));
    removed.push(...(response.removed || []));
    if (response.accounts?.length) upsertBankAccounts(store, response.accounts, connection, now);
    cursor = response.next_cursor || cursor;
    hasMore = Boolean(response.has_more);
    pageCount += 1;
  }
  const imported = mergePlaidTransactions(store, connection, accountsById, added, modified, removed);
  connection.cursor = cursor;
  connection.updatedAt = now;
  connection.lastSyncAt = now;
  connection.lastError = "";
  const sync = {
    id: crypto.randomUUID(),
    provider: "plaid",
    connectionId: connection.id,
    reason,
    createdAt: now,
    accounts: accounts.length,
    added: added.length,
    modified: modified.length,
    removed: removed.length,
    imported
  };
  store.bankSyncs = [...(store.bankSyncs || []), sync];
  store.imports = [...(store.imports || []), {
    id: crypto.randomUUID(),
    name: connection.institutionName || "Plaid",
    importedAt: now,
    transactionCount: imported,
    source: "plaid",
    append: true
  }];
  store.events = [...(store.events || []), {
    id: crypto.randomUUID(),
    createdAt: now,
    type: "bank_sync",
    label: connection.institutionName || "Bank synced",
    detail: `${imported} transactions / ${accounts.length} accounts`
  }];
  return sync;
}

async function syncAllPlaidConnections(store, reason = "manual") {
  const syncs = [];
  for (const connection of store.bankConnections || []) {
    try {
      syncs.push(await syncPlaidConnection(store, connection, reason));
    } catch (error) {
      const now = new Date().toISOString();
      connection.lastError = error.message;
      connection.updatedAt = now;
      const sync = {
        id: crypto.randomUUID(),
        provider: "plaid",
        connectionId: connection.id,
        reason,
        createdAt: now,
        error: error.message
      };
      store.bankSyncs = [...(store.bankSyncs || []), sync];
      store.events = [...(store.events || []), {
        id: crypto.randomUUID(),
        createdAt: now,
        type: "bank_sync_error",
        label: connection.institutionName || "Bank sync blocked",
        detail: error.message
      }];
      syncs.push(sync);
    }
  }
  return syncs;
}

async function monitorTick(reason = "interval") {
  const store = await readStore();
  if ((store.bankConnections || []).length && reason !== "import") {
    await syncAllPlaidConnections(store, reason);
  }
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
    detail: `${analysis.readiness.label} / full purchase gap $${Math.round(analysis.goal.fullPurchaseGap)}`
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
    const analysis = analyze(store);
    const plaid = plaidStatus(store);
    const autoUpdate = autoUpdateStatus(store);
    sendJson(res, 200, {
      ok: true,
      app: "a3.aolabs.io",
      storage: dataDir,
      accessLocked: Boolean(accessCode),
      openaiConfigured: Boolean(openAiApiKey),
      model: openAiModel,
      plaidConfigured: plaidConfigured(),
      plaidConnected: plaid.connected,
      accounts: plaid.accountCount,
      transactions: analysis.totals.transactionCount,
      autoUpdate,
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
    const analysis = analyze(store);
    sendJson(res, 200, {
      ok: true,
      goal: A3_GOAL,
      openaiConfigured: Boolean(openAiApiKey),
      model: openAiModel,
      plaid: plaidStatus(store),
      autoUpdate: autoUpdateStatus(store),
      analysis,
      spendingLocks: spendingLockStatuses(store, analysis),
      imports: store.imports.slice(-10).reverse(),
      snapshots: store.snapshots.slice(-12).reverse().map((snapshot) => ({
        id: snapshot.id,
        createdAt: snapshot.createdAt,
        reason: snapshot.reason,
        changes: snapshot.changes,
        readiness: snapshot.analysis?.readiness?.label,
        fullPurchaseGap: snapshot.analysis?.goal?.fullPurchaseGap
      })),
      advisorRuns: store.advisorRuns.slice(-8).reverse(),
      messages: store.messages.slice(-20),
      events: store.events.slice(-40).reverse()
    });
    return true;
  }

  if (requestUrl.pathname === "/api/spending-locks" && req.method === "POST") {
    const payload = await readJsonBody(req, 32 * 1024);
    const label = normalizeSpendLockLabel(payload.label).slice(0, 80);
    if (!label) {
      sendJson(res, 400, { ok: false, error: "label is required" });
      return true;
    }
    const days = Math.min(30, Math.max(1, Math.round(Number(payload.days || 7))));
    const now = new Date().toISOString();
    const startDate = easternDateKey();
    const store = await readStore();
    const analysis = analyze(store);
    const currentSpend = (analysis.improvements?.spending || []).find((item) => normalizeSpendLockLabel(item.label) === label) || {};
    const nextLock = {
      id: crypto.randomUUID(),
      label,
      key: label,
      createdAt: now,
      updatedAt: now,
      startDate,
      expiresOn: addDaysKey(startDate, days),
      days,
      next: String(payload.next || currentSpend.next || spendAlternative(label, currentSpend.category)).slice(0, 240),
      impactLabel: String(payload.impactLabel || currentSpend.impactLabel || "").slice(0, 80)
    };
    store.spendingLocks = [
      ...(store.spendingLocks || []).filter((lock) => (lock.key || normalizeSpendLockLabel(lock.label)) !== label),
      nextLock
    ];
    store.events = [...(store.events || []), {
      id: crypto.randomUUID(),
      createdAt: now,
      type: "spending_lock",
      label,
      detail: `${days} days / ${nextLock.impactLabel || "spend freeze"}`
    }];
    await writeStore(store);
    const nextStore = await readStore();
    const nextAnalysis = analyze(nextStore);
    sendJson(res, 200, {
      ok: true,
      lock: nextLock,
      spendingLocks: spendingLockStatuses(nextStore, nextAnalysis),
      analysis: nextAnalysis
    });
    return true;
  }

  if (requestUrl.pathname === "/api/plaid/status" && req.method === "GET") {
    const store = await readStore();
    sendJson(res, 200, { ok: true, plaid: plaidStatus(store) });
    return true;
  }

  if (requestUrl.pathname === "/api/plaid/link-token" && req.method === "POST") {
    if (!plaidConfigured()) {
      sendJson(res, 503, { ok: false, error: "Plaid is not configured" });
      return true;
    }
    const payload = await readJsonBody(req, 32 * 1024).catch(() => ({}));
    const request = {
      client_name: "a3.aolabs.io",
      country_codes: plaidCountryCodes,
      language: "en",
      user: { client_user_id: plaidClientUserId }
    };
    const connection = (store => (store.bankConnections || []).find((item) => item.id === payload.connectionId))(await readStore());
    if (connection) {
      request.access_token = revealToken(connection.accessToken);
    } else {
      request.products = plaidProducts;
      if (plaidProducts.includes("transactions")) request.transactions = { days_requested: plaidDaysRequested };
    }
    if (plaidRedirectUri) request.redirect_uri = plaidRedirectUri;
    if (plaidWebhookUrl) request.webhook = plaidWebhookUrl;
    try {
      const data = await plaidPost("/link/token/create", request);
      sendJson(res, 200, { ok: true, link_token: data.link_token, expiration: data.expiration });
    } catch (error) {
      const message = String(error.message || "");
      if (/invalid client_id or secret/i.test(message)) {
        if (plaidProductionReviewPending) {
          sendJson(res, 503, { ok: false, error: "Plaid production review pending", code: "PLAID_PRODUCTION_REVIEW_PENDING" });
        } else {
          sendJson(res, 503, { ok: false, error: "Production Plaid key needed", code: "PLAID_PRODUCTION_KEY_NEEDED" });
        }
      } else if (/redirect_uri|redirect uri|OAuth redirect/i.test(message)) {
        sendJson(res, 503, { ok: false, error: "Plaid redirect URI needed", code: "PLAID_REDIRECT_URI_NEEDED" });
      } else {
        throw error;
      }
    }
    return true;
  }

  if (requestUrl.pathname === "/api/plaid/exchange-public-token" && req.method === "POST") {
    if (!plaidConfigured()) {
      sendJson(res, 503, { ok: false, error: "Plaid is not configured" });
      return true;
    }
    const payload = await readJsonBody(req, 256 * 1024);
    const publicToken = String(payload.public_token || payload.publicToken || "").trim();
    if (!publicToken) {
      sendJson(res, 400, { ok: false, error: "public_token is required" });
      return true;
    }
    const exchanged = await plaidPost("/item/public_token/exchange", { public_token: publicToken });
    const metadata = payload.metadata || {};
    const now = new Date().toISOString();
    const store = await readStore();
    const existing = (store.bankConnections || []).find((item) => item.itemId === exchanged.item_id);
    const connection = existing || {
      id: crypto.randomUUID(),
      provider: "plaid",
      createdAt: now,
      cursor: null
    };
    connection.itemId = exchanged.item_id;
    connection.institutionName = metadata.institution?.name || connection.institutionName || "Bank";
    connection.institutionId = metadata.institution?.institution_id || connection.institutionId || "";
    connection.accessToken = protectToken(exchanged.access_token);
    connection.updatedAt = now;
    connection.lastError = "";
    if (!existing) store.bankConnections = [...(store.bankConnections || []), connection];
    store.events = [...(store.events || []), {
      id: crypto.randomUUID(),
      createdAt: now,
      type: "bank_connected",
      label: connection.institutionName,
      detail: "Bank connection added"
    }];
    let syncError = "";
    try {
      await syncPlaidConnection(store, connection, "connect");
    } catch (error) {
      syncError = error.message;
      connection.lastError = syncError;
      store.bankSyncs = [...(store.bankSyncs || []), {
        id: crypto.randomUUID(),
        provider: "plaid",
        connectionId: connection.id,
        reason: "connect",
        createdAt: new Date().toISOString(),
        error: syncError
      }];
    }
    await writeStore(store);
    sendJson(res, 200, { ok: true, syncError, plaid: plaidStatus(store), analysis: analyze(store) });
    return true;
  }

  if (requestUrl.pathname === "/api/plaid/sync" && req.method === "POST") {
    const store = await readStore();
    if (!(store.bankConnections || []).length) {
      sendJson(res, 409, { ok: false, error: "No bank connection" });
      return true;
    }
    const syncs = await syncAllPlaidConnections(store, "manual");
    const analysis = analyze(store);
    const previous = store.snapshots?.[store.snapshots.length - 1]?.analysis || null;
    const changes = changeSummary(previous, analysis);
    store.snapshots = [...(store.snapshots || []), {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      reason: "bank_sync",
      changes,
      analysis
    }];
    await writeStore(store);
    const next = await readStore();
    sendJson(res, 200, { ok: true, syncs, plaid: plaidStatus(next), analysis: analyze(next) });
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
