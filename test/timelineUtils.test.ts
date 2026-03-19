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

import { describe, it, expect } from 'vitest';
import {
    getFlameDecoration,
    determineBucketSize,
    groupMessagesByTimeBucket,
    formatBucketTime,
    getBucketStats
} from '../src/timelineUtils';
import { JobLogMessage } from '../src/types';

/**
 * Helper to create a minimal JobLogMessage for testing
 */
function createMessage(timestamp: Date, severity: number = 0): JobLogMessage {
    return {
        lineNumber: 1,
        endLineNumber: 1,
        messageId: 'TEST001',
        type: 'Information',
        severity,
        // Use dummy strings that match the JobLogMessage date/time format
        date: '28-02-26',
        time: '13:10:12.467899',
        timestamp,
        from: { program: 'TEST', library: 'TESTLIB', instruction: '0000' },
        to: { program: 'TEST', library: 'TESTLIB', instruction: '0000' },
        rawLines: []
    };
}

describe('determineBucketSize', () => {
    describe('boundary conditions', () => {
        it('should use 1-second buckets at exactly 0ms duration', () => {
            const result = determineBucketSize(0);
            expect(result.bucketSizeMs).toBe(1000);
            expect(result.bucketLabel).toBe('second');
        });

        it('should use 1-second buckets at 59 seconds (just under 1 minute)', () => {
            const result = determineBucketSize(59 * 1000);
            expect(result.bucketSizeMs).toBe(1000);
            expect(result.bucketLabel).toBe('second');
        });

        it('should use 10-second buckets at exactly 60 seconds (1 minute boundary)', () => {
            const result = determineBucketSize(60 * 1000);
            expect(result.bucketSizeMs).toBe(10000);
            expect(result.bucketLabel).toBe('10sec');
        });

        it('should use 10-second buckets at 9 minutes 59 seconds', () => {
            const result = determineBucketSize((9 * 60 + 59) * 1000);
            expect(result.bucketSizeMs).toBe(10000);
            expect(result.bucketLabel).toBe('10sec');
        });

        it('should use 30-second buckets at exactly 10 minutes', () => {
            const result = determineBucketSize(10 * 60 * 1000);
            expect(result.bucketSizeMs).toBe(30000);
            expect(result.bucketLabel).toBe('30sec');
        });

        it('should use 30-second buckets at 59 minutes 59 seconds', () => {
            const result = determineBucketSize((59 * 60 + 59) * 1000);
            expect(result.bucketSizeMs).toBe(30000);
            expect(result.bucketLabel).toBe('30sec');
        });

        it('should use 1-minute buckets at exactly 60 minutes', () => {
            const result = determineBucketSize(60 * 60 * 1000);
            expect(result.bucketSizeMs).toBe(60000);
            expect(result.bucketLabel).toBe('minute');
        });

        it('should use 1-minute buckets for very long durations (24 hours)', () => {
            const result = determineBucketSize(24 * 60 * 60 * 1000);
            expect(result.bucketSizeMs).toBe(60000);
            expect(result.bucketLabel).toBe('minute');
        });
    });

    describe('typical durations', () => {
        it('should handle 30 seconds job', () => {
            const result = determineBucketSize(30 * 1000);
            expect(result.bucketSizeMs).toBe(1000);
        });

        it('should handle 5 minute job', () => {
            const result = determineBucketSize(5 * 60 * 1000);
            expect(result.bucketSizeMs).toBe(10000);
        });

        it('should handle 30 minute job', () => {
            const result = determineBucketSize(30 * 60 * 1000);
            expect(result.bucketSizeMs).toBe(30000);
        });

        it('should handle 2 hour job', () => {
            const result = determineBucketSize(2 * 60 * 60 * 1000);
            expect(result.bucketSizeMs).toBe(60000);
        });
    });

    describe('density-based sizing with messageCount', () => {
        it('should use duration-based when messageCount is not provided', () => {
            const result = determineBucketSize(30 * 60 * 1000); // 30 min
            expect(result.bucketSizeMs).toBe(30000); // 30 sec buckets
        });

        it('should use duration-based when messageCount is small (<=50)', () => {
            const result = determineBucketSize(30 * 60 * 1000, 50); // 30 min, 50 msgs
            expect(result.bucketSizeMs).toBe(30000); // Still 30 sec buckets
        });

        it('should force 1-second buckets for very high message count (>=3000)', () => {
            // 38 minutes with 4210 messages - forces 1-second buckets
            const durationMs = 38 * 60 * 1000;
            const result = determineBucketSize(durationMs, 4210);
            expect(result.bucketSizeMs).toBe(1000);
            expect(result.bucketLabel).toBe('second');
        });

        it('should force 5-second buckets for high message count (>=1000)', () => {
            // 30 minutes with 1500 messages - forces 5-second buckets
            const durationMs = 30 * 60 * 1000;
            const result = determineBucketSize(durationMs, 1500);
            expect(result.bucketSizeMs).toBe(5000);
            expect(result.bucketLabel).toBe('5sec');
        });

        it('should use target-based calculation for moderate message counts', () => {
            // 5 minutes with 500 messages = need 10 buckets (500/50)
            // 5 min = 300 sec, 300/10 = 30 sec per bucket
            const durationMs = 5 * 60 * 1000;
            const result = determineBucketSize(durationMs, 500);
            expect(result.bucketSizeMs).toBe(30000); // 30-second buckets
        });

        it('should use smaller buckets when target calculation requires it', () => {
            // 2 minutes with 800 messages = need 16 buckets (800/50)
            // 2 min = 120 sec, 120/16 = 7.5 sec per bucket
            // Algorithm iterates largest to smallest, 10 sec gives 12 buckets < 16
            // 5 sec gives 24 buckets >= 16 ✓
            const durationMs = 2 * 60 * 1000;
            const result = determineBucketSize(durationMs, 800);
            expect(result.bucketSizeMs).toBe(5000);
        });

        it('should not go smaller than 1-second buckets', () => {
            // 10 seconds with 10000 messages = extreme density
            const durationMs = 10 * 1000;
            const result = determineBucketSize(durationMs, 10000);
            expect(result.bucketSizeMs).toBe(1000); // Can't go smaller
        });

        it('should handle edge case at 1000 message threshold', () => {
            const result = determineBucketSize(10 * 60 * 1000, 1000); // exactly 1000
            expect(result.bucketSizeMs).toBe(5000); // 5-second buckets
        });

        it('should handle edge case at 3000 message threshold', () => {
            const result = determineBucketSize(10 * 60 * 1000, 3000); // exactly 3000
            expect(result.bucketSizeMs).toBe(1000); // 1-second buckets
        });
    });
});

