import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { getConversations, getMessages, sendMessage } from '../../api/messages';
import { MessageCircle, Send, ArrowLeft, Clock } from 'lucide-react';
import LoadingSpinner from '../../components/LoadingSpinner';

const BASE_URL = 'http://localhost:5000';

export default function Messages() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const directUserId = searchParams.get('userId') || searchParams.get('user');

  const [conversations, setConversations] = useState([]);
  const [loadingConv, setLoadingConv] = useState(true);
  
  const [activeUser, setActiveUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  
  const messagesEndRef = useRef(null);

  const { socket } = useSocket();
  const [typingUsers, setTypingUsers] = useState(new Set());

  const fetchConversations = () => {
    getConversations()
      .then(res => {
        const list = res.data?.data || [];
        setConversations(list);
        if (directUserId && !activeUser) {
          const match = list.find(c => c.other_user_id === directUserId);
          if (match) openConversation(match);
        }
      })
      .catch(console.error)
      .finally(() => setLoadingConv(false));
  };

  useEffect(() => {
    fetchConversations();
    
    if (socket) {
      const handleNewMessage = (msg) => {
        setMessages(prev => {
          // If this message belongs to the active conversation, append it
          if (activeUser && (msg.sender_id === activeUser.other_user_id || msg.receiver_id === activeUser.other_user_id)) {
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
            return [...prev, msg];
          }
          return prev;
        });
        
        // Always refresh conversations to update latest message & unread count
        fetchConversations();
      };

      const handleTyping = ({ senderId }) => {
        setTypingUsers(prev => {
          const newSet = new Set(prev);
          newSet.add(senderId);
          return newSet;
        });
      };

      const handleStopTyping = ({ senderId }) => {
        setTypingUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(senderId);
          return newSet;
        });
      };

      socket.on('new_message', handleNewMessage);
      socket.on('typing', handleTyping);
      socket.on('stop_typing', handleStopTyping);

      return () => {
        socket.off('new_message', handleNewMessage);
        socket.off('typing', handleTyping);
        socket.off('stop_typing', handleStopTyping);
      };
    }
  }, [socket, activeUser]);

  const openConversation = (otherUser) => {
    setActiveUser(otherUser);
    fetchMessages(otherUser.other_user_id);
    
    // Mark locally as read
    setConversations(prev => prev.map(c => 
      c.other_user_id === otherUser.other_user_id ? { ...c, unread_count: 0 } : c
    ));
  };

  const fetchMessages = (otherId) => {
    setLoadingMsgs(true);
    getMessages(otherId).then(res => {
      setMessages(res.data?.data || []);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }).catch(console.error).finally(() => setLoadingMsgs(false));
  };

  const handleTypingStart = () => {
    if (socket && activeUser) {
      socket.emit('typing', { receiverId: activeUser.other_user_id });
    }
  };

  const handleTypingStop = () => {
    if (socket && activeUser) {
      socket.emit('stop_typing', { receiverId: activeUser.other_user_id });
    }
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeUser) return;

    sendMessage({ receiver_id: activeUser.other_user_id, content: newMessage }).then(res => {
      if (res.data?.data) {
        setMessages(prev => [...prev, res.data.data]);
      }
      setNewMessage('');
      handleTypingStop();
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      fetchConversations();
    }).catch(console.error);
  };

  return (
    <div className="min-h-screen bg-[#f5f0e8] pt-6 pb-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-[80vh] flex gap-4">
        
        {/* Sidebar */}
        <div className={`bg-white rounded-2xl border border-gray-200 flex flex-col overflow-hidden w-full md:w-80 flex-shrink-0 ${activeUser ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <h2 className="font-bold text-gray-900">Messages</h2>
            <MessageCircle className="w-5 h-5 text-gray-400" />
          </div>
          <div className="flex-1 overflow-y-auto">
            {loadingConv ? (
              <div className="p-8 flex justify-center"><LoadingSpinner /></div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500">No conversations yet.</div>
            ) : (
              conversations.map(conv => (
                <button
                  key={conv.other_user_id}
                  onClick={() => openConversation(conv)}
                  className={`w-full text-left p-4 border-b border-gray-50 hover:bg-gray-50 transition flex items-start gap-3 ${activeUser?.other_user_id === conv.other_user_id ? 'bg-blue-50/50' : ''}`}
                >
                  {conv.avatar ? (
                    <img src={`${BASE_URL}${conv.avatar}`} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold flex-shrink-0">
                      {conv.name.charAt(0)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="font-semibold text-gray-900 text-sm truncate">{conv.name}</span>
                      {conv.unread_count > 0 && (
                        <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{conv.unread_count}</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 mb-1">{conv.role === 'supplier' ? 'Supplier' : 'Customer'}</div>
                    <p className={`text-xs truncate ${conv.unread_count > 0 ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                      {typingUsers.has(conv.other_user_id) ? <span className="text-blue-500 italic">Typing...</span> : (conv.last_message || 'No messages')}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className={`bg-white rounded-2xl border border-gray-200 flex-1 flex flex-col overflow-hidden ${!activeUser ? 'hidden md:flex' : 'flex'}`}>
          {!activeUser ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50/50">
              <MessageCircle className="w-16 h-16 mb-4 text-gray-300" />
              <p>Select a conversation to start chatting</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="p-4 border-b border-gray-100 flex items-center gap-3 bg-white shadow-sm z-10">
                <button onClick={() => setActiveUser(null)} className="md:hidden p-2 -ml-2 text-gray-500 hover:text-gray-900">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                {activeUser.avatar ? (
                  <img src={`${BASE_URL}${activeUser.avatar}`} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold flex-shrink-0">
                    {activeUser.name.charAt(0)}
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-gray-900">{activeUser.name}</h3>
                  <div className="text-xs flex items-center gap-1">
                    {typingUsers.has(activeUser.other_user_id) ? (
                      <span className="text-blue-500 italic">Typing...</span>
                    ) : (
                      <><Clock className="w-3 h-3 text-gray-500" /> <span className="text-gray-500">Replies soon</span></>
                    )}
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 bg-[#fcfbfa] space-y-4">
                {loadingMsgs ? (
                  <div className="flex justify-center py-8"><LoadingSpinner /></div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-8 text-sm text-gray-400">Say hello!</div>
                ) : (
                  messages.map(msg => {
                    const isMine = msg.sender_id === user.id;
                    return (
                      <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${isMine ? 'bg-[#1e3a8a] text-white rounded-br-sm' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm'}`}>
                          <div className="whitespace-pre-wrap">{msg.content}</div>
                          <div className={`text-[10px] mt-1 text-right ${isMine ? 'text-blue-200' : 'text-gray-400'}`}>
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 bg-white border-t border-gray-100">
                <form onSubmit={handleSend} className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={e => {
                      setNewMessage(e.target.value);
                      if (e.target.value) handleTypingStart();
                      else handleTypingStop();
                    }}
                    onBlur={handleTypingStop}
                    placeholder="Type a message..."
                    className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#1e3a8a] transition"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="bg-[#1e3a8a] text-white px-5 rounded-xl hover:bg-[#1d4ed8] disabled:opacity-50 transition flex items-center justify-center flex-shrink-0"
                  >
                    <Send className="w-4 h-4" />
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
