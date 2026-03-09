// frontend/src/components/teskom/forms/DarkFiberForm.tsx  ✏️ MODIFIED
// jarak_otdr sudah dipindah ke FormFields — form ini hanya foto OTDR
import PhotoUpload from "../PhotoUpload";
import { FormProps } from "../formRegistry";

export default function DarkFiberForm({ photos, onPhotoChange }: FormProps) {
  return (
    <PhotoUpload
      slots={[{ key: "foto_otdr", label: "Foto OTDR (bisa multiple)", multiple: true }]}
      files={photos}
      onChange={onPhotoChange}
    />
  );
}