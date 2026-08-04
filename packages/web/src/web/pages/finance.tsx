import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Plus, Trash2, TrendingUp, TrendingDown, Target, Wallet } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useTable } from "@/hooks/use-store";
import { upsert, remove, uid, today as todayHelper, type Row } from "@/lib/store";
import { PageHeader } from "@/components/app-shell";
import {
  Button,
  Card,
  Field,
  Input,
  Modal,
  ProgressRing,
  SegmentedControl,
  Select,
  Textarea,
  EmptyState,
} from "@/components/ui/primitives";
import { FINANCE_CATEGORIES, formatIDR, currentMonth, niceDate } from "@/lib/domain";
import { cn } from "@/lib/utils";

type Tab = "overview" | "budgets" | "savings";

function catLabel(key: string, lang: "id" | "en") {
  const c = FINANCE_CATEGORIES.find((x) => x.key === key || x.id === key || x.en === key);
  return c ? (lang === "id" ? c.id : c.en) : key;
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

/* ------------------------------ OVERVIEW ------------------------------ */
function OverviewPanel() {
  const { t, lang } = useI18n();
  const txs = useTable<Row>("transactions", (r) =>
    [...r].sort((a, b) => (String(a.date) < String(b.date) ? 1 : -1)),
  );
  const [open, setOpen] = useState(false);
  const month = currentMonth();

  const balance = txs.reduce((s, x) => s + (x.type === "income" ? 1 : -1) * Number(x.amount ?? 0), 0);
  const monthTx = txs.filter((x) => String(x.date).startsWith(month));
  const income = monthTx.filter((x) => x.type === "income").reduce((s, x) => s + Number(x.amount ?? 0), 0);
  const expense = monthTx.filter((x) => x.type === "expense").reduce((s, x) => s + Number(x.amount ?? 0), 0);

  return (
    <div className="space-y-4">
      {/* Balance hero */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="relative overflow-hidden bg-primary p-6 text-primary-foreground sm:p-8">
          <div className="geo-texture pointer-events-none absolute inset-0 opacity-10" />
          <div className="relative">
            <p className="inline-flex items-center gap-2 text-sm text-primary-foreground/70">
              <Wallet className="h-4 w-4" /> {t("finance.balance")}
            </p>
            <p className="mt-2 font-display text-4xl font-semibold sm:text-5xl">{formatIDR(balance)}</p>
          </div>
        </Card>
      </motion.div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <TrendingUp className="h-4 w-4 text-emerald-500" /> {t("finance.income")}
          </p>
          <p className="mt-1 font-display text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
            {formatIDR(income)}
          </p>
        </Card>
        <Card className="p-5">
          <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <TrendingDown className="h-4 w-4 text-rose-500" /> {t("finance.expense")}
          </p>
          <p className="mt-1 font-display text-2xl font-semibold text-rose-500">{formatIDR(expense)}</p>
        </Card>
      </div>

      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold">{t("finance.recent")}</h3>
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> {t("finance.addTx")}
          </Button>
        </div>
        {txs.length === 0 ? (
          <EmptyState icon={<Wallet className="h-8 w-8" />} title={t("finance.empty")} description={t("empty.finance.desc")} />
        ) : (
          <div className="space-y-1">
            {txs.slice(0, 20).map((x) => (
              <div key={String(x.id)} className="flex items-center justify-between gap-3 border-b border-border/60 py-2.5 last:border-0">
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                      x.type === "income"
                        ? "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400"
                        : "bg-rose-500/12 text-rose-500",
                    )}
                  >
                    {x.type === "income" ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{catLabel(String(x.category), lang)}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {niceDate(String(x.date), lang)}
                      {x.note ? ` · ${String(x.note)}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn("text-sm font-semibold", x.type === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-foreground")}>
                    {x.type === "income" ? "+" : "−"}
                    {formatIDR(Number(x.amount ?? 0))}
                  </span>
                  <button onClick={() => void remove("transactions", String(x.id))} className="text-muted-foreground/40 hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <AddTxModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

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
    setAmount("");
    setNote("");
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={t("finance.addTx")}>
      <div className="space-y-4">
        <SegmentedControl
          className="w-full"
          value={type}
          onChange={setType}
          options={[
            { value: "expense", label: t("finance.expense") },
            { value: "income", label: t("finance.income") },
          ]}
        />
        <Field label={t("finance.tx.amount")}>
          <Input type="number" min="0" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("finance.tx.category")}>
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              {FINANCE_CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>
                  {lang === "id" ? c.id : c.en}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("finance.tx.date")}>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>
        <Field label={t("finance.tx.note")}>
          <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <Button className="w-full" onClick={save} disabled={!Number(amount)}>
          {t("common.save")}
        </Button>
      </div>
    </Modal>
  );
}

/* ------------------------------ BUDGETS ------------------------------ */
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
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> {t("finance.budget.add")}
        </Button>
      </div>
      {budgets.length === 0 ? (
        <EmptyState icon={<Target className="h-8 w-8" />} title={t("finance.budget.empty")} description={t("empty.budget.desc")} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {budgets.map((b) => {
            const spent = spentByCat.get(String(b.category)) ?? 0;
            const limit = Number(b.monthlyLimit ?? 0);
            const pct = limit ? Math.min(1, spent / limit) : 0;
            const over = spent > limit;
            return (
              <Card key={String(b.id)} className="p-5">
                <div className="mb-3 flex items-center justify-between">
                  <p className="font-medium">{catLabel(String(b.category), lang)}</p>
                  <button onClick={() => void remove("budgets", String(b.id))} className="text-muted-foreground/40 hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mb-2 flex items-baseline justify-between text-sm">
                  <span className={cn("font-semibold", over && "text-destructive")}>{formatIDR(spent)}</span>
                  <span className="text-muted-foreground">
                    {t("finance.budget.of")} {formatIDR(limit)}
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full rounded-full transition-all", over ? "bg-destructive" : "bg-primary")}
                    style={{ width: `${pct * 100}%` }}
                  />
                </div>
              </Card>
            );
          })}
        </div>
      )}
      <AddBudgetModal open={open} onClose={() => setOpen(false)} existing={budgets.map((b) => String(b.category))} />
    </div>
  );
}

function AddBudgetModal({
  open,
  onClose,
  existing,
}: {
  open: boolean;
  onClose: () => void;
  existing: string[];
}) {
  const { t, lang } = useI18n();
  const avail = FINANCE_CATEGORIES.filter((c) => c.key !== "salary" && !existing.includes(c.key));
  const [category, setCategory] = useState(avail[0]?.key ?? "food");
  const [limit, setLimit] = useState("");

  async function save() {
    const n = Number(limit);
    if (!n) return;
    await upsert("budgets", { id: uid(), category, monthlyLimit: n });
    setLimit("");
    onClose();
  }
  return (
    <Modal open={open} onClose={onClose} title={t("finance.budget.add")}>
      <div className="space-y-4">
        <Field label={t("finance.budget.category")}>
          <Select value={category} onChange={(e) => setCategory(e.target.value)}>
            {avail.map((c) => (
              <option key={c.key} value={c.key}>
                {lang === "id" ? c.id : c.en}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("finance.budget.limit")}>
          <Input type="number" min="0" value={limit} onChange={(e) => setLimit(e.target.value)} placeholder="0" />
        </Field>
        <Button className="w-full" onClick={save} disabled={!Number(limit)}>
          {t("common.save")}
        </Button>
      </div>
    </Modal>
  );
}

/* ------------------------------ SAVINGS ------------------------------ */
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
    await upsert("savingsGoals", {
      id: String(fundFor.id),
      currentAmount: Number(fundFor.currentAmount ?? 0) + n,
    });
    setFund("");
    setFundFor(null);
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
                    {g.deadline && (
                      <p className="text-xs text-muted-foreground">
                        {t("finance.savings.deadline")}: {niceDate(String(g.deadline), lang)}
                      </p>
                    )}
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
          <Button className="w-full" onClick={addFunds} disabled={!Number(fund)}>
            {t("common.save")}
          </Button>
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
    await upsert("savingsGoals", {
      id: uid(),
      name: name.trim(),
      targetAmount: Number(target),
      currentAmount: 0,
      deadline: deadline || null,
    });
    setName("");
    setTarget("");
    setDeadline("");
    onClose();
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
        <Button className="w-full" onClick={save} disabled={!name.trim() || !Number(target)}>
          {t("common.save")}
        </Button>
      </div>
    </Modal>
  );
}
