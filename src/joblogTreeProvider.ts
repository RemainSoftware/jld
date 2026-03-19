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

// TreeDataProvider for Job Log Detective - provides custom tree view

import * as vscode from 'vscode';
import { ParsedJobLog, JobLogMessage, JobLogStats, TreeItemData, JobCompletionStatus } from './types';
import { parseJobLog, groupMessages, filterMessages, getHighPriorityMessages } from './joblogParser';
import { t } from './i18n';
import { getFlameDecoration, determineBucketSize, groupMessagesByTimeBucket, formatBucketTime, getBucketStats } from './timelineUtils';

/**
 * Page size for paginating large message groups
 */
const PAGE_SIZE = 100;

/**
 * Tree item for the Job Log Detective view
 */
export class JobLogTreeItem extends vscode.TreeItem {
    constructor(
        public readonly data: TreeItemData,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly message?: JobLogMessage
    ) {
        super(data.label, collapsibleState);
        this.description = data.description;
        this.tooltip = this.createTooltip();
        this.contextValue = data.type;
        
        if (message) {
            this.command = {
                command: 'joblogDetective.goToMessage',
                title: t('tree.goToMessage'),
                arguments: [message]
            };
        }
        
        this.iconPath = this.getIcon();
    }
    
    private createTooltip(): vscode.MarkdownString | string {
        if (!this.message) {
            return this.data.label;
        }
        
        const md = new vscode.MarkdownString();
        md.appendMarkdown(`**${this.message.messageId}** - ${this.message.type}\n\n`);
        md.appendMarkdown(`**${t('tooltip.severity')}:** ${this.message.severity}\n\n`);
        md.appendMarkdown(`**${t('tooltip.time')}:** ${this.message.date} ${this.message.time}\n\n`);
        
        if (this.message.from.program) {
            md.appendMarkdown(`**${t('tooltip.from')}:** ${this.message.from.program}`);
            if (this.message.from.library) {
                md.appendMarkdown(` (${this.message.from.library})`);
            }
            if (this.message.from.procedure) {
                md.appendMarkdown(` - ${this.message.from.procedure}`);
            }
            md.appendMarkdown('\n\n');
        }
        
        if (this.message.to.program) {
            md.appendMarkdown(`**${t('tooltip.to')}:** ${this.message.to.program}`);
            if (this.message.to.library) {
                md.appendMarkdown(` (${this.message.to.library})`);
            }
            if (this.message.to.procedure) {
                md.appendMarkdown(` - ${this.message.to.procedure}`);
            }
            md.appendMarkdown('\n\n');
        }
        
        if (this.message.messageText) {
            md.appendMarkdown(`**${t('tooltip.message')}:**\n${this.message.messageText}\n\n`);
        }
        
        if (this.message.cause) {
            md.appendMarkdown(`**${t('tooltip.cause')}:**\n${this.message.cause}\n\n`);
        }
        
        if (this.message.recovery) {
            md.appendMarkdown(`**${t('tooltip.recovery')}:**\n${this.message.recovery}\n\n`);
        }
        
        return md;
    }
    
    private getIcon(): vscode.ThemeIcon {
        // Custom icon from data
        if (this.data.icon) {
            let color: vscode.ThemeColor | undefined;
            if (this.data.iconColor === 'error') {
                color = new vscode.ThemeColor('errorForeground');
            } else if (this.data.iconColor === 'warning') {
                color = new vscode.ThemeColor('editorWarning.foreground');
            } else if (this.data.iconColor === 'success') {
                color = new vscode.ThemeColor('charts.green');
            }
            return new vscode.ThemeIcon(this.data.icon, color);
        }
        
        if (this.data.type === 'root') {
            return new vscode.ThemeIcon('file');
        }
        
        if (this.data.type === 'category') {
            const typeName = this.data.label.split(' ')[0];
            switch (typeName) {
                case 'Escape':
                    return new vscode.ThemeIcon('error', new vscode.ThemeColor('errorForeground'));
                case 'Diagnostic':
                    return new vscode.ThemeIcon('warning', new vscode.ThemeColor('editorWarning.foreground'));
                case 'Information':
                    return new vscode.ThemeIcon('info');
                case 'Completion':
                    return new vscode.ThemeIcon('check');
                case 'Command':
                    return new vscode.ThemeIcon('terminal');
                case 'Request':
                    return new vscode.ThemeIcon('arrow-right');
                case 'Inquiry':
                    return new vscode.ThemeIcon('question');
                case 'Reply':
                    return new vscode.ThemeIcon('reply');
                case 'Notify':
                    return new vscode.ThemeIcon('bell');
                case 'High':
                    return new vscode.ThemeIcon('flame', new vscode.ThemeColor('errorForeground'));
                case 'Summary':
                    return new vscode.ThemeIcon('graph');
                default:
                    return new vscode.ThemeIcon('symbol-event');
            }
        }
        
        if (this.data.type === 'messageGroup') {
            if (this.data.severity !== undefined && this.data.severity >= 30) {
                return new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor('errorForeground'));
            }
            return new vscode.ThemeIcon('symbol-constant');
        }
        
