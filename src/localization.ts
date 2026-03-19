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

// Localization support for Job Log Detective
// Supports multiple languages: English, German, Dutch, French, Italian, and Spanish

/**
 * Language definition for job log parsing
 */
export interface LanguageDefinition {
    code: string;
    name: string;

    // Header patterns
    jobLogTitle: string[];          // "Job Log", "Jobprotokoll"
    pageLabel: string[];            // "Page", "Seite"
    
    // Job info labels
    jobNameLabel: string[];         // "Job name", "Jobname"
    userLabel: string[];            // "User", "Benutzer"
    numberLabel: string[];          // "Number", "Nummer"
    jobDescLabel: string[];         // "Job description", "Jobbeschreibung"
    libraryLabel: string[];         // "Library", "Bibliothek"

    // Column headers
    msgIdHeader: string[];          // "MSGID", "NACHR-ID"
    typeHeader: string[];           // "TYPE", "ART"
    sevHeader: string[];            // "SEV", "BEW"

    // Message types - map to normalized English types
    messageTypes: Map<string, string>;

    // Detail field labels
    fromModule: string[];           // "From module", "Ausgangsmodul"
    fromProcedure: string[];        // "From procedure", "Ausgangsprozedur"
    toModule: string[];             // "To module", "Zielmodul"
    toProcedure: string[];          // "To procedure", "Zielprozedur"
    statement: string[];            // "Statement", "Anweisung"
    messageLabel: string[];         // "Message", "Nachricht"
    causeLabel: string[];           // "Cause", "Ursache"
    recoveryLabel: string[];        // "Recovery", "Fehlerbeseitigung"
    threadLabel: string[];          // "Thread"
    fromUser: string[];             // "From user", "Von Benutzer"
}

/**
 * English language definition
 */
export const ENGLISH: LanguageDefinition = {
    code: 'en',
    name: 'English',

    jobLogTitle: ['Job Log'],
    pageLabel: ['Page'],

    jobNameLabel: ['Job name'],
    userLabel: ['User'],
    numberLabel: ['Number'],
    jobDescLabel: ['Job description'],
    libraryLabel: ['Library'],

    msgIdHeader: ['MSGID'],
    typeHeader: ['TYPE'],
    sevHeader: ['SEV'],

    messageTypes: new Map([
        ['Command', 'Command'],
        ['Completion', 'Completion'],
        ['Diagnostic', 'Diagnostic'],
        ['Escape', 'Escape'],
        ['Information', 'Information'],
        ['Inquiry', 'Inquiry'],
        ['Notify', 'Notify'],
        ['Reply', 'Reply'],
        ['Request', 'Request'],
        ['Sender Copy', 'Sender Copy'],
    ]),

    fromModule: ['From module'],
    fromProcedure: ['From procedure'],
    toModule: ['To module'],
    toProcedure: ['To procedure'],
    statement: ['Statement'],
    messageLabel: ['Message'],
    causeLabel: ['Cause'],
    recoveryLabel: ['Recovery'],
    threadLabel: ['Thread'],
    fromUser: ['From user'],
};

/**
 * German language definition
 */
export const GERMAN: LanguageDefinition = {
    code: 'de',
    name: 'German',

    jobLogTitle: ['Jobprotokoll', 'Job-Protokoll'],
    pageLabel: ['Seite'],

    jobNameLabel: ['Jobname'],
    userLabel: ['Benutzer'],
    numberLabel: ['Nummer'],
    jobDescLabel: ['Jobbeschreibung'],
    libraryLabel: ['Bibliothek'],

    msgIdHeader: ['NACHR-ID'],
    typeHeader: ['ART'],
    sevHeader: ['BEW'],

    messageTypes: new Map([
        ['Befehl', 'Command'],
        ['Beendigung', 'Completion'],
        ['Diagnose', 'Diagnostic'],
        ['Abbruch', 'Escape'],
        ['Information', 'Information'],
        ['Anfrage', 'Inquiry'],
        ['Benachrichtigung', 'Notify'],
        ['Antwort', 'Reply'],
        ['Anforderung', 'Request'],
        ['Kopie', 'Sender Copy'],
    ]),

    fromModule: ['Ausgangsmodul'],
    fromProcedure: ['Ausgangsprozedur'],
    toModule: ['Zielmodul'],
    toProcedure: ['Zielprozedur'],
    statement: ['Anweisung'],
    messageLabel: ['Nachricht'],
    causeLabel: ['Ursache'],
    recoveryLabel: ['Fehlerbeseitigung'],
    threadLabel: ['Thread'],
    fromUser: ['Von Benutzer'],
};

