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

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { detectJobLog, parseJobLog, filterMessages, getHighPriorityMessages } from '../src/joblogParser';

// Load fixture files
const fixturesDir = join(__dirname, 'fixtures');

const loadFixture = (filename: string): string => {
    return readFileSync(join(fixturesDir, filename), 'utf-8');
};

// Job log fixtures loaded from files
let ENGLISH_JOBLOG: string;
let ENGLISH_JOBLOG_SMALL: string;
let GERMAN_JOBLOG: string;
let DUTCH_JOBLOG: string;
let SPANISH_JOBLOG: string;
let FRENCH_JOBLOG: string;
let ITALIAN_JOBLOG: string;
let FAILED_JOBLOG: string;
let PAGE_SPLIT_JOBLOG: string;

const NON_JOBLOG_CONTENT = `
This is just a regular text file.
It doesn't contain any IBM i job log patterns.
Just some random content here.
`;

beforeAll(() => {
    ENGLISH_JOBLOG = loadFixture('joblog_medium.txt');
    ENGLISH_JOBLOG_SMALL = loadFixture('joblog_small.txt');
    GERMAN_JOBLOG = loadFixture('joblog_german.txt');
    DUTCH_JOBLOG = loadFixture('joblog_dutch.txt');
    SPANISH_JOBLOG = loadFixture('joblog_spanish.txt');
    FRENCH_JOBLOG = loadFixture('joblog_french.txt');
    ITALIAN_JOBLOG = loadFixture('joblog_italian.txt');
    FAILED_JOBLOG = loadFixture('joblog_failed.txt');
    PAGE_SPLIT_JOBLOG = loadFixture('joblog_page_split.txt');
});

describe('detectJobLog', () => {
    it('should detect English job log with high confidence', () => {
        const result = detectJobLog(ENGLISH_JOBLOG);
        expect(result.isJobLog).toBe(true);
        expect(result.confidence).toBe('high');
    });

    it('should detect German job log with high confidence', () => {
        const result = detectJobLog(GERMAN_JOBLOG);
        expect(result.isJobLog).toBe(true);
        expect(result.confidence).toBe('high');
    });

    it('should detect Dutch job log with high confidence', () => {
        const result = detectJobLog(DUTCH_JOBLOG);
        expect(result.isJobLog).toBe(true);
        expect(result.confidence).toBe('high');
    });

    it('should detect Spanish job log with high confidence', () => {
        const result = detectJobLog(SPANISH_JOBLOG);
        expect(result.isJobLog).toBe(true);
        expect(result.confidence).toBe('high');
    });

    it('should detect French job log with high confidence', () => {
        const result = detectJobLog(FRENCH_JOBLOG);
        expect(result.isJobLog).toBe(true);
        expect(result.confidence).toBe('high');
    });

    it('should detect Italian job log with high confidence', () => {
        const result = detectJobLog(ITALIAN_JOBLOG);
        expect(result.isJobLog).toBe(true);
        expect(result.confidence).toBe('high');
    });

    it('should not detect non-job log content', () => {
        const result = detectJobLog(NON_JOBLOG_CONTENT);
        expect(result.isJobLog).toBe(false);
    });

    it('should handle empty content', () => {
        const result = detectJobLog('');
        expect(result.isJobLog).toBe(false);
    });
});

