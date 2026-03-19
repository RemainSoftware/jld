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

// DocumentSymbolProvider for Job Log Detective - provides Outline view integration

import * as vscode from 'vscode';
import { ParsedJobLog, JobLogMessage } from './types';
import { parseJobLog, groupMessages } from './joblogParser';
import { t } from './i18n';
import { getFlameDecoration, determineBucketSize, groupMessagesByTimeBucket, formatBucketTime, getBucketStats } from './timelineUtils';

/**
 * Provides document symbols for job log files, enabling the Outline view
 */
export class JobLogDocumentSymbolProvider implements vscode.DocumentSymbolProvider {
    private cache: Map<string, { version: number; symbols: vscode.DocumentSymbol[]; parsed: ParsedJobLog }> = new Map();
    
    /**
     * Provide document symbols for the outline view
     */
    public provideDocumentSymbols(
        document: vscode.TextDocument,
        _token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.DocumentSymbol[]> {
        // Check cache
        const cached = this.cache.get(document.uri.toString());
        if (cached && cached.version === document.version) {
            return cached.symbols;
        }
        
        const config = vscode.workspace.getConfiguration('joblogDetective');
        const hideCommand = config.get<boolean>('hideCommandMessages', true);
        const highSeverityThreshold = config.get<number>('highSeverityThreshold', 30);
        
        const parsed = parseJobLog(document.getText(), highSeverityThreshold);
        
        if (!parsed.isValid) {
            return [];
        }
        
        const symbols = this.createSymbols(document, parsed, hideCommand, highSeverityThreshold);
        
        // Cache the result
        this.cache.set(document.uri.toString(), {
            version: document.version,
            symbols,
            parsed
        });
        
        return symbols;
    }
    
    /**
     * Get the cached parsed job log for a document
     */
    public getCachedParsedLog(uri: vscode.Uri): ParsedJobLog | undefined {
        return this.cache.get(uri.toString())?.parsed;
    }
    
    /**
     * Clear cache for a document
     */
    public clearCache(uri?: vscode.Uri): void {
        if (uri) {
            this.cache.delete(uri.toString());
        } else {
            this.cache.clear();
        }
    }
    
    /**
     * Create document symbols from parsed job log
     */
    private createSymbols(
        document: vscode.TextDocument,
        parsed: ParsedJobLog,
        hideCommand: boolean,
        highSeverityThreshold: number
    ): vscode.DocumentSymbol[] {
        const symbols: vscode.DocumentSymbol[] = [];
        
        // Filter messages
        let messages = parsed.messages;
        if (hideCommand) {
            messages = messages.filter(m => m.type !== 'Command');
        }
        
        // Create header symbol
        if (parsed.header) {
            const headerRange = new vscode.Range(0, 0, 2, 0);
            const headerSymbol = new vscode.DocumentSymbol(
                t('symbol.job', `${parsed.header.jobNumber}/${parsed.header.user}/${parsed.header.jobName}`),
                `${parsed.header.systemName} - ${parsed.header.version}`,
                vscode.SymbolKind.File,
                headerRange,
                headerRange
            );
            symbols.push(headerSymbol);
        }
        
        // Create summary symbol
        const summaryRange = new vscode.Range(0, 0, 0, 0);
        const summarySymbol = new vscode.DocumentSymbol(
            t('symbol.summary'),
            `${t('symbol.messages', messages.length)}, ${t('status.highSeverity', parsed.stats.highSeverityCount)}`,
            vscode.SymbolKind.Namespace,
            summaryRange,
            summaryRange
        );
        
        // Add type statistics as children
        const typeGroups = groupMessages(messages, m => m.type);
        for (const [type, msgs] of typeGroups) {
            const highSev = msgs.filter(m => m.severity >= highSeverityThreshold).length;
            const typeSymbol = new vscode.DocumentSymbol(
                type,
                `${t('symbol.messages', msgs.length)}${highSev > 0 ? ` (${t('status.highSeverity', highSev)})` : ''}`,
                this.getSymbolKindForType(type),
                summaryRange,
                summaryRange
            );
            summarySymbol.children.push(typeSymbol);
        }
        symbols.push(summarySymbol);
        
        // Group messages by type
        const typeSymbols: vscode.DocumentSymbol[] = [];
        
        for (const [type, msgs] of typeGroups) {
            if (msgs.length === 0) {continue;}
            
            const firstMsg = msgs[0];
            const lastMsg = msgs[msgs.length - 1];
            const typeRange = new vscode.Range(
                firstMsg.lineNumber - 1, 0,
                lastMsg.endLineNumber - 1, 0
            );
            
            const typeSymbol = new vscode.DocumentSymbol(
                `${type} (${msgs.length})`,
                '',
                this.getSymbolKindForType(type),
                typeRange,
                typeRange
            );
            
            // Group messages by message ID within each type
            const idGroups = groupMessages(msgs, m => m.messageId);
            
            for (const [msgId, idMsgs] of idGroups) {
                if (idMsgs.length === 0) {continue;}
                
                const firstIdMsg = idMsgs[0];
                const lastIdMsg = idMsgs[idMsgs.length - 1];
                const idRange = new vscode.Range(
                    firstIdMsg.lineNumber - 1, 0,
                    lastIdMsg.endLineNumber - 1, 0
                );
                
                const maxSeverity = Math.max(...idMsgs.map(m => m.severity));
                const idSymbol = new vscode.DocumentSymbol(
                    `${msgId} (${idMsgs.length})`,
                    maxSeverity > 0 ? `SEV ${maxSeverity}` : '',
                    maxSeverity >= highSeverityThreshold ? vscode.SymbolKind.Event : vscode.SymbolKind.Constant,
                    idRange,
                    idRange
                );
                
                // Add individual messages as children
                for (const msg of idMsgs) {
                    const msgRange = new vscode.Range(
                        msg.lineNumber - 1, 0,
                        msg.endLineNumber - 1, document.lineAt(Math.min(msg.endLineNumber - 1, document.lineCount - 1)).text.length
                    );
                    
                    const description = msg.messageText 
                        ? msg.messageText.substring(0, 60) + (msg.messageText.length > 60 ? '...' : '')
                        : t('tree.line', msg.lineNumber);
                    
                    const msgSymbol = new vscode.DocumentSymbol(
                        `${msg.time.split('.')[0]}`,
                        description,
                        msg.severity >= highSeverityThreshold ? vscode.SymbolKind.Event : vscode.SymbolKind.Variable,
                        msgRange,
                        msgRange
                    );
                    
                    idSymbol.children.push(msgSymbol);
                }
                
                typeSymbol.children.push(idSymbol);
            }
            
            typeSymbols.push(typeSymbol);
        }
        
        // Sort: Diagnostic and Escape first, then by count descending
        typeSymbols.sort((a, b) => {
            const priorityA = this.getTypePriority(a.name);
            const priorityB = this.getTypePriority(b.name);
            if (priorityA !== priorityB) {
                return priorityA - priorityB;
            }
            return 0; // Keep original order otherwise
        });
        
        // Add timeline section before type symbols
        const timelineSymbol = this.createTimelineSymbol(document, messages, highSeverityThreshold);
        if (timelineSymbol) {
            symbols.push(timelineSymbol);
        }
        
        symbols.push(...typeSymbols);
        
        return symbols;
    }
    
    /**
     * Create timeline symbol with time-bucketed children
     */
    private createTimelineSymbol(
        document: vscode.TextDocument,
        messages: JobLogMessage[],
        highSeverityThreshold: number
    ): vscode.DocumentSymbol | null {
        if (messages.length === 0) {
            return null;
        }
        
        // Sort messages by timestamp to get first/last for range
        const sortedMessages = [...messages].sort((a, b) => 
            a.timestamp.getTime() - b.timestamp.getTime()
        );
        
        const firstMsg = sortedMessages[0];
        const lastMsg = sortedMessages[sortedMessages.length - 1];
        
        // Calculate duration and determine bucket size using shared utility
        const durationMs = lastMsg.timestamp.getTime() - firstMsg.timestamp.getTime();
        const { bucketSizeMs, bucketLabel } = determineBucketSize(durationMs, messages.length);
        
        // Group messages into time buckets using shared utility (pass pre-sorted to avoid redundant sort)
        const timeBuckets = groupMessagesByTimeBucket(sortedMessages, bucketSizeMs, true);
        
        // Get localized interval text for description
        const intervalText = t(`symbol.bucketInterval.${bucketLabel}` as keyof import('./i18n').LocalizedStrings);
        
        // Create timeline range
        const timelineRange = new vscode.Range(
            firstMsg.lineNumber - 1, 0,
            lastMsg.endLineNumber - 1, 0
        );
        
        const timelineSymbol = new vscode.DocumentSymbol(
            t('symbol.timeline', messages.length),
            t('symbol.timelineDesc', intervalText),
            vscode.SymbolKind.Array,
            timelineRange,
            timelineRange
        );
        
        // Convert buckets to child symbols (leaf nodes only - per-message breakdown 
        // is already available under type/messageId groups, no need to duplicate)
        for (const bucket of timeBuckets) {
            const timeStr = formatBucketTime(bucket.bucketTime);
            const stats = getBucketStats(bucket.messages, highSeverityThreshold);
            
            // Build label with flame decoration using shared utility
            const flames = getFlameDecoration(stats.highSeverityCount, stats.count);
            const label = flames 
                ? `${t('symbol.timeBucket', timeStr, stats.count)} ${flames}`
                : t('symbol.timeBucket', timeStr, stats.count);
            
            const firstBucketMsg = bucket.messages[0];
            const lastBucketMsg = bucket.messages[bucket.messages.length - 1];
            const bucketRange = new vscode.Range(
                firstBucketMsg.lineNumber - 1, 0,
                lastBucketMsg.endLineNumber - 1, 0
            );
            
            const bucketSymbol = new vscode.DocumentSymbol(
                label,
                stats.maxSeverity > 0 ? `SEV ${stats.maxSeverity}` : '',
                stats.highSeverityCount > 0 ? vscode.SymbolKind.Event : vscode.SymbolKind.Variable,
                bucketRange,
                bucketRange
            );
            
            timelineSymbol.children.push(bucketSymbol);
        }
        
        return timelineSymbol;
    }
    
    /**
     * Get VS Code symbol kind for a message type
     */
    private getSymbolKindForType(type: string): vscode.SymbolKind {
        switch (type) {
            case 'Escape':
                return vscode.SymbolKind.Event;
            case 'Diagnostic':
                return vscode.SymbolKind.Event;
            case 'Information':
                return vscode.SymbolKind.Property;
            case 'Completion':
                return vscode.SymbolKind.Method;
            case 'Command':
                return vscode.SymbolKind.Function;
            case 'Request':
                return vscode.SymbolKind.Interface;
            case 'Inquiry':
                return vscode.SymbolKind.Enum;
            case 'Reply':
                return vscode.SymbolKind.EnumMember;
            case 'Notify':
                return vscode.SymbolKind.Struct;
            case 'Sender Copy':
                return vscode.SymbolKind.TypeParameter;
            default:
                return vscode.SymbolKind.Variable;
        }
    }
    
    /**
     * Get priority for sorting types (lower = higher priority)
     */
    private getTypePriority(typeName: string): number {
        if (typeName.startsWith('Escape')) {return 1;}
        if (typeName.startsWith('Diagnostic')) {return 2;}
        if (typeName.startsWith('Information')) {return 3;}
        if (typeName.startsWith('Inquiry')) {return 4;}
        if (typeName.startsWith('Notify')) {return 5;}
        if (typeName.startsWith('Completion')) {return 6;}
        if (typeName.startsWith('Reply')) {return 7;}
        if (typeName.startsWith('Request')) {return 8;}
        if (typeName.startsWith('Command')) {return 9;}
        return 10;
    }
}
