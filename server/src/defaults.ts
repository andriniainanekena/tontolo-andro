export type Nature = "productive" | "leisure" | "essential";

export const defaultTypes: { name: string; color: string; nature: Nature }[] = [
  { name: "Study", color: "#6366f1", nature: "productive" },
  { name: "Reading", color: "#8b5cf6", nature: "productive" },
  { name: "Sport", color: "#22c55e", nature: "productive" },
  { name: "Gaming", color: "#ef4444", nature: "leisure" },
  { name: "Social media", color: "#ec4899", nature: "leisure" },
  { name: "Series & movies", color: "#f97316", nature: "leisure" },
  { name: "Meals", color: "#eab308", nature: "essential" },
  { name: "Sleep", color: "#64748b", nature: "essential" },
  { name: "Rest", color: "#84cc16", nature: "essential" },
];
