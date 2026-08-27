import api from "./api";

export interface IconAsset {
  filename: string;
  url: string;
}

export interface TemplateDetail {
  filename: string;
  fields: string[];
}

const asbuiltApi = {
  listIcons: async (): Promise<IconAsset[]> => {
    const files = await api.get<string[]>("/asbuilt/icons").then((r) => r.data);
    return files.map((filename) => ({
      filename,
      url: `/api/asbuilt/icons/${encodeURIComponent(filename)}`,
    }));
  },

  uploadIcon: (file: File): Promise<{ ok: boolean; filename: string }> => {
    const form = new FormData();
    form.append("iconFile", file);
    return api.post("/asbuilt/icons/upload", form).then((r) => r.data);
  },

  listTemplates: (): Promise<string[]> =>
    api.get("/asbuilt/templates").then((r) => r.data),

  uploadTemplate: (file: File): Promise<{ message: string; filename: string; fields: string[] }> => {
    const form = new FormData();
    form.append("svgFile", file);
    return api.post("/asbuilt/templates/upload", form).then((r) => r.data);
  },

  getTemplateDetail: (filename: string): Promise<TemplateDetail> =>
    api.get(`/asbuilt/templates/${filename}`).then((r) => r.data),

  generateSVG: (filename: string, data: Record<string, string>): Promise<Blob> =>
    api
      .post("/asbuilt/generate", { filename, data }, { responseType: "blob" })
      .then((r) => r.data),

  deleteTemplate: (filename: string): Promise<{ ok: boolean }> =>
    api.delete(`/asbuilt/templates/${filename}`).then((r) => r.data),
};

export default asbuiltApi;