        if (this.data.type === 'page') {
            // Check if this page has high severity messages (for timeline pagination)
            const highSevCount = this.data.count || 0;
            if (highSevCount > 0) {
                return new vscode.ThemeIcon('flame', new vscode.ThemeColor('editorWarning.foreground'));
            }
            return new vscode.ThemeIcon('list-flat');
        }
        
        if (this.data.type === 'timeline') {
            return new vscode.ThemeIcon('history');
        }
        
        if (this.data.type === 'timeBucket') {
            // Icon reflects high severity count in this bucket
            const highSevCount = this.data.count || 0;
            if (highSevCount > 0) {
                return new vscode.ThemeIcon('flame', new vscode.ThemeColor('editorWarning.foreground'));
            }
            return new vscode.ThemeIcon('clock');
        }
        
        if (this.data.type === 'message' && this.message) {
            const severity = this.message.severity;
            if (severity >= 40) {
                return new vscode.ThemeIcon('error', new vscode.ThemeColor('errorForeground'));
            }
            if (severity >= 30) {
                return new vscode.ThemeIcon('warning', new vscode.ThemeColor('editorWarning.foreground'));
            }
            if (severity >= 20) {
                return new vscode.ThemeIcon('info');
            }
            return new vscode.ThemeIcon('circle-outline');
        }
        
        return new vscode.ThemeIcon('symbol-event');
    }
}

/**
 * Tree data provider for the Job Log Detective view
 */
