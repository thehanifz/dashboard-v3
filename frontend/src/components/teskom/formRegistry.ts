// frontend/src/components/teskom/formRegistry.ts  ✏️ MODIFIED
import { ComponentType } from "react";
import CcTdmForm from "./forms/CcTdmForm";
import CcIpForm from "./forms/CcIpForm";
import DarkFiberForm from "./forms/DarkFiberForm";

export type Tipe = "T" | "OT";

export interface FormProps {
  photos: Record<string, File | File[] | null>;
  onPhotoChange: (key: string, value: File | File[] | null) => void;
  form: Record<string, string>;
  setField: (key: string, val: string) => void;
}

export interface FormRegistryEntry {
  label: string;
  supportedTipe: Tipe[];
  defaultTipe: Tipe;             // ← tambah
  component: ComponentType<FormProps>;
}

export const FORM_REGISTRY: Record<string, FormRegistryEntry> = {
  CC_TDM: {
    label:         "Clear Channel TDM",
    supportedTipe: ["T", "OT"],
    defaultTipe:   "OT",         // ← tambah
    component:     CcTdmForm,
  },
  CC_IP: {
    label:         "Clear Channel IP",
    supportedTipe: ["T", "OT"],
    defaultTipe:   "OT",         // ← tambah
    component:     CcIpForm,
  },
  DARK_FIBER: {
    label:         "Dark Fiber",
    supportedTipe: ["T", "OT"], // ← sebelumnya ["T"]
    defaultTipe:   "OT",        // ← tambah
    component:     DarkFiberForm,
  },
};