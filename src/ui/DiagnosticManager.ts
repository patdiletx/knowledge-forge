import * as vscode from 'vscode';
import { Diagnostic } from '../services/CodeReviewService';

export class DiagnosticManager {
    private static diagnosticCollection: vscode.DiagnosticCollection;

    public static initialize(context: vscode.ExtensionContext) {
        this.diagnosticCollection = vscode.languages.createDiagnosticCollection('knowledge-forge');
        context.subscriptions.push(this.diagnosticCollection);
    }

    public static updateDiagnostics(projectPath: string, diagnostics: Diagnostic[]) {
        this.diagnosticCollection.clear();

        const diagnosticsByFile: { [key: string]: vscode.Diagnostic[] } = {};

        for (const diag of diagnostics) {
            const uri = vscode.Uri.joinPath(vscode.Uri.file(projectPath), diag.file);

            if (!diagnosticsByFile[uri.toString()]) {
                diagnosticsByFile[uri.toString()] = [];
            }

            const range = new vscode.Range(diag.line - 1, 0, diag.line - 1, 100); // Resaltar toda la línea
            const severity = this.getSeverity(diag.severity);
            const vscodeDiagnostic = new vscode.Diagnostic(range, diag.message, severity);
            vscodeDiagnostic.source = 'KnowledgeForge AI';

            diagnosticsByFile[uri.toString()].push(vscodeDiagnostic);
        }

        for (const [uriStr, diags] of Object.entries(diagnosticsByFile)) {
            this.diagnosticCollection.set(vscode.Uri.parse(uriStr), diags);
        }
    }

    private static getSeverity(severity: string): vscode.DiagnosticSeverity {
        switch (severity.toLowerCase()) {
            case 'error':
                return vscode.DiagnosticSeverity.Error;
            case 'warning':
                return vscode.DiagnosticSeverity.Warning;
            case 'information':
                return vscode.DiagnosticSeverity.Information;
            default:
                return vscode.DiagnosticSeverity.Hint;
        }
    }

    public static clearDiagnostics() {
        this.diagnosticCollection.clear();
    }

    public static dispose() {
        this.diagnosticCollection.dispose();
    }
}
