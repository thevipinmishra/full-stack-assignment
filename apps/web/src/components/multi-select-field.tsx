import { Menu } from '@base-ui/react/menu'
import { Check, ChevronDown } from 'reicon-react'
import { popupAnimationClass } from './popup-animation'

export interface MultiSelectOption<T extends string = string> {
  label: string
  value: T
}

export function MultiSelectField<T extends string>({
  emptyLabel,
  emptyMessage = 'No options available',
  label,
  onToggle,
  options,
  value,
}: {
  emptyLabel: string
  emptyMessage?: string
  label: string
  onToggle: (value: T) => void
  options: MultiSelectOption<T>[]
  value: T[]
}) {
  const selectedLabel =
    value.length === 0
      ? emptyLabel
      : value.length === 1
        ? (options.find((option) => option.value === value[0])?.label ??
          value[0])
        : `${value.length} selected`

  return (
    <div className="min-w-0">
      <span className="mb-1.5 block text-xs font-semibold text-[#455953]">
        {label}
      </span>
      <Menu.Root>
        <Menu.Trigger
          aria-label={`${label}: ${selectedLabel}`}
          className="flex min-h-11 w-full items-center justify-between gap-2 rounded-lg border border-[#dce5df] bg-white px-3 text-sm font-semibold text-[#34443c] hover:border-[#a6beb0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176c5b]"
        >
          <span className="truncate">{selectedLabel}</span>
          <ChevronDown
            size={16}
            className="shrink-0 text-[#6d8074]"
            aria-hidden="true"
          />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner sideOffset={6} align="start" className="z-50">
            <Menu.Popup
              className={`max-h-64 min-w-[var(--anchor-width)] overflow-y-auto rounded-xl border border-[#dce5df] bg-white p-1.5 shadow-[0_14px_35px_rgba(22,55,42,0.16)] outline-none ${popupAnimationClass}`}
            >
              {options.length === 0 ? (
                <p className="px-2 py-3 text-sm text-[#617268]">
                  {emptyMessage}
                </p>
              ) : (
                options.map((option) => (
                  <Menu.CheckboxItem
                    key={option.value}
                    checked={value.includes(option.value)}
                    onCheckedChange={() => onToggle(option.value)}
                    className="flex min-h-10 cursor-pointer items-center justify-between gap-3 rounded-lg px-3 text-sm text-[#34443c] outline-none data-[highlighted]:bg-[#edf5ef] data-[checked]:font-semibold"
                  >
                    <span className="truncate">{option.label}</span>
                    <Menu.CheckboxItemIndicator className="text-[#176c5b]">
                      <Check size={16} aria-hidden="true" />
                    </Menu.CheckboxItemIndicator>
                  </Menu.CheckboxItem>
                ))
              )}
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    </div>
  )
}