describe('getFlameDecoration', () => {
    describe('edge cases', () => {
        it('should return empty string when highSeverityCount is 0', () => {
            expect(getFlameDecoration(0, 100)).toBe('');
        });

        it('should return empty string when totalCount is 0', () => {
            expect(getFlameDecoration(5, 0)).toBe('');
        });

        it('should return empty string when both are 0', () => {
            expect(getFlameDecoration(0, 0)).toBe('');
        });

        it('should return empty string when highSeverityCount is negative', () => {
            expect(getFlameDecoration(-1, 10)).toBe('');
        });

        it('should return empty string when totalCount is negative', () => {
            expect(getFlameDecoration(5, -10)).toBe('');
        });
    });

    describe('percentage thresholds', () => {
        it('should return 1 flame for 1% (1/100)', () => {
            expect(getFlameDecoration(1, 100)).toBe('🔥');
        });

        it('should return 1 flame for exactly 20%', () => {
            expect(getFlameDecoration(20, 100)).toBe('🔥');
        });

        it('should return 2 flames for 21%', () => {
            expect(getFlameDecoration(21, 100)).toBe('🔥🔥');
        });

        it('should return 2 flames for exactly 40%', () => {
            expect(getFlameDecoration(40, 100)).toBe('🔥🔥');
        });

        it('should return 3 flames for 41%', () => {
            expect(getFlameDecoration(41, 100)).toBe('🔥🔥🔥');
        });

        it('should return 3 flames for exactly 60%', () => {
            expect(getFlameDecoration(60, 100)).toBe('🔥🔥🔥');
        });

        it('should return 4 flames for 61%', () => {
            expect(getFlameDecoration(61, 100)).toBe('🔥🔥🔥🔥');
        });

        it('should return 4 flames for exactly 80%', () => {
            expect(getFlameDecoration(80, 100)).toBe('🔥🔥🔥🔥');
        });

        it('should return 5 flames for 81%', () => {
            expect(getFlameDecoration(81, 100)).toBe('🔥🔥🔥🔥🔥');
        });

        it('should return 5 flames for 100%', () => {
            expect(getFlameDecoration(100, 100)).toBe('🔥🔥🔥🔥🔥');
        });

        it('should cap at 5 flames even if count exceeds total (edge case)', () => {
            // This shouldn't happen in practice, but test the cap
            expect(getFlameDecoration(150, 100)).toBe('🔥🔥🔥🔥🔥');
        });
    });

    describe('real-world scenarios', () => {
        it('should handle small bucket with 1 high severity out of 3', () => {
            // 33.3% = 2 flames
            expect(getFlameDecoration(1, 3)).toBe('🔥🔥');
        });

        it('should handle bucket with 2 high severity out of 5', () => {
            // 40% = 2 flames
            expect(getFlameDecoration(2, 5)).toBe('🔥🔥');
        });

        it('should handle all messages being high severity', () => {
            expect(getFlameDecoration(10, 10)).toBe('🔥🔥🔥🔥🔥');
        });
    });
});

