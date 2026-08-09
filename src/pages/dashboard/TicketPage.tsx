import { useEffect, useState, useCallback } from 'react';
import { Ticket as TicketIcon, Plus, Send, MessageSquare } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { EmptyState, LoadingSpinner } from '@/components/ui/EmptyState';
import { Alert } from '@/components/ui/Alert';
import { Ticket, TicketMessage } from '@/types';

export function TicketPage() {
  const { profile } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);

  const [form, setForm] = useState({ subject: '', category: 'general', priority: 'normal', message: '' });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const loadTickets = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.from('tickets')
        .select('*').eq('user_id', profile.id)
        .order('updated_at', { ascending: false });
      if (error) {
        console.error('Load tickets error:', error);
        setTickets([]);
      } else {
        setTickets((data as Ticket[]) ?? []);
      }
    } catch (err) {
      console.error('Load tickets error:', err);
      setTickets([]);
    }
    setLoading(false);
  }, [profile]);

  useEffect(() => { loadTickets(); }, [loadTickets]);

  const loadMessages = async (ticketId: string) => {
    const { data } = await supabase.from('ticket_messages')
      .select('*').eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });
    setMessages((data as TicketMessage[]) ?? []);
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setCreating(true);
    setCreateError('');

    const { data: ticketData, error: ticketError } = await supabase.from('tickets').insert({
      user_id: profile.id,
      subject: form.subject,
      category: form.category,
      priority: form.priority,
      status: 'open',
    }).select().single();

    if (ticketError) {
      setCreateError(ticketError.message);
      setCreating(false);
      return;
    }

    const { error: msgError } = await supabase.from('ticket_messages').insert({
      ticket_id: ticketData.id,
      sender_id: profile.id,
      message: form.message,
      is_admin_reply: false,
    });

    if (msgError) console.error('Message error:', msgError);

    setShowNew(false);
    setForm({ subject: '', category: 'general', priority: 'normal', message: '' });
    loadTickets();
    setCreating(false);
  };

  const handleSendMessage = async () => {
    if (!selectedTicket || !profile || !newMessage.trim()) return;
    setSending(true);

    const { error } = await supabase.from('ticket_messages').insert({
      ticket_id: selectedTicket.id,
      sender_id: profile.id,
      message: newMessage,
      is_admin_reply: false,
    });

    if (error) {
      console.error('Send error:', error);
    } else {
      setNewMessage('');
      loadMessages(selectedTicket.id);
    }
    setSending(false);
  };

  const openTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    loadMessages(ticket.id);
  };

  if (loading) return <LoadingSpinner size={40} className="py-20" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-gray-900">Support Tickets</h1>
          <p className="mt-1 text-sm text-gray-600">Get help with your account or transactions</p>
        </div>
        <Button onClick={() => setShowNew(true)}>
          <Plus className="h-4 w-4" /> New Ticket
        </Button>
      </div>

      {tickets.length === 0 ? (
        <Card>
          <EmptyState
            icon={<TicketIcon className="h-8 w-8" />}
            title="No support tickets"
            description="Create a ticket if you need help with anything."
            action={<Button onClick={() => setShowNew(true)}><Plus className="h-4 w-4" /> New Ticket</Button>}
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <Card key={ticket.id} hover className="cursor-pointer p-4" >
              <div className="flex items-center justify-between" onClick={() => openTicket(ticket)}>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50">
                    <MessageSquare className="h-5 w-5 text-primary-600" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{ticket.subject}</div>
                    <div className="text-xs text-gray-500">
                      {ticket.category} • {new Date(ticket.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <Badge
                  variant={ticket.status === 'open' ? 'warning' : ticket.status === 'answered' ? 'primary' : 'gray'}
                  dot
                >
                  {ticket.status}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* New ticket modal */}
      <Modal open={showNew} onClose={() => setShowNew(false)} title="Create Support Ticket">
        {createError && <Alert variant="error" className="mb-4">{createError}</Alert>}
        <form onSubmit={handleCreateTicket} className="space-y-4">
          <Input
            label="Subject"
            placeholder="Brief description of your issue"
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              <option value="general">General</option>
              <option value="deposit">Deposit Issue</option>
              <option value="withdrawal">Withdrawal Issue</option>
              <option value="task">Task Issue</option>
              <option value="account">Account Issue</option>
            </Select>
            <Select label="Priority" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
            </Select>
          </div>
          <Textarea
            label="Message"
            placeholder="Describe your issue in detail..."
            rows={4}
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            required
          />
          <div className="flex gap-3">
            <Button variant="secondary" fullWidth onClick={() => setShowNew(false)}>Cancel</Button>
            <Button type="submit" fullWidth loading={creating}>Create Ticket</Button>
          </div>
        </form>
      </Modal>

      {/* Ticket messages modal */}
      <Modal
        open={!!selectedTicket}
        onClose={() => setSelectedTicket(null)}
        title={selectedTicket?.subject ?? 'Ticket'}
        size="lg"
      >
        <div className="space-y-4">
          <div className="flex gap-2">
            {selectedTicket && (
              <Badge variant={selectedTicket.status === 'open' ? 'warning' : selectedTicket.status === 'answered' ? 'primary' : 'gray'} dot>
                {selectedTicket.status}
              </Badge>
            )}
            <Badge variant="gray">{selectedTicket?.category}</Badge>
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

          {selectedTicket?.status !== 'closed' && (
            <div className="flex gap-2">
              <Input
                placeholder="Type your message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              />
              <Button onClick={handleSendMessage} loading={sending}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
