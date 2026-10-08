import { describe, expect, test } from 'bun:test';
import { readFileSync, existsSync } from 'node:fs';
import { databaseConfigured, getDb } from '../db/index';
const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
describe('portable Vercel deployment', () => {
 test('missing database configuration does not break rendering or invent a database', () => {
  const a=process.env.DATABASE_URL,b=process.env.POSTGRES_URL;
  delete process.env.DATABASE_URL;delete process.env.POSTGRES_URL;
  try {expect(databaseConfigured()).toBe(false);expect(()=>getDb()).toThrow('Database is not configured');}
  finally {if(a!==undefined)process.env.DATABASE_URL=a;if(b!==undefined)process.env.POSTGRES_URL=b;}
 });
 test('supports root and app-folder imports with the same server build', () => {
  for(const path of ['../../vercel.json','../vercel.json']) {
   const config=JSON.parse(read(path));expect(config.buildCommand).toContain('build:vercel');
   expect(config.installCommand).toContain('--frozen-lockfile');
   expect(config.outputDirectory).toBeUndefined();
  }
  expect(read('../vite.config.ts')).toContain('nitro()');
  expect(read('../vite.config.ts')).not.toContain('netlify');
 });
 test('uses original HD assets without a duplicated cache query', () => {
  const scenes=read('../src/scroll-scrub-scenes.ts');expect(scenes).not.toContain('?v=performance3?v=');
  for(let n=1;n<=4;n++)for(const suffix of ['.mp4','-poster.jpg','-mobile.mp4','-mobile-poster.jpg'])
   expect(existsSync(new URL(`../public/assets/world/department-${n}${suffix}`,import.meta.url))).toBe(true);
 });
});
