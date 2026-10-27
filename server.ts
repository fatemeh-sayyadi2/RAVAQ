import express, { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import {
  DatabaseState,
  createInitialDatabaseState,
  queryProducts,
  validateCart,
  createOrder,
  processPaymentAttempt,
  createRetryPaymentAttempt,
  trackOrderSafe,
  canUserAccessOrder,
  getAdminDashboardMetrics,
  updateOrderFulfillmentStatus,
  adjustVariantInventory,
  getEffectiveVariantStock,
} from './src/lib/commerce-engine.ts';
import {
  normalizeDigits,
  normalizeIranianMobile,
  isValidIranianMobile,
  normalizeIranianPostalCode,
  isValidIranianPostalCode,
} from './src/lib/persian.ts';

const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'ravaq-db.json');

function loadDatabase(): DatabaseState {
  const initial = createInitialDatabaseState();
  const initialImagesBySlug = new Map(
    initial.products.map((p) => [p.slug, p.images])
  );

  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as DatabaseState;
      if (parsed && Array.isArray(parsed.products) && parsed.products.length > 0) {
        let updatedAnyImages = false;
        parsed.products = parsed.products.map((prod) => {
          const seededImages = initialImagesBySlug.get(prod.slug);
          if (!seededImages) return prod;
          const needsRefresh = prod.images.some(
            (img) =>
              !img.url ||
              img.url.startsWith('/assets/ravaq/') ||
              img.url.endsWith('.svg')
          );
          if (needsRefresh) {
            updatedAnyImages = true;
            return {
              ...prod,
              images: seededImages,
            };
          }
          return prod;
        });
        if (updatedAnyImages) {
          saveDatabase(parsed);
        }
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error loading persisted database, seeding initial state:', err);
  }
  saveDatabase(initial);
  return initial;
}

function saveDatabase(state: DatabaseState): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving database:', err);
  }
}

function hashPassword(password: string): string {
  return crypto.scryptSync(password, 'ravaq-salt-2026', 64).toString('hex');
}

const dbState: DatabaseState = loadDatabase();

// Active session tokens in memory + persisted user records
interface SessionRecord {
  token: string;
  userId: string;
  uid: string;
  email: string;
  role: 'CUSTOMER' | 'ADMIN';
  createdAt: string;
}
const sessions = new Map<string, SessionRecord>();
const passwordResetTokens = new Map<string, { email: string; expiresAt: number }>();

// Seed default demo admin password hash if not set
const adminUser = dbState.users.find((u) => u.role === 'ADMIN');
if (adminUser && !adminUser.passwordHash) {
  const defaultPass = process.env.DEMO_ADMIN_PASSWORD || 'RavaqAdmin1405!';
  adminUser.passwordHash = hashPassword(defaultPass);
  saveDatabase(dbState);
}

const AUTHORIZED_ADMIN_EMAIL = 'fawti.tiri2@gmail.com';

function getAuthenticatedUser(req: Request): SessionRecord | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    const session = sessions.get(token);
    if (session) return session;
  }
  // Never grant ADMIN privileges based on unverified client-provided headers.
  return null;
}

function requireAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const session = getAuthenticatedUser(req);
  if (!session) {
    res.status(401).json({ error: 'برای دسترسی به این بخش ابتدا وارد حساب کاربری خود شوید.' });
    return;
  }
  (req as Request & { sessionUser?: SessionRecord }).sessionUser = session;
  next();
}

