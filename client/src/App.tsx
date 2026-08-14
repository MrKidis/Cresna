import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import Actions from "@/pages/Actions";
import AIStudio from "@/pages/AIStudio";
import Billing from "@/pages/Billing";
import ConnectStore from "@/pages/ConnectStore";
import Dashboard from "@/pages/Dashboard";
import FoundingBeta from "@/pages/FoundingBeta";
import FounderConsole from "@/pages/FounderConsole";
import GrowthProfile from "@/pages/GrowthProfile";
import Impact from "@/pages/Impact";
import NotFound from "@/pages/NotFound";
import Settings from "@/pages/Settings";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/app"} component={Dashboard} />
      <Route path={"/app/profile"} component={GrowthProfile} />
      <Route path={"/app/founder"} component={FounderConsole} />
      <Route path={"/app/beta"} component={FoundingBeta} />
      <Route path={"/app/connect"} component={ConnectStore} />
      <Route path={"/app/actions"} component={Actions} />
      <Route path={"/app/ai-studio"} component={AIStudio} />
      <Route path={"/app/impact"} component={Impact} />
      <Route path={"/app/billing"} component={Billing} />
      <Route path={"/app/settings"} component={Settings} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
