// src/pages/user/Signup.jsx
import { useState } from "react";
import { auth, db, storage } from "../../../firebase";
import {
    createUserWithEmailAndPassword,
    updateProfile,
} from "firebase/auth";
import {
    doc, setDoc, serverTimestamp,
} from "firebase/firestore";
import {
    ref, uploadBytes, getDownloadURL,
} from "firebase/storage";
import { createOptimizedImage } from "../../../utils/image";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import { useNavigate } from "react-router-dom";

export default function Signup() {
    const [form, setForm] = useState({
        firstName: "", lastName: "", dateOfBirth: "",
        district: "", phone: "", email: "", password: ""
    });
    const [file, setFile] = useState(null);
    const [err, setErr] = useState("");
    const [loading, setLoading] = useState(false);
    const nav = useNavigate();

    const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const onSubmit = async (e) => {
        e.preventDefault();
        setErr("");
        setLoading(true);
        
        sessionStorage.setItem("BLOCK_AUTH_REDIRECT", "1");
        try {
            const cred = await createUserWithEmailAndPassword(auth, form.email, form.password);
            const uid = cred.user.uid;

            // 2) Storage (original + optimized)
            if (!file) throw new Error("Please select a profile picture.");
            const ext = file.name.split(".").pop() || "jpg";
            const origRef = ref(storage, `avatars/${uid}/original/avatar.${ext}`);
            await uploadBytes(origRef, file);
            const optimizedBlob = await createOptimizedImage(file, 512, 0.8);
            const optRef = ref(storage, `avatars/${uid}/optimized/avatar.jpg`);
            await uploadBytes(optRef, optimizedBlob);

            const [originalURL, optimizedURL] = await Promise.all([
                getDownloadURL(origRef),
                getDownloadURL(optRef),
            ]);

            // 3) Firestore (users/<uid>/fields)
            await setDoc(doc(db, "users", uid), {
                firstName: form.firstName,
                lastName: form.lastName,
                dateOfBirth: form.dateOfBirth,
                district: form.district,
                phone: form.phone,
                email: form.email,
                avatarOriginalURL: originalURL,
                avatarOptimizedURL: optimizedURL,
                role: "user",
                createdAt: serverTimestamp(),
            });

            // Optional: set displayName / photoURL in Auth profile
            await updateProfile(cred.user, {
                displayName: `${form.firstName} ${form.lastName}`.trim(),
                photoURL: optimizedURL,
            });

            // 4) Redirect Home
            nav("/", { replace: true });
        } catch (e) {
            console.error(e);
            setErr(e.message);
        } finally {
            sessionStorage.removeItem("BLOCK_AUTH_REDIRECT");
            setLoading(false);
        }
    };

    return (
        <div className="mx-auto max-w-md space-y-4">
            <h1 className="text-xl font-semibold">Signup</h1>
            <form onSubmit={onSubmit} className="space-y-3 bg-white p-4 rounded-lg border">
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-sm">First Name</label>
                        <Input name="firstName" value={form.firstName} onChange={onChange} required />
                    </div>
                    <div>
                        <label className="text-sm">Last Name</label>
                        <Input name="lastName" value={form.lastName} onChange={onChange} required />
                    </div>
                </div>
                <div>
                    <label className="text-sm">Date of Birth</label>
                    <Input type="date" name="dateOfBirth" value={form.dateOfBirth} onChange={onChange} required />
                </div>
                <div>
                    <label className="text-sm">District</label>
                    <Input name="district" value={form.district} onChange={onChange} required />
                </div>
                <div>
                    <label className="text-sm">Phone</label>
                    <Input type="tel" name="phone" value={form.phone} onChange={onChange} required />
                </div>
                <div>
                    <label className="text-sm">Email</label>
                    <Input type="email" name="email" value={form.email} onChange={onChange} required />
                </div>
                <div>
                    <label className="text-sm">Password</label>
                    <Input type="password" name="password" value={form.password} onChange={onChange} required />
                </div>
                <div>
                    <label className="text-sm">Profile Picture</label>
                    <Input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} required />
                </div>
                {err && <p className="text-red-600 text-sm">{err}</p>}
                <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Creating account..." : "Create account"}
                </Button>
            </form>
        </div>
    );
}