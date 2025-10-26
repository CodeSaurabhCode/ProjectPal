import { createTool } from '@mastra/core';
import { z } from 'zod';
import { TEAM_DIRECTORY, type Employee } from '../../data/teamData';

export type { Employee };

export interface ProjectTicket {
  success: boolean;
  ticketId: string;
  assignee: string;
  title: string;
  projectName?: string;
}

export const getTeamDirectory = createTool({
  id: 'get-team-directory',
  description: `Searches the employee directory to find team members and check their availability.

WHEN TO USE THIS TOOL:
- User asks "who is available" or "find me someone"
- Need to verify if a specific person exists or is available
- Looking for team members with specific skills/roles
- Need to check availability hours before assignment
- Before creating project tickets (to verify assignee)

WHEN NOT TO USE:
- User is asking about policies (use queryHandbook instead)
- Just need to create a ticket for a known person (go straight to createProjectTicket)
- User is asking general questions about projects

HOW TO USE EFFECTIVELY:
- Use 'role' parameter to filter (e.g., "Engineering Lead", "Designer")
- Partial matches work (searching "Engineer" finds "Engineering Lead", "AI Engineer", etc.)
- Check 'hoursAvailable' - Engineering Leads typically need 40+, designers 20+
- Status "Available" is better than "On-Project" for new assignments

WHAT YOU'LL GET:
- List of employees matching criteria
- Their role, availability status, and hours available per week
- Use this to make informed assignment decisions

EXAMPLE SCENARIOS:
✅ "Find me an available AI engineer" → Use with role="AI Engineer"
✅ "Is Arjun Sharma available?" → Use with role="Arjun" or search all and filter
✅ "Do we have designers?" → Use with role="Designer"
❌ "What's the budget approval process?" → Wrong tool, use queryHandbook`,
  
  inputSchema: z.object({
    role: z.string().optional().describe('Employee role to search for (partial matches work). Examples: "Engineering Lead", "Designer", "AI Engineer", or even just "Engineer"')
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
        emp.role.toLowerCase().includes(roleFilter) ||
        emp.name.toLowerCase().includes(roleFilter)
      );
    }
    
    return directory;
  }
});

export const createProjectTicket = createTool({
  id: 'create-project-ticket',
  description: `Creates a project ticket in the system to track project kick-offs and assignments.

WHEN TO USE THIS TOOL:
- User explicitly asks to "create a ticket" or "start a project"
- After verifying budget approval requirements (via queryHandbook)
- After confirming resource availability (via getTeamDirectory)
- Ready to formalize a project assignment

WHEN NOT TO USE (CRITICAL):
- User is just exploring options or asking questions
- Haven't verified budget approval yet
- Haven't confirmed team member is available
- User hasn't committed to starting the project
- Missing required information (assignee name, project title)

PREREQUISITES BEFORE CALLING:
1. Know the assignee's full name (verify via getTeamDirectory first)
2. Have a clear project title or description
3. If budget involved, should have checked policies (queryHandbook)
4. User has confirmed they want to proceed

HOW TO USE EFFECTIVELY:
- assignee: Use exact full name from team directory
- title: Be descriptive "Mobile App Project Kick-off - $15K" not just "Project"
- projectName: Optional but helpful for tracking

WHAT THIS DOES:
- Creates a permanent ticket with unique ID
- Assigns it to the specified team member
- Returns ticket ID for tracking
- This is an ACTION, not information gathering

EXAMPLE SCENARIOS:
✅ After checking handbook + finding engineer → Create ticket
✅ User says "go ahead and create it" → Create ticket
✅ Have all info (budget approved, person available) → Create ticket
❌ User asks "what would I need to start?" → Just provide info, don't create
❌ No one is available yet → Don't create, suggest alternatives
❌ Just exploring budget options → Don't create yet`,
  
  inputSchema: z.object({
    assignee: z.string().describe('REQUIRED: Full name of team member to assign (must match name from team directory exactly)'),
    title: z.string().describe('REQUIRED: Descriptive project title. Be specific - include project type and key details like "Mobile App Development - Budget $15K"'),
    projectName: z.string().optional().describe('OPTIONAL: Official project name if different from title')
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

    const ticketId = `PROJ-${Date.now().toString().slice(-4)}-${Math.floor(Math.random() * 100).toString().padStart(2, '0')}`;
    
    return {
      success: true,
      ticketId,
      assignee,
      title,
      ...(projectName && { projectName })
    };
  }
});
