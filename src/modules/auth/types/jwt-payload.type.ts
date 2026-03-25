export type JwtPayload = {
  sub: number;
  email: string;
};

// Dùng cho Refresh Token Strategy
export type JwtPayloadWithRt = JwtPayload & { refreshToken: string };
