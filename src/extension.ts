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

// Job Log Analyzer - VS Code Extension Entry Point

import * as vscode from 'vscode';
import { detectJobLog } from './joblogParser';
import { JobLogDocumentSymbolProvider } from './documentSymbolProvider';
import { JobLogTreeDataProvider } from './joblogTreeProvider';
import { JobLogMessage } from './types';

let documentSymbolProvider: JobLogDocumentSymbolProvider;
let treeDataProvider: JobLogTreeDataProvider;

/**
 * Activate the extension
 */
export function activate(context: vscode.ExtensionContext) {
    console.log('Job Log Analyzer is now active');
    
    // Create providers
    documentSymbolProvider = new JobLogDocumentSymbolProvider();
    treeDataProvider = new JobLogTreeDataProvider();
    
    // Register document symbol provider for outline view
    const symbolProviderDisposable = vscode.languages.registerDocumentSymbolProvider(
        { language: 'joblog' },
        documentSymbolProvider
    );
    context.subscriptions.push(symbolProviderDisposable);
    
    // Also register for plaintext files that are job logs
    const plainTextSymbolProvider = vscode.languages.registerDocumentSymbolProvider(
        { language: 'plaintext' },
        documentSymbolProvider
    );
    context.subscriptions.push(plainTextSymbolProvider);
    
    // Register tree view
    const treeView = vscode.window.createTreeView('joblogAnalyzer', {
        treeDataProvider,
        showCollapseAll: true
    });
    context.subscriptions.push(treeView);
    
    // Register commands
    registerCommands(context, treeDataProvider);
    
    // Set up document detection
    setupDocumentDetection(context, treeDataProvider);
    
    // Check if current document is a job log
    if (vscode.window.activeTextEditor) {
        checkAndSetJobLog(vscode.window.activeTextEditor.document, treeDataProvider);
    }
}

/**
 * Register all commands
 */
