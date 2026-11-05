import { NavLink } from "react-router-dom";
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
} from "lucide-react";

export default function WorkspaceNavigation({ role }) {
  const supplier = role === "supplier";
  const links = [
    [`/${role}/dashboard`, "Overview", LayoutDashboard],
    [`/${role}/rentals`, supplier ? "Requests" : "My rentals", Package],
    [
      supplier ? "/supplier/products" : "/browse",
      supplier ? "Inventory" : "Browse",
      Compass,
    ],
    ...(supplier
      ? [["/supplier/products/new", "Add equipment", Plus]]
      : [["/customer/favorites", "Saved gear", Heart]]),
    ["/messages", "Messages", MessageSquare],
    ["/community", "Community", Users],
    ["/map", "Map", MapPin],
    [`/${role}/profile`, "Settings", Settings],
  ];
  return (
    <nav
      aria-label="Workspace navigation"
      className="flex gap-2 overflow-x-auto border-b border-slate-200 bg-white px-4 py-3 lg:hidden"
    >
      {links.map(([to, label, Icon]) => (
        <NavLink
          key={to}
          to={to}
          end
          className={({ isActive }) =>
            `inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-3 text-sm font-semibold transition-colors ${isActive ? "bg-navy-700 text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100"}`
          }
        >
          <Icon size={16} aria-hidden="true" />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
