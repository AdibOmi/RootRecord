import { describe, expect, it } from 'vitest'

import {
  formatBDT,
  formatDate,
  formatDateTime,
  formatPatientCode,
  formatTime,
  minorToTakaInput,
  parseTaka,
  takaToMinor,
} from './format'
import { formatBDPhone, isValidBDPhone, normalizeBDPhone } from './phone'

describe('formatBDT', () => {
  it('formats whole taka with thousands separators', () => {
    expect(formatBDT(150_000)).toBe('৳ 1,500')
    expect(formatBDT(12_345_600)).toBe('৳ 1,23,456')
  })
  it('keeps paisa when present and handles negatives', () => {
    expect(formatBDT(150_050)).toBe('৳ 1,500.50')
    expect(formatBDT(-5_000)).toBe('-৳ 50')
  })
  it('converts taka input to minor units without float drift', () => {
    expect(takaToMinor(19.99)).toBe(1999)
  })
})

describe('date formatting in Asia/Dhaka', () => {
  // 20:30 UTC is 02:30 the next day in Dhaka (UTC+6).
  const iso = '2026-09-25T20:30:00Z'
  it('uses DD/MM/YYYY and shifts to clinic time', () => {
    expect(formatDate(iso)).toBe('26/09/2026')
  })
  it('uses 12-hour time', () => {
    expect(formatTime(iso)).toBe('2:30 AM')
    expect(formatDateTime('2026-09-25T09:15:00Z')).toBe('25/09/2026, 3:15 PM')
  })
})

describe('Bangladeshi phone numbers', () => {
  it.each(['01712345678', '+8801712345678', '8801712345678', '01712-345678'])(
    'accepts %s',
    (input) => {
      expect(normalizeBDPhone(input)).toBe('+8801712345678')
    },
  )
  it.each(['01212345678', '0171234567', '+14155550123', ''])('rejects %s', (input) => {
    expect(isValidBDPhone(input)).toBe(false)
  })
  it('formats for display', () => {
    expect(formatBDPhone('+8801712345678')).toBe('01712-345678')
  })
})

describe('taka input', () => {
  it('parses typed amounts into paisa', () => {
    expect(parseTaka('1500')).toBe(150_000)
    expect(parseTaka(' 1,500 ')).toBe(150_000)
    expect(parseTaka('৳1500.5')).toBe(150_050)
    expect(parseTaka('')).toBeNull()
    expect(parseTaka('abc')).toBeNull()
    expect(parseTaka('-5')).toBeNull()
  })
  it('round-trips through the input box', () => {
    expect(minorToTakaInput(150_050)).toBe('1500.5')
    expect(minorToTakaInput(null)).toBe('')
  })
})

describe('formatPatientCode', () => {
  it('groups the 8 digits as written on prescriptions', () => {
    expect(formatPatientCode('48291736')).toBe('4829-1736')
    expect(formatPatientCode('P-00001')).toBe('P-00001')
  })
})