function requireAdminMiddleware(req: Request, res: Response, next: NextFunction) {
  const session = getAuthenticatedUser(req);
  if (!session || session.role !== 'ADMIN') {
    res.status(403).json({ error: 'دسترسی غیرمجاز: این عملیات ویژه مدیر فروشگاه رواق است.' });
    return;
  }
  (req as Request & { sessionUser?: SessionRecord }).sessionUser = session;
  next();
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // ==========================================
  // SEO: Sitemap & Robots
  // ==========================================
  app.get('/robots.txt', (req, res) => {
    const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    res.type('text/plain').send(
      `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /account\nDisallow: /checkout\nSitemap: ${baseUrl}/sitemap.xml\n`
    );
  });

  app.get('/sitemap.xml', (req, res) => {
    const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    const staticRoutes = [
      '',
      '/shop',
      '/gift-boxes',
      '/about',
      '/contact',
      '/faq',
      '/shipping',
      '/returns',
      '/privacy',
      '/terms',
      '/track-order',
    ];
    const urls = [
      ...staticRoutes.map((r) => `${baseUrl}${r}`),
      ...dbState.categories.filter((c) => c.active).map((c) => `${baseUrl}/category/${c.slug}`),
      ...dbState.products
        .filter((p) => p.published)
        .map((p) => `${baseUrl}/product/${p.slug}`),
    ];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
      .map((u) => `  <url><loc>${u}</loc></url>`)
      .join('\n')}\n</urlset>`;
    res.type('application/xml').send(xml);
  });

  // ==========================================
  // Public Storefront Endpoints & Verified Asset Discovery
  // ==========================================
  app.get('/api/assets/verified', (_req, res) => {
    const publicDir = path.resolve(process.cwd(), 'public');
    const findVerifiedAsset = (subDir: string, baseName: string, allowedExts: string[]): string | null => {
      for (const ext of allowedExts) {
        const relPath = `/assets/${subDir}/${baseName}.${ext}`;
        const fullPath = path.join(publicDir, 'assets', subDir, `${baseName}.${ext}`);
        try {
          if (fs.existsSync(fullPath)) {
            const stat = fs.statSync(fullPath);
            if (stat.isFile() && stat.size > 32) {
              return relPath;
            }
          }
        } catch {
          // ignore
        }
      }
      return null;
    };

    res.json({
      hero: {
        sharedVideo: findVerifiedAsset('hero', 'ravaq-hero', ['mp4', 'webm']),
        desktopVideo: findVerifiedAsset('hero', 'ravaq-hero-desktop', ['mp4', 'webm']),
        mobileVideo: findVerifiedAsset('hero', 'ravaq-hero-mobile', ['mp4', 'webm']),
        desktopImage: findVerifiedAsset('hero', 'ravaq-hero-desktop', ['webp', 'jpg', 'jpeg', 'png']),
        mobileImage: findVerifiedAsset('hero', 'ravaq-hero-mobile', ['webp', 'jpg', 'jpeg', 'png']),
      },
      categories: {
        'gift-boxes': findVerifiedAsset('categories', 'ravaq-gift-box', ['webp', 'jpg', 'png']),
        'nuts-dried-fruits': findVerifiedAsset('categories', 'iranian-pistachios-dried-fruits', ['webp', 'jpg', 'png']),
        'saffron-select-foods': findVerifiedAsset('categories', 'saffron-packaging', ['webp', 'jpg', 'png']),
        'traditional-sweets': findVerifiedAsset('categories', 'persian-traditional-sweets', ['webp', 'jpg', 'png']),
        'iranian-handicrafts': findVerifiedAsset('categories', 'iranian-artisan-gifts', ['webp', 'jpg', 'png']),
        'occasion-gifts': findVerifiedAsset('categories', 'occasion-gifts', ['webp', 'jpg', 'png']),
      },
    });
  });

  app.get('/api/bootstrap', (_req, res) => {
    const seededRef = createInitialDatabaseState();
    const seededUrlBySlug = new Map(
      seededRef.products.map((sp) => [sp.slug, sp.images[0]?.url || '/assets/products/gift-box-signature.jpg'])
    );

    const enrichedProducts = dbState.products
      .filter((p) => p.published)
      .map((p) => {
        const verifiedFallback = seededUrlBySlug.get(p.slug) || '/assets/products/gift-box-signature.jpg';
        const images = p.images.map((img) => ({
          ...img,
          url:
            !img.url ||
            img.url.startsWith('/assets/ravaq/') ||
            img.url.startsWith('/assets/categories/') ||
            img.url.endsWith('.svg') ||
            img.url.endsWith('.webp')
              ? verifiedFallback
              : img.url,
        }));
        return {
          ...p,
          images,
          variants: p.variants.map((v) => ({
            ...v,
            effectiveStock: getEffectiveVariantStock(dbState, p, v),
          })),
        };
      });

    res.json({
      categories: dbState.categories
        .filter((c) => c.active)
        .sort((a, b) => a.displayOrder - b.displayOrder),
      products: enrichedProducts,
      reviews: dbState.reviews,
      settings: dbState.settings,
      activeCoupons: dbState.coupons
        .filter((c) => c.active && new Date(c.endsAt).getTime() > Date.now() && c.usedCount < c.usageLimit)
        .map((c) => ({
          code: c.code,
          description: c.description,
          minOrderAmount: c.minOrderAmount,
        })),
    });
  });

  app.get('/api/products', (req, res) => {
    const {
      q,
      category,
      occasion,
      minPrice,
      maxPrice,
      available,
      sort,
    } = req.query;

    const results = queryProducts(dbState, {
      query: typeof q === 'string' ? q : undefined,
      categorySlug: typeof category === 'string' ? category : undefined,
      occasionTag: typeof occasion === 'string' ? occasion : undefined,
      minPrice: typeof minPrice === 'string' && minPrice ? Number(normalizeDigits(minPrice)) : undefined,
      maxPrice: typeof maxPrice === 'string' && maxPrice ? Number(normalizeDigits(maxPrice)) : undefined,
      onlyAvailable: available === 'true',
      sortBy:
        sort === 'price_asc' || sort === 'price_desc' || sort === 'newest' || sort === 'featured'
          ? sort
          : 'featured',
    });

    res.json({
      products: results.map((p) => ({
        ...p,
        variants: p.variants.map((v) => ({
          ...v,
          effectiveStock: getEffectiveVariantStock(dbState, p, v),
        })),
      })),
    });
  });

  app.get('/api/products/:slug', (req, res) => {
    const product = dbState.products.find(
      (p) => p.slug === req.params.slug && p.published
    );
    if (!product) {
      res.status(404).json({ error: 'محصول مورد نظر یافت نشد.' });
      return;
    }
    const productReviews = dbState.reviews.filter((r) => r.productId === product.id);
    const related = dbState.products
      .filter((p) => p.published && p.id !== product.id && p.categorySlug === product.categorySlug)
      .slice(0, 4);

    res.json({
      product: {
        ...product,
        variants: product.variants.map((v) => ({
          ...v,
          effectiveStock: getEffectiveVariantStock(dbState, product, v),
        })),
      },
      reviews: productReviews,
      relatedProducts: related,
    });
  });

  // ==========================================
  // Cart & Coupon Validation
  // ==========================================
  app.post('/api/cart/validate', (req, res) => {
    const session = getAuthenticatedUser(req);
    const { items, couponCode, deliveryMethod, customerMobile } = req.body || {};
    const validation = validateCart(dbState, Array.isArray(items) ? items : [], {
      couponCode: typeof couponCode === 'string' ? couponCode : undefined,
      deliveryMethod: deliveryMethod === 'EXPRESS_TEHRAN' ? 'EXPRESS_TEHRAN' : 'STANDARD',
      userId: session?.uid,
      customerMobile: typeof customerMobile === 'string' ? customerMobile : undefined,
    });
    res.json(validation);
  });

  // ==========================================
  // Checkout & Simulated Payment Gateway
  // ==========================================
  app.post('/api/orders', (req, res) => {
    const session = getAuthenticatedUser(req);
    const payload = {
      ...req.body,
      userId: session?.uid || req.body?.userId,
    };
    const result = createOrder(dbState, payload);
    if (!result.success) {
      res.status(400).json(result);
      return;
    }
    saveDatabase(dbState);
    res.status(201).json(result);
  });

  app.get('/api/payments/:attemptRef', (req, res) => {
    const attempt = dbState.paymentAttempts.find((pa) => pa.attemptRef === req.params.attemptRef);
    if (!attempt) {
      res.status(404).json({ error: 'مرجع تلاش پرداخت یافت نشد.' });
      return;
    }
    const order = dbState.orders.find((o) => o.id === attempt.orderId);
    if (!order) {
      res.status(404).json({ error: 'سفارش مرتبط یافت نشد.' });
      return;
    }
    res.json({
      paymentAttempt: attempt,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        totalAmount: order.totalAmount,
        subtotal: order.subtotal,
        discountAmount: order.discountAmount,
        shippingCost: order.shippingCost,
        status: order.status,
        paymentStatus: order.paymentStatus,
        items: order.items,
        createdAt: order.createdAt,
      },
      allAttempts: dbState.paymentAttempts.filter((pa) => pa.orderId === order.id),
      history: dbState.orderStatusHistory.filter((h) => h.orderId === order.id),
    });
  });

  app.post('/api/payments/:attemptRef/action', (req, res) => {
    const { action, expectedAmount, reason } = req.body || {};
    if (!['SUCCEED', 'FAIL', 'CANCEL', 'EXPIRE'].includes(action)) {
      res.status(400).json({ error: 'عملیات شبیه‌ساز پرداخت نامعتبر است.' });
      return;
    }
    const result = processPaymentAttempt(dbState, {
      attemptRef: req.params.attemptRef,
      action,
      expectedAmount: typeof expectedAmount === 'number' ? expectedAmount : undefined,
      reason: typeof reason === 'string' ? reason : undefined,
    });

    saveDatabase(dbState);
    if (!result.success) {
      res.status(400).json(result);
      return;
    }
    res.json(result);
  });

  app.post('/api/orders/:orderNumber/retry-payment', (req, res) => {
    const result = createRetryPaymentAttempt(dbState, req.params.orderNumber);
    if (!result.success) {
      res.status(400).json(result);
      return;
    }
    saveDatabase(dbState);
    res.json(result);
  });

  app.post('/api/orders/track', (req, res) => {
    const { orderNumber, customerMobile } = req.body || {};
    const result = trackOrderSafe(
      dbState,
      String(orderNumber || ''),
      String(customerMobile || '')
    );
    if (!result.found) {
      res.status(404).json(result);
      return;
    }
    res.json(result);
  });

  // ==========================================
  // Authentication (Session + Firebase Bridge)
  // ==========================================
  app.post('/api/auth/register', (req, res) => {
    const { displayName, email, mobile, password } = req.body || {};
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanName = String(displayName || '').trim();
    const cleanMobile = mobile ? normalizeIranianMobile(String(mobile)) : '';
    const cleanPass = String(password || '');

    if (cleanName.length < 2) {
      res.status(400).json({ error: 'نام و نام خانوادگی باید حداقل ۲ حرف باشد.' });
      return;
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      res.status(400).json({ error: 'لطفاً یک آدرس ایمیل معتبر وارد کنید.' });
      return;
    }
    if (cleanMobile && !isValidIranianMobile(cleanMobile)) {
      res.status(400).json({ error: 'شماره موبایل ایران معتبر نیست.' });
      return;
    }
    if (cleanPass.length < 6) {
      res.status(400).json({ error: 'رمز عبور باید حداقل ۶ کاراکتر باشد.' });
      return;
    }

    if (dbState.users.some((u) => u.email.toLowerCase() === cleanEmail)) {
      res.status(409).json({ error: 'کاربری با این ایمیل قبلاً ثبت‌نام کرده است.' });
      return;
    }

    const nowIso = new Date().toISOString();
    // Self-registration always creates a CUSTOMER account; only the pre-seeded fawti.tiri2@gmail.com admin account holds ADMIN privileges.
    const newUser = {
      id: `usr-${Date.now()}`,
      uid: `uid-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      email: cleanEmail,
      displayName: cleanName.slice(0, 100),
      mobile: cleanMobile || undefined,
      passwordHash: hashPassword(cleanPass),
      role: 'CUSTOMER' as const,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    dbState.users.push(newUser);
    saveDatabase(dbState);

    const token = crypto.randomBytes(24).toString('hex');
    const session: SessionRecord = {
      token,
      userId: newUser.id,
      uid: newUser.uid,
      email: newUser.email,
      role: newUser.role,
      createdAt: nowIso,
    };
    sessions.set(token, session);

    res.status(201).json({
      token,
      user: {
        id: newUser.id,
        uid: newUser.uid,
        email: newUser.email,
        displayName: newUser.displayName,
        mobile: newUser.mobile,
        role: newUser.role,
      },
    });
  });

  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body || {};
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanPass = String(password || '');

    const user = dbState.users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!user || !user.passwordHash || user.passwordHash !== hashPassword(cleanPass)) {
      res.status(401).json({ error: 'ایمیل یا رمز عبور واردشده نادرست است.' });
      return;
    }

    const token = crypto.randomBytes(24).toString('hex');
    const session: SessionRecord = {
      token,
      userId: user.id,
      uid: user.uid,
      email: user.email,
      role: user.role,
      createdAt: new Date().toISOString(),
    };
    sessions.set(token, session);

    res.json({
      token,
      user: {
        id: user.id,
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        mobile: user.mobile,
        role: user.role,
      },
    });
  });

  app.post('/api/auth/forgot-password', (req, res) => {
    const cleanEmail = String(req.body?.email || '').trim().toLowerCase();
    const user = dbState.users.find((u) => u.email.toLowerCase() === cleanEmail);
    const resetCode = normalizeDigits(String(Math.floor(100000 + Math.random() * 900000)));
    if (user) {
      passwordResetTokens.set(resetCode, {
        email: cleanEmail,
        expiresAt: Date.now() + 15 * 60 * 1000,
      });
    }
    res.json({
      message:
        'در صورت وجود حساب کاربری، کد بازیابی رمز عبور ایجاد شد. (در محیط توسعه، کد آزمایشی در پایین نمایش داده می‌شود).',
      devResetCode: user ? resetCode : '123456',
    });
  });

  app.post('/api/auth/reset-password', (req, res) => {
    const { code, newPassword } = req.body || {};
    const cleanCode = normalizeDigits(String(code || '')).trim();
    const cleanPass = String(newPassword || '');
    if (cleanPass.length < 6) {
      res.status(400).json({ error: 'رمز عبور جدید باید حداقل ۶ کاراکتر باشد.' });
      return;
    }
    const tokenRecord = passwordResetTokens.get(cleanCode);
    if (!tokenRecord || tokenRecord.expiresAt < Date.now()) {
      res.status(400).json({ error: 'کد بازیابی نامعتبر یا منقضی شده است.' });
      return;
    }
    const user = dbState.users.find((u) => u.email.toLowerCase() === tokenRecord.email);
    if (!user) {
      res.status(404).json({ error: 'کاربر یافت نشد.' });
      return;
    }
    user.passwordHash = hashPassword(cleanPass);
    user.updatedAt = new Date().toISOString();
    passwordResetTokens.delete(cleanCode);
    saveDatabase(dbState);
    res.json({ message: 'رمز عبور شما با موفقیت تغییر یافت. اکنون می‌توانید وارد شوید.' });
  });

  // ==========================================
  // Customer Account Endpoints (Ownership Protected)
  // ==========================================
  app.get('/api/account/overview', requireAuthMiddleware, (req, res) => {
    const session = (req as Request & { sessionUser: SessionRecord }).sessionUser;
    const user = dbState.users.find((u) => u.uid === session.uid || u.id === session.userId);
    const myAddresses = dbState.addresses.filter((a) => a.userId === session.uid);
    const myOrders = dbState.orders.filter((o) => o.userId === session.uid);

    res.json({
      profile: user
        ? {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            mobile: user.mobile,
            role: user.role,
          }
        : null,
      addresses: myAddresses,
      orders: myOrders,
    });
  });

  app.put('/api/account/profile', requireAuthMiddleware, (req, res) => {
    const session = (req as Request & { sessionUser: SessionRecord }).sessionUser;
    const user = dbState.users.find((u) => u.uid === session.uid || u.id === session.userId);
    if (!user) {
      res.status(404).json({ error: 'کاربر یافت نشد.' });
      return;
    }
    const { displayName, mobile } = req.body || {};
    if (!displayName || String(displayName).trim().length < 2) {
      res.status(400).json({ error: 'نام و نام خانوادگی باید حداقل ۲ حرف باشد.' });
      return;
    }
    if (mobile) {
      const normMob = normalizeIranianMobile(String(mobile));
      if (!isValidIranianMobile(normMob)) {
        res.status(400).json({ error: 'شماره موبایل واردشده معتبر نیست.' });
        return;
      }
      user.mobile = normMob;
    }
    user.displayName = String(displayName).trim().slice(0, 100);
    user.updatedAt = new Date().toISOString();
    saveDatabase(dbState);
    res.json({
      profile: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        mobile: user.mobile,
        role: user.role,
      },
    });
  });

  app.post('/api/account/addresses', requireAuthMiddleware, (req, res) => {
    const session = (req as Request & { sessionUser: SessionRecord }).sessionUser;
    const { recipientName, mobile, province, city, addressLine, postalCode, isDefault } =
      req.body || {};

    const normMobile = normalizeIranianMobile(String(mobile || ''));
    const normPostal = normalizeIranianPostalCode(String(postalCode || ''));

    if (!recipientName || String(recipientName).trim().length < 2) {
      res.status(400).json({ error: 'نام گیرنده الزامی است.' });
      return;
    }
    if (!isValidIranianMobile(normMobile)) {
      res.status(400).json({ error: 'شماره موبایل ایران معتبر نیست.' });
      return;
    }
    if (!province || !city || !addressLine || String(addressLine).trim().length < 8) {
      res.status(400).json({ error: 'استان، شهر و نشانی کامل پستی را وارد کنید.' });
      return;
    }
    if (!isValidIranianPostalCode(normPostal)) {
      res.status(400).json({ error: 'کد پستی باید ۱۰ رقم باشد.' });
      return;
    }

    if (isDefault) {
      for (const addr of dbState.addresses) {
        if (addr.userId === session.uid) addr.isDefault = false;
      }
    }

    const nowIso = new Date().toISOString();
    const newAddr = {
      id: `addr-${Date.now()}`,
      userId: session.uid,
      recipientName: String(recipientName).trim().slice(0, 100),
      mobile: normMobile,
      province: String(province).trim().slice(0, 60),
      city: String(city).trim().slice(0, 60),
      addressLine: String(addressLine).trim().slice(0, 300),
      postalCode: normPostal,
      isDefault: Boolean(isDefault),
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    dbState.addresses.unshift(newAddr);
    saveDatabase(dbState);
    res.status(201).json({ address: newAddr, addresses: dbState.addresses.filter((a) => a.userId === session.uid) });
  });

  app.delete('/api/account/addresses/:id', requireAuthMiddleware, (req, res) => {
    const session = (req as Request & { sessionUser: SessionRecord }).sessionUser;
    const idx = dbState.addresses.findIndex(
      (a) => a.id === req.params.id && a.userId === session.uid
    );
    if (idx === -1) {
      res.status(404).json({ error: 'نشانی مورد نظر یافت نشد یا متعلق به حساب شما نیست.' });
      return;
    }
    dbState.addresses.splice(idx, 1);
    saveDatabase(dbState);
    res.json({ addresses: dbState.addresses.filter((a) => a.userId === session.uid) });
  });

  app.get('/api/account/orders/:orderId', requireAuthMiddleware, (req, res) => {
    const session = (req as Request & { sessionUser: SessionRecord }).sessionUser;
    const order = dbState.orders.find(
      (o) => o.id === req.params.orderId || o.orderNumber === req.params.orderId
    );
    if (!order || !canUserAccessOrder(session, order)) {
      res.status(403).json({ error: 'شما اجازه دسترسی به جزئیات این سفارش را ندارید.' });
      return;
    }
    res.json({
      order,
      paymentAttempts: dbState.paymentAttempts.filter((pa) => pa.orderId === order.id),
      history: dbState.orderStatusHistory.filter((h) => h.orderId === order.id),
    });
  });

  // ==========================================
  // Newsletter & Reviews
  // ==========================================
  app.post('/api/newsletter', (req, res) => {
    const cleanEmail = String(req.body?.email || '').trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      res.status(400).json({ error: 'لطفاً یک آدرس ایمیل معتبر وارد کنید.' });
      return;
    }
    if (dbState.newsletterSubscriptions.some((s) => s.email.toLowerCase() === cleanEmail)) {
      res.status(409).json({ error: 'این آدرس ایمیل پیش‌تر در خبرنامه رواق ثبت شده است.' });
      return;
    }
    const sub = {
      id: `sub-${Date.now()}`,
      email: cleanEmail,
      createdAt: new Date().toISOString(),
    };
    dbState.newsletterSubscriptions.unshift(sub);
    saveDatabase(dbState);
    res.status(201).json({ message: 'ایمیل شما با موفقیت در خبرنامه رواق ثبت شد.' });
  });

  app.post('/api/reviews', requireAuthMiddleware, (req, res) => {
    const session = (req as Request & { sessionUser: SessionRecord }).sessionUser;
    const { productId, rating, comment } = req.body || {};
    const product = dbState.products.find((p) => p.id === productId);
    if (!product) {
      res.status(404).json({ error: 'محصول یافت نشد.' });
      return;
    }
    const numRating = Math.max(1, Math.min(5, Math.round(Number(rating) || 5)));
    const cleanComment = String(comment || '').trim();
    if (cleanComment.length < 5) {
      res.status(400).json({ error: 'متن دیدگاه باید حداقل ۵ کاراکتر باشد.' });
      return;
    }
    const user = dbState.users.find((u) => u.uid === session.uid);
    const review = {
      id: `rev-${Date.now()}`,
      productId: product.id,
      productSlug: product.slug,
      userId: session.uid,
      authorName: user?.displayName || 'کاربر رواق',
      rating: numRating,
      comment: cleanComment.slice(0, 600),
      createdAt: new Date().toISOString(),
    };
    dbState.reviews.unshift(review);
    saveDatabase(dbState);
    res.status(201).json({ review });
  });

  // ==========================================
  // Protected Admin Endpoints (/api/admin/*)
  // ==========================================
  app.get('/api/admin/dashboard', requireAdminMiddleware, (_req, res) => {
    const metrics = getAdminDashboardMetrics(dbState);
    res.json({
      metrics,
      products: dbState.products,
      categories: dbState.categories,
      orders: dbState.orders,
      paymentAttempts: dbState.paymentAttempts,
      orderStatusHistory: dbState.orderStatusHistory,
      customers: dbState.users.map((u) => ({
        id: u.id,
        uid: u.uid,
        email: u.email,
        displayName: u.displayName,
        mobile: u.mobile,
        role: u.role,
        createdAt: u.createdAt,
        orderCount: dbState.orders.filter((o) => o.userId === u.uid).length,
      })),
      coupons: dbState.coupons,
      inventoryMovements: dbState.inventoryMovements.slice(0, 100),
      reviews: dbState.reviews,
      settings: dbState.settings,
    });
  });

  app.post('/api/admin/products', requireAdminMiddleware, (req, res) => {
    const body = req.body || {};
    if (!body.name || !body.slug || !body.categorySlug) {
      res.status(400).json({ error: 'نام، اسلاگ و دسته‌بندی محصول الزامی است.' });
      return;
    }
    if (dbState.products.some((p) => p.slug === body.slug)) {
      res.status(409).json({ error: 'محصولی با این اسلاگ قبلاً ثبت شده است.' });
      return;
    }
    const category = dbState.categories.find((c) => c.slug === body.categorySlug);
    const nowIso = new Date().toISOString();
    const basePrice = Math.max(1000, Number(normalizeDigits(body.basePrice)) || 250000);
    const sku = String(body.sku || `RVQ-NEW-${Date.now().toString().slice(-4)}`).trim();

    const newProduct = {
      id: `prod-${Date.now()}`,
      name: String(body.name).trim(),
      slug: String(body.slug).trim().toLowerCase(),
      categorySlug: body.categorySlug,
      categoryName: category?.name || 'سایر محصولات',
      shortDescription: String(body.shortDescription || '').trim(),
      fullDescription: String(body.fullDescription || body.shortDescription || '').trim(),
      basePrice,
      published: body.published !== false,
      featured: Boolean(body.featured),
      sku,
      variants:
        Array.isArray(body.variants) && body.variants.length > 0
          ? body.variants
          : [
              {
                id: `${sku}-STD`,
                sku: `${sku}-STD`,
                label: String(body.defaultVariantLabel || 'بسته استاندارد'),
                price: basePrice,
                stock: Math.max(0, Number(normalizeDigits(body.initialStock ?? 15))),
              },
            ],
      images: [
        {
          id: `${body.slug}-img-1`,
          url: `/assets/ravaq/${body.illustrationKey || 'nuts'}-primary.svg`,
          role: 'primary' as const,
          alt: `تصویر ${body.name}`,
          illustrationKey: String(body.illustrationKey || 'nuts'),
        },
      ],
      ingredientsOrMaterial: body.ingredientsOrMaterial || undefined,
      allergens: body.allergens || undefined,
      storageOrCare: body.storageOrCare || undefined,
      dimensionsOrWeight: body.dimensionsOrWeight || undefined,
      origin: body.origin || 'نامشخص در داده‌های نمونه',
      seoTitle: `${body.name} | رواق`,
      seoDescription: String(body.shortDescription || body.name),
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    dbState.products.unshift(newProduct);
    saveDatabase(dbState);
    res.status(201).json({ product: newProduct });
  });

  app.put('/api/admin/products/:id', requireAdminMiddleware, (req, res) => {
    const product = dbState.products.find((p) => p.id === req.params.id);
    if (!product) {
      res.status(404).json({ error: 'محصول یافت نشد.' });
      return;
    }
    const body = req.body || {};
    if (body.name) product.name = String(body.name).trim();
    if (typeof body.shortDescription === 'string') product.shortDescription = body.shortDescription.trim();
    if (typeof body.fullDescription === 'string') product.fullDescription = body.fullDescription.trim();
    if (typeof body.published === 'boolean') product.published = body.published;
    if (typeof body.featured === 'boolean') product.featured = body.featured;
    if (Array.isArray(body.variants) && body.variants.length > 0) {
      product.variants = body.variants.map((v: any) => ({
        id: String(v.id || `${product.sku}-${Math.random().toString(36).slice(2, 5)}`),
        sku: String(v.sku || product.sku),
        label: String(v.label || 'استاندارد'),
        price: Math.max(0, Number(normalizeDigits(v.price)) || product.basePrice),
        compareAtPrice: v.compareAtPrice ? Number(normalizeDigits(v.compareAtPrice)) : undefined,
        stock: Math.max(0, Number(normalizeDigits(v.stock)) || 0),
      }));
      product.basePrice = Math.min(...product.variants.map((v) => v.price));
    }
    product.updatedAt = new Date().toISOString();
    saveDatabase(dbState);
    res.json({ product });
  });

  app.post('/api/admin/categories', requireAdminMiddleware, (req, res) => {
    const { name, slug, shortDescription, description, displayOrder } = req.body || {};
    if (!name || !slug) {
      res.status(400).json({ error: 'نام و اسلاگ دسته‌بندی الزامی است.' });
      return;
    }
    if (dbState.categories.some((c) => c.slug === slug)) {
      res.status(409).json({ error: 'دسته‌بندی با این اسلاگ وجود دارد.' });
      return;
    }
    const newCat = {
      id: `cat-${Date.now()}`,
      name: String(name).trim(),
      slug: String(slug).trim().toLowerCase(),
      shortDescription: String(shortDescription || '').trim(),
      description: String(description || shortDescription || '').trim(),
      displayOrder: Number(displayOrder) || dbState.categories.length + 1,
      active: true,
      illustrationKey: 'giftbox',
    };
    dbState.categories.push(newCat);
    saveDatabase(dbState);
    res.status(201).json({ category: newCat });
  });

  app.delete('/api/admin/categories/:id', requireAdminMiddleware, (req, res) => {
    const cat = dbState.categories.find((c) => c.id === req.params.id);
    if (!cat) {
      res.status(404).json({ error: 'دسته‌بندی یافت نشد.' });
      return;
    }
    const hasProducts = dbState.products.some((p) => p.categorySlug === cat.slug);
    if (hasProducts) {
      res.status(400).json({
        error: 'امکان حذف دسته‌بندی دارای محصول وجود ندارد. ابتدا محصولات آن را منتقل یا غیرفعال کنید.',
      });
      return;
    }
    dbState.categories = dbState.categories.filter((c) => c.id !== cat.id);
    saveDatabase(dbState);
    res.json({ categories: dbState.categories });
  });

  app.post('/api/admin/orders/:orderId/status', requireAdminMiddleware, (req, res) => {
    const session = (req as Request & { sessionUser: SessionRecord }).sessionUser;
    const { status, note } = req.body || {};
    const result = updateOrderFulfillmentStatus(dbState, {
      orderId: req.params.orderId,
      newStatus: status,
      note,
      adminActor: session.email,
    });
    if (!result.success) {
      res.status(400).json(result);
      return;
    }
    saveDatabase(dbState);
    res.json(result);
  });

  app.post('/api/admin/inventory/adjust', requireAdminMiddleware, (req, res) => {
    const { productId, variantId, newStock, referenceNote } = req.body || {};
    const result = adjustVariantInventory(dbState, {
      productId,
      variantId,
      newStock: Number(normalizeDigits(newStock)),
      referenceNote: String(referenceNote || 'اصلاح دستی موجودی در پنل مدیریت'),
    });
    if (!result.success) {
      res.status(400).json(result);
      return;
    }
    saveDatabase(dbState);
    res.json(result);
  });

  app.post('/api/admin/coupons', requireAdminMiddleware, (req, res) => {
    const { code, description, discountType, discountValue, minOrderAmount, maxDiscountAmount, usageLimit } =
      req.body || {};
    const cleanCode = normalizeDigits(String(code || '')).trim().toUpperCase();
    if (!cleanCode) {
      res.status(400).json({ error: 'کد تخفیف الزامی است.' });
      return;
    }
    if (dbState.coupons.some((c) => c.code.toUpperCase() === cleanCode)) {
      res.status(409).json({ error: 'این کد تخفیف قبلاً ثبت شده است.' });
      return;
    }
    const newCoupon = {
      id: `cpn-${Date.now()}`,
      code: cleanCode,
      description: String(description || 'کد تخفیف رواق').trim(),
      discountType: (discountType === 'FIXED' ? 'FIXED' : 'PERCENTAGE') as 'FIXED' | 'PERCENTAGE',
      discountValue: Math.max(1, Number(normalizeDigits(discountValue)) || 10),
      minOrderAmount: Math.max(0, Number(normalizeDigits(minOrderAmount)) || 0),
      maxDiscountAmount: maxDiscountAmount ? Number(normalizeDigits(maxDiscountAmount)) : undefined,
      startsAt: new Date().toISOString(),
      endsAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      active: true,
      usageLimit: Math.max(1, Number(normalizeDigits(usageLimit)) || 50),
      usedCount: 0,
      perCustomerLimit: 2,
    };
    dbState.coupons.unshift(newCoupon);
    saveDatabase(dbState);
    res.status(201).json({ coupon: newCoupon });
  });

  app.put('/api/admin/coupons/:id/toggle', requireAdminMiddleware, (req, res) => {
    const coupon = dbState.coupons.find((c) => c.id === req.params.id);
    if (!coupon) {
      res.status(404).json({ error: 'کد تخفیف یافت نشد.' });
      return;
    }
    coupon.active = !coupon.active;
    saveDatabase(dbState);
    res.json({ coupon });
  });

  app.put('/api/admin/settings', requireAdminMiddleware, (req, res) => {
    const body = req.body || {};
    if (body.storeName) dbState.settings.storeName = String(body.storeName).trim();
    if (body.storeTagline) dbState.settings.storeTagline = String(body.storeTagline).trim();
    if (body.supportEmail) dbState.settings.supportEmail = String(body.supportEmail).trim();
    if (body.supportHours) dbState.settings.supportHours = String(body.supportHours).trim();
    if (body.standardShippingCost !== undefined) {
      dbState.settings.standardShippingCost = Math.max(0, Number(normalizeDigits(body.standardShippingCost)) || 0);
    }
    if (body.expressTehranShippingCost !== undefined) {
      dbState.settings.expressTehranShippingCost = Math.max(0, Number(normalizeDigits(body.expressTehranShippingCost)) || 0);
    }
    if (body.freeShippingThreshold !== undefined) {
      dbState.settings.freeShippingThreshold = Math.max(0, Number(normalizeDigits(body.freeShippingThreshold)) || 0);
    }
    if (body.minOrderAmount !== undefined) {
      dbState.settings.minOrderAmount = Math.max(0, Number(normalizeDigits(body.minOrderAmount)) || 0);
    }
    saveDatabase(dbState);
    res.json({ settings: dbState.settings });
  });

  // Serve static media assets (including /assets/hero/*.mp4 with HTTP Range support) directly
  const publicAssetsPath = path.resolve(process.cwd(), 'public', 'assets');
  if (fs.existsSync(publicAssetsPath)) {
    app.use(
      '/assets',
      express.static(publicAssetsPath, {
        acceptRanges: true,
        maxAge: '1h',
      })
    );
  }

  // Mount Vite dev server or static build
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`RAVĀQ full-stack server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
