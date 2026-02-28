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
  constructor(private workspace: string = process.cwd()) {
    super();
  }

  get name() { return 'exec'; }
  get description() { return 'Execute a shell command and return its output. Use with caution.'; }
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
    try {
      const cwd = working_dir ? path.resolve(this.workspace, working_dir) : this.workspace;
      const { stdout, stderr } = await execAsync(command, { cwd, timeout: 60000 });
      
      let result = '';
      if (stdout) result += stdout;
      if (stderr) result += `\n[stderr]\n${stderr}`;
      
      return result || '(no output)';
    } catch (e: any) {
      return `Error executing command: ${e.message}`;
    }
  }
}
