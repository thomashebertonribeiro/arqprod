import { BadRequestException } from '@nestjs/common';
import { Attribute, AttributeDataType } from './attribute.entity';
import { AttributeValidationRule } from './attribute-validation-rule.entity';
import { AttributeOption } from './attribute-option.entity';

export interface ValidatedValue {
  /** Valor normalizado para gravação no JSONB */
  valor: unknown;
}

export class AttributeValidationError extends BadRequestException {
  constructor(message: string) {
    super({ message, error: 'ValidationError', statusCode: 400 });
  }
}

function formatError(attr: Attribute, rule: AttributeValidationRule | undefined, msg: string): never {
  throw new AttributeValidationError(rule?.mensagemErro ?? `${attr.chave}: ${msg}`);
}

/**
 * Valida um valor contra a definição do atributo (tipo, opções e regras).
 * Regra de negócio central: a validação acontece na camada de aplicação,
 * antes de persistir — nenhum schema de banco é alterado.
 */
export function validateAttributeValue(
  attr: Attribute,
  value: unknown,
): ValidatedValue {
  const rule = attr.validationRules?.[0];
  const isRequired = rule?.obrigatorio ?? false;

  if (value === null || value === undefined || value === '') {
    if (isRequired) formatError(attr, rule, 'valor obrigatório');
    return { valor: null };
  }

  switch (attr.tipoDado) {
    case 'texto': {
      if (typeof value !== 'string') formatError(attr, rule, 'deve ser texto');
      const str = value as string;
      if (rule?.tamanhoMax != null && str.length > rule.tamanhoMax) {
        formatError(attr, rule, `máximo ${rule.tamanhoMax} caracteres`);
      }
      if (rule?.regex && !new RegExp(rule.regex).test(str)) {
        formatError(attr, rule, 'não atende ao padrão exigido');
      }
      return { valor: str };
    }
    case 'numero': {
      const num = Number(value);
      if (typeof value !== 'number' || Number.isNaN(num)) {
        formatError(attr, rule, 'deve ser número');
      }
      if (rule?.valorMin != null && num < Number(rule.valorMin)) {
        formatError(attr, rule, `mínimo ${rule.valorMin}`);
      }
      if (rule?.valorMax != null && num > Number(rule.valorMax)) {
        formatError(attr, rule, `máximo ${rule.valorMax}`);
      }
      return { valor: num };
    }
    case 'booleano': {
      if (typeof value !== 'boolean') formatError(attr, rule, 'deve ser booleano');
      return { valor: value };
    }
    case 'data': {
      const d = new Date(value as string);
      if (Number.isNaN(d.getTime())) formatError(attr, rule, 'data inválida');
      return { valor: d.toISOString() };
    }
    case 'lista': {
      if (typeof value !== 'string') formatError(attr, rule, 'deve ser string');
      assertOption(attr, value, rule);
      return { valor: value as string };
    }
    case 'lista_multipla': {
      if (!Array.isArray(value)) formatError(attr, rule, 'deve ser array');
      for (const v of value as unknown[]) {
        if (typeof v !== 'string') formatError(attr, rule, 'itens devem ser strings');
        assertOption(attr, v, rule);
      }
      return { valor: value };
    }
    default:
      return { valor: value };
  }
}

function assertOption(
  attr: Attribute,
  value: string,
  rule: AttributeValidationRule | undefined,
): void {
  const options: AttributeOption[] = attr.options ?? [];
  const active = options.filter((o) => o.status === 'ativo');
  if (active.length && !active.some((o) => o.valor === value)) {
    formatError(
      attr,
      rule,
      `"${value}" não é uma opção válida (${active.map((o) => o.valor).join(', ')})`,
    );
  }
}

export const ATTRIBUTE_DATA_TYPES: AttributeDataType[] = [
  'texto',
  'numero',
  'booleano',
  'lista',
  'lista_multipla',
  'data',
];

export function normalizeChave(raw: string): string {
  return raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '');
}