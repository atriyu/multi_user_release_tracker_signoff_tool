import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { Package } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export function Login() {
  const { login, isLoading, error } = useAuth();

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    if (credentialResponse.credential) {
      await login(credentialResponse.credential);
    }
  };

  const handleGoogleError = () => {
    console.error('Google login failed');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-full max-w-md p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Package className="h-10 w-10 text-primary" />
            <h1 className="text-3xl font-bold">Release Tracker</h1>
          </div>
          <p className="text-muted-foreground text-center">
            Multi-user release management and sign-off workflow
          </p>
        </div>

        <div className="bg-card border rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4 text-center">Sign In</h2>

          {error && (
            <div className="mb-4 p-3 bg-destructive/10 text-destructive rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="flex flex-col items-center gap-4">
            <p className="text-sm text-muted-foreground text-center">
              Sign in with your Google account to continue
            </p>

            {isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                Signing in...
              </div>
            ) : (
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                useOneTap
                theme="outline"
                size="large"
                text="signin_with"
                shape="rectangular"
              />
            )}
          </div>
        </div>

        <p className="mt-6 text-xs text-muted-foreground text-center">
          New users will be automatically registered on first sign-in.
        </p>
      </div>
    </div>
  );
}
