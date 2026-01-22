/**
 * Date/Time Formatting Utilities
 * Provides consistent date and time formatting across the application
 */

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
