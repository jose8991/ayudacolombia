import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  label: string;
  description?: string;
  tone: 'danger' | 'support' | 'neutral';
}

export function ActionButton({ icon, label, description, tone, ...props }: ActionButtonProps) {
  return (
    <button className={`action-button action-button--${tone}`} type="button" {...props}>
      <span aria-hidden="true">{icon}</span>
      <span>
        <strong>{label}</strong>
        {description && <small>{description}</small>}
      </span>
    </button>
  );
}
