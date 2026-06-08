import { loadEditorialState, validateEditorialState, validateGlossaryInventory, validateLegalInventory } from './editorial-validation.mjs';

const state = await loadEditorialState();
const failures = [...validateEditorialState(state), ...validateGlossaryInventory(state.contents), ...validateLegalInventory(state.contents)];

if (failures.length) {
  console.error(`Validação editorial falhou:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}

console.log(`Validação editorial concluída em ${state.contents.length} conteúdos e ${state.records.length} registros.`);
