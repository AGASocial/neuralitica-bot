/**
 * Date utility functions for Venezuelan format (dd/mm/yyyy)
 */

/**
 * Format a date to Venezuelan format (dd/mm/yyyy)
 * @param date - Date string or Date object
 * @returns Formatted date string in dd/mm/yyyy format
 */
export function formatDateVE(date: string | Date | null | undefined): string {
  if (!date) return ''
  
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  if (isNaN(dateObj.getTime())) return ''
  
  const day = dateObj.getDate().toString().padStart(2, '0')
  const month = (dateObj.getMonth() + 1).toString().padStart(2, '0')
  const year = dateObj.getFullYear()
  
  return `${day}/${month}/${year}`
}

/**
 * Format a date to Venezuelan format with time (dd/mm/yyyy HH:mm)
 * @param date - Date string or Date object
 * @returns Formatted date string in dd/mm/yyyy HH:mm format
 */
export function formatDateTimeVE(date: string | Date | null | undefined): string {
  if (!date) return ''
  
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  if (isNaN(dateObj.getTime())) return ''
  
  const day = dateObj.getDate().toString().padStart(2, '0')
  const month = (dateObj.getMonth() + 1).toString().padStart(2, '0')
  const year = dateObj.getFullYear()
  const hours = dateObj.getHours().toString().padStart(2, '0')
  const minutes = dateObj.getMinutes().toString().padStart(2, '0')
  
  return `${day}/${month}/${year} ${hours}:${minutes}`
}