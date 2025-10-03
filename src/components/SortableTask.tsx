import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { HTMLAttributes, PropsWithChildren } from "react";

type Props = PropsWithChildren<
  { id: string } & HTMLAttributes<HTMLDivElement>
>;

export default function SortableTask({ id, children, style, ...rest }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const mergedStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
    ...style,
  };

  return (
    <div
      ref={setNodeRef}
      style={mergedStyle}
      {...attributes}
      {...listeners}
      {...rest}          
    >
      {children}
    </div>
  );
}