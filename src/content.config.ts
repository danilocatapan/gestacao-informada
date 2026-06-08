import { defineCollection, reference } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const status = z.enum(['draft', 'in_review', 'approved', 'archived']);
const contentType = z.enum(['article', 'institutional-page', 'legal-document', 'legal-guide', 'checklist', 'glossary-entry']);
const sourceType = z.enum(['guideline', 'review', 'law', 'institutional', 'other']);
const riskDomain = z.enum(['clinical', 'psychological', 'legal']);
const aiActivity = z.enum(['topic-research', 'source-triage', 'drafting', 'safety-audit']);
const publicSlug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

const source = z.object({
  title: z.string().min(1),
  url: z.url(),
  publisher: z.string().min(1),
  accessedAt: z.coerce.date(),
  type: sourceType,
});

const safetyReview = z.object({
  term: z.string().min(1),
  justification: z.string().min(20),
  auditedAt: z.coerce.date(),
});

const aiAssistance = z.object({
  activities: z.array(aiActivity).min(1),
  disclosure: z.string().min(40),
});

const inspirationCredit = z.object({
  name: z.string().min(1),
  url: z.url(),
  accessedAt: z.coerce.date(),
  purpose: z.string().min(20),
});

const referenceEntry = z.object({
  id: publicSlug,
  title: z.string().min(1),
  url: z.url(),
  publisher: z.string().min(1),
  type: z.enum(['guideline', 'scientific_article', 'medical_society', 'hospital', 'university', 'government', 'ngo', 'blog', 'instagram', 'book', 'law', 'institutional', 'review', 'other']),
  domain: z.enum(['clinical', 'legal', 'psychological', 'support', 'editorial_language']),
  authorityLevel: z.enum(['high', 'medium', 'low']),
  summary: z.string().min(1),
  usableFor: z.array(z.string().min(1)).min(1),
  notUsableFor: z.array(z.string().min(1)).default([]),
  limitations: z.array(z.string().min(1)).default([]),
  lastCheckedAt: z.coerce.date(),
});

const references = defineCollection({
  loader: glob({ base: './src/content/references', pattern: '**/*.{json,yaml,yml}' }),
  schema: referenceEntry,
});

const pages = defineCollection({
  loader: glob({ base: './src/content/pages', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    eyebrow: z.string().min(1),
    contentType,
    clinical: z.literal(false),
    riskDomains: z.array(riskDomain),
    status,
    updatedAt: z.coerce.date(),
  }),
});

const articles = defineCollection({
  loader: glob({ base: './src/content/articles', pattern: '**/*.{md,mdx}' }),
  schema: z
    .object({
      title: z.string().min(1),
      description: z.string().min(1),
      category: z.string().min(1),
      objective: z.string().min(1),
      audience: z.string().min(1),
      contentType: z.literal('article'),
      clinical: z.boolean(),
      riskDomains: z.array(riskDomain),
      status,
      authoredBy: reference('contributors').optional(),
      sources: z.array(source).default([]),
      lastUpdatedAt: z.coerce.date(),
      medicalDisclaimer: z.string().min(1),
      safetyReview: z.array(safetyReview).default([]),
      aiAssistance,
      inspirationCredits: z.array(inspirationCredit).default([]),
      glossaryTerms: z.array(reference('glossary')).default([]),
    })
    .superRefine((article, ctx) => {
      if (article.clinical && !article.riskDomains.includes('clinical')) {
        ctx.addIssue({ code: 'custom', message: 'Artigo clínico deve declarar o domínio clinical.', path: ['riskDomains'] });
      }
      if (article.status !== 'approved') return;
      if (!article.authoredBy) {
        ctx.addIssue({ code: 'custom', message: 'Artigo aprovado exige autoria.', path: ['authoredBy'] });
      }
      if (article.sources.length === 0) {
        ctx.addIssue({ code: 'custom', message: 'Artigo aprovado exige ao menos uma fonte.', path: ['sources'] });
      }
    }),
});