describe('parseJobLog', () => {
    describe('English job log (medium - full file)', () => {
        it('should parse header correctly', () => {
            const result = parseJobLog(ENGLISH_JOBLOG);
            expect(result.isValid).toBe(true);
            expect(result.header).toBeDefined();
            expect(result.header?.productId).toBe('5770SS1');
            expect(result.header?.version).toBe('V7R6M0');
            expect(result.header?.jobName).toBe('QPADEV0003');
            expect(result.header?.user).toBe('REMAIN');
            expect(result.header?.jobNumber).toBe('727905');
            expect(result.header?.systemName).toBe('PLATO');
        });

        it('should parse large number of messages', () => {
            const result = parseJobLog(ENGLISH_JOBLOG);
            expect(result.messages.length).toBeGreaterThan(100);
        });

        it('should calculate stats for large file', () => {
            const result = parseJobLog(ENGLISH_JOBLOG);
            expect(result.stats).toBeDefined();
            expect(result.stats.totalMessages).toBeGreaterThan(100);
            expect(result.stats.byType).toBeDefined();
            // Note: byType is initialized as empty and filled during parsing
            // Check that we have message counts
            expect(result.stats.totalMessages).toBe(result.messages.length);
        });

        it('should parse in reasonable time', () => {
            const result = parseJobLog(ENGLISH_JOBLOG);
            expect(result.parseTime).toBeDefined();
            expect(result.parseTime).toBeLessThan(5000); // Should parse in under 5 seconds
        });
    });

    describe('English job log (small - full file)', () => {
        it('should parse header correctly', () => {
            const result = parseJobLog(ENGLISH_JOBLOG_SMALL);
            expect(result.isValid).toBe(true);
            expect(result.header).toBeDefined();
            expect(result.header?.jobName).toBe('OM066484');
            expect(result.header?.user).toBe('REMAIN');
            expect(result.header?.jobNumber).toBe('731446');
        });

        it('should parse messages correctly', () => {
            const result = parseJobLog(ENGLISH_JOBLOG_SMALL);
            expect(result.messages.length).toBeGreaterThan(0);
            
            const completionMsg = result.messages.find(m => m.messageId === 'CPC1129');
            expect(completionMsg).toBeDefined();
            expect(completionMsg?.type).toBe('Completion');
            expect(completionMsg?.severity).toBe(0);
        });

        it('should find escape messages with severity', () => {
            const result = parseJobLog(ENGLISH_JOBLOG_SMALL);
            const escapeMessages = result.messages.filter(m => m.type === 'Escape');
            expect(escapeMessages.length).toBeGreaterThan(0);
            
            const highSeverityEscape = escapeMessages.find(m => m.severity >= 40);
            expect(highSeverityEscape).toBeDefined();
        });
    });

    describe('German job log (full file)', () => {
        it('should parse header correctly', () => {
            const result = parseJobLog(GERMAN_JOBLOG);
            expect(result.isValid).toBe(true);
            expect(result.header).toBeDefined();
            expect(result.header?.productId).toBe('5770SS1');
            expect(result.header?.version).toBe('V7R5M0');
            expect(result.header?.jobName).toBe('AKT_TDOMS');
            expect(result.header?.user).toBe('REMAIN');
            expect(result.header?.jobNumber).toBe('936173');
        });

        it('should parse large German file', () => {
            const result = parseJobLog(GERMAN_JOBLOG);
            expect(result.messages.length).toBeGreaterThan(100);
        });

        it('should normalize German message types to English', () => {
            const result = parseJobLog(GERMAN_JOBLOG);
            expect(result.messages.length).toBeGreaterThan(0);
            
            // German "Information" should be normalized to "Information"
            const infoMsg = result.messages.find(m => m.messageId === 'CPF1124');
            expect(infoMsg).toBeDefined();
            expect(infoMsg?.type).toBe('Information');
            
            // German "Beendigung" should be normalized to "Completion"
            const completionMsg = result.messages.find(m => m.type === 'Completion');
            expect(completionMsg).toBeDefined();
        });

        it('should parse German date format (DD.MM.YY)', () => {
            const result = parseJobLog(GERMAN_JOBLOG);
            const msg = result.messages[0];
            expect(msg?.date).toMatch(/\d{2}\.\d{2}\.\d{2}/);
        });
    });

    describe('Dutch job log (full file)', () => {
        it('should parse header correctly', () => {
            const result = parseJobLog(DUTCH_JOBLOG);
            expect(result.isValid).toBe(true);
            expect(result.header).toBeDefined();
            expect(result.header?.jobName).toBe('DECF17580');
            expect(result.header?.user).toBe('REMAIN');
            expect(result.header?.jobNumber).toBe('650254');
        });

        it('should parse large Dutch file', () => {
            const result = parseJobLog(DUTCH_JOBLOG);
            expect(result.messages.length).toBeGreaterThan(100);
        });

        it('should normalize Dutch message types to English', () => {
            const result = parseJobLog(DUTCH_JOBLOG);
            expect(result.messages.length).toBeGreaterThan(0);
            
            // Dutch "Informatie" should be normalized to "Information"
            const infoMsg = result.messages.find(m => m.type === 'Information');
            expect(infoMsg).toBeDefined();
        });
    });

    describe('Spanish job log (full file)', () => {
        it('should parse header correctly', () => {
            const result = parseJobLog(SPANISH_JOBLOG);
            expect(result.isValid).toBe(true);
            expect(result.header).toBeDefined();
            expect(result.header?.jobName).toBe('QZRCSRVS');
            expect(result.header?.user).toBe('REMAIN');
            expect(result.header?.jobNumber).toBe('371678');
        });

        it('should parse Spanish date format (DD/MM/YY)', () => {
            const result = parseJobLog(SPANISH_JOBLOG);
            const msg = result.messages[0];
            expect(msg?.date).toMatch(/\d{2}\/\d{2}\/\d{2}/);
        });

        it('should normalize Spanish message types to English', () => {
            const result = parseJobLog(SPANISH_JOBLOG);
            expect(result.messages.length).toBeGreaterThan(0);
            
            // Spanish "Informativo" should be normalized to "Information"
            const infoMsg = result.messages.find(m => m.type === 'Information');
            expect(infoMsg).toBeDefined();
        });
    });

    describe('French job log (full file)', () => {
        it('should parse header correctly', () => {
            const result = parseJobLog(FRENCH_JOBLOG);
            expect(result.isValid).toBe(true);
            expect(result.header).toBeDefined();
            expect(result.header?.productId).toBe('5770SS1');
            expect(result.header?.version).toBe('V7R5M0');
            expect(result.header?.jobName).toBe('FRAA0');
            expect(result.header?.user).toBe('DEV1FRA');
            expect(result.header?.jobNumber).toBe('430797');
        });

        it('should parse French messages', () => {
            const result = parseJobLog(FRENCH_JOBLOG);
            expect(result.messages.length).toBeGreaterThan(0);
        });

        it('should normalize French message types to English', () => {
            const result = parseJobLog(FRENCH_JOBLOG);
            expect(result.messages.length).toBeGreaterThan(0);
            
            // French "Information" should be normalized to "Information"
            const infoMsg = result.messages.find(m => m.type === 'Information');
            expect(infoMsg).toBeDefined();
            
            // French "Echappement" should be normalized to "Escape"
            const escapeMsg = result.messages.find(m => m.type === 'Escape');
            expect(escapeMsg).toBeDefined();
        });

        it('should parse French date format (DD/MM/YY)', () => {
            const result = parseJobLog(FRENCH_JOBLOG);
            const msg = result.messages[0];
            expect(msg?.date).toMatch(/\d{2}\/\d{2}\/\d{2}/);
        });

        it('should parse French detail fields', () => {
            const result = parseJobLog(FRENCH_JOBLOG);
            
            // Find a message with "Module de destination" parsed
            const msgWithModule = result.messages.find(m => m.to.module);
            expect(msgWithModule).toBeDefined();
            
            // Find a message with "Instruction" parsed (can be in from or to)
            const msgWithStatement = result.messages.find(m => m.from.statement || m.to.statement);
            expect(msgWithStatement).toBeDefined();
        });
    });

    describe('Italian job log (full file)', () => {
        it('should parse header correctly', () => {
            const result = parseJobLog(ITALIAN_JOBLOG);
            expect(result.isValid).toBe(true);
            expect(result.header).toBeDefined();
            expect(result.header?.productId).toBe('5770SS1');
            expect(result.header?.version).toBe('V7R5M0');
            expect(result.header?.jobName).toBe('ITAB0');
            expect(result.header?.user).toBe('DEV1ITA');
            expect(result.header?.jobNumber).toBe('430806');
        });

        it('should parse Italian messages', () => {
            const result = parseJobLog(ITALIAN_JOBLOG);
            expect(result.messages.length).toBeGreaterThan(0);
        });

        it('should normalize Italian message types to English', () => {
            const result = parseJobLog(ITALIAN_JOBLOG);
            expect(result.messages.length).toBeGreaterThan(0);
            
            // Italian "Informazioni" should be normalized to "Information"
            const infoMsg = result.messages.find(m => m.type === 'Information');
            expect(infoMsg).toBeDefined();
            
            // Italian "Completamento" should be normalized to "Completion"
            const completionMsg = result.messages.find(m => m.type === 'Completion');
            expect(completionMsg).toBeDefined();
        });

        it('should parse Italian date format (DD/MM/YY)', () => {
            const result = parseJobLog(ITALIAN_JOBLOG);
            const msg = result.messages[0];
            expect(msg?.date).toMatch(/\d{2}\/\d{2}\/\d{2}/);
        });

        it('should parse Italian detail fields', () => {
            const result = parseJobLog(ITALIAN_JOBLOG);
            
            // Find a message with "Al modulo" parsed
            const msgWithModule = result.messages.find(m => m.to.module);
            expect(msgWithModule).toBeDefined();
            
            // Find a message with "Istruzione" parsed (can be in from or to)
            const msgWithStatement = result.messages.find(m => m.from.statement || m.to.statement);
            expect(msgWithStatement).toBeDefined();
        });
    });

    describe('Failed job log', () => {
        it('should parse failed job correctly', () => {
            const result = parseJobLog(FAILED_JOBLOG);
            expect(result.isValid).toBe(true);
            expect(result.header).toBeDefined();
        });

        it('should detect job completion status', () => {
            const result = parseJobLog(FAILED_JOBLOG);
            expect(result.completion).toBeDefined();
            // Failed jobs should have completed = true but success = false
            if (result.completion?.completed) {
                expect(result.completion.endCode).toBeGreaterThan(0);
            }
        });
    });

    describe('Invalid content', () => {
        it('should return invalid result for non-job log content', () => {
            const result = parseJobLog(NON_JOBLOG_CONTENT);
            expect(result.isValid).toBe(false);
            expect(result.messages).toHaveLength(0);
        });

        it('should return invalid result for empty content', () => {
            const result = parseJobLog('');
            expect(result.isValid).toBe(false);
        });
    });

    describe('Page-split messages', () => {
        it('should parse messages that span across page boundaries', () => {
            const result = parseJobLog(PAGE_SPLIT_JOBLOG);
            expect(result.isValid).toBe(true);
            expect(result.messages.length).toBe(4); // 4 messages in the fixture
        });

        it('should correctly parse split message details (To procedure, Statement, Message, Cause)', () => {
            const result = parseJobLog(PAGE_SPLIT_JOBLOG);
            
            // Find the CPF9801 message that spans pages
            const splitMessage = result.messages.find(m => m.messageId === 'CPF9801');
            expect(splitMessage).toBeDefined();
            
            // The "To procedure" and "To statement" are on the next page, after the page header
            expect(splitMessage?.to.procedure).toBe('CHGENV');
            expect(splitMessage?.from.statement).toBe('0256'); // from statement before page break
            expect(splitMessage?.to.statement).toBe('4200');   // to statement after page break
            expect(splitMessage?.messageText).toContain('SPLITOBJ');
            expect(splitMessage?.cause).toContain('not found');
        });

        it('should parse message text that continues after page break', () => {
            const result = parseJobLog(PAGE_SPLIT_JOBLOG);
            
            const splitMessage = result.messages.find(m => m.messageId === 'CPF9801');
            expect(splitMessage?.messageText).toBe('Object ##SPLITOBJ in library *LIBL not found.');
        });

        it('should parse cause text that continues after page break', () => {
            const result = parseJobLog(PAGE_SPLIT_JOBLOG);
            
            const splitMessage = result.messages.find(m => m.messageId === 'CPF9801');
            expect(splitMessage?.cause).toBeDefined();
            // The cause should include the continuation text about recovery
            expect(splitMessage?.cause).toContain('object name');
            expect(splitMessage?.cause).toContain('library name');
        });

        it('should correctly parse messages after the split message', () => {
            const result = parseJobLog(PAGE_SPLIT_JOBLOG);
            
            // The CPC2101 message should be parsed correctly after the split message
            const completionMessage = result.messages.find(m => m.messageId === 'CPC2101');
            expect(completionMessage).toBeDefined();
            expect(completionMessage?.type).toBe('Completion');
            expect(completionMessage?.messageText).toBe('Library list changed.');
        });
    });
});

