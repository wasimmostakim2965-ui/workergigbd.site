import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoadingSpinner } from '@/components/ui/EmptyState';
import { supabase } from '@/lib/supabase';

export function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the session from URL hash (OAuth callback)
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Auth callback error:', error);
          navigate('/login?error=auth_failed');
          return;
        }

        if (session) {
          // Session is established, redirect to dashboard
          navigate('/dashboard', { replace: true });
        } else {
          // No session, redirect to login
          navigate('/login');
        }
      } catch (err) {
        console.error('Callback handler error:', err);
        navigate('/login?error=callback_failed');
      }
    };

    handleCallback();
  }, [navigate]);

  return <LoadingSpinner size={48} className="min-h-screen" />;
}
