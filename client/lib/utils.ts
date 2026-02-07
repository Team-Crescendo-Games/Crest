export const dataGridClassNames =
    "border border-gray-200 bg-white shadow-sm rounded-lg overflow-hidden dark:border-stroke-dark dark:bg-dark-secondary dark:text-gray-200";

export const dataGridSxStyles = (isDarkMode: boolean) => {
    return {
        "&.MuiDataGrid-root": {
            backgroundColor: isDarkMode ? "#1e1e20" : "white",
            color: isDarkMode ? "#e0e0e3" : "",
            borderColor: isDarkMode ? "#323235" : "",
            borderRadius: "0.5rem",
            fontSize: "0.875rem",
        },
        "& .MuiDataGrid-columnHeaders": {
            color: isDarkMode ? "#e0e0e3" : "",
            fontSize: "0.75rem",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            '& [role="row"] > *': {
                backgroundColor: isDarkMode ? "#252528" : "#f9fafb",
                borderColor: isDarkMode ? "#323235" : "",
            },
        },
        "& .MuiDataGrid-columnHeaderTitle": {
            fontWeight: 600,
        },
        "& .MuiIconButton-root": {
            color: isDarkMode ? "#9a9a9e" : "",
        },
        "& .MuiTablePagination-root": {
            color: isDarkMode ? "#9a9a9e" : "",
        },
        "& .MuiTablePagination-selectIcon": {
            color: isDarkMode ? "#9a9a9e" : "",
        },
        "& .MuiDataGrid-cell": {
            border: "none",
            color: isDarkMode ? "#e0e0e3" : "",
            display: "flex",
            alignItems: "center",
        },
        "& .MuiDataGrid-row": {
            borderBottom: `1px solid ${isDarkMode ? "#323235" : "#f3f4f6"}`,
            cursor: "pointer",
            transition: "background-color 0.15s ease",
            "&:hover": {
                backgroundColor: isDarkMode ? "#2a2a2d" : "#f9fafb",
            },
            "&.Mui-selected": {
                backgroundColor: isDarkMode ? "#2a2a2d" : "#eff6ff",
                "&:hover": {
                    backgroundColor: isDarkMode ? "#323235" : "#dbeafe",
                },
            },
        },
        "& .MuiDataGrid-withBorderColor": {
            borderColor: isDarkMode ? "#323235" : "#e5e7eb",
        },
        "& .MuiDataGrid-footerContainer": {
            backgroundColor: isDarkMode ? "#252528" : "#f9fafb",
            borderColor: isDarkMode ? "#323235" : "",
            borderTop: `1px solid ${isDarkMode ? "#323235" : "#e5e7eb"}`,
        },
        "& .MuiDataGrid-overlay": {
            backgroundColor: isDarkMode ? "rgba(22, 22, 24, 0.8)" : "",
            color: isDarkMode ? "#e0e0e3" : "",
        },
        "& .MuiDataGrid-sortIcon": {
            color: isDarkMode ? "#9a9a9e" : "",
        },
        "& .MuiDataGrid-menuIconButton": {
            color: isDarkMode ? "#9a9a9e" : "",
        },
        "& .MuiDataGrid-columnSeparator": {
            color: isDarkMode ? "#323235" : "#e5e7eb",
        },
    };
};