describe('filterMessages', () => {
    it('should filter by message type', () => {
        const parsed = parseJobLog(ENGLISH_JOBLOG_SMALL);
        const filtered = filterMessages(parsed.messages, { types: new Set(['Escape']) });
        
        expect(filtered.length).toBeGreaterThan(0);
        expect(filtered.every(m => m.type === 'Escape')).toBe(true);
    });

    it('should filter by minimum severity', () => {
        const parsed = parseJobLog(ENGLISH_JOBLOG_SMALL);
        const filtered = filterMessages(parsed.messages, { minSeverity: 40 });
        
        expect(filtered.every(m => m.severity >= 40)).toBe(true);
    });

    it('should filter by message ID pattern (glob)', () => {
        const parsed = parseJobLog(ENGLISH_JOBLOG);
        const filtered = filterMessages(parsed.messages, { messageIdPattern: 'CPF*' });
        
        expect(filtered.length).toBeGreaterThan(0);
        expect(filtered.every(m => m.messageId.startsWith('CPF'))).toBe(true);
    });

    it('should filter SQL messages by pattern', () => {
        const parsed = parseJobLog(ENGLISH_JOBLOG);
        const filtered = filterMessages(parsed.messages, { messageIdPattern: 'SQL*' });
        
        // May or may not have SQL messages
        expect(filtered.every(m => m.messageId.startsWith('SQL'))).toBe(true);
    });

    it('should combine multiple filters', () => {
        const parsed = parseJobLog(ENGLISH_JOBLOG);
        const filtered = filterMessages(parsed.messages, { 
            types: new Set(['Escape', 'Information']),
            minSeverity: 0 
        });
        
        expect(filtered.every(m => 
            (m.type === 'Escape' || m.type === 'Information') && m.severity >= 0
        )).toBe(true);
    });

    it('should return empty array when no messages match', () => {
        const parsed = parseJobLog(ENGLISH_JOBLOG_SMALL);
        const filtered = filterMessages(parsed.messages, { types: new Set(['Reply']) });
        
        expect(Array.isArray(filtered)).toBe(true);
    });

    it('should hide command messages when requested', () => {
        const parsed = parseJobLog(ENGLISH_JOBLOG);
        const withCommand = parsed.messages.filter(m => m.type === 'Command');
        const filtered = filterMessages(parsed.messages, { hideCommand: true });
        
        expect(filtered.every(m => m.type !== 'Command')).toBe(true);
        if (withCommand.length > 0) {
            expect(filtered.length).toBeLessThan(parsed.messages.length);
        }
    });
});

