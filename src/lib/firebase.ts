import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  where,
  serverTimestamp
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testConnection(): Promise<void> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

// Run connection check on client boot
if (typeof window !== 'undefined') {
  testConnection();
}

export async function syncFirebaseUserToFirestore(user: FirebaseUser): Promise<{
  uid: string;
  displayName: string;
  email: string;
  role: 'CUSTOMER' | 'ADMIN';
}> {
  const userPath = `users/${user.uid}`;
  const privatePath = `users/${user.uid}/private/info`;
  const isDefaultAdmin = user.email === 'fawti.tiri2@gmail.com';
  const displayName = (user.displayName || 'کاربر رواق').slice(0, 100);
  const role: 'CUSTOMER' | 'ADMIN' = isDefaultAdmin ? 'ADMIN' : 'CUSTOMER';

  try {
    const existingDoc = await getDoc(doc(db, 'users', user.uid));
    if (!existingDoc.exists()) {
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        displayName,
        role,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, userPath);
  }

  if (user.email) {
    try {
      await setDoc(
        doc(db, 'users', user.uid, 'private', 'info'),
        {
          uid: user.uid,
          email: user.email.slice(0, 160),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, privatePath);
    }
  }

  return {
    uid: user.uid,
    displayName,
    email: user.email || '',
    role,
  };
}

export async function saveAddressToFirestore(
  uid: string,
  addressId: string,
  payload: {
    recipientName: string;
    mobile: string;
    province: string;
    city: string;
    addressLine: string;
    postalCode: string;
    isDefault: boolean;
  }
) {
  const path = `users/${uid}/addresses/${addressId}`;
  try {
    await setDoc(doc(db, 'users', uid, 'addresses', addressId), {
      uid: uid.slice(0, 128),
      recipientName: payload.recipientName.slice(0, 100),
      mobile: payload.mobile.slice(0, 20),
      province: payload.province.slice(0, 60),
      city: payload.city.slice(0, 60),
      addressLine: payload.addressLine.slice(0, 300),
      postalCode: payload.postalCode.slice(0, 10),
      isDefault: Boolean(payload.isDefault),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function mirrorOrderToFirestore(
  orderId: string,
  payload: {
    orderNumber: string;
    userId: string;
    status: string;
    paymentStatus: string;
    totalAmount: number;
  }
) {
  if (!auth.currentUser || auth.currentUser.uid !== payload.userId) return;
  const path = `orders/${orderId}`;
  try {
    await setDoc(doc(db, 'orders', orderId), {
      orderNumber: payload.orderNumber.slice(0, 40),
      userId: payload.userId.slice(0, 128),
      status: payload.status.slice(0, 30),
      paymentStatus: payload.paymentStatus.slice(0, 30),
      totalAmount: Math.max(0, Math.floor(payload.totalAmount)),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export {
  signInWithPopup,
  firebaseSignOut,
  firebaseSignOut as signOut,
  onAuthStateChanged,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  where,
  serverTimestamp,
};
export type { FirebaseUser };
