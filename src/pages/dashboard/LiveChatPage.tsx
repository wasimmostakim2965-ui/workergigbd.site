import { useEffect, useState, useRef, useCallback } from 'react';
import { Send, Headphones, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { LoadingSpinner } from '@/components/ui/EmptyState';
import { ChatConversation, ChatMessage } from '@/types';

export function LiveChatPage() {
  const { profile } = useAuth();
  const [conversation, setConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadConversation = useCallback(async () => {
    if (!profile) return;
    // Ensure a conversation exists for this user.
    const { data: convId } = await supabase.rpc('get_or_create_chat_conversation');
    if (!convId) { setLoading(false); return; }

    const { data: conv } = await supabase
      .from('chat_conversations')
      .select('*')
      .eq('id', convId)
      .maybeSingle();
    setConversation(conv as ChatConversation | null);

    const { data: msgs } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });
    setMessages((msgs as ChatMessage[]) ?? []);

    // Mark admin messages as read by this user.
    if ((conv as ChatConversation)?.user_unread_count > 0) {
      await supabase
        .from('chat_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('conversation_id', convId)
        .eq('is_admin_reply', true)
        .is('read_at', null);
      await supabase
        .from('chat_conversations')
        .update({ user_unread_count: 0 })
        .eq('id', convId);
    }
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    loadConversation();
  }, [loadConversation]);

  // Realtime subscription for incoming messages.
  useEffect(() => {
    const convId = conversation?.id;
    if (!convId) return;
    const channel = supabase
      .channel(`chat-user-${convId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `conversation_id=eq.${convId}` },
        (payload) => {
          const msg = payload.new as ChatMessage;
          setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
          // If the new message is from admin, mark it read instantly.
          if (msg.is_admin_reply && !msg.read_at) {
            supabase
              .from('chat_messages')
              .update({ read_at: new Date().toISOString() })
              .eq('id', msg.id)
              .then(() => {
                supabase.from('chat_conversations').update({ user_unread_count: 0 }).eq('id', convId);
              });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chat_conversations', filter: `id=eq.${convId}` },
        (payload) => setConversation(payload.new as ChatConversation)
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversation?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!conversation || !profile || !newMessage.trim()) return;
    setSending(true);
    setError('');

    const { error: insertError } = await supabase.from('chat_messages').insert({
      conversation_id: conversation.id,
      sender_id: profile.id,
      message: newMessage.trim(),
      is_admin_reply: false,
    });

    if (insertError) {
      setError(insertError.message);
      setSending(false);
      return;
    }

    // Update conversation preview + bump admin unread. Read the current
    // conversation row first so the unread count isn't based on a stale snapshot.
    const { data: curConv } = await supabase
      .from('chat_conversations')
      .select('admin_unread_count')
      .eq('id', conversation.id)
      .maybeSingle();
    const nextAdminUnread = ((curConv as { admin_unread_count?: number })?.admin_unread_count ?? 0) + 1;

    await supabase.from('chat_conversations').update({
      last_message: newMessage.trim().slice(0, 120),
      last_sender_is_admin: false,
      last_message_at: new Date().toISOString(),
      admin_unread_count: nextAdminUnread,
      updated_at: new Date().toISOString(),
      status: 'open',
    }).eq('id', conversation.id);

    setNewMessage('');
    setSending(false);
  };

  if (loading) return <LoadingSpinner size={40} className="py-20" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100">
            <Headphones className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <h1 className="font-heading text-xl font-bold text-gray-900">Live Support</h1>
            <p className="text-xs text-gray-500">Chat directly with our support team</p>
          </div>
        </div>
        <button onClick={loadConversation} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100" title="Refresh">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <Card className="flex flex-col overflow-hidden" >
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success-400 opacity-75"></span>
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success-500"></span>
            </span>
            <span className="text-sm font-semibold text-gray-700">Support Team</span>
          </div>
          <Badge variant={conversation?.status === 'open' ? 'success' : 'gray'} dot>
            {conversation?.status === 'open' ? 'Online' : 'Closed'}
          </Badge>
        </div>

        <div className="h-[55vh] space-y-3 overflow-y-auto bg-gray-50 p-4">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <Headphones className="h-10 w-10 text-gray-300" />
              <p className="mt-3 text-sm font-medium text-gray-500">No messages yet</p>
              <p className="text-xs text-gray-400">Send a message to start the conversation</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.is_admin_reply ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                  msg.is_admin_reply
                    ? 'rounded-bl-sm bg-white border border-gray-200 text-gray-700'
                    : 'rounded-br-sm bg-primary-600 text-white'
                }`}>
                  {msg.is_admin_reply && (
                    <div className="mb-1 text-xs font-semibold text-primary-600">Support</div>
                  )}
                  <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                  <div className={`mt-1 text-[10px] ${msg.is_admin_reply ? 'text-gray-400' : 'text-primary-200'}`}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSend} className="flex gap-2 border-t border-gray-100 p-3">
          <Input
            placeholder="Type your message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" loading={sending} disabled={!newMessage.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </Card>
    </div>
  );
}
