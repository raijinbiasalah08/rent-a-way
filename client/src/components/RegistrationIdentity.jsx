import { useId, useState } from "react";

export default function RegistrationIdentity({ onChange }) {
  const id = useId();
  const [error, setError] = useState("");
  return (
    <div className="space-y-2 text-sm">
      <label htmlFor={id} className="font-semibold text-gray-800">Government-issued or school ID (required)</label>
      <p className="text-xs text-gray-600">Upload a clear image with your name and photo visible. JPG, PNG, or WebP, up to 5 MB. Only authorized admins can view your ID for account security.</p>
      <input id={id} type="file" required accept="image/jpeg,image/png,image/webp" className="block w-full text-sm"
        onChange={(event) => {
          const file = event.target.files?.[0];
          const invalid = file && (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024);
          setError(invalid ? "Choose a JPG, PNG, or WebP image up to 5 MB." : "");
          onChange(invalid ? null : file || null);
          if (invalid) event.target.value = "";
        }} />
      {error && <p role="alert" className="text-red-700">{error}</p>}
    </div>
  );
}
