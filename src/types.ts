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

// Type definitions for Job Log Detective

/**
 * Message types that can appear in an IBM i job log
 */
export type MessageType = 
    | 'Command'
    | 'Completion'
    | 'Diagnostic'
    | 'Escape'
    | 'Information'
    | 'Inquiry'
    | 'Notify'
    | 'Reply'
    | 'Request'
    | 'Sender Copy';

/**
 * Represents the header information from a job log page
 */
export interface JobLogHeader {
    productId: string;          // e.g., "5770SS1"
    version: string;            // e.g., "V7R6M0"
    buildDate: string;          // e.g., "250418"
    systemName: string;         // e.g., "PLATO"
    logDate: string;            // e.g., "28-02-26"
    logTime: string;            // e.g., "22:55:04"
    timezone: string;           // e.g., "CET"
    pageNumber: number;
    jobName: string;            // e.g., "QPADEV0003"
    user: string;               // e.g., "REMAIN"
    jobNumber: string;          // e.g., "727905"
    jobDescription: string;     // e.g., "QDFTJOBD"
    jobDescLibrary: string;     // e.g., "REMAINLIB"
}

/**
 * Represents sender or receiver information for a message
 */
export interface ProgramInfo {
    program: string;
    library: string;
    instruction: string;
    module?: string;
    procedure?: string;
    statement?: string;
}

/**
 * Represents a single message in the job log
 */
export interface JobLogMessage {
    lineNumber: number;         // 1-based line number in the file
    endLineNumber: number;      // End line of the message block
    messageId: string;          // e.g., "CPF1124", "*NONE"
    type: MessageType | string; // Message type
    severity: number;           // 0-99
    date: string;               // e.g., "28-02-26"
    time: string;               // e.g., "13:10:12.467899"
    timestamp: Date;            // Parsed timestamp
    from: ProgramInfo;          // Sender program info
    to: ProgramInfo;            // Receiver program info
    messageText?: string;       // The "Message . . . ." text
    cause?: string;             // The "Cause . . . . ." text
    recovery?: string;          // The "Recovery . . . ." text
    rawLines: string[];         // Original raw lines
}

/**
 * Job completion status
 */
export interface JobCompletionStatus {
    completed: boolean;
    endCode: number;            // 0=normal, 20=exceeded severity, 30=abnormal, etc.
    endCodeDescription: string;
    success: boolean;           // true if end code is 0 or 10
    processingTime?: string;    // e.g., ".111 seconds"
    endDate?: string;
    endTime?: string;
    endMessage?: JobLogMessage; // The CPF1164 or similar message
}

/**
 * Statistics about the job log
 */
export interface JobLogStats {
    totalMessages: number;
    byType: Map<string, number>;
    bySeverity: Map<number, number>;
    byMessageId: Map<string, number>;
    highSeverityCount: number;
    escapeCount: number;
    diagnosticCount: number;
}

/**
 * Parsed job log result
 */
export interface ParsedJobLog {
    isValid: boolean;
    header?: JobLogHeader;
    messages: JobLogMessage[];
    stats: JobLogStats;
    completion?: JobCompletionStatus;
    parseTime: number;          // Time taken to parse in ms
}

/**
 * Advanced filter options for the tree view
 */
export interface FilterOptions {
    hideCommand: boolean;
    minSeverity: number;
    messageTypes: Set<string>;
    messageIdPattern?: string;   // Pattern like "SQL*", "CPF*", etc.
}

/**
 * Tree item data for the TreeDataProvider
 */
export interface TreeItemData {
    type: 'root' | 'category' | 'messageGroup' | 'message' | 'page' | 'timeline' | 'timeBucket';
    label: string;
    description?: string;
    message?: JobLogMessage;
    children?: TreeItemData[];
    count?: number;
    severity?: number;
    icon?: string;
    iconColor?: 'error' | 'warning' | 'success';
    // Pagination support for large message groups
    messages?: JobLogMessage[];  // Messages for this page
    pageStart?: number;         // Start index (0-based)
    pageSize?: number;          // Number of items per page
}

/**
 * Detection result when checking if a file is a job log
 */
export interface JobLogDetectionResult {
    isJobLog: boolean;
    confidence: 'high' | 'medium' | 'low' | 'none';
    reason: string;
}
