export class BookingError extends Error {
  constructor(
    public code: 'SLOT_UNAVAILABLE' | 'SERVICES_NOT_FOUND' | 'PAYMENT_FAILED' | 'UNAUTHORIZED',
    message?: string
  ) {
    super(message ?? code)
    this.name = 'BookingError'
  }
}

export class AuthError extends Error {
  constructor(
    public code: 'NOT_AUTHENTICATED' | 'TOKEN_EXPIRED' | 'INSUFFICIENT_ROLE',
    message?: string
  ) {
    super(message ?? code)
    this.name = 'AuthError'
  }
}

export class AIError extends Error {
  constructor(
    public code: 'GEMINI_UNAVAILABLE' | 'RATE_LIMITED' | 'INVALID_RESPONSE',
    message?: string
  ) {
    super(message ?? code)
    this.name = 'AIError'
  }
}
