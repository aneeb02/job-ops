import { StateGraph, START, END } from "@langchain/langgraph";
import { PipelineState } from "./state";
import { loadProfileNode } from "./nodes/load-profile";

// Initialize a new state graph using our annotation
const builder = new StateGraph(PipelineState);

// Add the nodes
builder.addNode("loadProfile", loadProfileNode);

// Define edges - right now just a simple test flow
builder.addEdge(START, "loadProfile");
builder.addEdge("loadProfile", END);

// Compile the graph
// We will add the SqliteSaver checkpointer here later.
export const pipelineGraph = builder.compile();
