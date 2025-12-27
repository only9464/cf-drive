<script lang="ts">
import MimeIcon from './components/MimeIcon.vue';
import Footer from './components/Footer.vue';
import http, { apiBase, encodePath } from './services/http';

type ListItem = {
  key: string;
  name: string;
  type: 'file' | 'folder';
  size?: number;
  uploaded?: Date;
  contentType?: string;
  thumbnail?: string;
};

export default {
  components: {
    MimeIcon,
    Footer,
  },
  data: () => ({
    apiBase,
    cwd: new URL(window.location.href).searchParams.get('p') || '',
    files: [] as ListItem[],
    folders: [] as ListItem[],
    loading: false,
    search: '',
    backgroundImageUrl: '/assets/background.png',
    hoveredFile: null as string | null, // 新增：跟踪当前悬停的文件
  }),
  computed: {
    filteredFiles(): ListItem[] {
      let files = this.files;
      if (this.search) {
        files = files.filter((file) =>
          file.key.split('/').pop()?.includes(this.search),
        );
      }
      return files;
    },
    filteredFolders(): ListItem[] {
      let folders = this.folders;
      if (this.search) {
        folders = folders.filter((folder) => folder.name.includes(this.search));
      }
      return folders;
    },
  },
  methods: {
    buildApiUrl(path: string) {
      const base = this.apiBase || window.location.origin;
      return new URL(path, base).toString();
    },
    buildFileUrl(key: string) {
      const base = this.apiBase || window.location.origin;
      return new URL(key, base).toString();
    },
    async fetchFiles() {
      this.files = [];
      this.folders = [];
      this.loading = true;
      // 确保 cwd 以 / 结尾（除了根目录），用于 API 请求
      const dirname = this.cwd || '';
      const url = this.buildApiUrl('/api/children');
      console.log('fetchFiles - dirname:', dirname, 'url:', url);
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ dirname })
        });
        const data = await res.json();
        
        console.log('fetchFiles - raw data:', data);
        
        // 直接用后端新 list 结构（已区分文件/文件夹）
        const items = (data.list || []) as { key: string; name: string; type: 'file' | 'folder' }[];
        this.files = items.filter(item => item.type === 'file');
        this.folders = items.filter(item => item.type === 'folder');

        console.log('fetchFiles - files:', this.files);
        console.log('fetchFiles - folders:', this.folders);
        
        this.loading = false;
      } catch (error) {
        console.error('Failed to fetch files:', error);
        this.loading = false;
      }
    },
    formatSize(size: number) {
      const units = ['B', 'KB', 'MB', 'GB', 'TB'];
      let i = 0;
      while (size >= 1024) {
        size /= 1024;
        i++;
      }
      return `${size.toFixed(1)} ${units[i]}`;
    },
    formatDate(date: Date) {
      return new Date(date).toLocaleString('zh-CN');
    },
    preview(filePath: string) {
      window.open(this.buildFileUrl(filePath));
    },
    async removeFile(key: string) {
      if (!window.confirm(`确定要删除 ${key} 吗？`)) return;
      await http.delete(`/api/write/items/${encodePath(key)}`);
      this.fetchFiles();
    },
  },
  watch: {
    cwd: {
      handler() {
        this.fetchFiles();
        const url = new URL(window.location.href);
        if ((url.searchParams.get('p') || '') !== this.cwd) {
          this.cwd
            ? url.searchParams.set('p', this.cwd)
            : url.searchParams.delete('p');
          window.history.pushState(null, '', url.toString());
        }
        const title =
          this.cwd.replace(/.*\/(?!$)|\//g, '') === '/'
            ? '个人网盘'
            : `${this.cwd.replace(/.*\/(?!$)|\//g, '') || '/'} - 个人网盘`;
        document.title = title;
      },
      immediate: true,
    },
  },
  created() {
    window.addEventListener('popstate', () => {
      const searchParams = new URL(window.location.href).searchParams;
      if ((searchParams.get('p') || '') !== this.cwd) {
        this.cwd = searchParams.get('p') || '';
      }
    });
  },
};
</script>

