'use client'

import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check, MapPin } from 'lucide-react'

export interface DropdownOption {
  value: string
  label: string
  subLabel?: string
}

export interface ThemedDropdownProps {
  id?: string
  label?: string
  value: string
  onChange: (value: string) => void
  options: DropdownOption[]
  placeholder?: string
  required?: boolean
  disabled?: boolean
  icon?: React.ReactNode | null
  className?: string
}

export function ThemedDropdown({
  id,
  label,
  value,
  onChange,
  options,
  placeholder = 'Select an option',
  required = false,
  disabled = false,
  icon,
  className = '',
}: ThemedDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Find currently selected option
  const selectedOption = options.find((opt) => opt.value === value)

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setIsOpen((prev) => !prev)
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    } else if (e.key === 'ArrowDown' && !isOpen) {
      e.preventDefault()
      setIsOpen(true)
    }
  }

  const handleSelect = (val: string) => {
    onChange(val)
    setIsOpen(false)
  }

  return (
    <div className={`themed-dropdown-container ${className}`} ref={dropdownRef}>
      {label && <label className="account-label">{label}</label>}

      {/* Custom styled trigger button */}
      <button
        type="button"
        id={id}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={`themed-dropdown-trigger ${isOpen ? 'open' : ''} ${selectedOption ? 'has-value' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="themed-dropdown-left">
          {icon !== null && (
            <span className="themed-dropdown-icon">
              {icon ?? <MapPin size={15} />}
            </span>
          )}
          <span className="themed-dropdown-label">
            {selectedOption ? (
              <span className="selected-text">
                <strong className="selected-main">{selectedOption.label}</strong>
                {selectedOption.subLabel && (
                  <span className="selected-sub"> — {selectedOption.subLabel}</span>
                )}
              </span>
            ) : (
              <span className="placeholder-text">{placeholder}</span>
            )}
          </span>
        </span>
        <ChevronDown
          size={16}
          className={`themed-dropdown-chevron ${isOpen ? 'rotated' : ''}`}
        />
      </button>

      {/* Dropdown Floating Menu */}
      {isOpen && (
        <div className="themed-dropdown-menu" role="listbox">
          <div className="themed-dropdown-list">
            {options.length === 0 ? (
              <div className="themed-dropdown-empty">No options available</div>
            ) : (
              options.map((option) => {
                const isSelected = option.value === value
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(option.value)}
                    className={`themed-dropdown-item ${isSelected ? 'selected' : ''}`}
                  >
                    <div className="themed-item-content">
                      <span className="themed-item-label">{option.label}</span>
                      {option.subLabel && (
                        <span className="themed-item-sublabel">{option.subLabel}</span>
                      )}
                    </div>
                    {isSelected && <Check size={16} className="themed-item-check" />}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* Hidden native select for form validation / submission compatibility */}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        tabIndex={-1}
        aria-hidden="true"
        className="themed-dropdown-hidden-select"
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label} {opt.subLabel ? `— ${opt.subLabel}` : ''}
          </option>
        ))}
      </select>
    </div>
  )
}
