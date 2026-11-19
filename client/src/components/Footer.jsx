import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
const RENTALS = [
  { label: "Cameras & Drones", to: "/browse?category=Cameras" },
  { label: "Camping Equipment", to: "/browse?category=Camping" },
  { label: "Sports Equipment", to: "/browse?category=Sports" },
  { label: "Event Equipment", to: "/browse?category=Event" },
  { label: "Household Equipment", to: "/browse?category=Household" },
  { label: "Vehicles", to: "/browse?category=Vehicles" },
  { label: "Apartments", to: "/browse?category=Apartments" },
  { label: "School Project Equipment", to: "/browse?category=School" },
];

export default function Footer() {
  const { user } = useAuth();
  return (
    <footer className="border-t border-slate-200 bg-[#101b30] text-slate-300">
      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-10 sm:grid-cols-[1.3fr_1fr_1fr]">
        <div>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-lg font-bold text-white"
          >
            <img
              src="/logo.png"
              className="h-10 w-10 object-contain"
              alt="Rent-A-Way"
            />
            Rent-A-Way
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-relaxed">
            Equipment, vehicles and apartments from local suppliers in Roxas,
            Oriental Mindoro.
          </p>
        </div>
        <div>
          <h2 className="mb-4 text-sm font-semibold text-white">
            Browse rentals
          </h2>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
            {RENTALS.map((item) => (
              <li key={item.to}>
                <Link className="hover:text-white" to={item.to}>
                  {item.label.replace(" Equipment", "").replace(" Project", "")}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="mb-4 text-sm font-semibold text-white">Rent-A-Way</h2>
          <ul className="space-y-3 text-xs">
            <li>
              <Link to="/how-it-works">How it works</Link>
            </li>
            <li>
              <Link to="/for-suppliers">For suppliers</Link>
            </li>
            <li>
              <Link to="/community">Community</Link>
            </li>
            <li>
              <Link to="/help">Help & FAQs</Link>
            </li>
            {user?.role === "admin" && (
              <li>
                <Link to="/admin/dashboard">Admin console</Link>
              </li>
            )}
          </ul>
        </div>
      </div>
      <p className="mx-auto max-w-7xl border-t border-white/10 px-6 py-5 text-xs text-slate-400">
        © {new Date().getFullYear()} Rent-A-Way
      </p>
    </footer>
  );
}
