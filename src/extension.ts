import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

// git-cryptで暗号化されたファイルのパターンを格納
interface GitCryptPattern {
    pattern: string;
    isDirectory: boolean;
}

export function activate(context: vscode.ExtensionContext) {
    // FileDecorationProviderの実装
    const gitCryptDecorationProvider = new GitCryptDecorationProvider();
    
    // プロバイダーを登録
    const disposable = vscode.window.registerFileDecorationProvider(gitCryptDecorationProvider);
    context.subscriptions.push(disposable);

    // .gitattributesファイルの変更を監視
    const watcher = vscode.workspace.createFileSystemWatcher('**/.gitattributes');
    watcher.onDidChange(() => gitCryptDecorationProvider.refresh());
    watcher.onDidCreate(() => gitCryptDecorationProvider.refresh());
    watcher.onDidDelete(() => gitCryptDecorationProvider.refresh());
    context.subscriptions.push(watcher);

    // 設定変更を監視
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('gitCryptDecorator')) {
                gitCryptDecorationProvider.refresh();
            }
        })
    );

    console.log('Git Crypt Decorator is now active!');
}

class GitCryptDecorationProvider implements vscode.FileDecorationProvider {
    private _onDidChangeFileDecorations: vscode.EventEmitter<vscode.Uri | vscode.Uri[] | undefined> = new vscode.EventEmitter<vscode.Uri | vscode.Uri[] | undefined>();
    readonly onDidChangeFileDecorations: vscode.Event<vscode.Uri | vscode.Uri[] | undefined> = this._onDidChangeFileDecorations.event;

    private gitCryptPatterns: Map<string, GitCryptPattern[]> = new Map();

    constructor() {
        this.loadGitCryptPatterns();
    }

    refresh(): void {
        this.loadGitCryptPatterns();
        this._onDidChangeFileDecorations.fire(undefined);
    }

    provideFileDecoration(uri: vscode.Uri): vscode.FileDecoration | undefined {
        // ワークスペースフォルダを取得
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
        if (!workspaceFolder) {
            return undefined;
        }

        // このワークスペースのパターンを取得
        const patterns = this.gitCryptPatterns.get(workspaceFolder.uri.fsPath);
        if (!patterns || patterns.length === 0) {
            return undefined;
        }

        // ファイルパスがgit-cryptパターンにマッチするか確認
        const relativePath = path.relative(workspaceFolder.uri.fsPath, uri.fsPath);
        if (this.matchesGitCryptPattern(relativePath, patterns)) {
            const config = vscode.workspace.getConfiguration('gitCryptDecorator');
            return {
                badge: config.get<string>('badge', '🔒'),
                tooltip: config.get<string>('tooltip', 'Git-Crypt暗号化ファイル'),
                color: new vscode.ThemeColor(config.get<string>('color', 'editorInfo.foreground'))
            };
        }

        return undefined;
    }

    private loadGitCryptPatterns(): void {
        this.gitCryptPatterns.clear();

        // 各ワークスペースフォルダをチェック
        vscode.workspace.workspaceFolders?.forEach(folder => {
            const gitAttributesPath = path.join(folder.uri.fsPath, '.gitattributes');
            if (fs.existsSync(gitAttributesPath)) {
                const patterns = this.parseGitAttributes(gitAttributesPath);
                if (patterns.length > 0) {
                    this.gitCryptPatterns.set(folder.uri.fsPath, patterns);
                }
            }
        });
    }

    private parseGitAttributes(filePath: string): GitCryptPattern[] {
        const patterns: GitCryptPattern[] = [];
        
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const lines = content.split(/\r?\n/);

            for (const line of lines) {
                // コメントや空行をスキップ
                const trimmedLine = line.trim();
                if (!trimmedLine || trimmedLine.startsWith('#')) {
                    continue;
                }

                // filter=git-cryptを含む行を検索
                if (trimmedLine.includes('filter=git-crypt')) {
                    // パターン部分を抽出（最初の空白文字まで）
                    const pattern = trimmedLine.split(/\s+/)[0];
                    if (pattern) {
                        patterns.push({
                            pattern: pattern,
                            isDirectory: pattern.endsWith('/')
                        });
                    }
                }
            }
        } catch (error) {
            console.error(`Error parsing .gitattributes: ${error}`);
        }

        return patterns;
    }

    private matchesGitCryptPattern(filePath: string, patterns: GitCryptPattern[]): boolean {
        // Windowsパスを正規化
        const normalizedPath = filePath.replace(/\\/g, '/');

        for (const gitPattern of patterns) {
            if (this.matchGitPattern(normalizedPath, gitPattern.pattern)) {
                return true;
            }
        }

        return false;
    }

    private matchGitPattern(filePath: string, pattern: string): boolean {
        // 簡易的なgitパターンマッチング実装
        // 実際のgitのパターンマッチングはより複雑ですが、基本的なケースをカバー

        // ディレクトリパターンの処理
        if (pattern.endsWith('/')) {
            const dirPattern = pattern.slice(0, -1);
            return filePath.startsWith(dirPattern + '/') || filePath === dirPattern;
        }

        // ** パターンの処理
        if (pattern.includes('**')) {
            const regexPattern = pattern
                .replace(/\./g, '\\.')
                .replace(/\*\*/g, '.*')
                .replace(/\*/g, '[^/]*')
                .replace(/\?/g, '[^/]');
            
            const regex = new RegExp(`^${regexPattern}$`);
            return regex.test(filePath);
        }

        // * パターンの処理
        if (pattern.includes('*') || pattern.includes('?')) {
            const regexPattern = pattern
                .replace(/\./g, '\\.')
                .replace(/\*/g, '[^/]*')
                .replace(/\?/g, '[^/]');
            
            const regex = new RegExp(`^${regexPattern}$`);
            return regex.test(filePath);
        }

        // 完全一致
        return filePath === pattern;
    }
}

export function deactivate() {}