import axios from 'axios';

// A failed backend request, its message is the reason the server gave (or that it couldn't be reached)
export class ApiError extends Error {
    readonly status?: number;

    constructor(message: string, status?: number) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
    }
}

export const SERVER_UNREACHABLE = 'Could not reach the server. Make sure the backend is running on http://localhost:8080.';

const isText = (value: unknown): value is string => typeof value === 'string' && value.trim() !== '';

// Picks the reason out of a Spring error body: validation field errors, a ProblemDetail's detail or
// the exception of Spring Boot's default error body (e.g. "NoSuchMethodError: ...")
export const reasonFromBody = (status: number, body: unknown): string => {
    if (body && typeof body === 'object') {
        const { errors, detail, message, exception, error } = body as Record<string, unknown>;
        const fieldMessages = errors && typeof errors === 'object' ? Object.values(errors).filter(isText) : [];
        if (fieldMessages.length > 0) return fieldMessages.join('\n');
        if (isText(detail)) return detail;
        const exceptionName = isText(exception) ? exception.split('.').pop() : undefined;
        if (isText(message) && message !== 'No message available') return exceptionName ? `${exceptionName}: ${message}` : message;
        if (exceptionName) return `The server answered ${status} with ${exceptionName}.`;
        if (isText(error)) return `The server answered ${status} ${error} without further details.`;
    }
    return `The server answered ${status} without further details.`;
};

// Reads the reason out of a failed fetch response
export const apiErrorFromResponse = async (response: Response): Promise<ApiError> => {
    let body: unknown = null;
    try {
        body = JSON.parse(await response.text());
    } catch {
        //empty or not JSON, only the status is left
    }
    return new ApiError(reasonFromBody(response.status, body), response.status);
};

// fetch that throws an ApiError with the server's reason when the request fails
export const fetchOrThrow = async (url: string, init?: RequestInit): Promise<Response> => {
    let response: Response;
    try {
        response = await fetch(url, init);
    } catch {
        throw new ApiError(SERVER_UNREACHABLE);
    }
    if (!response.ok) throw await apiErrorFromResponse(response);
    return response;
};

// Readable reason of anything an API call threw, for toasts and alerts
export const describeError = (err: unknown): string => {
    if (axios.isAxiosError(err)) {
        return err.response ? reasonFromBody(err.response.status, err.response.data) : SERVER_UNREACHABLE;
    }
    if (err instanceof Error && isText(err.message)) return err.message;
    return 'Unknown error.';
};
