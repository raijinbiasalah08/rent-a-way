import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { updateProfile, uploadAvatar } from '../../api/auth';
import { User, Mail, Phone, MapPin, Camera, Save, Shield } from 'lucide-react';
import toast from 'react-hot-toast';

const BASE_URL = 'http://localhost:5000';

export default function Profile() {
  const { user, login } = useAuth();
  const fileInputRef = useRef(null);
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: ''
  });
  const [loading, setLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        phone: user.phone || '',
        address: user.address || ''
      });
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      return toast.error('Image must be less than 5MB');
    }

    setAvatarLoading(true);
    try {
      const data = new FormData();
      data.append('avatar', file);
      
      const res = await uploadAvatar(data);
      login(res.data.data, localStorage.getItem('token'));
      toast.success('Avatar updated successfully');
    } catch (error) {
      toast.error('Failed to upload avatar');
    } finally {
      setAvatarLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await updateProfile(formData);
      login(res.data.data, localStorage.getItem('token'));
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  const avatarSrc = user.avatar ? `${BASE_URL}${user.avatar}` : null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Account Settings</h1>
        <p className="text-gray-500 text-sm">Manage your profile details and preferences</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Header/Cover Area */}
        <div className="h-32 bg-gradient-to-r from-[#1e3a8a] to-blue-400 relative">
          <div className="absolute -bottom-12 left-8 flex items-end gap-4">
            <div className="relative group">
              <div 
                onClick={handleAvatarClick}
                className="w-24 h-24 rounded-full border-4 border-white bg-gray-100 overflow-hidden cursor-pointer flex items-center justify-center relative shadow-md"
              >
                {avatarLoading ? (
                  <div className="w-6 h-6 border-2 border-[#1e3a8a] border-t-transparent rounded-full animate-spin" />
                ) : avatarSrc ? (
                  <img src={avatarSrc} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-bold text-gray-400">{user.name.charAt(0)}</span>
                )}
                
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white">
                  <Camera className="w-6 h-6 mb-1" />
                  <span className="text-[10px] font-semibold">Change</span>
                </div>
              </div>
              <input 
                type="file"
                ref={fileInputRef}
                onChange={handleAvatarChange}
                accept="image/*"
                className="hidden"
              />
            </div>
            
            <div className="mb-2 hidden sm:block">
              <h2 className="text-xl font-bold text-gray-900">{user.name}</h2>
              <div className="flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md mt-1 w-fit">
                <Shield className="w-3 h-3" />
                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
              </div>
            </div>
          </div>
        </div>

        {/* Form Area */}
        <div className="px-8 pt-16 pb-8">
          <div className="sm:hidden mb-6">
            <h2 className="text-xl font-bold text-gray-900">{user.name}</h2>
            <div className="flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md mt-1 w-fit">
              <Shield className="w-3 h-3" />
              {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="w-4 h-4 text-gray-400" />
                  </div>
                  <input
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
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="w-4 h-4 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    value={user.email}
                    disabled
                    className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500 outline-none"
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-1">Email cannot be changed</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Phone Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="w-4 h-4 text-gray-400" />
                  </div>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+63 912 345 6789"
                    className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-[#1e3a8a] outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Location / Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MapPin className="w-4 h-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="City, Province"
                    className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-[#1e3a8a] outline-none transition"
                  />
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-gray-100 flex justify-end gap-3">
              <button 
                type="button"
                onClick={() => setFormData({ name: user.name || '', phone: user.phone || '', address: user.address || '' })}
                className="px-5 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900 transition"
              >
                Discard
              </button>
              <button 
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 bg-[#1e3a8a] hover:bg-[#1d4ed8] text-white px-6 py-2 rounded-lg font-semibold text-sm disabled:opacity-50 transition shadow-sm"
              >
                {loading ? 'Saving...' : (
                  <>
                    <Save className="w-4 h-4" /> Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}