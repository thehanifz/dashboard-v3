// frontend/src/components/teskom/forms/CcIpForm.tsx  🆕 NEW
import PhotoUpload from "../PhotoUpload";
import { FormProps } from "../formRegistry";

export default function CcIpForm({ photos, onPhotoChange }: FormProps) {
  return (
    <PhotoUpload
      slots={[
        { key: "foto_ping",      label: "Foto Ping" },
        { key: "foto_speedtest", label: "Foto Speedtest" },
      ]}
      files={photos}
      onChange={onPhotoChange}
    />
  );
}