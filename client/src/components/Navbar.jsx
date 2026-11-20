import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import {
  Menu,
  X,
  ChevronDown,
  User,
  Bell,
  MessageCircle,
  Download,
} from "lucide-react";
import { useState, useEffect } from "react";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "../api/notifications";
import { getCategories } from "../api/products";
import { useSocket } from "../context/SocketContext";
import { apiAssetUrl } from "../config";
import InstallAppDialog from "./InstallAppDialog";

const CATEGORIES = [
  {
    id: "Cameras",
    label: "Cameras & Drones",
    to: "/browse?category=Cameras",
    icon: "/category-icons/camera.png",
  },
  {
    id: "Camping",
    label: "Camping Equipment",
    to: "/browse?category=Camping",
    icon: "/category-icons/mountain.png",
  },
  {
    id: "Sports",
    label: "Sports Equipment",
    to: "/browse?category=Sports",
    icon: "/category-icons/bicycle.png",
  },
  {
    id: "Event",
    label: "Event Equipment",
    to: "/browse?category=Event",
    icon: "/category-icons/calendar.png",
  },
  {
    id: "Household",
    label: "Household Equipment",
    to: "/browse?category=Household",
    icon: "/category-icons/wrench.png",
  },
  {
    id: "School",
    label: "School Project Equipment",
    to: "/browse?category=School",
    icon: "/category-icons/book.png",
  },
  {
    id: "Vehicles",
    label: "Vehicles",
    to: "/browse?category=Vehicles",
    icon: "/category-icons/car.png",
  },
  {
    id: "Apartments",
    label: "Apartments",
    to: "/browse?category=Apartments",
    icon: "/category-icons/apartment.png",
  },
];

