// src/core/typeExtractor.ts

import { Type, SourceFile, Symbol as TsSymbol } from 'ts-morph';
import type { ParamInfo } from '../types';

export class TypeExtractor {
  constructor(private readonly sourceFile: SourceFile) {}

  extractProperties(type: Type): readonly ParamInfo[] {
    const properties = type.getProperties();
    return properties.map(prop => this.extractPropertyInfo(prop, type));
  }

  private extractPropertyInfo(symbol: TsSymbol, parentType: Type): ParamInfo {
    const name = symbol.getName();
    const declaration = symbol.getValueDeclaration();

    const propType = declaration?.getType() ?? parentType.getProperty(name)?.getTypeAtLocation(this.sourceFile);
    const typeText = propType ? this.formatType(propType) : 'unknown';

    const isOptional = symbol.isOptional();

    return {
      name,
      type: typeText,
      required: !isOptional,
    };
  }

  private formatType(type: Type): string {
    if (type.isString()) return 'string';
    if (type.isNumber()) return 'number';
    if (type.isBoolean()) return 'boolean';
    if (type.isNull()) return 'null';
    if (type.isUndefined()) return 'undefined';

    if (type.isStringLiteral()) {
      return `'${type.getLiteralValue()}'`;
    }
    if (type.isNumberLiteral()) {
      return String(type.getLiteralValue());
    }
    if (type.isBooleanLiteral()) {
      return String(type.getLiteralValue());
    }

    if (type.isUnion()) {
      const types = type.getUnionTypes();
      return types.map(t => this.formatType(t)).join(' | ');
    }

    if (type.isArray()) {
      return this.formatArrayType(type);
    }

    if (type.isObject() && !type.isArray()) {
      return this.formatObjectType(type);
    }

    return type.getText(this.sourceFile);
  }

  private formatArrayType(type: Type): string {
    const elementType = type.getArrayElementType();
    if (!elementType) {
      return type.getText(this.sourceFile);
    }
    return `${this.formatType(elementType)}[]`;
  }

  private formatObjectType(type: Type): string {
    const props = type.getProperties();
    if (props.length === 0) {
      return type.getText(this.sourceFile);
    }

    const propsText = props
      .map(p => {
        const propType = p.getValueDeclaration()?.getType();
        const typeStr = propType ? this.formatType(propType) : 'unknown';
        return `${p.getName()}: ${typeStr}`;
      })
      .join('; ');
    return `{ ${propsText}; }`;
  }
}
