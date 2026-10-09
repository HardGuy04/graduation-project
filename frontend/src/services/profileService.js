import http, { unwrap } from "../api/http";
import { toUiUser } from "../api/adapters";

export const profileService = {
  async getProfile() {
    const res = unwrap(await http.get("/auth/me"));
    return { success: true, data: toUiUser(res.data) };
  },
  async updateProfile(_userId, payload) {
    const { avatarUrl, fullName, phone, dateOfBirth, gender, address, position } = payload;
    const body = {};
    if (fullName !== undefined) body.fullName = fullName;
    if (phone !== undefined) body.phone = phone;
    if (avatarUrl !== undefined) {
      if (typeof avatarUrl === "string" && avatarUrl.startsWith("data:")) {
        throw new Error("Máy chủ chỉ nhận URL ảnh (http/https), chưa hỗ trợ tải file base64");
      }
      body.avatarUrl = avatarUrl;
    }
    if (dateOfBirth !== undefined) body.dateOfBirth = dateOfBirth;
    if (gender !== undefined) body.gender = gender;
    if (address !== undefined) body.address = address;
    if (position !== undefined) body.position = position;
    const res = unwrap(await http.patch("/auth/me", body));
    return { success: true, data: toUiUser(res.data) };
  },
};
