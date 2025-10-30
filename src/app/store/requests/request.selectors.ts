import { adapter } from './request.reducer';
import { selectRequestsState } from './request.reducer';

const selectors = adapter.getSelectors(selectRequestsState);

export const selectAllRequests = selectors.selectAll;
export const selectRequestEntities = selectors.selectEntities;
export const selectRequestTotal = selectors.selectTotal;
