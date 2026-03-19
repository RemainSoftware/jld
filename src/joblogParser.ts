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

// Job Log Parser for IBM i job logs - Multi-language support

import {
    JobLogHeader,
    JobLogMessage,
    JobLogStats,
    ParsedJobLog,
    ProgramInfo,
    JobLogDetectionResult,
    JobCompletionStatus
} from './types';
import { getLanguageSupport, detectLanguage } from './localization';

const langSupport = getLanguageSupport();

/**
 * Build regex patterns using language support
 */
function buildPatterns() {
    const messageTypes = langSupport.getMessageTypesAlternation();
    const pageLabels = langSupport.getPageLabelsAlternation();
    
    return {
        // Header line: flexible for various date/page formats and languages
        // "5770SS1 V7R6M0 250418 ... Job Log|Jobprotokoll|Taaklogboek ... PLATO 28-02-26|01.03.26|20/05/22 22:55:04 CET Page|Seite|Pagina|Página 1"
        // Note: timezone is optional (not present in some Dutch logs)
        pageHeader: new RegExp(
            `^\\s*(5770\\w+)\\s+(V\\d+R\\d+M\\d+)\\s+(\\d+)\\s+.*?(\\w+)\\s+(\\d{2}[./-]\\d{2}[./-]\\d{2})\\s+(\\d{2}:\\d{2}:\\d{2})(?:\\s+(\\w+))?\\s+(?:${pageLabels})\\s+(\\d+)`,
            'i'
        ),
        
        // Job name line - built from language support
        jobInfo: langSupport.getJobInfoPattern(),
        
        // Job description line - built from language support
        jobDesc: langSupport.getJobDescPattern(),
        
        // Column header line - built from language support
        columnHeader: langSupport.getColumnHeaderPattern(),
        
        // Message line pattern - captures message ID, type, severity, date, time, from/to program info
        // Handles date formats: DD-MM-YY, DD.MM.YY, and DD/MM/YY (Spanish)
        // Handles time formats: HH:MM:SS.microseconds and HH:MM:SS,microseconds
        // More flexible spacing for PDF paste
        messageLine: new RegExp(
            `^(\\*NONE|\\w{3,7})\\s+(${messageTypes})\\s*(\\d{0,2})?\\s+(\\d{2}[./-]\\d{2}[./-]\\d{2})\\s+(\\d{2}:\\d{2}:\\d{2}[.,]\\d+)\\s+(\\S+)\\s*(\\S+)?\\s*(\\S+)?\\s+(\\S+)\\s*(\\S+)?\\s*(\\S+)?`,
            'i'
        ),
        
        // Detail line patterns - built from language support
        fromModule: langSupport.buildDetailPattern(langSupport.fromModulePatterns),
        fromProcedure: langSupport.buildDetailPattern(langSupport.fromProcedurePatterns),
        toModule: langSupport.buildDetailPattern(langSupport.toModulePatterns),
        toProcedure: langSupport.buildDetailPattern(langSupport.toProcedurePatterns),
        statement: langSupport.buildDetailPattern(langSupport.statementPatterns),
        message: langSupport.buildDetailPattern(langSupport.messagePatterns),
        cause: langSupport.buildDetailPattern(langSupport.causePatterns),
        recovery: langSupport.buildDetailPattern(langSupport.recoveryPatterns),
        thread: langSupport.buildDetailPattern(langSupport.threadPatterns),
        fromUser: langSupport.buildDetailPattern(langSupport.fromUserPatterns),
        
        // Version pattern for detection
        versionPattern: /V\d+R\d+M\d+/,
        productId: /5770\w{2,3}/
    };
}

// Build patterns once
const PATTERNS = buildPatterns();

/**
 * Check if a document content is a job log
 */
