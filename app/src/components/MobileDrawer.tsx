import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { ReactNode } from 'react';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
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
        className="w-[280px] bg-[#2f3136] border-[#202225] p-0"
      >
        <SheetHeader className="px-4 py-3 border-b border-[#202225]">
          <SheetTitle className="text-white font-semibold">{title}</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}
