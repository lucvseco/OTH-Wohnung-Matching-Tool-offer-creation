import { afterEach, describe, expect, it, vi } from 'vitest';
import { AxiosError, AxiosHeaders } from 'axios';
import { ApiError, SERVER_UNREACHABLE, describeError, fetchOrThrow, reasonFromBody } from '../services/apiError';

const jsonResponse = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

//what the backend answered for the stale build: Spring Boot's default error body, now with exception and message
const springBootError = {
    timestamp: '2026-11-01T22:05:00.982+00:00',
    status: 500,
    error: 'Internal Server Error',
    exception: 'java.lang.NoSuchMethodError',
    message: "'OfferResponseDto DtoMapper.toOfferResponse(Offer)'",
    path: '/offers',
};
const realCause = "NoSuchMethodError: 'OfferResponseDto DtoMapper.toOfferResponse(Offer)'";

const axiosError = (status?: number, data?: unknown) =>
    new AxiosError(
        'Request failed',
        status ? 'ERR_BAD_RESPONSE' : 'ERR_NETWORK',
        undefined,
        undefined,
        status ? { status, statusText: '', data, headers: {}, config: { headers: new AxiosHeaders() } } : undefined,
    );

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('reasonFromBody', () => {
    it('lists the validation errors of a rejected request', () => {
        const body = { status: 400, detail: 'Validation failed', errors: { title: 'Title is too short', area: 'Area must be positive' } };
        expect(reasonFromBody(400, body)).toBe('Title is too short\nArea must be positive');
    });

    it('uses the detail of a ProblemDetail', () => {
        expect(reasonFromBody(400, { status: 400, detail: 'This apartment has already been rented' }))
            .toBe('This apartment has already been rented');
    });

    it('uses the exception of Spring Boot\'s default error body', () => {
        expect(reasonFromBody(500, springBootError)).toBe(realCause);
        expect(reasonFromBody(500, { ...springBootError, exception: undefined })).toBe(springBootError.message);
    });

    it('falls back to the status when the server gave no reason', () => {
        const withoutMessage = { ...springBootError, message: 'No message available' };
        expect(reasonFromBody(500, withoutMessage)).toBe('The server answered 500 with NoSuchMethodError.');
        expect(reasonFromBody(500, { ...withoutMessage, exception: undefined }))
            .toBe('The server answered 500 Internal Server Error without further details.');
        expect(reasonFromBody(502, null)).toBe('The server answered 502 without further details.');
    });
});

describe('fetchOrThrow', () => {
    it('returns the response of a successful request', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(200, [{ id: 1 }])));
        const response = await fetchOrThrow('http://localhost:8080/offers');
        expect(await response.json()).toEqual([{ id: 1 }]);
    });

    it('throws the server\'s reason for a failed request', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(500, springBootError)));
        const error = await fetchOrThrow('http://localhost:8080/offers').catch(err => err);
        expect(error).toBeInstanceOf(ApiError);
        expect(error.status).toBe(500);
        expect(error.message).toBe(realCause);
    });

    it('copes with an error response without a body', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 503 })));
        await expect(fetchOrThrow('http://localhost:8080/offers')).rejects.toThrow('The server answered 503 without further details.');
    });

    it('says the server is unreachable when the request never got an answer', async () => {
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
        await expect(fetchOrThrow('http://localhost:8080/offers')).rejects.toThrow(SERVER_UNREACHABLE);
    });
});

describe('describeError', () => {
    it('reads the reason out of a failed axios request', () => {
        expect(describeError(axiosError(500, springBootError))).toBe(realCause);
    });

    it('only blames the connection when there was no answer at all', () => {
        expect(describeError(axiosError())).toBe(SERVER_UNREACHABLE);
    });

    it('passes on the message of other errors', () => {
        expect(describeError(new ApiError('This apartment has already been rented', 400))).toBe('This apartment has already been rented');
    });
});
