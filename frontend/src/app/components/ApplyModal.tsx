import { useState } from 'react';
import { X } from 'lucide-react';
import { FieldError } from './FieldError';
import { LIMITS, validateApplicationMessage } from '../utils/validation';

interface ApplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (message: string) => void;
  offerName: string;
}

export function ApplyModal({ isOpen, onClose, onSubmit, offerName }: ApplyModalProps) {
  const [message, setMessage] = useState('');
  const [touched, setTouched] = useState(false);

  if (!isOpen) return null;

  const error = validateApplicationMessage(message);
  const showError = touched || message !== '';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    // whitespace-only, too short or too long messages are never sent
    if (error) return;
    onSubmit(message.trim());
    setMessage('');
    setTouched(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">Apply for {offerName}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <label htmlFor="apply-message" className="block text-sm font-medium text-gray-700 mb-2">
            Introduce yourself
          </label>
          <textarea
            id="apply-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onBlur={() => setTouched(true)}
            aria-invalid={showError && Boolean(error)}
            rows={6}
            placeholder="Write a short message about yourself, why you're interested in this accommodation, and any relevant details..."
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none ${
              showError && error ? 'border-red-400' : 'border-gray-300'
            }`}
            required
            autoFocus
          />
          <div className="flex justify-between gap-4">
            <FieldError message={showError ? error : null} />
            <p className="text-sm text-gray-500 mt-1.5 ml-auto whitespace-nowrap">
              {message.trim().length} / {LIMITS.APPLICATION_MESSAGE_MAX}
            </p>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={Boolean(error)}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send Application
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