/**
 * French language definition
 */
export const FRENCH: LanguageDefinition = {
    code: 'fr',
    name: 'French',

    jobLogTitle: ['Historique du travail', 'Historique des travaux', 'Journal des travaux'],
    pageLabel: ['Page'],

    jobNameLabel: ['Nom du travail'],
    userLabel: ['Utilisateur'],
    numberLabel: ['Numéro'],
    jobDescLabel: ['Description de travail', 'Description du travail'],
    libraryLabel: ['Bibliothèque'],

    msgIdHeader: ['IDMSG', 'ID MSG'],
    typeHeader: ['TYPE'],
    sevHeader: ['GRV', 'GRA'],  // Gravité

    messageTypes: new Map([
        ['Commande', 'Command'],
        ['Achèvement', 'Completion'],
        ['Diagnostic', 'Diagnostic'],
        ['Echappement', 'Escape'],
        ['Information', 'Information'],
        ['Interrogation', 'Inquiry'],
        ['Notification', 'Notify'],
        ['Réponse', 'Reply'],
        ['Demande', 'Request'],
        ['Copie', 'Sender Copy'],
    ]),

    fromModule: ['Module source', 'Module d\'origine'],
    fromProcedure: ['Procédure source', 'Procédure d\'origine'],
    toModule: ['Module cible', 'Module de destination'],
    toProcedure: ['Procédure cible', 'Procédure de destination'],
    statement: ['Instruction'],
    messageLabel: ['Message'],
    causeLabel: ['Cause'],
    recoveryLabel: ['Que faire', 'Reprise', 'Correction'],
    threadLabel: ['Unité d\'exécution'],
    fromUser: ['Utilisateur source'],
};

/**
 * Italian language definition
 */
export const ITALIAN: LanguageDefinition = {
    code: 'it',
    name: 'Italian',

    jobLogTitle: ['Visual. registrazione lavoro', 'Visualizzazione registrazione lavoro', 'Registro lavoro'],
    pageLabel: ['Pag.', 'Pagina'],

    jobNameLabel: ['Nome lavoro'],
    userLabel: ['Utente'],
    numberLabel: ['Numero'],
    jobDescLabel: ['Descrizione lavoro'],
    libraryLabel: ['Libreria'],

    msgIdHeader: ['IDMSG'],
    typeHeader: ['TIPO'],
    sevHeader: ['GRAV'],  // Gravità

    messageTypes: new Map([
        ['Comando', 'Command'],
        ['Completamento', 'Completion'],
        ['Diagnosi', 'Diagnostic'],
        ['Uscita', 'Escape'],
        ['Informazioni', 'Information'],
        ['Interrogazione', 'Inquiry'],
        ['Notifica', 'Notify'],
        ['Risposta', 'Reply'],
        ['Richiesta', 'Request'],
        ['Copia mittente', 'Sender Copy'],
    ]),

    fromModule: ['Dal modulo', 'Da modulo'],
    fromProcedure: ['Dalla procedura', 'Da procedura'],
    toModule: ['Al modulo', 'A modulo'],
    toProcedure: ['Alla procedura', 'A procedura'],
    statement: ['Istruzione'],
    messageLabel: ['Messaggio'],
    causeLabel: ['Causa'],
    recoveryLabel: ['Ripristino', 'Correzione'],
    threadLabel: ['Thread'],
    fromUser: ['Dall\'utente', 'Da utente'],
};