describe('getHighPriorityMessages', () => {
    it('should return escape and diagnostic messages', () => {
        const parsed = parseJobLog(ENGLISH_JOBLOG);
        const highPriority = getHighPriorityMessages(parsed.messages);
        
        expect(highPriority.every(m => 
            m.type === 'Escape' || m.type === 'Diagnostic' || m.severity >= 30
        )).toBe(true);
    });

    it('should respect severity threshold', () => {
        const parsed = parseJobLog(ENGLISH_JOBLOG);
        const highPriority = getHighPriorityMessages(parsed.messages, { highSeverityThreshold: 50 });
        
        // The function only looks at last 20% of messages and filters to:
        // - severity >= threshold, OR
        // - Escape/Diagnostic types, OR
        // - Information messages with severity >= 30
        for (const m of highPriority) {
            const isHighPriority = 
                m.severity >= 50 ||
                m.type === 'Escape' || 
                m.type === 'Diagnostic' ||
                (m.type === 'Information' && m.severity >= 30);
            expect(isHighPriority).toBe(true);
        }
    });

    it('should find high priority messages in failed job', () => {
        const parsed = parseJobLog(FAILED_JOBLOG);
        const highPriority = getHighPriorityMessages(parsed.messages);
        
        // Failed job should have at least one high priority message
        expect(highPriority.length).toBeGreaterThan(0);
    });
});

