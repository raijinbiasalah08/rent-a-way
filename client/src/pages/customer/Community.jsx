import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getPosts, createPost, likePost } from '../../api/community';
import LoadingSpinner from '../../components/LoadingSpinner';
import toast from 'react-hot-toast';

const TYPE_STYLES = {
  experience: 'bg-purple-100 text-purple-700',
  question:   'bg-blue-100 text-blue-700',
  tip:        'bg-green-100 text-green-700',
};

const TYPE_OPTIONS = [
  { value: 'experience', label: '💬 Experience' },
  { value: 'question',   label: '❓ Question' },
  { value: 'tip',        label: '💡 Tip' },
];

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function Community() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [type, setType] = useState('experience');
  const [typeFilter, setTypeFilter] = useState('');
  const [posting, setPosting] = useState(false);
  const [liking, setLiking] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchPosts = (p = 1, filter = typeFilter) => {
    setLoading(true);
    const params = { page: p, limit: 10 };
    if (filter) params.type = filter;
    getPosts(params)
      .then(res => {
        const data = res.data?.data || {};
        setPosts(data.posts || []);
        setTotalPages(data.totalPages || 1);
        setPage(p);
      })
      .catch(() => toast.error('Failed to load community posts'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchPosts(1, typeFilter); }, [typeFilter]);

  const handlePost = async (e) => {
    e.preventDefault();
    if (!content.trim()) return toast.error('Write something first!');
    setPosting(true);
    try {
      await createPost({ content, type });
      toast.success('Post published!');
      setContent('');
      setType('experience');
      fetchPosts(1, typeFilter);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to post');
    } finally {
      setPosting(false);
    }
  };

  const handleLike = async (postId) => {
    setLiking(postId);
    try {
      await likePost(postId);
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes: (p.likes || 0) + 1 } : p));
    } catch {
      toast.error('Failed to like post');
    } finally {
      setLiking(null);
    }
  };

  const initials = (name) => name ? name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() : '?';

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 text-navy-700">Community</h1>

      {/* Post Composer */}
      <div className="card mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-navy-700 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {initials(user?.name)}
          </div>
          <p className="font-semibold text-navy-700 text-sm">{user?.name}</p>
        </div>
        <form onSubmit={handlePost}>
          <textarea
            className="input mb-3 h-24 resize-none"
            placeholder="Share your rental experience, ask a question, or drop a tip..."
            value={content}
            onChange={e => setContent(e.target.value)}
          />
          <div className="flex justify-between items-center gap-3">
            <select
              className="input w-auto text-sm py-1.5"
              value={type}
              onChange={e => setType(e.target.value)}
            >
              {TYPE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <button type="submit" disabled={posting} className="btn-primary py-1.5 px-6 disabled:opacity-60">
              {posting ? 'Posting...' : 'Post'}
            </button>
          </div>
        </form>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-5 overflow-x-auto">
        {[{ label: 'All Posts', value: '' }, ...TYPE_OPTIONS.map(o => ({ label: o.label, value: o.value }))].map(f => (
          <button
            key={f.value}
            onClick={() => setTypeFilter(f.value)}
            className={`whitespace-nowrap text-sm px-4 py-1.5 rounded-full font-semibold border transition
              ${typeFilter === f.value ? 'bg-navy-700 text-white border-navy-700' : 'border-gray-200 text-gray-600 hover:border-navy-400'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Posts */}
      {loading ? (
        <div className="py-8"><LoadingSpinner /></div>
      ) : posts.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">
          <div className="text-4xl mb-3">💬</div>
          <p className="font-medium">No posts yet</p>
          <p className="text-sm mt-1">Be the first to share something!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map(post => (
            <div key={post.id} className="card hover:shadow-md transition">
              {/* Post Header */}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-navy-100 rounded-full flex items-center justify-center font-bold text-navy-700 text-sm flex-shrink-0">
                  {initials(post.author_name)}
                </div>
                <div className="flex-grow min-w-0">
                  <p className="font-bold text-sm text-navy-700">{post.author_name}</p>
                  <p className="text-xs text-gray-400">{timeAgo(post.created_at)}</p>
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${TYPE_STYLES[post.type] || 'bg-gray-100 text-gray-600'}`}>
                  {post.type}
                </span>
              </div>

              {/* Content */}
              <p className="text-sm text-gray-700 leading-relaxed mb-3">{post.content}</p>

              {/* Like Button */}
              <div className="flex items-center gap-2 border-t border-gray-50 pt-3">
                <button
                  onClick={() => handleLike(post.id)}
                  disabled={liking === post.id}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-navy-700 transition font-semibold disabled:opacity-60"
                >
                  <span className="text-base">👍</span>
                  <span>{post.likes || 0} {post.likes === 1 ? 'Like' : 'Likes'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-3 mt-6">
          <button
            onClick={() => fetchPosts(page - 1)}
            disabled={page === 1}
            className="btn-outline py-1.5 px-4 text-sm disabled:opacity-40"
          >
            ← Prev
          </button>
          <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
          <button
            onClick={() => fetchPosts(page + 1)}
            disabled={page === totalPages}
            className="btn-outline py-1.5 px-4 text-sm disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}