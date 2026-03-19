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

// Editor Decoration Provider for Job Log Detective
// Provides visual decorations (gutter icons, background highlighting, minimap markers)
// for job log messages in the editor

import * as vscode from 'vscode';
import * as path from 'path';
import { JobLogMessage } from './types';

/**
 * Decoration severity levels based on message type and severity
 */
export type DecorationLevel = 'escape' | 'highSeverity' | 'lowSeverity';

/**
 * Editor decoration provider for job log messages
 */
export class EditorDecorationProvider {
    private escapeDecorationType: vscode.TextEditorDecorationType;
    private highSeverityDecorationType: vscode.TextEditorDecorationType;
    private lowSeverityDecorationType: vscode.TextEditorDecorationType;
    private enabled: boolean = true;
    private extensionPath: string;
    private currentEditor: vscode.TextEditor | undefined;

    constructor(extensionPath: string) {
        this.extensionPath = extensionPath;
        
        // Create decoration types with flame icons
        this.escapeDecorationType = this.createDecorationType('escape');
        this.highSeverityDecorationType = this.createDecorationType('highSeverity');
        this.lowSeverityDecorationType = this.createDecorationType('lowSeverity');
        
        // Load enabled state from config
        this.loadConfig();
        
        // Listen to configuration changes
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('joblogDetective.enableEditorDecorations')) {
                this.loadConfig();
            }
        });
    }

    private loadConfig(): void {
        const config = vscode.workspace.getConfiguration('joblogDetective');
        this.enabled = config.get<boolean>('enableEditorDecorations', true);
    }

    /**
     * Create a decoration type for a specific level
     */
    private createDecorationType(level: DecorationLevel): vscode.TextEditorDecorationType {
        const iconFile = this.getIconFile(level);
        const colors = this.getColors(level);
        
        return vscode.window.createTextEditorDecorationType({
            gutterIconPath: path.join(this.extensionPath, 'images', iconFile),
            gutterIconSize: 'contain',
            backgroundColor: colors.background,
            overviewRulerColor: colors.ruler,
            overviewRulerLane: vscode.OverviewRulerLane.Right,
            isWholeLine: true,
            // Light theme overrides
            light: {
                backgroundColor: colors.backgroundLight
            }
        });
    }

    /**
     * Get icon file for decoration level
     */
    private getIconFile(level: DecorationLevel): string {
        switch (level) {
            case 'escape':
                return 'flame-red.svg';
            case 'highSeverity':
                return 'flame-orange.svg';
            case 'lowSeverity':
                return 'flame-yellow.svg';
        }
    }

    /**
     * Get colors for decoration level
     * Using higher opacity for better visibility in minimap
     */
    private getColors(level: DecorationLevel): { 
        background: string; 
        backgroundLight: string;
        ruler: string;
    } {
        switch (level) {
            case 'escape':
                return {
                    background: 'rgba(255, 0, 0, 0.25)',
                    backgroundLight: 'rgba(255, 0, 0, 0.20)',
                    ruler: 'rgba(255, 0, 0, 0.9)'
                };
            case 'highSeverity':
                return {
                    background: 'rgba(255, 140, 0, 0.25)',
                    backgroundLight: 'rgba(255, 140, 0, 0.20)',
                    ruler: 'rgba(255, 140, 0, 0.9)'
                };
            case 'lowSeverity':
                return {
                    background: 'rgba(255, 200, 0, 0.20)',
                    backgroundLight: 'rgba(255, 200, 0, 0.15)',
                    ruler: 'rgba(255, 200, 0, 0.8)'
                };
        }
    }

    /**
     * Classify a message into a decoration level
     * Returns null if the message should not be decorated
     */
    private classifyMessage(message: JobLogMessage, highSeverityThreshold: number): DecorationLevel | null {
        // Escape messages are always highest priority (red)
        if (message.type === 'Escape') {
            return 'escape';
        }
        
        // High severity (orange) - any message with severity >= threshold
        if (message.severity >= highSeverityThreshold) {
            return 'highSeverity';
        }
        
        // Diagnostic messages (yellow) - but only if severity > 0
        if (message.type === 'Diagnostic' && message.severity > 0) {
            return 'lowSeverity';
        }
        
        // Don't decorate other messages (Information, Completion, Command, etc. with low severity)
        return null;
    }

    /**
     * Update decorations for the given editor with filtered messages
     */
    public updateDecorations(
        editor: vscode.TextEditor | undefined,
        messages: JobLogMessage[],
        highSeverityThreshold: number = 30
    ): void {
        this.currentEditor = editor;
        
        if (!editor || !this.enabled) {
            this.clearDecorations(editor);
            return;
        }

        // Group messages by decoration level
        const escapeRanges: vscode.DecorationOptions[] = [];
        const highSeverityRanges: vscode.DecorationOptions[] = [];
        const lowSeverityRanges: vscode.DecorationOptions[] = [];

        for (const message of messages) {
            const level = this.classifyMessage(message, highSeverityThreshold);
            
            // Skip messages that don't need decoration
            if (level === null) {
                continue;
            }
            
            // Decorate the entire message block (from lineNumber to endLineNumber)
            const range = new vscode.Range(
                message.lineNumber - 1, 0,
                message.endLineNumber - 1, 0
            );
            
            const decoration: vscode.DecorationOptions = {
                range,
                hoverMessage: this.createHoverMessage(message)
            };

            switch (level) {
                case 'escape':
                    escapeRanges.push(decoration);
                    break;
                case 'highSeverity':
                    highSeverityRanges.push(decoration);
                    break;
                case 'lowSeverity':
                    lowSeverityRanges.push(decoration);
                    break;
            }
        }

        // Apply decorations
        editor.setDecorations(this.escapeDecorationType, escapeRanges);
        editor.setDecorations(this.highSeverityDecorationType, highSeverityRanges);
        editor.setDecorations(this.lowSeverityDecorationType, lowSeverityRanges);
    }

    /**
     * Create hover message for a decoration
     */
    private createHoverMessage(message: JobLogMessage): vscode.MarkdownString {
        const md = new vscode.MarkdownString();
        md.appendMarkdown(`**${message.messageId}** - ${message.type} (Severity: ${message.severity})\n\n`);
        
        if (message.messageText) {
            md.appendMarkdown(`${message.messageText}\n\n`);
        }
        
        if (message.from.program) {
            md.appendMarkdown(`*From:* ${message.from.program}`);
            if (message.from.procedure) {
                md.appendMarkdown(` → ${message.from.procedure}`);
            }
            md.appendMarkdown('\n');
        }
        
        return md;
    }

    /**
     * Clear all decorations from an editor
     */
    public clearDecorations(editor: vscode.TextEditor | undefined): void {
        if (!editor) {
            return;
        }
        editor.setDecorations(this.escapeDecorationType, []);
        editor.setDecorations(this.highSeverityDecorationType, []);
        editor.setDecorations(this.lowSeverityDecorationType, []);
    }

    /**
     * Toggle decorations on/off
     */
    public toggle(): boolean {
        this.enabled = !this.enabled;
        return this.enabled;
    }

    /**
     * Check if decorations are enabled
     */
    public isEnabled(): boolean {
        return this.enabled;
    }

    /**
     * Set enabled state
     */
    public setEnabled(enabled: boolean): void {
        this.enabled = enabled;
    }

    /**
     * Dispose of decoration types
     */
    public dispose(): void {
        this.escapeDecorationType.dispose();
        this.highSeverityDecorationType.dispose();
        this.lowSeverityDecorationType.dispose();
    }
}
