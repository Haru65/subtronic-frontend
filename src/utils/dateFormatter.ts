/**
 * Date/Time Formatting Utilities
 * Provides consistent date and time formatting across the application
 */

/**
 * Format a date/time for display (general purpose)
 * @param date - Date object, date string, or timestamp
 * @returns Formatted string like "Jan 23, 2024 10:30 AM" or "N/A" if invalid
 */
export const formatTime = (date: Date | string | number | null | undefined): string => {
  if (!date) return 'N/A';
  
  try {
    const dateObj = new Date(date);
    
    if (isNaN(dateObj.getTime())) return 'N/A';
    
    // Format as locale string with options
    return dateObj.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch (error) {
    console.warn('Error formatting time:', error);
    return 'N/A';
  }
};

/**
 * Format a relative time (e.g., "2 minutes ago", "1 hour ago")
 * @param date - Date object, date string, or timestamp
 * @returns Relative time string or "N/A" if invalid
 */
export const formatRelativeTime = (date: Date | string | number | null | undefined): string => {
  if (!date) return 'N/A';
  
  try {
    const dateObj = new Date(date);
    const now = new Date();
    
    if (isNaN(dateObj.getTime())) return 'N/A';
    
    const diffMs = now.getTime() - dateObj.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffSeconds < 60) {
      return diffSeconds <= 1 ? 'Just now' : `${diffSeconds} seconds ago`;
    } else if (diffMinutes < 60) {
      return diffMinutes === 1 ? '1 minute ago' : `${diffMinutes} minutes ago`;
    } else if (diffHours < 24) {
      return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
    } else if (diffDays < 7) {
      return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
    } else {
      return formatTime(date);
    }
  } catch (error) {
    console.warn('Error formatting relative time:', error);
    return 'N/A';
  }
};

/**
 * Format uptime in human readable format
 * @param seconds - Uptime in seconds
 * @returns Formatted string like "2d 5h 30m" or "N/A" if invalid
 */
export const formatUptime = (seconds: number | null | undefined): string => {
  if (typeof seconds !== 'number' || seconds < 0) return 'N/A';
  
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  
  return parts.length > 0 ? parts.join(' ') : '0m';
};

/**
 * Format duration in milliseconds to human readable format
 * @param ms - Duration in milliseconds
 * @returns Formatted string like "150ms", "2.5s", "1m 30s"
 */
export const formatDuration = (ms: number | null | undefined): string => {
  if (typeof ms !== 'number' || ms < 0) return 'N/A';
  
  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  } else if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}s`;
  } else {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
  }
};

/**
 * Format a date to DD/MM/YYYY format
 * @param date - Date object or date string
 * @returns Formatted date string (DD/MM/YYYY) or empty string if invalid
 */
export const formatDateDDMMYYYY = (date: Date | string | null | undefined): string => {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    if (isNaN(dateObj.getTime())) return '';
    
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    
    return `${day}/${month}/${year}`;
  } catch (error) {
    console.warn('Error formatting date:', error);
    return '';
  }
};

/**
 * Format time to HH:MM:SS format
 * @param date - Date object or date string
 * @returns Formatted time string (HH:MM:SS) or empty string if invalid
 */
export const formatTimeHHMMSS = (date: Date | string | null | undefined): string => {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    if (isNaN(dateObj.getTime())) return '';
    
    const hours = String(dateObj.getHours()).padStart(2, '0');
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');
    const seconds = String(dateObj.getSeconds()).padStart(2, '0');
    
    return `${hours}:${minutes}:${seconds}`;
  } catch (error) {
    console.warn('Error formatting time:', error);
    return '';
  }
};

/**
 * Format a complete datetime to DD/MM/YYYY HH:MM:SS
 * @param date - Date object or date string
 * @returns Formatted datetime string or empty string if invalid
 */
export const formatDateTimeFull = (date: Date | string | null | undefined): string => {
  if (!date) return '';
  
  try {
    const dateStr = formatDateDDMMYYYY(date);
    const timeStr = formatTimeHHMMSS(date);
    
    if (!dateStr || !timeStr) return '';
    
    return `${dateStr} ${timeStr}`;
  } catch (error) {
    console.warn('Error formatting datetime:', error);
    return '';
  }
};

/**
 * Format last seen time in HH:MM:SS format
 * @param lastSeenDate - Date object or date string representing when device was last seen
 * @returns Formatted string like "16:03:30" (HH:MM:SS)
 */
export const formatLastSeen = (lastSeenDate: Date | string | null | undefined): string => {
  if (!lastSeenDate) return 'Never';
  
  try {
    return formatTimeHHMMSS(lastSeenDate);
  } catch (error) {
    console.warn('Error formatting last seen:', error);
    return 'N/A';
  }
};
