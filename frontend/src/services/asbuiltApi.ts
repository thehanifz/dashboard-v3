import api from "./api";

export interface TemplateDetail {
  filename: string;
  fields: string[];
}

const asbuiltApi = {
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
