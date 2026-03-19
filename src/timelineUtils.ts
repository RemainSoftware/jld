/*
 * Job Log Detective
 * Copyright (c) 2026 Remain BV
 *
 * This software is dual-licensed:
 * - MIT License for open source use
 * - Commercial License for proprietary embedding
 *
 * See LICENSE file for full terms.
 */

// Shared timeline utilities for Job Log Detective

import { JobLogMessage } from './types';

/**
 * Bucket size configuration
 */
export interface BucketSizeConfig {
    bucketSizeMs: number;
    bucketLabel: string;
}

/**
 * A time bucket containing grouped messages
 */
export interface TimeBucket {
    bucketTime: number;
    messages: JobLogMessage[];
}

/**
 * Get flame decoration string based on percentage of high severity messages
 * 1-20% = 🔥, 21-40% = 🔥🔥, 41-60% = 🔥🔥🔥, 61-80% = 🔥🔥🔥🔥, 81-100% = 🔥🔥🔥🔥🔥
 */
export function getFlameDecoration(highSeverityCount: number, totalCount: number): string {
    if (highSeverityCount <= 0 || totalCount <= 0) {
        return '';
    }
    const percentage = (highSeverityCount / totalCount) * 100;
    const flameCount = Math.ceil(percentage / 20); // 1-20%=1, 21-40%=2, etc.
    return '🔥'.repeat(Math.min(flameCount, 5));
}

/**
 * Target maximum messages per bucket for good usability
 * Set aggressively low to handle message clustering in real-world job logs
 * Messages often burst in short periods (compile errors, batch processing)
 */
const TARGET_MESSAGES_PER_BUCKET = 50;

/**
 * Force small buckets for very high message counts
 * This handles extreme clustering where messages are in a small time window
 */
const HIGH_MESSAGE_COUNT_THRESHOLD = 1000;
const VERY_HIGH_MESSAGE_COUNT_THRESHOLD = 3000;

/**
 * Available bucket sizes in ascending order
 */
const BUCKET_SIZES: BucketSizeConfig[] = [
    { bucketSizeMs: 1000, bucketLabel: 'second' },
    { bucketSizeMs: 5000, bucketLabel: '5sec' },
    { bucketSizeMs: 10000, bucketLabel: '10sec' },
    { bucketSizeMs: 30000, bucketLabel: '30sec' },
    { bucketSizeMs: 60000, bucketLabel: 'minute' }
];

/**
 * Determine bucket size based on job duration and message count
 * Uses aggressive bucket sizing for high message counts to handle clustering
 * @param durationMs Total duration in milliseconds
 * @param messageCount Optional total message count to optimize bucket size
 * @returns Configuration with bucket size and label
 */
export function determineBucketSize(durationMs: number, messageCount?: number): BucketSizeConfig {
    // If no message count or small count, use duration-based sizing
    if (!messageCount || messageCount <= TARGET_MESSAGES_PER_BUCKET) {
        return getDurationBasedBucketSize(durationMs);
    }
    
    // For very high message counts, force small buckets regardless of duration
    // This handles extreme clustering (e.g., 4000 messages in 1 minute of a 30-minute job)
    if (messageCount >= VERY_HIGH_MESSAGE_COUNT_THRESHOLD) {
        // Use 1-second buckets for extreme cases
        return BUCKET_SIZES[0]; // 1 second
    }
    
    if (messageCount >= HIGH_MESSAGE_COUNT_THRESHOLD) {
        // Use 5-second buckets for high message counts
        return BUCKET_SIZES[1]; // 5 seconds
    }
    
    // For moderate message counts, find the largest bucket size that still provides
    // enough buckets to achieve target messages per bucket
    const targetBucketCount = Math.ceil(messageCount / TARGET_MESSAGES_PER_BUCKET);
    
    // Iterate largest to smallest, find first that provides enough buckets
    for (let i = BUCKET_SIZES.length - 1; i >= 0; i--) {
        const config = BUCKET_SIZES[i];
        const possibleBuckets = Math.max(1, Math.floor(durationMs / config.bucketSizeMs) + 1);
        if (possibleBuckets >= targetBucketCount) {
            return config;
        }
    }
    
    // Fallback to smallest bucket size for very high density
    return BUCKET_SIZES[0];
}

/**
 * Get bucket size based purely on duration (legacy behavior)
 */
function getDurationBasedBucketSize(durationMs: number): BucketSizeConfig {
    const durationMinutes = durationMs / 60000;
    
    if (durationMinutes < 1) {
        return { bucketSizeMs: 1000, bucketLabel: 'second' };
    } else if (durationMinutes < 10) {
        return { bucketSizeMs: 10000, bucketLabel: '10sec' };
    } else if (durationMinutes < 60) {
        return { bucketSizeMs: 30000, bucketLabel: '30sec' };
    } else {
        return { bucketSizeMs: 60000, bucketLabel: 'minute' };
    }
}

/**
 * Group messages into time buckets
 * @param messages Messages to group (will be sorted internally unless preSorted is true)
 * @param bucketSizeMs Size of each bucket in milliseconds
 * @param preSorted If true, assumes messages are already sorted by timestamp (skips O(n log n) sort)
 * @returns Array of time buckets sorted by time
 */
export function groupMessagesByTimeBucket(
    messages: JobLogMessage[],
    bucketSizeMs: number,
    preSorted: boolean = false
): TimeBucket[] {
    if (messages.length === 0) {
        return [];
    }
    
    // Sort by timestamp (skip if pre-sorted)
    const sortedMessages = preSorted 
        ? messages 
        : [...messages].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    // Group messages into buckets
    const buckets = new Map<number, JobLogMessage[]>();
    
    for (const msg of sortedMessages) {
        const bucketStart = Math.floor(msg.timestamp.getTime() / bucketSizeMs) * bucketSizeMs;
        if (!buckets.has(bucketStart)) {
            buckets.set(bucketStart, []);
        }
        buckets.get(bucketStart)!.push(msg);
    }
    
    // Convert to array and sort
    return Array.from(buckets.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([bucketTime, msgs]) => ({ bucketTime, messages: msgs }));
}

/**
 * Format bucket time as HH:MM:SS
 */
export function formatBucketTime(bucketTime: number): string {
    const date = new Date(bucketTime);
    return date.toTimeString().split(' ')[0]; // HH:MM:SS
}

/**
 * Calculate bucket statistics
 */
export interface BucketStats {
    count: number;
    highSeverityCount: number;
    maxSeverity: number;
}

/**
 * Get statistics for a bucket of messages
 */
export function getBucketStats(messages: JobLogMessage[], highSeverityThreshold: number): BucketStats {
    const count = messages.length;
    let highSeverityCount = 0;
    let maxSeverity = 0;

    for (const m of messages) {
        if (m.severity >= highSeverityThreshold) {
            highSeverityCount++;
        }
        if (m.severity > maxSeverity) {
            maxSeverity = m.severity;
        }
    }
    
    return { count, highSeverityCount, maxSeverity };
}