/**
 * Dutch language definition
 */
export const DUTCH: LanguageDefinition = {
    code: 'nl',
    name: 'Dutch',

    jobLogTitle: ['Taaklogboek', 'Taak logboek'],
    pageLabel: ['Pagina'],

    jobNameLabel: ['Naam taak'],
    userLabel: ['Gebruiker'],
    numberLabel: ['Nummer'],
    jobDescLabel: ['Taakbeschrijving'],
    libraryLabel: ['Bibliotheek'],

    msgIdHeader: ['BERICHT-ID'],
    typeHeader: ['TYPE'],
    sevHeader: ['SEV'],

    messageTypes: new Map([
        ['Opdracht', 'Command'],
        ['Voltooiing', 'Completion'],
        ['Diagnose', 'Diagnostic'],
        ['Afbreken', 'Escape'],
        ['Informatie', 'Information'],
        ['Navraag', 'Inquiry'],
        ['Melding', 'Notify'],
        ['Antwoord', 'Reply'],
        ['Aanvraag', 'Request'],
        ['Zenderkopie', 'Sender Copy'],
    ]),

    fromModule: ['Van module'],
    fromProcedure: ['Van procedure'],
    toModule: ['Naar module'],
    toProcedure: ['Naar procedure'],
    statement: ['Instructie'],
    messageLabel: ['Bericht'],
    causeLabel: ['Oorzaak'],
    recoveryLabel: ['Herstelprocedure'],
    threadLabel: ['Thread'],
    fromUser: ['Van gebruiker'],
};

/**
 * Spanish language definition (updated from actual job log)
 */
export const SPANISH: LanguageDefinition = {
    code: 'es',
    name: 'Spanish',

    jobLogTitle: ['Mostrar registro trabajo', 'Registro de trabajo', 'Historial de trabajo'],
    pageLabel: ['Página'],

    jobNameLabel: ['Nombre de trabajo', 'Nombre trabajo'],
    userLabel: ['Usuario'],
    numberLabel: ['Número'],
    jobDescLabel: ['Descripción trabajo', 'Descripción del trabajo'],
    libraryLabel: ['Biblioteca'],

    msgIdHeader: ['IDMSJ', 'ID MSG'],
    typeHeader: ['TIPO'],
    sevHeader: ['SEV', 'GRA'],

    messageTypes: new Map([
        ['Mandato', 'Command'],
        ['Terminación', 'Completion'],
        ['Diagnóstico', 'Diagnostic'],
        ['Escape', 'Escape'],
        ['Informativo', 'Information'],
        ['Información', 'Information'],
        ['Consulta', 'Inquiry'],
        ['Notificación', 'Notify'],
        ['Respuesta', 'Reply'],
        ['Petición', 'Request'],
        ['Copia', 'Sender Copy'],
    ]),

    fromModule: ['Módulo origen', 'Módulo de origen'],
    fromProcedure: ['Procedimiento origen', 'Procedimiento de origen'],
    toModule: ['Módulo destino', 'Módulo de destino'],
    toProcedure: ['Procedimiento destino', 'Procedimiento de destino'],
    statement: ['Sentencia', 'Instrucción'],
    messageLabel: ['Mensaje'],
    causeLabel: ['Causa'],
    recoveryLabel: ['Recuperación', 'Corrección'],
    threadLabel: ['Hebra', 'Hilo'],
    fromUser: ['Usuario origen', 'Usuario de origen'],
};

/**
 * All supported languages
 */
export const LANGUAGES: LanguageDefinition[] = [
    ENGLISH,
    GERMAN,
    DUTCH,
    FRENCH,
    ITALIAN,
    SPANISH,
];

/**
 * Merged language support - combines all language patterns for detection
 */
export class LanguageSupport {
    private allJobLogTitles: string[];
    private allPageLabels: string[];
    private messageTypeMap: Map<string, string>;
    private allMessageTypes: string[];

