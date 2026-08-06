import { useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  Plus, Trash2, TrendingUp, TrendingDown, Target, Wallet,
  ArrowLeftRight, Search, Filter, PiggyBank, Calendar,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useTable } from "@/hooks/use-store";
import { upsert, remove, uid, today as todayHelper, type Row } from "@/lib/store";
import { PageHeader } from "@/components/app-shell";
import {
  Button, Card, Field, Input, Modal, ProgressRing,
  SegmentedControl, Select, Textarea, EmptyState,
} from "@/components/ui/primitives";
import { FINANCE_CATEGORIES, formatIDR, formatCompact, currentMonth, niceDate, last7Days } from "@/lib/domain";
import { cn } from "@/lib/utils";

type Tab = "overview" | "budgets" | "savings";
type Period = "day" | "week" | "month" | "year" | "all";

const PIE_COLORS = [
  "bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500",
  "bg-violet-500", "bg-cyan-500", "bg-pink-500", "bg-teal-500",
];
const PIE_COLORS_HEX = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#a855f7", "#06b6d4", "#ec4899", "#14b8a6"];

function catLabel(key: string, lang: "id" | "en") {
  const c = FINANCE_CATEGORIES.find((x) => x.key === key || x.id === key || x.en === key);
  return c ? (lang === "id" ? c.id : c.en) : key;
}

function inRange(d: string, period: Period, today: string): boolean {
  if (period === "all") return true;
  if (period === "day") return d === today;
  if (period === "week") return last7Days().includes(d);
  if (period === "month") return d.startsWith(today.slice(0, 7));
  if (period === "year") return d.startsWith(today.slice(0, 4));
  return true;
}

export default function Finance() {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>("overview");
  return (
    <div>
      <PageHeader title={t("finance.title")} subtitle={t("finance.subtitle")} />
      <div className="mb-6 overflow-x-auto no-scrollbar">
        <SegmentedControl
          value={tab}
          onChange={setTab}
          options={[
            { value: "overview", label: t("finance.tab.overview") },
            { value: "budgets", label: t("finance.tab.budgets") },
            { value: "savings", label: t("finance.tab.savings") },
          ]}
        />
      </div>
      {tab === "overview" && <OverviewPanel />}
      {tab === "budgets" && <BudgetsPanel />}
      {tab === "savings" && <SavingsPanel />}
    </div>
  );
}

