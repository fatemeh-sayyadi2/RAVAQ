export type UserRole = 'CUSTOMER' | 'ADMIN';

export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'PAID'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED';

export type PaymentStatus =
  | 'PENDING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'CANCELLED'
  | 'EXPIRED';

export type ImageRole = 'primary' | 'detail' | 'packaging' | 'lifestyle';

export interface ProductImage {
  id: string;
  url: string;
  role: ImageRole;
  alt: string;
  illustrationKey: string;
}

export interface ProductVariant {
  id: string;
  sku: string;
  label: string; // e.g., "۲۵۰ گرم", "۵۰۰ گرم", "جعبه متوسط"
  weightGrams?: number;
  price: number; // integer Toman
  compareAtPrice?: number; // optional genuine previous price in Toman
  stock: number;
  effectiveStock?: number;
}

export interface BundleItemRef {
  productSlug: string;
  variantSku?: string;
  name: string;
  quantityLabel: string;
  unitsRequired: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  categorySlug: string;
  categoryName: string;
  shortDescription: string;
  fullDescription: string;
  basePrice: number; // integer Toman (lowest active variant price)
  published: boolean;
  featured: boolean;
  sku: string;
  variants: ProductVariant[];
  images: ProductImage[];
  ingredientsOrMaterial?: string;
  allergens?: string;
  storageOrCare?: string;
  dimensionsOrWeight?: string;
  fragileWarning?: string;
  origin?: string; // Marked as unavailable if not verified
  occasionTags?: string[]; // e.g. ['نوروز', 'شب یلدا', 'مهمانی و دیدار', 'سازمانی']
  bundleItems?: BundleItemRef[];
  packagingDetails?: string;
  seoTitle: string;
  seoDescription: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  displayOrder: number;
  active: boolean;
  illustrationKey: string;
}

export interface Coupon {
  id: string;
  code: string;
  description: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number; // percent (1-100) or integer Toman
  minOrderAmount: number;
  maxDiscountAmount?: number;
  startsAt: string;
  endsAt: string;
  active: boolean;
  usageLimit: number;
  usedCount: number;
  perCustomerLimit: number;
  categorySlugRestriction?: string;
}

export interface CouponRedemption {
  id: string;
  couponId: string;
  couponCode: string;
  orderId: string;
  userId?: string;
  customerMobile: string;
  discountAmount: number;
  redeemedAt: string;
}

export interface CartItemInput {
  productId: string;
  variantId: string;
  quantity: number;
  giftMessage?: string;
}

export interface ValidatedCartItem {
  productId: string;
  productSlug: string;
  productName: string;
  categorySlug: string;
  variantId: string;
  variantLabel: string;
  sku: string;
  unitPrice: number;
  compareAtPrice?: number;
  quantity: number;
  availableStock: number;
  lineTotal: number;
  illustrationKey: string;
  giftMessage?: string;
  stockAdjusted?: boolean;
  unavailable?: boolean;
}

export interface CartValidationResult {
  items: ValidatedCartItem[];
  subtotal: number;
  discountAmount: number;
  appliedCoupon?: {
    code: string;
    description: string;
    discountAmount: number;
  };
  couponError?: string;
  shippingCost: number;
  freeShippingThreshold: number;
  payableTotal: number;
  warnings: string[];
}

export interface OrderItemSnapshot {
  id: string;
  productId: string;
  productSlug: string;
  productName: string;
  variantId: string;
  variantLabel: string;
  sku: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  giftMessage?: string;
}

export interface PaymentAttempt {
  id: string;
  attemptRef: string;
  orderId: string;
  orderNumber: string;
  userId?: string;
  amount: number; // integer Toman
  status: PaymentStatus;
  isSimulatedDemo?: boolean;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  completedAt?: string;
}

export interface OrderStatusHistoryEntry {
  id: string;
  orderId: string;
  userId?: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  note: string;
  actor: string;
  createdAt: string;
}

export interface InventoryMovement {
  id: string;
  productId: string;
  productName: string;
  variantId: string;
  variantLabel: string;
  sku: string;
  delta: number; // negative for deduction, positive for restock/release
  previousStock: number;
  newStock: number;
  reason: 'ORDER_PAID' | 'ADMIN_ADJUSTMENT' | 'BUNDLE_COMPONENT_PAID';
  referenceId: string;
  createdAt: string;
}

export interface CustomerAddressRecord {
  id: string;
  userId: string;
  recipientName: string;
  mobile: string;
  province: string;
  city: string;
  addressLine: string;
  postalCode: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId?: string; // optional for guest orders
  customerName: string;
  customerMobile: string;
  customerEmail?: string;
  province: string;
  city: string;
  addressLine: string;
  postalCode: string;
  orderNote?: string;
  deliveryMethod: 'STANDARD' | 'EXPRESS_TEHRAN';
  items: OrderItemSnapshot[];
  subtotal: number;
  discountAmount: number;
  couponCode?: string;
  shippingCost: number;
  totalAmount: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  stockDeducted: boolean;
  isSimulatedDemo?: boolean;
  lastAttemptRef?: string;
  idempotencyKey?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewRecord {
  id: string;
  productId: string;
  productSlug: string;
  userId: string;
  authorName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface UserAccount {
  id: string;
  uid: string;
  email: string;
  displayName: string;
  mobile?: string;
  passwordHash?: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface NewsletterSubscription {
  id: string;
  email: string;
  createdAt: string;
}

export interface StoreSettings {
  storeName: string;
  storeTagline: string;
  supportEmail: string;
  supportHours: string;
  standardShippingCost: number;
  expressTehranShippingCost: number;
  freeShippingThreshold: number;
  minOrderAmount: number;
  demoModeNotice: string;
  instagramUrl: string;
  telegramUrl: string;
}
