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
 * Determine bucket size based on job duration
 * @param durationMs Total duration in milliseconds
 * @returns Configuration with bucket size and label
 */
export function determineBucketSize(durationMs: number): BucketSizeConfig {
    const durationMinutes = durationMs / 60000;
    
    if (durationMinutes < 1) {
        // Less than 1 minute: bucket by seconds
        return { bucketSizeMs: 1000, bucketLabel: 'second' };
    } else if (durationMinutes < 10) {
        // 1-10 minutes: bucket by 10 seconds
        return { bucketSizeMs: 10000, bucketLabel: '10sec' };
    } else if (durationMinutes < 60) {
        // 10-60 minutes: bucket by 30 seconds
        return { bucketSizeMs: 30000, bucketLabel: '30sec' };
    } else {
        // Over 1 hour: bucket by minute
        return { bucketSizeMs: 60000, bucketLabel: 'minute' };
    }
}

/**
 * Group messages into time buckets
 * @param messages Messages to group (will be sorted internally)
 * @param bucketSizeMs Size of each bucket in milliseconds
 * @returns Array of time buckets sorted by time
 */
export function groupMessagesByTimeBucket(
    messages: JobLogMessage[],
    bucketSizeMs: number
): TimeBucket[] {
    if (messages.length === 0) {
        return [];
    }
    
    // Sort by timestamp
    const sortedMessages = [...messages].sort((a, b) => 
        a.timestamp.getTime() - b.timestamp.getTime()
    );
    
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
    const highSeverityCount = messages.filter(m => m.severity >= highSeverityThreshold).length;
    const maxSeverity = messages.length > 0 ? Math.max(...messages.map(m => m.severity)) : 0;
    
    return { count, highSeverityCount, maxSeverity };
}
