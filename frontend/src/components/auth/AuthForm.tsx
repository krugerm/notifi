// src/components/auth/AuthForm.tsx
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertState } from '@/types/chat';
import { LogIn, UserPlus } from 'lucide-react';

interface AuthFormProps {
  onAuth: (isRegistering: boolean) => Promise<void>;
  email: string;
  setEmail: (email: string) => void;
  password: string;
  setPassword: (password: string) => void;
  alert: AlertState | null;
  isLoading: boolean;
}

export const AuthForm = ({
  onAuth,
  email,
  setEmail,
  password,
  setPassword,
  alert,
  isLoading,
}: AuthFormProps) => {
  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-6 text-center">Chat App</h1>
        {alert && (
          <Alert variant={alert.type} className="mb-4">
            <AlertDescription>{alert.message}</AlertDescription>
          </Alert>
        )}
        <div className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
          />
          <div className="flex space-x-4">
            <button
              onClick={() => onAuth(false)}
              disabled={isLoading}
              className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              <LogIn className="w-4 h-4 mr-2" /> Login
            </button>
            <button
              onClick={() => onAuth(true)}
              disabled={isLoading}
              className="flex-1 flex items-center justify-center px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
            >
              <UserPlus className="w-4 h-4 mr-2" /> Register
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};