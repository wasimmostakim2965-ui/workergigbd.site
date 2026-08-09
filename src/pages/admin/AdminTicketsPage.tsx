import { useEffect, useState, useCallback } from 'react';
import { Ticket as TicketIcon, Send, MessageSquare } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { LoadingSpinner, EmptyState } from '@/components/ui/EmptyState';
import { Ticket, TicketMessage, Profile } from '@/types';

export function AdminTicketsPage() {
  const { profile: admin } = useAuth();
  const [tickets, setTickets] = useState<(Ticket & { profiles?: Profile })[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('tickets')
        .select('*, profiles(username)').order('updated_at', { ascending: false }).limit(100);
      if (error) {
        console.error('Load tickets error:', error);
        setTickets([]);
      } else {
        setTickets((data as (Ticket & { profiles?: Profile })[]) ?? []);
      }
    } catch (err) {
      console.error('Load tickets error:', err);
      setTickets([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadTickets(); }, [loadTickets]);

  const loadMessages = async (ticketId: string) => {
    const { data } = await supabase.from('ticket_messages')
      .select('*').eq('ticket_id', ticketId).order('created_at', { ascending: true });
    setMessages((data as TicketMessage[]) ?? []);
  };

  const openTicket = (ticket: Ticket) => {
    setSelected(ticket);
    loadMessages(ticket.id);
  };

  const handleReply = async () => {
    if (!selected || !admin || !reply.trim()) return;
    setSending(true);

    const { error } = await supabase.from('ticket_messages').insert({
      ticket_id: selected.id,
      sender_id: admin.id,
      message: reply,
      is_admin_reply: true,
    });

    if (error) { console.error(error); setSending(false); return; }

    await supabase.from('tickets').update({
      status: 'answered',
      updated_at: new Date().toISOString(),
    }).eq('id', selected.id);

    await supabase.from('notifications').insert({
      user_id: selected.user_id,
      title: 'Support Ticket Updated',
      message: `Admin has replied to your ticket: ${selected.subject}`,
      type: 'info',
    });

    setReply('');
    loadMessages(selected.id);
    loadTickets();
    setSending(false);
  };

  const closeTicket = async () => {
    if (!selected) return;
    await supabase.from('tickets').update({
      status: 'closed',
      updated_at: new Date().toISOString(),
    }).eq('id', selected.id);
    setSelected(null);
    loadTickets();
  };

  if (loading) return <LoadingSpinner size={40} className="py-20" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-gray-900">Support Tickets</h1>
        <p className="mt-1 text-sm text-gray-600">Manage user support requests</p>
      </div>

      {tickets.length === 0 ? (
        <Card><EmptyState icon={<TicketIcon className="h-8 w-8" />} title="No support tickets" /></Card>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <Card key={ticket.id} hover className="cursor-pointer p-4">
              <div className="flex items-center justify-between" onClick={() => openTicket(ticket)}>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50">
                    <MessageSquare className="h-5 w-5 text-primary-600" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{ticket.subject}</div>
                    <div className="text-xs text-gray-500">
                      {ticket.profiles?.username ?? 'Unknown'} • {ticket.category} • {new Date(ticket.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={ticket.priority === 'high' ? 'error' : ticket.priority === 'normal' ? 'warning' : 'gray'}>
                    {ticket.priority}
                  </Badge>
                  <Badge variant={ticket.status === 'open' ? 'warning' : ticket.status === 'answered' ? 'primary' : 'gray'} dot>
                    {ticket.status}
                  </Badge>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.subject ?? 'Ticket'} size="lg">
        {selected && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Badge variant={selected.status === 'open' ? 'warning' : selected.status === 'answered' ? 'primary' : 'gray'} dot>{selected.status}</Badge>
              <Badge variant="gray">{selected.category}</Badge>
              <Badge variant={selected.priority === 'high' ? 'error' : 'warning'}>{selected.priority}</Badge>
            </div>

            <div className="max-h-80 space-y-3 overflow-y-auto rounded-lg bg-gray-50 p-4">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.is_admin_reply ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[75%] rounded-lg px-4 py-2.5 text-sm ${
                    msg.is_admin_reply ? 'bg-white border border-gray-200 text-gray-700' : 'bg-primary-600 text-white'
                  }`}>
                    {msg.is_admin_reply && <div className="mb-1 text-xs font-semibold text-primary-600">Admin</div>}
                    {msg.message}
                    <div className={`mt-1 text-xs ${msg.is_admin_reply ? 'text-gray-400' : 'text-primary-200'}`}>
                      {new Date(msg.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
              {messages.length === 0 && <p className="text-center text-sm text-gray-500 py-4">No messages yet.</p>}
            </div>

            {selected.status !== 'closed' && (
              <>
                <div className="flex gap-2">
                  <Input placeholder="Type your reply..." value={reply} onChange={(e) => setReply(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleReply()} />
                  <Button onClick={handleReply} loading={sending}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <Button variant="secondary" fullWidth onClick={closeTicket}>Close Ticket</Button>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
