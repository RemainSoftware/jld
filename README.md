# IBM i Job Log Detective

A VS Code extension for analyzing IBM i job logs. Quickly find errors and issues in large job log files.

## Features

![Analysis View](images/analysis-view.png)

- **Custom Tree View**: Dedicated "Job Log Detective" panel with filtering and navigation
- **Smart Analysis**: Highlights high-severity messages and analyzes the log for errors
- **Timeline View**: Chronological view with time buckets to identify when issues occurred
- **Outline View Integration**: View messages grouped by type and message ID in the VS Code Outline
- **Quick Navigation**: Click on any message to jump to its location in the file
- **Rich Tooltips**: Hover over messages to see full details including cause and recovery
- **Automatic Detection**: Automatically detects IBM i job log files by content or filename pattern
- **Multi-Language Support**: Parses job logs in English, German, Dutch, French, and Spanish

## Supported Languages

The extension automatically detects and parses job logs in:

| Language | Header | Message Types |
|----------|--------|---------------|
| English | Job Log | Command, Completion, Diagnostic, Escape, Information, etc. |
| German | Jobprotokoll | Befehl, Beendigung, Diagnose, Abbruch, Information, etc. |
| Dutch | Taaklogboek | Opdracht, Voltooiing, Diagnose, Afbreken, Informatie, etc. |
| French | Historique des travaux | Commande, Achèvement, Diagnostic, Echappement, Information, etc. |
| Spanish | Mostrar registro trabajo | Mandato, Terminación, Diagnóstico, Escape, Informativo, etc. |

## Message Types

The extension recognizes all IBM i message types:
- **Escape** - Program termination messages (highest priority)
- **Diagnostic** - Error messages
- **Information** - General informational messages
- **Completion** - Task completion status
- **Command** - Command execution (hidden by default)
- **Request** - Command requests
- **Inquiry** - Messages requiring a reply
- **Reply** - Responses to inquiries
- **Notify** - Notification messages
- **Sender Copy** - Copies of sent messages

## Tree View Sections

The Job Log Detective panel organizes messages into these sections:

### Summary
Shows job completion status, total message count, and high severity statistics.

### High Priority
Recent high-severity messages (Escape and Diagnostic) that likely indicate the root cause of issues.

### Timeline
All filtered messages grouped by time buckets. Helps identify **when** issues occurred.

| Job Duration | Bucket Size |
|--------------|-------------|
| < 1 minute | 1 second |
| 1-10 minutes | 10 seconds |
| 10-60 minutes | 30 seconds |
| > 60 minutes | 1 minute |

Buckets show 🔥 icons based on the percentage of high-severity messages:
- 1-20% = 🔥
- 21-40% = 🔥🔥
- 41-60% = 🔥🔥🔥
- 61-80% = 🔥🔥🔥🔥
- 81-100% = 🔥🔥🔥🔥🔥

### Message Types
Messages grouped by type (Escape, Diagnostic, Information, etc.), then by message ID.

## Usage

1. Open a job log file (files named `QPJOBLOG` or containing IBM i job log format)
2. The extension will automatically detect and analyze the file
3. Use the **Outline** view or **Job Log Detective** panel to navigate
4. Click on messages to jump to their location
5. Use the filter buttons to focus on specific message types or severity levels

### Manual Activation

If automatic detection doesn't work:
1. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Run "Job Log Detective: Set as IBM i Job Log"

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `joblogDetective.highSeverityThreshold` | `30` | Messages with severity >= this value are highlighted |
| `joblogDetective.hideCommandMessages` | `true` | Hide Command type messages by default |
| `joblogDetective.autoDetect` | `true` | Automatically detect job log files by content |

## Commands

- **Job Log Detective: Analyze Job Log** - Manually trigger analysis
- **Job Log Detective: Set as IBM i Job Log** - Force the current file to be treated as a job log
- **Job Log Detective: Refresh Analysis** - Re-parse and refresh the analysis
- **Job Log Detective: Filter by Message Type** - Filter to specific message types
- **Job Log Detective: Show High Severity Only** - Toggle to show only high severity messages

## File Detection

The extension detects job logs by:
1. File named `QPJOBLOG` (any extension)
2. Files with `.joblog` extension
3. Content containing:
   - IBM i product ID (`5770SS1` or similar)
   - Version pattern (`V7R6M0` format)
   - "Job Log" header text

## Development

```bash
# Install dependencies
npm install

# Compile
npm run compile

# Test
npx vitest run

# Watch for changes
npm run watch

# Run extension in development
Press F5 in VS Code
```

### Adding New Parsing Languages

To add support for a new language, edit `src/localization.ts`:

1. Create a new `LanguageDefinition` object following the pattern of existing languages
2. Add the language to the `ALL_LANGUAGES` array
3. The extension will automatically detect and parse job logs in the new language

Example language definition structure:
```typescript
const NEW_LANGUAGE: LanguageDefinition = {
    name: 'Language Name',
    jobLogTitle: 'Localized Job Log Title',
    messageTypes: {
        'Local Command': 'Command',
        'Local Completion': 'Completion',
        // ... map local names to English
    },
    detailFields: {
        fromModule: 'From module|Localized from module',
        // ... other field patterns
    }
};
```

## National Language Support

Translations can be added to the i18n directory.

## License

MIT
