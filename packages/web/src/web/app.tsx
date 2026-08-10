import { lazy, Suspense } from "react";
import { Route, Switch, useLocation } from "wouter";
import { ErrorBoundary } from "./components/error-boundary";
import { Provider } from "./components/provider";
import "./components/persona-tantri.css";
import { usePersona } from "./lib/persona";
import { StoreBootstrap, GuestOnly } from "./components/guards";
import { AppShell } from "./components/app-shell";

// Lazy load all page components for code splitting
const Landing = lazy(() => import("./pages/landing"));
const Login = lazy(() => import("./pages/login"));
const Signup = lazy(() => import("./pages/signup"));
const Dashboard = lazy(() => import("./pages/dashboard"));
const Finance = lazy(() => import("./pages/finance"));
const Cycle = lazy(() => import("./pages/cycle"));
const Settings = lazy(() => import("./pages/settings"));
const CalendarPage = lazy(() => import("./pages/calendar"));
const Habits = lazy(() => import("./pages/habits"));
const Salah = lazy(() => import("./pages/salah"));
const Hifz = lazy(() => import("./pages/hifz"));
const Duas = lazy(() => import("./pages/duas"));
const Dzikir = lazy(() => import("./pages/dzikir"));
const Quran = lazy(() => import("./pages/quran"));
const Notes = lazy(() => import("./pages/notes"));
const Goals = lazy(() => import("./pages/goals"));
const Focus = lazy(() => import("./pages/focus"));
const Achievements = lazy(() => import("./pages/achievements"));
const Analytics = lazy(() => import("./pages/analytics"));

// Loading fallback component
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Memuat…</p>
      </div>
    </div>
  );
}

function AppRoutes() {
  return (
    <StoreBootstrap>
      <AppShell>
        <Suspense fallback={<PageLoader />}>
          <Switch>
            <Route path="/app" component={Dashboard} />
            <Route path="/app/calendar" component={CalendarPage} />
            <Route path="/app/habits" component={Habits} />
            <Route path="/app/salah" component={Salah} />
            <Route path="/app/hifz" component={Hifz} />
            <Route path="/app/duas" component={Duas} />
            <Route path="/app/dzikir" component={Dzikir} />
            <Route path="/app/finance" component={Finance} />
            <Route path="/app/cycle" component={Cycle} />
            <Route path="/app/settings" component={Settings} />
            <Route path="/app/quran" component={Quran} />
            <Route path="/app/notes" component={Notes} />
            <Route path="/app/goals" component={Goals} />
            <Route path="/app/focus" component={Focus} />
            <Route path="/app/achievements" component={Achievements} />
            <Route path="/app/analytics" component={Analytics} />
            <Route component={Dashboard} />
          </Switch>
        </Suspense>
      </AppShell>
    </StoreBootstrap>
  );
}

function AppContent() {
  const persona = usePersona();

  return (
    <div className={persona === "tantri" ? "persona-tantri" : undefined}>
      <Suspense fallback={<PageLoader />}>
        <Switch>
          <Route path="/">
            <GuestOnly>
              <Landing />
            </GuestOnly>
          </Route>
          <Route path="/login">
            <GuestOnly>
              <Login />
            </GuestOnly>
          </Route>
          <Route path="/signup">
            <GuestOnly>
              <Signup />
            </GuestOnly>
          </Route>
          <Route component={AppRoutes} />
        </Switch>
      </Suspense>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <Provider>
        <AppContent />
      </Provider>
    </ErrorBoundary>
  );
}

export default App;
