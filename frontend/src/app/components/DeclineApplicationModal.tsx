import { useState } from 'react';
import { X } from 'lucide-react';
import { FieldError } from './FieldError';
import { LIMITS, validateDeclineMessage } from '../utils/validation';

interface DeclineModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (declineMessage?: string) => void;
    applicantName: string;
}

export function DeclineModal({ isOpen, onClose, onSubmit, applicantName }: DeclineModalProps) {
    const [declineMessage, setDeclineMessage] = useState('');

    if (!isOpen) return null;

    const error = validateDeclineMessage(declineMessage);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (error) return;
        // Pass trimmed message if present, or undefined if left empty
        onSubmit(declineMessage.trim() ? declineMessage.trim() : undefined);
        setDeclineMessage('');
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
                <div className="flex items-center justify-between p-6 border-b">
                    <h2 className="text-xl font-bold text-gray-900">Decline Application</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6">
                    <p className="text-sm text-gray-600 mb-4">
                        You are declining <strong>{applicantName}</strong>'s application.
                    </p>

                    <label htmlFor="decline-message" className="block text-sm font-medium text-gray-700 mb-2">
                        Reason for declining <span className="text-gray-400 font-normal">(Optional)</span>
                    </label>
                    <textarea
                        id="decline-message"
                        value={declineMessage}
                        onChange={(e) => setDeclineMessage(e.target.value)}
                        aria-invalid={Boolean(error)}
                        rows={4}
                        placeholder="e.g., Sorry, we decided to give priority to applicants looking for a longer stay..."
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none resize-none ${
                            error ? 'border-red-400' : 'border-gray-300'
                        }`}
                        autoFocus
                    />
                    <div className="flex justify-between gap-4">
                        <FieldError message={error} />
                        <p className="text-sm text-gray-500 mt-1.5 ml-auto whitespace-nowrap">
                            {declineMessage.trim().length} / {LIMITS.DECLINE_MESSAGE_MAX}
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
                            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Confirm Decline
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}