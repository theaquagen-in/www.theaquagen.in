import { useAuth } from "../../context/AuthContext";

export default function Profile() {
    const { user, role } = useAuth();
    return (
        <div className="space-y-2">
            <div className="text-xl font-semibold">Profile</div>
            <pre className="rounded-lg bg-white p-4 border text-sm">
                {JSON.stringify({ uid: user.uid, email: user.email, user }, null, 2)}
            </pre>
        </div>
    );
}