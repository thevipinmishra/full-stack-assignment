import { useState } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { MultiSelectField } from './multi-select-field'

function CampaignFilter() {
  const [value, setValue] = useState<string[]>([])
  return (
    <MultiSelectField
      label="Campaigns"
      emptyLabel="All campaigns"
      options={[
        { label: 'Autumn outreach', value: 'Autumn outreach' },
        { label: 'Product updates', value: 'Product updates' },
      ]}
      value={value}
      onToggle={(campaign) =>
        setValue((selected) =>
          selected.includes(campaign)
            ? selected.filter((item) => item !== campaign)
            : [...selected, campaign],
        )
      }
    />
  )
}

describe('MultiSelectField', () => {
  it('keeps the menu open while selecting multiple campaigns and closes on Escape', async () => {
    const user = userEvent.setup()
    render(<CampaignFilter />)

    await user.click(
      screen.getByRole('button', { name: 'Campaigns: All campaigns' }),
    )
    await user.click(
      await screen.findByRole('menuitemcheckbox', { name: 'Autumn outreach' }),
    )
    await user.click(
      screen.getByRole('menuitemcheckbox', { name: 'Product updates' }),
    )

    expect(
      screen
        .getByRole('menuitemcheckbox', { name: 'Autumn outreach' })
        .getAttribute('aria-checked'),
    ).toBe('true')
    expect(
      screen
        .getByRole('menuitemcheckbox', { name: 'Product updates' })
        .getAttribute('aria-checked'),
    ).toBe('true')
    expect(
      screen.getByRole('button', { name: 'Campaigns: 2 selected' }),
    ).toBeTruthy()

    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull())
  })
})
