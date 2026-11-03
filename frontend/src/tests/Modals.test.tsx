import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApplyModal } from '../app/components/ApplyModal';
import { DeclineModal } from '../app/components/DeclineApplicationModal';
import { LIMITS } from '../app/utils/validation';

const onSubmit = vi.fn();
const onClose = vi.fn();

beforeEach(() => {
    onSubmit.mockReset();
    onClose.mockReset();
});

const submitForm = (button: HTMLElement) => fireEvent.submit(button.closest('form')!);

describe('ApplyModal rejects incorrect messages', () => {
    const renderModal = () => render(<ApplyModal isOpen onClose={onClose} onSubmit={onSubmit} offerName="WG Room" />);
    const sendButton = () => screen.getByRole('button', { name: /send application/i });

    it.each([
        ['', 'empty'],
        ['        ', 'only spaces'],
        ['\n\n\t', 'only line breaks'],
        ['Hi!', 'too short'],
        ['a'.repeat(LIMITS.APPLICATION_MESSAGE_MAX + 1), 'too long'],
    ])('does not send %j (%s)', (message) => {
        renderModal();
        fireEvent.change(screen.getByLabelText(/introduce yourself/i), { target: { value: message } });
        expect(sendButton()).toBeDisabled();

        //even a forced submit (e.g. Enter key) must not go through
        submitForm(sendButton());
        expect(onSubmit).not.toHaveBeenCalled();
        expect(onClose).not.toHaveBeenCalled();
    });

    it('shows why a message is rejected', async () => {
        const user = userEvent.setup();
        renderModal();
        await user.type(screen.getByLabelText(/introduce yourself/i), 'Hi!');
        expect(screen.getByText(/at least 20 characters/i)).toBeInTheDocument();
    });

    it('sends a valid message trimmed', async () => {
        const user = userEvent.setup();
        renderModal();
        await user.type(screen.getByLabelText(/introduce yourself/i), '   Hi, I am Max and I study at OTH.   ');
        await user.click(sendButton());
        expect(onSubmit).toHaveBeenCalledWith('Hi, I am Max and I study at OTH.');
    });
});

describe('DeclineModal rejects incorrect reasons', () => {
    const renderModal = () => render(<DeclineModal isOpen onClose={onClose} onSubmit={onSubmit} applicantName="Anna" />);
    const confirmButton = () => screen.getByRole('button', { name: /confirm decline/i });

    it('does not accept a reason that is too long', () => {
        renderModal();
        fireEvent.change(screen.getByLabelText(/reason for declining/i), {
            target: { value: 'a'.repeat(LIMITS.DECLINE_MESSAGE_MAX + 1) },
        });
        expect(screen.getByText(/at most 500 characters/i)).toBeInTheDocument();
        expect(confirmButton()).toBeDisabled();

        submitForm(confirmButton());
        expect(onSubmit).not.toHaveBeenCalled();
    });

    it('sends no reason when only whitespace was entered', async () => {
        const user = userEvent.setup();
        renderModal();
        await user.type(screen.getByLabelText(/reason for declining/i), '    ');
        await user.click(confirmButton());
        expect(onSubmit).toHaveBeenCalledWith(undefined);
    });

    it('sends a valid reason trimmed', async () => {
        const user = userEvent.setup();
        renderModal();
        await user.type(screen.getByLabelText(/reason for declining/i), '  Room is taken  ');
        await user.click(confirmButton());
        expect(onSubmit).toHaveBeenCalledWith('Room is taken');
    });
});
