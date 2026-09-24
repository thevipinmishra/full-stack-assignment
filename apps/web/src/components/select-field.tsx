import { Select } from '@base-ui/react/select'
import { Check, ChevronDown, Loader } from 'reicon-react'
import { popupAnimationClass } from './popup-animation'

export interface SelectOption {
  label: string
  value: string
}

export function SelectField({
  disabled = false,
  label,
  loading = false,
  name,
  onChange,
  options,
  value,
}: {
  disabled?: boolean
  label: string
  loading?: boolean
  name: string
  onChange: (value: string) => void
  options: SelectOption[]
  value: string
}) {
  return (
    <div className="min-w-0">
      <Select.Root
        disabled={disabled || loading}
        items={options}
        name={name}
        value={value}
        onValueChange={(next) => onChange(next ?? '')}
      >
        <Select.Label className="mb-1.5 block text-xs font-semibold text-[#455953]">
          {label}
        </Select.Label>
        <Select.Trigger
          aria-busy={loading}
          className="flex min-h-11 w-full items-center justify-between gap-2 rounded-lg border border-[#dce5df] bg-white px-3 text-sm font-semibold text-[#34443c] hover:border-[#a6beb0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176c5b] data-[disabled]:cursor-wait data-[disabled]:opacity-80"
        >
          <Select.Value />
          <Select.Icon className="text-[#6d8074]">
            {loading ? (
              <Loader
                size={16}
                className="text-[#176c5b] motion-safe:animate-spin"
                aria-hidden="true"
              />
            ) : (
              <ChevronDown size={16} aria-hidden="true" />
            )}
          </Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Positioner
            className="z-50"
            sideOffset={5}
            alignItemWithTrigger={false}
          >
            <Select.Popup
              className={`min-w-[var(--anchor-width)] rounded-xl border border-[#dce5df] bg-white p-1.5 shadow-[0_14px_35px_rgba(22,55,42,0.16)] focus:outline-none ${popupAnimationClass}`}
            >
              <Select.List>
                {options.map((option) => (
                  <Select.Item
                    key={option.value}
                    value={option.value}
                    className="flex min-h-10 cursor-pointer items-center justify-between gap-3 rounded-lg px-3 text-sm text-[#34443c] outline-none data-[highlighted]:bg-[#edf5ef] data-[selected]:font-bold"
                  >
                    <Select.ItemText>{option.label}</Select.ItemText>
                    <Select.ItemIndicator>
                      <Check size={16} aria-hidden="true" />
                    </Select.ItemIndicator>
                  </Select.Item>
                ))}
              </Select.List>
            </Select.Popup>
          </Select.Positioner>
        </Select.Portal>
      </Select.Root>
    </div>
  )
}