describe('groupMessagesByTimeBucket', () => {
    describe('empty input', () => {
        it('should return empty array for empty messages', () => {
            expect(groupMessagesByTimeBucket([], 1000)).toEqual([]);
        });
    });

    describe('single message', () => {
        it('should create single bucket for single message', () => {
            const timestamp = new Date('2026-01-01T10:00:00.500Z');
            const messages = [createMessage(timestamp)];
            
            const buckets = groupMessagesByTimeBucket(messages, 1000);
            
            expect(buckets).toHaveLength(1);
            expect(buckets[0].messages).toHaveLength(1);
            // Bucket time should be floored to the second
            expect(buckets[0].bucketTime).toBe(new Date('2026-01-01T10:00:00.000Z').getTime());
        });
    });

    describe('bucketing correctness', () => {
        it('should group messages in same second into same bucket', () => {
            const base = new Date('2026-01-01T10:00:00.000Z');
            const messages = [
                createMessage(new Date(base.getTime() + 100)),  // 10:00:00.100
                createMessage(new Date(base.getTime() + 500)),  // 10:00:00.500
                createMessage(new Date(base.getTime() + 999))   // 10:00:00.999
            ];
            
            const buckets = groupMessagesByTimeBucket(messages, 1000);
            
            expect(buckets).toHaveLength(1);
            expect(buckets[0].messages).toHaveLength(3);
        });

        it('should separate messages into different 1-second buckets', () => {
            const base = new Date('2026-01-01T10:00:00.000Z');
            const messages = [
                createMessage(new Date(base.getTime())),         // 10:00:00
                createMessage(new Date(base.getTime() + 1000)),  // 10:00:01
                createMessage(new Date(base.getTime() + 2000))   // 10:00:02
            ];
            
            const buckets = groupMessagesByTimeBucket(messages, 1000);
            
            expect(buckets).toHaveLength(3);
            expect(buckets[0].messages).toHaveLength(1);
            expect(buckets[1].messages).toHaveLength(1);
            expect(buckets[2].messages).toHaveLength(1);
        });

        it('should group messages into 10-second buckets', () => {
            const base = new Date('2026-01-01T10:00:00.000Z');
            const messages = [
                createMessage(new Date(base.getTime())),         // 10:00:00 -> bucket 0
                createMessage(new Date(base.getTime() + 5000)),  // 10:00:05 -> bucket 0
                createMessage(new Date(base.getTime() + 10000)), // 10:00:10 -> bucket 1
                createMessage(new Date(base.getTime() + 15000))  // 10:00:15 -> bucket 1
            ];
            
            const buckets = groupMessagesByTimeBucket(messages, 10000);
            
            expect(buckets).toHaveLength(2);
            expect(buckets[0].messages).toHaveLength(2);
            expect(buckets[1].messages).toHaveLength(2);
        });

        it('should group messages into 30-second buckets', () => {
            const base = new Date('2026-01-01T10:00:00.000Z');
            const messages = [
                createMessage(new Date(base.getTime())),          // 10:00:00 -> bucket 0
                createMessage(new Date(base.getTime() + 29000)),  // 10:00:29 -> bucket 0
                createMessage(new Date(base.getTime() + 30000)),  // 10:00:30 -> bucket 1
                createMessage(new Date(base.getTime() + 59000))   // 10:00:59 -> bucket 1
            ];
            
            const buckets = groupMessagesByTimeBucket(messages, 30000);
            
            expect(buckets).toHaveLength(2);
            expect(buckets[0].messages).toHaveLength(2);
            expect(buckets[1].messages).toHaveLength(2);
        });

        it('should group messages into 1-minute buckets', () => {
            const base = new Date('2026-01-01T10:00:00.000Z');
            const messages = [
                createMessage(new Date(base.getTime())),          // 10:00:00 -> bucket 0
                createMessage(new Date(base.getTime() + 59000)),  // 10:00:59 -> bucket 0
                createMessage(new Date(base.getTime() + 60000)),  // 10:01:00 -> bucket 1
                createMessage(new Date(base.getTime() + 120000))  // 10:02:00 -> bucket 2
            ];
            
            const buckets = groupMessagesByTimeBucket(messages, 60000);
            
            expect(buckets).toHaveLength(3);
            expect(buckets[0].messages).toHaveLength(2);
            expect(buckets[1].messages).toHaveLength(1);
            expect(buckets[2].messages).toHaveLength(1);
        });
    });

    describe('sorting behavior', () => {
        it('should sort unsorted messages when preSorted is false', () => {
            const base = new Date('2026-01-01T10:00:00.000Z');
            const messages = [
                createMessage(new Date(base.getTime() + 2000)),  // 10:00:02
                createMessage(new Date(base.getTime())),         // 10:00:00
                createMessage(new Date(base.getTime() + 1000))   // 10:00:01
            ];
            
            const buckets = groupMessagesByTimeBucket(messages, 1000, false);
            
            expect(buckets).toHaveLength(3);
            // Buckets should be in chronological order
            expect(buckets[0].bucketTime).toBeLessThan(buckets[1].bucketTime);
            expect(buckets[1].bucketTime).toBeLessThan(buckets[2].bucketTime);
        });

        it('should preserve order when preSorted is true', () => {
            const base = new Date('2026-01-01T10:00:00.000Z');
            const messages = [
                createMessage(new Date(base.getTime())),         // 10:00:00
                createMessage(new Date(base.getTime() + 1000)),  // 10:00:01
                createMessage(new Date(base.getTime() + 2000))   // 10:00:02
            ];
            
            const buckets = groupMessagesByTimeBucket(messages, 1000, true);
            
            expect(buckets).toHaveLength(3);
            expect(buckets[0].bucketTime).toBeLessThan(buckets[1].bucketTime);
        });

        it('should not modify original array', () => {
            const base = new Date('2026-01-01T10:00:00.000Z');
            const messages = [
                createMessage(new Date(base.getTime() + 2000)),
                createMessage(new Date(base.getTime())),
                createMessage(new Date(base.getTime() + 1000))
            ];
            const originalFirstTime = messages[0].timestamp.getTime();
            
            groupMessagesByTimeBucket(messages, 1000, false);
            
            // Original array should be unchanged
            expect(messages[0].timestamp.getTime()).toBe(originalFirstTime);
        });
    });

    describe('bucket time calculation', () => {
        it('should floor bucket time to bucket boundary', () => {
            const timestamp = new Date('2026-01-01T10:00:05.500Z'); // 5.5 seconds
            const messages = [createMessage(timestamp)];
            
            const buckets = groupMessagesByTimeBucket(messages, 10000); // 10-second buckets
            
            // Should floor to 10:00:00
            expect(buckets[0].bucketTime).toBe(new Date('2026-01-01T10:00:00.000Z').getTime());
        });
    });
});

