import { useState } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { ColumnMenu } from './column-menu'

function ColumnMenuFixture() {
  const [visible, setVisible] = useState(true)
  return (
    <>
      <ColumnMenu
        options={[
          {
            id: 'campaign',
            label: 'Campaign',
            checked: visible,
            onCheckedChange: setVisible,
          },
        ]}
      />
      <button type="button">Outside</button>
    </>
  )
}

describe('ColumnMenu', () => {
  it('toggles columns and dismisses on outside click', async () => {
    const user = userEvent.setup()
    render(<ColumnMenuFixture />)

    await user.click(screen.getByRole('button', { name: 'Columns' }))
    const item = await screen.findByRole('menuitemcheckbox', {
      name: 'Campaign',
    })
    expect(item.getAttribute('aria-checked')).toBe('true')

    await user.click(item)
    expect(item.getAttribute('aria-checked')).toBe('false')
    expect(screen.getByRole('menu')).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Outside' }))
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull())
  })
})
