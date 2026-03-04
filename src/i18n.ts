/*
 * MIT License
 *
 * Copyright (c) 2026 Remain BV
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

// Internationalization (i18n) support for Job Log Detective runtime strings
// This module provides localized strings for the extension

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

/**
 * String keys for all localizable messages
 */
export interface LocalizedStrings {
    // Extension activation
    'extension.activated': string;
    'extension.deactivated': string;

    // Editor messages
    'editor.noActiveEditor': string;

    // Message types for filtering
    'messageType.escape': string;
    'messageType.diagnostic': string;
    'messageType.information': string;
    'messageType.completion': string;
    'messageType.command': string;
    'messageType.request': string;
    'messageType.inquiry': string;
    'messageType.reply': string;
    'messageType.notify': string;
    'messageType.senderCopy': string;

    // Filter UI
    'filter.selectMessageType': string;
    'filter.enterMessageIdPattern': string;
    'filter.messageIdPatternPlaceholder': string;
    'filter.patternValidationError': string;
    'filter.selectFilterOption': string;
    'filter.filterByType': string;
    'filter.filterByMessageId': string;
    'filter.showHighSeverity': string;
    'filter.clearAllFilters': string;
    'filter.noFilters': string;
    'filter.types': string;
    'filter.id': string;
    'filter.highSeverityOnly': string;
    'filter.minSeverity': string;
    'filter.showCommandMessages': string;
    'filter.hideCommandMessages': string;
    'filter.commandHidden': string;
    'filter.filterByContent': string;
    'filter.enterContentPattern': string;
    'filter.contentPatternPlaceholder': string;
    'filter.content': string;

    // Status bar and messages
    'status.jobLog': string;
    'status.messagesCount': string;
    'status.highSeverity': string;
    'status.parsedIn': string;
    'status.jobEndedAbnormally': string;
    'status.analysisFound': string;
    'status.showLogAnalysis': string;

    // Tree view
    'tree.goToMessage': string;
    'tree.summary': string;
    'tree.highPriority': string;
    'tree.recentHighSeverity': string;
    'tree.jobCompletedSuccessfully': string;
    'tree.jobEndedAbnormally': string;
    'tree.processingTime': string;
    'tree.total': string;
    'tree.escape': string;
    'tree.diagnostic': string;
    'tree.programTermination': string;
    'tree.errorMessages': string;
    'tree.line': string;

    // Tooltips
    'tooltip.severity': string;
    'tooltip.time': string;
    'tooltip.from': string;
    'tooltip.to': string;
    'tooltip.message': string;
    'tooltip.cause': string;
    'tooltip.recovery': string;

    // Pagination
    'tree.messages': string;
    'tree.showMore': string;

    // Timeline
    'tree.timeline': string;
    'tree.timelineDesc': string;
    'tree.timeBucket': string;
    'tree.timeBucketHotspot': string;

    // Document symbols
    'symbol.job': string;
    'symbol.summary': string;
    'symbol.messages': string;
}

/**
 * Default English strings
 */
const defaultStrings: LocalizedStrings = {
    // Extension activation
    'extension.activated': 'Job Log Detective is now active',
    'extension.deactivated': 'Job Log Detective deactivated',

    // Editor messages
    'editor.noActiveEditor': 'No active editor',

    // Message types for filtering
    'messageType.escape': 'Escape',
    'messageType.diagnostic': 'Diagnostic',
    'messageType.information': 'Information',
    'messageType.completion': 'Completion',
    'messageType.command': 'Command',
    'messageType.request': 'Request',
    'messageType.inquiry': 'Inquiry',
    'messageType.reply': 'Reply',
    'messageType.notify': 'Notify',
    'messageType.senderCopy': 'Sender Copy',

    // Filter UI
    'filter.selectMessageType': 'Select message type to filter',
    'filter.enterMessageIdPattern': 'Enter message ID pattern (e.g., SQL*, CPF*, *0001)',
    'filter.messageIdPatternPlaceholder': 'SQL*, CPF*, *ERROR*',
    'filter.patternValidationError': 'Pattern should only contain letters, numbers, * (any chars) and ? (single char)',
    'filter.selectFilterOption': 'Select filter option',
    'filter.filterByType': 'Filter by Message Type...',
    'filter.filterByMessageId': 'Filter by Message ID Pattern...',
    'filter.showHighSeverity': 'Show High Severity Only',
    'filter.clearAllFilters': 'Clear All Filters',
    'filter.noFilters': 'No filters',
    'filter.types': 'Types',
    'filter.id': 'ID',
    'filter.highSeverityOnly': 'High severity only',
    'filter.minSeverity': 'Min SEV',
    'filter.showCommandMessages': 'Show Command Messages',
    'filter.hideCommandMessages': 'Hide Command Messages',
    'filter.commandHidden': 'Command hidden',
    'filter.filterByContent': 'Filter by Content...',
    'filter.enterContentPattern': 'Enter content pattern (searches in message text, programs, procedures)',
    'filter.contentPatternPlaceholder': 'MYPGM*, *error*, MYLIB/*',
    'filter.content': 'Content',

    // Status bar and messages
    'status.jobLog': 'Job Log',
    'status.messagesCount': '{0} messages',
    'status.highSeverity': '{0} high severity',
    'status.parsedIn': 'parsed in {0}ms',
    'status.jobEndedAbnormally': 'Job Ended Abnormally (End Code {0})',
    'status.analysisFound': 'Job Log Analysis: Found {0} Escape and {1} Diagnostic messages',
    'status.showLogAnalysis': 'Show Log Analysis',

    // Tree view
    'tree.goToMessage': 'Go to Message',
    'tree.summary': 'Summary',
    'tree.highPriority': 'High Priority ({0})',
    'tree.recentHighSeverity': 'Recent high severity messages',
    'tree.jobCompletedSuccessfully': 'Job Completed Successfully',
    'tree.jobEndedAbnormally': 'Job Ended Abnormally (End Code {0})',
    'tree.processingTime': 'Processing Time: {0}',
    'tree.total': 'Total: {0}',
    'tree.escape': 'Escape: {0}',
    'tree.diagnostic': 'Diagnostic: {0}',
    'tree.programTermination': 'Program termination messages',
    'tree.errorMessages': 'Error messages',
    'tree.line': 'Line {0}',

    // Tooltips
    'tooltip.severity': 'Severity',
    'tooltip.time': 'Time',
    'tooltip.from': 'From',
    'tooltip.to': 'To',
    'tooltip.message': 'Message',
    'tooltip.cause': 'Cause',
    'tooltip.recovery': 'Recovery',

    // Pagination
    'tree.messages': 'Messages {0}-{1}',
    'tree.showMore': 'Show more...',

    // Timeline
    'tree.timeline': 'Timeline ({0})',
    'tree.timelineDesc': 'Messages in chronological order',
    'tree.timeBucket': '{0} ({1})',
    'tree.timeBucketHotspot': '{0} ({1}) \uD83D\uDD25',

    // Document symbols
    'symbol.job': 'Job: {0}',
    'symbol.summary': 'Summary',
    'symbol.messages': '{0} messages'
};

