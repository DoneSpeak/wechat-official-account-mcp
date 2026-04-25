import { jsx as _jsx } from "react/jsx-runtime";
import { cn } from '@/lib/utils';
export default function Empty() {
    return (_jsx("div", { className: cn('flex h-full items-center justify-center'), children: "Empty" }));
}
