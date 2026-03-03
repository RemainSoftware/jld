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

// DocumentSymbolProvider for Job Log Analyzer - provides Outline view integration

import * as vscode from 'vscode';
import { ParsedJobLog, JobLogMessage } from './types';
import { parseJobLog, groupMessages } from './joblogParser';

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
        
        const config = vscode.workspace.getConfiguration('joblogAnalyzer');
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
                `Job: ${parsed.header.jobNumber}/${parsed.header.user}/${parsed.header.jobName}`,
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
            `Summary`,
            `${messages.length} messages, ${parsed.stats.highSeverityCount} high severity`,
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
                `${msgs.length} messages${highSev > 0 ? ` (${highSev} high severity)` : ''}`,
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
            if (msgs.length === 0) continue;
            
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
                if (idMsgs.length === 0) continue;
                
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
                        : `Line ${msg.lineNumber}`;
                    
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
        
        symbols.push(...typeSymbols);
        
        return symbols;
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
        if (typeName.startsWith('Escape')) return 1;
        if (typeName.startsWith('Diagnostic')) return 2;
        if (typeName.startsWith('Information')) return 3;
        if (typeName.startsWith('Inquiry')) return 4;
        if (typeName.startsWith('Notify')) return 5;
        if (typeName.startsWith('Completion')) return 6;
        if (typeName.startsWith('Reply')) return 7;
        if (typeName.startsWith('Request')) return 8;
        if (typeName.startsWith('Command')) return 9;
        return 10;
    }
}
