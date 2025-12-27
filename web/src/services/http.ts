import axios from 'axios';

const apiBase =
  import.meta.env.DEV && !import.meta.env.SSR ? 'http://127.0.0.1:8787' : '';

const http = axios.create({
  baseURL: apiBase,
});

// 编码 URL 路径中的每个部分（但保留 / 分隔符）
export const encodePath = (path: string): string => {
  return path
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
};

export { apiBase };
export default http;