/* ================================ OVERVIEW ================================ */
function OverviewPanel() {
  const { t, lang } = useI18n();
  const txs = useTable<Row>("transactions", (r) =>
    [...r].sort((a, b) => (String(a.date) < String(b.date) ? 1 : -1)),
  );
  const budgets = useTable<Row>("budgets");
  const [open, setOpen] = useState(false);
  const [period, setPeriod] = useState<Period>("month");
  const [catFilter, setCatFilter] = useState("Semua");
  const [search, setSearch] = useState("");
  const today = todayHelper();

  const allBalance = txs.reduce((s, x) => s + (x.type === "income" ? 1 : -1) * Number(x.amount ?? 0), 0);

  const filtered = useMemo(() => txs.filter((x) =>
    inRange(String(x.date), period, today) &&
    (catFilter === "Semua" || x.category === catFilter) &&
    (!search || String(x.note || "").toLowerCase().includes(search.toLowerCase()) || String(x.category).toLowerCase().includes(search.toLowerCase()))
  ), [txs, period, catFilter, search, today]);

  const income = filtered.filter((x) => x.type === "income").reduce((s, x) => s + Number(x.amount ?? 0), 0);
  const expense = filtered.filter((x) => x.type === "expense").reduce((s, x) => s + Number(x.amount ?? 0), 0);
  const cashflow = income - expense;

  // Pie data: expense by category
  const pieData = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.filter((x) => x.type === "expense").forEach((x) => {
      map[String(x.category)] = (map[String(x.category)] || 0) + Number(x.amount ?? 0);
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filtered]);

  // Bar data: income vs expense by day (last 7 days) or month (last 6 months)
  const barData = useMemo(() => {
    if (period === "year" || period === "all") {
      const arr: { label: string; inc: number; exp: number }[] = [];
      for (let m = 5; m >= 0; m--) {
        const d = new Date();
        d.setMonth(d.getMonth() - m);
        const prefix = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const inc = txs.filter((x) => String(x.date).startsWith(prefix) && x.type === "income").reduce((s, x) => s + Number(x.amount ?? 0), 0);
        const exp = txs.filter((x) => String(x.date).startsWith(prefix) && x.type === "expense").reduce((s, x) => s + Number(x.amount ?? 0), 0);
        arr.push({ label: d.toLocaleDateString("id-ID", { month: "short" }), inc, exp });
      }
      return arr;
    }
    return last7Days().map((d) => {
      const inc = txs.filter((x) => String(x.date) === d && x.type === "income").reduce((s, x) => s + Number(x.amount ?? 0), 0);
      const exp = txs.filter((x) => String(x.date) === d && x.type === "expense").reduce((s, x) => s + Number(x.amount ?? 0), 0);
      return {
        label: new Date(d + "T00:00:00").toLocaleDateString("id-ID", { weekday: "short" }),
        inc, exp,
      };
    });
  }, [txs, period]);

  const barMax = Math.max(1, ...barData.map((d) => Math.max(d.inc, d.exp)));
  const allCats = ["Semua", ...FINANCE_CATEGORIES.map((c) => c.key)];
  const periods: { id: Period; label: string }[] = [
    { id: "day", label: "Hari" }, { id: "week", label: "Minggu" },
    { id: "month", label: "Bulan" }, { id: "year", label: "Tahun" }, { id: "all", label: "Semua" },
  ];

  return (
    <div className="space-y-4">
      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={<Wallet className="h-4 w-4" />} label="Total Saldo" value={formatIDR(allBalance)} accent="text-blue-500" />
        <StatCard icon={<TrendingUp className="h-4 w-4" />} label="Pemasukan" value={formatIDR(income)} accent="text-emerald-500" />
        <StatCard icon={<TrendingDown className="h-4 w-4" />} label="Pengeluaran" value={formatIDR(expense)} accent="text-rose-500" />
        <StatCard icon={<ArrowLeftRight className="h-4 w-4" />} label="Cashflow" value={formatIDR(cashflow)} accent={cashflow >= 0 ? "text-cyan-500" : "text-amber-500"} />
      </div>

      {/* Filters */}
      <Card className="p-3 flex flex-wrap items-center gap-2">
        <div className="flex gap-1 bg-muted rounded-xl p-1">
          {periods.map((p) => (
            <button key={p.id} onClick={() => setPeriod(p.id)} className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold transition", period === p.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 bg-muted rounded-xl px-3">
          <Filter size={14} className="text-muted-foreground" />
          <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className="bg-transparent text-sm py-2 outline-none">
            {allCats.map((c) => <option key={c} value={c}>{c === "Semua" ? "Semua" : catLabel(c, lang)}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2 bg-muted rounded-xl px-3 flex-1 min-w-[160px]">
          <Search size={14} className="text-muted-foreground" />
          <input placeholder="Cari transaksi…" value={search} onChange={(e) => setSearch(e.target.value)} className="bg-transparent text-sm py-2 outline-none flex-1" />
        </div>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Pie: Expense by Category */}
        <Card className="p-5">
          <h3 className="font-display font-bold text-sm mb-3">Pengeluaran per Kategori</h3>
          {pieData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Belum ada data</p>
          ) : (
            <div className="space-y-2">
              {pieData.map((p, i) => {
                const pct = expense ? (p.value / expense) * 100 : 0;
                return (
                  <div key={p.name}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="flex items-center gap-1.5">
                        <span className={cn("h-2.5 w-2.5 rounded-full", PIE_COLORS[i % PIE_COLORS.length])} />
                        {catLabel(p.name, lang)}
                      </span>
                      <span className="font-medium">{formatIDR(p.value)}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, delay: i * 0.05 }}
                        className={cn("h-full rounded-full", PIE_COLORS[i % PIE_COLORS.length])}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Bar: Income vs Expense */}
        <Card className="p-5">
          <h3 className="font-display font-bold text-sm mb-3">Perbandingan In/Out</h3>
          <div className="flex items-end gap-1 h-40">
            {barData.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex items-end gap-px h-32">
                  <div className="flex-1 flex items-end">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${barMax > 0 ? (d.inc / barMax) * 100 : 0}%` }}
                      transition={{ duration: 0.4, delay: i * 0.03 }}
                      className="w-full rounded-t-sm bg-emerald-500"
                    />
                  </div>
                  <div className="flex-1 flex items-end">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${barMax > 0 ? (d.exp / barMax) * 100 : 0}%` }}
                      transition={{ duration: 0.4, delay: i * 0.03 + 0.1 }}
                      className="w-full rounded-t-sm bg-rose-500"
                    />
                  </div>
                </div>
                <span className="text-[9px] text-muted-foreground">{d.label}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center gap-4 mt-3 pt-2 border-t border-border/40">
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <span className="h-2 w-2 rounded-sm bg-emerald-500" /> Masuk
            </span>
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <span className="h-2 w-2 rounded-sm bg-rose-500" /> Keluar
            </span>
          </div>
        </Card>

        {/* Line: Cashflow trend */}
        <Card className="p-5">
          <h3 className="font-display font-bold text-sm mb-3">Tren Cashflow</h3>
          <div className="relative h-40">
            <svg viewBox="0 0 200 80" className="w-full h-full" preserveAspectRatio="none">
              {/* Grid lines */}
              {[0, 20, 40, 60, 80].map((y) => (
                <line key={y} x1="0" y1={y} x2="200" y2={y} stroke="currentColor" className="text-border/40" strokeWidth="0.5" />
              ))}
              {/* Income line */}
              <polyline
                fill="none"
                stroke="#22c55e"
                strokeWidth="2"
                points={barData.map((d, i) => {
                  const x = (i / Math.max(1, barData.length - 1)) * 200;
                  const maxVal = Math.max(1, ...barData.map((dd) => Math.max(dd.inc, dd.exp)));
                  const y = 80 - (d.inc / maxVal) * 70;
                  return `${x},${y}`;
                }).join(" ")}
              />
              {/* Expense line */}
              <polyline
                fill="none"
                stroke="#ef4444"
                strokeWidth="2"
                points={barData.map((d, i) => {
                  const x = (i / Math.max(1, barData.length - 1)) * 200;
                  const maxVal = Math.max(1, ...barData.map((dd) => Math.max(dd.inc, dd.exp)));
                  const y = 80 - (d.exp / maxVal) * 70;
                  return `${x},${y}`;
                }).join(" ")}
              />
            </svg>
          </div>
          <div className="flex items-center justify-center gap-4 mt-2 pt-2 border-t border-border/40">
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <span className="h-2 w-2 rounded-sm bg-emerald-500" /> Masuk
            </span>
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <span className="h-2 w-2 rounded-sm bg-rose-500" /> Keluar
            </span>
          </div>
        </Card>
      </div>

      {/* Transaction List */}
      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display font-bold text-sm">Transaksi Terakhir <span className="text-muted-foreground font-normal text-xs">({filtered.length})</span></h3>
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> {t("finance.addTx")}
          </Button>
        </div>
        {filtered.length === 0 ? (
          <EmptyState icon={<Wallet className="h-8 w-8" />} title={t("finance.empty")} description={t("empty.finance.desc")} />
        ) : (
          <div className="space-y-1">
            {filtered.slice(0, 30).map((x) => (
              <div key={String(x.id)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/40 transition group">
                <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", x.type === "income" ? "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/12 text-rose-500")}>
                  {x.type === "income" ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{catLabel(String(x.category), lang)}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {niceDate(String(x.date), lang)}{x.note ? ` · ${String(x.note)}` : ""}
                  </p>
                </div>
                <span className={cn("text-sm font-semibold tabular-nums", x.type === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-foreground")}>
                  {x.type === "income" ? "+" : "−"}{formatIDR(Number(x.amount ?? 0))}
                </span>
                <button onClick={() => void remove("transactions", String(x.id))} className="text-muted-foreground/40 hover:text-destructive opacity-0 group-hover:opacity-100 transition">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <AddTxModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

/* ── Stat Card ── */
function StatCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="p-4">
        <p className={cn("inline-flex items-center gap-1.5 text-xs text-muted-foreground", accent)}>{icon} {label}</p>
        <p className={cn("mt-1.5 font-display text-lg font-bold tabular-nums", accent)}>{value}</p>
      </Card>
    </motion.div>
  );
}

/* ── Add Transaction Modal ── */
function AddTxModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, lang } = useI18n();
  const [type, setType] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("food");
  const [date, setDate] = useState(todayHelper());
  const [note, setNote] = useState("");

  async function save() {
    const n = Number(amount);
    if (!n) return;
    await upsert("transactions", { id: uid(), type, amount: n, category, date, note: note || null });
    setAmount(""); setNote(""); onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={t("finance.addTx")}>
      <div className="space-y-4">
        <SegmentedControl className="w-full" value={type} onChange={setType} options={[
          { value: "expense", label: t("finance.expense") },
          { value: "income", label: t("finance.income") },
        ]} />
        <Field label={t("finance.tx.amount")}>
          <Input type="number" min="0" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("finance.tx.category")}>
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              {FINANCE_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{lang === "id" ? c.id : c.en}</option>)}
            </Select>
          </Field>
          <Field label={t("finance.tx.date")}>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>
        <Field label={t("finance.tx.note")}>
          <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <Button className="w-full" onClick={save} disabled={!Number(amount)}>{t("common.save")}</Button>
      </div>
    </Modal>
  );
}

/* ================================ BUDGETS ================================ */
function BudgetsPanel() {
  const { t, lang } = useI18n();
  const budgets = useTable<Row>("budgets");
  const txs = useTable<Row>("transactions");
  const [open, setOpen] = useState(false);
  const month = currentMonth();

  const spentByCat = useMemo(() => {
    const m = new Map<string, number>();
    for (const x of txs) {
      if (x.type !== "expense" || !String(x.date).startsWith(month)) continue;
      m.set(String(x.category), (m.get(String(x.category)) ?? 0) + Number(x.amount ?? 0));
    }
    return m;
  }, [txs, month]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PiggyBank className="h-4 w-4 text-amber-500" />
          <span className="font-display font-bold text-sm">Budget Bulanan</span>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> {t("finance.budget.add")}
        </Button>
      </div>
      {budgets.length === 0 ? (
        <EmptyState icon={<Target className="h-8 w-8" />} title={t("finance.budget.empty")} description={t("empty.budget.desc")} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {budgets.map((b) => {
            const spent = spentByCat.get(String(b.category)) ?? 0;
            const limit = Number(b.monthlyLimit ?? 0);
            const pct = limit ? Math.min(1, spent / limit) : 0;
            const over = spent > limit;
            return (
              <Card key={String(b.id)} className="p-4 group">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-sm">{catLabel(String(b.category), lang)}</p>
                  <button onClick={() => void remove("budgets", String(b.id))} className="text-muted-foreground/40 hover:text-destructive opacity-0 group-hover:opacity-100 transition">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex items-baseline justify-between text-xs mb-2">
                  <span className={cn("font-semibold", over && "text-destructive")}>{formatIDR(spent)}</span>
                  <span className="text-muted-foreground">dari {formatIDR(limit)}</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                  <div className={cn("h-full rounded-full transition-all", over ? "bg-destructive" : pct > 0.8 ? "bg-amber-500" : "bg-primary")} style={{ width: `${pct * 100}%` }} />
                </div>
                {over && <p className="text-[10px] text-destructive mt-1.5 font-medium">⚠ Melebihi budget</p>}
              </Card>
            );
          })}
        </div>
      )}
      <AddBudgetModal open={open} onClose={() => setOpen(false)} existing={budgets.map((b) => String(b.category))} />
    </div>
  );
}

function AddBudgetModal({ open, onClose, existing }: { open: boolean; onClose: () => void; existing: string[] }) {
  const { t, lang } = useI18n();
  const avail = FINANCE_CATEGORIES.filter((c) => c.key !== "salary" && !existing.includes(c.key));
  const [category, setCategory] = useState(avail[0]?.key ?? "food");
  const [limit, setLimit] = useState("");

  async function save() {
    const n = Number(limit);
    if (!n) return;
    await upsert("budgets", { id: uid(), category, monthlyLimit: n });
    setLimit(""); onClose();
  }
  return (
    <Modal open={open} onClose={onClose} title={t("finance.budget.add")}>
      <div className="space-y-4">
        <Field label={t("finance.budget.category")}>
          <Select value={category} onChange={(e) => setCategory(e.target.value)}>
            {avail.map((c) => <option key={c.key} value={c.key}>{lang === "id" ? c.id : c.en}</option>)}
          </Select>
        </Field>
        <Field label={t("finance.budget.limit")}>
          <Input type="number" min="0" value={limit} onChange={(e) => setLimit(e.target.value)} placeholder="0" />
        </Field>
        <Button className="w-full" onClick={save} disabled={!Number(limit)}>{t("common.save")}</Button>
      </div>
    </Modal>
  );
}

/* ================================ SAVINGS ================================ */
function SavingsPanel() {
  const { t, lang } = useI18n();
  const goals = useTable<Row>("savingsGoals");
  const [open, setOpen] = useState(false);
  const [fundFor, setFundFor] = useState<Row | null>(null);
  const [fund, setFund] = useState("");

  async function addFunds() {
    if (!fundFor) return;
    const n = Number(fund);
    if (!n) return;
    await upsert("savingsGoals", { id: String(fundFor.id), currentAmount: Number(fundFor.currentAmount ?? 0) + n });
    setFund(""); setFundFor(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> {t("finance.savings.add")}
        </Button>
      </div>
      {goals.length === 0 ? (
        <EmptyState icon={<Target className="h-8 w-8" />} title={t("finance.savings.empty")} description={t("empty.savings.desc")} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {goals.map((g) => {
            const cur = Number(g.currentAmount ?? 0);
            const tgt = Number(g.targetAmount ?? 0);
            const pct = tgt ? Math.min(1, cur / tgt) : 0;
            return (
              <Card key={String(g.id)} className="p-5">
                <div className="flex items-center gap-4">
                  <ProgressRing value={pct} size={72} stroke={7}>
                    <span className="text-xs font-semibold">{Math.round(pct * 100)}%</span>
                  </ProgressRing>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate font-medium">{String(g.name)}</p>
                      <button onClick={() => void remove("savingsGoals", String(g.id))} className="text-muted-foreground/40 hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="mt-0.5 text-sm">
                      <span className="font-semibold text-primary">{formatIDR(cur)}</span>
                      <span className="text-muted-foreground"> / {formatIDR(tgt)}</span>
                    </p>
                    {g.deadline && <p className="text-xs text-muted-foreground">{t("finance.savings.deadline")}: {niceDate(String(g.deadline), lang)}</p>}
                  </div>
                </div>
                <Button size="sm" variant="soft" className="mt-4 w-full" onClick={() => setFundFor(g)}>
                  <Plus className="h-4 w-4" /> {t("finance.savings.addFunds")}
                </Button>
              </Card>
            );
          })}
        </div>
      )}
      <AddGoalModal open={open} onClose={() => setOpen(false)} />
      <Modal open={!!fundFor} onClose={() => setFundFor(null)} title={t("finance.savings.addFunds")}>
        <div className="space-y-4">
          <Field label={String(fundFor?.name ?? "")}>
            <Input type="number" min="0" value={fund} onChange={(e) => setFund(e.target.value)} placeholder="0" />
          </Field>
          <Button className="w-full" onClick={addFunds} disabled={!Number(fund)}>{t("common.save")}</Button>
        </div>
      </Modal>
    </div>
  );
}

function AddGoalModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [deadline, setDeadline] = useState("");

  async function save() {
    if (!name.trim() || !Number(target)) return;
    await upsert("savingsGoals", { id: uid(), name: name.trim(), targetAmount: Number(target), currentAmount: 0, deadline: deadline || null });
    setName(""); setTarget(""); setDeadline(""); onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={t("finance.savings.add")}>
      <div className="space-y-4">
        <Field label={t("finance.savings.name")}>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("finance.savings.namePlaceholder")} />
        </Field>
        <Field label={t("finance.savings.target")}>
          <Input type="number" min="0" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="0" />
        </Field>
        <Field label={`${t("finance.savings.deadline")} (${t("common.optional")})`}>
          <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        </Field>
        <Button className="w-full" onClick={save} disabled={!name.trim() || !Number(target)}>{t("common.save")}</Button>
      </div>
    </Modal>
  );
}
