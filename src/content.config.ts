import { defineCollection, reference } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const status = z.enum(['draft', 'in-review', 'approved']);
const contentType = z.enum(['article', 'institutional-page', 'legal-document', 'checklist', 'glossary-entry']);
const sourceType = z.enum(['guideline', 'review', 'law', 'institutional', 'other']);

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
      status,
      authoredBy: reference('contributors').optional(),
      reviewedBy: reference('contributors').optional(),
      reviewedAt: z.coerce.date().optional(),
      sources: z.array(source).default([]),
      lastUpdatedAt: z.coerce.date(),
      medicalDisclaimer: z.string().min(1),
      safetyReview: z.array(safetyReview).default([]),
    })
    .superRefine((article, ctx) => {
      if (article.status !== 'approved' || !article.clinical) return;

      if (!article.authoredBy) {
        ctx.addIssue({ code: 'custom', message: 'Artigo aprovado exige autoria.', path: ['authoredBy'] });
      }
      if (!article.reviewedBy) {
        ctx.addIssue({ code: 'custom', message: 'Artigo aprovado exige revisor.', path: ['reviewedBy'] });
      }
      if (!article.reviewedAt) {
        ctx.addIssue({ code: 'custom', message: 'Artigo aprovado exige data de revisão.', path: ['reviewedAt'] });
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
      status,
      reviewedBy: z.string().optional(),
      reviewedAt: z.coerce.date().optional(),
      updatedAt: z.coerce.date(),
    })
    .superRefine((document, ctx) => {
      if (document.status !== 'approved') return;
      if (!document.reviewedBy) {
        ctx.addIssue({ code: 'custom', message: 'Documento jurídico aprovado exige revisor.', path: ['reviewedBy'] });
      }
      if (!document.reviewedAt) {
        ctx.addIssue({ code: 'custom', message: 'Documento jurídico aprovado exige data de revisão.', path: ['reviewedAt'] });
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
    credentials: z.string().min(1),
    bio: z.string().min(1),
  }),
});

export const collections = { pages, articles, legal, reviewNotes, contributors };
