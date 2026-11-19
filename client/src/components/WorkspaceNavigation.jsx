import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  Compass,
  MessageSquare,
  Users,
  Settings,
  Heart,
  Plus,
  MapPin,
  CalendarDays,
  Flag,
  BarChart3,
} from "lucide-react";

export default function WorkspaceNavigation({ role }) {
  const { pathname } = useLocation();
  const prefix =
    role === "customer" && pathname.startsWith("/renter/")
      ? "/renter"
      : `/${role}`;
  const supplier = role === "supplier";
  const links =
    role === "admin"
      ? [
          ["/admin/dashboard", "Overview", LayoutDashboard],
          ["/admin/users", "Users", Users],
          ["/admin/products", "Listings", Package],
          ["/admin/rentals", "Rentals", CalendarDays],
          ["/admin/complaints", "Complaints", Flag],
          ["/admin/reports", "Reports", BarChart3],
          ["/messages", "Messages", MessageSquare],
        ]
      : [
          [`${prefix}/dashboard`, "Overview", LayoutDashboard],
          [`${prefix}/rentals`, supplier ? "Requests" : "My rentals", Package],
          [
            supplier ? "/supplier/products" : "/browse",
            supplier ? "Inventory" : "Browse",
            Compass,
          ],
          ...(supplier
            ? [["/supplier/products/new", "Add equipment", Plus]]
            : [[`${prefix}/favorites`, "Saved gear", Heart]]),
          ["/messages", "Messages", MessageSquare],
          ["/community", "Community", Users],
          ["/map", "Map", MapPin],
          [`${prefix}/profile`, "Settings", Settings],
        ];
  return (
    <nav
      aria-label="Workspace navigation"
      className="ledger-nav hidden md:block"
    >
      <div className="ledger-nav-links">
        {links.map(([to, label, Icon]) => (
          <NavLink key={to} to={to} end className="ledger-nav-link">
            <Icon size={16} aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