export function detectJobLog(content: string): JobLogDetectionResult {
    const lines = content.split('\n').slice(0, 15); // Check first 15 lines
    const firstLines = lines.join('\n');
    
    // Check for product ID and version pattern  
    const hasProductId = PATTERNS.productId.test(firstLines);
    const hasVersion = PATTERNS.versionPattern.test(firstLines);
    const hasJobLogTitle = langSupport.getJobLogTitlePattern().test(firstLines);
    const hasPageHeader = PATTERNS.pageHeader.test(lines[0] || '');
    
    if (hasPageHeader && hasProductId && hasVersion) {
        return {
            isJobLog: true,
            confidence: 'high',
            reason: 'Found IBM i job log header with product ID, version, and page header'
        };
    }
    
    if (hasProductId && hasVersion && hasJobLogTitle) {
        return {
            isJobLog: true,
            confidence: 'high',
            reason: 'Found IBM i product ID, version, and job log title'
        };
    }
    
    if (hasProductId && hasVersion) {
        return {
            isJobLog: true,
            confidence: 'high',
            reason: 'Found IBM i product ID and version pattern'
        };
    }
    
    if (hasJobLogTitle && (hasProductId || hasVersion)) {
        return {
            isJobLog: true,
            confidence: 'medium',
            reason: 'Found job log title with IBM i indicators'
        };
    }
    
    // Check for message line patterns in first 50 lines
    const extendedLines = content.split('\n').slice(0, 50);
    for (const line of extendedLines) {
        if (PATTERNS.messageLine.test(line)) {
            return {
                isJobLog: true,
                confidence: 'medium',
                reason: 'Found IBM i job log message pattern'
            };
        }
    }
    
    // Check for column header
    for (const line of extendedLines) {
        if (PATTERNS.columnHeader.test(line)) {
            return {
                isJobLog: true,
                confidence: 'medium',
                reason: 'Found IBM i job log column header'
            };
        }
    }
    
    return {
        isJobLog: false,
        confidence: 'none',
        reason: 'No IBM i job log patterns found'
    };
}

/**
 * Parse the job log header from the first few lines
 */
function parseHeader(lines: string[]): JobLogHeader | undefined {
    const header: Partial<JobLogHeader> = {};
    
    for (let i = 0; i < Math.min(lines.length, 15); i++) {
        const line = lines[i];
        
        // Parse page header
        const pageMatch = line.match(PATTERNS.pageHeader);
        if (pageMatch) {
            header.productId = pageMatch[1];
            header.version = pageMatch[2];
            header.buildDate = pageMatch[3];
            header.systemName = pageMatch[4];
            header.logDate = pageMatch[5];
            header.logTime = pageMatch[6];
            header.timezone = pageMatch[7];
            header.pageNumber = parseInt(pageMatch[8], 10);
        }
        
        // Parse job info
        const jobMatch = line.match(PATTERNS.jobInfo);
        if (jobMatch) {
            header.jobName = jobMatch[1];
            header.user = jobMatch[2];
            header.jobNumber = jobMatch[3];
        }
        
        // Parse job description
        const descMatch = line.match(PATTERNS.jobDesc);
        if (descMatch) {
            header.jobDescription = descMatch[1];
            header.jobDescLibrary = descMatch[2];
        }
    }
    
    if (header.productId && header.jobName) {
        return header as JobLogHeader;
    }
    
    // Try alternative detection if standard header not found
    if (header.productId || header.version) {
        // Try to find job info with more flexible pattern using language support
        const allText = lines.slice(0, 15).join(' ');
        const jobNameAlt = langSupport.jobNameLabels.map(l => l.replace(/\s+/g, '\\s*')).join('|');
        const userAlt = langSupport.userLabels.join('|');
        const numberAlt = langSupport.numberLabels.join('|');
        
        const flexJobMatch = allText.match(new RegExp(`(?:${jobNameAlt})\\s*[.\\s:]+([\\w]+)`, 'i'));
        const flexUserMatch = allText.match(new RegExp(`(?:${userAlt})\\s*[.\\s:]+([\\w]+)`, 'i'));
        const flexNumMatch = allText.match(new RegExp(`(?:${numberAlt})\\s*[.\\s:]+(\\d+)`, 'i'));
        
        if (flexJobMatch) {header.jobName = flexJobMatch[1];}
        if (flexUserMatch) {header.user = flexUserMatch[1];}
        if (flexNumMatch) {header.jobNumber = flexNumMatch[1];}
        
        if (header.jobName) {
            return header as JobLogHeader;
        }
    }
    
    return undefined;
}

/**
 * Parse a date/time string from the job log into a Date object
 * Handles date formats: DD-MM-YY, DD.MM.YY, and DD/MM/YY (Spanish)
 * Handles both HH:MM:SS.microseconds and HH:MM:SS,microseconds formats
 */
