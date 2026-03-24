export type JwtPayload = {
  sub: number;
  email: string;
};

// Dùng cho Refresh Token Strategy (cần thêm chính chuỗi token để đối soát)
export type JwtPayloadWithRt = JwtPayload & { refreshToken: string };