describe('Message parsing details', () => {
    it('should parse message text', () => {
        const parsed = parseJobLog(ENGLISH_JOBLOG_SMALL);
        const msgWithText = parsed.messages.find(m => m.messageText);
        
        expect(msgWithText).toBeDefined();
        expect(msgWithText?.messageText).toBeTruthy();
    });

    it('should parse from program info', () => {
        const parsed = parseJobLog(ENGLISH_JOBLOG_SMALL);
        const msg = parsed.messages[0];
        
        expect(msg?.from).toBeDefined();
        expect(msg?.from.program).toBeTruthy();
    });

    it('should parse to program info', () => {
        const parsed = parseJobLog(ENGLISH_JOBLOG_SMALL);
        const msg = parsed.messages[0];
        
        expect(msg?.to).toBeDefined();
    });

    it('should provide line numbers for messages', () => {
        const parsed = parseJobLog(ENGLISH_JOBLOG_SMALL);
        const msg = parsed.messages[0];
        
        expect(msg?.lineNumber).toBeGreaterThan(0);
        expect(msg?.endLineNumber).toBeGreaterThanOrEqual(msg.lineNumber);
    });

    it('should maintain correct line numbers in large files', () => {
        const parsed = parseJobLog(ENGLISH_JOBLOG);
        
        // Line numbers should be monotonically increasing
        for (let i = 1; i < parsed.messages.length; i++) {
            expect(parsed.messages[i].lineNumber).toBeGreaterThanOrEqual(
                parsed.messages[i - 1].endLineNumber
            );
        }
    });

    it('should parse cause text when present', () => {
        const parsed = parseJobLog(ENGLISH_JOBLOG);
        const msgWithCause = parsed.messages.find(m => m.cause);
        
        // Should find at least one message with cause in a large file
        expect(msgWithCause).toBeDefined();
        expect(msgWithCause?.cause).toBeTruthy();
    });
});