function parseTimestamp(dateStr: string, timeStr: string): Date {
    // Date format: DD-MM-YY, DD.MM.YY, or DD/MM/YY
    const dateParts = dateStr.split(/[-./]/).map(Number);
    const [day, month, year] = dateParts;
    
    // Time format: HH:MM:SS.microseconds or HH:MM:SS,microseconds
    const timeParts = timeStr.split(':');
    const hours = parseInt(timeParts[0], 10);
    const minutes = parseInt(timeParts[1], 10);
    // Handle both . and , as decimal separator
    const secondsAndMicro = timeParts[2].replace(',', '.');
    const seconds = parseFloat(secondsAndMicro);
    
    // Assuming 2000s for two-digit year
    const fullYear = year < 50 ? 2000 + year : 1900 + year;
    
    const date = new Date(fullYear, month - 1, day);
    date.setHours(hours);
    date.setMinutes(minutes);
    date.setSeconds(Math.floor(seconds));
    date.setMilliseconds(Math.round((seconds % 1) * 1000));
    
    return date;
}

/**
 * Check if a line is a detail/continuation line (not a message or header)
 */
function isDetailLine(line: string): boolean {
    // Empty line
    if (!line.trim()) {return false;}
    
    // Message line
    if (PATTERNS.messageLine.test(line)) {return false;}
    
    // Page header
    if (PATTERNS.pageHeader.test(line)) {return false;}
    
    // Column header
    if (PATTERNS.columnHeader.test(line)) {return false;}
    
    // Job info lines
    if (PATTERNS.jobInfo.test(line)) {return false;}
    if (PATTERNS.jobDesc.test(line)) {return false;}
    
    // Starts with whitespace or is indented (typical detail line)
    if (/^\s+/.test(line)) {return true;}
    
    // Contains detail field pattern
    if (PATTERNS.fromModule.test(line)) {return true;}
    if (PATTERNS.fromProcedure.test(line)) {return true;}
    if (PATTERNS.toModule.test(line)) {return true;}
    if (PATTERNS.toProcedure.test(line)) {return true;}
    if (PATTERNS.statement.test(line)) {return true;}
    if (PATTERNS.message.test(line)) {return true;}
    if (PATTERNS.cause.test(line)) {return true;}
    if (PATTERNS.recovery.test(line)) {return true;}
    if (PATTERNS.thread.test(line)) {return true;}
    if (PATTERNS.fromUser.test(line)) {return true;}
    
    return false;
}

/**
 * Extract text from a detail line, handling continuation
 * More flexible to handle PDF paste with various indentation levels
 * Handles page breaks that may occur in the middle of a text field
 */
function extractContinuationText(lines: string[], startIndex: number, pattern: RegExp, maxLines: number = 10): { text: string; linesConsumed: number } {
    let text = '';
    let linesConsumed = 0;
    let foundMatch = false;
    let linesChecked = 0;
    
    for (let i = startIndex; linesChecked < maxLines && i < lines.length; i++) {
        const line = lines[i];
        
        // Skip page header lines - continuation may span pages
        if (PATTERNS.pageHeader.test(line) || 
            PATTERNS.columnHeader.test(line) ||
            PATTERNS.jobInfo.test(line) ||
            PATTERNS.jobDesc.test(line)) {
            linesConsumed++;
            continue;
        }
        
        linesChecked++;
        
        // Check if this is a new message
        if (PATTERNS.messageLine.test(line)) {
            break;
        }
        
        // Check for other detail field starts (but not this one)
        if (foundMatch && i > startIndex) {
            const otherPatterns = [
                PATTERNS.fromModule, PATTERNS.fromProcedure,
                PATTERNS.toModule, PATTERNS.toProcedure,
                PATTERNS.statement, PATTERNS.message,
                PATTERNS.cause, PATTERNS.recovery,
                PATTERNS.thread, PATTERNS.fromUser
            ].filter(p => p !== pattern);
            
            let isOtherField = false;
            for (const p of otherPatterns) {
                if (p.test(line)) {
                    isOtherField = true;
                    break;
                }
            }
            if (isOtherField) {break;}
        }
        
        const match = line.match(pattern);
        if (match) {
            // Use capture group 2 (the value after the label) if available
            text = (match[2] || match[1]).trim();
            linesConsumed = 1;
            foundMatch = true;
        } else if (foundMatch && line.trim()) {
            // Continuation line - flexible check for indentation or just non-message line
            if (!PATTERNS.messageLine.test(line) && isDetailLine(line)) {
                text += ' ' + line.trim();
                linesConsumed++;
            } else {
                break;
            }
        } else if (foundMatch) {
            break;
        }
    }
    
    return { text: text.trim(), linesConsumed };
}

