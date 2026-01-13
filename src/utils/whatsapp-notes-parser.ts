export interface ParsedNoteCommand {
  isCommand: boolean;
  commandType: 'create' | 'list' | 'reminder' | null;
  content: string;
  detectedDate: Date | null;
}

// Command prefixes
const COMMAND_PREFIXES = {
  create: ['/anotação', '/anotacao', '/nota'],
  list: ['/listar', '/notas', '/minhas_notas'],
  reminder: ['/lembrete', '/lembrar', '/alarme'],
};

// Date patterns (Portuguese)
const DATE_PATTERNS = {
  hoje: () => new Date(),
  amanhã: () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d;
  },
  amanha: () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d;
  },
  'depois de amanhã': () => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d;
  },
  segunda: () => getNextWeekday(1),
  'segunda_feira': () => getNextWeekday(1),
  terça: () => getNextWeekday(2),
  'terça_feira': () => getNextWeekday(2),
  terca: () => getNextWeekday(2),
  quarta: () => getNextWeekday(3),
  'quarta_feira': () => getNextWeekday(3),
  quinta: () => getNextWeekday(4),
  'quinta_feira': () => getNextWeekday(4),
  sexta: () => getNextWeekday(5),
  'sexta_feira': () => getNextWeekday(5),
  sábado: () => getNextWeekday(6),
  sabado: () => getNextWeekday(6),
  domingo: () => getNextWeekday(0),
};

/**
 * Get next occurrence of a weekday (0 = Sunday, 1 = Monday, etc.)
 */
function getNextWeekday(targetDay: number): Date {
  const today = new Date();
  const currentDay = today.getDay();
  let daysUntil = targetDay - currentDay;
  
  if (daysUntil <= 0) {
    daysUntil += 7;
  }
  
  const result = new Date(today);
  result.setDate(today.getDate() + daysUntil);
  return result;
}

/**
 * Parse time from text (e.g., "15h", "15:30", "às 10h")
 */
function parseTimeFromText(text: string): { hours: number; minutes: number } | null {
  // Pattern: 15h, 15h30, 15:30, às 10h
  const timePatterns = [
    /(\d{1,2})h(\d{2})?/i,
    /(\d{1,2}):(\d{2})/,
    /às?\s*(\d{1,2})(?:h(\d{2})?|:(\d{2}))?/i,
  ];

  for (const pattern of timePatterns) {
    const match = text.match(pattern);
    if (match) {
      const hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2] || match[3] || '0', 10);
      
      if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
        return { hours, minutes };
      }
    }
  }

  return null;
}

/**
 * Parse date from text
 */
function parseDateFromText(text: string): Date | null {
  const lowerText = text.toLowerCase();
  let detectedDate: Date | null = null;

  // Check for named date patterns
  for (const [pattern, dateGenerator] of Object.entries(DATE_PATTERNS)) {
    if (lowerText.includes(pattern)) {
      detectedDate = dateGenerator();
      break;
    }
  }

  // Check for explicit date format (DD/MM or DD/MM/YYYY)
  const dateMatch = lowerText.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
  if (dateMatch) {
    const day = parseInt(dateMatch[1], 10);
    const month = parseInt(dateMatch[2], 10) - 1;
    const year = dateMatch[3] 
      ? parseInt(dateMatch[3].length === 2 ? `20${dateMatch[3]}` : dateMatch[3], 10)
      : new Date().getFullYear();
    
    const parsedDate = new Date(year, month, day);
    if (!isNaN(parsedDate.getTime())) {
      detectedDate = parsedDate;
    }
  }

  // Apply time if detected
  if (detectedDate) {
    const time = parseTimeFromText(text);
    if (time) {
      detectedDate.setHours(time.hours, time.minutes, 0, 0);
    } else {
      // Default to 9:00 if no time specified
      detectedDate.setHours(9, 0, 0, 0);
    }
  }

  return detectedDate;
}

/**
 * Get command type from message
 */
function getCommandType(message: string): { type: 'create' | 'list' | 'reminder' | null; prefix: string } {
  const lowerMessage = message.toLowerCase().trim();

  for (const [type, prefixes] of Object.entries(COMMAND_PREFIXES)) {
    for (const prefix of prefixes) {
      if (lowerMessage.startsWith(prefix)) {
        return { type: type as 'create' | 'list' | 'reminder', prefix };
      }
    }
  }

  return { type: null, prefix: '' };
}

/**
 * Extract content after command prefix
 */
function extractContent(message: string, prefix: string): string {
  const startIndex = message.toLowerCase().indexOf(prefix.toLowerCase());
  if (startIndex === -1) return message;
  
  return message.slice(startIndex + prefix.length).trim();
}

/**
 * Parse a WhatsApp message to check for note commands
 */
export function parseNoteCommand(messageBody: string): ParsedNoteCommand {
  const trimmedMessage = messageBody.trim();
  
  // Check if it starts with any command
  const { type: commandType, prefix } = getCommandType(trimmedMessage);
  
  if (!commandType) {
    return {
      isCommand: false,
      commandType: null,
      content: '',
      detectedDate: null,
    };
  }

  // Extract content after the command
  const content = extractContent(trimmedMessage, prefix);
  
  // For list commands, no content or date needed
  if (commandType === 'list') {
    return {
      isCommand: true,
      commandType: 'list',
      content: content, // May contain filters like "hoje" or "pendentes"
      detectedDate: null,
    };
  }

  // For create and reminder, parse the date
  const detectedDate = parseDateFromText(content);

  return {
    isCommand: true,
    commandType,
    content,
    detectedDate,
  };
}

/**
 * Format a date for display in WhatsApp messages
 */
export function formatDateForWhatsApp(date: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2_digit',
    minute: '2_digit',
  };
  
  return date.toLocaleDateString('pt-BR', options);
}

/**
 * Check if a message is a note-related command
 */
export function isNoteCommand(messageBody: string): boolean {
  return parseNoteCommand(messageBody).isCommand;
}
