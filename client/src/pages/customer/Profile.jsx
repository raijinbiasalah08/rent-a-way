import WorkspacePage from "../../components/WorkspacePage";
import { apiAssetUrl } from "../../config";
import { clearToken } from "../../utils/session";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { updateProfile, uploadAvatar, updatePassword } from "../../api/auth";
import { useCustomerLocation } from "../../context/CustomerLocationContext";
import LocationPicker from "../../components/LocationPicker";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Camera,
  Save,
  Shield,
  KeyRound,
  Lock,
  Check,
  Key,
} from "lucide-react";
import toast from "react-hot-toast";
import { API_ORIGIN } from "../../config";

const BASE_URL = API_ORIGIN;

export default function Profile() {
  const { user, updateUser } = useAuth();
  const { setCustomerCoords } = useCustomerLocation();
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    address: "",
    barangay: "",
    latitude: null,
    longitude: null,
  });
  const [loading, setLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);

  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        phone: user.phone || "",
        address: user.address || "",
        barangay: user.barangay || "",
        latitude: user.latitude || null,
        longitude: user.longitude || null,
      });
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      return toast.error("Image must be less than 5MB");
    }

    setAvatarLoading(true);
    try {
      const data = new FormData();
      data.append("avatar", file);

      const res = await uploadAvatar(data);
      updateUser(res.data.data);
      toast.success("Avatar updated successfully");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to upload avatar");
    } finally {
      setAvatarLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await updateProfile(formData);
      updateUser(res.data.data);
      if (formData.latitude && formData.longitude) {
        setCustomerCoords([
          Number(formData.latitude),
          Number(formData.longitude),
        ]);
      }
      toast.success("Profile and location updated successfully");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwords.newPassword.length < 12) {
      return toast.error("New password must be at least 12 characters");
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      return toast.error("Passwords do not match");
    }

    setPasswordLoading(true);
    try {
      await updatePassword({
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      toast.success("Password changed. Please sign in again.");
      clearToken();
      window.location.assign("/login");
      setPasswords({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to change password");
    } finally {
      setPasswordLoading(false);
    }
  };

  if (!user) return null;

  const avatarSrc = user.avatar
    ? user.avatar.startsWith("http")
      ? user.avatar
      : apiAssetUrl(user.avatar)
    : null;

  return (
    <WorkspacePage
      title="Account settings"
      description="Manage your profile, location, and password."
    >
      <section className="workspace-surface workspace-form">
        <div className="flex min-w-0 items-center gap-4 border-b border-slate-200 pb-5">
          <div className="relative group">
            <button
              type="button"
              aria-label="Change profile photo"
              disabled={avatarLoading}
              onClick={handleAvatarClick}
              className="w-16 h-16 rounded-full border-4 border-white bg-gray-100 overflow-hidden cursor-pointer flex items-center justify-center relative shadow-md"
            >
              {avatarLoading ? (
                <div className="w-6 h-6 border-2 border-[#1e3a8a] border-t-transparent rounded-full animate-spin" />
              ) : avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt={user.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-3xl font-bold text-gray-400">
                  {user.name?.charAt(0) || "U"}
                </span>
              )}

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white">
                <Camera className="w-6 h-6 mb-1" />
                <span className="text-[10px] font-semibold">Change</span>
              </div>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarChange}
              accept="image/*"
              className="hidden"
            />
          </div>

          <div className="min-w-0 break-words">
            <h2 className="text-xl font-bold text-gray-900">{user.name}</h2>
            <div className="flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md mt-1 w-fit">
              <Shield className="w-3 h-3" />
              {user.role
                ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
                : "Customer"}
            </div>
          </div>
        </div>

        {/* Form Area */}
        <div className="pt-5">
          {user.supplier_badge && (
            <span className="mb-4 inline-flex rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-800">
              {user.supplier_badge}
            </span>
          )}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label
                  htmlFor="profile-name"
                  className="block text-sm font-semibold text-gray-700 mb-1.5"
                >
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="w-4 h-4 text-gray-400" />
                  </div>
                  <input
                    id="profile-name"
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-[#1e3a8a] outline-none transition"
                    required
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="profile-email"
                  className="block text-sm font-semibold text-gray-700 mb-1.5"
                >
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="w-4 h-4 text-gray-400" />
                  </div>
                  <input
                    id="profile-email"
                    type="email"
                    value={user.email}
                    disabled
                    className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500 outline-none cursor-not-allowed"
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-1">
                  Email cannot be changed
                </p>
              </div>

              <div>
                <label
                  htmlFor="profile-phone"
                  className="block text-sm font-semibold text-gray-700 mb-1.5"
                >
                  Phone Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="w-4 h-4 text-gray-400" />
                  </div>
                  <input
                    id="profile-phone"
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+63 912 345 6789"
                    className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-[#1e3a8a] outline-none transition"
                  />
                </div>
              </div>
            </div>

            {/* Location Picker with Interactive Map & GPS */}
            <div className="pt-2">
              <div className="bg-gray-50/70 p-4 sm:p-5 rounded-2xl border border-gray-200">
                <LocationPicker
                  location={formData.address}
                  barangay={formData.barangay}
                  latitude={formData.latitude}
                  longitude={formData.longitude}
                  onChange={({ location, barangay, latitude, longitude }) => {
                    setFormData((prev) => ({
                      ...prev,
                      address: location,
                      barangay,
                      latitude,
                      longitude,
                    }));
                  }}
                />
              </div>
            </div>

            <div className="pt-6 border-t border-gray-100 flex justify-end gap-3">
              <button
                type="button"
                onClick={() =>
                  setFormData({
                    name: user.name || "",
                    phone: user.phone || "",
                    address: user.address || "",
                    barangay: user.barangay || "",
                    latitude: user.latitude ?? null,
                    longitude: user.longitude ?? null,
                  })
                }
                className="px-5 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900 transition"
              >
                Discard
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 bg-[#1e3a8a] hover:bg-[#1d4ed8] text-white px-6 py-2 rounded-lg font-semibold text-sm disabled:opacity-50 transition shadow-sm"
              >
                {loading ? (
                  "Saving..."
                ) : (
                  <>
                    <Save className="w-4 h-4" /> Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Change Password Card */}
      <section className="workspace-surface workspace-form">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
          <div className="p-2.5 bg-blue-50 text-[#1e3a8a] rounded-xl">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Security & Password
            </h2>
            <p className="text-xs text-gray-500">
              Update your password to keep your account safe
            </p>
          </div>
        </div>

        <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md">
          <div>
            <label
              htmlFor="profile-current"
              className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
            >
              Current Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="w-4 h-4 text-gray-400" />
              </div>
              <input
                id="profile-current"
                type="password"
                value={passwords.currentPassword}
                onChange={(e) =>
                  setPasswords((p) => ({
                    ...p,
                    currentPassword: e.target.value,
                  }))
                }
                required
                className="w-full pl-9 pr-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#1e3a8a] outline-none transition"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="profile-new"
              className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
            >
              New Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="w-4 h-4 text-gray-400" />
              </div>
              <input
                id="profile-new"
                type="password"
                value={passwords.newPassword}
                onChange={(e) =>
                  setPasswords((p) => ({ ...p, newPassword: e.target.value }))
                }
                required
                className="w-full pl-9 pr-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#1e3a8a] outline-none transition"
                placeholder="At least 12 characters"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="profile-confirm"
              className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
            >
              Confirm New Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="w-4 h-4 text-gray-400" />
              </div>
              <input
                id="profile-confirm"
                type="password"
                value={passwords.confirmPassword}
                onChange={(e) =>
                  setPasswords((p) => ({
                    ...p,
                    confirmPassword: e.target.value,
                  }))
                }
                required
                className="w-full pl-9 pr-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#1e3a8a] outline-none transition"
                placeholder="Re-enter new password"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={passwordLoading}
              className="bg-[#1e3a8a] hover:bg-[#1d4ed8] text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition disabled:opacity-60 shadow-sm"
            >
              {passwordLoading ? "Updating Password..." : "Update Password"}
            </button>
          </div>
        </form>
      </section>
    </WorkspacePage>
  );
}