/**
 * Check if a line is a page-related header line (page header, job info, job desc, column header)
 * These lines should be skipped when a message spans across pages
 */
function isPageHeaderLine(line: string): boolean {
    return PATTERNS.pageHeader.test(line) || 
           PATTERNS.columnHeader.test(line) ||
           PATTERNS.jobInfo.test(line) ||
           PATTERNS.jobDesc.test(line);
}

/**
 * Skip page header lines if we're in the middle of parsing a message that spans pages
 * Returns the number of lines to skip
 */
function skipPageHeaderLines(lines: string[], startIndex: number): number {
    let skipped = 0;
    let i = startIndex;
    
    while (i < lines.length && isPageHeaderLine(lines[i])) {
        skipped++;
        i++;
    }
    
    return skipped;
}

/**
 * Parse a single message block starting from the given line
 */
function parseMessageBlock(lines: string[], startIndex: number): { message: JobLogMessage | null; linesConsumed: number } {
    const line = lines[startIndex];
    const match = line.match(PATTERNS.messageLine);
    
    if (!match) {
        return { message: null, linesConsumed: 1 };
    }
    
    const [, messageId, typeLocal, severityStr, date, time, fromPgm, fromLib, fromInst, toPgm, toLib, toInst] = match;
    
    // Normalize the message type to English
    const normalizedType = langSupport.normalizeMessageType(typeLocal);
    
    const message: JobLogMessage = {
        lineNumber: startIndex + 1, // 1-based
        endLineNumber: startIndex + 1,
        messageId: messageId || '*NONE',
        type: normalizedType,
        severity: severityStr ? parseInt(severityStr, 10) : 0,
        date,
        time,
        timestamp: parseTimestamp(date, time),
        from: {
            program: fromPgm || '',
            library: fromLib || '',
            instruction: fromInst || ''
        },
        to: {
            program: toPgm || '',
            library: toLib || '',
            instruction: toInst || ''
        },
        rawLines: [line]
    };
    
    // Parse detail lines following the message
    let i = startIndex + 1;
    let lastDetailLine = startIndex;
    
    while (i < lines.length) {
        const detailLine = lines[i];
        
        // Skip page header lines - message may continue on next page
        if (isPageHeaderLine(detailLine)) {
            const skipped = skipPageHeaderLines(lines, i);
            i += skipped;
            continue;
        }
        
        // Stop if we hit another message line
        if (PATTERNS.messageLine.test(detailLine)) {
            break;
        }
        
        // Parse From module
        const fromModMatch = detailLine.match(PATTERNS.fromModule);
        if (fromModMatch) {
            message.from.module = (fromModMatch[2] || fromModMatch[1]).trim();
            message.rawLines.push(detailLine);
            lastDetailLine = i;
            i++;
            continue;
        }
        
        // Parse From procedure
        const fromProcMatch = detailLine.match(PATTERNS.fromProcedure);
        if (fromProcMatch) {
            message.from.procedure = (fromProcMatch[2] || fromProcMatch[1]).trim();
            message.rawLines.push(detailLine);
            lastDetailLine = i;
            i++;
            continue;
        }
        
        // Parse To module
        const toModMatch = detailLine.match(PATTERNS.toModule);
        if (toModMatch) {
            message.to.module = (toModMatch[2] || toModMatch[1]).trim();
            message.rawLines.push(detailLine);
            lastDetailLine = i;
            i++;
            continue;
        }
        
        // Parse To procedure
        const toProcMatch = detailLine.match(PATTERNS.toProcedure);
        if (toProcMatch) {
            message.to.procedure = (toProcMatch[2] || toProcMatch[1]).trim();
            message.rawLines.push(detailLine);
            lastDetailLine = i;
            i++;
            continue;
        }
        
        // Parse Statement (can appear multiple times, for from and to)
        const stmtMatch = detailLine.match(PATTERNS.statement);
        if (stmtMatch) {
            // Assign to from or to based on what we've seen
            const stmtValue = (stmtMatch[2] || stmtMatch[1]).trim();
            if (!message.from.statement) {
                message.from.statement = stmtValue;
            } else if (!message.to.statement) {
                message.to.statement = stmtValue;
            }
            message.rawLines.push(detailLine);
            lastDetailLine = i;
            i++;
            continue;
        }
        
        // Parse Thread info (skip, but count as detail line)
        if (PATTERNS.thread.test(detailLine)) {
            message.rawLines.push(detailLine);
            lastDetailLine = i;
            i++;
            continue;
        }
        
        // Parse From user (skip, but count as detail line)
        if (PATTERNS.fromUser.test(detailLine)) {
            message.rawLines.push(detailLine);
            lastDetailLine = i;
            i++;
            continue;
        }
        
        // Parse Message text with continuation
        const msgMatch = detailLine.match(PATTERNS.message);
        if (msgMatch) {
            const { text, linesConsumed } = extractContinuationText(lines, i, PATTERNS.message, 8);
            message.messageText = text;
            for (let j = 0; j < linesConsumed; j++) {
                if (lines[i + j]) {message.rawLines.push(lines[i + j]);}
            }
            lastDetailLine = i + linesConsumed - 1;
            i += linesConsumed;
            continue;
        }
        
        // Parse Cause text with continuation
        const causeMatch = detailLine.match(PATTERNS.cause);
        if (causeMatch) {
            const { text, linesConsumed } = extractContinuationText(lines, i, PATTERNS.cause, 12);
            message.cause = text;
            for (let j = 0; j < linesConsumed; j++) {
                if (lines[i + j]) {message.rawLines.push(lines[i + j]);}
            }
            lastDetailLine = i + linesConsumed - 1;
            i += linesConsumed;
            continue;
        }
        
        // Parse Recovery text with continuation
        const recoveryMatch = detailLine.match(PATTERNS.recovery);
        if (recoveryMatch) {
            const { text, linesConsumed } = extractContinuationText(lines, i, PATTERNS.recovery, 12);
            message.recovery = text;
            for (let j = 0; j < linesConsumed; j++) {
                if (lines[i + j]) {message.rawLines.push(lines[i + j]);}
            }
            lastDetailLine = i + linesConsumed - 1;
            i += linesConsumed;
            continue;
        }
        
        // Continuation of previous text - flexible for PDF paste
        if (detailLine.trim() && isDetailLine(detailLine)) {
            message.rawLines.push(detailLine);
            lastDetailLine = i;
            i++;
            continue;
        }
        
        // Unknown or empty line - skip but count
        if (!detailLine.trim()) {
            i++;
            continue;
        }
        
        // Unknown structured line - stop
        break;
    }
    
    message.endLineNumber = lastDetailLine + 1;
    
    return { message, linesConsumed: i - startIndex };
}