describe('formatBucketTime', () => {
    it('should format time as HH:MM:SS', () => {
        // Use a known timestamp - note: this will use local timezone
        const timestamp = new Date('2026-01-01T10:30:45.000Z');
        const result = formatBucketTime(timestamp.getTime());
        
        // Result depends on local timezone, so just check format
        expect(result).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    });

    it('should handle midnight', () => {
        const timestamp = new Date('2026-01-01T00:00:00.000Z');
        const result = formatBucketTime(timestamp.getTime());
        
        expect(result).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    });

    it('should handle end of day', () => {
        const timestamp = new Date('2026-01-01T23:59:59.000Z');
        const result = formatBucketTime(timestamp.getTime());
        
        expect(result).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    });
});

describe('getBucketStats', () => {
    describe('empty input', () => {
        it('should return zeros for empty messages', () => {
            const stats = getBucketStats([], 30);
            
            expect(stats.count).toBe(0);
            expect(stats.highSeverityCount).toBe(0);
            expect(stats.maxSeverity).toBe(0);
        });
    });

    describe('count calculation', () => {
        it('should return correct count', () => {
            const base = new Date();
            const messages = [
                createMessage(base, 10),
                createMessage(base, 20),
                createMessage(base, 30)
            ];
            
            const stats = getBucketStats(messages, 30);
            
            expect(stats.count).toBe(3);
        });
    });

    describe('high severity counting', () => {
        it('should count messages at or above threshold', () => {
            const base = new Date();
            const messages = [
                createMessage(base, 10),  // below
                createMessage(base, 29),  // below
                createMessage(base, 30),  // at threshold
                createMessage(base, 40),  // above
                createMessage(base, 99)   // above
            ];
            
            const stats = getBucketStats(messages, 30);
            
            expect(stats.highSeverityCount).toBe(3);
        });

        it('should return 0 when no messages meet threshold', () => {
            const base = new Date();
            const messages = [
                createMessage(base, 10),
                createMessage(base, 20),
                createMessage(base, 29)
            ];
            
            const stats = getBucketStats(messages, 30);
            
            expect(stats.highSeverityCount).toBe(0);
        });

        it('should count all messages when all meet threshold', () => {
            const base = new Date();
            const messages = [
                createMessage(base, 30),
                createMessage(base, 40),
                createMessage(base, 50)
            ];
            
            const stats = getBucketStats(messages, 30);
            
            expect(stats.highSeverityCount).toBe(3);
        });

        it('should handle threshold of 0', () => {
            const base = new Date();
            const messages = [
                createMessage(base, 0),
                createMessage(base, 10)
            ];
            
            const stats = getBucketStats(messages, 0);
            
            expect(stats.highSeverityCount).toBe(2);
        });
    });

    describe('max severity calculation', () => {
        it('should return maximum severity', () => {
            const base = new Date();
            const messages = [
                createMessage(base, 10),
                createMessage(base, 50),
                createMessage(base, 30)
            ];
            
            const stats = getBucketStats(messages, 30);
            
            expect(stats.maxSeverity).toBe(50);
        });

        it('should handle single message', () => {
            const base = new Date();
            const messages = [createMessage(base, 42)];
            
            const stats = getBucketStats(messages, 30);
            
            expect(stats.maxSeverity).toBe(42);
        });

        it('should handle all same severity', () => {
            const base = new Date();
            const messages = [
                createMessage(base, 25),
                createMessage(base, 25),
                createMessage(base, 25)
            ];
            
            const stats = getBucketStats(messages, 30);
            
            expect(stats.maxSeverity).toBe(25);
        });

        it('should handle severity 0', () => {
            const base = new Date();
            const messages = [
                createMessage(base, 0),
                createMessage(base, 0)
            ];
            
            const stats = getBucketStats(messages, 30);
            
            expect(stats.maxSeverity).toBe(0);
        });
    });
});
