// src/pages/user/Profile.jsx
import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { db, storage, auth } from "../../firebase";
import { doc, getDoc, updateDoc, serverTimestamp, deleteField } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { createOptimizedImage } from "../../utils/image";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { updateProfile } from "firebase/auth";

export default function Profile() {
  const { user, role } = useAuth();
  
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (mounted) {
        setProfile(snap.exists() ? snap.data() : {});
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [user.uid]);

  const handleUpload = async () => {
    if (!file) return;
    setErr(""); setMsg(""); setBusy(true);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const origRef = ref(storage, `avatars/${user.uid}/original_avatar.${ext}`);
      const optRef  = ref(storage, `avatars/${user.uid}/optimized_avatar.jpg`);

      // Upload original
      await uploadBytes(origRef, file);

      // Create & upload optimized
      const optimizedBlob = await createOptimizedImage(file, 512, 0.8);
      await uploadBytes(optRef, optimizedBlob);

      const [originalURL, optimizedURL] = await Promise.all([
        getDownloadURL(origRef),
        getDownloadURL(optRef),
      ]);

      // Update Firestore
      await updateDoc(doc(db, "users", user.uid), {
        avatarOriginalURL: originalURL,
        avatarOptimizedURL: optimizedURL,
        updatedAt: serverTimestamp(),
      });

      // Update Auth profile photo
      await updateProfile(auth.currentUser, { photoURL: optimizedURL });

      setProfile((p) => ({ ...p, avatarOriginalURL: originalURL, avatarOptimizedURL: optimizedURL }));
      setMsg("Profile picture updated.");
      setFile(null);
    } catch (e) {
      console.error(e);
      setErr(e.message || "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async () => {
    setErr(""); setMsg(""); setBusy(true);
    try {
      // Try delete; ignore if not found
      const del = async (path) => {
        try { await deleteObject(ref(storage, path)); } catch {}
      };
      await Promise.all([
        del(`avatars/${user.uid}/original_avatar.jpg`),
        del(`avatars/${user.uid}/original_avatar.jpeg`),
        del(`avatars/${user.uid}/original_avatar.png`),
        del(`avatars/${user.uid}/optimized_avatar.jpg`),
      ]);

      await updateDoc(doc(db, "users", user.uid), {
        avatarOriginalURL: deleteField(),
        avatarOptimizedURL: deleteField(),
        updatedAt: serverTimestamp(),
      });

      await updateProfile(auth.currentUser, { photoURL: null });

      setProfile((p) => {
        const { avatarOriginalURL, avatarOptimizedURL, ...rest } = p || {};
        return rest;
      });
      setMsg("Profile picture removed.");
    } catch (e) {
      console.error(e);
      setErr(e.message || "Remove failed");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return null;

  const photo = profile?.avatarOptimizedURL || user.photoURL || "";

  return (
    <div className="space-y-6">
      <div className="text-xl font-semibold">Profile</div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Left: Info */}
        <div className="space-y-2">
          <div className="rounded-lg bg-white p-4 border">
            <div className="text-sm text-neutral-500 mb-2">Account</div>
            <div className="text-sm"><span className="font-medium">UID:</span> {user.uid}</div>
            <div className="text-sm"><span className="font-medium">Email:</span> {user.email}</div>
            <div className="text-sm"><span className="font-medium">Role:</span> {role}</div>
          </div>

          <div className="rounded-lg bg-white p-4 border">
            <div className="text-sm text-neutral-500 mb-2">Profile Data</div>
            <pre className="text-xs bg-neutral-50 p-3 rounded-md overflow-auto">
              {JSON.stringify(profile, null, 2)}
            </pre>
          </div>
        </div>

        {/* Right: Avatar upload */}
        <div className="rounded-lg bg-white p-4 border space-y-4">
          <div className="text-sm text-neutral-500">Profile Picture</div>

          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full overflow-hidden border bg-neutral-100">
              {photo ? (
                <img src={photo} alt="avatar" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full grid place-items-center text-xs text-neutral-400">No Photo</div>
              )}
            </div>
            <div className="flex-1">
              <label className="text-sm block mb-1">Upload new</label>
              <Input type="file" accept="image/*" onChange={(e)=>setFile(e.target.files?.[0]||null)} />
            </div>
          </div>

          {err && <p className="text-red-600 text-sm">{err}</p>}
          {msg && <p className="text-green-700 text-sm">{msg}</p>}

          <div className="flex items-center gap-2">

            <Button onClick={handleUpload} loading={busy} loadingText="Saving…" disabled={!file}>
              Save picture
            </Button>
          
            <Button
              variant="outline"
              onClick={handleRemove}
              disabled={busy || (!profile?.avatarOptimizedURL && !photo)}
              title="Remove current avatar"
            >
              Remove
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}