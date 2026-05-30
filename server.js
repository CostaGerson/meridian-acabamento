// Meridian Acabamento - servidor unico (app + API)
// Persistencia simples em arquivo JSON. Sem banco externo, sem dependencia nativa.
const express = require("express");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 8080;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "data.json");
const SEED_FILE = path.join(__dirname, "seed.json");

// ---------- carga / persistencia ----------
function ensureData() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    const seed = JSON.parse(fs.readFileSync(SEED_FILE, "utf8"));
    fs.writeFileSync(DATA_FILE, JSON.stringify(seed, null, 2));
    console.log("data.json criado a partir do seed.");
  }
}
function readData() {
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
}
// fila simples pra evitar escrita concorrente
let writing = Promise.resolve();
function writeData(mutator) {
  writing = writing.then(() => {
    const d = readData();
    const res = mutator(d);
    fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2));
    return res;
  });
  return writing;
}

ensureData();

const app = express();
app.use(express.json({ limit: "2mb" }));

// ---------- auth por senha (header x-pin) ----------
function requirePin(req, res, next) {
  const pin = req.get("x-pin");
  const d = readData();
  if (pin && pin === d.pin) return next();
  return res.status(401).json({ error: "senha invalida" });
}

// ---------- rotas publicas (chao de fabrica) ----------
// lista de produtos: necessaria pro formulario de registro
app.get("/api/products", (req, res) => {
  res.json(readData().products);
});
// adicionar registro de producao: aberto
app.post("/api/records", async (req, res) => {
  const r = req.body || {};
  if (!r.cliente || !r.produto || !r.inicio || !r.fim || !(Number(r.quantidade) > 0)) {
    return res.status(400).json({ error: "dados incompletos" });
  }
  const rec = {
    id: "r" + Date.now(),
    data: r.data || new Date().toISOString().slice(0, 10),
    cliente: String(r.cliente), produto: String(r.produto),
    inicio: String(r.inicio), fim: String(r.fim),
    pausa: Number(r.pausa) || 0, quantidade: Number(r.quantidade),
    totalPessoas: Number(r.totalPessoas) || 0, etapas: Number(r.etapas) || 0,
    obs: String(r.obs || ""),
  };
  await writeData((d) => d.records.unshift(rec));
  res.json(rec);
});
// verificar senha
app.post("/api/verify-pin", (req, res) => {
  const ok = (req.body && req.body.pin) === readData().pin;
  res.json({ ok });
});

// ---------- rotas protegidas (gestor) ----------
app.get("/api/records", requirePin, (req, res) => {
  res.json(readData().records);
});
app.put("/api/records/:id", requirePin, async (req, res) => {
  const id = req.params.id; const u = req.body || {};
  let found = false;
  await writeData((d) => {
    d.records = d.records.map((x) => {
      if (x.id !== id) return x;
      found = true;
      return { ...x, ...u, id,
        pausa: Number(u.pausa) || 0, quantidade: Number(u.quantidade) || x.quantidade,
        totalPessoas: Number(u.totalPessoas) || 0, etapas: Number(u.etapas) || 0 };
    });
  });
  if (!found) return res.status(404).json({ error: "nao encontrado" });
  res.json({ ok: true });
});
app.delete("/api/records/:id", requirePin, async (req, res) => {
  await writeData((d) => { d.records = d.records.filter((x) => x.id !== req.params.id); });
  res.json({ ok: true });
});
app.put("/api/products", requirePin, async (req, res) => {
  const list = Array.isArray(req.body) ? req.body : [];
  await writeData((d) => { d.products = list; });
  res.json({ ok: true });
});
app.post("/api/change-pin", requirePin, async (req, res) => {
  const np = (req.body && req.body.pin || "").trim();
  if (!np) return res.status(400).json({ error: "senha vazia" });
  await writeData((d) => { d.pin = np; });
  res.json({ ok: true });
});

// ---------- frontend ----------
app.use(express.static(path.join(__dirname, "public"), {
  index: false,
  setHeaders: (res, p) => { if (p.endsWith(".html")) res.setHeader("Cache-Control", "no-store"); }
}));
app.get("*", (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => console.log("Meridian Acabamento rodando na porta " + PORT));
