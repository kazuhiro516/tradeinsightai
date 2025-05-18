import { ulid } from 'ulid';

/**
 * ULIDを生成する
 * @returns 生成されたULID
 */
export const generateULID = (): string => {
  return ulid();
};