/**
 * Calculate statistics from parsed messages
 */
function calculateStats(messages: JobLogMessage[], highSeverityThreshold: number = 30): JobLogStats {
    const stats: JobLogStats = {
        totalMessages: messages.length,
        byType: new Map(),
        bySeverity: new Map(),
        byMessageId: new Map(),
        highSeverityCount: 0,
        escapeCount: 0,
        diagnosticCount: 0
    };
    
    for (const msg of messages) {
        // Count by type
        const typeCount = stats.byType.get(msg.type) || 0;
        stats.byType.set(msg.type, typeCount + 1);
        
        // Count by severity
        const sevCount = stats.bySeverity.get(msg.severity) || 0;
        stats.bySeverity.set(msg.severity, sevCount + 1);
        
        // Count by message ID
        const idCount = stats.byMessageId.get(msg.messageId) || 0;
        stats.byMessageId.set(msg.messageId, idCount + 1);
        
        // High severity
        if (msg.severity >= highSeverityThreshold) {
            stats.highSeverityCount++;
        }
        
        // Escape messages
        if (msg.type === 'Escape') {
            stats.escapeCount++;
        }
        
        // Diagnostic messages
        if (msg.type === 'Diagnostic') {
            stats.diagnosticCount++;
        }
    }
    
    return stats;
}

/**
 * Parse a job log document
 */
