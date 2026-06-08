export const MIN_APPROVED_ARTICLES_FOR_GLOSSARY = 6;
export const MIN_APPROVED_GLOSSARY_TERMS_FOR_LAUNCH = 6;

export function canPublishGlossary(approvedArticleCount: number, approvedGlossaryCount: number): boolean {
  return approvedArticleCount >= MIN_APPROVED_ARTICLES_FOR_GLOSSARY
    && approvedGlossaryCount >= MIN_APPROVED_GLOSSARY_TERMS_FOR_LAUNCH;
}
