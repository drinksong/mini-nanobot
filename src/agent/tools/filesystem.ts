import * as fs from 'fs/promises';
import * as path from 'path';
import { exec as execCmd } from 'child_process';
import { promisify } from 'util';
import { Tool, ToolParams } from './base';

const execAsync = promisify(execCmd);

export class ReadFileTool extends Tool {
  constructor(private workspace: string = process.cwd()) {
    super();
  }

  get name() { return 'read_file'; }
  get description() { return 'Read the contents of a file at the given path.'; }
  get parameters() {
    return {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'The file path to read' }
      },
      required: ['path']
    };
  }

  async execute({ path: filePath }: ToolParams): Promise<string> {
    try {
      const resolvedPath = path.resolve(this.workspace, filePath);
      const content = await fs.readFile(resolvedPath, 'utf-8');
      return content;
    } catch (e) {
      return `Error reading file: ${e}`;
    }
  }
}

export class WriteFileTool extends Tool {
  constructor(private workspace: string = process.cwd()) {
    super();
  }

  get name() { return 'write_file'; }
  get description() { return 'Write content to a file at the given path.'; }
  get parameters() {
    return {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'The file path to write to' },
        content: { type: 'string', description: 'The content to write' }
      },
      required: ['path', 'content']
    };
  }

  async execute({ path: filePath, content }: ToolParams): Promise<string> {
    try {
      const resolvedPath = path.resolve(this.workspace, filePath);
      const dir = path.dirname(resolvedPath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(resolvedPath, content, 'utf-8');
      return `Successfully wrote ${content.length} bytes to ${resolvedPath}`;
    } catch (e) {
      return `Error writing file: ${e}`;
    }
  }
}

export class EditFileTool extends Tool {
  constructor(private workspace: string = process.cwd()) {
    super();
  }

  get name() { return 'edit_file'; }
  get description() { return 'Edit a file by replacing old_text with new_text. The old_text must exist exactly in the file.'; }
  get parameters() {
    return {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'The file path to edit' },
        old_text: { type: 'string', description: 'The exact text to find and replace' },
        new_text: { type: 'string', description: 'The text to replace with' }
      },
      required: ['path', 'old_text', 'new_text']
    };
  }

  async execute({ path: filePath, old_text, new_text }: ToolParams): Promise<string> {
    try {
      const resolvedPath = path.resolve(this.workspace, filePath);
      const content = await fs.readFile(resolvedPath, 'utf-8');
      
      if (!content.includes(old_text)) {
        return `Error: old_text not found in file. The exact text must exist to perform replacement.`;
      }
      
      const newContent = content.replace(old_text, new_text);
      await fs.writeFile(resolvedPath, newContent, 'utf-8');
      
      return `Successfully replaced text in ${resolvedPath}`;
    } catch (e) {
      return `Error editing file: ${e}`;
    }
  }
}

export class ListDirTool extends Tool {
  constructor(private workspace: string = process.cwd()) {
    super();
  }

  get name() { return 'list_dir'; }
  get description() { return 'List the contents of a directory.'; }
  get parameters() {
    return {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'The directory path to list' }
      },
      required: ['path']
    };
  }

  async execute({ path: dirPath }: ToolParams): Promise<string> {
    try {
      const resolvedPath = path.resolve(this.workspace, dirPath);
      const entries = await fs.readdir(resolvedPath, { withFileTypes: true });
      
      const result = entries.map(entry => {
        const type = entry.isDirectory() ? '[DIR]' : '[FILE]';
        return `${type} ${entry.name}`;
      }).join('\n');
      
      return result || '(empty directory)';
    } catch (e) {
      return `Error listing directory: ${e}`;
    }
  }
}

