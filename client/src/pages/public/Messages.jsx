import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContext";
import api from "../../api/axios";
import {
  MessageCircle,
  Send,
  ArrowLeft,
  Search,
  Image as ImageIcon,
  MapPin,
  Package,
  MoreVertical,
  X,
  Check,
  CheckCheck,
  Flag,
  Ban,
  ChevronRight,
  ZoomIn,
  ExternalLink,
  Reply,
  Loader2,
  AlertCircle,
  CornerUpLeft,
} from "lucide-react";
import LoadingSpinner from "../../components/LoadingSpinner";
import toast from "react-hot-toast";
import { API_ORIGIN, apiAssetUrl } from "../../config";

const BASE_URL = API_ORIGIN;

// ── Time helpers ─────────────────────────────────────────────────────────────
function timeAgo(iso) {
  if (!iso) return "";
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function formatTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatConvTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return formatTime(iso);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

// ── Avatar component ─────────────────────────────────────────────────────────
function Avatar({ user, size = 10, showOnline = false, isOnline = false }) {
  const px =
    { 8: "w-8 h-8", 10: "w-10 h-10", 12: "w-12 h-12" }[size] || "w-10 h-10";
  const dot =
    { 8: "w-2 h-2", 10: "w-2.5 h-2.5", 12: "w-3 h-3" }[size] || "w-2.5 h-2.5";
  return (
    <div className="relative flex-shrink-0">
      {user?.avatar ? (
        <img
          src={
            user.avatar.startsWith("http")
              ? user.avatar
              : apiAssetUrl(user.avatar)
          }
          className={`${px} rounded-full object-cover`}
          alt={user.name}
        />
      ) : (
        <div
          className={`${px} rounded-full bg-gradient-to-br from-[#1e3a8a] to-blue-400 flex items-center justify-center text-white font-bold text-sm`}
        >
          {user?.name?.charAt(0)?.toUpperCase() || "?"}
        </div>
      )}
      {showOnline && (
        <span
          className={`absolute bottom-0 right-0 ${dot} rounded-full border-2 border-white ${isOnline ? "bg-emerald-500" : "bg-gray-400"}`}
        />
      )}
    </div>
  );
}

// ── Read receipt icon ─────────────────────────────────────────────────────────
function ReadReceipt({ msg }) {
  if (msg.read_at)
    return <CheckCheck className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />;
  if (msg.delivered_at)
    return <CheckCheck className="w-3.5 h-3.5 text-blue-200 flex-shrink-0" />;
  return <Check className="w-3.5 h-3.5 text-blue-200 flex-shrink-0" />;
}

// ── Equipment Card in chat ────────────────────────────────────────────────────
function EquipmentCard({ data, isMine }) {
  if (!data) return null;
  let eq;
  try {
    eq = typeof data === "string" ? JSON.parse(data) : data;
  } catch {
    return null;
  }
  const img = eq.primary_image
    ? apiAssetUrl(eq.primary_image)
    : "/placeholder.svg";
  const avail =
    eq.availability === "available"
      ? "bg-emerald-100 text-emerald-700"
      : "bg-amber-100 text-amber-700";
  return (
    <Link
      to={`/product/${eq.id}`}
      className={`block w-52 rounded-xl overflow-hidden border ${isMine ? "border-blue-400/40 bg-blue-700/30" : "border-gray-200 bg-white"} shadow-sm hover:shadow-md transition`}
    >
      <img src={img} alt={eq.title} className="w-full h-28 object-cover" />
      <div className="p-2.5">
        <div className="flex items-start justify-between gap-1 mb-1.5">
          <h4
            className={`font-bold text-xs leading-tight line-clamp-2 ${isMine ? "text-white" : "text-gray-900"}`}
          >
            {eq.title}
          </h4>
          <span
            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap flex-shrink-0 ${avail}`}
          >
            {eq.availability || "Available"}
          </span>
        </div>
        <div
          className={`text-xs font-extrabold mb-1 ${isMine ? "text-amber-300" : "text-[#1e3a8a]"}`}
        >
          ₱{Number(eq.price_per_day || 0).toLocaleString()}/day
        </div>
        {eq.barangay && (
          <div
            className={`flex items-center gap-1 text-[10px] mb-2 ${isMine ? "text-blue-200" : "text-gray-500"}`}
          >
            <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
            <span className="truncate">Brgy. {eq.barangay}</span>
          </div>
        )}
        <div
          className={`text-center text-[11px] font-semibold py-1 rounded-lg ${isMine ? "bg-white/20 text-white" : "bg-[#1e3a8a] text-white"}`}
        >
          View Equipment →
        </div>
      </div>
    </Link>
  );
}

// ── Location bubble in chat ───────────────────────────────────────────────────
function LocationBubble({ msg, isMine }) {
  const lat = msg.location_lat;
  const lng = msg.location_lng;
  const label = msg.location_label || "Shared Location";
  const mapUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}&zoom=15`;
  const gmUrl = `https://maps.google.com/?q=${lat},${lng}`;
  const thumb = `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=15&size=200x120&markers=${lat},${lng},lightblue`;
  return (
    <div
      className={`w-52 rounded-xl overflow-hidden border ${isMine ? "border-blue-400/40" : "border-gray-200 bg-white"} shadow-sm`}
    >
      <a href={gmUrl} target="_blank" rel="noreferrer">
        <img
          src={thumb}
          alt="map"
          className="w-full h-28 object-cover"
          onError={(e) => {
            e.target.src = "/placeholder.svg";
          }}
        />
      </a>
      <div className="p-2.5">
        <div
          className={`flex items-center gap-1 text-xs font-semibold mb-2 ${isMine ? "text-white" : "text-gray-800"}`}
        >
          <MapPin className="w-3 h-3 text-red-500 flex-shrink-0" />
          <span className="truncate">{label}</span>
        </div>
        <a
          href={gmUrl}
          target="_blank"
          rel="noreferrer"
          className={`flex items-center justify-center gap-1 text-[11px] font-semibold py-1 rounded-lg ${isMine ? "bg-white/20 text-white" : "bg-[#1e3a8a] text-white"}`}
        >
          <ExternalLink className="w-3 h-3" /> Open in Maps
        </a>
      </div>
    </div>
  );
}

// ── Report modal ──────────────────────────────────────────────────────────────
const REPORT_REASONS = [
  "Spam",
  "Fraudulent Listing",
  "Harassment",
  "Inappropriate Content",
  "Other",
];
function ReportModal({ user, onClose, onReport }) {
  const [reason, setReason] = useState("Spam");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900">Report {user?.name}</h3>
          <button onClick={onClose}>
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Select a reason for your report:
        </p>
        <div className="space-y-2 mb-5">
          {REPORT_REASONS.map((r) => (
            <label
              key={r}
              className="flex items-center gap-3 cursor-pointer p-2.5 rounded-xl hover:bg-gray-50"
            >
              <input
                type="radio"
                value={r}
                checked={reason === r}
                onChange={() => setReason(r)}
                className="accent-[#1e3a8a]"
              />
              <span className="text-sm text-gray-800">{r}</span>
            </label>
          ))}
        </div>
        <button
          onClick={() => onReport(reason)}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 rounded-xl transition text-sm"
        >
          Submit Report
        </button>
      </div>
    </div>
  );
}

// ── Image lightbox ────────────────────────────────────────────────────────────
function Lightbox({ src, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button className="absolute top-4 right-4 text-white" onClick={onClose}>
        <X className="w-7 h-7" />
      </button>
      <img
        src={src}
        alt="full size"
        className="max-w-full max-h-full rounded-xl object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

// ── Equipment picker modal ────────────────────────────────────────────────────
function EquipmentPicker({ onSelect, onClose }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api
      .get("/products/mine")
      .then((r) => setProducts(r.data?.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm max-h-[70vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900 text-sm">Share Equipment</h3>
          <button onClick={onClose}>
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loading ? (
            <div className="py-8 flex justify-center">
              <LoadingSpinner />
            </div>
          ) : products.length === 0 ? (
            <p className="text-center py-8 text-sm text-gray-400">
              No listings found.
            </p>
          ) : (
            products.map((p) => (
              <button
                key={p.id}
                onClick={() => onSelect(p.id)}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 border border-gray-100 text-left transition"
              >
                <img
                  src={
                    p.primary_image
                      ? apiAssetUrl(p.primary_image)
                      : "/placeholder.svg"
                  }
                  className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                  alt=""
                />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-gray-900 truncate">
                    {p.title}
                  </div>
                  <div className="text-xs text-[#1e3a8a] font-bold">
                    ₱{Number(p.price_per_day).toLocaleString()}/day
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Messages Page ────────────────────────────────────────────────────────
export default function Messages() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const directUserId = searchParams.get("userId") || searchParams.get("user");

  const [conversations, setConversations] = useState([]);
  const [filteredConvs, setFilteredConvs] = useState([]);
  const [loadingConv, setLoadingConv] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const [activeUser, setActiveUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [hasOlder, setHasOlder] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);

  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [lastSeen, setLastSeen] = useState({});
  const [typingUsers, setTypingUsers] = useState(new Set());

  const [replyTo, setReplyTo] = useState(null);
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showEquipmentPicker, setShowEquipmentPicker] = useState(false);
  const [blockStatus, setBlockStatus] = useState({
    iBlockedThem: false,
    theyBlockedMe: false,
  });

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeout = useRef(null);
  const messageRefs = useRef({});

  const { socket } = useSocket();

  // ── Fetch conversations ────────────────────────────────────────────────────
  const fetchConversations = useCallback(() => {
    api
      .get("/messages/conversations")
      .then((r) => {
        const list = r.data?.data || [];
        setConversations(list);
        setFilteredConvs(list);
        // Ask socket for online statuses of all conversation partners
        if (socket && list.length > 0) {
          socket.emit("check_online", {
            userIds: list.map((c) => c.other_user_id),
          });
        }
      })
      .catch(() => toast.error("Could not load conversations."))
      .finally(() => setLoadingConv(false));
  }, [socket]);

  // ── Conversation search ───────────────────────────────────────────────────
  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      setFilteredConvs(conversations);
      return;
    }
    setIsSearching(true);
    const timeout = setTimeout(() => {
      setFilteredConvs(
        conversations.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            (c.last_message || "").toLowerCase().includes(q),
        ),
      );
      setIsSearching(false);
    }, 250);
    return () => clearTimeout(timeout);
  }, [searchQuery, conversations]);

  // ── Socket events ─────────────────────────────────────────────────────────
  useEffect(() => {
    fetchConversations();
    if (!socket) return;

    const onNewMessage = (msg) => {
      setMessages((prev) => {
        if (
          activeUser &&
          (msg.sender_id === activeUser.other_user_id ||
            msg.receiver_id === activeUser.other_user_id)
        ) {
          setTimeout(
            () =>
              messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }),
            100,
          );
          // Mark delivered + read immediately since we're in the conversation
          socket.emit("messages_read", {
            senderId: msg.sender_id,
            readAt: new Date().toISOString(),
          });
          return prev.some((item) => item.id === msg.id)
            ? prev
            : [...prev, msg];
        }
        return prev;
      });
      fetchConversations();
    };

    const onTyping = ({ senderId }) =>
      setTypingUsers((p) => new Set([...p, senderId]));
    const onStopTyping = ({ senderId }) =>
      setTypingUsers((p) => {
        const s = new Set(p);
        s.delete(senderId);
        return s;
      });
    const onUserOnline = ({ userId }) =>
      setOnlineUsers((p) => new Set([...p, userId]));
    const onUserOffline = ({ userId, lastSeen: ls }) => {
      setOnlineUsers((p) => {
        const s = new Set(p);
        s.delete(userId);
        return s;
      });
      setLastSeen((p) => ({ ...p, [userId]: ls }));
    };
    const onOnlineStatuses = (statuses) => {
      const online = new Set(
        Object.entries(statuses)
          .filter(([, v]) => v)
          .map(([k]) => k),
      );
      setOnlineUsers(online);
    };
    const onMessagesRead = ({ readerId, readAt }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.sender_id === user?.id && m.receiver_id === readerId && !m.read_at
            ? { ...m, read_at: readAt }
            : m,
        ),
      );
    };
    const onDelivered = ({ messageId, deliveredAt }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, delivered_at: deliveredAt } : m,
        ),
      );
    };

    const onReconnect = () => {
      fetchConversations();
      if (activeUser) openConversation(activeUser);
    };
    socket.on("connect", onReconnect);
    socket.on("new_message", onNewMessage);
    socket.on("typing", onTyping);
    socket.on("stop_typing", onStopTyping);
    socket.on("user_online", onUserOnline);
    socket.on("user_offline", onUserOffline);
    socket.on("online_statuses", onOnlineStatuses);
    socket.on("messages_read", onMessagesRead);
    socket.on("message_delivered", onDelivered);

    return () => {
      socket.off("connect", onReconnect);
      socket.off("new_message", onNewMessage);
      socket.off("typing", onTyping);
      socket.off("stop_typing", onStopTyping);
      socket.off("user_online", onUserOnline);
      socket.off("user_offline", onUserOffline);
      socket.off("online_statuses", onOnlineStatuses);
      socket.off("messages_read", onMessagesRead);
      socket.off("message_delivered", onDelivered);
    };
  }, [socket, activeUser, fetchConversations]);

  // ── Open direct conversation from URL param ───────────────────────────────
  useEffect(() => {
    if (directUserId && !loadingConv && !activeUser) {
      const match = conversations.find((c) => c.other_user_id === directUserId);
      if (match) openConversation(match);
      else {
        // Fetch user info and open new conversation
        api
          .get(`/auth/user/${directUserId}`)
          .then((r) => {
            const u = r.data?.data;
            if (u)
              openConversation({
                other_user_id: u.id,
                name: u.name,
                avatar: u.avatar,
                role: u.role,
                unread_count: 0,
              });
          })
          .catch(() => toast.error("This user is unavailable."));
      }
    }
  }, [directUserId, loadingConv]);

  // ── Open conversation ─────────────────────────────────────────────────────
  const openConversation = (otherUser) => {
    setActiveUser(otherUser);
    setReplyTo(null);
    setShowMenu(false);
    setLoadingMsgs(true);
    setHasOlder(false);
    setMessages([]);
    setConversations((prev) =>
      prev.map((c) =>
        c.other_user_id === otherUser.other_user_id
          ? { ...c, unread_count: 0 }
          : c,
      ),
    );
    // Fetch block status
    api
      .get(`/messages/block/status/${otherUser.other_user_id}`)
      .then((r) =>
        setBlockStatus(
          r.data?.data || { iBlockedThem: false, theyBlockedMe: false },
        ),
      )
      .catch(() => {});
    api
      .get(`/messages/${otherUser.other_user_id}`)
      .then((r) => {
        setMessages(r.data?.data || []);
        setHasOlder(Boolean(r.data.hasMore));
        setTimeout(
          () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }),
          100,
        );
        // Notify sender their messages are read
        if (socket)
          socket.emit("messages_read", {
            senderId: otherUser.other_user_id,
            readAt: new Date().toISOString(),
          });
      })
      .catch(() => toast.error("Could not load messages."))
      .finally(() => setLoadingMsgs(false));
  };

  const loadOlder = async () => {
    if (!activeUser || !messages.length || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const result = await api.get(`/messages/${activeUser.other_user_id}`, {
        params: { before: messages[0].id },
      });
      setMessages((previous) => [...result.data.data, ...previous]);
      setHasOlder(Boolean(result.data.hasMore));
    } catch {
      toast.error("Could not load earlier messages.");
    } finally {
      setLoadingOlder(false);
    }
  };

  // ── Typing ────────────────────────────────────────────────────────────────
  const handleTyping = (val) => {
    setNewMessage(val);
    if (!socket || !activeUser) return;
    if (val) {
      socket.emit("typing", { receiverId: activeUser.other_user_id });
      clearTimeout(typingTimeout.current);
      typingTimeout.current = setTimeout(
        () =>
          socket.emit("stop_typing", { receiverId: activeUser.other_user_id }),
        2000,
      );
    } else {
      socket.emit("stop_typing", { receiverId: activeUser.other_user_id });
    }
  };

  // ── Send text message ──────────────────────────────────────────────────────
  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeUser || sending) return;
    setSending(true);
    try {
      const payload = {
        receiver_id: activeUser.other_user_id,
        content: newMessage.trim(),
        type: "text",
      };
      if (replyTo) {
        payload.reply_to_id = replyTo.id;
        payload.reply_preview = replyTo.content?.slice(0, 100);
      }
      const res = await api.post("/messages", payload);
      if (res.data?.data) setMessages((prev) => [...prev, res.data.data]);
      setNewMessage("");
      setReplyTo(null);
      socket?.emit("stop_typing", { receiverId: activeUser.other_user_id });
      fetchConversations();
      setTimeout(
        () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }),
        100,
      );
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  // ── Send image ─────────────────────────────────────────────────────────────
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !activeUser) return;
    const fd = new FormData();
    fd.append("image", file);
    fd.append("receiver_id", activeUser.other_user_id);
    if (replyTo) {
      fd.append("reply_to_id", replyTo.id);
      fd.append("reply_preview", replyTo.content?.slice(0, 100));
    }
    try {
      const res = await api.post("/messages/image", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (res.data?.data) setMessages((prev) => [...prev, res.data.data]);
      setReplyTo(null);
      fetchConversations();
      setTimeout(
        () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }),
        100,
      );
    } catch (err) {
      toast.error(err.response?.data?.message || "Image upload failed");
    }
    e.target.value = "";
  };

  // ── Share location ─────────────────────────────────────────────────────────
  const handleShareLocation = () => {
    if (!navigator.geolocation) return toast.error("Geolocation not supported");
    const tid = toast.loading("Getting your location…");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        toast.dismiss(tid);
        try {
          const res = await api.post("/messages/location", {
            receiver_id: activeUser.other_user_id,
            location_lat: pos.coords.latitude.toFixed(6),
            location_lng: pos.coords.longitude.toFixed(6),
            location_label: "My current location",
          });
          if (res.data?.data) setMessages((prev) => [...prev, res.data.data]);
          fetchConversations();
          setTimeout(
            () =>
              messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }),
            100,
          );
        } catch {
          toast.error("Failed to share location");
        }
      },
      () => {
        toast.dismiss(tid);
        toast.error("Location permission denied");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  // ── Share equipment ────────────────────────────────────────────────────────
  const handleShareEquipment = async (equipmentId) => {
    setShowEquipmentPicker(false);
    try {
      const res = await api.post("/messages/equipment", {
        receiver_id: activeUser.other_user_id,
        equipment_id: equipmentId,
      });
      if (res.data?.data) setMessages((prev) => [...prev, res.data.data]);
      fetchConversations();
      setTimeout(
        () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }),
        100,
      );
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to share equipment");
    }
  };

  // ── Block / unblock ────────────────────────────────────────────────────────
  const handleBlock = async () => {
    setShowMenu(false);
    if (blockStatus.iBlockedThem) {
      await api.delete(`/messages/block/${activeUser.other_user_id}`);
      setBlockStatus((p) => ({ ...p, iBlockedThem: false }));
      toast.success("User unblocked");
    } else {
      await api.post("/messages/block", {
        blocked_id: activeUser.other_user_id,
        reason: "User blocked",
      });
      setBlockStatus((p) => ({ ...p, iBlockedThem: true }));
      toast.success("User blocked");
    }
  };

  // ── Report ─────────────────────────────────────────────────────────────────
  const handleReport = async (reason) => {
    setShowReport(false);
    try {
      await api.post("/admin/complaints", {
        reported_id: activeUser.other_user_id,
        subject: `User Report: ${reason}`,
        details: `Reported ${activeUser.name} for: ${reason}`,
      });
      toast.success("Report submitted. We will review shortly.");
    } catch {
      toast.error("Failed to submit report");
    }
  };

  // ── Scroll to replied message ──────────────────────────────────────────────
  const scrollToMessage = (msgId) => {
    const el = messageRefs.current[msgId];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-amber-400", "ring-offset-2");
      setTimeout(
        () => el.classList.remove("ring-2", "ring-amber-400", "ring-offset-2"),
        1500,
      );
    }
  };

  // ── Status label for active user ───────────────────────────────────────────
  const getStatus = (userId) => {
    if (typingUsers.has(userId))
      return { text: "Typing…", color: "text-blue-500", dot: "bg-emerald-500" };
    if (onlineUsers.has(userId))
      return {
        text: "Online",
        color: "text-emerald-600",
        dot: "bg-emerald-500",
      };
    const ls = lastSeen[userId];
    return {
      text: ls ? `Last seen ${timeAgo(ls)}` : "Offline",
      color: "text-gray-400",
      dot: "bg-gray-400",
    };
  };

  const isBlocked = blockStatus.iBlockedThem || blockStatus.theyBlockedMe;

  return (
    <div className="min-h-screen bg-[#f5f0e8] pt-6 pb-12">
      {lightboxSrc && (
        <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
      )}
      {showReport && (
        <ReportModal
          user={activeUser}
          onClose={() => setShowReport(false)}
          onReport={handleReport}
        />
      )}
      {showEquipmentPicker && (
        <EquipmentPicker
          onSelect={handleShareEquipment}
          onClose={() => setShowEquipmentPicker(false)}
        />
      )}

      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-[82vh] flex gap-4">
        {/* ── Sidebar ─────────────────────────────────────────────────────── */}
        <div
          className={`bg-white rounded-2xl border border-gray-200 flex flex-col overflow-hidden w-full md:w-80 flex-shrink-0 ${activeUser ? "hidden md:flex" : "flex"}`}
        >
          {/* Sidebar header */}
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-gray-900 text-base">Messages</h2>
              <MessageCircle className="w-5 h-5 text-gray-400" />
            </div>
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations…"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-4 py-2 text-sm outline-none focus:border-[#1e3a8a] transition"
              />

              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
              )}
            </div>
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto">
            {loadingConv ? (
              <div className="p-8 flex justify-center">
                <LoadingSpinner />
              </div>
            ) : filteredConvs.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-400">
                {searchQuery ? "No results found." : "No conversations yet."}
              </div>
            ) : (
              filteredConvs.map((conv) => {
                const status = getStatus(conv.other_user_id);
                const isActive =
                  activeUser?.other_user_id === conv.other_user_id;
                return (
                  <button
                    key={conv.other_user_id}
                    onClick={() => openConversation(conv)}
                    className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition flex items-center gap-3 ${isActive ? "bg-blue-50 border-l-2 border-l-[#1e3a8a]" : ""}`}
                  >
                    <Avatar
                      user={conv}
                      size={10}
                      showOnline
                      isOnline={onlineUsers.has(conv.other_user_id)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span
                          className={`font-semibold text-sm truncate ${conv.unread_count > 0 ? "text-gray-900" : "text-gray-800"}`}
                        >
                          {conv.name}
                        </span>
                        <div className="flex items-center gap-1.5 flex-shrink-0 ml-1">
                          {conv.unread_count > 0 && (
                            <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                              {conv.unread_count}
                            </span>
                          )}
                          <span className="text-[10px] text-gray-400">
                            {formatConvTime(conv.last_message_time)}
                          </span>
                        </div>
                      </div>
                      <div
                        className={`flex items-center gap-1 text-[10px] mb-0.5 ${status.color}`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${status.dot}`}
                        />
                        {status.text}
                      </div>
                      <p
                        className={`text-xs truncate ${conv.unread_count > 0 ? "text-gray-900 font-medium" : "text-gray-400"}`}
                      >
                        {conv.last_message_type === "image"
                          ? "📷 Image"
                          : conv.last_message_type === "equipment_card"
                            ? "📦 Equipment listing"
                            : conv.last_message_type === "location"
                              ? "📍 Location"
                              : conv.last_message || "No messages yet"}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ── Chat area ───────────────────────────────────────────────────── */}
        <div
          className={`bg-white rounded-2xl border border-gray-200 flex-1 flex flex-col overflow-hidden ${!activeUser ? "hidden md:flex" : "flex"}`}
        >
          {!activeUser ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50/50">
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <MessageCircle className="w-10 h-10 text-gray-300" />
              </div>
              <p className="font-semibold text-gray-600 mb-1">Your Messages</p>
              <p className="text-sm">Select a conversation to start chatting</p>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3 bg-white shadow-sm z-10">
                <button
                  onClick={() => {
                    setActiveUser(null);
                    setMessages([]);
                  }}
                  className="md:hidden p-1.5 -ml-1 text-gray-500 hover:text-gray-900"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <Avatar
                  user={activeUser}
                  size={10}
                  showOnline
                  isOnline={onlineUsers.has(activeUser.other_user_id)}
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 text-sm truncate">
                    {activeUser.name}
                  </h3>
                  <div
                    className={`text-xs ${getStatus(activeUser.other_user_id).color} flex items-center gap-1`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${getStatus(activeUser.other_user_id).dot}`}
                    />
                    {getStatus(activeUser.other_user_id).text}
                  </div>
                </div>
                {/* Header menu */}
                <div className="relative">
                  <button
                    onClick={() => setShowMenu((v) => !v)}
                    className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>
                  {showMenu && (
                    <div className="absolute right-0 top-10 bg-white border border-gray-200 rounded-xl shadow-lg z-30 min-w-[180px] overflow-hidden">
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          setShowReport(true);
                        }}
                        className="flex items-center gap-2.5 w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition"
                      >
                        <Flag className="w-4 h-4" /> Report User
                      </button>
                      <button
                        onClick={handleBlock}
                        className="flex items-center gap-2.5 w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition border-t border-gray-100"
                      >
                        <Ban className="w-4 h-4" />{" "}
                        {blockStatus.iBlockedThem
                          ? "Unblock User"
                          : "Block User"}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Blocked banner */}
              {isBlocked && (
                <div className="mx-4 mt-3 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 flex items-center gap-2 text-sm text-red-700">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {blockStatus.theyBlockedMe
                    ? "You cannot message this user."
                    : "You have blocked this user. Unblock to send messages."}
                </div>
              )}

              {/* Messages list */}
              <div
                className="flex-1 overflow-y-auto p-4 bg-[#fcfbfa] space-y-1"
                onClick={() => setShowMenu(false)}
              >
                {hasOlder && (
                  <button
                    type="button"
                    className="btn-secondary mx-auto block"
                    disabled={loadingOlder}
                    onClick={loadOlder}
                  >
                    {loadingOlder ? "Loading…" : "Load earlier messages"}
                  </button>
                )}
                {loadingMsgs ? (
                  <div className="flex justify-center py-12">
                    <LoadingSpinner />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <MessageCircle className="w-10 h-10 mx-auto mb-2 text-gray-200" />
                    <p className="text-sm">No messages yet. Say hello! 👋</p>
                  </div>
                ) : (
                  messages.map((msg, idx) => {
                    const isMine = msg.sender_id === user?.id;
                    const isSystem = msg.type === "system";
                    const showDate =
                      idx === 0 ||
                      new Date(msg.created_at).toDateString() !==
                        new Date(messages[idx - 1].created_at).toDateString();

                    return (
                      <div
                        key={msg.id}
                        ref={(el) => (messageRefs.current[msg.id] = el)}
                      >
                        {/* Date separator */}
                        {showDate && (
                          <div className="flex items-center gap-3 my-4">
                            <div className="flex-1 h-px bg-gray-200" />
                            <span className="text-[10px] text-gray-400 font-semibold px-2">
                              {new Date(msg.created_at).toLocaleDateString([], {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                            <div className="flex-1 h-px bg-gray-200" />
                          </div>
                        )}

                        {/* System message */}
                        {isSystem ? (
                          <div className="flex justify-center my-2">
                            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium px-4 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm">
                              <span className="text-amber-500">●</span>
                              {msg.content}
                            </div>
                          </div>
                        ) : (
                          <div
                            className={`flex items-end gap-2 mb-1 group ${isMine ? "justify-end" : "justify-start"}`}
                            onMouseEnter={() => {}}
                          >
                            {/* Other user avatar */}
                            {!isMine && <Avatar user={activeUser} size={8} />}

                            <div
                              className={`flex flex-col ${isMine ? "items-end" : "items-start"} max-w-[75%]`}
                            >
                              {/* Reply-to preview */}
                              {msg.reply_to_id && msg.reply_preview && (
                                <button
                                  onClick={() =>
                                    scrollToMessage(msg.reply_to_id)
                                  }
                                  className={`mb-1 px-3 py-1.5 rounded-lg text-[11px] border-l-2 flex items-center gap-1.5 max-w-full text-left ${
                                    isMine
                                      ? "bg-blue-700/40 border-blue-300 text-blue-200"
                                      : "bg-gray-100 border-gray-400 text-gray-500"
                                  }`}
                                >
                                  <CornerUpLeft className="w-3 h-3 flex-shrink-0" />
                                  <span className="truncate">
                                    {msg.reply_preview}
                                  </span>
                                </button>
                              )}

                              {/* Bubble */}
                              <div
                                className={`relative rounded-2xl ${isMine ? "bg-[#1e3a8a] text-white rounded-br-sm" : "bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm"} ${msg.type === "image" || msg.type === "equipment_card" || msg.type === "location" ? "p-1.5" : "px-4 py-2.5"}`}
                              >
                                {/* Reply button on hover */}
                                <button
                                  onClick={() => setReplyTo(msg)}
                                  className={`absolute -top-2 ${isMine ? "left-0 -translate-x-full pr-2" : "right-0 translate-x-full pl-2"} opacity-0 group-hover:opacity-100 transition-opacity`}
                                  title="Reply"
                                >
                                  <Reply className="w-4 h-4 text-gray-400 hover:text-[#1e3a8a]" />
                                </button>

                                {/* Image message */}
                                {msg.type === "image" && msg.image_url && (
                                  <div
                                    className="relative cursor-pointer"
                                    onClick={() =>
                                      setLightboxSrc(apiAssetUrl(msg.image_url))
                                    }
                                  >
                                    <img
                                      src={apiAssetUrl(msg.image_url)}
                                      alt="chat image"
                                      className="max-w-[220px] max-h-[200px] rounded-xl object-cover"
                                    />

                                    <div className="absolute inset-0 rounded-xl flex items-center justify-center bg-black/0 hover:bg-black/20 transition">
                                      <ZoomIn className="w-6 h-6 text-white opacity-0 hover:opacity-100" />
                                    </div>
                                  </div>
                                )}

                                {/* Equipment card message */}
                                {msg.type === "equipment_card" && (
                                  <EquipmentCard
                                    data={msg.equipment_data}
                                    isMine={isMine}
                                  />
                                )}

                                {/* Location message */}
                                {msg.type === "location" && (
                                  <LocationBubble msg={msg} isMine={isMine} />
                                )}

                                {/* Text message */}
                                {msg.type === "text" && (
                                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                                    {msg.content}
                                  </div>
                                )}
                              </div>

                              {/* Timestamp + receipt */}
                              <div
                                className={`flex items-center gap-1 mt-0.5 px-1 ${isMine ? "flex-row-reverse" : "flex-row"}`}
                              >
                                <span className="text-[10px] text-gray-400">
                                  {formatTime(msg.created_at)}
                                </span>
                                {isMine && <ReadReceipt msg={msg} />}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply preview bar */}
              {replyTo && (
                <div className="px-4 py-2 bg-blue-50 border-t border-blue-100 flex items-center gap-3">
                  <CornerUpLeft className="w-4 h-4 text-[#1e3a8a] flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-semibold text-[#1e3a8a] mb-0.5">
                      Replying to{" "}
                      {replyTo.sender_id === user?.id
                        ? "yourself"
                        : activeUser.name}
                    </div>
                    <div className="text-xs text-gray-600 truncate">
                      {replyTo.content || "📷 Image"}
                    </div>
                  </div>
                  <button
                    onClick={() => setReplyTo(null)}
                    className="p-1 text-gray-400 hover:text-gray-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Input bar */}
              <div className="p-3 bg-white border-t border-gray-100">
                <form onSubmit={handleSend} className="flex items-end gap-2">
                  {/* Attachment menu */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {/* Image upload */}
                    <label
                      title="Send image"
                      className="p-2.5 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-[#1e3a8a] transition cursor-pointer"
                    >
                      <ImageIcon className="w-5 h-5" />
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={handleImageUpload}
                        disabled={isBlocked}
                      />
                    </label>
                    {/* Location */}
                    <button
                      type="button"
                      title="Share location"
                      onClick={handleShareLocation}
                      disabled={isBlocked}
                      className="p-2.5 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-red-500 transition"
                    >
                      <MapPin className="w-5 h-5" />
                    </button>
                    {/* Equipment (supplier only or if has products) */}
                    {(user?.role === "supplier" || user?.role === "admin") && (
                      <button
                        type="button"
                        title="Share equipment"
                        onClick={() => setShowEquipmentPicker(true)}
                        disabled={isBlocked}
                        className="p-2.5 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-[#1e3a8a] transition"
                      >
                        <Package className="w-5 h-5" />
                      </button>
                    )}
                  </div>

                  {/* Text input */}
                  <textarea
                    rows={1}
                    value={newMessage}
                    onChange={(e) => handleTyping(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend(e);
                      }
                    }}
                    placeholder={
                      isBlocked
                        ? "Messaging is unavailable."
                        : "Type a message…"
                    }
                    disabled={isBlocked}
                    className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#1e3a8a] transition resize-none max-h-28 overflow-y-auto disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ scrollbarWidth: "none" }}
                  />

                  {/* Send button */}
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || sending || isBlocked}
                    className="bg-[#1e3a8a] text-white p-3 rounded-xl hover:bg-[#1d4ed8] disabled:opacity-40 transition flex items-center justify-center flex-shrink-0"
                  >
                    {sending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
