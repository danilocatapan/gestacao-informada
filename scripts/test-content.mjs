import { loadEditorialState, validateEditorialState, validateGlossaryInventory, validateLegalInventory, validateReferenceInventory } from './editorial-validation.mjs';

const state = await loadEditorialState();
const failures = [
  ...validateEditorialState(state),
  ...validateGlossaryInventory(state.contents),
  ...validateLegalInventory(state.contents),
  ...validateReferenceInventory(state.contents, state.references),
];

if (failures.length) {
  console.error(`Validação editorial falhou:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}

console.log(`Validação editorial v2 concluída em ${state.contents.length} conteúdos e ${state.reviews.length} pareceres.`);
