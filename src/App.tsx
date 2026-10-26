/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, ShoppingBag } from 'lucide-react';
import {
  Category,
  Product,
  ReviewRecord,
  StoreSettings,
  CartItemInput,
  CartValidationResult,
  CustomerAddressRecord,
  Order,
} from './lib/types.ts';
import {
  INITIAL_CATEGORIES,
  INITIAL_PRODUCTS,
  INITIAL_REVIEWS,
  INITIAL_STORE_SETTINGS,
} from './lib/seed-catalog.ts';
import { auth, onAuthStateChanged, signOut, syncFirebaseUserToFirestore } from './lib/firebase.ts';
import { Header, Footer } from './components/Layout.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { CatalogPage, ProductDetailPage } from './pages/CatalogAndProductPages.tsx';
import {
  CartPage,
  CheckoutPage,
  PaymentGatewayAndResultPage,
  OrderTrackingPage,
} from './pages/CartAndCheckoutPages.tsx';
import { AuthPage, AccountPage } from './pages/AuthAndAccountPages.tsx';
import { AdminDashboardPage } from './pages/AdminDashboardPage.tsx';
import { StaticContentPage } from './pages/StaticContentPages.tsx';

const CART_STORAGE_KEY = 'ravaq_cart_v1';
const COUPON_STORAGE_KEY = 'ravaq_coupon_v1';
const AUTH_SESSION_STORAGE_KEY = 'ravaq_auth_session_v1';

interface AppUser {
  uid: string;
  displayName: string;
  email: string;
  mobile?: string;
  role: 'CUSTOMER' | 'ADMIN';
}

