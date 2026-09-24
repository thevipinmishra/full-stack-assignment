import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { SelectField } from './select-field'

describe('SelectField', () => {
  it('changes value through the keyboard', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<SelectField
      label="Status"
      name="status"
      value="new"
      onChange={onChange}
      options={[{ label: 'New', value: 'new' }, { label: 'Qualified', value: 'qualified' }]}
    />)

    const trigger = screen.getByRole('combobox', { name: 'Status' })
    trigger.focus()
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}')
    expect(onChange).toHaveBeenCalledWith('qualified')
  })
})
