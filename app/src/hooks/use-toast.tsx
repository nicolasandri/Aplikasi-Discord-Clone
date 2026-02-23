import { toast as sonnerToast } from 'sonner';

interface ToastOptions {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success' | 'warning';
  duration?: number;
}

export function useToast() {
  const toast = (options: ToastOptions) => {
    const { title, description, variant = 'default', duration = 4000 } = options;
    
    const message = title ? (
      <div>
        <div className="font-semibold">{title}</div>
        {description && <div className="text-sm opacity-90">{description}</div>}
      </div>
    ) : (
      description
    );

    switch (variant) {
      case 'destructive':
        sonnerToast.error(message, { duration });
        break;
      case 'success':
        sonnerToast.success(message, { duration });
        break;
      case 'warning':
        sonnerToast.warning(message, { duration });
        break;
      default:
        sonnerToast(message, { duration });
    }
  };

  return { toast };
}

export { sonnerToast as toast };
