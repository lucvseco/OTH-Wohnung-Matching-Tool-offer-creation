import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { FieldError } from '../components/FieldError';
import { validateOthEmail, validatePassword } from '../utils/validation';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null); // Track validation failures
  const [fieldErrors, setFieldErrors] = useState<{ email: string | null; password: string | null }>({ email: null, password: null });
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check the inputs before contacting the login service
    const errors = { email: validateOthEmail(email), password: validatePassword(password) };
    setFieldErrors(errors);
    if (errors.email || errors.password) return;

    setIsLoading(true);
    setErrorMessage(null); // Clear previous errors before trying again

    try {
      await login(email, password);
      navigate('/');
    } catch (error: any) {
      console.error('Login failed:', error);
      // Catch the custom Error text thrown from AuthContext.tsx
      setErrorMessage(error.message || 'Invalid university credentials. Try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-2xl font-bold">OTH</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Housing Match</h1>
            <p className="text-gray-600">Find your perfect accommodation</p>
          </div>

          {/* Conditional Error Banner Component */}
          {errorMessage && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg text-sm font-medium text-center">
                {errorMessage}
              </div>
          )}

          {/* noValidate: the inline messages below replace the browser's validation bubbles */}
          <form onSubmit={handleSubmit} noValidate className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                OTH Email Address
              </label>
              <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@oth-regensburg.de"
                  required
                  aria-invalid={Boolean(fieldErrors.email)}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition ${fieldErrors.email ? 'border-red-400' : 'border-gray-300'}`}
              />
              <FieldError message={fieldErrors.email} />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  aria-invalid={Boolean(fieldErrors.password)}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition ${fieldErrors.password ? 'border-red-400' : 'border-gray-300'}`}
              />
              <FieldError message={fieldErrors.password} />
            </div>

            <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-center text-sm text-gray-700 mb-2">
              <span className="font-medium">Demo Mode Credentials</span>
            </p>
            <div className="text-xs text-gray-600 space-y-1 font-mono text-center">
              <p>1. max.mustermann@stud.oth-regensburg.de / password123</p>
              <p>2. anna.schmidt@stud.oth-regensburg.de / secure456</p>
            </div>
          </div>
        </div>
      </div>
  );
}