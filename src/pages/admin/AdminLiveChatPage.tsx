import { useEffect, useState, useRef, useCallback } from 'react';
import { MessageSquare, Send, Search, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LoadingSpinner, EmptyState } from '@/components/ui/EmptyState';
import { ChatConversation, ChatMessage, Profile } from '@/types';

type ConversationRow = ChatConversation & { profiles?: Profile };

export function AdminLiveChatPage() {
  const { profile: admin } = useAuth();
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [selected, setSelected] = useState<ConversationRow | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('chat_conversations')
      .select('*, profiles(username, full_name, avatar_url, phone, status)')
      .order('last_message_at', { ascending: false })
      .limit(100);
    if (search.trim()) {
      query = query.or(`last_message.ilike.%${search}%`);
    }
    const { data, error } = await query;
    if (error) {
      console.error('Load chats error:', error);
      setConversations([]);
    } else {
      let rows = (data as ConversationRow[]) ?? [];
      if (search.trim()) {
        const s = search.toLowerCase();
        rows = rows.filter(
          (r) =>
            r.last_message?.toLowerCase().includes(s) ||
            r.profiles?.username?.toLowerCase().includes(s) ||
            r.profiles?.phone?.toLowerCase().includes(s) ||
            r.profiles?.full_name?.toLowerCase().includes(s)
        );
      }
      setConversations(rows);
    }
    setLoading(false);
  }, [search]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  const loadMessages = async (convId: string) => {
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });
    setMessages((data as ChatMessage[]) ?? []);
  };

  const openConversation = async (conv: ConversationRow) => {
    setSelected(conv);
    await loadMessages(conv.id);
    // Mark user messages as read by admin.
    if (conv.admin_unread_count > 0) {
      await supabase
        .from('chat_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('conversation_id', conv.id)
        .eq('is_admin_reply', false)
        .is('read_at', null);
      await supabase
        .from('chat_conversations')
        .update({ admin_unread_count: 0 })
        .eq('id', conv.id);
      loadConversations();
    }
  };

  // Realtime: refresh conversation list when any conversation changes.
  useEffect(() => {
    const channel = supabase
      .channel('admin-chat-conv-list')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_conversations' },
        () => loadConversations()
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload) => {
          const msg = payload.new as ChatMessage;
          if (selected && msg.conversation_id === selected.id) {
            setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
            if (!msg.is_admin_reply && !msg.read_at) {
              supabase.from('chat_messages').update({ read_at: new Date().toISOString() }).eq('id', msg.id);
              supabase.from('chat_conversations').update({ admin_unread_count: 0 }).eq('id', selected.id);
            }
          }
          loadConversations();
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selected, loadConversations]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !admin || !reply.trim()) return;
    setSending(true);

    const { error } = await supabase.from('chat_messages').insert({
      conversation_id: selected.id,
      sender_id: admin.id,
      message: reply.trim(),
      is_admin_reply: true,
    });

    if (error) {
      console.error(error);
      setSending(false);
      return;
    }

    // Bump the user's unread count from the current row (not a stale snapshot)
    // so rapid replies don't lose increments.
    const { data: curConv } = await supabase
      .from('chat_conversations')
      .select('user_unread_count')
      .eq('id', selected.id)
      .maybeSingle();
    const nextUserUnread = ((curConv as { user_unread_count?: number })?.user_unread_count ?? 0) + 1;

    await supabase.from('chat_conversations').update({
      last_message: reply.trim().slice(0, 120),
      last_sender_is_admin: true,
      last_message_at: new Date().toISOString(),
      user_unread_count: nextUserUnread,
      updated_at: new Date().toISOString(),
      status: 'open',
    }).eq('id', selected.id);

    setReply('');
    setSending(false);
    loadMessages(selected.id);
    loadConversations();
  };

  const closeConversation = async () => {
    if (!selected) return;
    await supabase.from('chat_conversations')
      .update({ status: 'closed', updated_at: new Date().toISOString() })
      .eq('id', selected.id);
    setSelected(null);
    loadConversations();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-gray-900">Live Chat</h1>
        <p className="mt-1 text-sm text-gray-600">Real-time chat with all users. Click a conversation to reply.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Conversation list */}
        <Card className="lg:col-span-1 overflow-hidden">
          <div className="border-b border-gray-100 p-3">
            <Input
              placeholder="Search users or messages..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={<Search className="h-4 w-4" />}
            />
          </div>
          <div className="max-h-[70vh] overflow-y-auto">
            {loading ? (
              <LoadingSpinner size={36} className="py-10" />
            ) : conversations.length === 0 ? (
              <EmptyState icon={<MessageSquare className="h-8 w-8" />} title="No conversations" description="Chats will appear here." />
            ) : (
              <div className="divide-y divide-gray-50">
                {conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => openConversation(conv)}
                    className={`flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-gray-50 ${
                      selected?.id === conv.id ? 'bg-primary-50' : ''
                    }`}
                  >
                    <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-600 text-sm font-bold text-white uppercase">
                      {conv.profiles?.username?.charAt(0) ?? 'U'}
                      {conv.status === 'open' && (
                        <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-success-500" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="truncate text-sm font-semibold text-gray-900">
                          {conv.profiles?.username ?? 'Unknown'}
                        </span>
                        <span className="ml-2 shrink-0 text-[10px] text-gray-400">
                          {new Date(conv.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="truncate text-xs text-gray-500">
                        {conv.last_sender_is_admin ? 'You: ' : ''}
                        {conv.last_message || 'No messages yet'}
                      </p>
                    </div>
                    {conv.admin_unread_count > 0 && (
                      <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-error-500 px-1.5 text-[10px] font-bold text-white">
                        {conv.admin_unread_count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Active chat */}
        <Card className="lg:col-span-2 flex flex-col overflow-hidden">
          {!selected ? (
            <div className="flex h-[70vh] flex-col items-center justify-center text-center">
              <MessageSquare className="h-12 w-12 text-gray-300" />
              <p className="mt-3 text-sm font-medium text-gray-500">Select a conversation</p>
              <p className="text-xs text-gray-400">Choose a chat from the left to start replying</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-600 text-sm font-bold text-white uppercase">
                    {selected.profiles?.username?.charAt(0) ?? 'U'}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">
                      {selected.profiles?.username ?? 'Unknown'}
                      {selected.profiles?.phone && (
                        <span className="ml-2 text-xs font-normal text-gray-500">{selected.profiles.phone}</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400">
                      UID: {selected.user_id.slice(0, 8)} • Joined {new Date(selected.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={selected.status === 'open' ? 'success' : 'gray'} dot>
                    {selected.status}
                  </Badge>
                  {selected.status === 'open' && (
                    <Button size="sm" variant="ghost" onClick={closeConversation}>
                      <X className="h-4 w-4" /> Close
                    </Button>
                  )}
                </div>
              </div>

              <div className="h-[55vh] space-y-3 overflow-y-auto bg-gray-50 p-4">
                {messages.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <p className="text-sm text-gray-400">No messages yet. Say hello!</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.is_admin_reply ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                        msg.is_admin_reply
                          ? 'rounded-br-sm bg-primary-600 text-white'
                          : 'rounded-bl-sm bg-white border border-gray-200 text-gray-700'
                      }`}>
                        {!msg.is_admin_reply && (
                          <div className="mb-1 text-xs font-semibold text-primary-600">
                            {selected.profiles?.username ?? 'User'}
                          </div>
                        )}
                        <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                        <div className={`mt-1 text-[10px] ${msg.is_admin_reply ? 'text-primary-200' : 'text-gray-400'}`}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {selected.status === 'open' ? (
                <form onSubmit={handleReply} className="flex gap-2 border-t border-gray-100 p-3">
                  <Input
                    placeholder="Type your reply..."
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    className="flex-1"
                  />
                  <Button type="submit" loading={sending} disabled={!reply.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              ) : (
                <div className="border-t border-gray-100 p-3 text-center text-sm text-gray-500">
                  This conversation is closed.
                </div>
              )}
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
