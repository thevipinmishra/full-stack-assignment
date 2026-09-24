import { Menu } from '@base-ui/react/menu'
import { Check, Layout } from 'reicon-react'
import { popupAnimationClass } from './popup-animation'

export interface ColumnMenuOption {
  id: string
  label: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}

export function ColumnMenu({ options }: { options: ColumnMenuOption[] }) {
  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label="Columns"
        title="Columns"
        className="inline-flex size-11 items-center justify-center justify-self-end rounded-lg border border-[#dce5df] bg-white text-[#455953] hover:border-[#a6beb0] hover:bg-[#f4faf5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176c5b]"
      >
        <Layout size={19} aria-hidden="true" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={8} align="end" className="z-50">
          <Menu.Popup
            className={`min-w-44 rounded-xl border border-[#dce5df] bg-white p-1.5 shadow-[0_14px_35px_rgba(22,55,42,0.16)] outline-none ${popupAnimationClass}`}
          >
            {options.map((option) => (
              <Menu.CheckboxItem
                key={option.id}
                checked={option.checked}
                onCheckedChange={option.onCheckedChange}
                className="flex min-h-10 cursor-pointer items-center justify-between gap-4 rounded-lg px-3 text-sm text-[#34443c] outline-none data-[highlighted]:bg-[#edf5ef] data-[checked]:font-semibold"
              >
                {option.label}
                <Menu.CheckboxItemIndicator className="text-[#176c5b]">
                  <Check size={16} aria-hidden="true" />
                </Menu.CheckboxItemIndicator>
              </Menu.CheckboxItem>
            ))}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}
