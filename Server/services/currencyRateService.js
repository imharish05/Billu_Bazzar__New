'use strict';

const axios = require('axios');

// ── In-memory cache ────────────────────────────────────────────────────────────
// One cached value for the AED→INR rate. Refreshed every 6 hours.
// This means at most 4 outbound API calls per day — zero DB overhead.
const CACHE_TTL_MS   = 6 * 60 * 60 * 1000; // 6 hours
const FALLBACK_RATE  = 26.06;               // 1 AED = 26.06 INR (Jul 2026 baseline)

let cachedRate       = FALLBACK_RATE;
let lastFetchedAt    = null;  // null = never fetched
let isFetching       = false; // prevent concurrent fetches

/**
 * Fetch AED→INR exchange rate from open.er-api.com (free, no key required).
 * Falls back to the last known good rate on any network / parse error.
 * @returns {Promise<number>} Rate: 1 AED = X INR
 */
const fetchLiveRate = async () => {
  if (isFetching) return cachedRate; // already in-flight
  isFetching = true;
  try {
    // Free endpoint — no API key needed, 1500 req/month limit on free plan
    const res = await axios.get('https://open.er-api.com/v6/latest/AED', {
      timeout: 8000, // 8 s timeout — if slow, we use cache
    });

    const inrRate = res.data?.rates?.INR;
    if (!inrRate || isNaN(inrRate) || Number(inrRate) <= 0) {
      throw new Error('Invalid rate payload');
    }

    cachedRate    = Math.round(Number(inrRate) * 100) / 100; // 2 dp
    lastFetchedAt = Date.now();
    console.log(`[CurrencyRate] Live rate fetched: 1 AED = ${cachedRate} INR`);
  } catch (err) {
    // Network error, API down, or bad payload — keep using last good rate
    console.warn(`[CurrencyRate] Fetch failed (${err.message}). Using cached rate: ${cachedRate} INR/AED`);
  } finally {
    isFetching = false;
  }
  return cachedRate;
};

/**
 * Get the current AED→INR rate.
 * Serves from cache if fresh; triggers a background refresh when stale.
 * @returns {number} Rate: 1 AED = X INR
 */
const getRate = () => {
  const isStale = !lastFetchedAt || (Date.now() - lastFetchedAt) > CACHE_TTL_MS;
  if (isStale) {
    // Fire-and-forget refresh — caller gets the current cached value immediately.
    // Next caller after refresh completes will get the new rate.
    fetchLiveRate().catch(() => {});
  }
  return cachedRate;
};

/**
 * Warm up the cache on server start.
 * Called once from app.js — ensures the first user request never hits a cold fallback.
 */
const warmUp = async () => {
  console.log('[CurrencyRate] Warming up exchange rate cache...');
  await fetchLiveRate();
};

module.exports = { getRate, warmUp, FALLBACK_RATE };