/**
 * Current loaded strings (may be from translation file)
 */
let currentStrings: LocalizedStrings = { ...defaultStrings };

/**
 * Initialize i18n with the extension context
 * Loads the appropriate language file based on VS Code's display language
 */
export function initializeI18n(extensionPath: string): void {
    // Try to get locale from multiple sources
    let locale = vscode.env.language;
    
    // Also check NLS config (set by --locale flag)
    const nlsConfig = process.env.VSCODE_NLS_CONFIG;
    if (nlsConfig) {
        try {
            const config = JSON.parse(nlsConfig);
            if (config.locale && config.locale !== 'en') {
                locale = config.locale;
            }
        } catch (e) {
            // Ignore parse errors
        }
    }
    
    // Try to load locale-specific translations
    const localeFile = path.join(extensionPath, `i18n`, `${locale}.json`);
    const baseLocaleFile = path.join(extensionPath, `i18n`, `${locale.split('-')[0]}.json`);
    
    let loadedStrings: Partial<LocalizedStrings> | null = null;
    
    // Try exact locale first (e.g., 'de-DE')
    if (fs.existsSync(localeFile)) {
        try {
            const content = fs.readFileSync(localeFile, 'utf8');
            loadedStrings = JSON.parse(content);
        } catch (e) {
            console.warn(`Failed to load locale file ${localeFile}:`, e);
        }
    }
    // Then try base locale (e.g., 'de')
    else if (fs.existsSync(baseLocaleFile)) {
        try {
            const content = fs.readFileSync(baseLocaleFile, 'utf8');
            loadedStrings = JSON.parse(content);
        } catch (e) {
            console.warn(`Failed to load locale file ${baseLocaleFile}:`, e);
        }
    }
    
    // Merge with defaults (fallback for missing keys)
    if (loadedStrings) {
        currentStrings = { ...defaultStrings, ...loadedStrings };
    }
}

/**
 * Get a localized string by key
 * @param key - The string key
 * @param args - Optional arguments for string formatting (replaces {0}, {1}, etc.)
 * @returns The localized string
 */
export function t(key: keyof LocalizedStrings, ...args: (string | number)[]): string {
    let str = currentStrings[key] || defaultStrings[key] || key;
    
    // Replace placeholders {0}, {1}, etc. with arguments
    if (args.length > 0) {
        for (let i = 0; i < args.length; i++) {
            str = str.replace(new RegExp(`\\{${i}\\}`, 'g'), String(args[i]));
        }
    }
    
    return str;
}

/**
 * Get all message types for the filter UI
 * @returns Array of localized message type names
 */
export function getMessageTypes(): string[] {
    return [
        t('messageType.escape'),
        t('messageType.diagnostic'),
        t('messageType.information'),
        t('messageType.completion'),
        t('messageType.command'),
        t('messageType.request'),
        t('messageType.inquiry'),
        t('messageType.reply'),
        t('messageType.notify'),
        t('messageType.senderCopy')
    ];
}

/**
 * Get message type key from localized name
 * Used for reverse lookup when filtering
 */
export function getMessageTypeKey(localizedName: string): string {
    const typeMap: Record<string, string> = {
        [t('messageType.escape')]: 'Escape',
        [t('messageType.diagnostic')]: 'Diagnostic',
        [t('messageType.information')]: 'Information',
        [t('messageType.completion')]: 'Completion',
        [t('messageType.command')]: 'Command',
        [t('messageType.request')]: 'Request',
        [t('messageType.inquiry')]: 'Inquiry',
        [t('messageType.reply')]: 'Reply',
        [t('messageType.notify')]: 'Notify',
        [t('messageType.senderCopy')]: 'Sender Copy'
    };
    return typeMap[localizedName] || localizedName;
}
