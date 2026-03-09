// frontend/src/components/teskom/forms/CcTdmForm.tsx  🆕 NEW
import PhotoUpload from "../PhotoUpload";
import { FormProps } from "../formRegistry";

export default function CcTdmForm({ photos, onPhotoChange }: FormProps) {
  return (
    <PhotoUpload
      slots={[{ key: "foto_bert", label: "Foto BERT (bisa multiple)", multiple: true }]}
      files={photos}
      onChange={onPhotoChange}
    />
  );
}