export class JobLogTreeDataProvider implements vscode.TreeDataProvider<JobLogTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<JobLogTreeItem | undefined | null | void> = new vscode.EventEmitter<JobLogTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<JobLogTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;
    
    private parsedLog: ParsedJobLog | undefined;
    private document: vscode.TextDocument | undefined;
    private hideCommand: boolean = true;
    private minSeverity: number = 0;
    private filterTypes: Set<string> = new Set();
    private showHighSeverityOnly: boolean = false;
    private messageIdPattern: string = '';
    private contentPattern: string = '';
    
    constructor() {
        // Listen to configuration changes
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('joblogDetective')) {
                this.loadConfig();
                this.refresh();
            }
        });
        
        this.loadConfig();
    }
    
    private loadConfig(): void {
        const config = vscode.workspace.getConfiguration('joblogDetective');
        this.hideCommand = config.get<boolean>('hideCommandMessages', true);
    }
    
    /**
     * Set the document to analyze
     */
    public setDocument(document: vscode.TextDocument | undefined): void {
        this.document = document;
        if (document) {
            const config = vscode.workspace.getConfiguration('joblogDetective');
            const threshold = config.get<number>('highSeverityThreshold', 30);
            this.parsedLog = parseJobLog(document.getText(), threshold);
        } else {
            this.parsedLog = undefined;
        }
        this.refresh();
    }
    
    /**
     * Get the current parsed log
     */
    public getParsedLog(): ParsedJobLog | undefined {
        return this.parsedLog;
    }
    
    /**
     * Refresh the tree view
     */
    public refresh(): void {
        this._onDidChangeTreeData.fire();
    }
    
    /**
     * Toggle hiding command messages
     */
    public toggleHideCommand(): void {
        this.hideCommand = !this.hideCommand;
        this.refresh();
    }
    
    /**
     * Check if command messages are hidden
     */
    public isCommandHidden(): boolean {
        return this.hideCommand;
    }
    
    /**
     * Set minimum severity filter
     */
    public setMinSeverity(severity: number): void {
        this.minSeverity = severity;
        this.refresh();
    }
    
    /**
     * Toggle filter by message type
     */
    public toggleTypeFilter(type: string): void {
        if (this.filterTypes.has(type)) {
            this.filterTypes.delete(type);
        } else {
            this.filterTypes.add(type);
        }
        this.refresh();
    }
    
    /**
     * Clear all type filters
     */
    public clearTypeFilters(): void {
        this.filterTypes.clear();
        this.refresh();
    }
    
    /**
     * Toggle showing only high severity messages
     */
    public toggleHighSeverityOnly(): void {
        this.showHighSeverityOnly = !this.showHighSeverityOnly;
        this.refresh();
    }
    
    /**
     * Set message ID filter pattern
     * Supports glob-like patterns: SQL*, CPF*, etc.
     */
    public setMessageIdPattern(pattern: string): void {
        this.messageIdPattern = pattern;
        this.refresh();
    }
    
    /**
     * Get current message ID pattern
     */
    public getMessageIdPattern(): string {
        return this.messageIdPattern;
    }
    
    /**
     * Set content filter pattern
     * Searches in message text, cause, recovery, and program/procedure names
     * Supports glob-like patterns: MYPGM*, *error*, etc.
     */
    public setContentPattern(pattern: string): void {
        this.contentPattern = pattern;
        this.refresh();
    }
    
    /**
     * Get current content pattern
     */
    public getContentPattern(): string {
        return this.contentPattern;
    }
    
    /**
     * Clear all filters
     */
    public clearAllFilters(): void {
        this.filterTypes.clear();
        this.messageIdPattern = '';
        this.contentPattern = '';
        this.showHighSeverityOnly = false;
        this.minSeverity = 0;
        this.refresh();
    }
    
    /**
     * Get the currently filtered messages based on active filters
     * Used by the decoration provider to show decorations only for filtered messages
     */
    public getFilteredMessages(): JobLogMessage[] {
        if (!this.parsedLog) {
            return [];
        }
        
        const config = vscode.workspace.getConfiguration('joblogDetective');
        const highSeverityThreshold = config.get<number>('highSeverityThreshold', 30);
        
        return filterMessages(this.parsedLog.messages, {
            hideCommand: this.hideCommand,
            minSeverity: this.showHighSeverityOnly ? highSeverityThreshold : this.minSeverity,
            types: this.filterTypes.size > 0 ? this.filterTypes : undefined,
            messageIdPattern: this.messageIdPattern || undefined,
            contentPattern: this.contentPattern || undefined
        });
    }
    
    /**
     * Get current filter summary
     * Only shows active filters that actually affect the results
     */
    public getFilterSummary(): string {
        const filters: string[] = [];
        
        // Only show "Command hidden" if there are actually Command messages to hide
        if (this.hideCommand && this.parsedLog) {
            const commandCount = this.parsedLog.stats.byType.get('Command') || 0;
            if (commandCount > 0) {
                filters.push(t('filter.commandHidden'));
            }
        }
        if (this.filterTypes.size > 0) {
            filters.push(`${t('filter.types')}: ${Array.from(this.filterTypes).join(', ')}`);
        }
        if (this.messageIdPattern) {
            filters.push(`${t('filter.id')}: ${this.messageIdPattern}`);
        }
        if (this.contentPattern) {
            filters.push(`${t('filter.content')}: ${this.contentPattern}`);
        }
        if (this.showHighSeverityOnly) {
            filters.push(t('filter.highSeverityOnly'));
        }
        if (this.minSeverity > 0) {
            filters.push(`${t('filter.minSeverity')}: ${this.minSeverity}`);
        }
        return filters.length > 0 ? filters.join('; ') : t('filter.noFilters');
    }
    
    /**
     * Get tree item for an element
     */
    getTreeItem(element: JobLogTreeItem): vscode.TreeItem {
        return element;
    }
    
    /**
     * Get children of an element
     */
    getChildren(element?: JobLogTreeItem): Thenable<JobLogTreeItem[]> {
        if (!this.parsedLog || !this.parsedLog.isValid) {
            return Promise.resolve([]);
        }
        
        if (!element) {
            return Promise.resolve(this.getRootItems());
        }
        
        // Handle pagination: if element has messages array, create children on demand
        if (element.data.messages && element.data.messages.length > 0) {
            const pageStart = element.data.pageStart ?? 0;
            const pageSize = element.data.pageSize ?? PAGE_SIZE;
            const pageMessages = element.data.messages.slice(pageStart, pageStart + pageSize);
            
            return Promise.resolve(
                pageMessages.map(msg => {
                    const data = this.createMessageData(msg);
                    return new JobLogTreeItem(data, vscode.TreeItemCollapsibleState.None, msg);
                })
            );
        }
        
        if (element.data.children) {
            return Promise.resolve(
                element.data.children.map(child => {
                    // Determine collapsible state based on type and content
                    let state = vscode.TreeItemCollapsibleState.None;
                    if (child.children && child.children.length > 0) {
                        state = vscode.TreeItemCollapsibleState.Collapsed;
                    } else if (child.type === 'page' && child.messages && child.messages.length > 0) {
                        state = vscode.TreeItemCollapsibleState.Collapsed;
                    }
                    return new JobLogTreeItem(child, state, child.message);
                })
            );
        }
        
        return Promise.resolve([]);
    }
    
    /**
     * Get root-level items for the tree
     */
    private getRootItems(): JobLogTreeItem[] {
        if (!this.parsedLog) {
            return [];
        }
        
        const items: JobLogTreeItem[] = [];
        const config = vscode.workspace.getConfiguration('joblogDetective');
        const highSeverityThreshold = config.get<number>('highSeverityThreshold', 30);
        
        // Apply all filters using filterMessages
        const messages = filterMessages(this.parsedLog.messages, {
            hideCommand: this.hideCommand,
            minSeverity: this.showHighSeverityOnly ? highSeverityThreshold : this.minSeverity,
            types: this.filterTypes.size > 0 ? this.filterTypes : undefined,
            messageIdPattern: this.messageIdPattern || undefined,
            contentPattern: this.contentPattern || undefined
        });
        
        // Add summary item
        const filterSummary = this.getFilterSummary();
        const summaryDesc = `${messages.length} of ${this.parsedLog.messages.length} | ${filterSummary}`;
        const summaryData: TreeItemData = {
            type: 'category',
            label: t('tree.summary'),
            description: summaryDesc,
            children: this.createStatsChildren(this.parsedLog.stats, this.parsedLog.completion)
        };
        items.push(new JobLogTreeItem(summaryData, vscode.TreeItemCollapsibleState.Expanded));
        
        // Add high priority messages section
        const highPriority = getHighPriorityMessages(messages, { highSeverityThreshold });
        if (highPriority.length > 0) {
            const highPriorityData: TreeItemData = {
                type: 'category',
                label: t('tree.highPriority', highPriority.length),
                description: t('tree.recentHighSeverity'),
                children: this.createPaginatedChildren(highPriority)
            };
            items.push(new JobLogTreeItem(highPriorityData, vscode.TreeItemCollapsibleState.Expanded));
        }
        
        // Add timeline section - all filtered messages in chronological order
        if (messages.length > 0) {
            // Calculate bucket interval for description (O(n) min/max scan, not sort)
            let minTime = messages[0].timestamp.getTime();
            let maxTime = minTime;
            for (const msg of messages) {
                const time = msg.timestamp.getTime();
                if (time < minTime) {minTime = time;}
                if (time > maxTime) {maxTime = time;}
            }
            const { bucketLabel } = determineBucketSize(maxTime - minTime, messages.length);
            const intervalText = t(`tree.bucketInterval.${bucketLabel}` as keyof import('./i18n').LocalizedStrings);
            
            const timelineChildren = this.createTimelineChildren(messages);
            const timelineData: TreeItemData = {
                type: 'timeline',
                label: t('tree.timeline', messages.length),
                description: t('tree.timelineDesc', intervalText),
                icon: 'history',
                children: timelineChildren
            };
            items.push(new JobLogTreeItem(timelineData, vscode.TreeItemCollapsibleState.Collapsed));
        }
        
        // Group by type
        const typeGroups = groupMessages(messages, m => m.type);
        
        // Sort types by priority
        const sortedTypes = Array.from(typeGroups.keys()).sort((a, b) => {
            return this.getTypePriority(a) - this.getTypePriority(b);
        });
        
        for (const type of sortedTypes) {
            const typeMessages = typeGroups.get(type) || [];
            if (typeMessages.length === 0) {continue;}
            
            // Group by message ID
            const idGroups = groupMessages(typeMessages, m => m.messageId);
            const children: TreeItemData[] = [];
            
            // Sort message IDs by count descending
            const sortedIds = Array.from(idGroups.keys()).sort((a, b) => {
                const countA = idGroups.get(a)?.length || 0;
                const countB = idGroups.get(b)?.length || 0;
                return countB - countA;
            });
            
            for (const msgId of sortedIds) {
                const idMessages = idGroups.get(msgId) || [];
                const maxSeverity = Math.max(...idMessages.map(m => m.severity));
                
                // Use pagination for large groups to avoid UI freezes
                const idData: TreeItemData = {
                    type: 'messageGroup',
                    label: `${msgId} (${idMessages.length})`,
                    description: maxSeverity > 0 ? `SEV ${maxSeverity}` : undefined,
                    severity: maxSeverity,
                    count: idMessages.length,
                    children: this.createPaginatedChildren(idMessages)
                };
                children.push(idData);
            }
            
            const typeData: TreeItemData = {
                type: 'category',
                label: `${type} (${typeMessages.length})`,
                children
            };
            
            const state = type === 'Escape' || type === 'Diagnostic'
                ? vscode.TreeItemCollapsibleState.Expanded
                : vscode.TreeItemCollapsibleState.Collapsed;
            
            items.push(new JobLogTreeItem(typeData, state));
        }
        
        return items;
    }
    
    /**
     * Create tree item data for a message
     */
    private createMessageData(msg: JobLogMessage): TreeItemData {
        const timeStr = msg.time.split('.')[0]; // Remove microseconds
        const shortText = msg.messageText
            ? msg.messageText.substring(0, 50) + (msg.messageText.length > 50 ? '...' : '')
            : t('tree.line', msg.lineNumber);
        
        return {
            type: 'message',
            label: `${timeStr} - ${msg.messageId}`,
            description: shortText,
            message: msg,
            severity: msg.severity
        };
    }
    
    /**
     * Create paginated children for large message groups
     * For small groups (<=PAGE_SIZE), returns message data directly
     * For large groups, returns page nodes that load messages on demand
     */
    private createPaginatedChildren(messages: JobLogMessage[]): TreeItemData[] {
        // Small group: no pagination needed
        if (messages.length <= PAGE_SIZE) {
            return messages.map(msg => this.createMessageData(msg));
        }
        
        // Large group: create page nodes
        const pages: TreeItemData[] = [];
        const totalPages = Math.ceil(messages.length / PAGE_SIZE);
        
        for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
            const start = pageIndex * PAGE_SIZE;
            const end = Math.min(start + PAGE_SIZE, messages.length);
            const pageMessages = messages.slice(start, end);
            
            pages.push({
                type: 'page',
                label: t('tree.messages', start + 1, end),
                description: `${pageMessages.length} items`,
                messages: pageMessages,
                pageStart: 0,  // Within this page's messages array
                pageSize: PAGE_SIZE,
                icon: 'list-flat'
            });
        }
        
        return pages;
    }
    
    /**
     * Create timeline children with time-bucketed grouping
     * Automatically adjusts bucket size based on job duration
     */
    private createTimelineChildren(messages: JobLogMessage[]): TreeItemData[] {
        if (messages.length === 0) {
            return [];
        }
        
        // Sort by timestamp to get first/last for duration calculation
        const sortedMessages = [...messages].sort((a, b) => 
            a.timestamp.getTime() - b.timestamp.getTime()
        );
        
        // Calculate duration and determine bucket size using shared utility
        const firstTime = sortedMessages[0].timestamp.getTime();
        const lastTime = sortedMessages[sortedMessages.length - 1].timestamp.getTime();
        const durationMs = lastTime - firstTime;
        const { bucketSizeMs } = determineBucketSize(durationMs, messages.length);
        
        // Group messages into time buckets using shared utility (pass pre-sorted to avoid redundant sort)
        const timeBuckets = groupMessagesByTimeBucket(sortedMessages, bucketSizeMs, true);
        
        // Convert buckets to tree items
        const children: TreeItemData[] = [];
        const config = vscode.workspace.getConfiguration('joblogDetective');
        const highSeverityThreshold = config.get<number>('highSeverityThreshold', 30);
        
        for (const bucket of timeBuckets) {
            const timeStr = formatBucketTime(bucket.bucketTime);
            const stats = getBucketStats(bucket.messages, highSeverityThreshold);
            
            // Build label with flame decoration using shared utility
            const flames = getFlameDecoration(stats.highSeverityCount, stats.count);
            const label = flames 
                ? `${t('tree.timeBucket', timeStr, stats.count)} ${flames}`
                : t('tree.timeBucket', timeStr, stats.count);
            
            // Create children - paginate if more than 100 messages
            let bucketChildren: TreeItemData[];
            if (stats.count <= PAGE_SIZE) {
                bucketChildren = bucket.messages.map(msg => this.createMessageData(msg));
            } else {
                // Paginate large buckets
                bucketChildren = this.createPaginatedTimelineChildren(bucket.messages, highSeverityThreshold);
            }
            
            const bucketData: TreeItemData = {
                type: 'timeBucket',
                label: label,
                description: stats.maxSeverity > 0 ? `SEV ${stats.maxSeverity}` : undefined,
                count: stats.highSeverityCount, // Store high severity count for icon selection
                severity: stats.maxSeverity,
                children: bucketChildren
            };
            children.push(bucketData);
        }
        
        return children;
    }
    
    /**
     * Create paginated children for large time buckets with flame decoration on sub-groups
     */
    private createPaginatedTimelineChildren(messages: JobLogMessage[], highSeverityThreshold: number): TreeItemData[] {
        const pages: TreeItemData[] = [];
        const totalPages = Math.ceil(messages.length / PAGE_SIZE);
        
        for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
            const start = pageIndex * PAGE_SIZE;
            const end = Math.min(start + PAGE_SIZE, messages.length);
            const pageMessages = messages.slice(start, end);
            
            // Calculate high severity count for this page using shared utility
            const stats = getBucketStats(pageMessages, highSeverityThreshold);
            
            // Build label with flame decoration using shared utility
            const flames = getFlameDecoration(stats.highSeverityCount, pageMessages.length);
            const label = flames
                ? `${t('tree.messages', start + 1, end)} ${flames}`
                : t('tree.messages', start + 1, end);
            
            pages.push({
                type: 'page',
                label: label,
                description: stats.maxSeverity > 0 ? `SEV ${stats.maxSeverity}` : `${pageMessages.length} items`,
                messages: pageMessages,
                pageStart: 0,
                pageSize: PAGE_SIZE,
                count: stats.highSeverityCount, // Store for icon selection
                severity: stats.maxSeverity,
                icon: stats.highSeverityCount > 0 ? 'flame' : 'list-flat'
            });
        }
        
        return pages;
    }
    
    /**
     * Create children for the stats summary
     */
    private createStatsChildren(stats: JobLogStats, completion?: JobCompletionStatus): TreeItemData[] {
        const children: TreeItemData[] = [];
        
        // Job completion status - show first if available
        if (completion) {
            const statusIcon = completion.success ? '✓' : '✗';
            const statusLabel = completion.success 
                ? `${statusIcon} ${t('tree.jobCompletedSuccessfully')}` 
                : `${statusIcon} ${t('tree.jobEndedAbnormally', completion.endCode)}`;
            children.push({
                type: 'root',
                label: statusLabel,
                description: completion.endCodeDescription,
                icon: completion.success ? 'check' : 'error',
                iconColor: completion.success ? 'success' : 'error'
            });
            
            if (completion.processingTime) {
                children.push({
                    type: 'root',
                    label: t('tree.processingTime', completion.processingTime),
                });
            }
        }
        
        children.push({
            type: 'root',
            label: t('tree.total', stats.totalMessages),
            description: `(${t('status.highSeverity', stats.highSeverityCount)})`
        });
        
        if (stats.escapeCount > 0) {
            children.push({
                type: 'root',
                label: t('tree.escape', stats.escapeCount),
                description: t('tree.programTermination')
            });
        }
        
        if (stats.diagnosticCount > 0) {
            children.push({
                type: 'root',
                label: t('tree.diagnostic', stats.diagnosticCount),
                description: t('tree.errorMessages')
            });
        }
        
        return children;
    }
    
    /**
     * Get priority for sorting types
     */
    private getTypePriority(type: string): number {
        switch (type) {
            case 'Escape': return 1;
            case 'Diagnostic': return 2;
            case 'Information': return 3;
            case 'Inquiry': return 4;
            case 'Notify': return 5;
            case 'Completion': return 6;
            case 'Reply': return 7;
            case 'Request': return 8;
            case 'Command': return 9;
            default: return 10;
        }
    }
}
