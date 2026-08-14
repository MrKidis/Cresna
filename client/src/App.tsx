import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import Actions from "@/pages/Actions";
import AIStudio from "@/pages/AIStudio";
import Billing from "@/pages/Billing";
import BetaAccess from "@/pages/BetaAccess";
import ConnectStore from "@/pages/ConnectStore";
import ConnectStoreConsent from "@/pages/ConnectStoreConsent";
import CommerceModule from "@/pages/CommerceModule";
import Dashboard from "@/pages/Dashboard";
import FoundingBeta from "@/pages/FoundingBeta";
import OwnerPanel from "@/pages/OwnerPanel";
import GrowthProfile from "@/pages/GrowthProfile";
import Impact from "@/pages/Impact";
import NotFound from "@/pages/NotFound";
import Settings from "@/pages/Settings";
import UnpaidPreview from "@/pages/UnpaidPreview";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { UnpaidPreviewProvider } from "./contexts/UnpaidPreviewContext";
import Home from "./pages/Home";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/beta-access"} component={BetaAccess} />
      <Route path={"/app"} component={Dashboard} />
      <Route path={"/app/profile"} component={GrowthProfile} />
      <Route path={"/app/owner-panel"} component={OwnerPanel} />
      <Route path={"/app/founder"} component={OwnerPanel} />
      <Route path={"/app/beta"} component={FoundingBeta} />
      <Route path={"/app/connect"} component={ConnectStoreConsent} />
      <Route path={"/app/actions"} component={Actions} />
      <Route path={"/app/ai-studio"} component={AIStudio} />
      <Route path={"/app/impact"} component={Impact} />
      <Route path={"/app/orders"} component={OrdersModule} />
      <Route path={"/app/drafts"} component={DraftsModule} />
      <Route path={"/app/shipping"} component={ShippingModule} />
      <Route path={"/app/products"} component={ProductsModule} />
      <Route path={"/app/customers"} component={CustomersModule} />
      <Route path={"/app/growth"} component={GrowthModule} />
      <Route path={"/app/discounts"} component={DiscountsModule} />
      <Route path={"/app/content"} component={ContentModule} />
      <Route path={"/app/markets"} component={MarketsModule} />
      <Route path={"/app/finance"} component={FinanceModule} />
      <Route path={"/app/analytics"} component={AnalyticsModule} />
      <Route path={"/app/billing"} component={Billing} />
      <Route path={"/app/preview"} component={UnpaidPreview} />
      <Route path={"/app/unpaid-preview"} component={UnpaidPreview} />
      <Route path={"/app/preview/profile"} component={PreviewGrowthProfile} />
      <Route path={"/app/preview/connect"} component={PreviewConnectStore} />
      <Route path={"/app/preview/actions"} component={PreviewActions} />
      <Route path={"/app/preview/ai-studio"} component={PreviewAIStudio} />
      <Route path={"/app/preview/impact"} component={PreviewImpact} />
      <Route path={"/app/preview/billing"} component={PreviewBilling} />
      <Route path={"/app/preview/beta"} component={PreviewFoundingBeta} />
      <Route path={"/app/preview/settings"} component={PreviewSettings} />
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

function withUnpaidPreview(Page: React.ComponentType) {
  return function UnpaidPreviewRoute() {
    return <UnpaidPreviewProvider><Page /></UnpaidPreviewProvider>;
  };
}

const PreviewGrowthProfile = withUnpaidPreview(GrowthProfile);
const PreviewConnectStore = withUnpaidPreview(ConnectStoreConsent);
const PreviewActions = withUnpaidPreview(Actions);
const PreviewAIStudio = withUnpaidPreview(AIStudio);
const PreviewImpact = withUnpaidPreview(Impact);
const PreviewBilling = withUnpaidPreview(Billing);
const PreviewFoundingBeta = withUnpaidPreview(FoundingBeta);
const PreviewSettings = withUnpaidPreview(Settings);
const OrdersModule = () => <CommerceModule section="orders" />;
const DraftsModule = () => <CommerceModule section="drafts" />;
const ShippingModule = () => <CommerceModule section="shipping" />;
const ProductsModule = () => <CommerceModule section="products" />;
const CustomersModule = () => <CommerceModule section="customers" />;
const GrowthModule = () => <CommerceModule section="growth" />;
const DiscountsModule = () => <CommerceModule section="discounts" />;
const ContentModule = () => <CommerceModule section="content" />;
const MarketsModule = () => <CommerceModule section="markets" />;
const FinanceModule = () => <CommerceModule section="finance" />;
const AnalyticsModule = () => <CommerceModule section="analytics" />;

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        switchable
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
