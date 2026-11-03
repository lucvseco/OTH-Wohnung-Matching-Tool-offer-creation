import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginPage } from '../app/pages/LoginPage';

const { login, navigate } = vi.hoisted(() => ({ login: vi.fn(), navigate: vi.fn() }));

vi.mock('../app/context/AuthContext', () => ({ useAuth: () => ({ login }) }));
vi.mock('react-router', async (importOriginal) => ({
    ...(await importOriginal<typeof import('react-router')>()),
    useNavigate: () => navigate,
}));

beforeEach(() => {
    login.mockReset();
    navigate.mockReset();
});

async function submit(email: string, password: string) {
    const user = userEvent.setup();
    render(<LoginPage />);
    if (email) await user.type(screen.getByLabelText(/email/i), email);
    if (password) await user.type(screen.getByLabelText(/password/i), password);
    await user.click(screen.getByRole('button', { name: /sign in/i }));
}

describe('LoginPage rejects incorrect values', () => {
    it.each([
        ['', 'password123', /enter your email/i],
        ['max.mustermann', 'password123', /valid email/i],
        ['max@', 'password123', /valid email/i],
        ['max@gmail.com', 'password123', /use your OTH email/i],
        ['max@oth-regensburg.de.evil.com', 'password123', /use your OTH email/i],
        ['max.mustermann@stud.oth-regensburg.de', '', /enter your password/i],
        ['max.mustermann@stud.oth-regensburg.de', '     ', /enter your password/i],
    ])('email %j / password %j is not sent to the login service', async (email, password, message) => {
        await submit(email, password);
        expect(screen.getByText(message)).toBeInTheDocument();
        expect(login).not.toHaveBeenCalled();
    });

    it('logs in with a valid OTH email', async () => {
        login.mockResolvedValue(undefined);
        await submit('max.mustermann@stud.oth-regensburg.de', 'password123');
        expect(login).toHaveBeenCalledWith('max.mustermann@stud.oth-regensburg.de', 'password123');
        await waitFor(() => expect(navigate).toHaveBeenCalledWith('/'));
    });
});
