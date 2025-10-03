import dayjs from "dayjs";
export const isOverdue = (iso?: string) => !!(iso && dayjs(iso).isBefore(dayjs(), "day"));
export const isDueSoon = (iso?: string) => !!(iso && dayjs(iso).diff(dayjs(), "day") <= 1 && !isOverdue(iso));