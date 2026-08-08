import { useState, useRef } from 'react';
import { ShieldCheck, Upload, CheckCircle, X, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';

export function VerifyPage() {
  const { profile, refreshProfile } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
      setError('Only JPG and PNG files are allowed');
      return;
    }

    setSelectedFile(file);
    setError('');

    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const fakeEvent = { target: { files: [file] } } as any;
      handleFileSelect(fakeEvent);
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile || !profile) return;

    setSubmitting(true);
    setError('');

    try {
      // Upload image to Supabase storage
      const fileName = `${profile.id}/verification_${Date.now()}.${selectedFile.name.split('.').pop()}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('verification-docs')
        .upload(fileName, selectedFile, {
          contentType: selectedFile.type,
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('verification-docs')
        .getPublicUrl(fileName);

      // Create verification request
      const { error: insertError } = await supabase
        .from('verification_requests')
        .insert({
          user_id: profile.id,
          document_url: urlData.publicUrl,
          status: 'pending',
        });

      if (insertError) {
        throw insertError;
      }

      setSuccess(true);
      await refreshProfile();
    } catch (err: any) {
      setError(err.message || 'Failed to submit verification. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

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

  if (success) {
    return (
      <div className="space-y-6">
        <h1 className="font-heading text-2xl font-bold text-gray-900">Verification Submitted</h1>
        <Card className="p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success-50">
            <CheckCircle className="h-8 w-8 text-success-600" />
          </div>
          <h2 className="font-heading text-xl font-bold text-gray-900">Verification Pending</h2>
          <p className="mt-2 text-sm text-gray-600">
            Your verification request has been submitted successfully. Our team will review it within 24-48 hours.
          </p>
          <Button
            className="mt-4"
            onClick={() => {
              setSuccess(false);
              setSelectedFile(null);
              setPreview(null);
            }}
          >
            Submit Another
          </Button>
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

      {error && <Alert variant="error">{error}</Alert>}

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

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/jpeg,image/png,image/jpg"
            className="hidden"
          />

          {preview ? (
            <div className="relative mt-4">
              <img
                src={preview}
                alt="Preview"
                className="w-full rounded-lg border border-gray-200"
              />
              <button
                onClick={() => {
                  setSelectedFile(null);
                  setPreview(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="absolute right-2 top-2 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="mt-4 cursor-pointer rounded-lg border-2 border-dashed border-gray-300 p-8 text-center transition-colors hover:border-primary-400 hover:bg-gray-50"
            >
              {uploading ? (
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary-600" />
              ) : (
                <Upload className="mx-auto h-8 w-8 text-gray-400" />
              )}
              <p className="mt-2 text-sm text-gray-600">Click to upload or drag and drop</p>
              <p className="mt-1 text-xs text-gray-400">PNG, JPG up to 5MB</p>
            </div>
          )}

          <Button
            className="mt-4"
            fullWidth
            size="lg"
            loading={submitting}
            disabled={!selectedFile || submitting}
            onClick={handleSubmit}
          >
            {submitting ? 'Submitting...' : 'Submit for Verification'}
          </Button>

          <p className="mt-3 text-xs text-gray-500">
            Your information is kept confidential and used only for verification purposes.
          </p>
        </Card>
      </div>
    </div>
  );
}
