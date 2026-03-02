"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import Providers from "./providers";
import "./globals.css";
import {
  LayoutDashboard,
  FileText,
  CreditCard,
  TrendingUp,
  BarChart3,
  Settings,
  Menu,
  X,
  Wallet,
  LogOut,
  Building2,
  Download,
  Target,
  Store,
  Repeat,
} from "lucide-react";
import CopilotPanel from "@/components/copilot-panel";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/invoices", label: "Invoices", icon: FileText },
  { href: "/expenses", label: "Expenses", icon: CreditCard },
  { href: "/revenue", label: "Revenue", icon: TrendingUp },
  { href: "/vendors", label: "Vendors", icon: Store },
  { href: "/bank", label: "Bank", icon: Building2 },
  { href: "/import", label: "Import", icon: Download },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/budgets", label: "Budgets", icon: Target },
  { href: "/recurring", label: "Recurring", icon: Repeat },
  { href: "/settings", label: "Settings", icon: Settings },
];

function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isAuthPage = pathname.startsWith("/auth");
  if (isAuthPage) return <>{children}</>;

  return (
    <div className="app-layout">
      {/* Mobile Header */}
      <div className="mobile-header">
        <button
          className="hamburger"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open menu"
        >
          <Menu size={24} />
        </button>
        <h1>💰 Finance</h1>
        <div style={{ width: 40 }} />
      </div>

      {/* Sidebar Overlay */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? "open" : ""}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <Wallet size={20} />
          </div>
          <div>
            <h1>Finance</h1>
            <span>Founder OS</span>
          </div>
          <button
            className="hamburger"
            onClick={() => setSidebarOpen(false)}
            style={{
              marginLeft: "auto",
              display: sidebarOpen ? "flex" : "none",
            }}
          >
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item ${isActive ? "active" : ""}`}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User Profile */}
        {session?.user && (
          <div style={{
            padding: "16px 20px",
            borderTop: "1px solid var(--border-color)",
            marginTop: "auto",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}>
            {session.user.image && (
              <img
                src={session.user.image}
                alt=""
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  border: "1px solid var(--border-color)",
                }}
              />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 13,
                fontWeight: 600,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}>
                {session.user.name}
              </div>
              <div style={{
                fontSize: 11,
                color: "var(--text-muted)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}>
                {session.user.email}
              </div>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/auth/signin" })}
              title="Sign out"
              style={{
                background: "none",
                border: "none",
                color: "var(--text-muted)",
                cursor: "pointer",
                padding: 4,
              }}
            >
              <LogOut size={16} />
            </button>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="main-content">{children}</main>

      {/* Copilot Panel */}
      <CopilotPanel />

      {/* Mobile Bottom Nav */}
      <nav className="mobile-nav">
        {navItems.slice(0, 5).map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`mobile-nav-item ${isActive ? "active" : ""}`}
            >
              <item.icon size={20} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <title>Finance — Founder OS</title>
        <meta
          name="description"
          content="Accounting, invoicing, expense tracking, runway projections, and GST compliance for startups"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}

