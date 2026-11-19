import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import {
  Boxes,
  CircleEllipsis,
  FileText,
  Heart,
  Home,
  MapPin,
  MessageCircle,
  Package,
  Plus,
  Search,
  Settings,
  Shield,
  Users,
  UserRound,
  Wallet,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const GUEST_LINKS = [
  ["/", "Home", Home],
  ["/browse", "Browse", Search],
  ["/map", "Map", MapPin],
  ["/community", "Community", Users],
  ["/login", "Sign in", UserRound],
];

const CUSTOMER_LINKS = [
  ["/customer/dashboard", "Home", Home],
  ["/browse", "Browse", Search],
  ["/customer/rentals", "Rentals", Package],
  ["/customer/favorites", "Saved", Heart],
];

const CUSTOMER_MORE = [
  ["/messages", "Messages", MessageCircle],
  ["/community", "Community", Users],
  ["/map", "Roxas map", MapPin],
  ["/customer/profile", "Account settings", Settings],
];

const SUPPLIER_LINKS = [
  ["/supplier/dashboard", "Overview", Home],
  ["/supplier/products", "Listings", Boxes],
  ["/supplier/rentals", "Requests", FileText],
  ["/messages", "Messages", MessageCircle],
];

const SUPPLIER_MORE = [
  ["/supplier/products/new", "Add equipment", Plus],
  ["/browse", "Browse rentals", Search],
  ["/community", "Community", Users],
  ["/map", "Roxas map", MapPin],
  ["/supplier/profile", "Account settings", Settings],
];

const ADMIN_LINKS = [
  ["/admin/dashboard", "Overview", Home],
  ["/admin/users", "Users", Users],
  ["/admin/products", "Gear", Boxes],
  ["/admin/rentals", "Rentals", Package],
];

const ADMIN_MORE = [
  ["/admin/complaints", "Complaints", Shield],
  ["/admin/reports", "Reports & analytics", FileText],
  ["/admin/wallet", "Wallet", Wallet],
  ["/browse", "Browse rentals", Search],
  ["/messages", "Messages", MessageCircle],
];

const HIDDEN_PATHS = [
  /^\/(?:login|register|register-renter|register-supplier|choose-role|forgot-password)(?:\/|$)/,
  /^\/reset-password(?:\/|$)/,
  /^\/(?:messages|product\/[^/]+)(?:\/|$)/,
  /^\/(?:customer|renter)\/(?:checkout|booking)(?:\/|$)/,
  /^\/supplier\/products\/(?:new|[^/]+\/edit)(?:\/|$)/,
];

export function shouldShowMobileBottomNav(pathname) {
  return !HIDDEN_PATHS.some((path) => path.test(pathname));
}

export default function MobileBottomNav({ workspaceRole }) {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => setMoreOpen(false), [pathname]);

  if (!shouldShowMobileBottomNav(pathname)) return null;

  const defaultLinks = user
    ? user.role === "admin"
      ? ADMIN_LINKS
      : user.role === "supplier"
        ? SUPPLIER_LINKS
        : CUSTOMER_LINKS
    : GUEST_LINKS;
  const defaultMoreLinks =
    user?.role === "admin"
      ? ADMIN_MORE
      : user?.role === "supplier"
        ? SUPPLIER_MORE
        : user
          ? CUSTOMER_MORE
          : [];
  const isPrimary = ([to]) => /\/(dashboard|rentals)$/.test(to);
  const rolePath = (to) =>
    workspaceRole === "customer" && pathname.startsWith("/renter/")
      ? to.replace(/^\/customer\//, "/renter/")
      : to;
  const links = workspaceRole
    ? defaultLinks
        .filter(isPrimary)
        .map(([to, label, Icon]) => [
          to,
          to.endsWith("/dashboard") ? "Overview" : label,
          Icon,
        ])
    : defaultLinks;
  const moreLinks = workspaceRole
    ? [...defaultLinks.filter((item) => !isPrimary(item)), ...defaultMoreLinks]
    : defaultMoreLinks;
  const moreActive = moreLinks.some(
    ([to]) =>
      pathname === rolePath(to) || pathname.startsWith(`${rolePath(to)}/`),
  );

  return (
    <>
      {moreOpen && (
        <>
          <button
            type="button"
            aria-label="Close more navigation links"
            className="fixed inset-0 z-40 bg-slate-950/20 md:hidden"
            onClick={() => setMoreOpen(false)}
          />
          <div
            id="mobile-more-navigation"
            aria-label="More navigation links"
            className={`menu-enter fixed inset-x-3 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-[45] rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl md:hidden ${workspaceRole ? "ledger-mobile-more" : ""}`}
          >
            <div className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
              More
            </div>
            <div className="grid grid-cols-2 gap-2">
              {moreLinks.map(([to, label, Icon]) => (
                <Link
                  key={to}
                  to={rolePath(to)}
                  onClick={() => setMoreOpen(false)}
                  aria-current={pathname === rolePath(to) ? "page" : undefined}
                  className={`flex min-h-12 min-w-0 items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition hover:bg-blue-50 hover:text-[#1e3a8a] ${pathname === rolePath(to) ? "bg-blue-50 text-[#1e3a8a]" : "bg-slate-50 text-slate-700"}`}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">{label}</span>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}

      <nav
        aria-label="Primary mobile navigation"
        className={`fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur-md md:hidden ${workspaceRole ? "ledger-mobile-nav" : ""}`}
      >
        <div
          className={`mx-auto grid h-16 max-w-xl ${workspaceRole ? "grid-cols-3" : "grid-cols-5"}`}
        >
          {links.map(([to, label, Icon]) => (
            <NavLink
              key={to}
              to={rolePath(to)}
              end
              aria-label={label}
              className={({ isActive }) =>
                `relative flex min-w-0 flex-col items-center justify-center gap-1 px-1 text-[10px] font-semibold transition-colors ${isActive ? "text-[#1e3a8a]" : "text-slate-500 hover:text-slate-900"}`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    aria-hidden="true"
                    className={`absolute top-0 h-0.5 w-8 origin-center rounded-full bg-amber-400 transition-transform duration-200 ease-out ${isActive ? "scale-x-100" : "scale-x-0"}`}
                  />
                  <Icon
                    className={`h-5 w-5 shrink-0 transition-transform duration-200 ease-out ${isActive ? "-translate-y-0.5 stroke-[2.4]" : "stroke-[1.8]"}`}
                    aria-hidden="true"
                  />
                  <span className="max-w-full truncate leading-none">
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
          {moreLinks.length > 0 && (
            <button
              type="button"
              aria-label="More navigation links"
              aria-expanded={moreOpen}
              aria-controls="mobile-more-navigation"
              onClick={() => setMoreOpen((open) => !open)}
              className={`relative flex min-w-0 flex-col items-center justify-center gap-1 px-1 text-[10px] font-semibold transition-colors ${moreOpen || moreActive ? "text-[#1e3a8a]" : "text-slate-500 hover:text-slate-900"}`}
            >
              {(moreOpen || moreActive) && (
                <span className="absolute top-0 h-0.5 w-8 rounded-full bg-amber-400" />
              )}
              <CircleEllipsis className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span className="max-w-full truncate leading-none">More</span>
            </button>
          )}
        </div>
        <div className="h-[env(safe-area-inset-bottom)]" aria-hidden="true" />
      </nav>
    </>
  );
}
