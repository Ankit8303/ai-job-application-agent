"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Briefcase,
  FileText,
  User,
  Clock,
  CreditCard,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Zap,
  LogOut,
  Menu,
  X,
  Bell,
  Search,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

interface DashboardUser {
  id: string;
  email?: string;
  full_name?: string;
  avatar_url?: string;
  headline?: string;
}

interface DashboardLayoutClientProps {
  user: DashboardUser;
  children: React.ReactNode;
}

export function DashboardLayoutClient({
  user,
  children,
}: DashboardLayoutClientProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  // Collapsed state persisted in localStorage
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [credits, setCredits] = useState({ current: 42, max: 50 });
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const savedState = localStorage.getItem("jobbuddy_sidebar_collapsed");
    if (savedState !== null) {
      setCollapsed(savedState === "true");
    }
  }, []);

  const toggleCollapsed = () => {
    const nextState = !collapsed;
    setCollapsed(nextState);
    localStorage.setItem("jobbuddy_sidebar_collapsed", String(nextState));
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await supabase.auth.signOut();
    router.push("/auth/sign-in");
    router.refresh();
  };

  // Main Navigation links
  const navItems = [
    {
      name: "Jobs",
      href: "/dashboard/jobs",
      icon: Briefcase,
      badge: "AI Powered",
    },
    {
      name: "Resume",
      href: "/dashboard/resume",
      icon: FileText,
      badge: null,
    },
    {
      name: "Profile",
      href: "/dashboard/profile",
      icon: User,
      badge: null,
    },
    {
      name: "Application Status",
      href: "/dashboard/application-status",
      icon: Clock,
      badge: "Live",
    },
  ];

  // Footer navigation items
  const footerItems = [
    {
      name: "Billing / Credits",
      href: "/dashboard/billing",
      icon: CreditCard,
    },
    {
      name: "Profile Settings",
      href: "/dashboard/settings",
      icon: Settings,
    },
  ];

  const displayName = user.full_name || user.email?.split("@")[0] || "User";
  const userInitials = displayName.substring(0, 2).toUpperCase();

  const creditPercentage = Math.round((credits.current / credits.max) * 100);

  // Active route checking helper
  const isItemActive = (href: string) => {
    if (href === "/dashboard/jobs" && (pathname === "/dashboard" || pathname === "/dashboard/jobs")) {
      return true;
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-[#070A11] text-slate-100 flex font-sans antialiased selection:bg-indigo-500 selection:text-white">
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden transition-opacity"
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-[#090D16] border-r border-slate-800/80 transition-all duration-300 ease-in-out ${
          // Desktop collapsed or expanded
          collapsed ? "w-[76px]" : "w-64"
        } ${
          // Mobile open or closed
          mobileOpen ? "translate-x-0 w-64" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Top Header: Logo & App Name */}
        <div className="h-16 flex items-center px-4 border-b border-slate-800/80 justify-between shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            {/* Logo Icon */}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-600/30 ring-1 ring-white/20 shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>

            {/* App Name */}
            {(!collapsed || mobileOpen) && (
              <div className="min-w-0 transition-opacity duration-200">
                <span className="text-base font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent block truncate">
                  JobBuddy AI
                </span>
                <span className="text-[10px] uppercase tracking-wider font-semibold text-indigo-400 block truncate">
                  Application Agent
                </span>
              </div>
            )}
          </div>

          {/* Mobile close button */}
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 py-4 px-3 space-y-1.5 overflow-y-auto overflow-x-hidden">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isItemActive(item.href);

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                title={collapsed && !mobileOpen ? item.name : undefined}
                className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 cursor-pointer ${
                  active
                    ? "bg-gradient-to-r from-indigo-600/25 to-indigo-500/15 text-white border border-indigo-500/30 shadow-sm shadow-indigo-500/10"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent"
                } ${collapsed && !mobileOpen ? "justify-center px-0" : ""}`}
              >
                {/* Active indicator bar */}
                {active && (
                  <div className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-indigo-500" />
                )}

                <Icon
                  className={`w-5 h-5 shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                    active ? "text-indigo-400" : "text-slate-400 group-hover:text-slate-200"
                  }`}
                />

                {(!collapsed || mobileOpen) && (
                  <div className="flex-1 flex items-center justify-between min-w-0">
                    <span className="truncate">{item.name}</span>
                    {item.badge && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}

                {/* Collapsed Tooltip Flyout */}
                {collapsed && !mobileOpen && (
                  <div className="absolute left-full ml-3 px-2.5 py-1 rounded-md bg-slate-900 border border-slate-700 text-xs font-semibold text-white whitespace-nowrap shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                    {item.name}
                  </div>
                )}
              </Link>
            );
          })}
        </div>

        {/* SIDEBAR FOOTER SECTION */}
        <div className="p-3 border-t border-slate-800/80 space-y-3 bg-[#080B13] shrink-0">
          {/* 1. Proper Credits Display Section */}
          {!collapsed || mobileOpen ? (
            <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-950/40 via-slate-900/80 to-[#0e1322] border border-indigo-900/40 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  AI Credits
                </span>
                <span className="font-bold text-white font-mono text-[11px]">
                  {credits.current} / {credits.max}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden mb-2.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
                  style={{ width: `${creditPercentage}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Monthly renewal</span>
                <Link
                  href="/dashboard/billing"
                  className="text-indigo-400 hover:text-indigo-300 font-semibold underline-offset-2 hover:underline transition-colors"
                >
                  Upgrade
                </Link>
              </div>
            </div>
          ) : (
            // Collapsed Credit Icon Badge with Tooltip
            <div className="group relative flex justify-center py-1">
              <div className="w-10 h-10 rounded-xl bg-indigo-950/50 border border-indigo-800/40 flex flex-col items-center justify-center text-amber-400 cursor-pointer hover:border-indigo-600 transition-colors">
                <Zap className="w-4 h-4 fill-amber-400" />
                <span className="text-[9px] font-bold font-mono text-slate-300">
                  {credits.current}
                </span>
              </div>
              <div className="absolute left-full ml-3 px-3 py-1.5 rounded-md bg-slate-900 border border-slate-700 text-xs text-white whitespace-nowrap shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                <div className="font-semibold text-amber-400 flex items-center gap-1">
                  <Zap className="w-3 h-3 fill-amber-400" /> {credits.current} / {credits.max} Credits
                </div>
                <div className="text-[10px] text-slate-400">Click Billing to refill</div>
              </div>
            </div>
          )}

          {/* 2. Footer Navigation Items (Billing & Settings) */}
          <div className="space-y-1">
            {footerItems.map((item) => {
              const Icon = item.icon;
              const active = isItemActive(item.href);

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  title={collapsed && !mobileOpen ? item.name : undefined}
                  className={`group relative flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                    active
                      ? "bg-slate-800 text-white border border-slate-700"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent"
                  } ${collapsed && !mobileOpen ? "justify-center px-0" : ""}`}
                >
                  <Icon className="w-4 h-4 shrink-0 text-slate-400 group-hover:text-slate-200" />
                  {(!collapsed || mobileOpen) && (
                    <span className="truncate">{item.name}</span>
                  )}

                  {collapsed && !mobileOpen && (
                    <div className="absolute left-full ml-3 px-2.5 py-1 rounded-md bg-slate-900 border border-slate-700 text-xs font-semibold text-white whitespace-nowrap shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                      {item.name}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>

          {/* 3. Profile User Section & Collapse Toggle */}
          <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between gap-2">
            <div
              className={`flex items-center gap-2.5 min-w-0 ${
                collapsed && !mobileOpen ? "w-full justify-center" : ""
              }`}
            >
              {user.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatar_url}
                  alt={displayName}
                  className="w-8 h-8 rounded-full border border-slate-700 object-cover shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow-sm shrink-0">
                  {userInitials}
                </div>
              )}

              {(!collapsed || mobileOpen) && (
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-white truncate">
                    {displayName}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">
                    {user.email}
                  </div>
                </div>
              )}
            </div>

            {/* Logout button in expanded state */}
            {(!collapsed || mobileOpen) && (
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                title="Sign out"
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Desktop Sidebar Collapse Toggle Button */}
          <div className="hidden lg:flex pt-1 justify-center">
            <button
              onClick={toggleCollapsed}
              className="w-full py-1.5 px-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-all text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer"
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? (
                <>
                  <ChevronRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  <ChevronLeft className="w-4 h-4" />
                  <span className="text-[11px]">Collapse Sidebar</span>
                </>
              )}
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div
        className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out ${
          collapsed ? "lg:pl-[76px]" : "lg:pl-64"
        }`}
      >
        {/* Top Navbar */}
        <header className="h-16 sticky top-0 z-30 border-b border-slate-800/80 bg-[#090D16]/80 backdrop-blur-xl px-4 sm:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger menu toggle */}
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Header Title / Breadcrumb */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-400">JobBuddy AI</span>
              <span className="text-slate-600">/</span>
              <span className="font-semibold text-white capitalize">
                {pathname.replace("/dashboard", "").replace("/", "") || "Jobs"}
              </span>
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-400">
              <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span>{credits.current} credits available</span>
            </div>

            <Link
              href="/dashboard/billing"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-semibold transition-colors"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Refill Credits</span>
            </Link>

            <Link
              href="/dashboard/settings"
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 border border-transparent hover:border-slate-800 transition-all"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 flex flex-col p-4 sm:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