const glossary = defineCollection({
  loader: glob({ base: './src/content/glossary', pattern: '**/*.{md,mdx}' }),
  schema: z
    .object({
      term: z.string().min(1),
      slug: publicSlug,
      shortDefinition: z.string().min(1),
      fullDefinition: z.string().min(1),
      relatedTerms: z.array(reference('glossary')).default([]),
      sources: z.array(source).default([]),
      status,
      contentType: z.literal('glossary-entry'),
      clinical: z.literal(true),
      riskDomains: z.array(riskDomain),
      authoredBy: reference('contributors').optional(),
      lastUpdatedAt: z.coerce.date(),
      safetyReview: z.array(safetyReview).default([]),
    })
    .superRefine((entry, ctx) => {
      if (!entry.riskDomains.includes('clinical')) {
        ctx.addIssue({ code: 'custom', message: 'Termo clínico deve declarar o domínio clinical.', path: ['riskDomains'] });
      }
      if (entry.status !== 'approved') return;
      if (!entry.authoredBy) {
        ctx.addIssue({ code: 'custom', message: 'Termo aprovado exige autoria.', path: ['authoredBy'] });
      }
      if (entry.sources.length === 0) {
        ctx.addIssue({ code: 'custom', message: 'Termo aprovado exige ao menos uma fonte.', path: ['sources'] });
      }
    }),
});

const legal = defineCollection({
  loader: glob({ base: './src/content/legal', pattern: '**/*.{md,mdx}' }),
  schema: z
    .object({
      title: z.string().min(1),
      description: z.string().min(1),
      contentType: z.enum(['legal-document', 'legal-guide']),
      clinical: z.literal(false),
      riskDomains: z.array(riskDomain),
      status,
      updatedAt: z.coerce.date(),
      authoredBy: reference('contributors').optional(),
      sources: z.array(source).default([]),
      legalDisclaimer: z.string().min(1).optional(),
      legalBasis: z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]).optional(),
      slug: publicSlug.optional(),
    })
    .superRefine((document, ctx) => {
      if (!document.riskDomains.includes('legal')) {
        ctx.addIssue({ code: 'custom', message: 'Documento jurídico deve declarar o domínio legal.', path: ['riskDomains'] });
      }
      if (document.contentType === 'legal-guide' && document.slug) {
        ctx.addIssue({ code: 'custom', message: 'Guia jurídico usa uma rota pública dedicada e não deve declarar slug.', path: ['slug'] });
      }
      if (document.contentType === 'legal-document' && document.status !== 'approved' && document.slug) {
        ctx.addIssue({ code: 'custom', message: 'Documento jurídico não aprovado não pode declarar slug público.', path: ['slug'] });
      }
      if (document.contentType === 'legal-document' && document.status === 'approved' && !document.slug) {
        ctx.addIssue({ code: 'custom', message: 'Documento jurídico aprovado exige slug público.', path: ['slug'] });
      }
      if (document.contentType === 'legal-guide' && document.status === 'approved') {
        if (!document.authoredBy) {
          ctx.addIssue({ code: 'custom', message: 'Guia jurídico aprovado exige autoria.', path: ['authoredBy'] });
        }
        if (document.sources.length === 0) {
          ctx.addIssue({ code: 'custom', message: 'Guia jurídico aprovado exige ao menos uma fonte.', path: ['sources'] });
        }
        if (!document.legalDisclaimer) {
          ctx.addIssue({ code: 'custom', message: 'Guia jurídico aprovado exige disclaimer jurídico.', path: ['legalDisclaimer'] });
        }
      }
    }),
});

const reviewNotes = defineCollection({
  loader: glob({ base: './src/content/review-notes', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string().min(1),
    target: z.string().min(1),
    status: z.enum(['open', 'resolved']),
    createdAt: z.coerce.date(),
  }),
});

const contributors = defineCollection({
  loader: glob({ base: './src/content/contributors', pattern: '**/*.{json,yaml,yml}' }),
  schema: z.object({
    name: z.string().min(1),
    role: z.string().min(1),
    bio: z.string().min(1),
  }),
});

export const collections = { pages, articles, glossary, legal, references, reviewNotes, contributors };
