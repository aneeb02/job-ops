import { loadProfileStep } from "../../steps/load-profile";
import type { PipelineState } from "../state";

export async function loadProfileNode(
  state: typeof PipelineState.State
): Promise<Partial<typeof PipelineState.State>> {
  // We extract the tenantId and config from state
  const { tenantId, config } = state;
  
  // Call the legacy function using the tenant ID context
  // The loadProfileStep doesn't return much, it populates context.
  await loadProfileStep({
    tenantId,
    config,
    onProgress: (msg) => console.log(`[LangGraph - loadProfile]: ${msg}`)
  });
  
  // Return the delta to update the state
  return {
    profileLoaded: true
  };
}
