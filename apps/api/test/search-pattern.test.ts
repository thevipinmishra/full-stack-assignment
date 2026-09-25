import { describe, expect, it } from 'vitest'

import { containsPattern } from '../src/leads/search-pattern.js'

describe('lead search pattern', () => {
  it('matches plain text anywhere in a field', () => {
    expect(containsPattern('Avery')).toBe('%Avery%')
  })

  it('treats SQL wildcards and backslashes as literal characters', () => {
    expect(containsPattern('100%_\\')).toBe('%100\\%\\_\\\\%')
  })
})
