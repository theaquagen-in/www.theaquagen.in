import { Outlet } from "react-router-dom";

import AdminHeader from "../components/headers/AdminHeader";

import AdminFooter from "../components/footers/AdminFooter";

export default function AdminLayout() {
    return (
        <div className="min-h-dvh flex flex-col bg-neutral-50">
            <AdminHeader />
            
            <main className="mx-auto w-full max-w-5xl flex-1 p-4">
                <Outlet />
            </main>
            
            <AdminFooter />
        </div>
    );
}