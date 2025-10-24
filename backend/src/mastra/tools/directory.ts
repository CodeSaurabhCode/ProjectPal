import { createTool } from '@mastra/core';
import { z } from 'zod';

export interface Employee {
  name: string;
  role: string;
  status: 'Available' | 'On-Project';
  hoursAvailable: number;
}

export interface ProjectTicket {
  success: boolean;
  ticketId: string;
  assignee: string;
  title: string;
  projectName?: string;
}

const TEAM_DIRECTORY: readonly Employee[] = [
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

export const getTeamDirectory = createTool({
  id: 'get-team-directory',
  description: 'Retrieves the employee directory with availability status',
  inputSchema: z.object({
    role: z.string().optional().describe('Filter by employee role')
  }),
  outputSchema: z.array(z.object({
    name: z.string(),
    role: z.string(),
    status: z.enum(['Available', 'On-Project']),
    hoursAvailable: z.number()
  })),
  execute: async (context): Promise<Employee[]> => {
    const role = (context as any)?.role || (context as any)?.input?.role;
    const directory = [...TEAM_DIRECTORY];
    
    if (role) {
      const roleFilter = role.toLowerCase();
      return directory.filter(emp => 
        emp.role.toLowerCase().includes(roleFilter)
      );
    }
    
    return directory;
  }
});

export const createProjectTicket = createTool({
  id: 'create-project-ticket',
  description: 'Creates a new project ticket in the system',
  inputSchema: z.object({
    assignee: z.string().describe('Name of the person to assign'),
    title: z.string().describe('Title of the project ticket'),
    projectName: z.string().optional().describe('Name of the project')
  }),
  outputSchema: z.object({
    success: z.boolean(),
    ticketId: z.string(),
    assignee: z.string(),
    title: z.string(),
    projectName: z.string().optional()
  }),
  execute: async (context): Promise<ProjectTicket> => {
    const assignee = (context as any)?.assignee || (context as any)?.input?.assignee;
    const title = (context as any)?.title || (context as any)?.input?.title;
    const projectName = (context as any)?.projectName || (context as any)?.input?.projectName;
    
    const ticketId = `PROJ-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
    
    return {
      success: true,
      ticketId,
      assignee,
      title,
      ...(projectName && { projectName })
    };
  }
});