export class ExecTool extends Tool {
  // 危险命令模式列表
  private denyPatterns: RegExp[] = [
    /\brm\s+-[rf]{1,2}\b/,          // rm -r, rm -rf, rm -fr
    /\bdel\s+\/[fq]\b/,             // del /f, del /q
    /\brmdir\s+\/s\b/,              // rmdir /s
    /(?:^|[;&|]\s*)format\b/,       // format (作为独立命令)
    /\b(mkfs|diskpart)\b/,          // 磁盘操作
    /\bdd\s+if=/,                   // dd
    />\s*\/dev\/sd/,                // 写入磁盘
    /\b(shutdown|reboot|poweroff)\b/, // 系统关机/重启
    /:\(\)\s*\{.*\};\s*:/,          // fork bomb
  ];

  // 允许的模式（如果设置了，只允许匹配这些的命令）
  private allowPatterns?: RegExp[];
  
  // 是否限制在工作区内
  private restrictToWorkspace: boolean;
  
  // 命令超时时间（毫秒）
  private timeout: number;

  constructor(
    private workspace: string = process.cwd(),
    options: {
      timeout?: number;
      allowPatterns?: RegExp[];
      restrictToWorkspace?: boolean;
    } = {}
  ) {
    super();
    this.timeout = options.timeout ?? 60000;
    this.allowPatterns = options.allowPatterns;
    this.restrictToWorkspace = options.restrictToWorkspace ?? false;
  }

  get name() { return 'exec'; }
  get description() { 
    return 'Execute a shell command and return its output. Use with caution. ' +
           'Some dangerous commands are blocked for safety.'; 
  }
  get parameters() {
    return {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'The shell command to execute' },
        working_dir: { type: 'string', description: 'Optional working directory for the command' }
      },
      required: ['command']
    };
  }

  async execute({ command, working_dir }: ToolParams): Promise<string> {
    const cwd = working_dir ? path.resolve(this.workspace, working_dir) : this.workspace;
    
    // 安全检查
    const guardError = this._guardCommand(command, cwd);
    if (guardError) {
      return `Error: ${guardError}`;
    }

    try {
      const { stdout, stderr } = await execAsync(command, { 
        cwd, 
        timeout: this.timeout 
      });
      
      let result = '';
      if (stdout) result += stdout;
      if (stderr) result += `\n[stderr]\n${stderr}`;
      
      // 截断过长的输出
      const maxLen = 10000;
      if (result.length > maxLen) {
        result = result.substring(0, maxLen) + 
                 `\n... (truncated, ${result.length - maxLen} more chars)`;
      }
      
      return result || '(no output)';
    } catch (e: any) {
      if (e.killed && e.signal === 'SIGTERM') {
        return `Error: Command timed out after ${this.timeout}ms`;
      }
      return `Error executing command: ${e.message}`;
    }
  }

  /**
   * 命令安全检查
   */
  private _guardCommand(command: string, cwd: string): string | null {
    const cmd = command.trim().toLowerCase();

    // 检查禁止模式
    for (const pattern of this.denyPatterns) {
      if (pattern.test(cmd)) {
        return 'Command blocked by safety guard (dangerous pattern detected)';
      }
    }

    // 检查允许模式（如果设置了白名单）
    if (this.allowPatterns && this.allowPatterns.length > 0) {
      const allowed = this.allowPatterns.some(p => p.test(cmd));
      if (!allowed) {
        return 'Command blocked by safety guard (not in allowlist)';
      }
    }

    // 检查路径遍历（如果限制在工作区）
    if (this.restrictToWorkspace) {
      if (cmd.includes('..\\') || cmd.includes('../')) {
        return 'Command blocked by safety guard (path traversal detected)';
      }

      // 检查绝对路径
      const winPaths = cmd.match(/[a-z]:\\[^\\"']+/gi);
      const posixPaths = cmd.match(/(?:^|[\s|>])(\/[^\s"'>]+)/g);
      
      const cwdResolved = path.resolve(cwd);
      
      for (const p of [...(winPaths || []), ...(posixPaths || [])]) {
        const cleanPath = p.trim().replace(/^\//, '/');
        const resolved = path.resolve(cleanPath);
        if (!resolved.startsWith(cwdResolved)) {
          return 'Command blocked by safety guard (access outside workspace)';
        }
      }
    }

    return null;
  }
}
