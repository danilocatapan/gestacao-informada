import { defineCollection, reference } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const status = z.enum(['draft', 'in_review', 'approved', 'archived']);
const contentType = z.enum(['article', 'institutional-page', 'legal-document', 'checklist', 'glossary-entry']);
const sourceType = z.enum(['guideline', 'review', 'law', 'institutional', 'other']);
const riskDomain = z.enum(['clinical', 'psychological', 'legal']);
const editorialRole = z.enum(['author', 'clinical_reviewer', 'psychological_reviewer', 'legal_reviewer', 'editorial_approver']);

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
  reviewedBy: reference('contributors'),
  reviewedAt: z.coerce.date(),
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

const legal = defineCollection({
  loader: glob({ base: './src/content/legal', pattern: '**/*.{md,mdx}' }),
  schema: z
    .object({
      title: z.string().min(1),
      description: z.string().min(1),
      contentType: z.literal('legal-document'),
      clinical: z.literal(false),
      riskDomains: z.array(riskDomain),
      status,
      updatedAt: z.coerce.date(),
    })
    .superRefine((document, ctx) => {
      if (!document.riskDomains.includes('legal')) {
        ctx.addIssue({ code: 'custom', message: 'Documento jurídico deve declarar o domínio legal.', path: ['riskDomains'] });
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
    editorialRoles: z.array(editorialRole).min(1),
    credentials: z.string().min(1),
    bio: z.string().min(1),
  }),
});

const editorialRecords = defineCollection({
  loader: glob({ base: './src/content/editorial-records', pattern: '**/*.{json,yaml,yml}' }),
  schema: z.object({
    target: z.string().regex(/^(articles|pages|legal)\/[^/]+$/),
    event: z.enum(['submitted_for_review', 'domain_review', 'editorial_approval', 'status_transition']),
    actor: reference('contributors'),
    role: editorialRole,
    domain: riskDomain.optional(),
    decision: z.enum(['approved', 'rejected']).optional(),
    occurredAt: z.coerce.date(),
    contentUpdatedAt: z.coerce.date(),
    fromStatus: status.optional(),
    toStatus: status.optional(),
    justification: z.string().min(20),
  }),
});

export const collections = { pages, articles, legal, reviewNotes, contributors, editorialRecords };
