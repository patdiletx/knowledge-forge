import * as vscode from 'vscode';
import { CollaborationService, CommunitySolution, StudyBuddy } from '../services/CollaborationService';

export class CommunitySolutionsPanel {
    public static currentPanel: CommunitySolutionsPanel | undefined;
    
    public static readonly viewType = 'communitySolutions';
    
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private readonly _context: vscode.ExtensionContext;
    private _disposables: vscode.Disposable[] = [];
    private _currentTaskId: string | undefined;
    private _currentRoadmapId: string | undefined;
    
    public static createOrShow(
        extensionUri: vscode.Uri, 
        context: vscode.ExtensionContext,
        taskId?: string,
        roadmapId?: string
    ) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;
            
        if (CommunitySolutionsPanel.currentPanel) {
            CommunitySolutionsPanel.currentPanel._panel.reveal(column);
            CommunitySolutionsPanel.currentPanel._currentTaskId = taskId;
            CommunitySolutionsPanel.currentPanel._currentRoadmapId = roadmapId;
            CommunitySolutionsPanel.currentPanel._update();
            return;
        }
        
        const panel = vscode.window.createWebviewPanel(
            CommunitySolutionsPanel.viewType,
            'Community Solutions',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );
        
        CommunitySolutionsPanel.currentPanel = new CommunitySolutionsPanel(panel, extensionUri, context, taskId, roadmapId);
    }
    
    private constructor(
        panel: vscode.WebviewPanel,
        extensionUri: vscode.Uri,
        context: vscode.ExtensionContext,
        taskId?: string,
        roadmapId?: string
    ) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._context = context;
        this._currentTaskId = taskId;
        this._currentRoadmapId = roadmapId;
        
        this._update();
        
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        
        this._panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'upvoteSolution':
                        this._upvoteSolution(message.solutionId);
                        return;
                    case 'downvoteSolution':
                        this._downvoteSolution(message.solutionId);
                        return;
                    case 'addComment':
                        this._addComment(message.solutionId, message.content);
                        return;
                    case 'requestHelp':
                        this._requestHelp(message.question);
                        return;
                    case 'findBuddies':
                        this._findBuddies();
                        return;
                    case 'submitSolution':
                        this._submitSolution(message.code, message.description, message.language);
                        return;
                }
            },
            null,
            this._disposables
        );
    }
    
    public dispose() {
        CommunitySolutionsPanel.currentPanel = undefined;
        
        this._panel.dispose();
        
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }
    
    private _update() {
        this._panel.webview.html = this._getHtmlForWebview(this._panel.webview);
    }
    
    private _getHtmlForWebview(webview: vscode.Webview) {
        const nonce = this._getNonce();
        
        // Get solutions for current task or all solutions
        let solutions: CommunitySolution[] = [];
        if (this._currentTaskId) {
            solutions = CollaborationService.getSolutionsForTask(this._context, this._currentTaskId);
        } else {
            solutions = CollaborationService.getSolutions(this._context);
        }
        
        // Get user karma
        const userKarma = CollaborationService.getUserKarma(this._context);
        
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Community Solutions</title>
    <style nonce="${nonce}">
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
            margin: 0;
        }
        
        h1, h2, h3 {
            color: var(--vscode-foreground);
        }
        
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }
        
        .karma-badge {
            background-color: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            padding: 5px 10px;
            border-radius: 15px;
            font-weight: bold;
        }
        
        .tabs {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
            border-bottom: 1px solid var(--vscode-sideBar-border);
            padding-bottom: 10px;
        }
        
        .tab {
            padding: 5px 15px;
            cursor: pointer;
            border-radius: 3px;
        }
        
        .tab.active {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }
        
        .card {
            background-color: var(--vscode-sideBar-background);
            border: 1px solid var(--vscode-sideBar-border);
            border-radius: 5px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        
        .solution-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }
        
        .solution-author {
            font-weight: bold;
        }
        
        .solution-meta {
            color: var(--vscode-descriptionForeground);
            font-size: 0.9em;
        }
        
        .solution-description {
            margin: 15px 0;
        }
        
        .solution-code {
            background-color: var(--vscode-textCodeBlock-background);
            border: 1px solid var(--vscode-sideBar-border);
            border-radius: 3px;
            padding: 15px;
            font-family: var(--vscode-editor-font-family);
            font-size: 0.9em;
            overflow-x: auto;
            margin: 15px 0;
        }
        
        .solution-actions {
            display: flex;
            gap: 10px;
            margin-top: 15px;
        }
        
        .btn {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 5px 10px;
            border-radius: 3px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 5px;
        }
        
        .btn:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        
        .btn-secondary {
            background-color: var(--vscode-textSeparator-foreground);
        }
        
        .btn-vote.upvoted {
            background-color: var(--vscode-charts-green);
        }
        
        .btn-vote.downvoted {
            background-color: var(--vscode-charts-red);
        }
        
        .comments-section {
            margin-top: 20px;
            padding-top: 15px;
            border-top: 1px solid var(--vscode-sideBar-border);
        }
        
        .comment {
            background-color: var(--vscode-sideBar-background);
            border: 1px solid var(--vscode-sideBar-border);
            border-radius: 3px;
            padding: 10px;
            margin-bottom: 10px;
        }
        
        .comment-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
        }
        
        .comment-author {
            font-weight: bold;
        }
        
        .comment-content {
            margin: 5px 0;
        }
        
        .comment-actions {
            display: flex;
            gap: 5px;
            font-size: 0.9em;
        }
        
        .form-group {
            margin-bottom: 15px;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
        }
        
        .form-group textarea, .form-group input, .form-group select {
            width: 100%;
            padding: 8px;
            border: 1px solid var(--vscode-sideBar-border);
            border-radius: 3px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            font-family: var(--vscode-font-family);
        }
        
        .form-actions {
            display: flex;
            gap: 10px;
            justify-content: flex-end;
        }
        
        .buddies-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: 15px;
        }
        
        .buddy-card {
            background-color: var(--vscode-sideBar-background);
            border: 1px solid var(--vscode-sideBar-border);
            border-radius: 5px;
            padding: 15px;
        }
        
        .buddy-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }
        
        .buddy-name {
            font-weight: bold;
        }
        
        .buddy-score {
            background-color: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            padding: 2px 8px;
            border-radius: 10px;
            font-size: 0.8em;
        }
        
        .buddy-skills {
            display: flex;
            flex-wrap: wrap;
            gap: 5px;
            margin: 10px 0;
        }
        
        .skill-tag {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 0.8em;
        }
        
        .empty-state {
            text-align: center;
            padding: 40px 20px;
            color: var(--vscode-descriptionForeground);
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🤝 Community Solutions</h1>
        <div class="karma-badge">Karma: ${userKarma}</div>
    </div>
    
    <div class="tabs">
        <div class="tab active" onclick="showTab('solutions')">💡 Solutions</div>
        <div class="tab" onclick="showTab('submit')">➕ Submit Solution</div>
        <div class="tab" onclick="showTab('buddies')">👥 Study Buddies</div>
        <div class="tab" onclick="showTab('help')">🆘 Ask for Help</div>
    </div>
    
    <div id="solutions-tab">
        ${solutions.length > 0 ? `
            ${solutions.map(solution => `
                <div class="card" data-solution-id="${solution.id}">
                    <div class="solution-header">
                        <div>
                            <div class="solution-author">${solution.authorName}</div>
                            <div class="solution-meta">${solution.createdAt.toLocaleDateString()} • ${solution.language}</div>
                        </div>
                        <div class="solution-votes">
                            <button class="btn btn-vote" onclick="upvoteSolution('${solution.id}')">👍 ${solution.upvotes}</button>
                            <button class="btn btn-vote" onclick="downvoteSolution('${solution.id}')">👎 ${solution.downvotes}</button>
                        </div>
                    </div>
                    <div class="solution-description">${solution.description}</div>
                    <div class="solution-code"><pre>${this._escapeHtml(solution.code)}</pre></div>
                    <div class="solution-actions">
                        <button class="btn" onclick="showCommentForm('${solution.id}')">💬 Comment</button>
                    </div>
                    
                    ${solution.comments.length > 0 ? `
                        <div class="comments-section">
                            <h3>Comments (${solution.comments.length})</h3>
                            ${solution.comments.map(comment => `
                                <div class="comment">
                                    <div class="comment-header">
                                        <div class="comment-author">${comment.authorName}</div>
                                        <div class="comment-meta">${comment.createdAt.toLocaleDateString()}</div>
                                    </div>
                                    <div class="comment-content">${this._escapeHtml(comment.content)}</div>
                                    <div class="comment-actions">
                                        <button class="btn btn-secondary" onclick="upvoteComment('${comment.id}')">👍 ${comment.upvotes}</button>
                                        <button class="btn btn-secondary" onclick="downvoteComment('${comment.id}')">👎 ${comment.downvotes}</button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                    
                    <div class="comment-form" id="comment-form-${solution.id}" style="display: none; margin-top: 15px;">
                        <div class="form-group">
                            <label for="comment-content-${solution.id}">Add a comment:</label>
                            <textarea id="comment-content-${solution.id}" rows="3" placeholder="Share your thoughts on this solution..."></textarea>
                        </div>
                        <div class="form-actions">
                            <button class="btn btn-secondary" onclick="hideCommentForm('${solution.id}')">Cancel</button>
                            <button class="btn" onclick="addComment('${solution.id}')">Post Comment</button>
                        </div>
                    </div>
                </div>
            `).join('')}
        ` : `
            <div class="empty-state">
                <h3>No solutions yet</h3>
                <p>Be the first to share your solution for this task!</p>
                <button class="btn" onclick="showTab('submit')">Submit Solution</button>
            </div>
        `}
    </div>
    
    <div id="submit-tab" style="display: none;">
        <div class="card">
            <h2>Submit Your Solution</h2>
            <div class="form-group">
                <label for="solution-description">Description</label>
                <textarea id="solution-description" rows="3" placeholder="Briefly explain your approach and any key insights..."></textarea>
            </div>
            <div class="form-group">
                <label for="solution-language">Language</label>
                <select id="solution-language">
                    <option value="javascript">JavaScript</option>
                    <option value="typescript">TypeScript</option>
                    <option value="python">Python</option>
                    <option value="java">Java</option>
                    <option value="other">Other</option>
                </select>
            </div>
            <div class="form-group">
                <label for="solution-code">Your Code</label>
                <textarea id="solution-code" rows="10" placeholder="Paste your solution code here..."></textarea>
            </div>
            <div class="form-actions">
                <button class="btn btn-secondary" onclick="showTab('solutions')">Cancel</button>
                <button class="btn" onclick="submitSolution()">Submit Solution</button>
            </div>
        </div>
    </div>
    
    <div id="buddies-tab" style="display: none;">
        <div class="card">
            <h2>Find Study Buddies</h2>
            <p>Connect with other learners who share similar interests and skill levels.</p>
            <button class="btn" onclick="findBuddies()">Find Buddies</button>
        </div>
        
        <div id="buddies-results"></div>
    </div>
    
    <div id="help-tab" style="display: none;">
        <div class="card">
            <h2>Ask for Help</h2>
            <p>Stuck on a task? Ask the community for assistance.</p>
            <div class="form-group">
                <label for="help-question">What do you need help with?</label>
                <textarea id="help-question" rows="4" placeholder="Describe the problem you're facing..."></textarea>
            </div>
            <div class="form-actions">
                <button class="btn" onclick="requestHelp()">Request Help</button>
            </div>
        </div>
    </div>
    
    <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();
        
        function showTab(tabName) {
            // Hide all tabs
            document.getElementById('solutions-tab').style.display = 'none';
            document.getElementById('submit-tab').style.display = 'none';
            document.getElementById('buddies-tab').style.display = 'none';
            document.getElementById('help-tab').style.display = 'none';
            
            // Show selected tab
            document.getElementById(tabName + '-tab').style.display = 'block';
            
            // Update active tab
            document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
            event.target.classList.add('active');
        }
        
        function upvoteSolution(solutionId) {
            vscode.postMessage({ command: 'upvoteSolution', solutionId: solutionId });
        }
        
        function downvoteSolution(solutionId) {
            vscode.postMessage({ command: 'downvoteSolution', solutionId: solutionId });
        }
        
        function showCommentForm(solutionId) {
            document.querySelectorAll('.comment-form').forEach(form => {
                form.style.display = 'none';
            });
            document.getElementById('comment-form-' + solutionId).style.display = 'block';
        }
        
        function hideCommentForm(solutionId) {
            document.getElementById('comment-form-' + solutionId).style.display = 'none';
        }
        
        function addComment(solutionId) {
            const content = document.getElementById('comment-content-' + solutionId).value;
            if (content.trim()) {
                vscode.postMessage({ command: 'addComment', solutionId: solutionId, content: content });
                document.getElementById('comment-content-' + solutionId).value = '';
                hideCommentForm(solutionId);
            }
        }
        
        function submitSolution() {
            const description = document.getElementById('solution-description').value;
            const language = document.getElementById('solution-language').value;
            const code = document.getElementById('solution-code').value;
            
            if (description.trim() && code.trim()) {
                vscode.postMessage({ 
                    command: 'submitSolution', 
                    description: description, 
                    language: language, 
                    code: code 
                });
                
                // Clear form
                document.getElementById('solution-description').value = '';
                document.getElementById('solution-code').value = '';
                showTab('solutions');
            }
        }
        
        function findBuddies() {
            vscode.postMessage({ command: 'findBuddies' });
        }
        
        function requestHelp() {
            const question = document.getElementById('help-question').value;
            if (question.trim()) {
                vscode.postMessage({ command: 'requestHelp', question: question });
                document.getElementById('help-question').value = '';
            }
        }
        
        // Set initial active tab
        document.querySelector('.tab').classList.add('active');
    </script>
</body>
</html>`;
    }
    
    private _upvoteSolution(solutionId: string) {
        try {
            CollaborationService.upvoteSolution(this._context, solutionId);
            vscode.window.showInformationMessage('Solution upvoted!');
            this._update();
        } catch (error) {
            vscode.window.showErrorMessage('Failed to upvote solution: ' + error);
        }
    }
    
    private _downvoteSolution(solutionId: string) {
        try {
            CollaborationService.downvoteSolution(this._context, solutionId);
            vscode.window.showInformationMessage('Solution downvoted!');
            this._update();
        } catch (error) {
            vscode.window.showErrorMessage('Failed to downvote solution: ' + error);
        }
    }
    
    private _addComment(solutionId: string, content: string) {
        try {
            CollaborationService.addCommentToSolution(this._context, solutionId, content);
            vscode.window.showInformationMessage('Comment added!');
            this._update();
        } catch (error) {
            vscode.window.showErrorMessage('Failed to add comment: ' + error);
        }
    }
    
    private _submitSolution(code: string, description: string, language: string) {
        if (!this._currentTaskId || !this._currentRoadmapId) {
            vscode.window.showErrorMessage('Cannot submit solution: missing task or roadmap context');
            return;
        }
        
        try {
            CollaborationService.submitSolution(
                this._context,
                this._currentTaskId,
                this._currentRoadmapId,
                code,
                description,
                language
            );
            vscode.window.showInformationMessage('Solution submitted successfully!');
            this._update();
        } catch (error) {
            vscode.window.showErrorMessage('Failed to submit solution: ' + error);
        }
    }
    
    private _requestHelp(question: string) {
        if (!this._currentTaskId) {
            vscode.window.showErrorMessage('Cannot request help: missing task context');
            return;
        }
        
        CollaborationService.requestCommunityHelp(this._context, this._currentTaskId, question);
    }
    
    private _findBuddies() {
        const buddies: StudyBuddy[] = CollaborationService.getStudyBuddies(this._context);
        
        // Create HTML for buddies
        const buddiesHtml = buddies.map(buddy => `
            <div class="buddy-card">
                <div class="buddy-header">
                    <div class="buddy-name">${buddy.userName}</div>
                    <div class="buddy-score">${buddy.compatibilityScore}% match</div>
                </div>
                <div class="buddy-level">Level: ${buddy.skillLevel}</div>
                <div class="buddy-skills">
                    ${buddy.interests.map(interest => `<span class="skill-tag">${interest}</span>`).join('')}
                </div>
                <div class="buddy-last-active">Last active: ${buddy.lastActive.toLocaleDateString()}</div>
                <button class="btn" style="margin-top: 10px; width: 100%;">Connect</button>
            </div>
        `).join('');
        
        // Update the buddies results section
        this._panel.webview.postMessage({
            command: 'updateBuddies',
            html: `<div class="buddies-grid">${buddiesHtml}</div>`
        });
    }
    
    private _escapeHtml(text: string): string {
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
    
    private _getNonce() {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }
}