export function parseJobLog(content: string, highSeverityThreshold: number = 30): ParsedJobLog {
    const startTime = Date.now();
    const lines = content.split('\n');
    const messages: JobLogMessage[] = [];
    
    // Detect language (for logging purposes, patterns already support all)
    const detectedLang = detectLanguage(content);
    console.log(`Job Log Detective: Detected language: ${detectedLang.name}`);
    
    // Parse header
    const header = parseHeader(lines);
    
    if (!header) {
        return {
            isValid: false,
            messages: [],
            stats: calculateStats([]),
            parseTime: Date.now() - startTime
        };
    }
    
    // Parse messages
    let i = 0;
    while (i < lines.length) {
        const line = lines[i];
        
        // Skip header lines, column headers, and empty lines
        if (PATTERNS.pageHeader.test(line) || 
            PATTERNS.columnHeader.test(line) ||
            PATTERNS.jobInfo.test(line) ||
            PATTERNS.jobDesc.test(line) ||
            !line.trim()) {
            i++;
            continue;
        }
        
        // Try to parse as message
        if (PATTERNS.messageLine.test(line)) {
            const { message, linesConsumed } = parseMessageBlock(lines, i);
            if (message) {
                messages.push(message);
            }
            i += linesConsumed;
        } else {
            i++;
        }
    }
    
    // Detect job completion status from the last messages
    const completion = detectJobCompletion(messages);
    
    return {
        isValid: true,
        header,
        messages,
        stats: calculateStats(messages, highSeverityThreshold),
        completion,
        parseTime: Date.now() - startTime
    };
}

/**
 * Detect job completion status from messages
 * Looks for CPF1164 (job ended) or similar completion messages
 */
function detectJobCompletion(messages: JobLogMessage[]): JobCompletionStatus | undefined {
    // Look from the end for job end messages
    for (let i = messages.length - 1; i >= Math.max(0, messages.length - 20); i--) {
        const msg = messages[i];
        
        // CPF1164 is the standard "Job ended" message
        if (msg.messageId === 'CPF1164' || msg.messageId === 'CPF1124') {
            const text = msg.messageText || msg.cause || '';
            
            // Look for "end code XX" pattern
            const endCodeMatch = text.match(/end(?:ing)?\s*code\s*(\d+)/i);
            if (endCodeMatch) {
                const endCode = parseInt(endCodeMatch[1], 10);
                return {
                    completed: true,
                    endCode,
                    endCodeDescription: getEndCodeDescription(endCode),
                    success: endCode === 0 || endCode === 10,
                    processingTime: extractProcessingTime(text),
                    endDate: msg.date,
                    endTime: msg.time,
                    endMessage: msg
                };
            }
        }
        
        // CPC2402 indicates cancel message received
        if (msg.messageId === 'CPC2402') {
            return {
                completed: true,
                endCode: 20,
                endCodeDescription: 'Job ended - cancel message received at command processor',
                success: false,
                endDate: msg.date,
                endTime: msg.time,
                endMessage: msg
            };
        }
    }
    
    return undefined;
}

/**
 * Get human-readable description for job end codes
 */
function getEndCodeDescription(endCode: number): string {
    switch (endCode) {
        case 0: return 'Job completed normally';
        case 10: return 'Job completed normally during controlled ending';
        case 20: return 'Job exceeded end severity (ENDSEV)';
        case 30: return 'Job ended abnormally';
        case 40: return 'Job ended before becoming active';
        case 50: return 'Job ended while active';
        case 60: return 'Subsystem ended abnormally while job was active';
        case 70: return 'System ended abnormally while job was active';
        case 80: return 'Job ended (ENDJOBABN command)';
        case 90: return 'Job was forced to end after time limit';
        default: return `Unknown end code: ${endCode}`;
    }
}

/**
 * Extract processing time from job end message
 * Handles multiple languages:
 * - English: "X.XX seconds used"
 * - Dutch: "X,XX sec. gebruikt" or "X,XX seconden"
 * - German: "X,XX Sekunden"
 * - Spanish: "X,XX segundos"
 */
function extractProcessingTime(text: string): string | undefined {
    // Try English format first (dot decimal separator)
    let match = text.match(/([\d.]+)\s*seconds?\s*used/i);
    if (match) {
        return `${match[1]} seconds`;
    }
    
    // Try Dutch format: "X,XX sec. gebruikt" or "X,XX seconden"
    match = text.match(/([\d,]+)\s*(?:sec\.|seconden)\s*(?:gebruikt|processortijd)/i);
    if (match) {
        const value = match[1].replace(',', '.');
        return `${value} seconds`;
    }
    
    // Try German format: "X,XX Sekunden"
    match = text.match(/([\d,]+)\s*Sekunden/i);
    if (match) {
        const value = match[1].replace(',', '.');
        return `${value} seconds`;
    }
    
    // Try Spanish format: "X,XX segundos"
    match = text.match(/([\d,]+)\s*segundos/i);
    if (match) {
        const value = match[1].replace(',', '.');
        return `${value} seconds`;
    }
    
    return undefined;
}

