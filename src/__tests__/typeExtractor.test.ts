// src/__tests__/typeExtractor.test.ts

import { describe, test, expect } from 'bun:test';
import { Project } from 'ts-morph';
import { TypeExtractor } from '../core/typeExtractor';

describe('TypeExtractor', () => {
  describe('extractProperties', () => {
    test('必須プロパティをrequired: trueとして抽出', () => {
      const project = new Project();
      const sourceFile = project.createSourceFile('test.ts', `
        type User = {
          id: string;
          name: string;
        };
      `);

      const typeExtractor = new TypeExtractor(sourceFile);
      const userType = sourceFile.getTypeAlias('User')!.getType();
      const props = typeExtractor.extractProperties(userType);

      expect(props).toHaveLength(2);

      const idProp = props.find(p => p.name === 'id');
      expect(idProp).toBeDefined();
      expect(idProp!.required).toBe(true);
      expect(idProp!.type).toBe('string');

      const nameProp = props.find(p => p.name === 'name');
      expect(nameProp).toBeDefined();
      expect(nameProp!.required).toBe(true);
    });

    test('オプショナルプロパティをrequired: falseとして抽出', () => {
      const project = new Project();
      const sourceFile = project.createSourceFile('test.ts', `
        type User = {
          id: string;
          email?: string;
          nickname?: string;
        };
      `);

      const typeExtractor = new TypeExtractor(sourceFile);
      const userType = sourceFile.getTypeAlias('User')!.getType();
      const props = typeExtractor.extractProperties(userType);

      expect(props).toHaveLength(3);

      const idProp = props.find(p => p.name === 'id');
      expect(idProp).toBeDefined();
      expect(idProp!.required).toBe(true);

      const emailProp = props.find(p => p.name === 'email');
      expect(emailProp).toBeDefined();
      expect(emailProp!.required).toBe(false);
      expect(emailProp!.type).toBe('string');

      const nicknameProp = props.find(p => p.name === 'nickname');
      expect(nicknameProp).toBeDefined();
      expect(nicknameProp!.required).toBe(false);
    });

    test('プリミティブ型を正しく抽出', () => {
      const project = new Project();
      const sourceFile = project.createSourceFile('test.ts', `
        type Data = {
          str: string;
          num: number;
          bool: boolean;
        };
      `);

      const typeExtractor = new TypeExtractor(sourceFile);
      const dataType = sourceFile.getTypeAlias('Data')!.getType();
      const props = typeExtractor.extractProperties(dataType);

      expect(props.find(p => p.name === 'str')!.type).toBe('string');
      expect(props.find(p => p.name === 'num')!.type).toBe('number');
      expect(props.find(p => p.name === 'bool')!.type).toBe('boolean');
    });

    test('リテラル型にクォートを付加', () => {
      const project = new Project();
      const sourceFile = project.createSourceFile('test.ts', `
        type Status = {
          state: 'active' | 'inactive';
        };
      `);

      const typeExtractor = new TypeExtractor(sourceFile);
      const statusType = sourceFile.getTypeAlias('Status')!.getType();
      const props = typeExtractor.extractProperties(statusType);

      const stateProp = props.find(p => p.name === 'state');
      expect(stateProp).toBeDefined();
      expect(stateProp!.type).toBe("'active' | 'inactive'");
    });

    test('配列型を正しく抽出', () => {
      const project = new Project();
      const sourceFile = project.createSourceFile('test.ts', `
        type Data = {
          items: string[];
          numbers: number[];
        };
      `);

      const typeExtractor = new TypeExtractor(sourceFile);
      const dataType = sourceFile.getTypeAlias('Data')!.getType();
      const props = typeExtractor.extractProperties(dataType);

      expect(props.find(p => p.name === 'items')!.type).toBe('string[]');
      expect(props.find(p => p.name === 'numbers')!.type).toBe('number[]');
    });
  });
});
