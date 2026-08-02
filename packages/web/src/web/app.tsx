import { Route, Switch } from "wouter";
import { Provider } from "./components/provider";
import { StoreBootstrap, GuestOnly } from "./components/guards";
import { AppShell } from "./components/app-shell";
import Landing from "./pages/landing";
import Login from "./pages/login";
import Signup from "./pages/signup";
import Dashboard from "./pages/dashboard";
import Finance from "./pages/finance";
import Cycle from "./pages/cycle";
import Journal from "./pages/journal";
import Settings from "./pages/settings";
import CalendarPage from "./pages/calendar";
import Habits from "./pages/habits";
import Salah from "./pages/salah";
import Hifz from "./pages/hifz";
import Duas from "./pages/duas";
import Quran from "./pages/quran";
import Khatma from "./pages/khatma";
import Notes from "./pages/notes";
import Goals from "./pages/goals";
import Focus from "./pages/focus";
import Achievements from "./pages/achievements";
import Analytics from "./pages/analytics";

function AppRoutes() {
  return (
    <StoreBootstrap>
      <AppShell>
        <Switch>
          <Route path="/app" component={Dashboard} />
          <Route path="/app/calendar" component={CalendarPage} />
          <Route path="/app/journal" component={Journal} />
          <Route path="/app/habits" component={Habits} />
          <Route path="/app/salah" component={Salah} />
          <Route path="/app/hifz" component={Hifz} />
          <Route path="/app/duas" component={Duas} />
          <Route path="/app/finance" component={Finance} />
          <Route path="/app/cycle" component={Cycle} />
          <Route path="/app/settings" component={Settings} />
          <Route path="/app/quran" component={Quran} />
          <Route path="/app/khatma" component={Khatma} />
          <Route path="/app/notes" component={Notes} />
          <Route path="/app/goals" component={Goals} />
          <Route path="/app/focus" component={Focus} />
          <Route path="/app/achievements" component={Achievements} />
          <Route path="/app/analytics" component={Analytics} />
          <Route component={Dashboard} />
        </Switch>
      </AppShell>
    </StoreBootstrap>
  );
}

function App() {
  return (
    <Provider>
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
    </Provider>
  );
}

export default App;