export default function Navbar({ workspaceRole }) {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationPage, setNotificationPage] = useState(1);
  const [moreNotifications, setMoreNotifications] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [categoryCounts, setCategoryCounts] = useState({});
  const { pathname, search: locationSearch } = useLocation();
  useEffect(() => {
    setIsOpen(false);
    setCatOpen(false);
    setNotifOpen(false);
    setProfileOpen(false);
  }, [pathname, locationSearch]);

  function disclosure(setOpen) {
    return {
      onBlur: (event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      },
      onKeyDown: (event) => {
        if (event.key === "Escape") {
          setOpen(false);
          event.currentTarget.querySelector("button")?.focus();
        }
      },
    };
  }

  const { socket } = useSocket();

  useEffect(() => {
    getCategories()
      .then((res) => {
        const countsMap = {};
        (res.data?.data || []).forEach((c) => {
          countsMap[c.name] = c.count;
        });
        setCategoryCounts(countsMap);
      })
      .catch(() => {});
  }, []);

  const fetchNotifications = (page = 1) => {
    if (user) {
      setLoadingNotifications(true);
      getNotifications({ page, limit: 20 })
        .then((res) => {
          setNotifications((previous) =>
            page === 1
              ? res.data.data.notifications
              : [
                  ...previous,
                  ...res.data.data.notifications.filter(
                    (item) => !previous.some((old) => old.id === item.id),
                  ),
                ],
          );
          setUnreadCount(res.data.data.unreadCount);
          setNotificationPage(page);
          setMoreNotifications(res.data.data.hasMore);
        })
        .catch(() => toast.error("Could not load notifications."))
        .finally(() => setLoadingNotifications(false));
    }
  };

  const [installPrompt, setInstallPrompt] = useState(null);
  const [installHelpOpen, setInstallHelpOpen] = useState(false);
  const [isAppInstalled, setIsAppInstalled] = useState(
    () =>
      typeof window !== "undefined" &&
      (window.matchMedia("(display-mode: standalone)").matches ||
        window.navigator.standalone === true),
  );

  useEffect(() => {
    fetchNotifications();

    if (socket) {
      const refresh = () => fetchNotifications();
      socket.on("connect", refresh);
      socket.on("new_notification", (notif) => {
        setNotifications((prev) => [notif, ...prev]);
        setUnreadCount((prev) => prev + 1);
      });

      return () => {
        socket.off("connect", refresh);
        socket.off("new_notification");
      };
    }
  }, [user, socket]);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    const handleAppInstalled = () => {
      setIsAppInstalled(true);
      setInstallPrompt(null);
      setInstallHelpOpen(false);
      toast.success("Rent-A-Way was added to your device.");
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) {
      setInstallHelpOpen(true);
      setIsOpen(false);
      return;
    }
    try {
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      setInstallPrompt(null);
      if (outcome === "accepted") setIsAppInstalled(true);
      else setInstallHelpOpen(true);
    } catch {
      setInstallPrompt(null);
      setInstallHelpOpen(true);
    }
  };

  if (
    /^\/(register(?:-renter|-supplier)?|choose-role|login|forgot-password|reset-password)(\/|$)/.test(
      pathname,
    )
  ) {
    return (
      <nav
        aria-label="Account navigation"
        className="border-b border-slate-200 bg-white"
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Link
            to="/"
            className="flex items-center gap-2 font-bold text-slate-900"
          >
            <img
              src="/logo.png"
              alt="Rent-A-Way"
              className="h-9 w-9 object-contain"
            />
            Rent-A-Way
          </Link>
          <Link
            to="/browse"
            className="text-sm font-medium text-slate-600 hover:text-blue-800"
          >
            Back to browse
          </Link>
        </div>
      </nav>
    );
  }

  return (
    <nav
      className={
        workspaceRole
          ? "ledger-header sticky top-0 z-50 text-white"
          : "bg-[#0f1729] text-white shadow-md sticky top-0 z-50"
      }
      onKeyDown={(event) => {
        if (event.key === "Escape" && isOpen) {
          setIsOpen(false);
          event.currentTarget
            .querySelector("[aria-controls=mobile-navigation]")
            ?.focus();
        }
      }}
    >
      <div
        className={
          workspaceRole
            ? "ledger-header-inner"
            : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
        }
      >
        <div
          className={
            workspaceRole
              ? "ledger-header-row"
              : "flex items-center justify-between h-16"
          }
        >
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2.5 flex-shrink-0 group"
          >
            <img
              src="/logo.png"
              alt="Rent-A-Way Logo"
              className={`${workspaceRole ? "w-12 h-12" : "w-10 h-10"} object-contain drop-shadow-sm group-hover:scale-105 transition-transform`}
            />

            <div className="leading-none">
              <div className="font-bold text-white text-base tracking-tight">
                Rent-A-Way
              </div>
              <div className="sr-only">Find Better Ways to Save</div>
            </div>
          </Link>

          {workspaceRole && (
            <span className="ledger-role-label">
              {workspaceRole === "customer"
                ? "Renter"
                : workspaceRole === "supplier"
                  ? "Supplier"
                  : "Admin"}{" "}
              workspace
            </span>
          )}
          <div
            className={
              workspaceRole
                ? "ledger-public-links hidden lg:flex"
                : "hidden lg:flex items-center gap-6 text-sm font-medium"
            }
          >
            <Link
              to="/browse"
              className={
                pathname === "/browse"
                  ? "text-amber-300"
                  : "text-slate-200 hover:text-white"
              }
            >
              Browse rentals
            </Link>
            <Link
              to="/map"
              className={
                pathname === "/map"
                  ? "text-amber-300"
                  : "text-slate-200 hover:text-white"
              }
            >
              Roxas map
            </Link>
            <Link
              to="/how-it-works"
              className="text-slate-200 hover:text-white"
            >
              How it works
            </Link>
            <Link to="/community" className="text-slate-200 hover:text-white">
              Community
            </Link>
            {!isAppInstalled && (
              <button
                type="button"
                onClick={handleInstallClick}
                aria-label="Install Rent-A-Way"
                title="Install Rent-A-Way"
                className="p-2 text-slate-300 hover:text-white"
              >
                <Download size={17} />
              </button>
            )}
          </div>

          {/* Desktop Auth Buttons */}
          <div
            className={
              workspaceRole
                ? "ledger-account-tools flex items-center gap-1 sm:gap-3"
                : "hidden lg:flex items-center gap-3"
            }
          >
            {user && user.role === "customer" && (
              <Link
                to="/customer/favorites"
                className="text-gray-300 hover:text-white transition p-2 relative"
                title="Favorites"
              >
                <svg
                  className="w-5 h-5 text-gray-300 hover:text-red-400 transition"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
              </Link>
            )}

            {!user ? (
              <>
                <Link
                  to="/login"
                  className="flex items-center gap-1.5 border border-gray-500 text-gray-200 hover:border-white hover:text-white text-sm font-medium px-4 py-2 rounded-lg transition"
                >
                  <User className="w-4 h-4" /> Sign in
                </Link>
                <Link
                  to="/register-supplier"
                  className="flex items-center gap-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 text-sm font-semibold px-4 py-2 rounded-lg transition"
                >
                  <span aria-hidden="true">+</span> List a rental
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/messages"
                  aria-label="Messages"
                  className="text-gray-300 hover:text-white transition p-2 relative"
                >
                  <MessageCircle className="w-5 h-5" />
                </Link>

                <div className="relative" {...disclosure(setNotifOpen)}>
                  <button
                    aria-label={
                      unreadCount
                        ? `Notifications, ${unreadCount} unread`
                        : "Notifications"
                    }
                    aria-expanded={notifOpen}
                    onClick={() => setNotifOpen(!notifOpen)}
                    className="text-gray-300 hover:text-white transition p-2 relative"
                  >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#0f1729]"></span>
                    )}
                  </button>
                  {notifOpen && (
                    <div className="ledger-notifications menu-enter [--enter-offset:-4px] absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                        <span className="font-bold text-gray-900">
                          Notifications
                        </span>
                        <button
                          onClick={() =>
                            markAllNotificationsRead()
                              .then(() => fetchNotifications())
                              .catch(() =>
                                toast.error("Could not update notifications."),
                              )
                          }
                          className="text-xs text-[#1e3a8a] hover:underline"
                        >
                          Mark all read
                        </button>
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="p-4 text-center text-sm text-gray-500">
                            No notifications
                          </div>
                        ) : (
                          notifications.map((n) => (
                            <Link
                              key={n.id}
                              to={n.link || "/"}
                              onClick={() => {
                                markNotificationRead(n.id)
                                  .then(() => fetchNotifications())
                                  .catch(() =>
                                    toast.error(
                                      "Could not update notification.",
                                    ),
                                  );
                                setNotifOpen(false);
                              }}
                              className={`block px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition ${n.is_read ? "opacity-60" : "bg-blue-50/30"}`}
                            >
                              <div className="font-semibold text-sm text-gray-900">
                                {n.title}
                              </div>
                              <div className="text-xs text-gray-600 mt-0.5">
                                {n.message}
                              </div>
                            </Link>
                          ))
                        )}
                        {moreNotifications && (
                          <button
                            disabled={loadingNotifications}
                            onClick={() =>
                              fetchNotifications(notificationPage + 1)
                            }
                            className="w-full py-3 text-sm text-blue-800"
                          >
                            {loadingNotifications
                              ? "Loading…"
                              : "Load earlier notifications"}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="relative" {...disclosure(setProfileOpen)}>
                  <button
                    onClick={() => setProfileOpen(!profileOpen)}
                    aria-expanded={profileOpen}
                    aria-label="Account menu"
                    className="flex items-center gap-2 bg-[#1a2744] hover:bg-[#1e2f50] border border-[#2a3a5c] px-3 py-1.5 rounded-full transition"
                  >
                    {user.avatar ? (
                      <img
                        src={apiAssetUrl(user.avatar)}
                        alt="Avatar"
                        className="w-6 h-6 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center text-[10px] font-bold text-white">
                        {user.name?.charAt(0)}
                      </div>
                    )}
                    <span
                      className={
                        workspaceRole
                          ? "hidden text-sm font-medium text-gray-200 sm:inline"
                          : "text-sm font-medium text-gray-200"
                      }
                    >
                      {user.name?.split(" ")[0]}
                    </span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-gray-400 transition-transform ${profileOpen ? "rotate-180" : ""}`}
                    />
                  </button>

                  {profileOpen && (
                    <div className="menu-enter [--enter-offset:-4px] absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50">
                      <div className="px-4 py-3 border-b border-gray-100">
                        <div className="font-bold text-gray-900 text-sm truncate">
                          {user.name}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {user.email}
                        </div>
                      </div>

                      <div className="py-1">
                        <Link
                          to={`/${user.role}/dashboard`}
                          onClick={() => setProfileOpen(false)}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#1e3a8a] transition"
                        >
                          Dashboard
                        </Link>
                        <Link
                          to={`/${user.role}/settings`}
                          onClick={() => setProfileOpen(false)}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#1e3a8a] transition"
                        >
                          Account settings
                        </Link>
                        {user.role === "customer" && (
                          <Link
                            to="/customer/rentals"
                            onClick={() => setProfileOpen(false)}
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#1e3a8a] transition"
                          >
                            My Rentals
                          </Link>
                        )}
                        {user.role === "supplier" && (
                          <Link
                            to="/supplier/products"
                            onClick={() => setProfileOpen(false)}
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#1e3a8a] transition"
                          >
                            My Listings
                          </Link>
                        )}
                      </div>

                      <div className="py-1 border-t border-gray-100">
                        <button
                          onClick={() => {
                            logout();
                            setProfileOpen(false);
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition"
                        >
                          Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className={`ledger-header-menu lg:hidden text-gray-300 hover:text-white p-2 ${user ? "hidden" : ""}`}
            aria-label={isOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={isOpen}
            aria-controls="mobile-navigation"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && !user && (
        <div
          id="mobile-navigation"
          className="menu-enter [--enter-offset:-4px] lg:hidden max-h-[calc(100dvh-8rem-env(safe-area-inset-bottom))] overflow-y-auto overscroll-contain bg-[#0f1729] border-t border-gray-700 px-4 py-4 space-y-2"
        >
          <Link
            to="/"
            className="block text-gray-300 hover:text-white py-2 text-sm"
            onClick={() => setIsOpen(false)}
          >
            Home
          </Link>

          <div>
            <button
              className="flex items-center gap-1 text-gray-300 hover:text-white text-sm py-2 w-full"
              aria-expanded={catOpen}
              aria-controls="mobile-categories"
              onClick={() => setCatOpen(!catOpen)}
            >
              Categories{" "}
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform ${catOpen ? "rotate-180" : ""}`}
              />
            </button>
            {catOpen && (
              <div
                id="mobile-categories"
                className="mt-1 grid grid-cols-1 gap-1 pl-2"
              >
                {CATEGORIES.map((cat) => {
                  return (
                    <Link
                      key={cat.to}
                      to={cat.to}
                      className="flex items-center gap-2.5 py-2 px-2 rounded-lg hover:bg-[#1a2744] transition"
                      onClick={() => {
                        setCatOpen(false);
                        setIsOpen(false);
                      }}
                    >
                      <img
                        src={cat.icon}
                        alt=""
                        className="h-8 w-8 flex-shrink-0 object-contain"
                      />
                      <div>
                        <div className="text-xs font-semibold text-gray-200">
                          {cat.label}
                        </div>
                        <div className="text-[10px] text-gray-500">
                          {categoryCounts[cat.id] || 0} items
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          <Link
            to="/map"
            className="block py-2 text-sm text-gray-300"
            onClick={() => setIsOpen(false)}
          >
            Roxas map
          </Link>
          <Link
            to="/how-it-works"
            onClick={() => setIsOpen(false)}
            className="block text-gray-300 hover:text-white py-2 text-sm"
          >
            How it works
          </Link>
          {!user && (
            <Link
              to="/for-suppliers"
              className="block text-gray-300 hover:text-white py-2 text-sm"
              onClick={() => setIsOpen(false)}
            >
              For Suppliers
            </Link>
          )}
          <Link
            to="/community"
            className="block text-gray-300 hover:text-white py-2 text-sm"
            onClick={() => setIsOpen(false)}
          >
            Community
          </Link>

          {!isAppInstalled && (
            <button
              type="button"
              onClick={handleInstallClick}
              className="flex min-h-12 w-full items-center gap-3 rounded-xl border border-blue-400/30 bg-blue-500/10 px-3 text-left text-sm font-semibold text-white transition hover:bg-blue-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/20 text-blue-200">
                <Download className="h-4 w-4" aria-hidden="true" />
              </span>
              <span>Install Rent-A-Way</span>
            </button>
          )}

          {!user ? (
            <div className="flex flex-col gap-2 pt-2 border-t border-gray-700 mt-2">
              <Link
                to="/login"
                className="text-center border border-gray-500 text-gray-200 text-sm font-medium px-4 py-2 rounded-lg"
                onClick={() => setIsOpen(false)}
              >
                Sign in
              </Link>
              <Link
                to="/register-supplier"
                className="text-center bg-amber-400 text-slate-950 hover:bg-amber-300 text-sm font-semibold px-4 py-2 rounded-lg"
                onClick={() => setIsOpen(false)}
              >
                List a rental
              </Link>
            </div>
          ) : (
            <div className="flex flex-col border-t border-gray-700 mt-2 pt-2">
              <div className="flex items-center gap-3 py-3 px-2 mb-2 bg-[#1a2744] rounded-lg">
                {user.avatar ? (
                  <img
                    src={apiAssetUrl(user.avatar)}
                    alt="Avatar"
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-xs font-bold text-white">
                    {user.name?.charAt(0)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold text-white leading-tight">
                    {user.name}
                  </div>
                  <div className="truncate text-[10px] text-gray-400">
                    {user.email}
                  </div>
                </div>
              </div>

              <Link
                to={`/${user.role}/dashboard`}
                className="block text-gray-300 hover:text-white py-2.5 px-2 text-sm"
                onClick={() => setIsOpen(false)}
              >
                Dashboard
              </Link>
              {user.role === "customer" && (
                <Link
                  to="/customer/rentals"
                  className="block text-gray-300 hover:text-white py-2.5 px-2 text-sm"
                  onClick={() => setIsOpen(false)}
                >
                  My Rentals
                </Link>
              )}
              {user.role === "supplier" && (
                <Link
                  to="/supplier/products"
                  className="block text-gray-300 hover:text-white py-2.5 px-2 text-sm"
                  onClick={() => setIsOpen(false)}
                >
                  My Listings
                </Link>
              )}

              <button
                onClick={() => {
                  logout();
                  setIsOpen(false);
                }}
                className="block text-red-400 hover:text-red-300 py-2.5 px-2 text-sm w-full text-left mt-2 border-t border-gray-700"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      )}
      {installHelpOpen && (
        <InstallAppDialog onClose={() => setInstallHelpOpen(false)} />
      )}
    </nav>
  );
}
