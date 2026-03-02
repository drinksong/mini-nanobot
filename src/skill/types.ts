/**
 * 技能系统类型定义
 *
 * 技能是 SKILL.md 文件，包含：
 * 1. YAML frontmatter - 元数据（名称、描述、依赖等）
 * 2. Markdown 内容 - 教 Agent 如何使用工具或完成任务
 */

/**
 * 技能元数据（YAML frontmatter）
 */
export interface SkillMetadata {
  /** 技能名称 */
  name: string;
  /** 技能描述 */
  description: string;
  /** 是否始终加载 */
  always?: boolean;
  /** 额外的 JSON 元数据 */
  metadata?: string;
}

/**
 * 解析后的 octobot 元数据
 */
export interface NanobotMetadata {
  /** 表情符号 */
  emoji?: string;
  /** 支持的操作系统 */
  os?: string[];
  /** 依赖要求 */
  requires?: {
    /** 需要的二进制文件 */
    bins?: string[];
    /** 需要的环境变量 */
    env?: string[];
  };
}

/**
 * 技能信息
 */
export interface SkillInfo {
  /** 技能名称 */
  name: string;
  /** 文件路径 */
  path: string;
  /** 来源：builtin 或 workspace */
  source: 'builtin' | 'workspace';
  /** 是否可用（依赖是否满足） */
  available: boolean;
  /** 元数据 */
  meta: SkillMetadata;
  /** 解析后的 octobot 元数据 */
  octobotMeta: NanobotMetadata;
}

/**
 * 技能内容
 */
export interface Skill {
  /** 技能信息 */
  info: SkillInfo;
  /** 完整内容（包含 frontmatter） */
  rawContent: string;
  /** 内容（不包含 frontmatter） */
  content: string;
}

/**
 * 技能加载选项
 */
export interface SkillLoadOptions {
  /** 是否过滤不可用的技能 */
  filterUnavailable?: boolean;
  /** 是否包含 frontmatter */
  includeFrontmatter?: boolean;
}

/**
 * 默认技能元数据
 */
export const DEFAULT_SKILL_METADATA: SkillMetadata = {
  name: '',
  description: '',
};

/**
 * 内置技能目录（相对于项目根目录）
 */
export const BUILTIN_SKILLS_DIR = './skills';