    // Header field patterns (combined from all languages)
    public jobNameLabels: string[];
    public userLabels: string[];
    public numberLabels: string[];
    public jobDescLabels: string[];
    public libraryLabels: string[];
    public msgIdHeaders: string[];
    public typeHeaders: string[];
    public sevHeaders: string[];

    // Detail field patterns (combined from all languages)
    public fromModulePatterns: string[];
    public fromProcedurePatterns: string[];
    public toModulePatterns: string[];
    public toProcedurePatterns: string[];
    public statementPatterns: string[];
    public messagePatterns: string[];
    public causePatterns: string[];
    public recoveryPatterns: string[];
    public threadPatterns: string[];
    public fromUserPatterns: string[];

    constructor() {
        this.allJobLogTitles = [];
        this.allPageLabels = [];
        this.messageTypeMap = new Map();
        this.allMessageTypes = [];

        this.jobNameLabels = [];
        this.userLabels = [];
        this.numberLabels = [];
        this.jobDescLabels = [];
        this.libraryLabels = [];
        this.msgIdHeaders = [];
        this.typeHeaders = [];
        this.sevHeaders = [];

        this.fromModulePatterns = [];
        this.fromProcedurePatterns = [];
        this.toModulePatterns = [];
        this.toProcedurePatterns = [];
        this.statementPatterns = [];
        this.messagePatterns = [];
        this.causePatterns = [];
        this.recoveryPatterns = [];
        this.threadPatterns = [];
        this.fromUserPatterns = [];

        // Merge all language definitions
        for (const lang of LANGUAGES) {
            this.allJobLogTitles.push(...lang.jobLogTitle);
            this.allPageLabels.push(...lang.pageLabel);

            // Merge header field patterns
            this.jobNameLabels.push(...lang.jobNameLabel);
            this.userLabels.push(...lang.userLabel);
            this.numberLabels.push(...lang.numberLabel);
            this.jobDescLabels.push(...lang.jobDescLabel);
            this.libraryLabels.push(...lang.libraryLabel);
            this.msgIdHeaders.push(...lang.msgIdHeader);
            this.typeHeaders.push(...lang.typeHeader);
            this.sevHeaders.push(...lang.sevHeader);

            // Merge message types
            for (const [localType, normalizedType] of lang.messageTypes) {
                this.messageTypeMap.set(localType.toLowerCase(), normalizedType);
                if (!this.allMessageTypes.includes(localType)) {
                    this.allMessageTypes.push(localType);
                }
            }

            // Merge detail field patterns
            this.fromModulePatterns.push(...lang.fromModule);
            this.fromProcedurePatterns.push(...lang.fromProcedure);
            this.toModulePatterns.push(...lang.toModule);
            this.toProcedurePatterns.push(...lang.toProcedure);
            this.statementPatterns.push(...lang.statement);
            this.messagePatterns.push(...lang.messageLabel);
            this.causePatterns.push(...lang.causeLabel);
            this.recoveryPatterns.push(...lang.recoveryLabel);
            this.threadPatterns.push(...lang.threadLabel);
            this.fromUserPatterns.push(...lang.fromUser);
        }
    }

    /**
     * Get regex pattern for job log title detection
     */
    public getJobLogTitlePattern(): RegExp {
        const escaped = this.allJobLogTitles.map(t => this.escapeRegex(t));
        return new RegExp(`(${escaped.join('|')})`, 'i');
    }

    /**
     * Get regex pattern for page label detection
     */
    public getPageLabelPattern(): RegExp {
        const escaped = this.allPageLabels.map(t => this.escapeRegex(t));
        return new RegExp(`(${escaped.join('|')})\\s*(\\d+)`, 'i');
    }

    /**
     * Get regex alternation for all message types
     */
    public getMessageTypesAlternation(): string {
        return this.allMessageTypes.map(t => this.escapeRegex(t)).join('|');
    }

