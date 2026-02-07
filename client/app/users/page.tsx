"use client";
import { useGetUsersQuery } from "@/state/api";
import React from "react";
import { useAppSelector } from "../redux";
import Header from "@/components/Header";
import {
    DataGrid,
    GridColDef,
    GridToolbarContainer,
    GridToolbarExport,
    GridToolbarFilterButton,
    GridRenderCellParams,
} from "@mui/x-data-grid";
import { dataGridClassNames, dataGridSxStyles } from "@/lib/utils";
import S3Image from "@/components/S3Image";

const CustomToolbar = () => (
    <GridToolbarContainer className="toolbar flex gap-2">
        <GridToolbarFilterButton />
        <GridToolbarExport />
    </GridToolbarContainer>
);

const ProfilePictureCell = ({ row }: GridRenderCellParams) => {
    const s3Key = row.userId && row.profilePictureExt
        ? `users/${row.userId}/profile.${row.profilePictureExt}`
        : null;
    
    if (!s3Key) return null;
    
    return (
        <div className="flex h-full w-full items-center justify-center">
            <div className="h-9 w-9">
                <S3Image
                    s3Key={s3Key}
                    alt={row.username}
                    width={100}
                    height={50}
                    className="h-full rounded-full object-cover"
                />
            </div>
        </div>
    );
};

const columns: GridColDef[] = [
    { field: "userId", headerName: "ID", width: 100 },
    { field: "username", headerName: "Username", width: 150 },
    {
        field: "profilePictureExt",
        headerName: "Profile Picture",
        width: 100,
        renderCell: (params) => <ProfilePictureCell {...params} />,
    },
];

const Users = () => {
    const { data: users, isLoading, isError } = useGetUsersQuery();
    const isDarkMode = useAppSelector((state) => state.global.isDarkMode);

    if (isLoading) return <div>Loading...</div>;
    if (isError || !users) return <div>Error fetching users</div>;

    return (
        <div className="flex w-full flex-col p-8">
            <Header name="Users" />
            <div style={{ height: 650, width: "100%" }}>
                <DataGrid
                    rows={users || []}
                    columns={columns}
                    getRowId={(row) => row.userId}
                    pagination
                    slots={{
                        toolbar: CustomToolbar,
                    }}
                    className={dataGridClassNames}
                    sx={dataGridSxStyles(isDarkMode)}
                    rowHeight={30}
                />
            </div>
        </div>
    );
};

export default Users;
