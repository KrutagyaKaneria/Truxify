import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { MongoClient } from 'mongodb';
import Redis from 'ioredis';
import admin from 'firebase-admin';
import path from 'path';

// Load environment variables from root directory .env
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

// ============================================================================
// 1. SUPABASE CLIENT
// ============================================================================
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

export let supabase = null;

if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    });
    console.log('✅ Supabase client initialized successfully.');
  } catch (error) {
    console.error('❌ Failed to initialize Supabase client:', error.message);
  }
} else {
  console.warn('⚠️ SUPABASE_URL or keys not found in .env. Supabase integration disabled.');
}

// ============================================================================
// 2. MONGODB ATLAS CLIENT (Telemetry & Activity Pings)
// ============================================================================
const mongoUri = process.env.MONGODB_URI;
const mongoDbName = process.env.MONGODB_DB_NAME || 'truxify_telemetry';

export let mongoDb = null;
let mongoClient = null;

if (mongoUri) {
  try {
    mongoClient = new MongoClient(mongoUri);
    // Connect to cluster asynchronously; we resolve it, but won't block the file load
    mongoClient.connect()
      .then(() => {
        mongoDb = mongoClient.db(mongoDbName);
        console.log(`✅ Connected to MongoDB Database: "${mongoDbName}"`);
      })
      .catch(err => {
        console.error('❌ Failed to connect to MongoDB server:', err.message);
      });
  } catch (error) {
    console.error('❌ MongoDB client initialization error:', error.message);
  }
} else {
  console.warn('⚠️ MONGODB_URI not found in .env. MongoDB telemetry database disabled.');
}

// ============================================================================
// 3. UPSTASH REDIS CLIENT (Sessions, cache, rate limits)
// ============================================================================
const redisUrl = process.env.REDIS_URL;
export let redisClient = null;

if (redisUrl) {
  try {
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 100, 3000);
        return delay;
      }
    });

    redisClient.on('connect', () => {
      console.log('✅ Connected to Upstash Redis server.');
    });

    redisClient.on('error', (err) => {
      console.error('❌ Redis connection error:', err.message);
    });
  } catch (error) {
    console.error('❌ Redis initialization error:', error.message);
  }
} else {
  console.warn('⚠️ REDIS_URL not found in .env. Redis session cache disabled.');
}

// ============================================================================
// 4. FIREBASE ADMIN SDK (Authentication validation & Push Notifications)
// ============================================================================
const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
export let firebaseAdmin = null;

if (serviceAccountJson) {
  try {
    let credentialData;
    // Handle both absolute file paths and raw stringified JSON payloads
    if (serviceAccountJson.trim().startsWith('{')) {
      credentialData = JSON.parse(serviceAccountJson);
    } else {
      credentialData = admin.credential.cert(serviceAccountJson);
    }

    firebaseAdmin = admin.initializeApp({
      credential: admin.credential.cert(credentialData)
    });
    console.log('✅ Firebase Admin SDK initialized successfully.');
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin:', error.message);
  }
} else {
  console.warn('⚠️ FIREBASE_SERVICE_ACCOUNT_JSON not found in .env. Firebase Auth verification disabled.');
}

export async function closeDbConnections() {
  if (mongoClient) {
    try {
      await mongoClient.close();
      mongoClient = null;
      mongoDb = null;
      console.log('[shutdown] MongoDB connection closed.');
    } catch (err) {
      console.error('[shutdown] MongoDB close error:', err.message);
    }
  }

  if (redisClient) {
    try {
      if (redisClient.status !== 'end') {
        await redisClient.quit();
      }
      console.log('[shutdown] Redis connection closed.');
    } catch (err) {
      console.error('[shutdown] Redis quit error:', err.message);
      try {
        redisClient.disconnect();
      } catch (disconnectErr) {
        console.error('[shutdown] Redis disconnect error:', disconnectErr.message);
      }
    } finally {
      redisClient = null;
    }
  }
}
