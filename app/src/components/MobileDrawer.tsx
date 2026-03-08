import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import type { ReactNode } from 'react';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  side?: 'left' | 'right';
  trigger?: ReactNode;
}

export function MobileDrawer({
  isOpen,
  onClose,
  title,
  children,
  side = 'left',
  trigger,
}: MobileDrawerProps) {
  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {trigger && <SheetTrigger asChild>{trigger}</SheetTrigger>}
      <SheetContent 
        side={side} 
        className="w-[280px] bg-[#232438] border-[#0f0f1a] p-0"
      >
        {title && (
          <SheetHeader className="px-4 py-3 border-b border-[#0f0f1a]">
            <SheetTitle className="text-white font-semibold">{title}</SheetTitle>
          </SheetHeader>
        )}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}

