import { useState, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface SidebarTooltipProps {
  label: string;
  children: ReactNode;
}

export default function SidebarTooltip({ label, children }: SidebarTooltipProps) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const ref = useRef<HTMLDivElement>(null);

  function handleMouseEnter() {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setPos({ top: rect.top + rect.height / 2, left: rect.right + 8 });
    }
    setVisible(true);
  }

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && createPortal(
        <div
          className="fixed z-[9999] pointer-events-none"
          style={{ top: pos.top, left: pos.left, transform: 'translateY(-50%)' }}
        >
          <div className="bg-stone-900 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg shadow-level-3 whitespace-nowrap">
            {label}
            <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-stone-900" />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
