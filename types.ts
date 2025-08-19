
export interface Task {
  task: string;
  completed: boolean;
}

export interface DailyPlanItem {
  day: number;
  title: string;
  tasks: Task[];
}

export interface Suggestion {
  suggestion: string;
  completed: boolean;
}

export interface HealthData {
  baseHealthScore: number;
  healthScore: number;
  generalSuggestions: Suggestion[];
  dailyPlan: DailyPlanItem[];
}

export interface User {
  uid: string;
}