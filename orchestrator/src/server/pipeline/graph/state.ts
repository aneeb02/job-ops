import { Annotation } from "@langchain/langgraph";
import type { PipelineConfig } from "@shared/types";

// Defining the state that will be passed between nodes
export const PipelineState = Annotation.Root({
  // Active tenant and pipeline run identifiers
  tenantId: Annotation<string>,
  pipelineRunId: Annotation<string>,
  
  // Settings and configuration used for the run
  config: Annotation<PipelineConfig>,
  
  // Pipeline data tracking
  profileLoaded: Annotation<boolean>({
    reducer: (oldState, newState) => newState ?? oldState,
    default: () => false,
  }),
  
  discoveredJobsCount: Annotation<number>({
    reducer: (oldState, newState) => (oldState ?? 0) + (newState ?? 0),
    default: () => 0,
  }),
  
  jobsToScore: Annotation<string[]>({
    // We append arrays of job IDs
    reducer: (oldState, newState) => [...(oldState ?? []), ...(newState ?? [])],
    default: () => [],
  }),
  
  jobsToTailor: Annotation<string[]>({
    reducer: (oldState, newState) => [...(oldState ?? []), ...(newState ?? [])],
    default: () => [],
  }),
  
  // To accumulate non-fatal errors through the graph
  errors: Annotation<string[]>({
    reducer: (oldState, newState) => [...(oldState ?? []), ...(newState ?? [])],
    default: () => [],
  }),
});
