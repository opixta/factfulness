export const NICKNAME_MIN = 2;
export const NICKNAME_MAX = 20;

const NICKNAME_PATTERN = /^[\p{L}\p{N}_]+$/u;

export function validateNickname(raw: string): string | null {
  const nick = raw.trim();
  if (nick.length < NICKNAME_MIN || nick.length > NICKNAME_MAX) {
    return `${NICKNAME_MIN}–${NICKNAME_MAX}자로 입력해 주세요.`;
  }
  if (!NICKNAME_PATTERN.test(nick)) {
    return "한글, 영문, 숫자, 밑줄(_)만 사용할 수 있습니다.";
  }
  return null;
}

export const PROFILE_STORAGE_KEY = "@factfulness/user-profile-v1";

export interface LocalUserProfile {
  userId: string;
  nickname: string;
  nicknameConfirmed?: boolean;
}