describe('Performance', () => {
    it('should parse large English file efficiently', () => {
        const start = Date.now();
        const result = parseJobLog(ENGLISH_JOBLOG);
        const elapsed = Date.now() - start;
        
        expect(result.isValid).toBe(true);
        expect(elapsed).toBeLessThan(2000); // Should parse in under 2 seconds
    });

    it('should parse large German file efficiently', () => {
        const start = Date.now();
        const result = parseJobLog(GERMAN_JOBLOG);
        const elapsed = Date.now() - start;
        
        expect(result.isValid).toBe(true);
        expect(elapsed).toBeLessThan(2000);
    });

    it('should parse large Dutch file efficiently', () => {
        const start = Date.now();
        const result = parseJobLog(DUTCH_JOBLOG);
        const elapsed = Date.now() - start;

        expect(result.isValid).toBe(true);
        expect(elapsed).toBeLessThan(2000);
    });

    it('should parse French file efficiently', () => {
        const start = Date.now();
        const result = parseJobLog(FRENCH_JOBLOG);
        const elapsed = Date.now() - start;

        expect(result.isValid).toBe(true);
        expect(elapsed).toBeLessThan(2000);
    });

    it('should parse Italian file efficiently', () => {
        const start = Date.now();
        const result = parseJobLog(ITALIAN_JOBLOG);
        const elapsed = Date.now() - start;

        expect(result.isValid).toBe(true);
        expect(elapsed).toBeLessThan(2000);
    });
});
