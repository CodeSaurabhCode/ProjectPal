export interface Employee {
  name: string;
  role: string;
  status: 'Available' | 'On-Project';
  hoursAvailable: number;
}

export const TEAM_DIRECTORY: readonly Employee[] = [
  { name: "Arjun Sharma", role: "Engineering Lead", status: "Available", hoursAvailable: 40 },
  { name: "Priya Patel", role: "Machine Learning Engineer", status: "On-Project", hoursAvailable: 10 },
  { name: "Ravi Kumar", role: "UI/UX Designer", status: "Available", hoursAvailable: 35 },
  { name: "Sneha Gupta", role: "Data Scientist", status: "On-Project", hoursAvailable: 5 },
  { name: "Vikram Singh", role: "Solutions Architect", status: "Available", hoursAvailable: 30 },
  { name: "Amit Desai", role: "AI Engineer", status: "Available", hoursAvailable: 40 },
  { name: "Rohit Mehta", role: "AI Engineer", status: "On-Project", hoursAvailable: 15 },
  { name: "Neha Kapoor", role: "Senior AI Engineer", status: "Available", hoursAvailable: 40 },
  { name: "Ananya Iyer", role: "Full Stack Engineer", status: "Available", hoursAvailable: 40 },
  { name: "Karthik Nair", role: "Full Stack Engineer", status: "Available", hoursAvailable: 35 },
  { name: "Divya Sharma", role: "Senior Backend Engineer", status: "On-Project", hoursAvailable: 12 },
  { name: "Rajesh Pillai", role: "Backend Engineer", status: "Available", hoursAvailable: 40 },
] as const;
