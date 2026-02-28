export interface ToolParams {
  [key: string]: any;
}

export interface ToolSchema {
  type: string;
  function: {
    name: string;
    description: string;
    parameters: {
      type: string;
      properties: Record<string, any>;
      required?: string[];
    };
  };
}

export abstract class Tool {
  abstract get name(): string;
  abstract get description(): string;
  abstract get parameters(): {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };

  abstract execute(params: ToolParams): Promise<string>;

  toSchema(): ToolSchema {
    return {
      type: 'function',
      function: {
        name: this.name,
        description: this.description,
        parameters: this.parameters,
      },
    };
  }

  validateParams(params: ToolParams): string[] {
    const errors: string[] = [];
    const required = this.parameters.required || [];

    for (const field of required) {
      if (!(field in params)) {
        errors.push(`Missing required parameter: ${field}`);
      }
    }

    return errors;
  }
}