<template>
  <div
    class="main"
    :style="{ backgroundImage: `url('${backgroundImageUrl}')` }"
  >
    <div class="app-bar">
      <div class="app-bar-content">
        <a class="app-title-container" href="/">
          <img src="/assets/favicon.png" alt="FlareDrive" />
          <h1 class="app-title">个人网盘</h1>
        </a>
        <input type="search" v-model="search" aria-label="Search" placeholder="在当前目录搜索文件" class="search-input" />
      </div>
    </div>
    <div class="file-list-container">
      <ul class="file-list">
        <li v-if="cwd !== ''">
          <div tabindex="0" class="file-item" @click="cwd = cwd.replace(/[^\/]+\/$/, '')">
            <div class="file-icon">
              <svg  viewBox="0 0 576 512"
                xmlns="http://www.w3.org/2000/svg" width="36" height="36">
                <path d="M384 480l48 0c11.4 0 21.9-6 27.6-15.9l112-192c5.8-9.9 5.8-22.1 .1-32.1S555.5 224 544 224l-400 0c-11.4 0-21.9 6-27.6 15.9L48 357.1 48 96c0-8.8 7.2-16 16-16l117.5 0c4.2 0 8.3 1.7 11.3 4.7l26.5 26.5c21 21 49.5 32.8 79.2 32.8L416 144c8.8 0 16 7.2 16 16l0 32 48 0 0-32c0-35.3-28.7-64-64-64L298.5 96c-17 0-33.3-6.7-45.3-18.7L226.7 50.7c-12-12-28.3-18.7-45.3-18.7L64 32C28.7 32 0 60.7 0 96L0 416c0 35.3 28.7 64 64 64l23.7 0L384 480z"/>
              </svg>
            </div>
            <div class="file-info-container"><span class="file-name">返回上级目录</span></div>
          </div>
        </li>
        <li v-for="folder in filteredFolders" :key="folder.key">
          <div tabindex="0" class="file-item" @click="cwd = folder.key">
            <div class="file-icon">
              <svg  viewBox="0 0 576 512"
                xmlns="http://www.w3.org/2000/svg" width="36" height="36">
                <path d="M384 480l48 0c11.4 0 21.9-6 27.6-15.9l112-192c5.8-9.9 5.8-22.1 .1-32.1S555.5 224 544 224l-400 0c-11.4 0-21.9 6-27.6 15.9L48 357.1 48 96c0-8.8 7.2-16 16-16l117.5 0c4.2 0 8.3 1.7 11.3 4.7l26.5 26.5c21 21 49.5 32.8 79.2 32.8L416 144c8.8 0 16 7.2 16 16l0 32 48 0 0-32c0-35.3-28.7-64-64-64L298.5 96c-17 0-33.3-6.7-45.3-18.7L226.7 50.7c-12-12-28.3-18.7-45.3-18.7L64 32C28.7 32 0 60.7 0 96L0 416c0 35.3 28.7 64 64 64l23.7 0L384 480z"/>
              </svg>
            </div>
            <div class="file-info-container"><span class="file-name" v-text="folder.name"></span>
            </div>
          </div>
        </li>
        <li v-for="file in filteredFiles" :key="file.key">
          <div 
            @click="preview(file.key)" 
            class="file-item" 
            style="position: relative;"
            @mouseenter="hoveredFile = buildFileUrl(file.key)"
            @mouseleave="hoveredFile = null"
          >
            <MimeIcon :content-type="file.contentType || undefined" :thumbnail="file.thumbnail || null" />
            <div class="file-info-container">
              <div class="file-name" v-text="file.name"></div>
              <div class="file-attr">
                <span>{{ file.uploaded ? formatDate(file.uploaded) : '未知时间' }}</span>
                <span>{{ file.size ? formatSize(file.size) : '未知大小' }}</span>
              </div>
            </div>
          </div>
        </li>
      </ul>
    </div>
    <div v-if="loading" style="margin: 20px 0; text-align: center">
      <span style="font-size: 20px;">加载中...</span>
    </div>
    <div v-else-if="!filteredFiles.length && !filteredFolders.length" style="margin: 20px 0; text-align: center">
      <span style="font-size: 20px;">没有文件</span>
    </div>
    <Footer />
    <!-- 链接预览显示 -->
    <div v-if="hoveredFile" class="link-preview">
      {{ decodeURIComponent(hoveredFile) }}
    </div>
  </div>
</template>

<style>
.main {
  display: flex;
  height: 100vh;
  background-size: cover;
  background-position: center;
  overflow: hidden;
  flex-direction: column;
}

.app-bar {
  z-index: 2;
  position: sticky;
  top: 0;
  padding: 8px;
  background-color: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(10px);
  display: flex;
  flex-shrink: 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.3);
}

.app-bar-content {
  display: flex;
  align-items: center;
  width: 100%;
  gap: 16px;
}

.app-title-container {
  display: flex;
  align-items: center;
  text-decoration: none;
  color: inherit;
  flex-shrink: 0;
  min-width: 0;
}

.app-title-container img {
  height: 24px;
  width: 24px;
  flex-shrink: 0;
}

.app-title {
  font-size: 20px;
  margin: 0 0 0 8px;
  user-select: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  min-width: 200px;
  max-width: 400px;
  padding: 8px 12px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 4px;
  font-size: 14px;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(5px);
}

@media (max-width: 768px) {
  .app-bar-content {
    gap: 8px;
  }
  
  .app-title {
    font-size: 18px;
  }
  
  .search-input {
    min-width: 150px;
    max-width: 300px;
  }
}

@media (max-width: 480px) {
  .app-title {
    font-size: 16px;
    max-width: 120px;
  }
  
  .search-input {
    min-width: 100px;
    max-width: 200px;
  }
}

@media (max-width: 340px) {
  .app-title-container {
    display: none !important;
  }
}

.file-list-container {
  margin: 15px auto 15px auto;
  padding: 15px;
  width: 60%;
  max-width: 95%;
  background: rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  transition: width 0.3s ease;
  flex: 1;
  overflow-y: auto;
  max-height: calc(100vh - 200px);
}

/* 美化滚动条样式 */
.file-list-container::-webkit-scrollbar {
  width: 12px;
  background: transparent;
}

.file-list-container::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  margin: 8px 0;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.file-list-container::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.6);
  border-radius: 6px;
  border: 2px solid rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(10px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  min-height: 40px;
}

.file-list-container::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.8);
  border: 2px solid rgba(255, 255, 255, 0.7);
}

.file-list-container::-webkit-scrollbar-thumb:active {
  background: rgba(0, 0, 0, 0.9);
}

/* 确保滚动条始终显示 */
.file-list-container {
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 0, 0, 0.6) rgba(255, 255, 255, 0.2);
}

@media (max-width: 1280px) {
  .file-list-container {
    width: 768px;
    padding: 15px;
  }
}

.link-preview {
  position: fixed;
  bottom: 10px;
  left: 10px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 12px;
  max-width: 400px;
  word-break: break-all;
  z-index: 1000;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

</style>