export default function App() {
  // URL Route state
  const [routeUrl, setRouteUrl] = useState<string>(() => {
    if (typeof window === 'undefined') return '/';
    return window.location.pathname + window.location.search;
  });

  // Catalog & Store Data
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [products, setProducts] = useState<
    Array<
      Product & {
        variants: Array<Product['variants'][number] & { effectiveStock?: number }>;
      }
    >
  >(INITIAL_PRODUCTS);
  const [reviews, setReviews] = useState<ReviewRecord[]>(INITIAL_REVIEWS);
  const [settings, setSettings] = useState<StoreSettings>(INITIAL_STORE_SETTINGS);

  // Cart & Coupon State
  const [cartItems, setCartItems] = useState<CartItemInput[]>(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [];
  });
  const [couponCode, setCouponCode] = useState<string>(() => {
    try {
      return localStorage.getItem(COUPON_STORAGE_KEY) || '';
    } catch {
      return '';
    }
  });
  const [cartValidation, setCartValidation] = useState<CartValidationResult | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Auth & Account State
  const [user, setUser] = useState<AppUser | null>(() => {
    try {
      const raw = localStorage.getItem(AUTH_SESSION_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return parsed.user || null;
      }
    } catch {
      // ignore
    }
    return null;
  });
  const [authToken, setAuthToken] = useState<string | null>(() => {
    try {
      const raw = localStorage.getItem(AUTH_SESSION_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return parsed.token || null;
      }
    } catch {
      // ignore
    }
    return null;
  });
  const [addresses, setAddresses] = useState<CustomerAddressRecord[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  // Navigation handler
  const navigate = useCallback((path: string) => {
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', path);
      setRouteUrl(path);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    const onPopState = () => {
      setRouteUrl(window.location.pathname + window.location.search);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Load initial catalog from server
  const fetchBootstrap = useCallback(async () => {
    try {
      const res = await fetch('/api/bootstrap');
      if (res.ok) {
        const data = await res.json();
        if (data.categories) setCategories(data.categories);
        if (data.products) setProducts(data.products);
        if (data.reviews) setReviews(data.reviews);
        if (data.settings) setSettings(data.settings);
      }
    } catch {
      // Fallback to seed catalog already loaded
    }
  }, []);

  useEffect(() => {
    fetchBootstrap();
  }, [fetchBootstrap]);

  // Listen to Firebase Auth state for Google Sign-In
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const synced = await syncFirebaseUserToFirestore(fbUser);
        const appUser: AppUser = {
          uid: synced.uid,
          displayName: synced.displayName,
          email: synced.email,
          role: synced.role,
        };
        setUser(appUser);
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch Account Orders & Addresses when user changes
  const fetchAccountData = useCallback(async () => {
    if (!user) {
      setAddresses([]);
      setOrders([]);
      return;
    }
    try {
      const headers: Record<string, string> = {};
      if (authToken) headers.Authorization = `Bearer ${authToken}`;
      headers['x-firebase-uid'] = user.uid;
      headers['x-firebase-email'] = user.email;
      headers['x-firebase-name'] = user.displayName;

      const res = await fetch('/api/account/summary', { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.addresses) setAddresses(data.addresses);
        if (data.orders) setOrders(data.orders);
      }
    } catch {
      // ignore
    }
  }, [user, authToken]);

  useEffect(() => {
    fetchAccountData();
  }, [fetchAccountData]);

  // Sync Cart with localStorage and Server Authoritative Validator
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
      localStorage.setItem(COUPON_STORAGE_KEY, couponCode);
    } catch {
      // ignore
    }

    const validateOnServer = async () => {
      try {
        const res = await fetch('/api/cart/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: cartItems,
            couponCode: couponCode || undefined,
          }),
        });
        if (res.ok) {
          const data: CartValidationResult = await res.json();
          setCartValidation(data);
        }
      } catch {
        // ignore
      }
    };

    validateOnServer();
  }, [cartItems, couponCode]);

  // Cart manipulation handlers
  const handleAddToCart = (
    productId: string,
    variantId: string,
    quantity: number,
    giftMessage?: string
  ) => {
    setCartItems((prev) => {
      const existingIndex = prev.findIndex(
        (i) => i.productId === productId && i.variantId === variantId
      );
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + quantity,
          giftMessage: giftMessage || updated[existingIndex].giftMessage,
        };
        return updated;
      }
      return [...prev, { productId, variantId, quantity, giftMessage }];
    });

    const prod = products.find((p) => p.id === productId);
    setToastMessage(
      prod ? `«${prod.name}» به سبد خرید رواق اضافه شد` : 'محصول به سبد خرید اضافه شد'
    );
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  const handleUpdateQuantity = (productId: string, variantId: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveCartItem(productId, variantId);
      return;
    }
    setCartItems((prev) =>
      prev.map((i) =>
        i.productId === productId && i.variantId === variantId ? { ...i, quantity } : i
      )
    );
  };

  const handleChangeVariant = (
    productId: string,
    oldVariantId: string,
    newVariantId: string
  ) => {
    if (oldVariantId === newVariantId) return;
    setCartItems((prev) => {
      const oldItem = prev.find(
        (i) => i.productId === productId && i.variantId === oldVariantId
      );
      if (!oldItem) return prev;
      const withoutOld = prev.filter(
        (i) => !(i.productId === productId && i.variantId === oldVariantId)
      );
      const existingNew = withoutOld.find(
        (i) => i.productId === productId && i.variantId === newVariantId
      );
      if (existingNew) {
        return withoutOld.map((i) =>
          i.productId === productId && i.variantId === newVariantId
            ? { ...i, quantity: i.quantity + oldItem.quantity }
            : i
        );
      }
      return [...withoutOld, { ...oldItem, variantId: newVariantId }];
    });
  };

  const handleRemoveCartItem = (productId: string, variantId: string) => {
    setCartItems((prev) =>
      prev.filter((i) => !(i.productId === productId && i.variantId === variantId))
    );
  };

  const handleClearCart = () => {
    setCartItems([]);
    setCouponCode('');
  };

  const handleAuthSuccess = (newUser: AppUser, token: string | null) => {
    setUser(newUser);
    setAuthToken(token);
    try {
      localStorage.setItem(
        AUTH_SESSION_STORAGE_KEY,
        JSON.stringify({ user: newUser, token })
      );
    } catch {
      // ignore
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch {
      // ignore
    }
    setUser(null);
    setAuthToken(null);
    setAddresses([]);
    setOrders([]);
    try {
      localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
    } catch {
      // ignore
    }
    navigate('/');
  };

  // Parse path & query
  const [pathname, queryString] = routeUrl.split('?');
  const searchParams = new URLSearchParams(queryString || '');

  // Total items count in cart
  const totalCartCount = cartItems.reduce((acc, i) => acc + i.quantity, 0);

  // Route Dispatcher
  const renderPage = () => {
    if (pathname === '/' || pathname === '') {
      return (
        <HomePage
          categories={categories}
          products={products}
          reviews={reviews}
          onNavigate={navigate}
          onAddToCart={handleAddToCart}
        />
      );
    }

    if (pathname === '/shop') {
      return (
        <CatalogPage
          mode="shop"
          categories={categories}
          products={products}
          reviews={reviews}
          onNavigate={navigate}
          onAddToCart={handleAddToCart}
        />
      );
    }

    if (pathname.startsWith('/category/')) {
      const slug = decodeURIComponent(pathname.replace('/category/', ''));
      return (
        <CatalogPage
          mode="category"
          categorySlug={slug}
          categories={categories}
          products={products}
          reviews={reviews}
          onNavigate={navigate}
          onAddToCart={handleAddToCart}
        />
      );
    }

    if (pathname === '/search') {
      const q = searchParams.get('q') || '';
      return (
        <CatalogPage
          mode="search"
          initialSearchQuery={q}
          categories={categories}
          products={products}
          reviews={reviews}
          onNavigate={navigate}
          onAddToCart={handleAddToCart}
        />
      );
    }

    if (pathname === '/gift-boxes') {
      return (
        <CatalogPage
          mode="gift-boxes"
          categories={categories}
          products={products}
          reviews={reviews}
          onNavigate={navigate}
          onAddToCart={handleAddToCart}
        />
      );
    }

    if (pathname.startsWith('/gift-boxes/')) {
      const slug = decodeURIComponent(pathname.replace('/gift-boxes/', ''));
      return (
        <ProductDetailPage
          slug={slug}
          products={products}
          reviews={reviews}
          user={user}
          authToken={authToken}
          onNavigate={navigate}
          onAddToCart={handleAddToCart}
          onReviewAdded={(rev) => setReviews((prev) => [rev, ...prev])}
        />
      );
    }

    if (pathname.startsWith('/product/')) {
      const slug = decodeURIComponent(pathname.replace('/product/', ''));
      return (
        <ProductDetailPage
          slug={slug}
          products={products}
          reviews={reviews}
          user={user}
          authToken={authToken}
          onNavigate={navigate}
          onAddToCart={handleAddToCart}
          onReviewAdded={(rev) => setReviews((prev) => [rev, ...prev])}
        />
      );
    }

    if (pathname === '/cart') {
      return (
        <CartPage
          cartItems={cartItems}
          products={products}
          validation={cartValidation}
          couponCode={couponCode}
          onCouponChange={setCouponCode}
          onUpdateQuantity={handleUpdateQuantity}
          onChangeVariant={handleChangeVariant}
          onRemoveItem={handleRemoveCartItem}
          onClearCart={handleClearCart}
          onNavigate={navigate}
        />
      );
    }

    if (pathname === '/checkout') {
      return (
        <CheckoutPage
          cartItems={cartItems}
          validation={cartValidation}
          couponCode={couponCode}
          user={user}
          savedAddresses={addresses}
          authToken={authToken}
          onOrderCreated={(_orderNumber, attemptRef) => {
            handleClearCart();
            fetchAccountData();
            navigate(`/checkout/result?attempt=${encodeURIComponent(attemptRef)}`);
          }}
          onNavigate={navigate}
        />
      );
    }

    if (pathname === '/checkout/result') {
      const attemptRef = searchParams.get('attempt') || '';
      return (
        <PaymentGatewayAndResultPage
          attemptRef={attemptRef}
          onPaymentStateChanged={() => {
            fetchBootstrap();
            fetchAccountData();
          }}
          onNavigate={navigate}
        />
      );
    }

    if (pathname === '/track-order') {
      return <OrderTrackingPage onNavigate={navigate} />;
    }

    // Auth routes
    if (pathname === '/login') {
      return (
        <AuthPage
          mode="login"
          onAuthSuccess={handleAuthSuccess}
          onNavigate={navigate}
        />
      );
    }
    if (pathname === '/register') {
      return (
        <AuthPage
          mode="register"
          onAuthSuccess={handleAuthSuccess}
          onNavigate={navigate}
        />
      );
    }
    if (pathname === '/forgot-password') {
      return (
        <AuthPage
          mode="forgot-password"
          onAuthSuccess={handleAuthSuccess}
          onNavigate={navigate}
        />
      );
    }
    if (pathname === '/reset-password') {
      return (
        <AuthPage
          mode="reset-password"
          onAuthSuccess={handleAuthSuccess}
          onNavigate={navigate}
        />
      );
    }

    // Customer Account routes
    if (pathname === '/account') {
      return (
        <AccountPage
          subRoute="overview"
          user={user}
          authToken={authToken}
          addresses={addresses}
          orders={orders}
          onRefreshAccount={fetchAccountData}
          onLogout={handleLogout}
          onNavigate={navigate}
        />
      );
    }
    if (pathname === '/account/profile') {
      return (
        <AccountPage
          subRoute="profile"
          user={user}
          authToken={authToken}
          addresses={addresses}
          orders={orders}
          onRefreshAccount={fetchAccountData}
          onLogout={handleLogout}
          onNavigate={navigate}
        />
      );
    }
    if (pathname === '/account/addresses') {
      return (
        <AccountPage
          subRoute="addresses"
          user={user}
          authToken={authToken}
          addresses={addresses}
          orders={orders}
          onRefreshAccount={fetchAccountData}
          onLogout={handleLogout}
          onNavigate={navigate}
        />
      );
    }
    if (pathname === '/account/orders') {
      return (
        <AccountPage
          subRoute="orders"
          user={user}
          authToken={authToken}
          addresses={addresses}
          orders={orders}
          onRefreshAccount={fetchAccountData}
          onLogout={handleLogout}
          onNavigate={navigate}
        />
      );
    }
    if (pathname.startsWith('/account/orders/')) {
      const orderIdParam = decodeURIComponent(pathname.replace('/account/orders/', ''));
      return (
        <AccountPage
          subRoute="order-detail"
          orderIdParam={orderIdParam}
          user={user}
          authToken={authToken}
          addresses={addresses}
          orders={orders}
          onRefreshAccount={fetchAccountData}
          onLogout={handleLogout}
          onNavigate={navigate}
        />
      );
    }

    // Admin routes
    if (pathname === '/admin' || pathname.startsWith('/admin/')) {
      return (
        <AdminDashboardPage
          currentPath={pathname}
          user={user}
          authToken={authToken}
          onDataMutated={() => {
            fetchBootstrap();
            fetchAccountData();
          }}
          onNavigate={navigate}
        />
      );
    }

    // Static Content routes
    if (
      pathname === '/about' ||
      pathname === '/contact' ||
      pathname === '/faq' ||
      pathname === '/shipping' ||
      pathname === '/returns' ||
      pathname === '/privacy' ||
      pathname === '/terms'
    ) {
      const pageKey = pathname.replace('/', '') as
        | 'about'
        | 'contact'
        | 'faq'
        | 'shipping'
        | 'returns'
        | 'privacy'
        | 'terms';
      return (
        <StaticContentPage
          page={pageKey}
          settings={settings}
          onNavigate={navigate}
        />
      );
    }

    return (
      <StaticContentPage
        page="not-found"
        settings={settings}
        onNavigate={navigate}
      />
    );
  };

  return (
    <div dir="rtl" className="min-h-screen flex flex-col bg-[#F8F4EC] text-[#292624]">
      <Header
        currentPath={pathname}
        onNavigate={navigate}
        cartCount={totalCartCount}
        user={user}
      />

      <main className="flex-1">{renderPage()}</main>

      {/* Toast Notification on Add to Cart */}
      {toastMessage && (
        <div className="fixed bottom-6 left-6 z-50 bg-[#292624] text-[#F8F4EC] px-4 py-3 rounded-xl border border-[#B89A62]/60 shadow-lg flex items-center gap-3 text-xs font-medium">
          <CheckCircle2 className="w-4 h-4 text-[#2D8C88] shrink-0" />
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => {
              setToastMessage(null);
              navigate('/cart');
            }}
            className="mr-2 px-2.5 py-1 bg-[#742E3A] text-[#F8F4EC] rounded font-bold flex items-center gap-1 cursor-pointer"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>سبد خرید</span>
          </button>
        </div>
      )}

      <Footer settings={settings} onNavigate={navigate} />
    </div>
  );
}
