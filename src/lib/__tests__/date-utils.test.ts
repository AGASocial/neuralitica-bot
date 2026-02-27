import { formatDateVE, formatDateTimeVE } from '../date-utils'

describe('date-utils', () => {
  describe('formatDateVE', () => {
    it('should format a Date object to Venezuelan format (dd/mm/yyyy)', () => {
      const date = new Date('2024-03-15T10:30:00Z')
      const result = formatDateVE(date)
      expect(result).toMatch(/^\d{2}\/\d{2}\/2024$/)
    })

    it('should format a date string to Venezuelan format', () => {
      const dateString = '2024-03-15T10:30:00Z'
      const result = formatDateVE(dateString)
      expect(result).toMatch(/^\d{2}\/\d{2}\/2024$/)
    })

    it('should return empty string for null', () => {
      expect(formatDateVE(null)).toBe('')
    })

    it('should return empty string for undefined', () => {
      expect(formatDateVE(undefined)).toBe('')
    })

    it('should return empty string for invalid date string', () => {
      expect(formatDateVE('invalid-date')).toBe('')
    })

    it('should pad single digit day and month with zeros', () => {
      const date = new Date('2024-01-05T10:30:00Z')
      const result = formatDateVE(date)
      expect(result).toMatch(/^0[15]\/0[15]\/2024$/)
    })
  })

  describe('formatDateTimeVE', () => {
    it('should format a Date object to Venezuelan format with time (dd/mm/yyyy HH:mm)', () => {
      const date = new Date('2024-03-15T14:30:00Z')
      const result = formatDateTimeVE(date)
      expect(result).toMatch(/^\d{2}\/\d{2}\/2024 \d{2}:\d{2}$/)
    })

    it('should format a date string to Venezuelan format with time', () => {
      const dateString = '2024-03-15T14:30:00Z'
      const result = formatDateTimeVE(dateString)
      expect(result).toMatch(/^\d{2}\/\d{2}\/2024 \d{2}:\d{2}$/)
    })

    it('should return empty string for null', () => {
      expect(formatDateTimeVE(null)).toBe('')
    })

    it('should return empty string for undefined', () => {
      expect(formatDateTimeVE(undefined)).toBe('')
    })

    it('should return empty string for invalid date string', () => {
      expect(formatDateTimeVE('invalid-date')).toBe('')
    })

    it('should pad hours and minutes with zeros', () => {
      const date = new Date('2024-03-15T05:05:00Z')
      const result = formatDateTimeVE(date)
      expect(result).toMatch(/^\d{2}\/\d{2}\/2024 0[59]:0[59]$/)
    })

    it('should handle midnight correctly', () => {
      const date = new Date('2024-03-15T00:00:00Z')
      const result = formatDateTimeVE(date)
      expect(result).toMatch(/^\d{2}\/\d{2}\/2024 00:00$/)
    })
  })
})



