import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { startLogin } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { trpc } from "@/lib/trpc";
import { Activity, ArrowUpRight, Crown, CreditCard, FileText, Globe2, Landmark, LayoutDashboard, Lightbulb, LogOut, Package, PanelLeft, Receipt, Settings, ShoppingCart, Sparkles, Store, Tag, Truck, UsersRound, WandSparkles } from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { OnboardingTutorial } from "./OnboardingTutorial";
import { ThemeToggle } from "./ThemeToggle";
import { Button } from "./ui/button";

const menuGroups = [
  { label: "Workspace", items: [{ icon: LayoutDashboard, label: "Overview", path: "/app" }, { icon: Sparkles, label: "Growth Profile", path: "/app/profile" }, { icon: Store, label: "Connect store", path: "/app/connect" }] },
  { label: "Commerce", items: [{ icon: ShoppingCart, label: "Orders", path: "/app/orders" }, { icon: FileText, label: "Drafts", path: "/app/drafts" }, { icon: Truck, label: "Shipping labels", path: "/app/shipping" }, { icon: Package, label: "Products", path: "/app/products" }, { icon: UsersRound, label: "Customers", path: "/app/customers" }, { icon: Tag, label: "Discounts", path: "/app/discounts" }, { icon: FileText, label: "Content", path: "/app/content" }, { icon: Globe2, label: "Markets", path: "/app/markets" }, { icon: Landmark, label: "Finance", path: "/app/finance" }, { icon: Activity, label: "Analytics", path: "/app/analytics" }] },
  { label: "Growth actions", items: [{ icon: Lightbulb, label: "Opportunity Engine", path: "/app/actions" }, { icon: WandSparkles, label: "AI Action Studio", path: "/app/ai-studio" }, { icon: Activity, label: "Impact tracker", path: "/app/impact" }, { icon: Receipt, label: "Growth loop", path: "/app/growth" }] },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 200;
const MAX_WIDTH = 480;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-6">
            <h1 className="text-2xl font-extrabold tracking-[-0.04em] text-center">
              Sign in to continue
            </h1>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Access to this dashboard requires authentication. Continue to launch the login flow.
            </p>
          </div>
          <Button
            onClick={() => startLogin()}
            size="lg"
            className="w-full rounded-full bg-primary text-primary-foreground shadow-none hover:bg-primary/90"
          >
            Sign in
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
      <OnboardingTutorial />
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const isUnpaidPreview = location === "/app/preview" || location.startsWith("/app/preview/");
  const previewPath = (path: string) => path === "/app" ? "/app/preview" : `/app/preview${path.slice(4)}`;
  const routedPath = (path: string) => isUnpaidPreview ? previewPath(path) : path;
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const activeMenuItem = menuGroups.flatMap(group => group.items).find(item => item.path === location);
  const isMobile = useIsMobile();
  const { data: ownerAccess } = trpc.owner.access.useQuery(undefined, { enabled: Boolean(user) });
  const isOwner = ownerAccess?.isOwner === true;

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r border-sidebar-border bg-sidebar text-sidebar-foreground"
          disableTransition={isResizing}
        >
          <SidebarHeader className="h-[72px] justify-center">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              <Button type="button" variant="ghost" size="icon" onClick={toggleSidebar} className="h-8 w-8 shrink-0 rounded-lg" aria-label="Toggle navigation">
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </Button>
              {!isCollapsed ? (
                <div className="flex items-center gap-2 min-w-0">
                  <span className="grid h-7 w-7 place-items-center overflow-hidden rounded-[8px] bg-primary"><img src="/manus-storage/cresna-growth-arrow-logo_f6234d79.png" alt="Cresna growth arrow" className="h-full w-full object-contain p-0.5" /></span>
                  <span className="font-extrabold tracking-[-0.04em] truncate text-sidebar-foreground">Cresna</span>
                </div>
              ) : null}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0 overflow-y-auto">
            {isOwner && !isUnpaidPreview ? <>
              <div className="px-5 pb-1 group-data-[collapsible=icon]:hidden">
                <p className="eyebrow text-[9px] font-medium text-[#7a847e]">Owner workspace</p>
              </div>
              <SidebarMenu className="px-3 py-2">
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={location === "/app/owner-panel" || location === "/app/founder"}
                    onClick={() => setLocation("/app/owner-panel")}
                    tooltip="Owner Panel"
                    className={`h-11 rounded-xl px-3 transition-all font-semibold text-[13px] ${location === "/app/owner-panel" || location === "/app/founder" ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90" : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}
                  >
                    <Crown className="h-4 w-4" />
                    <span>Owner Panel</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </> : null}
            {menuGroups.map((group, groupIndex) => <div key={group.label} className={(groupIndex || isOwner) ? "pt-3" : ""}><div className="px-5 pb-1 group-data-[collapsible=icon]:hidden"><p className="eyebrow text-[9px] font-medium text-[#7a847e]">{group.label}</p></div><SidebarMenu className="px-3 py-1">{group.items.map(item => { const isActive = location === routedPath(item.path); return <SidebarMenuItem key={item.path}><SidebarMenuButton isActive={isActive} onClick={() => setLocation(routedPath(item.path))} tooltip={item.label} className={`h-10 rounded-xl px-3 transition-all font-semibold text-[13px] ${isActive ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm" : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}><item.icon className={`h-4 w-4 ${isActive ? "text-primary" : ""}`} /><span>{item.label}</span></SidebarMenuButton></SidebarMenuItem>; })}</SidebarMenu></div>)}
            <div className="px-5 pt-5 group-data-[collapsible=icon]:hidden">
              <p className="eyebrow text-[9px] font-medium text-[#7a847e]">Account</p>
            </div>
            <SidebarMenu className="px-3 py-2">
              {[
                { icon: CreditCard, label: "Billing", path: "/app/billing" },
                { icon: Sparkles, label: "Founding Beta", path: "/app/beta" },
                { icon: Settings, label: "Settings", path: "/app/settings" },
              ].map(item => <SidebarMenuItem key={item.path}><SidebarMenuButton isActive={location === routedPath(item.path)} onClick={() => setLocation(routedPath(item.path))} tooltip={item.label} className={`h-11 rounded-xl px-3 transition-all font-semibold text-[13px] ${location === routedPath(item.path) ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm" : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}><item.icon className="h-4 w-4" /><span>{item.label}</span></SidebarMenuButton></SidebarMenuItem>)}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="m-3 rounded-xl border border-sidebar-border bg-sidebar-accent p-2">
            <div className="mb-2 flex justify-end px-1 group-data-[collapsible=icon]:justify-center"><ThemeToggle /></div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="ghost" className="h-auto w-full justify-start gap-3 rounded-lg px-1 py-1 text-left group-data-[collapsible=icon]:justify-center">
                  <Avatar className="h-9 w-9 border border-[#17201e]/10 shrink-0">
                    <AvatarFallback className="text-xs font-medium">
                      {user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none">
                      {user?.name || "-"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-1.5">
                      {user?.email || "-"}
                    </p>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

        <SidebarInset className="bg-background text-foreground">
        {isMobile && (
          <div className="flex border-b border-border h-14 items-center justify-between bg-background/95 px-2 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg bg-background" />
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-1">
                  <span className="tracking-tight text-foreground">
                    {activeMenuItem?.label ?? "Menu"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </SidebarInset>
    </>
  );
}
