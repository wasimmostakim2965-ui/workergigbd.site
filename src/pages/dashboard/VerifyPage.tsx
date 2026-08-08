import { ShieldCheck, Upload, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';

export function VerifyPage() {
  const { profile } = useAuth();

  if (profile?.is_verified) {
    return (
      <div className="space-y-6">
        <h1 className="font-heading text-2xl font-bold text-gray-900">Account Verification</h1>
        <Card className="p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success-50">
            <CheckCircle className="h-8 w-8 text-success-600" />
          </div>
          <h2 className="font-heading text-xl font-bold text-gray-900">Your account is verified!</h2>
          <p className="mt-2 text-sm text-gray-600">You have full access to all platform features.</p>
          <div className="mt-4">
            <Badge variant="success" dot>Verified</Badge>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-gray-900">Verify Your Account</h1>
        <p className="mt-1 text-sm text-gray-600">Complete verification to unlock all features</p>
      </div>

      <Alert variant="warning" title="Account not verified">
        Some features may be limited until you verify your account. Verified users can withdraw earnings and post jobs.
      </Alert>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50">
            <ShieldCheck className="h-6 w-6 text-primary-600" />
          </div>
          <h3 className="font-heading font-bold text-gray-900">Why Get Verified?</h3>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex items-start gap-2.5">
              <CheckCircle className="h-5 w-5 shrink-0 text-success-600" />
              <span className="text-gray-700">Withdraw your earnings to mobile banking</span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle className="h-5 w-5 shrink-0 text-success-600" />
              <span className="text-gray-700">Post jobs for others to complete</span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle className="h-5 w-5 shrink-0 text-success-600" />
              <span className="text-gray-700">Higher task limits and priority access</span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle className="h-5 w-5 shrink-0 text-success-600" />
              <span className="text-gray-700">Trusted badge on your profile</span>
            </li>
          </ul>
        </Card>

        <Card className="p-6">
          <h3 className="font-heading font-bold text-gray-900">Submit Verification</h3>
          <p className="mt-2 text-sm text-gray-600">
            Upload a clear photo of your National ID card or any government-issued ID.
            Our team will review and verify your account within 24-48 hours.
          </p>

          <div className="mt-4 rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
            <Upload className="mx-auto mb-3 h-8 w-8 text-gray-400" />
            <p className="text-sm text-gray-600">Click to upload or drag and drop</p>
            <p className="mt-1 text-xs text-gray-400">PNG, JPG up to 5MB</p>
          </div>

          <Button className="mt-4" fullWidth size="lg">
            Submit for Verification
          </Button>

          <p className="mt-3 text-xs text-gray-500">
            Your information is kept confidential and used only for verification purposes.
          </p>
        </Card>
      </div>
    </div>
  );
}