/**
 * Get messages filtered by criteria
 */
export function filterMessages(
    messages: JobLogMessage[],
    options: {
        hideCommand?: boolean;
        minSeverity?: number;
        types?: Set<string>;
        messageIds?: Set<string>;
        messageIdPattern?: string;  // Pattern like "SQL*", "CPF*", etc.
        contentPattern?: string;    // Pattern to search in message text, cause, recovery, and program names
    }
): JobLogMessage[] {
    // Convert message ID pattern to regex if provided
    let messageIdRegex: RegExp | undefined;
    if (options.messageIdPattern) {
        // Convert glob-like pattern to regex: * -> .*, ? -> .
        const regexPattern = options.messageIdPattern
            .replace(/[.+^${}()|[\]\\]/g, '\\$&')  // Escape regex chars
            .replace(/\*/g, '.*')                    // * -> .*
            .replace(/\?/g, '.');                    // ? -> .
        messageIdRegex = new RegExp(`^${regexPattern}$`, 'i');
    }
    
    // Convert content pattern to regex if provided
    let contentRegex: RegExp | undefined;
    if (options.contentPattern) {
        // Convert glob-like pattern to regex: * -> .*, ? -> .
        const regexPattern = options.contentPattern
            .replace(/[.+^${}()|[\]\\]/g, '\\$&')  // Escape regex chars
            .replace(/\*/g, '.*')                    // * -> .*
            .replace(/\?/g, '.');                    // ? -> .
        contentRegex = new RegExp(regexPattern, 'i');
    }
    
    return messages.filter(msg => {
        if (options.hideCommand && msg.type === 'Command') {
            return false;
        }
        if (options.minSeverity !== undefined && msg.severity < options.minSeverity) {
            return false;
        }
        if (options.types && options.types.size > 0 && !options.types.has(msg.type)) {
            return false;
        }
        if (options.messageIds && options.messageIds.size > 0 && !options.messageIds.has(msg.messageId)) {
            return false;
        }
        // Apply message ID pattern filter
        if (messageIdRegex && !messageIdRegex.test(msg.messageId)) {
            return false;
        }
        // Apply content pattern filter - search in message text, cause, recovery, and program info
        if (contentRegex) {
            const searchFields = [
                msg.messageText,
                msg.cause,
                msg.recovery,
                msg.from.program,
                msg.from.library,
                msg.from.module,
                msg.from.procedure,
                msg.to.program,
                msg.to.library,
                msg.to.module,
                msg.to.procedure
            ].filter(Boolean);
            
            const matchFound = searchFields.some(field => contentRegex!.test(field!));
            if (!matchFound) {
                return false;
            }
        }
        return true;
    });
}

/**
 * Group messages by a key function
 */
export function groupMessages<K>(
    messages: JobLogMessage[],
    keyFn: (msg: JobLogMessage) => K
): Map<K, JobLogMessage[]> {
    const groups = new Map<K, JobLogMessage[]>();
    
    for (const msg of messages) {
        const key = keyFn(msg);
        const group = groups.get(key) || [];
        group.push(msg);
        groups.set(key, group);
    }
    
    return groups;
}

/**
 * Get high-priority messages that likely indicate the root cause
 * Focuses on messages near the end with high severity or error types
 */
export function getHighPriorityMessages(
    messages: JobLogMessage[],
    options: {
        highSeverityThreshold?: number;
        lastNPercent?: number;
    } = {}
): JobLogMessage[] {
    const threshold = options.highSeverityThreshold ?? 30;
    const lastNPercent = options.lastNPercent ?? 20;
    
    // Get messages from the last N% of the log
    const lastIndex = Math.floor(messages.length * (1 - lastNPercent / 100));
    const recentMessages = messages.slice(lastIndex);
    
    // Filter to high severity or error types
    const highPriority = recentMessages.filter(msg => 
        msg.severity >= threshold ||
        msg.type === 'Escape' ||
        msg.type === 'Diagnostic' ||
        (msg.type === 'Information' && msg.severity >= 30)
    );
    
    return highPriority;
}
