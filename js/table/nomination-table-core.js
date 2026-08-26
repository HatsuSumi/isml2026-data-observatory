import { createNominationTableState } from './nomination-table-state.js';
import { loadNominationRows } from './nomination-table-loader.js';
import { bindNominationTable } from './nomination-table-bindings.js';

export async function initNominationTable(config) {
    const state = createNominationTableState(config);
    const table = bindNominationTable(state);
    state.rows = await loadNominationRows(config);
    table.restoreUi();
    table.applyView();
}
