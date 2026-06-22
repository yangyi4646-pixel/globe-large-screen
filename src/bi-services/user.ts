import { getJSON } from '@/core/request';

type IUserProfile = {
    uId: string;
    loginId: string;
    name: string;
    role: Array<'editor' | 'participant' | 'admin' | 'groupManager' | 'super_admin'>;
    userProperties: Record<string, string>;
    avatar?: string; // 头像

    domId: string; // 所属域
};

/**
 * 获取当前用户信息。
 * @returns 当前用户信息
 */
export async function getUserProfile(): Promise<IUserProfile> {
    const response = await getJSON<IUserProfile>('/api/user/profile');
    return response;
}