function registerCommands(
    context: vscode.ExtensionContext,
    treeDataProvider: JobLogTreeDataProvider
): void {
    // Analyze command
    context.subscriptions.push(
        vscode.commands.registerCommand('joblogAnalyzer.analyze', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showWarningMessage('No active editor');
                return;
            }
            await setDocumentAsJobLog(editor.document, treeDataProvider);
        })
    );
    
    // Set as job log command
    context.subscriptions.push(
        vscode.commands.registerCommand('joblogAnalyzer.setAsJobLog', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showWarningMessage('No active editor');
                return;
            }
            await setDocumentAsJobLog(editor.document, treeDataProvider);
        })
    );
    
    // Refresh command
    context.subscriptions.push(
        vscode.commands.registerCommand('joblogAnalyzer.refresh', () => {
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                treeDataProvider.setDocument(editor.document);
                documentSymbolProvider.clearCache(editor.document.uri);
            }
            treeDataProvider.refresh();
        })
    );
    
    // Go to message command
    context.subscriptions.push(
        vscode.commands.registerCommand('joblogAnalyzer.goToMessage', async (message: JobLogMessage) => {
            if (!message) {
                return;
            }
            
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                return;
            }
            
            // Go to the line
            const line = message.lineNumber - 1;
            const range = new vscode.Range(line, 0, message.endLineNumber - 1, 0);
            
            editor.selection = new vscode.Selection(range.start, range.start);
            editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
            
            // Highlight the message block
            const decorationType = vscode.window.createTextEditorDecorationType({
                backgroundColor: new vscode.ThemeColor('editor.findMatchHighlightBackground'),
                isWholeLine: true
            });
            
            editor.setDecorations(decorationType, [range]);
            
            // Remove decoration after 2 seconds
            setTimeout(() => {
                decorationType.dispose();
            }, 2000);
            
            // Show message details in information message
            if (message.messageText || message.cause) {
                const detail = [
                    message.messageText,
                    message.cause ? `Cause: ${message.cause}` : undefined,
                    message.recovery ? `Recovery: ${message.recovery}` : undefined
                ].filter(Boolean).join('\n\n');
                
                vscode.window.showInformationMessage(
                    `${message.messageId} (SEV ${message.severity})`,
                    { modal: false, detail }
                );
            }
        })
    );
    
    // Filter by type command
    context.subscriptions.push(
        vscode.commands.registerCommand('joblogAnalyzer.filterByType', async () => {
            const types = [
                'Escape',
                'Diagnostic',
                'Information',
                'Completion',
                'Command',
                'Request',
                'Inquiry',
                'Reply',
                'Notify',
                'Sender Copy'
            ];
            
            const selected = await vscode.window.showQuickPick(types, {
                placeHolder: 'Select message type to filter',
                canPickMany: true
            });
            
            if (selected) {
                treeDataProvider.clearTypeFilters();
                for (const type of selected) {
                    treeDataProvider.toggleTypeFilter(type);
                }
            }
        })
    );
    
    // Show high severity only command
    context.subscriptions.push(
        vscode.commands.registerCommand('joblogAnalyzer.showHighSeverity', () => {
            treeDataProvider.toggleHighSeverityOnly();
        })
    );
    
    // Filter by message ID pattern command
    context.subscriptions.push(
        vscode.commands.registerCommand('joblogAnalyzer.filterByMessageId', async () => {
            const currentPattern = treeDataProvider.getMessageIdPattern();
            const pattern = await vscode.window.showInputBox({
                prompt: 'Enter message ID pattern (e.g., SQL*, CPF*, *0001)',
                placeHolder: 'SQL*, CPF*, *ERROR*',
                value: currentPattern,
                validateInput: (value) => {
                    // Allow empty to clear filter
                    if (!value) {return null;}
                    // Basic validation - alphanumeric with * and ?
                    if (!/^[\w*?]+$/.test(value)) {
                        return 'Pattern should only contain letters, numbers, * (any chars) and ? (single char)';
                    }
                    return null;
                }
            });
            
            if (pattern !== undefined) {
                treeDataProvider.setMessageIdPattern(pattern);
            }
        })
    );
    
    // Clear all filters command
    context.subscriptions.push(
        vscode.commands.registerCommand('joblogAnalyzer.clearFilters', () => {
            treeDataProvider.clearAllFilters();
        })
    );
    
    // Open filter menu (combines all filter options)
    context.subscriptions.push(
        vscode.commands.registerCommand('joblogAnalyzer.openFilterMenu', async () => {
            const options = [
                { label: '$(filter) Filter by Message Type...', command: 'joblogAnalyzer.filterByType' },
                { label: '$(search) Filter by Message ID Pattern...', command: 'joblogAnalyzer.filterByMessageId' },
                { label: '$(warning) Show High Severity Only', command: 'joblogAnalyzer.showHighSeverity' },
                { label: '$(clear-all) Clear All Filters', command: 'joblogAnalyzer.clearFilters' }
            ];
            
            const selected = await vscode.window.showQuickPick(options, {
                placeHolder: 'Select filter option'
            });
            
            if (selected) {
                vscode.commands.executeCommand(selected.command);
            }
        })
    );
}

/**
 * Set up document change detection
 */
function setupDocumentDetection(
    context: vscode.ExtensionContext,
    treeDataProvider: JobLogTreeDataProvider
): void {
    // Listen for active editor changes
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(editor => {
            if (editor) {
                checkAndSetJobLog(editor.document, treeDataProvider);
            } else {
                vscode.commands.executeCommand('setContext', 'joblogAnalyzer.isJobLog', false);
                treeDataProvider.setDocument(undefined);
            }
        })
    );
    
    // Listen for document changes
    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(event => {
            const editor = vscode.window.activeTextEditor;
            if (editor && event.document === editor.document) {
                // Debounce the refresh
                setTimeout(() => {
                    if (isJobLogDocument(event.document)) {
                        documentSymbolProvider.clearCache(event.document.uri);
                        treeDataProvider.setDocument(event.document);
                    }
                }, 500);
            }
        })
    );
    
    // Listen for document open
    context.subscriptions.push(
        vscode.workspace.onDidOpenTextDocument(document => {
            if (vscode.window.activeTextEditor?.document === document) {
                checkAndSetJobLog(document, treeDataProvider);
            }
        })
    );
}

