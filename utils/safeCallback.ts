export const safeRedirect = (input: string): string => {
    if (!input.startsWith('/') || input.startsWith('//') || input.includes('\\')) return '/';
    return input;
};