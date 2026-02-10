// Status mapping: 0=Input Queue, 1=Work In Progress, 2=Review, 3=Done

const STATUS_INT_TO_STRING: Record<number, string> = {
    0: "Input Queue",
    1: "Work In Progress",
    2: "Review",
    3: "Done",
};

const STATUS_STRING_TO_INT: Record<string, number> = {
    "Input Queue": 0,
    "Work In Progress": 1,
    Review: 2,
    Done: 3,
};

export const statusIntToString = (status: number | null): string | null => {
    return status !== null ? STATUS_INT_TO_STRING[status] || null : null;
};

export const statusStringToInt = (status: string | null | undefined): number | null => {
    return status ? (STATUS_STRING_TO_INT[status] ?? null) : null;
};