/**
 * Check if a document is a job log and set up analysis if so
 */
function checkAndSetJobLog(
    document: vscode.TextDocument,
    treeDataProvider: JobLogTreeDataProvider
): void {
    const config = vscode.workspace.getConfiguration('joblogAnalyzer');
    const autoDetect = config.get<boolean>('autoDetect', true);
    
    // Check if it's already marked as joblog language
    if (document.languageId === 'joblog') {
        setDocumentAsJobLog(document, treeDataProvider);
        return;
    }
    
    // Check filename patterns
    const fileName = document.fileName.toUpperCase();
    if (fileName.includes('QPJOBLOG') || fileName.endsWith('.JOBLOG')) {
        setDocumentAsJobLog(document, treeDataProvider);
        return;
    }
    
    // Auto-detect by content
    if (autoDetect) {
        const detection = detectJobLog(document.getText());
        if (detection.isJobLog && detection.confidence !== 'low') {
            setDocumentAsJobLog(document, treeDataProvider);
            return;
        }
    }
    
    // Not a job log
    vscode.commands.executeCommand('setContext', 'joblogAnalyzer.isJobLog', false);
    treeDataProvider.setDocument(undefined);
}

/**
 * Set a document as a job log and enable analysis
 */
async function setDocumentAsJobLog(
    document: vscode.TextDocument,
    treeDataProvider: JobLogTreeDataProvider
): Promise<void> {
    // Set the language if not already set
    if (document.languageId !== 'joblog') {
        await vscode.languages.setTextDocumentLanguage(document, 'joblog');
    }
    
    // Set context for conditional UI
    vscode.commands.executeCommand('setContext', 'joblogAnalyzer.isJobLog', true);
    
    // Update tree view
    treeDataProvider.setDocument(document);
    
    // Show parsing stats
    const parsed = treeDataProvider.getParsedLog();
    if (parsed && parsed.isValid) {
        const escapeMsgs = parsed.stats.escapeCount;
        const diagMsgs = parsed.stats.diagnosticCount;
        const highSev = parsed.stats.highSeverityCount;
        
        vscode.window.setStatusBarMessage(
            `Job Log: ${parsed.messages.length} messages, ${highSev} high severity, parsed in ${parsed.parseTime}ms`,
            5000
        );
        
        // Check for abnormal job ending
        const jobEnded = parsed.completion?.completed;
        const jobFailed = parsed.completion && !parsed.completion.success;
        
        // Show warning if there are errors or job ended abnormally
        if (escapeMsgs > 0 || diagMsgs > 0 || jobFailed) {
            let message = `Job Log Analysis: Found ${escapeMsgs} Escape and ${diagMsgs} Diagnostic messages`;
            if (jobFailed) {
                message = `⚠️ Job Ended Abnormally (End Code ${parsed.completion!.endCode}). ${message}`;
            }
            
            vscode.window.showWarningMessage(
                message,
                'Show Job Log'
            ).then(selection => {
                if (selection === 'Show Job Log') {
                    // Clear any filters and show all messages
                    treeDataProvider.clearAllFilters();
                    // Reveal the Job Log Analyzer view
                    vscode.commands.executeCommand('joblogAnalyzer.focus');
                }
            });
        }
    }
}

/**
 * Check if a document is a job log
 */
function isJobLogDocument(document: vscode.TextDocument): boolean {
    if (document.languageId === 'joblog') {
        return true;
    }
    
    const fileName = document.fileName.toUpperCase();
    if (fileName.includes('QPJOBLOG') || fileName.endsWith('.JOBLOG')) {
        return true;
    }
    
    return false;
}

/**
 * Deactivate the extension
 */
export function deactivate() {
    console.log('Job Log Analyzer deactivated');
}