    /**
     * Get regex alternation for page labels
     */
    public getPageLabelsAlternation(): string {
        return this.allPageLabels.map(t => this.escapeRegex(t)).join('|');
    }

    /**
     * Get job info pattern for matching job name, user, number
     */
    public getJobInfoPattern(): RegExp {
        const jobNames = this.jobNameLabels.map(l => this.escapeRegex(l).replace(/\s+/g, '\\s*')).join('|');
        const users = this.userLabels.map(l => this.escapeRegex(l)).join('|');
        const numbers = this.numberLabels.map(l => this.escapeRegex(l)).join('|');
        return new RegExp(
            `(?:${jobNames})\\s*[.\\s]*:\\s*(\\S+)\\s+(?:${users})\\s*[.\\s]*:\\s*(\\S+)\\s+(?:${numbers})\\s*[.\\s]*:\\s*(\\d+)`,
            'i'
        );
    }

    /**
     * Get job description pattern for matching job description and library
     */
    public getJobDescPattern(): RegExp {
        const jobDesc = this.jobDescLabels.map(l => this.escapeRegex(l).replace(/\s+/g, '\\s*')).join('|');
        const library = this.libraryLabels.map(l => this.escapeRegex(l)).join('|');
        return new RegExp(
            `(?:${jobDesc})\\s*[.\\s]*:\\s*(\\S+)\\s+(?:${library})\\s*[.\\s]*:\\s*(\\S+)`,
            'i'
        );
    }

    /**
     * Get column header pattern for detecting message table header
     */
    public getColumnHeaderPattern(): RegExp {
        const msgIds = this.msgIdHeaders.map(h => this.escapeRegex(h)).join('|');
        const types = this.typeHeaders.map(h => this.escapeRegex(h)).join('|');
        const sevs = this.sevHeaders.map(h => this.escapeRegex(h)).join('|');
        return new RegExp(
            `^(?:${msgIds})\\s+(?:${types})\\s+(?:${sevs})`,
            'i'
        );
    }

    /**
     * Normalize a localized message type to English
     */
    public normalizeMessageType(localType: string): string {
        return this.messageTypeMap.get(localType.toLowerCase()) || localType;
    }

    /**
     * Build a detail field pattern for matching
     */
    public buildDetailPattern(patterns: string[]): RegExp {
        const escaped = patterns.map(p => this.escapeRegex(p));
        // Match pattern with flexible dot spacing: "Label . . . :" or "Label:"
        return new RegExp(`^\\s*(${escaped.join('|')})\\s*[.\\s]*:\\s*(.+)`, 'i');
    }

    /**
     * Escape special regex characters
     */
    private escapeRegex(str: string): string {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}

/**
 * Singleton instance
 */
let languageSupportInstance: LanguageSupport | null = null;

/**
 * Get the language support instance
 */
export function getLanguageSupport(): LanguageSupport {
    if (!languageSupportInstance) {
        languageSupportInstance = new LanguageSupport();
    }
    return languageSupportInstance;
}

/**
 * Detect the language of a job log from content
 */
export function detectLanguage(content: string): LanguageDefinition {
    const firstLines = content.split('\n').slice(0, 20).join('\n').toLowerCase();

    // First pass: check job log titles (most specific/unique identifiers)
    for (const lang of LANGUAGES) {
        for (const title of lang.jobLogTitle) {
            if (firstLines.includes(title.toLowerCase())) {
                return lang;
            }
        }
    }

    // Second pass: check message ID headers (language-specific)
    for (const lang of LANGUAGES) {
        for (const header of lang.msgIdHeader) {
            if (firstLines.includes(header.toLowerCase())) {
                return lang;
            }
        }
    }

    // Third pass: check type headers (less specific, may overlap between languages)
    for (const lang of LANGUAGES) {
        for (const header of lang.typeHeader) {
            if (firstLines.includes(header.toLowerCase())) {
                return lang;
            }
        }
    }

    // Default to English
    return ENGLISH;
}
