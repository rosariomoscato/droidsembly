// Inspect generated text/parse data only. Never execute quote() output or injected module source.
import { createRequire } from 'node:module';
import { createManualModuleSource } from '@vitest/mocker/node';
import { SourceMapConsumer } from 'source-map-js';
import { parseAst } from 'rolldown/parseAst';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const shell = require('shell-quote') as { quote(tokens: (string | { comment: string })[]): string; parse(input: string): unknown[] };
// Upstream runtime supports indexed maps, but its declarations only describe flat maps.
const consumeIndexed = (map: unknown) => new SourceMapConsumer(map as ConstructorParameters<typeof SourceMapConsumer>[0]);

describe('shell-quote comment-boundary safety', () => {
  it.each(['\n', '\r', '\u2028', '\u2029'])('rejects line terminator %j after a comment token', terminator => {
    expect(() => shell.quote(['echo', 'fixture', { comment: 'fixture' }, `a${terminator}INERT_MARKER;#`])).toThrow(TypeError);
  });

  it('still round-trips ordinary literal arguments without invoking any shell', () => {
    const args = ['fixture', 'two words', "it's literal", '$(INERT_MARKER)', 'C:\\fixture path'];
    expect(shell.parse(shell.quote(args))).toEqual(args);
  });
});

describe('indexed source-map offset validation', () => {
  const leaf = () => ({ version: 3, sources: ['fixture.js'], names: [], mappings: 'AAAA' });
  const indexed = (line: number, column = 0) => ({ version: 3, sections: [{ offset: { line, column }, map: leaf() }] });

  it.each([-1, 0.5, NaN, Infinity, 10_000_001])('rejects invalid or excessive line offset %s before expansion', line => {
    // Only construct the consumer. Never serialize/expand an enormous map on the old package.
    expect(() => consumeIndexed(indexed(line))).toThrow();
  });

  it('applies the bound to accumulated nested offsets', () => {
    const map = { version: 3, sections: [{ offset: { line: 6_000_000, column: 0 }, map: indexed(6_000_000) }] };
    expect(() => consumeIndexed(map)).toThrow(/nested sections/);
  });

  it('retains normal indexed mappings', () => {
    const consumer = consumeIndexed(indexed(3));
    expect(consumer.originalPositionFor({ line: 4, column: 1 })).toMatchObject({ source: 'fixture.js', line: 1, column: 0 });
  });
});

describe('Vitest manual-mock module generation', () => {
  it('keeps attacker-shaped URLs inside a single string literal', () => {
    const url = 'x"); globalThis.__INERT_FIXTURE = 1; void("';
    const source = createManualModuleSource(url, ['fixture']);
    const tree = parseAst(source);
    const first = tree.body[0];
    if (first.type !== 'VariableDeclaration') throw new Error('Expected factory module declaration');
    const initial = first.declarations[0].init;
    if (initial?.type !== 'AwaitExpression' || initial.argument.type !== 'CallExpression') throw new Error('Expected awaited factory call');
    expect(initial.argument.arguments).toHaveLength(1);
    expect(initial.argument.arguments[0]).toMatchObject({ type: 'Literal', value: url });
    expect(source).toContain(JSON.stringify(url));
  });

  it('retains ordinary mock module generation', () => {
    const source = createManualModuleSource('/fixture/module.ts', ['fixture']);
    expect(source).toContain('getFactoryModule("/fixture/module.ts")');
    expect(source).toContain('fixture');
  });
});
