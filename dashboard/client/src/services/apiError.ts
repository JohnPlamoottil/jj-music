export type ApiErrorCode =
  | 'network'
  | 'unauthorized'
  | 'not_found'
  | 'validation'
  | 'too_large'
  | 'storage'
  | 'server';

export class ApiError extends Error {
  status: number;
  code: ApiErrorCode;
  constructor(message: string, status = 500, code: ApiErrorCode = 'server') {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

/** Turn anything thrown during a request into a sentence a person can act on. */
export function messageFor(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'network':
        return 'No connection to your library. Check your network and try again.';
      case 'unauthorized':
        return 'Your session ended. Sign in to continue.';
      case 'not_found':
        return 'That item is no longer in your library.';
      case 'storage':
        return 'Storage is unreachable, so audio cannot be loaded right now.';
      case 'too_large':
        return 'That file is larger than the upload limit.';
      default:
        return error.message;
    }
  }
  return 'Something went wrong. Try again.';
}
