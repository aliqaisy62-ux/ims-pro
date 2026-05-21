// User types
export type UserRole = 'ADMIN' | 'MANAGER' | 'CASHIER' | 'VIEWER' | 'ACCOUNTANT' | 'STAFF'
export type Language = 'ar' | 'en'

// Item types
export type PriceType = 'RETAIL' | 'WHOLESALE' | 'SPECIAL' | 'DOLLAR' | 'DINAR'
export type ItemUnit = 'piece' | 'kg' | 'gram' | 'liter' | 'box' | 'carton' | 'pack' | 'dozen' | 'meter'

// Invoice types
export type PaymentType = 'CASH' | 'CREDIT'
export type Currency = 'USD' | 'IQD'
export type InvoiceStatus = 'DRAFT' | 'CONFIRMED' | 'CANCELLED' | 'RETURNED'

// Customer types
export type CustomerType = 'RETAIL' | 'WHOLESALE'

// Voucher types
export type VoucherType = 'DISBURSEMENT' | 'RECEIPT'
export type EntityType = 'CUSTOMER' | 'SUPPLIER' | 'OTHER'

// Stock types
export type TransferType = 'IN' | 'OUT'
export type TransferReason = 'DAMAGE' | 'ADJUSTMENT' | 'TRANSFER' | 'RETURN' | 'EXPIRED'

// API Response types
export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
  error?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// Auth types
export interface AuthUser {
  id: string
  username: string
  name: string
  role: UserRole
  language: Language
}

export interface LoginRequest {
  username: string
  password: string
}

export interface AuthTokens {
  accessToken: string
  user: AuthUser
}

// Filter types
export interface DateRangeFilter {
  from?: Date
  to?: Date
}

export interface PaginationParams {
  page?: number
  pageSize?: number
}
