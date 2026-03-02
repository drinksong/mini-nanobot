/**
 * 技能管理器
 *
 * 负责：
 * 1. 管理所有技能的加载和缓存
 * 2. 构建技能摘要（用于 Agent 上下文）
 * 3. 提供技能查询接口
 * 4. 支持渐进式加载（只加载摘要，需要时再读取完整内容）
 */

import { SkillLoader } from './loader';
import { Skill, SkillInfo, SkillLoadOptions } from './types';

export class SkillManager {
  private loader: SkillLoader;
  private cache: Map<string, Skill> = new Map();

  constructor(workspace: string, builtinDir?: string) {
    this.loader = new SkillLoader(workspace, builtinDir);
  }

  /**
   * 获取所有技能摘要
   *
   * 返回 XML 格式的技能列表，用于插入到 Agent 上下文中
   * Agent 可以根据摘要知道有哪些技能，需要时再读取完整内容
   */
  async buildSkillsSummary(): Promise<string> {
    const allSkills = await this.loader.listSkills({ filterUnavailable: false });
    if (allSkills.length === 0) {
      return '';
    }

    const lines: string[] = ['<skills>'];

    for (const skill of allSkills) {
      const name = this._escapeXml(skill.name);
      const desc = this._escapeXml(skill.meta.description || skill.name);
      const available = skill.available;

      lines.push(`  <skill available="${available}">`);
      lines.push(`    <name>${name}</name>`);
      lines.push(`    <description>${desc}</description>`);
      lines.push(`    <location>${skill.path}</location>`);

      // 如果不可用，显示缺失的依赖
      if (!available) {
        const missing = this.loader.getMissingRequirements(skill);
        if (missing) {
          lines.push(`    <requires>${this._escapeXml(missing)}</requires>`);
        }
      }

      lines.push('  </skill>');
    }

    lines.push('</skills>');
    return lines.join('\n');
  }

  /**
   * 加载特定技能的完整内容
   */
  async loadSkillContent(name: string): Promise<string | null> {
    // 检查缓存
    if (this.cache.has(name)) {
      return this.cache.get(name)!.content;
    }

    // 加载技能
    const skill = await this.loader.loadSkill(name);
    if (!skill) {
      return null;
    }

    // 缓存
    this.cache.set(name, skill);
    return skill.content;
  }

  /**
   * 加载多个技能的内容（用于 Agent 上下文）
   */
  async loadSkillsForContext(skillNames: string[]): Promise<string> {
    const parts: string[] = [];

    for (const name of skillNames) {
      const content = await this.loadSkillContent(name);
      if (content) {
        parts.push(`### Skill: ${name}\n\n${content}`);
      }
    }

    return parts.join('\n\n---\n\n');
  }

  /**
   * 获取始终加载的技能内容
   */
  async getAlwaysSkillsContent(): Promise<string> {
    const alwaysSkills = await this.loader.getAlwaysSkills();
    if (alwaysSkills.length === 0) {
      return '';
    }

    const skillNames = alwaysSkills.map((s) => s.name);
    return this.loadSkillsForContext(skillNames);
  }

  /**
   * 获取所有可用技能
   */
  async listAvailableSkills(): Promise<SkillInfo[]> {
    return this.loader.listSkills({ filterUnavailable: true });
  }

  /**
   * 获取技能信息（不包含内容）
   */
  async getSkillInfo(name: string): Promise<SkillInfo | null> {
    const skills = await this.loader.listSkills({ filterUnavailable: false });
    return skills.find((s) => s.name === name) || null;
  }

  /**
   * 检查技能是否可用
   */
  async isSkillAvailable(name: string): Promise<boolean> {
    const info = await this.getSkillInfo(name);
    return info?.available || false;
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * 获取缓存大小
   */
  getCacheSize(): number {
    return this.cache.size;
  }

  /**
   * XML 转义
   */
  private _escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
