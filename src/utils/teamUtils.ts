// Map team names to standardized codes
const teamCodes: Record<string, string> = {
  'Mumbai Indians': 'MI',
  'Chennai Super Kings': 'CSK',
  'Royal Challengers Bangalore': 'RCB',
  'Kolkata Knight Riders': 'KKR',
  'Delhi Capitals': 'DC',
  'Punjab Kings': 'PBKS',
  'Rajasthan Royals': 'RR',
  'Sunrisers Hyderabad': 'SRH',
  'Gujarat Titans': 'GT',
  'Lucknow Super Giants': 'LSG',
};

// Extract team names from match name (e.g., "Mumbai Indians vs Chennai Super Kings")
export const getTeamNames = (matchName: string): { team1: string; team2: string } => {
  const teams = matchName.split(' vs ');
  const team1 = teams[0]?.trim() || 'Unknown Team';
  const team2 = teams[1]?.trim() || 'Unknown Team';
  
  return { team1, team2 };
};

// Get team code (e.g., "MI" for "Mumbai Indians")
export const getTeamCode = (teamName: string): string => {
  return teamCodes[teamName] || 'IPL';
};

// Get URL for team logo
export const getTeamLogoUrl = (teamCode: string): string => {
  // Map RCB to RC if needed (since file is named RC.svg)
  const fileCode = teamCode === 'RCB' ? 'RC' : teamCode;
  
  // Using local SVG logos from public/logos directory
  return `/logos/${fileCode}.svg`;
}; 