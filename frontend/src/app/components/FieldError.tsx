export function FieldError({ message, id }: { message?: string | null; id?: string }) {
    if (!message) return null;
    return (
        <p id={id} role="alert" className="text-sm text-red-600 mt-1.5">
            {message}
        </p>
    );
}
