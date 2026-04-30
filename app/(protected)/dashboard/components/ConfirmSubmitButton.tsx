'use client'

import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  message: string
  children: ReactNode
}

export function ConfirmSubmitButton({ message, onClick, children, ...props }: Props) {
  return (
    <button
      {...props}
      type={props.type ?? 'submit'}
      onClick={(event) => {
        onClick?.(event)
        if (event.defaultPrevented) return
        if (!window.confirm(message)) event.preventDefault()
      }}
    >
      {children}
    </button>
  )
}
